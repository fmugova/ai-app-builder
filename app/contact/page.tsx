'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Footer from '../components/Footer'
import { Mail, MessageSquare, Send, ArrowLeft } from 'lucide-react'

export default function ContactPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    alert('Thank you for your message! We\'ll get back to you soon.')
    setFormData({ name: '', email: '', message: '' })
  }

  return (
    <>
      <div className="min-h-screen bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
          </div>
          
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">Get in Touch</h1>
            <p className="text-xl text-gray-300">
              Have questions? We'd love to hear from you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <Mail className="w-8 h-8 text-purple-500 mb-4" />
                <h3 className="text-white font-semibold mb-2">Email Us</h3>
                <a href="mailto:hello@buildflow.com" className="text-gray-400 hover:text-purple-400">
                  hello@buildflow.com
                </a>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <MessageSquare className="w-8 h-8 text-purple-500 mb-4" />
                <h3 className="text-white font-semibold mb-2">Support</h3>
                <a href="mailto:support@buildflow.com" className="text-gray-400 hover:text-purple-400">
                  support@buildflow.com
                </a>
              </div>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-8">
              <div className="space-y-4">
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
                  <label className="block text-white font-medium mb-2">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
