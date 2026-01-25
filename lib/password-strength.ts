export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';

export interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number; // 0-100
  feedback: string;
  color: string;
}

export const checkPasswordStrength = (password: string): PasswordStrengthResult => {
  if (!password) {
    return {
      strength: 'weak',
      score: 0,
      feedback: 'Password is required',
      color: '#ef4444',
    };
  }

  let score = 0;
  const length = password.length;

  // Length scoring (max 40 points)
  if (length >= 8) score += 10;
  if (length >= 12) score += 10;
  if (length >= 16) score += 10;
  if (length >= 20) score += 10;

  // Character variety (max 40 points)
  if (/[a-z]/.test(password)) score += 10; // lowercase
  if (/[A-Z]/.test(password)) score += 10; // uppercase
  if (/[0-9]/.test(password)) score += 10; // numbers
  if (/[^a-zA-Z0-9]/.test(password)) score += 10; // special chars

  // Complexity patterns (max 20 points)
  if (/[a-z].*[A-Z]|[A-Z].*[a-z]/.test(password)) score += 5; // mixed case
  if (/[a-zA-Z].*[0-9]|[0-9].*[a-zA-Z]/.test(password)) score += 5; // letters + numbers
  if (/[^a-zA-Z0-9].*[a-zA-Z0-9]|[a-zA-Z0-9].*[^a-zA-Z0-9]/.test(password)) score += 5; // special + alphanumeric
  if (new Set(password).size >= length * 0.7) score += 5; // character diversity

  // Penalties
  if (/^[0-9]+$/.test(password)) score -= 20; // only numbers
  if (/^[a-zA-Z]+$/.test(password)) score -= 10; // only letters
  if (/(.)\1{2,}/.test(password)) score -= 10; // repeated characters (aaa, 111)
  if (/^(123|abc|qwerty|password|admin)/i.test(password)) score -= 30; // common patterns

  // Ensure score is between 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine strength level
  let strength: PasswordStrength;
  let feedback: string;
  let color: string;

  if (score < 20) {
    strength = 'weak';
    feedback = 'Very weak - easily cracked';
    color = '#ef4444'; // red
  } else if (score < 40) {
    strength = 'fair';
    feedback = 'Weak - add more characters';
    color = '#f97316'; // orange
  } else if (score < 60) {
    strength = 'good';
    feedback = 'Fair - consider adding symbols';
    color = '#eab308'; // yellow
  } else if (score < 80) {
    strength = 'strong';
    feedback = 'Strong - good password';
    color = '#22c55e'; // green
  } else {
    strength = 'very-strong';
    feedback = 'Very strong - excellent!';
    color = '#10b981'; // emerald
  }

  return { strength, score, feedback, color };
};

export const getStrengthLabel = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'weak': return 'Weak';
    case 'fair': return 'Fair';
    case 'good': return 'Good';
    case 'strong': return 'Strong';
    case 'very-strong': return 'Very Strong';
  }
};
