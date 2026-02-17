'use client'

import { useState } from 'react'
import Footer from '../components/Footer'
import { Mail, MessageSquare, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'general' as 'general' | 'support' | 'billing' | 'partnership' | 'other',
  })
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.status === 429) {
        setErrorMsg('Too many submissions. Please try again in a few minutes.')
        setStatus('error')
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }

      setStatus('success')
      setFormData({ name: '', email: '', subject: '', message: '', type: 'general' })
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gray-950">
        <header className="border-b border-gray-800 sticky top-0 z-30 bg-gray-950/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl font-bold">B</span>
                </div>
                <span className="text-xl font-bold text-white">BuildFlow</span>
              </Link>
              <Navigation variant="landing" />
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">Get in Touch</h1>
            <p className="text-xl text-gray-300">
              Have questions? We&apos;d love to hear from you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <Mail className="w-8 h-8 text-purple-500 mb-4" />
                <h3 className="text-white font-semibold mb-2">Email Us</h3>
                <a href="mailto:hello@buildflow-ai.app" className="text-gray-400 hover:text-purple-400">
                  hello@buildflow-ai.app
                </a>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <MessageSquare className="w-8 h-8 text-purple-500 mb-4" />
                <h3 className="text-white font-semibold mb-2">Support</h3>
                <a href="mailto:support@buildflow-ai.app" className="text-gray-400 hover:text-purple-400">
                  support@buildflow-ai.app
                </a>
                <p className="text-gray-600 text-xs mt-2">Typical response within 24 hours</p>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <Mail className="w-8 h-8 text-purple-500 mb-4" />
                <h3 className="text-white font-semibold mb-2">Billing &amp; Sales</h3>
                <a href="mailto:billing@buildflow-ai.app" className="text-gray-400 hover:text-purple-400">
                  billing@buildflow-ai.app
                </a>
              </div>
            </div>

            {/* Contact Form */}
            {status === 'success' ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4">
                <CheckCircle className="w-14 h-14 text-green-500" />
                <h3 className="text-white text-xl font-semibold">Message sent!</h3>
                <p className="text-gray-400 text-sm">
                  We&apos;ve received your message and will reply to <strong className="text-white">{formData.email || 'you'}</strong> within 24 hours.
                  A confirmation email is on its way.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="mt-2 text-sm text-purple-400 hover:text-purple-300 underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-8">
                <div className="space-y-4">
                  {/* Enquiry type */}
                  <div>
                    <label className="block text-white font-medium mb-2">Enquiry type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as typeof formData.type })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="general">General</option>
                      <option value="support">Technical Support</option>
                      <option value="billing">Billing</option>
                      <option value="partnership">Partnership / Press</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Subject <span className="text-gray-500 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Message</label>
                    <textarea
                      required
                      rows={5}
                      minLength={10}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {status === 'error' && (
                    <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-800 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-red-300 text-sm">{errorMsg}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    {status === 'loading' ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Sending…</>
                    ) : (
                      <><Send className="w-5 h-5" /> Send Message</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
