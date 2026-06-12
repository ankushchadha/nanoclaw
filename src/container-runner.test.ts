import { describe, expect, it } from 'vitest';

import {
  OAUTH_PLACEHOLDER_TOKEN,
  oauthGatewayEnvArgs,
  resolveProviderName,
  shouldBypassEgress,
} from './container-runner.js';

describe('resolveProviderName', () => {
  it('prefers session over container config', () => {
    expect(resolveProviderName('codex', 'claude')).toBe('codex');
  });

  it('falls back to container config when session is null', () => {
    expect(resolveProviderName(null, 'opencode')).toBe('opencode');
  });

  it('defaults to claude when nothing is set', () => {
    expect(resolveProviderName(null, undefined)).toBe('claude');
  });

  it('lowercases the resolved name', () => {
    expect(resolveProviderName('CODEX', null)).toBe('codex');
    expect(resolveProviderName(null, 'Claude')).toBe('claude');
  });

  it('treats empty string as unset (falls through)', () => {
    expect(resolveProviderName('', 'opencode')).toBe('opencode');
    expect(resolveProviderName(null, '')).toBe('claude');
  });
});

describe('shouldBypassEgress', () => {
  it('true when the folder is in the open-groups set', () => {
    expect(shouldBypassEgress('researcher', new Set(['researcher', 'agentsq']))).toBe(true);
  });
  it('false when the folder is not in the set', () => {
    expect(shouldBypassEgress('coach', new Set(['researcher']))).toBe(false);
  });
  it('false for an empty open-groups set (full lockdown)', () => {
    expect(shouldBypassEgress('anything', new Set())).toBe(false);
  });
});

describe('oauthGatewayEnvArgs', () => {
  it('empty when OAuth-via-gateway is off', () => {
    expect(oauthGatewayEnvArgs(false, false)).toEqual([]);
  });
  it('empty when native credentials are enabled (native takes precedence)', () => {
    expect(oauthGatewayEnvArgs(true, true)).toEqual([]);
  });
  it('injects the placeholder token and blanks ANTHROPIC_API_KEY when enabled and not native', () => {
    const args = oauthGatewayEnvArgs(true, false);
    expect(args).toContain(`CLAUDE_CODE_OAUTH_TOKEN=${OAUTH_PLACEHOLDER_TOKEN}`);
    expect(args).toContain('ANTHROPIC_API_KEY=');
    expect(OAUTH_PLACEHOLDER_TOKEN).toMatch(/^sk-ant-oat01-/);
  });
});
