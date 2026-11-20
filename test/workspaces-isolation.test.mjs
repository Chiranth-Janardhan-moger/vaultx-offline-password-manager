import test from 'node:test';
import assert from 'node:assert/strict';
import '../lib/crypto-shim.ts';
import {
  generateSaltHex,
  createNewVault,
  saveVault,
  decryptVaultWithKey,
  getEffectiveWorkspaces,
  getWorkspaceCustomTags,
  getWorkspaceDeletedCategories,
} from '../lib/vault.ts';
import { _clearFiles } from './mocks/expo-file-system.mjs';

test.beforeEach(() => {
  _clearFiles();
});

test('Workspace Isolation - Cards filtering by active workspace', async () => {
  const vaultKey = generateSaltHex(32);
  const vault = await createNewVault('MyPassword123!', vaultKey);

  vault.cards = [
    {
      id: 'c1',
      type: 'credit_card',
      title: 'Personal Visa',
      holderName: 'Alice',
      number: '4111111111111111',
      fields: [],
      gradient: ['#000', '#111'],
      createdAt: 1000,
      workspace: 'Personal',
    },
    {
      id: 'c2',
      type: 'debit_card',
      title: 'Work Corporate Card',
      holderName: 'Alice',
      number: '5500000000000004',
      fields: [],
      gradient: ['#000', '#111'],
      createdAt: 2000,
      workspace: 'Work',
    },
    {
      id: 'c3',
      type: 'custom',
      title: 'Legacy Card without Workspace',
      holderName: 'Alice',
      number: '1234',
      fields: [],
      gradient: ['#000', '#111'],
      createdAt: 3000,
    },
  ];

  await saveVault(vault, vaultKey);
  const reloaded = await decryptVaultWithKey(vaultKey);

  // Filter for Personal
  const personalCards = (reloaded.cards || []).filter(
    (c) => (c.workspace || 'Personal') === 'Personal'
  );
  assert.strictEqual(personalCards.length, 2);
  assert.strictEqual(personalCards[0].title, 'Personal Visa');
  assert.strictEqual(personalCards[1].title, 'Legacy Card without Workspace');

  // Filter for Work
  const workCards = (reloaded.cards || []).filter(
    (c) => (c.workspace || 'Personal') === 'Work'
  );
  assert.strictEqual(workCards.length, 1);
  assert.strictEqual(workCards[0].title, 'Work Corporate Card');
});

test('Workspace Isolation - Cards reordering within workspace preserves other workspaces', async () => {
  const vaultKey = generateSaltHex(32);
  const vault = await createNewVault('MyPassword123!', vaultKey);

  vault.cards = [
    { id: 'p1', type: 'custom', title: 'Personal 1', holderName: 'A', number: '1', fields: [], gradient: ['#000', '#111'], createdAt: 1, workspace: 'Personal' },
    { id: 'w1', type: 'custom', title: 'Work 1', holderName: 'A', number: '2', fields: [], gradient: ['#000', '#111'], createdAt: 2, workspace: 'Work' },
    { id: 'p2', type: 'custom', title: 'Personal 2', holderName: 'A', number: '3', fields: [], gradient: ['#000', '#111'], createdAt: 3, workspace: 'Personal' },
  ];

  // Moving Personal 2 up in Personal workspace: target is p2, neighbor is p1
  const personalCards = vault.cards.filter((c) => (c.workspace || 'Personal') === 'Personal');
  assert.deepStrictEqual(personalCards.map(c => c.id), ['p1', 'p2']);

  const targetCard = personalCards[1]; // p2
  const neighborCard = personalCards[0]; // p1

  const idxTarget = vault.cards.findIndex((c) => c.id === targetCard.id);
  const idxNeighbor = vault.cards.findIndex((c) => c.id === neighborCard.id);

  const nextVaultCards = [...vault.cards];
  nextVaultCards[idxTarget] = neighborCard;
  nextVaultCards[idxNeighbor] = targetCard;
  vault.cards = nextVaultCards;

  await saveVault(vault, vaultKey);
  const reloaded = await decryptVaultWithKey(vaultKey);

  // Personal order is now [p2, p1]
  const reloadedPersonal = reloaded.cards.filter((c) => (c.workspace || 'Personal') === 'Personal');
  assert.deepStrictEqual(reloadedPersonal.map(c => c.id), ['p2', 'p1']);

  // Work card was untouched
  const reloadedWork = reloaded.cards.filter((c) => (c.workspace || 'Personal') === 'Work');
  assert.deepStrictEqual(reloadedWork.map(c => c.id), ['w1']);
});

