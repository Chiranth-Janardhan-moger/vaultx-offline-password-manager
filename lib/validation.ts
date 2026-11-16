/**
 * Shared input validation helpers for VaultX.
 */

export const isValidEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};
