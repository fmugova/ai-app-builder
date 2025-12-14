'use client'

import { useState, useEffect } from 'react'
import AIEmailWriter from '@/components/AIEmailWriter'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast, Toaster } from 'react-hot-toast'
import { newsletterTemplates } from '@/lib/email-templates'

export default function NewCampaignPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Campaign details
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [segment, setSegment] = useState('all')
  const [templateType, setTemplateType] = useState<'custom' | 'product-update' | 'tips' | 'announcement'>('custom')
  const [htmlContent, setHtmlContent] = useState('')

  // Template-specific content
  const [updates, setUpdates] = useState([{ title: '', description: '', link: '' }])
  const [tips, setTips] = useState([{ emoji: '💡', title: '', description: '' }])
  const [announcement, setAnnouncement] = useState({ title: '', message: '', ctaText: '', ctaLink: '' })
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        setCheckingAdmin(true)
        const res = await fetch('/api/admin/check')
        const data = await res.json()
        setIsAdmin(data.isAdmin)
      } catch (error) {
        setIsAdmin(false)
      } finally {
        setCheckingAdmin(false)
      }
    }
    if (session?.user?.email) {
      checkAdmin()
    }
  }, [session?.user?.email])

  useEffect(() => {
    if (status === 'loading' || checkingAdmin) return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (!isAdmin) {
      router.push('/dashboard')
      return
    }

    // No loadData here, just allow page to render
  }, [session, status, isAdmin, checkingAdmin])

  const handleAIGenerated = (content: { subject: string; body: string }) => {
    setSubject(content.subject)
    setHtmlContent(content.body)
    setTemplateType('custom')
    setShowPreview(true) // Show preview after AI generation
    toast.success('AI content generated! ✨ Review in preview tab.')
  }

  const handleCreateCampaign = async () => {
    if (!name || !subject) {
      toast.error('Please fill in campaign name and subject')
      return
    }

    // Generate HTML based on template type
    let finalHtml = htmlContent
    
    if (templateType === 'product-update') {
      const validUpdates = updates.filter(u => u.title && u.description)
      if (validUpdates.length === 0) {
        toast.error('Add at least one update')
        return
      }
      finalHtml = newsletterTemplates.productUpdate(validUpdates)
    } else if (templateType === 'tips') {
      const validTips = tips.filter(t => t.title && t.description)
      if (validTips.length === 0) {
        toast.error('Add at least one tip')
        return
      }
      finalHtml = newsletterTemplates.tips(validTips)
    } else if (templateType === 'announcement') {
      if (!announcement.title || !announcement.message) {
        toast.error('Fill in announcement title and message')
        return
      }
      finalHtml = newsletterTemplates.announcement(
        announcement.title,
        announcement.message,
        announcement.ctaText,
        announcement.ctaLink
      )
    }

    setLoading(true)

    try {
      const res = await fetch('/api/admin/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          subject,
          previewText,
          htmlContent: finalHtml,
          segment
        })
      })

      if (res.ok) {
        const data = await res.json()
        toast.success('Campaign created!')
        router.push(`/admin/campaigns/${data.id}`)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create campaign')
      }
    } catch (error) {
      toast.error('Error creating campaign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Toaster position="top-right" />
      
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/admin/campaigns')}
                  className="p-2 hover:bg-gray-700 rounded-lg transition"
                >
                  ← Back
                </button>
                <div>
                  <h1 className="text-2xl font-bold">Create Campaign</h1>
                  <p className="text-sm text-gray-400">Design and send email campaigns</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <AIEmailWriter onGenerated={handleAIGenerated} />
                <button
                  onClick={handleCreateCampaign}
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition font-medium disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Campaign Settings */}
            <div className="lg:col-span-1 space-y-6">
              {/* Basic Info */}
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4">Campaign Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. January Newsletter"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Subject *
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. New Features This Month 🚀"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Preview Text
                    </label>
                    <input
                      type="text"
                      value={previewText}
                      onChange={(e) => setPreviewText(e.target.value)}
                      placeholder="Appears in inbox preview"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Send To
                    </label>
                    <select
                      value={segment}
                      onChange={(e) => setSegment(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All Subscribers</option>
                      <option value="free">Free Users</option>
                      <option value="pro">Pro Users</option>
                      <option value="business">Business Users</option>
                      <option value="enterprise">Enterprise Users</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Template Selection */}
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4">Template Type</h3>
                
                <div className="space-y-2">
                  {[
                    { value: 'product-update', label: 'Product Updates', icon: '🚀' },
                    { value: 'tips', label: 'Tips & Tricks', icon: '💡' },
                    { value: 'announcement', label: 'Announcement', icon: '📢' },
                    { value: 'custom', label: 'Custom HTML', icon: '✏️' }
                  ].map((template) => (
                    <button
                      key={template.value}
                      onClick={() => setTemplateType(template.value as any)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                        templateType === template.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <span className="text-2xl">{template.icon}</span>
                      <span className="font-medium">{template.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Content Editor */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4">Email Content</h3>

                {/* Product Updates Template */}
                {templateType === 'product-update' && (
                  <div className="space-y-4">
                    {updates.map((update, index) => (
                      <div key={index} className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-medium">Update #{index + 1}</h4>
                          {updates.length > 1 && (
                            <button
                              onClick={() => setUpdates(updates.filter((_, i) => i !== index))}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Update title"
                            value={update.title}
                            onChange={(e) => {
                              const newUpdates = [...updates]
                              newUpdates[index].title = e.target.value
                              setUpdates(newUpdates)
                            }}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400"
                          />
                          <textarea
                            placeholder="Description"
                            value={update.description}
                            onChange={(e) => {
                              const newUpdates = [...updates]
                              newUpdates[index].description = e.target.value
                              setUpdates(newUpdates)
                            }}
                            rows={3}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400"
                          />
                          <input
                            type="url"
                            placeholder="Link (optional)"
                            value={update.link}
                            onChange={(e) => {
                              const newUpdates = [...updates]
                              newUpdates[index].link = e.target.value
                              setUpdates(newUpdates)
                            }}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400"
                          />
                        </div>
                      </div>
                    ))}
                    
                    <button
                      onClick={() => setUpdates([...updates, { title: '', description: '', link: '' }])}
                      className="w-full py-2 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-purple-500 hover:text-purple-400 transition"
                    >
                      + Add Another Update
                    </button>
                  </div>
                )}

                {/* Tips Template */}
                {templateType === 'tips' && (
                  <div className="space-y-4">
                    {tips.map((tip, index) => (
                      <div key={index} className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-medium">Tip #{index + 1}</h4>
                          {tips.length > 1 && (
                            <button
                              onClick={() => setTips(tips.filter((_, i) => i !== index))}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Emoji (e.g. 💡)"
                            value={tip.emoji}
                            onChange={(e) => {
                              const newTips = [...tips]
                              newTips[index].emoji = e.target.value
                              setTips(newTips)
                            }}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400"
                          />
                          <input
                            type="text"
                            placeholder="Tip title"
                            value={tip.title}
                            onChange={(e) => {
                              const newTips = [...tips]
                              newTips[index].title = e.target.value
                              setTips(newTips)
                            }}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400"
                          />
                          <textarea
                            placeholder="Tip description"
                            value={tip.description}
                            onChange={(e) => {
                              const newTips = [...tips]
                              newTips[index].description = e.target.value
                              setTips(newTips)
                            }}
                            rows={2}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400"
                          />
                        </div>
                      </div>
                    ))}
                    
                    <button
                      onClick={() => setTips([...tips, { emoji: '💡', title: '', description: '' }])}
                      className="w-full py-2 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-purple-500 hover:text-purple-400 transition"
                    >
                      + Add Another Tip
                    </button>
                  </div>
                )}

                {/* Announcement Template */}
                {templateType === 'announcement' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Announcement title"
                      value={announcement.title}
                      onChange={(e) => setAnnouncement({...announcement, title: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                    <textarea
                      placeholder="Message"
                      value={announcement.message}
                      onChange={(e) => setAnnouncement({...announcement, message: e.target.value})}
                      rows={6}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Button text (optional)"
                      value={announcement.ctaText}
                      onChange={(e) => setAnnouncement({...announcement, ctaText: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                    <input
                      type="url"
                      placeholder="Button link (optional)"
                      value={announcement.ctaLink}
                      onChange={(e) => setAnnouncement({...announcement, ctaLink: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                  </div>
                )}

                {/* Custom HTML Template */}
                {templateType === 'custom' && (
                  <div className="space-y-4">
                    {/* Tab Toggle */}
                    <div className="flex gap-2 border-b border-gray-700 pb-2">
                      <button
                        type="button"
                        onClick={() => setShowPreview(false)}
                        className={`px-4 py-2 font-medium transition ${!showPreview ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}
                      >
                        Edit HTML
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPreview(true)}
                        className={`px-4 py-2 font-medium transition ${showPreview ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}
                      >
                        Preview
                      </button>
                    </div>

                    {/* HTML Editor */}
                    {!showPreview && (
                      <div>
                        <textarea
                          placeholder="Enter your HTML content or use AI Writer to generate..."
                          value={htmlContent}
                          onChange={(e) => setHtmlContent(e.target.value)}
                          rows={20}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 font-mono text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                          {htmlContent.length} characters
                        </p>
                      </div>
                    )}

                    {/* Preview */}
                    {showPreview && (
                      <div>
                        <div className="bg-white rounded-lg p-8 min-h-[400px] overflow-auto border-4 border-gray-600">
                          {htmlContent ? (
                            <div 
                              style={{ 
                                fontFamily: 'Arial, sans-serif',
                                lineHeight: '1.6',
                                color: '#333'
                              }}
                              dangerouslySetInnerHTML={{ __html: htmlContent }} 
                            />
                          ) : (
                            <div className="text-center py-20 text-gray-400">
                              <div className="text-6xl mb-4">✨</div>
                              <p className="text-xl mb-2 font-semibold">No content yet</p>
                              <p className="text-sm">Click \"AI Writer\" to generate content or switch to \"Edit HTML\"</p>
                            </div>
                          )}
                        </div>
                        {/* Debug Info - Remove after testing */}
                        <div className="mt-2 p-3 bg-gray-900 rounded text-xs text-gray-400 font-mono">
                          <strong>Debug:</strong> Content length: {htmlContent.length} chars
                          {htmlContent && (
                            <div className="mt-2">
                              First 200 chars: {htmlContent.substring(0, 200)}...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}