test('Workspace Isolation - Passwords active workspace count vs total', async () => {
  const vaultKey = generateSaltHex(32);
  const vault = await createNewVault('MyPassword123!', vaultKey);

  // Add 33 personal passwords
  for (let i = 1; i <= 33; i++) {
    vault.passwords.push({
      service: `PersonalService${i}`,
      username: `user${i}`,
      password: `pass${i}`,
      workspace: 'Personal',
    });
  }

  // Add 3 work passwords
  for (let i = 1; i <= 3; i++) {
    vault.passwords.push({
      service: `WorkService${i}`,
      username: `workuser${i}`,
      password: `workpass${i}`,
      workspace: 'Work',
    });
  }

  await saveVault(vault, vaultKey);
  const reloaded = await decryptVaultWithKey(vaultKey);

  // Total passwords across whole vault is 36
  assert.strictEqual(reloaded.passwords.length, 36);

  // Active workspace count for Personal is 33
  const personalCount = reloaded.passwords.filter(
    (p) => (p.workspace || 'Personal') === 'Personal'
  ).length;
  assert.strictEqual(personalCount, 33);

  // Active workspace count for Work is 3
  const workCount = reloaded.passwords.filter(
    (p) => (p.workspace || 'Personal') === 'Work'
  ).length;
  assert.strictEqual(workCount, 3);
});

test('Workspace Isolation - Workspace rename and delete updates both passwords and cards', async () => {
  const vaultKey = generateSaltHex(32);
  const vault = await createNewVault('MyPassword123!', vaultKey);

  vault.customSpaces = ['ProjectAlpha'];
  vault.passwords = [
    { service: 'AlphaPortal', username: 'u1', password: 'p1', workspace: 'ProjectAlpha' },
  ];
  vault.cards = [
    { id: 'cAlpha', type: 'custom', title: 'Alpha Card', holderName: 'A', number: '99', fields: [], gradient: ['#000', '#111'], createdAt: 1, workspace: 'ProjectAlpha' },
  ];

  // Rename ProjectAlpha -> ProjectBeta
  const updatedCustom = vault.customSpaces.map((s) => (s === 'ProjectAlpha' ? 'ProjectBeta' : s));
  vault.passwords = vault.passwords.map((p) =>
    p.workspace === 'ProjectAlpha' ? { ...p, workspace: 'ProjectBeta' } : p
  );
  vault.cards = vault.cards.map((c) =>
    c.workspace === 'ProjectAlpha' ? { ...c, workspace: 'ProjectBeta' } : c
  );
  vault.customSpaces = updatedCustom;

  await saveVault(vault, vaultKey);
  let reloaded = await decryptVaultWithKey(vaultKey);

  assert.strictEqual(reloaded.passwords[0].workspace, 'ProjectBeta');
  assert.strictEqual(reloaded.cards[0].workspace, 'ProjectBeta');

  // Delete ProjectBeta -> items move to Personal
  vault.customSpaces = vault.customSpaces.filter((s) => s !== 'ProjectBeta');
  vault.passwords = vault.passwords.map((p) =>
    p.workspace === 'ProjectBeta' ? { ...p, workspace: 'Personal' } : p
  );
  vault.cards = vault.cards.map((c) =>
    c.workspace === 'ProjectBeta' ? { ...c, workspace: 'Personal' } : c
  );

  await saveVault(vault, vaultKey);
  reloaded = await decryptVaultWithKey(vaultKey);

  assert.strictEqual(reloaded.passwords[0].workspace, 'Personal');
  assert.strictEqual(reloaded.cards[0].workspace, 'Personal');
});

