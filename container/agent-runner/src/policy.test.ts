import { describe, expect, test } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { findBlockedDomain, loadRunnerPolicy, pdftoppmFullPageDpiViolation } from './policy.js';

describe('pdftoppmFullPageDpiViolation', () => {
  const cap = 150;
  test('full-page render above cap → violation (returns dpi)', () => {
    expect(pdftoppmFullPageDpiViolation('pdftoppm -png -r 300 -f 6 -l 6 in.pdf out', cap)).toBe(300);
    expect(pdftoppmFullPageDpiViolation('pdftoppm -png -r 250 -f 11 -l 11 in.pdf out', cap)).toBe(250);
  });
  test('at or below cap → allowed (null)', () => {
    expect(pdftoppmFullPageDpiViolation('pdftoppm -png -r 150 -f 2 -l 4 in.pdf out', cap)).toBeNull();
    expect(pdftoppmFullPageDpiViolation('pdftoppm -png -r 100 -f 1 -l 1 in.pdf out', cap)).toBeNull();
  });
  test('high DPI WITH a crop region → allowed (cropping is the sanctioned path)', () => {
    expect(pdftoppmFullPageDpiViolation('pdftoppm -r 300 -x 100 -y 200 -W 400 -H 400 -f 6 -l 6 in.pdf out', cap)).toBeNull();
  });
  test('non-pdftoppm command → null', () => {
    expect(pdftoppmFullPageDpiViolation('curl https://x.com -r 300', cap)).toBeNull();
  });
  test('no -r flag → null', () => {
    expect(pdftoppmFullPageDpiViolation('pdftoppm -png -f 6 -l 6 in.pdf out', cap)).toBeNull();
  });
});

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
