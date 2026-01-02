'use client'


import { useState } from 'react'

// Use a toast function for copy feedback
const toast = typeof window !== 'undefined' && (window as any).toast

interface PromptGuideProps {
  autoOpen?: boolean
}


export default function PromptGuide({ autoOpen = false }: PromptGuideProps) {
  const [isOpen, setIsOpen] = useState(autoOpen)
  const [activeTab, setActiveTab] = useState('basics')
  const [favorites, setFavorites] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const toggleFavorite = (promptId: string) => {
    setFavorites((prev) =>
      prev.includes(promptId)
        ? prev.filter((id) => id !== promptId)
        : [...prev, promptId]
    )
  }

  return (
    <>

      {/* Trigger Button Styles - choose one */}

      {/* Minimal Style */}
      {/*
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm"
      >
        <span>💡</span>
        Tips
      </button>
      */}

      {/* Icon Only */}
      {/*
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
        title="Prompt Engineering Guide"
      >
        <span className="text-2xl">💡</span>
      </button>
      */}

      {/* Badge Style */}
      {/*
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-full transition text-sm font-medium"
      >
        <span>💡</span>
        Get Better Results
      </button>
      */}

      {/* Default Style (current) */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition text-sm font-medium shadow-lg"
      >
        <span className="text-lg">💡</span>
        Prompt Guide
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-b border-gray-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">💡</span>
                  <h2 className="text-2xl font-bold text-white">Prompt Engineering Guide</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-300 text-sm">
                Master these techniques to get 10x better results from BuildFlow AI
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-6 pt-4 border-b border-gray-800">
              {[
                { id: 'basics', label: '🎯 Basics', emoji: '🎯' },
                { id: 'advanced', label: '🚀 Advanced', emoji: '🚀' },
                { id: 'debugging', label: '🔧 Debugging', emoji: '🔧' },
                { id: 'examples', label: '📝 Examples', emoji: '📝' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-t-lg transition ${
                    activeTab === tab.id
                      ? 'bg-gray-800 text-white border-t-2 border-purple-500'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <span className="mr-2">{tab.emoji}</span>
                  {tab.label.replace(tab.emoji + ' ', '')}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="px-6 pt-4">
              <input
                type="text"
                placeholder="Search tips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 mb-4 rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 pt-0">
              {activeTab === 'basics' && (
                <div className="space-y-6">
                  {/* R-T-C-E Framework */}
                  <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-800/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">📋</span>
                      1. Use the R-T-C-E Framework
                    </h3>
                    <p className="text-gray-300 mb-4">
                      Structure your prompts for maximum clarity and results:
                    </p>
                    <div className="space-y-4">
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-start gap-3 mb-2">
                          <span className="text-2xl">👤</span>
                          <div>
                            <p className="font-semibold text-purple-400">Role</p>
                            <p className="text-gray-300 text-sm">Define who the AI should act as</p>
                          </div>
                        </div>
                        <div className="bg-gray-800 rounded p-3 mt-2 flex items-center justify-between gap-2">
                          <code className="text-green-400 text-sm">
                            {`"Act as a Senior Full-stack Developer and UI/UX Designer."`}
                          </code>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleFavorite('role')}
                              className="text-xl px-1"
                              title="Favorite"
                            >
                              {favorites.includes('role') ? '⭐' : '☆'}
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText('Act as a Senior Full-stack Developer and UI/UX Designer.')
                                if (typeof toast === 'function') toast('Copied!')
                              }}
                              className="ml-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
                              title="Copy"
                            >
                              📋 Copy
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-start gap-3 mb-2">
                          <span className="text-2xl">🎯</span>
                          <div>
                            <p className="font-semibold text-blue-400">Task</p>
                            <p className="text-gray-300 text-sm">Be specific about what to build</p>
                          </div>
                        </div>
                        <div className="bg-gray-800 rounded p-3 mt-2 flex items-center justify-between gap-2">
                          <code className="text-green-400 text-sm">
                            {`"Build a CRM dashboard for a construction company."`}
                          </code>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleFavorite('task')}
                              className="text-xl px-1"
                              title="Favorite"
                            >
                              {favorites.includes('task') ? '⭐' : '☆'}
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText('Build a CRM dashboard for a construction company.')
                                if (typeof toast === 'function') toast('Copied!')
                              }}
                              className="ml-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
                              title="Copy"
                            >
                              📋 Copy
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-start gap-3 mb-2">
                          <span className="text-2xl">📝</span>
                          <div>
                            <p className="font-semibold text-green-400">Context</p>
                            <p className="text-gray-300 text-sm">Provide relevant background details</p>
                          </div>
                        </div>
                        <div className="bg-gray-800 rounded p-3 mt-2 flex items-center justify-between gap-2">
                          <code className="text-green-400 text-sm">
                            {`"The app needs to track leads, project status, and budget. Use a clean, professional blue-and-gray color palette."`}
                          </code>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleFavorite('context')}
                              className="text-xl px-1"
                              title="Favorite"
                            >
                              {favorites.includes('context') ? '⭐' : '☆'}
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText('The app needs to track leads, project status, and budget. Use a clean, professional blue-and-gray color palette.')
                                if (typeof toast === 'function') toast('Copied!')
                              }}
                              className="ml-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
                              title="Copy"
                            >
                              📋 Copy
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-start gap-3 mb-2">
                          <span className="text-2xl">✨</span>
                          <div>
                            <p className="font-semibold text-yellow-400">Expectation</p>
                            <p className="text-gray-300 text-sm">Specify what success looks like</p>
                          </div>
                        </div>
                        <div className="bg-gray-800 rounded p-3 mt-2 flex items-center justify-between gap-2">
                          <code className="text-green-400 text-sm">
                            {`"Include a searchable table, 'Status' dropdown for each row, and 'Add New Project' modal."`}
                          </code>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleFavorite('expectation')}
                              className="text-xl px-1"
                              title="Favorite"
                            >
                              {favorites.includes('expectation') ? '⭐' : '☆'}
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText("Include a searchable table, 'Status' dropdown for each row, and 'Add New Project' modal.")
                                if (typeof toast === 'function') toast('Copied!')
                              }}
                              className="ml-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
                              title="Copy"
                            >
                              📋 Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Foundation First */}
                  <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-800/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">🏗️</span>
                      2. Follow "Foundation First" Rule
                    </h3>
                    <p className="text-gray-300 mb-4">
                      Build in layers to avoid confusion. Start simple, then add complexity:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <span className="text-purple-400 font-bold text-lg">1</span>
                        <div>
                          <p className="font-semibold text-white mb-1">Foundation</p>
                          <p className="text-gray-300 text-sm">Basic layout and navigation first</p>
                          <div className="bg-gray-800 rounded p-2 mt-2">
                            <code className="text-green-400 text-xs">
                              "Create a header with logo, navigation menu, and user profile dropdown"
                            </code>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <span className="text-blue-400 font-bold text-lg">2</span>
                        <div>
                          <p className="font-semibold text-white mb-1">Data Structure</p>
                          <p className="text-gray-300 text-sm">Define your data and mock examples</p>
                          <div className="bg-gray-800 rounded p-2 mt-2">
                            <code className="text-green-400 text-xs">
                              "Create mock database with fields: Name, Budget, Deadline, Status"
                            </code>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <span className="text-green-400 font-bold text-lg">3</span>
                        <div>
                          <p className="font-semibold text-white mb-1">Interactivity</p>
                          <p className="text-gray-300 text-sm">Add dynamic features and actions</p>
                          <div className="bg-gray-800 rounded p-2 mt-2">
                            <code className="text-green-400 text-xs">
                              "Add delete button with confirmation modal before removing"
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Design System */}
                  <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-800/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">🎨</span>
                      3. Provide Design System Constraints
                    </h3>
                    <p className="text-gray-300 mb-4">
                      Give specific UI rules to avoid generic-looking results:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <p className="font-semibold text-green-400 mb-2">Typography</p>
                        <code className="text-gray-300 text-sm">
                          "Use Inter or Montserrat fonts"
                        </code>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <p className="font-semibold text-blue-400 mb-2">Colors</p>
                        <code className="text-gray-300 text-sm">
                          "Blue (#3B82F6) primary, gray neutrals"
                        </code>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <p className="font-semibold text-purple-400 mb-2">Spacing</p>
                        <code className="text-gray-300 text-sm">
                          "Generous whitespace, 4px border radius"
                        </code>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <p className="font-semibold text-yellow-400 mb-2">Components</p>
                        <code className="text-gray-300 text-sm">
                          "Shadcn/UI style with dark mode toggle"
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="space-y-6">
                  {/* Negative Prompting */}
                  <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-800/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">🚫</span>
                      4. Use Negative Prompting
                    </h3>
                    <p className="text-gray-300 mb-4">
                      Tell the AI what NOT to do - often the fastest way to fix errors:
                    </p>
                    <div className="space-y-3">
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <p className="font-semibold text-red-400 mb-2">❌ Don't use placeholders</p>
                        <code className="text-gray-300 text-sm">
                          "Do not use Lorem Ipsum; use realistic construction project names"
                        </code>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <p className="font-semibold text-red-400 mb-2">❌ Avoid bad design choices</p>
                        <code className="text-gray-300 text-sm">
                          "Do not use bright neon colors or Comic Sans font"
                        </code>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <p className="font-semibold text-red-400 mb-2">❌ Prevent common bugs</p>
                        <code className="text-gray-300 text-sm">
                          "Do not allow form submission without validation"
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Technical Specifics */}
                  <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-800/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">⚙️</span>
                      Technical Specifics for BuildFlow
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <p className="font-semibold text-purple-400 mb-2">🗄️ Reference Existing Data</p>
                        <p className="text-gray-300 text-sm mb-2">
                          Mention specific APIs, databases, table names, and keys:
                        </p>
                        <code className="text-green-400 text-sm">
                          "Connect to Supabase 'projects' table with columns: id, name, status, budget"
                        </code>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <p className="font-semibold text-blue-400 mb-2">📊 State Management</p>
                        <p className="text-gray-300 text-sm mb-2">
                          Specify how data should flow:
                        </p>
                        <code className="text-green-400 text-sm">
                          "Use React useState for form data, localStorage for user preferences"
                        </code>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <p className="font-semibold text-green-400 mb-2">🔌 API Integration</p>
                        <p className="text-gray-300 text-sm mb-2">
                          Be explicit about endpoints:
                        </p>
                        <code className="text-green-400 text-sm">
                          "Fetch from /api/projects, POST to /api/projects/create with auth header"
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Pro Tips */}
                  <div className="bg-gradient-to-br from-yellow-900/20 to-amber-900/20 border border-yellow-800/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">⭐</span>
                      Pro Tips
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-yellow-400 text-xl">💎</span>
                        <div>
                          <p className="text-white font-semibold mb-1">Use Visual References</p>
                          <p className="text-gray-300 text-sm">
                            Describe designs from Dribbble or screenshots: "Make header look like [description] with blurred glass effect"
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-yellow-400 text-xl">🔍</span>
                        <div>
                          <p className="text-white font-semibold mb-1">Double Check Changes</p>
                          <p className="text-gray-300 text-sm">
                            Always verify no features were removed during edits - explicitly ask to keep existing functionality
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-yellow-400 text-xl">📝</span>
                        <div>
                          <p className="text-white font-semibold mb-1">Iterate in Chat</p>
                          <p className="text-gray-300 text-sm">
                            Make small, specific changes one at a time rather than requesting everything at once
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'debugging' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-red-900/20 to-pink-900/20 border border-red-800/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">🔧</span>
                      5. Debug via "Chat and Preview" Loop
                    </h3>
                    <p className="text-gray-300 mb-4">
                      Be specific about errors instead of saying "it's broken":
                    </p>
                    
                    <div className="space-y-4">
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-red-500 text-xl">❌</span>
                          <p className="font-semibold text-red-400">Bad</p>
                        </div>
                        <code className="text-gray-300 text-sm">"The button doesn't work"</code>
                      </div>

                      <div className="bg-gray-900/50 rounded-lg p-4 border border-green-700">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-green-500 text-xl">✅</span>
                          <p className="font-semibold text-green-400">Good</p>
                        </div>
                        <code className="text-gray-300 text-sm">
                          "The 'Submit' button on the contact form is not triggering a console log or updating the state when clicked"
                        </code>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <h4 className="font-semibold text-white">Common Debugging Prompts:</h4>
                      
                      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                        <p className="text-purple-400 text-sm font-medium mb-1">Refactor Request</p>
                        <code className="text-gray-300 text-sm">
                          "Refactor the ProjectCard component to be more modular and improve performance"
                        </code>
                      </div>

                      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                        <p className="text-blue-400 text-sm font-medium mb-1">Error Fixing</p>
                        <code className="text-gray-300 text-sm">
                          "Fix this error: [paste exact error message from console]"
                        </code>
                      </div>

                      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                        <p className="text-green-400 text-sm font-medium mb-1">Optimization</p>
                        <code className="text-gray-300 text-sm">
                          "The dashboard loads slowly. Optimize by lazy loading images and using React.memo"
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-800/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">🔍 Check the Logs</h3>
                    <p className="text-gray-300 mb-4">
                      If BuildFlow shows errors in the console:
                    </p>
                    <ol className="space-y-2 list-decimal list-inside text-gray-300">
                      <li>Open browser DevTools (F12)</li>
                      <li>Look for red error messages in Console tab</li>
                      <li>Copy the exact error text</li>
                      <li>Paste it back in chat: "Fix this error: [error message]"</li>
                    </ol>
                  </div>
                </div>
              )}

              {activeTab === 'examples' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-green-900/20 to-teal-900/20 border border-green-800/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">📝 Complete Prompt Examples</h3>
                    
                    <div className="space-y-4">
                      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                        <p className="font-semibold text-green-400 mb-2">Example 1: E-commerce Dashboard</p>
                        <div className="bg-gray-800 rounded p-3">
                          <code className="text-gray-300 text-sm whitespace-pre-wrap">
{`Act as a Senior Full-stack Developer.

Build an e-commerce admin dashboard for a clothing brand.

The dashboard needs to:
- Display sales analytics (charts for revenue, orders, top products)
- Show inventory levels with low-stock alerts
- List recent orders with status updates
- Use a modern, clean design with Tailwind CSS

Design should use:
- Montserrat font
- Purple (#8B5CF6) primary color
- Clean white backgrounds with subtle shadows
- 8px border radius on cards

Include:
- Sidebar navigation
- Data table with search/filter
- Charts using Chart.js
- "Add Product" modal form

Do not use Lorem Ipsum - use realistic product names like "Cotton T-Shirt", "Denim Jeans"`}
                          </code>
                        </div>
                      </div>

                      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                        <p className="font-semibold text-blue-400 mb-2">Example 2: Landing Page</p>
                        <div className="bg-gray-800 rounded p-3">
                          <code className="text-gray-300 text-sm whitespace-pre-wrap">
{`Create a modern SaaS landing page for an AI writing tool.

Structure:
1. Hero section with headline, subheadline, CTA button
2. Features section (3 cards)
3. Pricing table (3 tiers)
4. Testimonials (3 customer reviews)
5. Footer with links

Design specs:
- Gradient background (purple to blue)
- Inter font family
- Smooth scroll animations
- Mobile-responsive
- Dark mode friendly

Features to highlight:
- "AI-Powered Writing" - Generate content 10x faster
- "Grammar Check" - Perfect your writing
- "Multi-language" - Support for 50+ languages

Do not include generic stock photos - use colored gradient backgrounds instead`}
                          </code>
                        </div>
                      </div>

                      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                        <p className="font-semibold text-purple-400 mb-2">Example 3: Iteration Prompt</p>
                        <div className="bg-gray-800 rounded p-3">
                          <code className="text-gray-300 text-sm whitespace-pre-wrap">
{`Update the dashboard:

1. Change the "Delete" button color from red to a subtle gray
2. Add a confirmation modal before deleting with "Are you sure?" message
3. Move the "Add Project" button to the top-right corner
4. Make the data table sortable by clicking column headers

Keep all existing features like search, filters, and status dropdowns.
Maintain the current blue color scheme.`}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-800/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">🎯 Quick Prompt Templates</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
                        <p className="text-sm font-medium text-yellow-400 mb-1">Create Form</p>
                        <code className="text-xs text-gray-300">
                          "Create a [type] form with fields: [list]. Add validation."
                        </code>
                      </div>
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
                        <p className="text-sm font-medium text-blue-400 mb-1">Add Feature</p>
                        <code className="text-xs text-gray-300">
                          "Add [feature] to [component]. Should [behavior]."
                        </code>
                      </div>
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
                        <p className="text-sm font-medium text-green-400 mb-1">Fix Bug</p>
                        <code className="text-xs text-gray-300">
                          "Fix: [specific issue]. Expected: [behavior]."
                        </code>
                      </div>
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
                        <p className="text-sm font-medium text-purple-400 mb-1">Change Style</p>
                        <code className="text-xs text-gray-300">
                          "Change [element] to use [color/font/style]"
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-800 p-4 bg-gray-900/50">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">
                  💡 Tip: Bookmark this guide for quick reference!
                </p>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}