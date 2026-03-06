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
