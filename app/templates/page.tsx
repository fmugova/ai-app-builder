'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { templates, getTemplatesByCategory } from '@/lib/templates'
import { Toaster, toast } from 'react-hot-toast'
import { analytics } from '@/lib/analytics'
import { ArrowLeft, DollarSign, Star, Download, Crown, Lock } from 'lucide-react'

export default function TemplatesPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTier, setSelectedTier] = useState<'all' | 'free' | 'pro' | 'collection'>('all')
  const [creating, setCreating] = useState(false)

  // Mock pricing tiers for existing templates
  const templatesWithPricing = templates.map((template, index) => ({
    ...template,
    tier: index % 3 === 0 ? 'FREE' : index % 3 === 1 ? 'PRO' : 'COLLECTION',
    price: index % 3 === 0 ? 0 : index % 3 === 1 ? 9.99 : 49.99,
    downloads: Math.floor(Math.random() * 1000) + 100,
    rating: (Math.random() * 1 + 4).toFixed(1),
    reviewCount: Math.floor(Math.random() * 50) + 10,
  }))

  // Get filtered templates
  const filteredTemplates = templatesWithPricing.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesTier = selectedTier === 'all' || template.tier.toLowerCase() === selectedTier
    return matchesCategory && matchesTier
  })

  // Get unique categories
  const categories = ['all', ...new Set(templates.map(t => t.category))]

  // Create project from template
  const createFromTemplate = async (template: typeof templates[0]) => {
    // Track template viewed/selected
    analytics.templateViewed(template.name)
    
    setCreating(true)
    
    try {
      toast.loading('Creating project from template...', { id: 'create' })

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} Project`,
          description: template.description,
          type: template.category,
          code: template.code,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('✅ Project created successfully!', {
          duration: 2000,
          id: 'project-created',
        })
        setTimeout(() => {
          toast.dismiss('project-created');
        }, 2000);
        router.push(`/builder?project=${data.project.id}`)
      } else {
        throw new Error('Failed to create project')
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('❌ Failed to create project', { id: 'create' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <Toaster position="top-right" />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* ✅ Navigation Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-medium shadow-md transition-all hover:shadow-lg"
            >
              <span className="text-xl">←</span>
              <span>Back to Dashboard</span>
            </button>

            <button
              onClick={() => router.push('/builder')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-medium shadow-md transition-all hover:shadow-lg"
            >
              <span className="text-xl">✨</span>
              <span>Start from Scratch</span>
            </button>
          </div>

          {/* Header with Marketplace Info */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              ✨ Template Marketplace
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-6">
              Start with a professionally designed template or sell your own creations
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/templates/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-medium shadow-md transition-all hover:shadow-lg"
              >
                <DollarSign className="w-5 h-5" />
                <span>Create & Sell Templates</span>
              </Link>
            </div>
          </div>

          {/* Tier Filters */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <button
              onClick={() => setSelectedTier('all')}
              className={`px-5 py-2.5 rounded-full font-medium transition-all ${
                selectedTier === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg'
              }`}
            >
              All Tiers
            </button>
            <button
              onClick={() => setSelectedTier('free')}
              className={`px-5 py-2.5 rounded-full font-medium transition-all ${
                selectedTier === 'free'
                  ? 'bg-green-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg'
              }`}
            >
              Free
            </button>
            <button
              onClick={() => setSelectedTier('pro')}
              className={`px-5 py-2.5 rounded-full font-medium transition-all flex items-center gap-1 ${
                selectedTier === 'pro'
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg'
              }`}
            >
              <Crown className="w-4 h-4" />
              Pro ($9.99)
            </button>
            <button
              onClick={() => setSelectedTier('collection')}
              className={`px-5 py-2.5 rounded-full font-medium transition-all flex items-center gap-1 ${
                selectedTier === 'collection'
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg'
              }`}
            >
              <Lock className="w-4 h-4" />
              Collections ($49.99)
            </button>
          </div>

          {/* ✅ Category Filter */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {categories.map((category) => (
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
          <div className="text-center mb-8">
            <p className="text-gray-600">
              Showing <span className="font-semibold text-purple-600">{filteredTemplates.length}</span> templates
              {selectedCategory !== 'all' && (
                <span> in <span className="capitalize">{selectedCategory}</span></span>
              )}
            </p>
          </div>

          {/* ✅ Templates Grid */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600 mb-6">Try selecting a different category</p>
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all"
              >
                View All Templates
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-gray-100"
                >
                  {/* Template Preview */}
                  <div className="relative h-48 bg-gradient-to-br from-purple-100 to-blue-100 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl">{getCategoryIcon(template.category)}</span>
                    </div>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => createFromTemplate(template)}
                        disabled={creating}
                        className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100 transition-all disabled:opacity-50"
                      >
                        {creating ? '⏳ Creating...' : template.tier === 'FREE' ? '✨ Use Free' : `💳 Buy ${template.tier === 'PRO' ? '$9.99' : '$49.99'}`}
                      </button>
                      <button
                        onClick={() => window.open(`/preview/template/${template.id}`, '_blank')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all"
                      >
                        👁️ Preview
                      </button>
                    </div>

                    {/* Pricing Badge */}
                    <div className="absolute top-3 left-3">
                      {template.tier === 'FREE' ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          FREE
                        </span>
                      ) : template.tier === 'PRO' ? (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          PRO ${template.price}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          ${template.price}
                        </span>
                      )}
                    </div>

                    {/* Category Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-purple-600 capitalize">
                        {template.category}
                      </span>
                    </div>
                  </div>

                  {/* Template Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {template.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{template.rating}</span>
                        <span>({template.reviewCount})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        <span>{template.downloads.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Features/Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {template.tags?.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-purple-50 text-purple-600 rounded-md text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => createFromTemplate(template)}
                      disabled={creating}
                      className={`w-full py-3 ${
                        template.tier === 'FREE'
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                          : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                      } text-white rounded-xl font-semibold transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {creating ? '⏳ Creating...' : template.tier === 'FREE' ? '✨ Use Free Template' : `💳 Purchase $${template.price}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Revenue Share Info Banner */}
          <div className="mt-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">💰 Create & Sell Your Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-2xl">💎</span>
                  70% Revenue Share
                </h3>
                <p className="text-purple-100 text-sm">
                  Keep 70% of all sales from your templates - we handle payments & hosting
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-2xl">✨</span>
                  Easy Creation
                </h3>
                <p className="text-purple-100 text-sm">
                  Use our AI builder to create professional templates in minutes
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  Instant Payouts
                </h3>
                <p className="text-purple-100 text-sm">
                  Get paid automatically via Stripe Connect every week
                </p>
              </div>
            </div>
            <Link
              href="/templates/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 hover:bg-gray-100 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <DollarSign className="w-5 h-5" />
              Start Earning with Templates
            </Link>
          </div>

          {/* ✅ Bottom CTA */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-3xl p-8 sm:p-12 text-white">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Can't find what you're looking for?
              </h2>
              <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
                Start from scratch and let AI help you build exactly what you need
              </p>
              <button
                onClick={() => router.push('/builder')}
                className="px-8 py-4 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-semibold text-lg shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all"
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

// Helper function for category icons
function getCategoryIcon(category: string): string {
  switch (category.toLowerCase()) {
    case 'landing-page':
      return '🚀'
    case 'dashboard':
      return '📊'
    case 'blog':
      return '📝'
    case 'portfolio':
      return '💼'
    case 'e-commerce':
      return '🛒'
    case 'saas':
      return '⚡'
    case 'marketing':
      return '📈'
    case 'startup':
      return '🎯'
    default:
      return '📄'
  }
}