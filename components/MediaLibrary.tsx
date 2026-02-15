'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Upload, Trash2, Image as ImageIcon, Copy, Check, Loader2 } from 'lucide-react'

interface Asset {
  url: string
  filename: string
  size: number
  uploadedAt: string
}

interface MediaLibraryProps {
  isOpen: boolean
  onClose: () => void
  onSelectAsset: (url: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function MediaLibrary({ isOpen, onClose, onSelectAsset }: MediaLibraryProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadAssets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/assets')
      const data = await res.json()
      if (Array.isArray(data)) {
        setAssets(data.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()))
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadAssets()
      setUploadError(null)
    }
  }, [isOpen, loadAssets])

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (fileArr.length === 0) {
      setUploadError('Only image files are supported (JPEG, PNG, GIF, WebP, SVG).')
      return
    }

    setUploading(true)
    setUploadError(null)

    for (const file of fileArr) {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        setUploadError(err.error || 'Upload failed')
        setUploading(false)
        return
      }
    }

    await loadAssets()
    setUploading(false)
  }

  const deleteAsset = async (url: string) => {
    setDeletingUrl(url)
    try {
      await fetch('/api/assets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      setAssets(prev => prev.filter(a => a.url !== url))
    } catch {
      // non-fatal
    } finally {
      setDeletingUrl(null)
    }
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-gray-700">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Media Library</h2>
            {assets.length > 0 && (
              <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                {assets.length} {assets.length === 1 ? 'image' : 'images'}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-purple-400 bg-purple-500/10'
                : 'border-gray-600 hover:border-purple-500 hover:bg-purple-500/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files && uploadFiles(e.target.files)}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <p className="text-sm text-gray-300">Uploading…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-200">
                    Drop images here or click to upload
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    JPEG, PNG, GIF, WebP, SVG — max 10 MB each
                  </p>
                </div>
              </div>
            )}
          </div>

          {uploadError && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
              {uploadError}
            </p>
          )}

          {/* Asset Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No images yet. Upload one above to get started.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {assets.map(asset => (
                <div
                  key={asset.url}
                  className="group relative bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-purple-500 transition cursor-pointer"
                  onClick={() => onSelectAsset(asset.url)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-square overflow-hidden bg-gray-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={asset.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  </div>

                  {/* Overlay: Use button */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <span className="bg-purple-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
                      Use Image
                    </span>
                  </div>

                  {/* Action row */}
                  <div className="px-2 py-2 flex items-center justify-between">
                    <p className="text-xs text-gray-400 truncate flex-1 mr-1" title={asset.filename}>
                      {asset.filename}
                    </p>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={e => { e.stopPropagation(); copyUrl(asset.url) }}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                        title="Copy URL"
                      >
                        {copiedUrl === asset.url ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteAsset(asset.url) }}
                        disabled={deletingUrl === asset.url}
                        className="p-1 hover:bg-red-900/40 rounded text-gray-400 hover:text-red-400 disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingUrl === asset.url ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Size badge */}
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                    {formatBytes(asset.size)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Click any image to insert its URL into your prompt
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