test('Workspace Isolation - Deleting tag in Personal does not affect items in Work', async () => {
  const vaultKey = generateSaltHex(32);
  const vault = await createNewVault('MyPassword123!', vaultKey);

  vault.passwords = [
    { service: 'PersonalBank', username: 'alice', password: 'p1', folder: 'Finance', workspace: 'Personal' },
    { service: 'WorkPayroll', username: 'alice_corp', password: 'p2', folder: 'Finance', workspace: 'Work' },
  ];
  vault.cards = [
    { id: 'c1', type: 'credit_card', title: 'Personal Visa', holderName: 'A', number: '1', fields: [], gradient: ['#000', '#111'], createdAt: 1, folder: 'Finance', workspace: 'Personal' },
    { id: 'c2', type: 'credit_card', title: 'Corporate Amex', holderName: 'A', number: '2', fields: [], gradient: ['#000', '#111'], createdAt: 2, folder: 'Finance', workspace: 'Work' },
  ];
  vault.workspaceCustomTags = {
    Personal: ['Finance', 'Home'],
    Work: ['Finance', 'Cloud'],
  };
  vault.customTags = ['Finance', 'Home', 'Cloud'];

  // Simulate deleting tag 'Finance' while viewing 'Personal' workspace
  const currentWs = 'Personal';
  const tagToDelete = 'Finance';
  const fallbackId = 'google';

  const updatedPasswords = vault.passwords.map((p) => {
    const itemWs = p.workspace || 'Personal';
    if (itemWs === currentWs && p.folder === tagToDelete) {
      return { ...p, folder: undefined, category: fallbackId, modifiedAt: Date.now() };
    }
    return p;
  });

  const updatedCards = vault.cards.map((c) => {
    const itemWs = c.workspace || 'Personal';
    if (itemWs === currentWs && c.folder === tagToDelete) {
      return { ...c, folder: undefined };
    }
    return c;
  });

  const currentWsCustom = getWorkspaceCustomTags(vault, currentWs).filter((t) => t !== tagToDelete);
  const updatedWorkspaceCustomTags = {
    ...(vault.workspaceCustomTags || {}),
    [currentWs]: currentWsCustom,
  };

  const isUsedInOtherWorkspace =
    updatedPasswords.some((p) => (p.workspace || 'Personal') !== currentWs && p.folder === tagToDelete) ||
    updatedCards.some((c) => (c.workspace || 'Personal') !== currentWs && c.folder === tagToDelete) ||
    Object.entries(updatedWorkspaceCustomTags).some(([ws, tags]) => ws !== currentWs && tags.includes(tagToDelete));

  const updatedCustomTags = isUsedInOtherWorkspace
    ? vault.customTags
    : (vault.customTags || []).filter((t) => t !== tagToDelete);

  vault.passwords = updatedPasswords;
  vault.cards = updatedCards;
  vault.workspaceCustomTags = updatedWorkspaceCustomTags;
  vault.customTags = updatedCustomTags;

  await saveVault(vault, vaultKey);
  const reloaded = await decryptVaultWithKey(vaultKey);

  // Personal password has folder removed
  const personalPwd = reloaded.passwords.find((p) => p.workspace === 'Personal');
  assert.strictEqual(personalPwd.folder, undefined);
  assert.strictEqual(personalPwd.category, 'google');

  // Work password still has folder 'Finance' untouched
  const workPwd = reloaded.passwords.find((p) => p.workspace === 'Work');
  assert.strictEqual(workPwd.folder, 'Finance');

  // Personal card has folder removed
  const personalCard = reloaded.cards.find((c) => c.workspace === 'Personal');
  assert.strictEqual(personalCard.folder, undefined);

  // Work card still has folder 'Finance' untouched
  const workCard = reloaded.cards.find((c) => c.workspace === 'Work');
  assert.strictEqual(workCard.folder, 'Finance');

  // Tag was removed from Personal's tags, but retained in Work's tags
  assert.deepStrictEqual(getWorkspaceCustomTags(reloaded, 'Personal'), ['Home']);
  assert.deepStrictEqual(getWorkspaceCustomTags(reloaded, 'Work'), ['Finance', 'Cloud']);
});

test('Workspace Isolation - Custom tags created in Personal do not leak into Work', async () => {
  const vaultKey = generateSaltHex(32);
  const vault = await createNewVault('MyPassword123!', vaultKey);

  vault.workspaceCustomTags = {
    Personal: ['PersonalTag1', 'PersonalTag2'],
    Work: ['WorkTag1'],
  };

  await saveVault(vault, vaultKey);
  const reloaded = await decryptVaultWithKey(vaultKey);

  const personalTags = getWorkspaceCustomTags(reloaded, 'Personal');
  const workTags = getWorkspaceCustomTags(reloaded, 'Work');

  assert.deepStrictEqual(personalTags, ['PersonalTag1', 'PersonalTag2']);
  assert.deepStrictEqual(workTags, ['WorkTag1']);
  assert.strictEqual(workTags.includes('PersonalTag1'), false);
  assert.strictEqual(personalTags.includes('WorkTag1'), false);
});

