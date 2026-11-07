import test from 'node:test';
import assert from 'node:assert/strict';
import { categories, categorizeService, getCategoryById, getEffectiveCategories } from '../lib/categories.ts';

test('Categories - Schema and Integrity', () => {
  assert.ok(Array.isArray(categories));
  assert.ok(categories.length >= 7);

  for (const cat of categories) {
    assert.ok(cat.id, 'Category must have an id');
    assert.ok(cat.name, 'Category must have a name');
    assert.ok(cat.icon, 'Category must have an icon');
    assert.ok(Array.isArray(cat.gradient) && cat.gradient.length === 2, 'Category gradient must be a pair');
    assert.ok(Array.isArray(cat.keywords), 'Keywords must be an array');
  }
});

test('Categories - Service Categorization', () => {
  // Google
  assert.strictEqual(categorizeService('Google Workspace'), 'google');
  assert.strictEqual(categorizeService('Gmail - Work'), 'google');
  assert.strictEqual(categorizeService('YouTube Premium'), 'google');

  // Banking & Finance
  assert.strictEqual(categorizeService('SBI Netbanking'), 'banking');
  assert.strictEqual(categorizeService('HDFC Bank'), 'banking');
  assert.strictEqual(categorizeService('Paytm Wallet'), 'banking');
  assert.strictEqual(categorizeService('PhonePe UPI'), 'banking');

  // Social
  assert.strictEqual(categorizeService('Instagram'), 'social');
  assert.strictEqual(categorizeService('Discord'), 'social');
  assert.strictEqual(categorizeService('Reddit User'), 'social');

  // Work
  assert.strictEqual(categorizeService('Slack Team'), 'work');
  assert.strictEqual(categorizeService('GitHub Account'), 'work');
  assert.strictEqual(categorizeService('Notion Workspace'), 'work');

  // Entertainment
  assert.strictEqual(categorizeService('Netflix'), 'entertainment');
  assert.strictEqual(categorizeService('Spotify'), 'entertainment');

  // Shopping
  assert.strictEqual(categorizeService('Amazon Shopping'), 'shopping');
  assert.strictEqual(categorizeService('Flipkart Account'), 'shopping');
  assert.strictEqual(categorizeService('Swiggy Food'), 'shopping');

  // Other / Fallback
  assert.strictEqual(categorizeService('Random Local Device'), 'other');
  assert.strictEqual(categorizeService('Home WiFi Router'), 'other');
});

test('Categories - getCategoryById Retrieval', () => {
  const googleCat = getCategoryById('google');
  assert.strictEqual(googleCat.id, 'google');
  assert.strictEqual(googleCat.name, 'Google');

  const bankingCat = getCategoryById('banking');
  assert.strictEqual(bankingCat.id, 'banking');

  // Fallback on unknown category id
  const fallback = getCategoryById('non_existent');
  assert.ok(fallback);
  assert.strictEqual(fallback.id, 'other');
});

test('Categories - getEffectiveCategories and Overrides', () => {
  const all = getEffectiveCategories();
  assert.strictEqual(all.length, categories.length);

  // Exclude deleted categories
  const filtered = getEffectiveCategories(['shopping', 'entertainment']);
  assert.strictEqual(filtered.length, categories.length - 2);
  assert.ok(!filtered.some((c) => c.id === 'shopping' || c.id === 'entertainment'));

  // Custom name override
  const overridden = getEffectiveCategories([], { banking: 'Finances' });
  const bankingCat = overridden.find((c) => c.id === 'banking');
  assert.ok(bankingCat);
  assert.strictEqual(bankingCat.name, 'Finances');
});

test('Categories - categorizeService with Deleted Categories Fallback', () => {
  // Normally Amazon is shopping
  assert.strictEqual(categorizeService('Amazon Shopping'), 'shopping');

  // If shopping is deleted, unclassified service defaults to other
  assert.strictEqual(categorizeService('Amazon Shopping', ['shopping']), 'other');

  // If both shopping and other are deleted, falls back to google
  assert.strictEqual(categorizeService('Amazon Shopping', ['shopping', 'other']), 'google');

  // If both shopping and other are deleted with custom fallback
  assert.strictEqual(categorizeService('Amazon Shopping', ['shopping', 'other'], 'work'), 'work');
});
