'use client';

import React, { useState, useMemo } from 'react';
import { templates as registeredTemplates } from '@/lib/templates';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Star, Download, DollarSign, Crown, Lock, Wand2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Template {
  id: string;
  name: string;
  description: string;
  tier: string;
  price: number;
  thumbnail?: string;
  category: string;
  downloads: number;
  rating: number;
  reviewCount: number;
}

interface TemplateMarketplaceProps {
  templates: Template[];
  userPurchases: { templateId: string }[];
  userId: string;
  userName: string;
  userEmail: string;
}

// Category emoji map
const CATEGORY_ICONS: Record<string, string> = {
  Marketing: '🚀', Admin: '⚙️', Personal: '👤',
  'E-commerce': '🛍️', Content: '📝', Authentication: '🔐',
  portfolio: '🎨', landing: '📄',
}

export default function TemplateMarketplace({
  // templates,
  // userPurchases,
  // userId,
  // userName,
  // userEmail,
}: TemplateMarketplaceProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'free' | 'pro' | 'collection'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Use registered templates and map to UI structure
  const mockTemplates = useMemo(() => registeredTemplates.map((t, idx) => ({
    id: String(idx + 1),
    name: t.name,
    description: t.description,
    tier: t.category === 'Personal' ? 'PRO' : 'FREE',
    price: t.category === 'Personal' ? 9.99 : 0,
    thumbnail: '',
    category: t.category,
    tags: t.tags || [],
    prompt: `Build a ${t.name}: ${t.description}`,
    downloads: 100 + idx * 10,
    rating: 4.8,
    reviewCount: 10 + idx * 2,
  })), []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(mockTemplates.map(t => t.category)));
    return ['all', ...cats];
  }, [mockTemplates]);

  const filteredTemplates = mockTemplates.filter((template) => {
    const matchesTier = filter === 'all' || template.tier.toLowerCase() === filter;
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    const matchesSearch = searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTier && matchesCategory && matchesSearch;
  });

  const handleUseTemplate = (template: typeof mockTemplates[0]) => {
    router.push(`/chatbuilder?prompt=${encodeURIComponent(template.prompt)}`);
  };

  const getTierBadge = (tier: string, price: number) => {
    switch (tier) {
      case 'FREE':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-semibold">
            FREE
          </span>
        );
      case 'PRO':
        return (
          <span className="px-3 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-xs font-semibold flex items-center gap-1">
            <Crown className="w-3 h-3" />
            PRO ${price}
          </span>
        );
      case 'COLLECTION':
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-semibold flex items-center gap-1">
            <Lock className="w-3 h-3" />
            COLLECTION ${price}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Template Marketplace
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Browse and purchase premium templates or create your own
              </p>
            </div>
            <Link href="/templates/create">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <DollarSign className="h-4 w-4 mr-2" />
                Create & Sell Template
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search + Tier Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search templates by name, description or tag…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'free', 'pro', 'collection'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg transition capitalize ${
                  filter === f
                    ? f === 'free' ? 'bg-green-600 text-white' : f === 'collection' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}>
                {f === 'all' ? 'All Tiers' : f === 'collection' ? 'Collections' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 flex-wrap mb-6">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-sm transition ${
                categoryFilter === cat
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400'
              }`}>
              {cat !== 'all' ? `${CATEGORY_ICONS[cat] || '📁'} ${cat}` : '🗂 All Categories'}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
          {(searchQuery || filter !== 'all' || categoryFilter !== 'all') && (
            <button onClick={() => { setSearchQuery(''); setFilter('all'); setCategoryFilter('all'); }}
              className="ml-2 text-purple-600 hover:underline">
              Clear filters
            </button>
          )}
        </p>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow group"
            >
              {/* Thumbnail */}
              <div className="h-44 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 flex items-center justify-center relative">
                <span className="text-6xl">{CATEGORY_ICONS[template.category] || '🎨'}</span>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg"
                  >
                    <Wand2 className="w-4 h-4" /> Use Template
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
                    {template.name}
                  </h3>
                  {getTierBadge(template.tier, template.price)}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {template.description}
                </p>

                {template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{template.rating}</span>
                    <span>({template.reviewCount})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" />
                    <span>{template.downloads.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant={template.tier === 'FREE' ? 'outline' : 'default'}
                  onClick={() => handleUseTemplate(template)}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {template.tier === 'FREE' ? 'Use Free Template' : `Purchase $${template.price}`}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
              No templates found.
            </p>
            <button onClick={() => { setSearchQuery(''); setFilter('all'); setCategoryFilter('all'); }}
              className="text-purple-600 hover:underline text-sm">
              Clear all filters
            </button>
          </div>
        )}

        {/* Revenue Share Info */}
        <div className="mt-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Create & Sell Your Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">70% Revenue Share</h3>
              <p className="text-purple-100 text-sm">
                Keep 70% of all sales from your templates
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Easy Creation</h3>
              <p className="text-purple-100 text-sm">
                Use our builder to create professional templates
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Instant Payouts</h3>
              <p className="text-purple-100 text-sm">
                Get paid automatically via Stripe Connect
              </p>
            </div>
          </div>
          <Link href="/templates/create">
            <Button className="mt-6 bg-white text-purple-600 hover:bg-gray-100">
              Start Creating Templates
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