test('Workspace Isolation - Workspace rename migrates workspace-scoped tags and categories', async () => {
  const vaultKey = generateSaltHex(32);
  const vault = await createNewVault('MyPassword123!', vaultKey);

  vault.customSpaces = ['Freelance'];
  vault.passwords = [
    { service: 'Client A', username: 'admin', password: 'secret', workspace: 'Freelance', folder: 'Contracts' },
  ];
  vault.workspaceCustomTags = {
    Freelance: ['Contracts', 'Invoices'],
    Personal: ['Home'],
  };
  vault.workspaceDeletedCategories = {
    Freelance: ['gaming'],
    Personal: ['shopping'],
  };

  // Simulate renaming 'Freelance' to 'Clients'
  const oldName = 'Freelance';
  const newName = 'Clients';

  const updatedCustom = (vault.customSpaces || []).map((s) => (s === oldName ? newName : s));
  const updatedPasswords = (vault.passwords || []).map((p) =>
    p.workspace === oldName ? { ...p, workspace: newName } : p
  );
  const updatedWorkspaceCustomTags = { ...(vault.workspaceCustomTags || {}) };
  if (updatedWorkspaceCustomTags[oldName]) {
    updatedWorkspaceCustomTags[newName] = updatedWorkspaceCustomTags[oldName];
    delete updatedWorkspaceCustomTags[oldName];
  }
  const updatedWorkspaceDeletedCategories = { ...(vault.workspaceDeletedCategories || {}) };
  if (updatedWorkspaceDeletedCategories[oldName]) {
    updatedWorkspaceDeletedCategories[newName] = updatedWorkspaceDeletedCategories[oldName];
    delete updatedWorkspaceDeletedCategories[oldName];
  }

  vault.customSpaces = updatedCustom;
  vault.passwords = updatedPasswords;
  vault.workspaceCustomTags = updatedWorkspaceCustomTags;
  vault.workspaceDeletedCategories = updatedWorkspaceDeletedCategories;

  await saveVault(vault, vaultKey);
  const reloaded = await decryptVaultWithKey(vaultKey);

  assert.strictEqual(reloaded.passwords[0].workspace, 'Clients');
  assert.deepStrictEqual(getWorkspaceCustomTags(reloaded, 'Clients'), ['Contracts', 'Invoices']);
  assert.deepStrictEqual(getWorkspaceCustomTags(reloaded, 'Freelance'), []);
  assert.deepStrictEqual(getWorkspaceDeletedCategories(reloaded, 'Clients'), ['gaming']);
  assert.deepStrictEqual(getWorkspaceDeletedCategories(reloaded, 'Freelance'), []);
});

test('Workspace Isolation - Workspace delete merges tags into Personal and cleans up maps', async () => {
  const vaultKey = generateSaltHex(32);
  const vault = await createNewVault('MyPassword123!', vaultKey);

  vault.customSpaces = ['Temporary'];
  vault.passwords = [
    { service: 'TempSvc', username: 'u', password: 'p', workspace: 'Temporary', folder: 'ProjectX' },
  ];
  vault.workspaceCustomTags = {
    Temporary: ['ProjectX', 'OldNotes'],
    Personal: ['Home'],
  };
  vault.workspaceDeletedCategories = {
    Temporary: ['social'],
    Personal: [],
  };

  // Simulate deleting 'Temporary'
  const spaceToDelete = 'Temporary';
  const updatedCustom = (vault.customSpaces || []).filter((s) => s !== spaceToDelete);
  const updatedPasswords = (vault.passwords || []).map((p) =>
    p.workspace === spaceToDelete ? { ...p, workspace: 'Personal' } : p
  );
  const updatedWorkspaceCustomTags = { ...(vault.workspaceCustomTags || {}) };
  const tagsToMerge = updatedWorkspaceCustomTags[spaceToDelete] || [];
  if (tagsToMerge.length > 0) {
    const personalTags = updatedWorkspaceCustomTags['Personal'] || [];
    updatedWorkspaceCustomTags['Personal'] = Array.from(new Set([...personalTags, ...tagsToMerge]));
  }
  delete updatedWorkspaceCustomTags[spaceToDelete];

  const updatedWorkspaceDeletedCategories = { ...(vault.workspaceDeletedCategories || {}) };
  delete updatedWorkspaceDeletedCategories[spaceToDelete];

  vault.customSpaces = updatedCustom;
  vault.passwords = updatedPasswords;
  vault.workspaceCustomTags = updatedWorkspaceCustomTags;
  vault.workspaceDeletedCategories = updatedWorkspaceDeletedCategories;

  await saveVault(vault, vaultKey);
  const reloaded = await decryptVaultWithKey(vaultKey);

  assert.strictEqual(reloaded.passwords[0].workspace, 'Personal');
  assert.deepStrictEqual(getWorkspaceCustomTags(reloaded, 'Personal'), ['Home', 'ProjectX', 'OldNotes']);
  assert.strictEqual(reloaded.workspaceCustomTags.Temporary, undefined);
  assert.strictEqual(reloaded.workspaceDeletedCategories.Temporary, undefined);
});
