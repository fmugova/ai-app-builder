'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation';
import type { JsonValue } from '@prisma/client/runtime/library'

type Submission = {
  id: string | number
  type: string
  submittedAt: string | number | Date
  data: JsonValue
}

interface SubmissionsClientProps {
  submissions: Submission[]
  projectId: string | number
}

export default function SubmissionsClient({ submissions, projectId }: SubmissionsClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState('all')
  
  const filtered = filter === 'all' 
    ? submissions 
    : submissions.filter(s => s.type === filter)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <button
          onClick={() => router.back()}
          className="mb-4 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Form Submissions</h1>
        
        {/* Filter */}
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="mb-6 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">All Types</option>
          <option value="contact">Contact</option>
          <option value="newsletter">Newsletter</option>
          <option value="booking">Booking</option>
        </select>

        {/* Submissions List */}
        {filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((sub) => (
              <div 
                key={sub.id} 
                className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                    {sub.type}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(sub.submittedAt).toLocaleString()}
                  </span>
                </div>
                <pre className="text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 rounded-lg overflow-auto border border-gray-200 dark:border-gray-700 font-mono">
                  {JSON.stringify(sub.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No submissions yet</h3>
            <p className="text-gray-600 dark:text-gray-400">Form submissions will appear here when users submit forms on your published site.</p>
          </div>
        )}
      </div>
    </div>
  )
}