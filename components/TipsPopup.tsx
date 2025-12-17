'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export function TipsPopup() {
  const [showTips, setShowTips] = useState(true)

  useEffect(() => {
    const tipsHidden = localStorage.getItem('hideTips') === 'true'
    setShowTips(!tipsHidden)
  }, [])

  const hideTips = () => {
    setShowTips(false)
    localStorage.setItem('hideTips', 'true')
  }

  if (!showTips) return null

  return (
    <div className="fixed bottom-6 left-6 z-20 max-w-sm">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">💡</span>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-semibold mb-1">Pro Tip</h4>
            <p className="text-sm text-purple-100">
              Use descriptive prompts for better results. Include details about colors, layout, and features you want.
            </p>
          </div>
          <button
            onClick={hideTips}
            className="text-white hover:bg-white/20 rounded-lg p-1 transition flex-shrink-0"
            title="Close tips"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
