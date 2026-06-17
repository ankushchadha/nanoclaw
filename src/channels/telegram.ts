/**
 * Telegram channel adapter (v2) — uses Chat SDK bridge, with a pairing
 * interceptor wrapped around onInbound to verify chat ownership before
 * registration. See telegram-pairing.ts for the why.
 */
import { createTelegramAdapter } from '@chat-adapter/telegram';

import { readEnvFile } from '../env.js';
import { log } from '../log.js';
import { createMessagingGroup, getMessagingGroupByPlatform, updateMessagingGroup } from '../db/messaging-groups.js';
import { grantRole, hasAnyOwner } from '../modules/permissions/db/user-roles.js';
import { upsertUser } from '../modules/permissions/db/users.js';
import { createChatSdkBridge, type ReplyContext } from './chat-sdk-bridge.js';
import { sanitizeTelegramLegacyMarkdown } from './telegram-markdown-sanitize.js';
import { registerChannelAdapter } from './channel-registry.js';
import type { ChannelAdapter, ChannelSetup, InboundMessage } from './adapter.js';
import { tryConsume } from './telegram-pairing.js';

/**
 * Retry a one-shot operation that can fail on transient network errors at
 * cold-start (DNS hiccups, brief upstream outages). Exponential backoff capped
 * at 5 attempts — if the network is truly down we surface it instead of
 * hanging the service indefinitely.
 */
async function withRetry<T>(fn: () => Promise<T>, label: string, maxAttempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      const delay = Math.min(16000, 1000 * 2 ** (attempt - 1));
      log.warn('Telegram setup failed, retrying', { label, attempt, delayMs: delay, err });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractReplyContext(raw: Record<string, any>): ReplyContext | null {
  if (!raw.reply_to_message) return null;
  const reply = raw.reply_to_message;
  return {
    text: reply.text || reply.caption || '',
    sender: reply.from?.first_name || reply.from?.username || 'Unknown',
  };
}

/** Look up the bot username via Telegram getMe. Cached after first call. */
async function fetchBotUsername(token: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const json = (await res.json()) as { ok: boolean; result?: { username?: string } };
    return json.ok ? (json.result?.username ?? null) : null;
  } catch (err) {
    log.warn('Telegram getMe failed', { err });
    return null;
  }
}

function isGroupPlatformId(platformId: string): boolean {
  // platformId is "telegram:<chatId>". Negative chat IDs are groups/channels.
  const id = platformId.split(':').pop() ?? '';
  return id.startsWith('-');
}

interface InboundFields {
  text: string;
  authorUserId: string | null;
}

function readInboundFields(message: InboundMessage): InboundFields {
  if (message.kind !== 'chat-sdk' || !message.content || typeof message.content !== 'object') {
    return { text: '', authorUserId: null };
  }
  const c = message.content as { text?: string; author?: { userId?: string } };
  return { text: c.text ?? '', authorUserId: c.author?.userId ?? null };
}

/**
 * Build an onInbound interceptor that consumes pairing codes before they
 * reach the router. On match: records the chat (under the receiving instance)
 * + its paired user, and — only via the DEFAULT bot, when the install has no
 * owner yet (ownership is global) — promotes the pairer to owner. A secondary
 * bot never bootstraps the first owner. Short-circuits on match; forwards to
 * the host on miss.
 */
/**
 * Send a one-shot confirmation back to the paired chat. Best-effort — failures
 * are logged but never propagated, so a Telegram outage can't undo a successful
 * pairing or trigger the interceptor's fail-open path.
 */
async function sendPairingConfirmation(token: string, platformId: string): Promise<void> {
  const chatId = platformId.split(':').slice(1).join(':');
  if (!chatId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: 'Pairing success! Head back to the NanoClaw installer to finish setup.',
      }),
    });
    if (!res.ok) {
      log.warn('Telegram pairing confirmation non-OK', { status: res.status });
    }
  } catch (err) {
    log.warn('Telegram pairing confirmation failed', { err });
  }
}

