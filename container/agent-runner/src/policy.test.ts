import { describe, expect, test } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { findBlockedDomain, loadRunnerPolicy } from './policy.js';

describe('findBlockedDomain', () => {
  const blocked = ['parcelquest.com', 'ccgis.maps.arcgis.com', 'zillow.com'];

  test('returns null when clear', () => {
    expect(findBlockedDomain('agent-browser open "https://taxcolp.cccttc.us/lookup/"', blocked)).toBeNull();
  });

  test('matches a blocked domain in a Bash command', () => {
    expect(findBlockedDomain('agent-browser open "https://assr.parcelquest.com/"', blocked)).toBe('parcelquest.com');
  });

  test('is case-insensitive', () => {
    expect(findBlockedDomain('curl https://Zillow.com/homes', blocked)).toBe('zillow.com');
  });

  test('matches the ArcGIS viewer host', () => {
    expect(findBlockedDomain('open https://ccgis.maps.arcgis.com/apps/webappviewer/', blocked)).toBe(
      'ccgis.maps.arcgis.com',
    );
  });

  test('empty blocklist never matches', () => {
    expect(findBlockedDomain('https://parcelquest.com', [])).toBeNull();
  });

  test('empty text never matches', () => {
    expect(findBlockedDomain('', blocked)).toBeNull();
  });
});

describe('loadRunnerPolicy', () => {
  test('missing file → safe defaults', () => {
    const p = loadRunnerPolicy(path.join(os.tmpdir(), 'does-not-exist-policy.json'));
    expect(p.stateless).toBe(false);
    expect(p.blockedDomains).toEqual([]);
  });

  test('parses, lowercases + trims domains, drops empties', () => {
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'policy-')), 'runner-policy.json');
    fs.writeFileSync(tmp, JSON.stringify({ stateless: true, blockedDomains: ['  ParcelQuest.com ', '', 'Zillow.com'] }));
    const p = loadRunnerPolicy(tmp);
    expect(p.stateless).toBe(true);
    expect(p.blockedDomains).toEqual(['parcelquest.com', 'zillow.com']);
  });

  test('malformed JSON → safe defaults', () => {
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'policy-')), 'runner-policy.json');
    fs.writeFileSync(tmp, '{ not json');
    const p = loadRunnerPolicy(tmp);
    expect(p.stateless).toBe(false);
    expect(p.blockedDomains).toEqual([]);
  });

  test('stateless only true for strict boolean true', () => {
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'policy-')), 'runner-policy.json');
    fs.writeFileSync(tmp, JSON.stringify({ stateless: 'yes' }));
    expect(loadRunnerPolicy(tmp).stateless).toBe(false);
  });
});
