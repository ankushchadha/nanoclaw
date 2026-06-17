import { describe, expect, test } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { findBlockedDomain, findDisallowedUrl, isPdftoppmRender, loadRunnerPolicy, pdftoppmFullPageDpiViolation } from './policy.js';

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

describe('isPdftoppmRender', () => {
  test('matches a full-page render', () => {
    expect(isPdftoppmRender('pdftoppm -png -r 150 -f 1 -l 1 map.pdf out')).toBe(true);
  });
  test('matches a cropped render', () => {
    expect(isPdftoppmRender('pdftoppm -png -r 300 -x 100 -y 200 -W 400 -H 300 -f 2 -l 2 map.pdf out')).toBe(true);
  });
  test('does not match non-render commands', () => {
    expect(isPdftoppmRender('pdftotext deed.pdf -')).toBe(false);
    expect(isPdftoppmRender('agent-browser open https://taxcolp.cccttc.us/lookup/')).toBe(false);
  });
});

describe('loadRunnerPolicy maxRendersPerRun', () => {
  test('parses a positive cap; rejects non-positive / missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-'));
    const a = path.join(dir, 'a.json');
    fs.writeFileSync(a, JSON.stringify({ maxRendersPerRun: 15 }));
    expect(loadRunnerPolicy(a).maxRendersPerRun).toBe(15);
    const b = path.join(dir, 'b.json');
    fs.writeFileSync(b, JSON.stringify({ maxRendersPerRun: 0 }));
    expect(loadRunnerPolicy(b).maxRendersPerRun).toBe(null);
    const c = path.join(dir, 'c.json');
    fs.writeFileSync(c, JSON.stringify({ stateless: true }));
    expect(loadRunnerPolicy(c).maxRendersPerRun).toBe(null);
  });
});

describe('loadRunnerPolicy maxIdenticalCommands', () => {
  test('parses a positive cap; rejects non-positive / missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-'));
    const a = path.join(dir, 'a.json');
    fs.writeFileSync(a, JSON.stringify({ maxIdenticalCommands: 6 }));
    expect(loadRunnerPolicy(a).maxIdenticalCommands).toBe(6);
    const b = path.join(dir, 'b.json');
    fs.writeFileSync(b, JSON.stringify({ maxIdenticalCommands: -1 }));
    expect(loadRunnerPolicy(b).maxIdenticalCommands).toBe(null);
    const c = path.join(dir, 'c.json');
    fs.writeFileSync(c, JSON.stringify({ stateless: true }));
    expect(loadRunnerPolicy(c).maxIdenticalCommands).toBe(null);
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

describe('findDisallowedUrl (allow-list egress)', () => {
  const allow = ['coloradotime.com', 'hytek.active.com'];
  test('empty allow-list → off (null)', () => {
    expect(findDisallowedUrl('curl https://anything.example.com', [])).toBeNull();
  });
  test('no URL in text → passes (null)', () => {
    expect(findDisallowedUrl('ls -la /workspace && cat file.md', allow)).toBeNull();
  });
  test('allowed host (exact) → null', () => {
    expect(findDisallowedUrl('WebFetch https://coloradotime.com/support/manuals', allow)).toBeNull();
  });
  test('allowed host (subdomain) → null', () => {
    expect(findDisallowedUrl('curl https://www.coloradotime.com/hubfs/x.pdf', allow)).toBeNull();
  });
  test('disallowed host → returns host', () => {
    expect(findDisallowedUrl('curl https://zillow.com/foo', allow)).toBe('zillow.com');
  });
  test('look-alike host does NOT slip through (suffix attack)', () => {
    expect(findDisallowedUrl('curl https://coloradotime.com.evil.com/x', allow)).toBe('coloradotime.com.evil.com');
    expect(findDisallowedUrl('curl https://evilcoloradotime.com/x', allow)).toBe('evilcoloradotime.com');
  });
  test('userinfo on an allowed host → allowed (creds stripped)', () => {
    expect(findDisallowedUrl('curl https://user:tok@coloradotime.com/x', allow)).toBeNull();
  });
  test('userinfo disguise → evaluates TRUE host and blocks it', () => {
    // real destination is evil.com; the allowed-looking userinfo must not admit it
    expect(findDisallowedUrl('curl https://coloradotime.com@evil.com/x', allow)).toBe('evil.com');
  });
  test('trailing-dot FQDN on an allowed host → allowed', () => {
    expect(findDisallowedUrl('curl https://coloradotime.com./x', allow)).toBeNull();
  });
  test('first disallowed URL among several is reported', () => {
    const cmd = 'curl https://coloradotime.com/a && curl https://reddit.com/b';
    expect(findDisallowedUrl(cmd, allow)).toBe('reddit.com');
  });
  test('port is stripped before matching', () => {
    expect(findDisallowedUrl('curl https://coloradotime.com:443/x', allow)).toBeNull();
  });
});

describe('loadRunnerPolicy', () => {
  test('missing file → safe defaults', () => {
    const p = loadRunnerPolicy(path.join(os.tmpdir(), 'does-not-exist-policy.json'));
    expect(p.stateless).toBe(false);
    expect(p.blockedDomains).toEqual([]);
    expect(p.allowedDomains).toEqual([]);
  });

  test('parses allowedDomains, normalizes to bare host (strips scheme/path/port)', () => {
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'policy-')), 'runner-policy.json');
    fs.writeFileSync(
      tmp,
      JSON.stringify({
        allowedDomains: ['https://Coloradotime.com', ' hytek.active.com/user_guides_html ', 'activenetwork.my.salesforce-sites.com/hytekswimming', ''],
      }),
    );
    expect(loadRunnerPolicy(tmp).allowedDomains).toEqual([
      'coloradotime.com',
      'hytek.active.com',
      'activenetwork.my.salesforce-sites.com',
    ]);
  });

  test('rejects single-label / wildcard / malformed allowedDomains entries (no bare-TLD bypass)', () => {
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'policy-')), 'runner-policy.json');
    fs.writeFileSync(
      tmp,
      JSON.stringify({ allowedDomains: ['com', 'https://com', '*.com', '.com', 'localhost', 'evil.com@x', 'coloradotime.com.', 'good.example.com'] }),
    );
    // Only the well-formed multi-label hosts survive; 'coloradotime.com.' normalizes (trailing dot stripped).
    expect(loadRunnerPolicy(tmp).allowedDomains).toEqual(['coloradotime.com', 'good.example.com']);
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
