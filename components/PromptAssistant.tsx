/* eslint-disable react/no-unescaped-entities */
'use client'

import { useState } from 'react'
import { 
  Lightbulb, 
  X, 
  Sparkles, 
  Copy, 
  Check,
  ChevronRight,
  Database,
  Palette,
  Users,
  Zap
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface PromptAssistantProps {
  isOpen: boolean
  onClose: () => void
  onUsePrompt: (prompt: string) => void
}

type PromptMode = 'simple' | 'guided' | 'pfda'

export default function PromptAssistant({ 
  isOpen, 
  onClose, 
  onUsePrompt 
}: PromptAssistantProps) {
  const [mode, setMode] = useState<PromptMode>('simple')
  const [copied, setCopied] = useState(false)

  // P.F.D.A. Framework State
  const [pfda, setPfda] = useState({
    appName: '',
    purpose: '',
    audience: '',
    feature1: '',
    feature2: '',
    feature3: '',
    techPreference: 'Supabase',
    designStyle: '',
    needsAuth: false,
    dataModel: '',
    userJourney: ''
  })

  if (!isOpen) return null

  // Generate prompt from P.F.D.A. framework
  const generatePFDAPrompt = () => {
    const parts = []
    
    if (pfda.appName) parts.push(`App Name: ${pfda.appName}`)
    if (pfda.purpose) parts.push(`\nPurpose: ${pfda.purpose}`)
    if (pfda.audience) parts.push(` for ${pfda.audience}`)
    
    parts.push('\n\nKey Features:')
    if (pfda.feature1) parts.push(`\n1. ${pfda.feature1}`)
    if (pfda.feature2) parts.push(`\n2. ${pfda.feature2}`)
    if (pfda.feature3) parts.push(`\n3. ${pfda.feature3}`)
    
    if (pfda.techPreference) {
      parts.push(`\n\nTech Stack: Use ${pfda.techPreference} for database and backend`)
    }
    
    if (pfda.needsAuth) {
      parts.push('\nAuthentication: Include user login and signup with Supabase Auth')
    }
    
    if (pfda.dataModel) {
      parts.push(`\n\nData Model: ${pfda.dataModel}`)
    }
    
    if (pfda.designStyle) {
      parts.push(`\n\nDesign: ${pfda.designStyle}`)
    }
    
    if (pfda.userJourney) {
      parts.push(`\n\nUser Journey: ${pfda.userJourney}`)
    }
    
    return parts.join('')
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Prompt copied!', { duration: 2000 })
  }

  const handleUsePrompt = (prompt: string) => {
    // Track analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'prompt_assistant_used', {
        mode: mode, // 'simple', 'guided', or 'pfda'
        prompt_length: prompt.length
      })
    }
    onUsePrompt(prompt)
    toast.success('Prompt loaded!', { duration: 2000 })
    onClose()
  }

  // Example prompts optimized for BuildFlow
  const examplePrompts = {
    beginner: [
      {
        title: 'Portfolio Website',
        prompt: 'Create a modern portfolio website with a hero section, project gallery, skills section, and contact form. Use a clean, minimalist design with smooth animations.'
      },
      {
        title: 'Coffee Shop Landing',
        prompt: 'Build a coffee shop landing page with menu sections, location map, opening hours, and an order form. Use warm, inviting colors and high-quality food photography placeholders.'
      },
      {
        title: 'Fitness Tracker',
        prompt: 'Create a workout tracking app where users can log exercises, view their progress over time, and set fitness goals. Include charts for visualization.'
      }
    ],
    advanced: [
      {
        title: 'E-commerce Coffee Shop',
        prompt: `App Name: Roast & Revel

Purpose: Online coffee ordering platform with real-time inventory management

Key Features:
1. Product catalog (beans, brews, pastries) stored in Supabase
2. Shopping cart with local storage persistence
3. User accounts with order history (Supabase Auth)
4. Admin dashboard to update daily specials and inventory

Tech Stack: Supabase for database and authentication
Design: Dark mode with rustic aesthetic, warm brown tones, high-quality product images
Data Model: Products table (name, price, category, stock), Orders table (user_id, items, total, status), Users via Supabase Auth`
      },
      {
        title: 'Gym Class Booking',
        prompt: `App Name: Iron Pulse Fitness

Purpose: Lead generation and class booking platform

Key Features:
1. Live class schedule pulling from Supabase database
2. Multi-step registration form (name, fitness goals, email) saving to Leads table
3. Interactive booking calendar with real-time availability
4. Testimonial carousel with admin-editable content

Tech Stack: Supabase for data persistence and real-time updates
Authentication: Optional - track bookings for registered users
Design: High-energy with bold colors, dynamic animations, modern fitness aesthetic
Data Model: Classes table (name, instructor, time, capacity), Leads table, Bookings table`
      },
      {
        title: 'Recipe Sharing Platform',
        prompt: `App Name: Flavor Vault

Purpose: Community recipe sharing with save/favorite functionality

Key Features:
1. Browse recipes with search and filter (cuisine, difficulty, time)
2. User-submitted recipes with image upload (Supabase Storage)
3. Like/save recipes to personal collection
4. Comment system with real-time updates

Tech Stack: Supabase for database, storage, and real-time subscriptions
Authentication: Required - users must sign up to submit/save recipes
Design: Clean, food-magazine inspired with card layouts and appetizing imagery
Data Model: Recipes table (user_id, title, ingredients, instructions, image_url), Likes table, Comments table with real-time listeners`
      }
    ]
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Prompt Assistant</h2>
                <p className="text-purple-100 text-sm">Get better results with structured prompts</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex gap-2 p-4">
            <button
              onClick={() => setMode('simple')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                mode === 'simple'
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'
              }`}
            >
              📝 Examples
            </button>
            <button
              onClick={() => setMode('guided')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                mode === 'guided'
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'
              }`}
            >
              🎯 Quick Tips
            </button>
            <button
              onClick={() => setMode('pfda')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                mode === 'pfda'
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'
              }`}
            >
              ⚡ Power Mode
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Simple Mode - Example Prompts */}
          {mode === 'simple' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Beginner-Friendly Prompts
                  </h3>
                </div>
                <div className="space-y-3">
                  {examplePrompts.beginner.map((example, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 transition cursor-pointer group"
                      onClick={() => handleUsePrompt(example.prompt)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                            {example.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {example.prompt}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-purple-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Advanced Prompts
                  </h3>
                </div>
                <div className="space-y-3">
                  {examplePrompts.advanced.map((example, index) => (
                    <div
                      key={index}
                      className="p-4 border-2 border-purple-200 dark:border-purple-900/50 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 transition cursor-pointer bg-purple-50/50 dark:bg-purple-900/10 group"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                          {example.title}
                        </h4>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(example.prompt)
                            }}
                            className="p-1.5 hover:bg-purple-200 dark:hover:bg-purple-800 rounded transition"
                            title="Copy prompt"
                          >
                            {copied ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleUsePrompt(example.prompt)}
                            className="p-1.5 hover:bg-purple-200 dark:hover:bg-purple-800 rounded transition"
                            title="Use this prompt"
                          >
                            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                        </div>
                      </div>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                        {example.prompt}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Guided Mode - Quick Tips */}
          {mode === 'guided' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  🎯 The BuildFlow Prompt Formula
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Transform vague ideas into production-ready apps by following these guidelines:
                </p>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        Be Specific About Features
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ❌ &ldquo;Create a blog&rdquo; &rarr; ✅ &ldquo;Create a blog with post categories, search functionality, and user comments stored in Supabase&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        Mention Data Requirements
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ❌ &ldquo;Make an e-commerce site&rdquo; &rarr; ✅ &ldquo;E-commerce site with Products table (name, price, stock), Orders table, and shopping cart state&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        Specify Authentication Needs
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ✅ "Include user authentication with Supabase Auth for login/signup and protected dashboard"
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold">
                      4
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        Describe Visual Style
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ✅ "Modern and minimal design with a dark mode, glassmorphism effects, and smooth animations"
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2 flex items-center gap-2">
                    ❌ Vague Prompts
                  </h4>
                  <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                    <li>• &ldquo;Make a website&rdquo;</li>
                    <li>• &ldquo;Build an app&rdquo;</li>
                    <li>• &ldquo;Create something cool&rdquo;</li>
                  </ul>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
                    ✅ Specific Prompts
                  </h4>
                  <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                    <li>• &ldquo;Task management app with...&rdquo;</li>
                    <li>• &ldquo;Recipe site with search and...&rdquo;</li>
                    <li>• &ldquo;Booking system with calendar...&rdquo;</li>
                  </ul>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                <div className="flex gap-3">
                  <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                      Pro Tip: Mention Supabase for Data
                    </h4>
                    <p className="text-sm text-yellow-800 dark:text-yellow-400">
                      BuildFlow works best with Supabase! Any time your app needs to save data, specifically mention:
                      "Use Supabase to store..." This ensures proper database integration.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* P.F.D.A. Power Mode */}
          {mode === 'pfda' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  ⚡ P.F.D.A. Framework
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Purpose • Features • Data • Aesthetics - The formula for production-ready apps
                </p>
              </div>

              <div className="space-y-4">
                {/* Persona & Purpose */}
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Persona & Purpose
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="App Name (e.g., TaskMaster Pro)"
                      value={pfda.appName}
                      onChange={(e) => setPfda({ ...pfda, appName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Purpose (e.g., Help freelancers track billable hours)"
                      value={pfda.purpose}
                      onChange={(e) => setPfda({ ...pfda, purpose: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Target Audience (e.g., Freelance designers and developers)"
                      value={pfda.audience}
                      onChange={(e) => setPfda({ ...pfda, audience: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Features */}
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Core Features (3 must-haves)
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Feature 1 (e.g., Time tracking with start/stop timer)"
                      value={pfda.feature1}
                      onChange={(e) => setPfda({ ...pfda, feature1: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Feature 2 (e.g., Project categorization and tags)"
                      value={pfda.feature2}
                      onChange={(e) => setPfda({ ...pfda, feature2: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Feature 3 (e.g., Weekly/monthly reports with charts)"
                      value={pfda.feature3}
                      onChange={(e) => setPfda({ ...pfda, feature3: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Data & Tech */}
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Data & Technology
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pfda.needsAuth}
                          onChange={(e) => setPfda({ ...pfda, needsAuth: e.target.checked })}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Needs User Authentication
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="Data Model (e.g., TimeEntries table, Projects table, Users table)"
                      value={pfda.dataModel}
                      onChange={(e) => setPfda({ ...pfda, dataModel: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      💡 BuildFlow uses Supabase by default for database and auth
                    </div>
                  </div>
                </div>

                {/* Aesthetics */}
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Palette className="w-5 h-5 text-orange-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Design & Aesthetics
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Design Style (e.g., Modern, minimalist, with dark mode and glassmorphism)"
                      value={pfda.designStyle}
                      onChange={(e) => setPfda({ ...pfda, designStyle: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="User Journey (Optional: e.g., Login → Start timer → View report)"
                      value={pfda.userJourney}
                      onChange={(e) => setPfda({ ...pfda, userJourney: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Generated Prompt Preview */}
              {(pfda.appName || pfda.purpose) && (
                <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      📝 Generated Prompt
                    </h4>
                    <button
                      onClick={() => handleCopy(generatePFDAPrompt())}
                      className="p-2 hover:bg-purple-200 dark:hover:bg-purple-800 rounded transition"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                    {generatePFDAPrompt()}
                  </pre>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleUsePrompt(generatePFDAPrompt())}
                  disabled={!pfda.appName && !pfda.purpose}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Use This Prompt
                </button>
                <button
                  onClick={() => setPfda({
                    appName: '',
                    purpose: '',
                    audience: '',
                    feature1: '',
                    feature2: '',
                    feature3: '',
                    techPreference: 'Supabase',
                    designStyle: '',
                    needsAuth: false,
                    dataModel: '',
                    userJourney: ''
                  })}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold transition"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-xs text-center text-gray-600 dark:text-gray-400">
            💡 Pro Tip: The more specific your prompt, the better your results. Include database requirements, auth needs, and design preferences.
          </p>
        </div>
      </div>
    </div>
  )
}
