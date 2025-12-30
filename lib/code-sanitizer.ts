// Deprecated: Use functions from '@/lib/sanitizeCode' instead.
// Keep lightweight adapters to avoid breaking imports while reducing duplication.
import { sanitizeCode } from './sanitizeCode'

export function sanitizeReactCode(code: string): string {
  return sanitizeCode(code)
}

export function prepareCodeForPreview(code: string, type: string): string {
  return sanitizeCode(code)
}
