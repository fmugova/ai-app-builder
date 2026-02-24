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

type ProjectUser = {
  id: string
  email: string
  name: string | null
  createdAt: string | Date
  lastLoginAt: string | Date | null
}

interface SubmissionsClientProps {
  submissions: Submission[]
  projectId: string | number
  projectUsers?: ProjectUser[]
}

export default function SubmissionsClient({ submissions, projectId, projectUsers = [] }: SubmissionsClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'submissions' | 'users'>('submissions')
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

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab('submissions')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'submissions'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Form Submissions
            <span className="ml-2 text-xs opacity-75">({submissions.length})</span>
          </button>
          <button
            onClick={() => setTab('users')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'users'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Registered Users
            <span className="ml-2 text-xs opacity-75">({projectUsers.length})</span>
          </button>
        </div>

        {/* ── SUBMISSIONS TAB ── */}
        {tab === 'submissions' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Form Submissions</h1>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              >
                <option value="all">All Types</option>
                <option value="contact">Contact</option>
                <option value="newsletter">Newsletter</option>
                <option value="booking">Booking</option>
              </select>
            </div>

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
          </>
        )}

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Registered Users</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Users who have created accounts via your site&apos;s signup page.
              </p>
            </div>

            {projectUsers.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Registered</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {projectUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                          {user.name ?? <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{user.email}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleString()
                            : <span className="text-gray-300 dark:text-gray-600">Never</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="text-6xl mb-4">👤</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No registered users yet</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Users who sign up via your site&apos;s login/signup pages will appear here.
                  <br />
                  Generate a site with login and signup pages to enable this feature.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
