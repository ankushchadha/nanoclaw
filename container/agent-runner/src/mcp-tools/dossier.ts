/**
 * deliver_dossier MCP tool — the STRUCTURAL fix for the delivery regression.
 *
 * The dossier-delivery procedure is deterministic and verifiable, so it lives
 * in code, NOT in agent discretion. Soft brain rules ("always write the .md,
 * render the PDF, only claim PDF if it exists, send one DONE") leaked twice
 * (715, 711): text-only delivery, no file on disk, false "(PDF)", duplicate
 * DONE. This tool makes those impossible via the sanctioned path:
 *   1. require properties/<apn>/dossier.md (else error — forces persistence)
 *   2. render the PDF with pandoc (else error — never a false PDF)
 *   3. verify the artifact is a real, non-trivial PDF (%PDF + size)
 *   4. attach it + emit EXACTLY ONE truthful DONE in a single outbound row
 * The agent calls this once and is done; it cannot hand-fake a "(PDF)" DONE.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { getCurrentInReplyTo } from '../current-batch.js';
import { writeMessageOut } from '../db/messages-out.js';
import { resolveRouting } from './core.js';
import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';

function log(msg: string): void {
  console.error(`[mcp-tools] ${msg}`);
}
function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}
function err(text: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${text}` }], isError: true };
}

const MIN_PDF_BYTES = 5000;

export const deliverDossier: McpToolDefinition = {
  tool: {
    name: 'deliver_dossier',
    description:
      'Deliver a completed property dossier as a verified PDF. This is the ONLY sanctioned way to deliver a dossier and send DONE — do not hand-write a dossier message or a DONE yourself. It requires properties/<apn>/dossier.md to already exist, renders + verifies the PDF, attaches it, and emits one DONE. Errors loudly if the .md is missing or the PDF render fails (so you can never claim "(PDF)" without a real PDF).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        apn: { type: 'string', description: 'The APN — the per-property folder under properties/<apn>/ where dossier.md lives.' },
        address: { type: 'string', description: 'Human-readable address for the DONE line (e.g. "270 Live Oak Dr, Danville").' },
        to: { type: 'string', description: 'Destination name. Optional — defaults to the requester (current conversation, i.e. Nano).' },
      },
      required: ['apn', 'address'],
    },
  },
  async handler(args) {
    const apn = (args.apn as string)?.trim();
    const address = (args.address as string)?.trim();
    if (!apn) return err('apn is required');
    if (!address) return err('address is required');

    const dir = path.resolve('/workspace/agent/properties', apn);
    const md = path.join(dir, 'dossier.md');
    const pdf = path.join(dir, 'dossier.pdf');

    // 1. Require the persisted markdown. This forces "write the .md first" —
    //    the regression was delivering text with no file ever written.
    if (!fs.existsSync(md)) {
      return err(
        `No dossier.md at properties/${apn}/. Write the full dossier markdown to that path FIRST (it is the searchable local record), then call deliver_dossier again. Do not deliver dossier text in a chat message.`,
      );
    }

    // 2. Render the PDF. If pandoc fails, deliver NOTHING and report — never
    //    claim a PDF that wasn't produced.
    const r = spawnSync('pandoc', [md, '-o', pdf, '--pdf-engine=wkhtmltopdf'], { encoding: 'utf-8', timeout: 120000 });
    if (r.status !== 0) {
      return err(
        `PDF render failed (pandoc exit ${r.status}): ${(r.stderr || r.stdout || 'unknown').slice(0, 300)}. Dossier NOT delivered. The .md is saved at properties/${apn}/dossier.md; fix the render — do NOT claim "(PDF)".`,
      );
    }

    // 3. Verify the artifact is a real, non-trivial PDF.
    if (!fs.existsSync(pdf)) return err(`pandoc reported success but ${pdf} does not exist. Not delivering.`);
    const size = fs.statSync(pdf).size;
    if (size < MIN_PDF_BYTES) return err(`Rendered PDF is only ${size} bytes (< ${MIN_PDF_BYTES}) — likely empty/broken. Not delivering.`);
    const head = fs.readFileSync(pdf).subarray(0, 5).toString('latin1');
    if (!head.startsWith('%PDF')) return err(`Rendered file is not a PDF (starts with "${head}"). Not delivering.`);

    // 4. Attach + emit exactly ONE truthful DONE (single outbound row).
    const routing = resolveRouting(args.to as string | undefined);
    if ('error' in routing) return err(routing.error);

    const id = `dossier-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filename = `${apn}-dossier.pdf`;
    const outboxDir = path.join('/workspace/outbox', id);
    fs.mkdirSync(outboxDir, { recursive: true });
    fs.copyFileSync(pdf, path.join(outboxDir, filename));

    writeMessageOut({
      id,
      in_reply_to: getCurrentInReplyTo(),
      kind: 'chat',
      platform_id: routing.platform_id,
      channel_type: routing.channel_type,
      thread_id: routing.thread_id,
      content: JSON.stringify({ text: `DONE: ${address} — dossier delivered (PDF)`, files: [filename] }),
    });

    log(`deliver_dossier: ${apn} (${size} bytes) → ${routing.resolvedName} with DONE`);
    return ok(`Delivered ${filename} (${size} bytes, verified PDF) to ${routing.resolvedName} with a single DONE. Delivery complete — END YOUR TURN; do not send any further message.`);
  },
};

registerTools([deliverDossier]);
