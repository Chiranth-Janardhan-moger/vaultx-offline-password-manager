import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePasswordHealth } from '../lib/password-health.ts';
import { parseCsvRows, parsePasswordCsv } from '../lib/csv-import.ts';
import { isHapticsEnabled, setHapticsEnabled } from '../lib/haptics.ts';

test('Password Health - detects weak, reused, and 2FA-missing accounts per workspace', () => {
  const passwords = [
    { service: 'Bank', username: 'u1', password: '123', workspace: 'Personal' },
    { service: 'Forum', username: 'u2', password: 'SharedStrongPassword!99', workspace: 'Personal', totpSecret: 'JBSWY3DPEHPK3PXP' },
    { service: 'Shop', username: 'u3', password: 'SharedStrongPassword!99', workspace: 'Personal' },
    { itemType: 'note', service: 'Home Wi-Fi', username: '', password: '', notes: 'SecretWifi123', workspace: 'Personal' },
    { service: 'WorkApp', username: 'w1', password: '123', workspace: 'Work' },
  ];

  const personal = analyzePasswordHealth(passwords, 'Personal');
  assert.strictEqual(personal.totalChecked, 3);
  assert.strictEqual(personal.weakItems.length, 1);
  assert.strictEqual(personal.weakItems[0].item.service, 'Bank');
  assert.strictEqual(personal.reusedGroups.length, 1);
  assert.strictEqual(personal.reusedAccountCount, 2);
  assert.strictEqual(personal.missing2faItems.length, 2);
});

test('CSV Import - parses Chrome/Edge CSV with quoted commas and escaped quotes', () => {
  const csv = [
    'name,url,username,password,note',
    '"Acme, Inc.",https://acme.example.com/login,alice@acme.com,"P@ss""word,123","Line 1',
    'Line 2"',
    ',https://www.github.com/login,octo,GhPass!987654,',
    ',,,,',
  ].join('\n');

  const rows = parseCsvRows(csv);
  assert.strictEqual(rows.length, 3);

  const res = parsePasswordCsv(csv, 'Work');
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.format, 'chrome');
  assert.strictEqual(res.items.length, 2);
  assert.strictEqual(res.items[0].service, 'Acme, Inc.');
  assert.strictEqual(res.items[0].website, 'https://acme.example.com/login');
  assert.strictEqual(res.items[0].password, 'P@ss"word,123');
  assert.strictEqual(res.items[0].notes, 'Line 1\nLine 2');
  assert.strictEqual(res.items[0].workspace, 'Work');
  assert.strictEqual(res.items[1].service, 'github.com');
});

test('CSV Import - parses Bitwarden CSV including TOTP URI', () => {
  const csv = [
    'folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp',
    ',,login,Proton,, ,0,https://proton.me,me@proton.me,UltraStrong#42,otpauth://totp/Proton:me@proton.me?secret=GEZDGNBVGY3TQOJQ',
  ].join('\n');

  const res = parsePasswordCsv(csv, 'Personal');
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.format, 'bitwarden');
  assert.strictEqual(res.items.length, 1);
  assert.strictEqual(res.items[0].totpSecret, 'GEZDGNBVGY3TQOJQ');
  assert.strictEqual(res.items[0].website, 'https://proton.me');
});

test('Haptics - defaults to enabled and persists user toggle', async () => {
  assert.strictEqual(await isHapticsEnabled(), true);
  await setHapticsEnabled(false);
  assert.strictEqual(await isHapticsEnabled(), false);
  await setHapticsEnabled(true);
  assert.strictEqual(await isHapticsEnabled(), true);
});
