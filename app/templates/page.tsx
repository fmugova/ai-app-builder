'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Toaster, toast } from 'react-hot-toast'
import { analytics } from '@/lib/analytics'
import { DollarSign, Star, Download, Crown, Lock, Loader2 } from 'lucide-react'
import { templates as staticTemplates } from '@/lib/templates'

interface DbTemplate {
  id: string
  name: string
  description: string
  category: string
  tier: 'FREE' | 'PRO' | 'COLLECTION'
  price: number
  thumbnail: string | null
  tags: string[]
  downloads: number
  rating: number
  reviewCount: number
  creatorName: string
  owned: boolean
}

// Static templates with mock pricing (fallback / supplemental)
const staticWithPricing: DbTemplate[] = staticTemplates.map((t, i) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  category: t.category,
  tier: (['FREE', 'PRO', 'COLLECTION'] as const)[i % 3],
  price: [0, 9.99, 49.99][i % 3],
  thumbnail: null,
  tags: t.tags || [],
  downloads: 100 + i * 73,
  rating: 4.5 + (i % 5) * 0.1,
  reviewCount: 10 + i * 7,
  creatorName: 'BuildFlow',
  owned: i % 3 === 0,
}))

export default function TemplatesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>}>
      <TemplatesContent />
    </Suspense>
  )
}

function TemplatesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTier, setSelectedTier] = useState<'all' | 'free' | 'pro' | 'collection'>('all')
  const [dbTemplates, setDbTemplates] = useState<DbTemplate[]>([])
  const [loadingDb, setLoadingDb] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  // Merge DB templates with static ones (DB first, then static as fallback)
  const allTemplates: DbTemplate[] = [
    ...dbTemplates,
    ...staticWithPricing.filter(st => !dbTemplates.some(d => d.name === st.name)),
  ]

  const filteredTemplates = allTemplates.filter(t => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory
    const matchesTier = selectedTier === 'all' || t.tier.toLowerCase() === selectedTier
    return matchesCategory && matchesTier
  })

  const categories = ['all', ...new Set(allTemplates.map(t => t.category))]

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setDbTemplates(data)
      }
    } catch {
      // non-fatal — static templates remain
    } finally {
      setLoadingDb(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Handle success redirect from Stripe
  useEffect(() => {
    const purchased = searchParams.get('purchased')
    if (purchased) {
      toast.success('🎉 Template purchased! You can now use it.')
      // Refresh to update owned status
      fetchTemplates()
    }
  }, [searchParams, fetchTemplates])

  const handleUseOrBuy = async (template: DbTemplate) => {
    analytics.templateViewed(template.name)

    if (template.owned || template.tier === 'FREE') {
      // Directly create project
      try {
        toast.loading('Creating project from template...', { id: 'create' })
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${template.name} Project`,
            description: template.description,
            type: template.category,
            code: template.id, // placeholder; real code loaded from DB template
          }),
        })
        if (res.ok) {
          const data = await res.json()
          toast.success('✅ Project created!', { id: 'create', duration: 2000 })
          router.push(`/chatbuilder?project=${data.project?.id || ''}`)
        } else {
          throw new Error('Failed')
        }
      } catch {
        toast.error('Failed to create project', { id: 'create' })
      }
      return
    }

    // Paid template — trigger Stripe checkout
    setPurchasing(template.id)
    try {
      const res = await fetch(`/api/templates/${template.id}/purchase`, {
        method: 'POST',
      })
      const data = await res.json()

      if (data.alreadyOwned) {
        toast.success('You already own this template!')
        return
      }
      if (data.free) {
        toast.success('Template added to your library!')
        fetchTemplates()
        return
      }
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL')
      }
    } catch {
      toast.error('Failed to start checkout. Please try again.')
    } finally {
      setPurchasing(null)
    }
  }

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 py-12">
        <div className="max-w-7xl mx-auto px-6">

          {/* Navigation */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-medium shadow-md transition-all hover:shadow-lg"
            >
              <span className="text-xl">←</span>
              Back to Dashboard
            </button>
            <button
              onClick={() => router.push('/chatbuilder')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-medium shadow-md transition-all hover:shadow-lg"
            >
              <span className="text-xl">✨</span>
              Start from Scratch
            </button>
          </div>

          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              ✨ Template Marketplace
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-6">
              Start with a professionally designed template or sell your own creations
            </p>
            <Link
              href="/templates/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-medium shadow-md transition-all hover:shadow-lg"
            >
              <DollarSign className="w-5 h-5" />
              Create & Sell Templates
            </Link>
          </div>

          {/* Tier Filters */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {(['all', 'free', 'pro', 'collection'] as const).map(tier => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-5 py-2.5 rounded-full font-medium transition-all capitalize flex items-center gap-1 ${
                  selectedTier === tier
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg'
                }`}
              >
                {tier === 'pro' && <Crown className="w-3.5 h-3.5" />}
                {tier === 'collection' && <Lock className="w-3.5 h-3.5" />}
                {tier === 'all' ? 'All Tiers' : tier === 'pro' ? 'Pro ($9.99)' : tier === 'collection' ? 'Collections ($49.99)' : 'Free'}
              </button>
            ))}
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2.5 rounded-full font-medium transition-all capitalize ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg'
                }`}
              >
                {category === 'all' ? '🎨 All Categories' : `${getCategoryIcon(category)} ${category}`}
              </button>
            ))}
          </div>

          {/* Results Count */}
          <div className="text-center mb-8 flex items-center justify-center gap-2">
            {loadingDb && <Loader2 className="w-4 h-4 animate-spin text-purple-500" />}
            <p className="text-gray-600">
              Showing <span className="font-semibold text-purple-600">{filteredTemplates.length}</span> templates
              {selectedCategory !== 'all' && (
                <span> in <span className="capitalize">{selectedCategory}</span></span>
              )}
            </p>
          </div>

          {/* Templates Grid */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600 mb-6">Try a different filter or be the first to create one!</p>
              <button
                onClick={() => { setSelectedCategory('all'); setSelectedTier('all') }}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all"
              >
                View All Templates
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-gray-100"
                >
                  {/* Preview */}
                  <div className="relative h-48 bg-gradient-to-br from-purple-100 to-blue-100 overflow-hidden">
                    {template.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-6xl">{getCategoryIcon(template.category)}</span>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleUseOrBuy(template)}
                        disabled={!!purchasing}
                        className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100 transition-all disabled:opacity-50"
                      >
                        {purchasing === template.id
                          ? '⏳ Loading...'
                          : template.owned
                          ? '✨ Use Template'
                          : template.tier === 'FREE'
                          ? '✨ Use Free'
                          : `💳 Buy $${template.price}`}
                      </button>
                    </div>

                    {/* Tier badge */}
                    <div className="absolute top-3 left-3">
                      {template.tier === 'FREE' ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">FREE</span>
                      ) : template.owned ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">OWNED</span>
                      ) : template.tier === 'PRO' ? (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Crown className="w-3 h-3" /> PRO ${template.price}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> ${template.price}
                        </span>
                      )}
                    </div>

                    {/* Category badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-purple-600 capitalize">
                        {template.category}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{template.description}</p>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{template.rating.toFixed(1)}</span>
                        <span>({template.reviewCount})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        <span>{template.downloads.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {template.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-purple-50 text-purple-600 rounded-md text-xs font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => handleUseOrBuy(template)}
                      disabled={!!purchasing}
                      className={`w-full py-3 ${
                        template.tier === 'FREE' || template.owned
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                          : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                      } text-white rounded-xl font-semibold transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {purchasing === template.id
                        ? '⏳ Loading...'
                        : template.owned
                        ? '✨ Use Template'
                        : template.tier === 'FREE'
                        ? '✨ Use Free Template'
                        : `💳 Purchase $${template.price}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Revenue Share Banner */}
          <div className="mt-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">💰 Create & Sell Your Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-2xl">💎</span>
                  70% Revenue Share
                </h3>
                <p className="text-purple-100 text-sm">Keep 70% of all sales — we handle payments & hosting</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-2xl">✨</span>
                  Easy Creation
                </h3>
                <p className="text-purple-100 text-sm">Use our AI builder to create professional templates in minutes</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  Instant Payouts
                </h3>
                <p className="text-purple-100 text-sm">Get paid automatically via Stripe every week</p>
              </div>
            </div>
            <Link
              href="/templates/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 hover:bg-gray-100 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              <DollarSign className="w-5 h-5" />
              Start Earning with Templates
            </Link>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-3xl p-8 sm:p-12 text-white">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Can&apos;t find what you&apos;re looking for?</h2>
              <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
                Start from scratch and let AI help you build exactly what you need
              </p>
              <button
                onClick={() => router.push('/chatbuilder')}
                className="px-8 py-4 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-semibold text-lg shadow-lg hover:shadow-2xl transition-all"
              >
                ✨ Create Custom Project
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

function getCategoryIcon(category: string): string {
  switch (category.toLowerCase()) {
    case 'landing-page': return '🚀'
    case 'dashboard': return '📊'
    case 'blog': return '📝'
    case 'portfolio': return '💼'
    case 'e-commerce': return '🛒'
    case 'saas': return '⚡'
    case 'marketing': return '📈'
    case 'startup': return '🎯'
    case 'auth': return '🔐'
    case 'admin': return '⚙️'
    default: return '📄'
  }
}
