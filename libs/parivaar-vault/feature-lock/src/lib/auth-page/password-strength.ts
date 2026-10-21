export interface PasswordStrength {
  /** 0..4 */
  score: number;
  label: string;
  color: string;
}

/** Simple strength heuristic: length plus character classes. */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  score = Math.min(4, Math.max(1, Math.round((score / 5) * 4)));
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = [
    'transparent',
    'var(--pv-red)',
    'var(--pv-saffron)',
    'var(--pv-gold)',
    'var(--pv-green)',
  ];
  return {
    score,
    label: labels[score] ?? '',
    color: colors[score] ?? 'transparent',
  };
}
