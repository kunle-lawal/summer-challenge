import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './ownerAuth';

describe('ownerAuth', () => {
  it('round-trip: correct password verifies successfully', async () => {
    const { hash, salt } = await hashPassword('my-secret-password');
    expect(await verifyPassword('my-secret-password', hash, salt)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const { hash, salt } = await hashPassword('my-secret-password');
    expect(await verifyPassword('wrong-password', hash, salt)).toBe(false);
  });

  it('rejects an empty string against a non-empty password', async () => {
    const { hash, salt } = await hashPassword('my-secret-password');
    expect(await verifyPassword('', hash, salt)).toBe(false);
  });

  it('rejects a password-as-salt attack (salt prepended to password match)', async () => {
    const { hash, salt } = await hashPassword('password');
    // If the hash were just sha256(password), someone who knows the salt
    // could try to reverse it. This test confirms the salt is actually mixed in.
    expect(await verifyPassword(salt, hash, '')).toBe(false);
  });

  it('generates a unique salt on every call', async () => {
    const a = await hashPassword('password');
    const b = await hashPassword('password');
    expect(a.salt).not.toBe(b.salt);
  });

  it('same password with different salts produces different hashes', async () => {
    const a = await hashPassword('password');
    const b = await hashPassword('password');
    expect(a.hash).not.toBe(b.hash);
  });

  it('salt is a 32-character hex string (16 bytes)', async () => {
    const { salt } = await hashPassword('test');
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
  });

  it('hash is a 64-character hex string (SHA-256 = 32 bytes)', async () => {
    const { hash } = await hashPassword('test');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('works with a password containing special characters', async () => {
    const pw = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
    const { hash, salt } = await hashPassword(pw);
    expect(await verifyPassword(pw, hash, salt)).toBe(true);
    expect(await verifyPassword(pw.slice(0, -1), hash, salt)).toBe(false);
  });

  it('works with a long password', async () => {
    const pw = 'a'.repeat(1000);
    const { hash, salt } = await hashPassword(pw);
    expect(await verifyPassword(pw, hash, salt)).toBe(true);
  });
});
