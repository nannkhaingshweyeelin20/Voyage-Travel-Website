export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

export function ensurePasswordLength(password: string) {
  const byteLength = Buffer.byteLength(password, 'utf8');
  if (byteLength < 8 || byteLength > 72) {
    throw new Error('Password must be between 8 and 72 bytes.');
  }
}
