'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation';

type Submission = {
  id: string | number
  type: string
  submittedAt: string | number | Date
  data: any
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
    <div className="max-w-7xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
      >
        ← Back
      </button>
      <h1 className="text-2xl font-bold mb-6">Form Submissions</h1>
      
      {/* Filter */}
      <select 
        value={filter} 
        onChange={(e) => setFilter(e.target.value)}
        className="mb-4 px-4 py-2 border rounded"
      >
        <option value="all">All Types</option>
        <option value="contact">Contact</option>
        <option value="newsletter">Newsletter</option>
        <option value="booking">Booking</option>
      </select>

      {/* Submissions List */}
      <div className="space-y-4">
        {filtered.map((sub) => (
          <div 
            key={sub.id} 
            className="bg-white p-4 rounded-lg border"
          >
            <div className="flex justify-between mb-2">
              <span className="font-medium">{sub.type}</span>
              <span className="text-sm text-gray-500">
                {new Date(sub.submittedAt).toLocaleString()}
              </span>
            </div>
            <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">
              {JSON.stringify(sub.data, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}