export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';

export interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number; // 0-100
  feedback: string;
  color: string;
}

export const checkPasswordStrength = (password: string): PasswordStrengthResult => {
  if (!password) {
    return { strength: 'weak', score: 0, feedback: 'Password is required', color: '#ef4444' };
  }

  let score = Math.min(password.length * 4, 40);
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/\d/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  if (/(.)\1{2,}/.test(password)) score -= 15;

  score = Math.max(0, Math.min(100, score));

  if (score < 40) return { strength: 'weak', score, feedback: 'Weak - add more characters', color: '#ef4444' };
  if (score < 60) return { strength: 'fair', score, feedback: 'Fair - consider adding symbols', color: '#f97316' };
  if (score < 80) return { strength: 'good', score, feedback: 'Good - strong password', color: '#eab308' };
  if (score < 95) return { strength: 'strong', score, feedback: 'Strong - good password', color: '#22c55e' };
  return { strength: 'very-strong', score, feedback: 'Very strong - excellent!', color: '#10b981' };
};

export const getStrengthLabel = (strength: PasswordStrength): string => {
  const map: Record<PasswordStrength, string> = {
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong',
    'very-strong': 'Very Strong',
  };
  return map[strength] || 'Weak';
};
