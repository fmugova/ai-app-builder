'use client'

import { useState } from 'react'
import { PROMPT_EXAMPLES, searchPrompts } from '@/lib/prompt-examples-library'
import { Search, Copy, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

export default function ExamplesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  
  const results = searchQuery 
    ? searchPrompts(searchQuery)
    : Object.entries(PROMPT_EXAMPLES.advanced).map(([key, example]) => ({
        ...example,
        key,
        category: 'advanced'
      }))
  
  const handleUsePrompt = (prompt: string) => {
    // Store in localStorage or query params
    localStorage.setItem('draftPrompt', prompt)
    router.push('/builder')
    toast.success('Prompt loaded in builder!')
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Prompt Examples</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Copy these prompts or use them as inspiration
          </p>
        </div>
        
        {/* Search */}
        <div className="mb-8 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search examples..."
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
        </div>
        
        {/* Results */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* BuildFlow Production Example: Roast & Revel */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-400 p-6 hover:shadow-lg transition col-span-full">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-green-700">BuildFlow Production Example: Roast & Revel</h3>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">Enterprise</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                A full-featured, enterprise-grade e-commerce demo built with React/Next.js, demonstrating best practices in accessibility, security, CSP compliance, and UI/UX. Includes cart, modal, toast, and filtering logic.
              </p>
              <div className="flex gap-2">
                <a
                  href="/examples/roast-revel"
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm flex items-center justify-center gap-2"
                  aria-label="View Roast & Revel production example"
                >
                  View Example
                </a>
              </div>
            </div>
          {results.map((example, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold">{example.title}</h3>
                <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                  {example.difficulty || example.category}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                {example.prompt?.substring(0, 150) ?? ""}...
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(example.prompt ?? "")
                    toast.success('Copied!')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button
                  onClick={() => handleUsePrompt(example.prompt ?? "")}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm flex items-center justify-center gap-2"
                >
                  Use
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}