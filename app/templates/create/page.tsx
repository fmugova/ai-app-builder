'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast, Toaster } from 'react-hot-toast'
import { ArrowLeft, DollarSign, Upload, Tag, Code2, Eye, Crown, Lock } from 'lucide-react'

const CATEGORIES = [
  'landing-page', 'dashboard', 'blog', 'portfolio', 'e-commerce',
  'saas', 'marketing', 'startup', 'auth', 'admin',
]

const TIERS = [
  { value: 'FREE', label: 'Free', desc: 'Available to everyone', price: 0, icon: '🎁' },
  { value: 'PRO', label: 'Pro', desc: '$9.99 one-time — you earn $6.99', price: 9.99, icon: '👑' },
  { value: 'COLLECTION', label: 'Collection', desc: '$49.99 one-time — you earn $34.99', price: 49.99, icon: '💎' },
]

export default function CreateTemplatePage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [step, setStep] = useState<'details' | 'code' | 'review'>('details')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'landing-page',
    tier: 'FREE',
    tags: '',
    thumbnail: '',
    htmlCode: '',
    cssCode: '',
    jsCode: '',
  })

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.description.trim() || !form.htmlCode.trim()) {
      toast.error('Name, description, and HTML code are required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to publish template')
      }

      toast.success('🎉 Template published successfully!')
      setTimeout(() => router.push('/templates'), 1500)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish template')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in required</h2>
          <p className="text-gray-600 mb-4">You need to be signed in to create templates.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  const selectedTier = TIERS.find(t => t.value === form.tier) || TIERS[0]

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 py-12">
        <div className="max-w-3xl mx-auto px-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/templates')}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-medium shadow-sm border border-gray-200 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Marketplace
            </button>
            <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-4 py-2 rounded-full">
              <DollarSign className="w-4 h-4" />
              Earn 70% of every sale
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a Template</h1>
          <p className="text-gray-600 mb-8">Share your work and earn money from every sale.</p>

          {/* Step tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-8">
            {(['details', 'code', 'review'] as const).map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  step === s ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* ─── Step 1: Details ──────────────────────────────────────────────── */}
          {step === 'details' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                  <input
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    placeholder="e.g. Modern SaaS Landing Page"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    value={form.description}
                    onChange={e => update('description', e.target.value)}
                    placeholder="Describe what this template is for, what features it includes..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={e => update('category', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c} className="capitalize">{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Tag className="w-3 h-3 inline mr-1" />
                      Tags (comma separated)
                    </label>
                    <input
                      value={form.tags}
                      onChange={e => update('tags', e.target.value)}
                      placeholder="responsive, dark-mode, tailwind"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Upload className="w-3 h-3 inline mr-1" />
                    Thumbnail URL (optional)
                  </label>
                  <input
                    value={form.thumbnail}
                    onChange={e => update('thumbnail', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Pricing Tier */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Pricing Tier</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TIERS.map(tier => (
                    <button
                      key={tier.value}
                      onClick={() => update('tier', tier.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        form.tier === tier.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{tier.icon}</div>
                      <div className="font-semibold text-gray-900 text-sm">{tier.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{tier.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep('code')}
                disabled={!form.name.trim() || !form.description.trim()}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Code →
              </button>
            </div>
          )}

          {/* ─── Step 2: Code ─────────────────────────────────────────────────── */}
          {step === 'code' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Code2 className="w-3 h-3 inline mr-1" />
                    HTML Code * (full document)
                  </label>
                  <textarea
                    value={form.htmlCode}
                    onChange={e => update('htmlCode', e.target.value)}
                    placeholder={'<!DOCTYPE html>\n<html lang="en">\n<head>...</head>\n<body>...</body>\n</html>'}
                    rows={16}
                    spellCheck={false}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Paste your complete HTML. Include inline CSS/JS or use the fields below.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CSS (optional, extracted)</label>
                  <textarea
                    value={form.cssCode}
                    onChange={e => update('cssCode', e.target.value)}
                    placeholder="/* Additional CSS */"
                    rows={5}
                    spellCheck={false}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">JavaScript (optional, extracted)</label>
                  <textarea
                    value={form.jsCode}
                    onChange={e => update('jsCode', e.target.value)}
                    placeholder="// Additional JavaScript"
                    rows={5}
                    spellCheck={false}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('details')}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep('review')}
                  disabled={!form.htmlCode.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Review & Publish →
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 3: Review ───────────────────────────────────────────────── */}
          {step === 'review' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">Review your template</h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name</span>
                    <p className="font-medium text-gray-900">{form.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Category</span>
                    <p className="font-medium text-gray-900 capitalize">{form.category}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Pricing</span>
                    <p className="font-medium text-gray-900 flex items-center gap-1">
                      {selectedTier.value === 'FREE' ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">FREE</span>
                      ) : selectedTier.value === 'PRO' ? (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs flex items-center gap-1">
                          <Crown className="w-3 h-3" /> ${selectedTier.price}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center gap-1">
                          <Lock className="w-3 h-3" /> ${selectedTier.price}
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">HTML lines</span>
                    <p className="font-medium text-gray-900">{form.htmlCode.split('\n').length}</p>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-gray-500">Description</span>
                  <p className="text-sm text-gray-900 mt-1">{form.description}</p>
                </div>

                {form.tags && (
                  <div>
                    <span className="text-sm text-gray-500">Tags</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md text-xs">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTier.value !== 'FREE' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-green-800">
                      💰 You earn <strong>${(selectedTier.price * 0.7).toFixed(2)}</strong> per sale (70% revenue share)
                    </p>
                    <p className="text-xs text-green-600 mt-1">Payouts processed weekly via Stripe</p>
                  </div>
                )}
              </div>

              {/* Preview iframe */}
              {form.htmlCode.trim() && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 font-medium">Preview</span>
                  </div>
                  <iframe
                    srcDoc={form.htmlCode}
                    className="w-full h-80"
                    sandbox="allow-scripts"
                    title="Template preview"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('code')}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all"
                >
                  ← Edit Code
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      Publish Template
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
