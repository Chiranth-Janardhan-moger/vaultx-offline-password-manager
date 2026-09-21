import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeServiceName,
  getServiceIcon,
  getServiceColor,
} from '../lib/service-icons.ts';

test('Service Icons - Normalization of Known Services', () => {
  assert.strictEqual(normalizeServiceName('google'), 'Google');
  assert.strictEqual(normalizeServiceName('  GMAIL  '), 'Gmail');
  assert.strictEqual(normalizeServiceName('github'), 'GitHub');
  assert.strictEqual(normalizeServiceName('gitlab'), 'GitLab');
  assert.strictEqual(normalizeServiceName('fb'), 'Facebook');
  assert.strictEqual(normalizeServiceName('insta'), 'Instagram');
  assert.strictEqual(normalizeServiceName('x.com'), 'Twitter');
  assert.strictEqual(normalizeServiceName('yt'), 'YouTube');
});

test('Service Icons - Normalization of Unknown Services', () => {
  assert.strictEqual(normalizeServiceName('mycustomvpn'), 'Mycustomvpn');
  assert.strictEqual(normalizeServiceName('custom-service'), 'Custom-service');
});

test('Service Icons - Icon Mapping', () => {
  assert.strictEqual(getServiceIcon('Google'), 'logo-google');
  assert.strictEqual(getServiceIcon('GitHub'), 'logo-github');
  assert.strictEqual(getServiceIcon('PayPal'), 'wallet-outline');
  assert.strictEqual(getServiceIcon('Netflix'), 'tv-outline');
  assert.strictEqual(getServiceIcon('Oracle Cloud'), 'server-outline');
  assert.strictEqual(getServiceIcon('SAP ERP'), 'business-outline');
  assert.strictEqual(getServiceIcon('GE Healthcare'), 'medical-outline');
  assert.strictEqual(getServiceIcon('LIC Portal'), 'shield-checkmark-outline');
  assert.strictEqual(getServiceIcon('Indian Oil Account'), 'flame-outline');
  assert.strictEqual(getServiceIcon('Supabase DB'), 'flash-outline');
  assert.strictEqual(getServiceIcon('Zoho Mail'), 'grid-outline');
  assert.strictEqual(getServiceIcon('IRCTC Booking'), 'train-outline');
  assert.strictEqual(getServiceIcon('RailOne App'), 'train-outline');
  assert.strictEqual(getServiceIcon('Docker Hub'), 'cube-outline');
  assert.strictEqual(getServiceIcon('Cloudflare DNS'), 'cloud-outline');

  // Semantic category fallbacks
  assert.strictEqual(getServiceIcon('My Bank Account'), 'card-outline');
  assert.strictEqual(getServiceIcon('Secure Web Mail'), 'mail-outline');
  assert.strictEqual(getServiceIcon('Team Chat App'), 'chatbubble-outline');

  // Unknown service fallback
  assert.strictEqual(getServiceIcon('RandomArbitrarySite123'), 'globe-outline');
});

test('Service Icons - Color Determinism', () => {
  assert.strictEqual(getServiceColor('Google'), '#4285F4');
  assert.strictEqual(getServiceColor('Spotify'), '#1DB954');

  // Unknown services should produce a valid hex color and be deterministic
  const color1 = getServiceColor('ArbitraryServiceA');
  const color2 = getServiceColor('ArbitraryServiceA');
  assert.strictEqual(color1, color2);
  assert.match(color1, /^#[0-9a-fA-F]{6}$/);
});
