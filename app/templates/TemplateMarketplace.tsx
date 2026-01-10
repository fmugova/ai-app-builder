'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Star, Download, DollarSign, Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TemplateMarketplaceProps {
  templates: any[];
  userPurchases: any[];
  userId: string;
  userName: string;
  userEmail: string;
}

export default function TemplateMarketplace({
  templates,
  userPurchases,
  userId,
  userName,
  userEmail,
}: TemplateMarketplaceProps) {
  const [filter, setFilter] = useState<'all' | 'free' | 'pro' | 'collection'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock templates for UI demonstration
  const mockTemplates = [
    {
      id: '1',
      name: 'Modern Landing Page',
      description: 'Clean and professional landing page template with animations',
      tier: 'FREE',
      price: 0,
      thumbnail: '/templates/landing.jpg',
      category: 'Landing Pages',
      downloads: 1234,
      rating: 4.8,
      reviewCount: 45,
    },
    {
      id: '2',
      name: 'E-commerce Storefront',
      description: 'Complete e-commerce template with product pages and cart',
      tier: 'PRO',
      price: 9.99,
      thumbnail: '/templates/ecommerce.jpg',
      category: 'E-commerce',
      downloads: 567,
      rating: 4.9,
      reviewCount: 78,
    },
    {
      id: '3',
      name: 'SaaS Dashboard Collection',
      description: '10 premium dashboard templates for SaaS applications',
      tier: 'COLLECTION',
      price: 49.99,
      thumbnail: '/templates/dashboard.jpg',
      category: 'Collections',
      downloads: 234,
      rating: 5.0,
      reviewCount: 23,
    },
    {
      id: '4',
      name: 'Blog Template',
      description: 'Simple and elegant blog layout',
      tier: 'FREE',
      price: 0,
      thumbnail: '/templates/blog.jpg',
      category: 'Blogs',
      downloads: 890,
      rating: 4.6,
      reviewCount: 34,
    },
    {
      id: '5',
      name: 'Portfolio Showcase',
      description: 'Creative portfolio template for designers and developers',
      tier: 'PRO',
      price: 9.99,
      thumbnail: '/templates/portfolio.jpg',
      category: 'Portfolio',
      downloads: 445,
      rating: 4.7,
      reviewCount: 56,
    },
    {
      id: '6',
      name: 'Business Starter Pack',
      description: '5 essential business templates in one package',
      tier: 'COLLECTION',
      price: 49.99,
      thumbnail: '/templates/business.jpg',
      category: 'Collections',
      downloads: 123,
      rating: 4.9,
      reviewCount: 12,
    },
  ];

  const filteredTemplates = mockTemplates.filter((template) => {
    const matchesFilter =
      filter === 'all' ||
      template.tier.toLowerCase() === filter;
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('free')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'free'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Free
            </button>
            <button
              onClick={() => setFilter('pro')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'pro'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Pro
            </button>
            <button
              onClick={() => setFilter('collection')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'collection'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Collections
            </button>
          </div>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow"
            >
              {/* Thumbnail */}
              <div className="h-48 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 flex items-center justify-center">
                <span className="text-6xl opacity-50">🎨</span>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                    {template.name}
                  </h3>
                  {getTierBadge(template.tier, template.price)}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {template.description}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
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

                <Button
                  className="w-full"
                  variant={template.tier === 'FREE' ? 'outline' : 'default'}
                >
                  {template.tier === 'FREE' ? 'Download Free' : `Purchase $${template.price}`}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No templates found. Try adjusting your filters.
            </p>
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
