import { describe, expect, it } from 'vitest';

import { EGRESS_NETWORK, EgressLockdownError, egressNetworkArgs, ensureEgressNetwork } from './egress-lockdown.js';

describe('egress-lockdown', () => {
  it('egressNetworkArgs places the container on the egress network', () => {
    expect(egressNetworkArgs()).toEqual(['--network', EGRESS_NETWORK]);
  });

  it('EGRESS_NETWORK defaults to nanoclaw-egress', () => {
    // No NANOCLAW_EGRESS_NETWORK override in the test env.
    expect(EGRESS_NETWORK).toBe('nanoclaw-egress');
  });

  it('ensureEgressNetwork returns false (host-gateway path) when lockdown is off', () => {
    // NANOCLAW_EGRESS_LOCKDOWN is unset under vitest → lockdown disabled →
    // returns false WITHOUT making any docker calls (the early-return guard).
    expect(ensureEgressNetwork()).toBe(false);
  });

  it('EgressLockdownError names the cause, the gateway, and the opt-out', () => {
    const e = new EgressLockdownError('the "nanoclaw-egress" internal network could not be created');
    expect(e.name).toBe('EgressLockdownError');
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toContain('NANOCLAW_EGRESS_LOCKDOWN=true');
    expect(e.message).toContain('internal network could not be created');
    expect(e.message).toContain('NANOCLAW_EGRESS_LOCKDOWN=false'); // opt-out hint
  });
});
