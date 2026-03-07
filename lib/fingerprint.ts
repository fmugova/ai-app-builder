// lib/fingerprint.ts
// Server-side session fingerprinting using Web Crypto API.
// Works in both Edge runtime (proxy.ts) and Node.js runtime (lib/auth.ts).
// Input: request headers. Output: 16 hex chars (64-bit SHA-256 prefix).
// Returns '' on any failure — callers must skip comparison when empty.

/**
 * Computes a stable browser/device fingerprint from request headers.
 *
 * Uses IP /24 prefix (IPv4) or /48 prefix (IPv6) to tolerate CGNAT and VPN
 * reconnects that change the last octet. Combined with User-Agent and
 * Accept-Language, this identifies a device without tracking the exact IP.
 */
export async function computeFingerprint(headers: Headers): Promise<string> {
  try {
    const rawIp = (
      headers.get('cf-connecting-ip') ||
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headers.get('x-real-ip') ||
      ''
    ).trim()

    // Reduce precision: /24 for IPv4, first 4 groups for IPv6
    const ipPrefix = rawIp.includes(':')
      ? rawIp.split(':').slice(0, 4).join(':')
      : rawIp.split('.').slice(0, 3).join('.') + '.0'

    const ua   = headers.get('user-agent') || ''
    const lang = (headers.get('accept-language') || '').slice(0, 10)

    const raw         = `${ipPrefix}|${ua}|${lang}`
    const encoded     = new TextEncoder().encode(raw)
    const hashBuffer  = await crypto.subtle.digest('SHA-256', encoded)

    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 16)
  } catch {
    // Never crash the caller — fingerprint failure is non-fatal
    return ''
  }
}
