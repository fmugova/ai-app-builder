export interface Project {
  id: string
  name: string
  description?: string | null
  code?: string | null
  prompt?: string | null
  type?: string | null
  createdAt: string | Date
  updatedAt: string | Date
  isPublished?: boolean
  publicUrl?: string | null
  isPublic?: boolean
  shareToken?: string | null
  views?: number
  templateUsed?: string | null
  thumbnail?: string | null
}
