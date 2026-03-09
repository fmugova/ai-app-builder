/**
 * lib/totp.ts
 * Thin wrapper over otplib v13 providing a stable, batteries-included API
 * used across all 2FA routes.
 *
 * otplib v13 overhauled the API completely:
 *  - `authenticator` singleton is gone
 *  - All ops are async (crypto is plugin-based, defaults to NobleCryptoPlugin)
 *  - `window` (steps) replaced by `epochTolerance` (seconds)
 *  - `verify()` returns `{ valid: boolean }` not a plain boolean
 *
 * This module provides:
 *  totpGenerateSecret() – creates a Base32 secret
 *  totpKeyUri()         – creates an otpauth:// URI for QR codes
 *  totpVerify()         – verifies a 6-digit token; window is in 30s steps
 */

import { generateSecret, generateURI, verify } from 'otplib';
import { redis } from '@/lib/rate-limit';

/** Generate a random Base32 TOTP secret (uses built-in Noble crypto + scure base32). */
export function totpGenerateSecret(): string {
  return generateSecret();
}

/** Build an otpauth:// URI for QR code generation. */
export function totpKeyUri(email: string, issuer: string, secret: string): string {
  return generateURI({ label: email, issuer, secret });
}

/**
 * Verify a 6-digit TOTP token.
 *
 * @param secret - Base32-encoded secret stored for the user
 * @param token  - 6-digit code entered by the user
 * @param window - Tolerance in 30-second time-steps (1 = ±30 s, 2 = ±60 s)
 * @returns true if the token is valid
 */
export async function totpVerify(
  secret: string,
  token: string,
  window = 1
): Promise<boolean> {
  const result = await verify({ secret, token, epochTolerance: window * 30 });
  return result.valid;
}

/**
 * Verify a TOTP token with replay protection.
 * Marks valid tokens as used in Redis (TTL = window * 30 * 2 + 30 seconds)
 * so the same code cannot be accepted twice within the tolerance window.
 *
 * Use this instead of totpVerify() on all login and sensitive-action routes.
 */
export async function totpVerifyWithReplay(
  userId: string,
  secret: string,
  token: string,
  window = 1
): Promise<{ valid: boolean; error?: string }> {
  // Check replay first — cheapest check
  const usedKey = `totp:used:${userId}:${token}`;
  try {
    const wasUsed = await redis.get(usedKey);
    if (wasUsed) {
      return { valid: false, error: 'Token already used' };
    }
  } catch {
    // Redis unavailable — fail open (don't lock users out) but still verify signature
  }

  const result = await verify({ secret, token, epochTolerance: window * 30 });
  if (!result.valid) {
    return { valid: false, error: 'Invalid token' };
  }

  // Mark as used — TTL covers the full valid window + one extra step as buffer
  const ttlSeconds = window * 30 * 2 + 30;
  try {
    await redis.set(usedKey, '1', { ex: ttlSeconds });
  } catch {
    // Non-fatal — token is valid, Redis write failure should not block login
  }

  return { valid: true };
}