function createPairingInterceptor(
  botUsernamePromise: Promise<string | null>,
  hostOnInbound: ChannelSetup['onInbound'],
  token: string,
  instance?: string,
): ChannelSetup['onInbound'] {
  return async (platformId, threadId, message) => {
    try {
      const botUsername = await botUsernamePromise;
      if (!botUsername) {
        hostOnInbound(platformId, threadId, message);
        return;
      }
      const { text, authorUserId } = readInboundFields(message);
      if (!text) {
        hostOnInbound(platformId, threadId, message);
        return;
      }
      const consumed = await tryConsume({
        text,
        botUsername,
        platformId,
        isGroup: isGroupPlatformId(platformId),
        adminUserId: authorUserId,
      });
      if (!consumed) {
        hostOnInbound(platformId, threadId, message);
        return;
      }
      // Pairing matched — record the chat and short-circuit so the
      // code-bearing message never reaches an agent. Privilege is now a
      // property of the paired user, not the chat: upsert the user, and if
      // this instance has no owner yet, promote them to owner.
      // Look up / create the row for the RECEIVING instance so a second bot's
      // paired chat doesn't collide with (or get absorbed by) the default
      // instance's row. instance===undefined resolves the default instance
      // (legacy behavior); a named instance is exact-match.
      const existing = getMessagingGroupByPlatform('telegram', platformId, instance);
      if (existing) {
        updateMessagingGroup(existing.id, {
          is_group: consumed.consumed!.isGroup ? 1 : 0,
        });
      } else {
        createMessagingGroup({
          id: `mg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          channel_type: 'telegram',
          platform_id: platformId,
          instance,
          name: consumed.consumed!.name,
          is_group: consumed.consumed!.isGroup ? 1 : 0,
          unknown_sender_policy: 'strict',
          created_at: new Date().toISOString(),
        });
      }

      const pairedUserId = `telegram:${consumed.consumed!.adminUserId}`;
      upsertUser({
        id: pairedUserId,
        kind: 'telegram',
        display_name: null,
        created_at: new Date().toISOString(),
      });

      // Only the DEFAULT bot (instance === undefined) can bootstrap the first
      // (global) owner. A secondary bot must never promote its pairer — else a
      // CTS-bot-paired-first install would hand global ownership to a volunteer.
      let promotedToOwner = false;
      if (instance === undefined && !hasAnyOwner()) {
        grantRole({
          user_id: pairedUserId,
          role: 'owner',
          agent_group_id: null,
          granted_by: null,
          granted_at: new Date().toISOString(),
        });
        promotedToOwner = true;
      }

      log.info('Telegram pairing accepted — chat registered', {
        platformId,
        pairedUser: pairedUserId,
        promotedToOwner,
        intent: consumed.intent,
      });

      await sendPairingConfirmation(token, platformId);
    } catch (err) {
      log.error('Telegram pairing interceptor error', { err });
      // Fail open: pass through so a pairing bug doesn't break normal traffic.
      hostOnInbound(platformId, threadId, message);
    }
  };
}

/**
 * Register one Telegram bot as a channel adapter instance.
 *
 * The platform's multi-instance substrate (native `instance` dimension) makes
 * N Telegram bots coexist in one process: each is a separate Telegram identity
 * (its own token + @username), keyed in the adapter registry by `instance`
 * (default instance is keyed by channelType). The host stamps the receiving
 * instance on every inbound event (src/index.ts), and the router persists it on
 * the auto-created messaging_groups row, so outbound replies route back through
 * the bot that received them. channelType stays 'telegram' for all instances —
 * user identity, formatting, and container config are platform-keyed, not
 * instance-keyed.
 *
 * A bot is registered only when its token env var is set, so additional bots
 * are inert until configured (the default bot is unaffected by an unset second
 * token).
 *
 * @param registryName  unique registry key (e.g. 'telegram', 'telegram-cts')
 * @param tokenEnvVar   .env var holding this bot's token
 * @param instance      adapter-instance name (undefined = default/primary bot,
 *                      which keeps the legacy unprefixed state namespace and
 *                      channelType-keyed routing)
 */
// Tokens already claimed by a registered Telegram instance this process.
// Telegram allows only ONE getUpdates poller per token; two instances sharing
// a token (e.g. TELEGRAM_BOT_TOKEN_CTS copy-pasted from TELEGRAM_BOT_TOKEN)
// would 409-conflict and nondeterministically drop inbound on BOTH bots. We
// skip the duplicate so the first-registered (default) bot keeps working.
// Per-process: a service restart is a fresh process, which resets this.
const claimedBotTokens = new Set<string>();

function registerTelegramInstance(opts: { registryName: string; tokenEnvVar: string; instance?: string }): void {
  registerChannelAdapter(opts.registryName, {
    factory: () => {
      const env = readEnvFile([opts.tokenEnvVar]);
      const token = env[opts.tokenEnvVar];
      if (!token) return null;
      if (claimedBotTokens.has(token)) {
        log.error(
          `Telegram instance '${opts.registryName}' shares a bot token with an already-registered instance — skipping. ` +
            `Two getUpdates pollers on one token cause Telegram 409 conflicts and nondeterministic inbound loss on BOTH bots. ` +
            `Give each bot its own @BotFather token.`,
        );
        return null;
      }
      claimedBotTokens.add(token);
      const telegramAdapter = createTelegramAdapter({
        botToken: token,
        mode: 'polling',
      });
      const bridge = createChatSdkBridge({
        adapter: telegramAdapter,
        instance: opts.instance,
        concurrency: 'concurrent',
        extractReplyContext,
        supportsThreads: false,
        transformOutboundText: sanitizeTelegramLegacyMarkdown,
        maxTextLength: 4000,
      });

      const botUsernamePromise = fetchBotUsername(token);

      const wrapped: ChannelAdapter = {
        ...bridge,
        resolveChannelName: async (platformId: string) => {
          const chatId = platformId.split(':').slice(1).join(':');
          if (!chatId) return null;
          try {
            const res = await fetch(`https://api.telegram.org/bot${token}/getChat`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId }),
            });
            const data = (await res.json()) as { ok?: boolean; result?: { title?: string } };
            return data.ok ? (data.result?.title ?? null) : null;
          } catch {
            return null;
          }
        },
        async setup(hostConfig: ChannelSetup) {
          const intercepted: ChannelSetup = {
            ...hostConfig,
            onInbound: createPairingInterceptor(botUsernamePromise, hostConfig.onInbound, token, opts.instance),
          };
          return withRetry(() => bridge.setup(intercepted), 'bridge.setup');
        },
      };
      return wrapped;
    },
  });
}

// Default bot (legacy behavior: instance undefined → channelType-keyed routing,
// unprefixed state namespace). Unaffected by any additional bots below.
registerTelegramInstance({ registryName: 'telegram', tokenEnvVar: 'TELEGRAM_BOT_TOKEN' });

// CTSAgent's dedicated bot — a separate Telegram identity for audience
// isolation (its volunteers reach only the agent it's wired to, never the
// default bot's agents). Inert until TELEGRAM_BOT_TOKEN_CTS is set in .env.
registerTelegramInstance({
  registryName: 'telegram-cts',
  tokenEnvVar: 'TELEGRAM_BOT_TOKEN_CTS',
  instance: 'telegram-cts',
});
