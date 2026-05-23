/**
 * Owner password hashing and verification using WebCrypto SHA-256 with a
 * random salt.
 *
 * This is intentionally lightweight security — see V2_PLAN §4.3. The goal
 * is to prevent casual guessing, not to withstand a determined attacker.
 * The hash and salt are stored in plaintext in Firestore because the whole
 * challenge is publicly readable; this only gates the admin UI actions.
 */

/**
 * Hash a plain-text password with a freshly generated random salt.
 * Returns the hex-encoded hash and salt for storage on the Challenge doc.
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToHex(saltBytes);
  const hash = await sha256Hex(salt + password);
  return { hash, salt };
}

/**
 * Verify a plain-text password against a stored hash+salt pair.
 * Returns true iff the password produces the same digest.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  salt: string,
): Promise<boolean> {
  const hash = await sha256Hex(salt + password);
  return hash === storedHash;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(buf));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
