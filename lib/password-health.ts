import { checkPasswordStrength } from './password-strength';
import { type PasswordItem } from './vault';

export interface HealthEntry {
  item: PasswordItem;
  globalIndex: number;
  strengthScore: number;
}

export interface ReusedPasswordGroup {
  password: string;
  entries: HealthEntry[];
}

export interface PasswordHealthReport {
  totalChecked: number;
  weakItems: HealthEntry[];
  reusedGroups: ReusedPasswordGroup[];
  reusedAccountCount: number;
}

/**
 * Analyzes passwords in the given workspace completely offline for weak
 * and reused passwords.
 */
export function analyzePasswordHealth(
  passwords: PasswordItem[] | undefined | null,
  workspace = 'Personal'
): PasswordHealthReport {
  const list = passwords || [];
  const targetWs = workspace || 'Personal';

  const weakItems: HealthEntry[] = [];
  const byPassword = new Map<string, HealthEntry[]>();
  let totalChecked = 0;

  list.forEach((item, globalIndex) => {
    if ((item.workspace || 'Personal') !== targetWs) return;
    if (item.itemType === 'note') return;
    totalChecked++;

    const pw = item.password || '';
    const strength = pw ? checkPasswordStrength(pw) : { strength: 'weak' as const, score: 0 };
    const entry: HealthEntry = {
      item,
      globalIndex,
      strengthScore: strength.score,
    };

    if (pw && (strength.strength === 'weak' || strength.strength === 'fair')) {
      weakItems.push(entry);
    }

    if (pw) {
      const existing = byPassword.get(pw);
      if (existing) {
        existing.push(entry);
      } else {
        byPassword.set(pw, [entry]);
      }
    }
  });

  const reusedGroups: ReusedPasswordGroup[] = [];
  let reusedAccountCount = 0;
  for (const [password, entries] of byPassword.entries()) {
    if (entries.length >= 2) {
      reusedGroups.push({ password, entries });
      reusedAccountCount += entries.length;
    }
  }

  return {
    totalChecked,
    weakItems,
    reusedGroups,
    reusedAccountCount,
  };
}
