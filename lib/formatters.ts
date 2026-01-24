/**
 * Safely formats Prisma Json type metadata for display
 */
export function formatMetadata(metadata: unknown): string {
  if (typeof metadata === 'string') return metadata
  if (typeof metadata === 'number') return String(metadata)
  if (typeof metadata === 'boolean') return String(metadata)
  if (metadata === null || metadata === undefined) return ''
  
  try {
    return JSON.stringify(metadata)
  } catch {
    return String(metadata)
  }
}

/**
 * Truncate metadata for preview
 */
export function formatMetadataPreview(metadata: unknown, maxLength: number = 50): string {
  const formatted = formatMetadata(metadata)
  if (formatted.length <= maxLength) return formatted
  return formatted.substring(0, maxLength) + '...'
}
