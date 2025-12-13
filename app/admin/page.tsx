  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast, Toaster } from 'react-hot-toast'

interface User {
  id: string
  name: string | null
  email: string
  subscriptionTier: string
  subscriptionStatus: string
  projectsThisMonth: number
  projectCount: number
  generationsUsed: number
  generationsLimit: number
  projectsLimit: number
  createdAt: string
  role: string
}

interface Activity {
  id: string
  userId: string
  action: string
  details: string
  createdAt: string
  user?: {
    name: string | null
    email: string
  }
}

interface Feedback {
  id: string
  userId: string
  type: string
  subject: string
  message: string
  status: string
  priority: string
  response?: string
  createdAt: string
  user?: {
    name: string | null
    email: string
  }
}

interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down'
  api: 'healthy' | 'degraded' | 'down'
  responseTime: number
  errors: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<User[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true) // Add this line
  
  // View toggles
  const [showUsers, setShowUsers] = useState(false)
  const [showProjects, setShowProjects] = useState(false)
  const [showActivities, setShowActivities] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showSystemHealth, setShowSystemHealth] = useState(false)
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState('all')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  
  // Modals
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [viewingFeedback, setViewingFeedback] = useState<Feedback | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false)
  const [quickActionUser, setQuickActionUser] = useState<User | null>(null)
  const [userNote, setUserNote] = useState('')

  // Check admin status via API
  // Check admin status via API
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        setCheckingAdmin(true) // Add this
        const res = await fetch('/api/admin/check')
        const data = await res.json()
        setIsAdmin(data.isAdmin)
      } catch (error) {
        setIsAdmin(false)
      } finally {
        setCheckingAdmin(false) // Add this
      }
    }
    if (session?.user?.email) {
      checkAdmin()
    }
  }, [session?.user?.email])

  useEffect(() => {
    if (status === 'loading' || checkingAdmin) return // Add checkingAdmin here

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (!isAdmin) {
      router.push('/dashboard')
      return
    }

    loadData()
  }, [session, status, isAdmin, checkingAdmin]) // Add checkingAdmin to dependencies

  const loadData = async () => {
    try {
      // Load all data in parallel
      const [statsRes, usersRes, activitiesRes, feedbackRes, healthRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/activities'),
        fetch('/api/admin/feedback'),
        fetch('/api/admin/health')
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
      if (activitiesRes.ok) setActivities(await activitiesRes.json())
      if (feedbackRes.ok) setFeedback(await feedbackRes.json())
      if (healthRes.ok) setSystemHealth(await healthRes.json())
    } catch (err) {
      console.error('Failed to load admin data:', err)
      toast.error('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' || 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesTier = tierFilter === 'all' || user.subscriptionTier === tierFilter

    return matchesSearch && matchesTier
  })

  // Bulk select
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedUsers(newSelection)
  }

  const selectAllVisible = () => {
    setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
  }

  const deselectAll = () => {
    setSelectedUsers(new Set())
  }

  // Export CSV
  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Tier', 'Status', 'Total Projects', 'Projects This Month', 'Generations', 'Joined']
    const rows = filteredUsers.map(user => [
      user.name || 'N/A',
      user.email,
      user.subscriptionTier,
      user.subscriptionStatus,
      (user.projectCount || 0).toString(),
      user.projectsThisMonth.toString(),
      user.generationsUsed.toString(),
      new Date(user.createdAt).toLocaleDateString()
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `buildflow-users-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('✅ CSV exported successfully!')
  }

  // Edit user
  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setShowEditModal(true)
  }

  const saveUserChanges = async () => {
    if (!editingUser) return

    try {
      toast.loading('Updating user...', { id: 'update-user' })

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionTier: editingUser.subscriptionTier,
          projectsLimit: editingUser.projectsLimit,
          generationsLimit: editingUser.generationsLimit,
          role: editingUser.role
        })
      })

      if (res.ok) {
        await loadData()
        setShowEditModal(false)
        setEditingUser(null)
        toast.success('✅ User updated successfully!', { id: 'update-user' })
      } else {
        const error = await res.json()
        toast.error(`❌ Error: ${error.error}`, { id: 'update-user' })
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error('❌ Failed to update user', { id: 'update-user' })
    }
  }

  // Delete user
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user: ${userEmail}?\n\nThis action cannot be undone!`)) {
      return
    }

    try {
      toast.loading('Deleting user...', { id: 'delete-user' })

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await loadData()
        toast.success('✅ User deleted successfully!', { id: 'delete-user' })
      } else {
        const error = await res.json()
        toast.error(`❌ Error: ${error.error}`, { id: 'delete-user' })
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('❌ Failed to delete user', { id: 'delete-user' })
    }
  }

  // Reset password
  const handleResetPassword = async (userId: string, userEmail: string) => {
    const newPassword = prompt(
      `Reset password for ${userEmail}\n\nEnter new temporary password (min 8 characters):\n\nLeave empty to auto-generate a secure password.`
    )

    if (newPassword === null) return // User cancelled

    try {
      toast.loading('Resetting password...', { id: 'reset-password' })

      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: newPassword || undefined
        })
      })

      if (res.ok) {
        const data = await res.json()
        await loadData()
        
        // Show the new password to admin
        const message = `Password reset successful!\n\nUser: ${userEmail}\nTemporary Password: ${data.temporaryPassword}\n\nPlease share this with the user securely.`
        
        // Copy to clipboard
        navigator.clipboard.writeText(data.temporaryPassword)
        
        alert(message)
        toast.success('✅ Password reset! Copied to clipboard.', { id: 'reset-password' })
      } else {
        const error = await res.json()
        toast.error(`❌ Error: ${error.error}`, { id: 'reset-password' })
      }
    } catch (error) {
      console.error('Reset password error:', error)
      toast.error('❌ Failed to reset password', { id: 'reset-password' })
    }
  }

  // Feedback management
  const handleRespondToFeedback = async (feedbackId: string, response: string) => {
    try {
      toast.loading('Sending response...', { id: 'respond-feedback' })

      const res = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, status: 'resolved' })
      })

      if (res.ok) {
        await loadData()
        setShowFeedbackModal(false)
        setViewingFeedback(null)
        toast.success('✅ Response sent!', { id: 'respond-feedback' })
      } else {
        toast.error('❌ Failed to send response', { id: 'respond-feedback' })
      }
    } catch (error) {
      toast.error('❌ Error sending response', { id: 'respond-feedback' })
    }
  }

  // Quick actions
  const handleQuickAction = (user: User) => {
    setQuickActionUser(user)
    setShowQuickActionsModal(true)
  }

  const sendNotification = async (userId: string, _message: string) => {
    const subject = prompt('Email subject:')
    if (!subject) return

    const emailMessage = prompt('Email message:')
    if (!emailMessage) return

    try {
      toast.loading('Sending email...', { id: 'send-email' })

      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subject,
          message: emailMessage
        })
      })

      if (res.ok) {
        toast.success('✅ Email sent successfully!', { id: 'send-email' })
        setShowQuickActionsModal(false)
      } else {
        const error = await res.json()
        toast.error(`❌ Failed: ${error.error}`, { id: 'send-email' })
      }
    } catch (error) {
      console.error('Email error:', error)
      toast.error('❌ Error sending email', { id: 'send-email' })
    }
  }

  const viewUserProjects = (userId: string) => {
    router.push(`/admin/users/${userId}/projects`)
  }

  // Bulk operations
  const bulkUpdateTier = async (tier: string) => {
    if (selectedUsers.size === 0) {
      toast.error('Please select users first')
      return
    }

    if (!confirm(`Update ${selectedUsers.size} users to ${tier} tier?`)) return

    toast.loading('Updating users...', { id: 'bulk-update' })
    
    try {
      const res = await fetch('/api/admin/users/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
          subscriptionTier: tier
        })
      })

      if (res.ok) {
        await loadData()
        deselectAll()
        toast.success(`✅ Updated ${selectedUsers.size} users!`, { id: 'bulk-update' })
      } else {
        toast.error('❌ Bulk update failed', { id: 'bulk-update' })
      }
    } catch (error) {
      toast.error('❌ Error during bulk update', { id: 'bulk-update' })
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const pendingFeedback = feedback.filter(f => f.status === 'pending').length

  return (
    <>
      <Toaster position="top-right" />
      
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-red-600 p-2 rounded-lg">
                  <span className="text-2xl">🛡️</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-red-400">Admin Dashboard</h1>
                  <p className="text-sm text-gray-400">System Control Panel</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* System Health Indicator */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  systemHealth?.database === 'healthy' && systemHealth?.api === 'healthy'
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-yellow-900/30 text-yellow-400'
                }`}>
                  <span className="w-2 h-2 bg-current rounded-full animate-pulse"></span>
                  <span className="text-sm font-medium">
                    {systemHealth?.database === 'healthy' ? 'System Online' : 'System Degraded'}
                  </span>
                </div>
                
                {/* Pending Feedback Badge */}
                {pendingFeedback > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowFeedback(true)}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition"
                    >
                      <span className="text-sm font-medium">{pendingFeedback} New Feedback</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { 
                label: 'Total Users', 
                value: stats?.totalUsers || 0, 
                icon: '👥', 
                color: 'from-blue-500 to-cyan-500',
                change: '+12%'
              },
              { 
                label: 'Total Projects', 
                value: stats?.totalProjects || 0, 
                icon: '📊', 
                color: 'from-purple-500 to-pink-500',
                change: '+23%'
              },
              { 
                label: 'AI Generations', 
                value: stats?.totalGenerations || 0, 
                icon: '✨', 
                color: 'from-green-500 to-emerald-500',
                change: '+8%'
              },
              { 
                label: 'Active Today', 
                value: stats?.activeUsers || 0, 
                icon: '⚡', 
                color: 'from-orange-500 to-red-500',
                change: '+2%'
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="relative overflow-hidden bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500`}></div>
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-400">{stat.label}</span>
                    <div className={`bg-gradient-to-r ${stat.color} p-2 rounded-xl`}>
                      <span className="text-2xl">{stat.icon}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <p className="text-4xl font-bold">{stat.value}</p>
                    <span className="text-green-400 text-sm font-semibold bg-green-900/30 px-2 py-1 rounded-lg">
                      {stat.change}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions Grid - 5 cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            {/* Users */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="text-4xl mb-3">👥</div>
              <h3 className="text-xl font-bold mb-2">Users</h3>
              <p className="text-gray-400 text-sm mb-4">
                {stats?.totalUsers || 0} registered
              </p>
              <button 
                onClick={() => setShowUsers(!showUsers)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition text-sm"
              >
                {showUsers ? 'Hide' : 'Manage'}
              </button>
            </div>

            {/* Projects */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-xl font-bold mb-2">Projects</h3>
              <p className="text-gray-400 text-sm mb-4">
                {stats?.totalProjects || 0} total
              </p>
              <button 
                onClick={() => setShowProjects(!showProjects)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition text-sm"
              >
                {showProjects ? 'Hide' : 'View All'}
              </button>
            </div>

            {/* Activity Logs */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-xl font-bold mb-2">Activities</h3>
              <p className="text-gray-400 text-sm mb-4">
                {activities.length} recent
              </p>
              <button 
                onClick={() => setShowActivities(!showActivities)}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition text-sm"
              >
                {showActivities ? 'Hide' : 'View'}
              </button>
            </div>

            {/* Feedback - BACK! */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 relative">
              {pendingFeedback > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  {pendingFeedback}
                </div>
              )}
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-xl font-bold mb-2">Feedback</h3>
              <p className="text-gray-400 text-sm mb-4">
                {pendingFeedback} pending
              </p>
              <button 
                onClick={() => setShowFeedback(!showFeedback)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg transition text-sm"
              >
                {showFeedback ? 'Hide' : 'View'}
              </button>
            </div>

            {/* Export Data */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="text-4xl mb-3">📥</div>
              <h3 className="text-xl font-bold mb-2">Export</h3>
              <p className="text-gray-400 text-sm mb-4">
                Download CSV
              </p>
              <button 
                onClick={exportToCSV}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition text-sm"
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedUsers.size > 0 && (
            <div className="bg-blue-900/50 border border-blue-700 rounded-xl p-4 mb-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-white font-semibold">
                    {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={deselectAll}
                    className="text-sm text-blue-300 hover:text-white transition"
                  >
                    Deselect All
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => bulkUpdateTier('pro')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm"
                  >
                    Upgrade to Pro
                  </button>
                  <button
                    onClick={() => bulkUpdateTier('free')}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition text-sm"
                  >
                    Downgrade to Free
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Users Table */}
          {showUsers && (
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-8 animate-fadeIn">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-bold">All Users ({filteredUsers.length})</h3>
                  {filteredUsers.length > 0 && (
                    <button
                      onClick={selectAllVisible}
                      className="text-sm text-blue-400 hover:text-blue-300 transition"
                    >
                      Select All Visible
                    </button>
                  )}
                </div>
                
                {/* Search & Filter */}
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Tiers</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="business">Business</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                          onChange={(e) => e.target.checked ? selectAllVisible() : deselectAll()}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Tier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Projects</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Generations</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Joined</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-700/50">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="font-medium text-white">{user.name || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{user.email}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.subscriptionTier === 'enterprise' ? 'bg-purple-900 text-purple-200' :
                            user.subscriptionTier === 'business' ? 'bg-blue-900 text-blue-200' :
                            user.subscriptionTier === 'pro' ? 'bg-green-900 text-green-200' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {user.subscriptionTier}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                          {user.projectCount || 0} ({user.projectsThisMonth} this month)
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                          {user.generationsUsed}/{user.generationsLimit}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleQuickAction(user)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs transition"
                              title="Quick actions"
                            >
                              ⚡
                            </button>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition"
                              title="Edit user"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition"
                              title="Delete user"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Feedback Section */}
          {showFeedback && (
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-8 animate-fadeIn">
              <h3 className="text-xl font-bold mb-6">User Feedback ({feedback.length})</h3>
              <div className="space-y-4">
                {feedback.length > 0 ? (
                  feedback.map((item) => (
                    <div 
                      key={item.id}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                        item.status === 'pending'
                          ? 'bg-orange-900/20 border-orange-700 hover:bg-orange-900/30'
                          : 'bg-gray-900 border-gray-700 hover:bg-gray-700'
                      }`}
                      onClick={() => {
                        setViewingFeedback(item)
                        setShowFeedbackModal(true)
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              item.priority === 'high' ? 'bg-red-900 text-red-200' :
                              item.priority === 'medium' ? 'bg-yellow-900 text-yellow-200' :
                              'bg-green-900 text-green-200'
                            }`}>
                              {item.priority}
                            </span>
                            <span className="text-sm text-gray-400">{item.type}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.status === 'pending' ? 'bg-orange-800 text-orange-200' :
                              'bg-green-800 text-green-200'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                          <h4 className="font-semibold text-white mb-1">{item.subject}</h4>
                          <p className="text-sm text-gray-400 line-clamp-2">{item.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">{item.user?.email}</span>
                            <span className="text-xs text-gray-600">•</span>
                            <span className="text-xs text-gray-500">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-2xl">💬</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-8">No feedback yet</p>
                )}
              </div>
            </div>
          )}

          {/* Activity Logs */}
          {showActivities && (
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-8 animate-fadeIn">
              <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
              <div className="space-y-3">
                {activities.length > 0 ? (
                  activities.slice(0, 20).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-900 rounded-xl hover:bg-gray-700 transition">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">📝</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{activity.action}</p>
                        <p className="text-sm text-gray-400">
                          {typeof activity.details === 'string' 
                            ? activity.details 
                            : JSON.stringify(activity.details).substring(0, 100)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {activity.user?.email || 'Unknown user'}
                          </span>
                          <span className="text-xs text-gray-600">•</span>
                          <span className="text-xs text-gray-500">
                            {new Date(activity.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-8">No recent activity</p>
                )}
              </div>
            </div>
          )}

          {/* Projects Info */}
          {showProjects && (
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-8 animate-fadeIn">
              <h3 className="text-xl font-bold mb-4">Projects Overview</h3>
              <p className="text-gray-400 mb-4">
                Total of {stats?.totalProjects || 0} projects created across all users.
              </p>
              <button
                onClick={() => router.push('/admin/projects')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition font-semibold"
              >
                View All Projects →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-700 animate-scaleIn">
            <h3 className="text-xl font-bold mb-4 text-white">Edit User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="text"
                  value={editingUser.email}
                  disabled
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subscription Tier</label>
                <select
                  value={editingUser.subscriptionTier}
                  onChange={(e) => setEditingUser({...editingUser, subscriptionTier: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Projects Limit</label>
                <input
                  type="number"
                  value={editingUser.projectsLimit}
                  onChange={(e) => setEditingUser({...editingUser, projectsLimit: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Generations Limit</label>
                <input
                  type="number"
                  value={editingUser.generationsLimit}
                  onChange={(e) => setEditingUser({...editingUser, generationsLimit: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveUserChanges}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition font-medium"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingUser(null)
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Details Modal */}
      {showFeedbackModal && viewingFeedback && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full border border-gray-700 animate-scaleIn max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-white">Feedback Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">From</label>
                <p className="text-white">{viewingFeedback.user?.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                <p className="text-white">{viewingFeedback.type}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Priority</label>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  viewingFeedback.priority === 'high' ? 'bg-red-900 text-red-200' :
                  viewingFeedback.priority === 'medium' ? 'bg-yellow-900 text-yellow-200' :
                  'bg-green-900 text-green-200'
                }`}>
                  {viewingFeedback.priority}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Subject</label>
                <p className="text-white">{viewingFeedback.subject}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Message</label>
                <p className="text-white bg-gray-900 p-4 rounded-lg">{viewingFeedback.message}</p>
              </div>

              {viewingFeedback.response && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Your Response</label>
                  <p className="text-white bg-blue-900/30 p-4 rounded-lg">{viewingFeedback.response}</p>
                </div>
              )}

              {viewingFeedback.status === 'pending' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Send Response</label>
                  <textarea
                    placeholder="Type your response..."
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 h-32"
                    onChange={(e) => setUserNote(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              {viewingFeedback.status === 'pending' && (
                <button
                  onClick={() => handleRespondToFeedback(viewingFeedback.id, userNote)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition font-medium"
                >
                  Send Response & Mark Resolved
                </button>
              )}
              <button
                onClick={() => {
                  setShowFeedbackModal(false)
                  setViewingFeedback(null)
                  setUserNote('')
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Modal */}
      {showQuickActionsModal && quickActionUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-700 animate-scaleIn">
            <h3 className="text-xl font-bold mb-4 text-white">Quick Actions</h3>
            <p className="text-gray-400 mb-6">For: {quickActionUser.email}</p>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowQuickActionsModal(false)
                  window.open(`/admin/users/${quickActionUser.id}/projects`, '_blank')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-left"
              >
                <span className="text-2xl">📊</span>
                <div>
                  <p className="font-medium text-white">View Projects</p>
                  <p className="text-xs text-blue-200">See all user's projects</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickActionsModal(false)
                  setQuickActionUser(quickActionUser)
                  handleResetPassword(quickActionUser.id, quickActionUser.email)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition text-left"
              >
                <span className="text-2xl">🔑</span>
                <div>
                  <p className="font-medium text-white">Reset Password</p>
                  <p className="text-xs text-red-200">Generate new temporary password</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowEmailModal(true)
                  setShowQuickActionsModal(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition text-left"
              >
                <span className="text-2xl">📧</span>
                <div>
                  <p className="font-medium text-white">Send Email</p>
                  <p className="text-xs text-green-200">Send message to user's inbox</p>
                </div>
              </button>
      {/* Email Modal */}
      {showEmailModal && quickActionUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-700 animate-scaleIn">
            <h3 className="text-xl font-bold mb-4 text-white">Send Email to User</h3>
            <p className="text-gray-400 mb-6">To: {quickActionUser.email}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={async () => {
                  if (!emailSubject.trim() || !emailMessage.trim()) {
                    toast.error('Please fill in subject and message')
                    return
                  }
                  try {
                    toast.loading('Sending email...', { id: 'send-email' })
                    const res = await fetch('/api/admin/send-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: quickActionUser.id,
                        subject: emailSubject,
                        message: emailMessage
                      })
                    })
                    if (res.ok) {
                      toast.success('✅ Email sent!', { id: 'send-email' })
                      setShowEmailModal(false)
                      setEmailSubject('')
                      setEmailMessage('')
                    } else {
                      const error = await res.json()
                      toast.error(`❌ Failed: ${error.error}`, { id: 'send-email' })
                    }
                  } catch (error) {
                    toast.error('❌ Error sending email', { id: 'send-email' })
                  }
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition font-medium"
              >
                Send Email
              </button>
              <button
                onClick={() => {
                  setShowEmailModal(false)
                  setEmailSubject('')
                  setEmailMessage('')
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

              <button
                onClick={() => {
                  navigator.clipboard.writeText(quickActionUser.email)
                  toast.success('Email copied!')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition text-left"
              >
                <span className="text-2xl">📋</span>
                <div>
                  <p className="font-medium text-white">Copy Email</p>
                  <p className="text-xs text-purple-200">Copy to clipboard</p>
                </div>
              </button>

              <button
                onClick={() => handleEditUser(quickActionUser)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg transition text-left"
              >
                <span className="text-2xl">✏️</span>
                <div>
                  <p className="font-medium text-white">Edit User</p>
                  <p className="text-xs text-orange-200">Change tier & limits</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                setShowQuickActionsModal(false)
                setQuickActionUser(null)
              }}
              className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}