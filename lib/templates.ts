// lib/templates.ts

export interface Template {
  id: string
  name: string
  description: string
  type: string
  category: string
  icon: string
  code: string
  preview: string
  tags: string[]
}

export const templates: Template[] = [
  {
    id: 'landing-saas',
    name: 'SaaS Landing Page',
    description: 'Modern landing page with hero, features, pricing, and CTA sections',
    type: 'landing',
    category: 'Marketing',
    icon: '🚀',
    tags: ['landing', 'saas', 'marketing', 'conversion'],
    preview: '/templates/saas-landing.png',
    code: `export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Build Amazing Things
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            The fastest way to ship your product. Start building today.
          </p>
          <div className="flex gap-4 justify-center">
            <button className="bg-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-purple-700">
              Get Started Free
            </button>
            <button className="bg-white text-purple-600 px-8 py-4 rounded-xl text-lg font-semibold border-2 border-purple-600 hover:bg-purple-50">
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">
          Everything You Need
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: '⚡', title: 'Lightning Fast', desc: 'Optimized performance' },
            { icon: '🔒', title: 'Secure', desc: 'Enterprise-grade security' },
            { icon: '📱', title: 'Responsive', desc: 'Works on all devices' },
          ].map((feature, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-16 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 text-purple-100">
            Join thousands of happy customers today
          </p>
          <button className="bg-white text-purple-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-100">
            Start Free Trial
          </button>
        </div>
      </section>
    </div>
  )
}`
  },

  {
    id: 'dashboard-admin',
    name: 'Admin Dashboard',
    description: 'Complete admin dashboard with sidebar, stats, tables, and charts',
    type: 'dashboard',
    category: 'Admin',
    icon: '📊',
    tags: ['dashboard', 'admin', 'analytics', 'data'],
    preview: '/templates/admin-dashboard.png',
    code: `'use client'

import { useState } from 'react'

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={\`\${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300\`}>
        <div className="p-6">
          <h1 className="text-2xl font-bold">Admin</h1>
        </div>
        <nav className="mt-6">
          {['Dashboard', 'Users', 'Analytics', 'Settings'].map((item, i) => (
            <a
              key={i}
              href="#"
              className="block px-6 py-3 hover:bg-gray-800 transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </header>

        {/* Stats Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[
              },
              {
                name: portfolioTemplate.name,
                displayName: portfolioTemplate.displayName,
                description: portfolioTemplate.description,
                category: portfolioTemplate.category,
                icon: portfolioTemplate.icon,
                template: portfolioTemplate.template,
              },
              {
                name: landingPageTemplate.name,
                displayName: landingPageTemplate.displayName,
                description: landingPageTemplate.description,
                category: landingPageTemplate.category,
                icon: landingPageTemplate.icon,
                template: landingPageTemplate.template,
              },
              { label: 'Orders', value: '1,234', change: '+23%' },
              { label: 'Conversion', value: '3.2%', change: '+0.5%' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-xl shadow p-6">
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-green-600 mt-2">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Recent Orders</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Order ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">#ORD-{1000 + i}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">Customer {i}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">$99.00</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}`
  },

  {
    id: 'portfolio-modern',
    name: 'Modern Portfolio',
    description: 'Sleek portfolio website with projects, skills, and contact sections',
    type: 'portfolio',
    category: 'Personal',
    icon: '💼',
    tags: ['portfolio', 'personal', 'resume', 'showcase'],
    preview: '/templates/portfolio.png',
    code: `export default function Portfolio() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="container mx-auto px-6 py-20">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Hi, I'm John Doe
            </h1>
            <p className="text-2xl text-gray-600 mb-6">
              Full Stack Developer & Designer
            </p>
            <p className="text-lg text-gray-600 mb-8">
              I build beautiful web applications with modern technologies.
              Passionate about creating amazing user experiences.
            </p>
            <div className="flex gap-4">
              <button className="bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800">
                View My Work
              </button>
              <button className="border-2 border-gray-900 text-gray-900 px-6 py-3 rounded-xl font-semibold hover:bg-gray-900 hover:text-white">
                Contact Me
              </button>
            </div>
          </div>
          <div className="flex-1">
            <div className="w-full h-96 bg-gradient-to-br from-purple-400 to-blue-500 rounded-3xl"></div>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">Featured Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow">
              <div className="h-48 bg-gradient-to-br from-purple-400 to-blue-500"></div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Project {i}</h3>
                <p className="text-gray-600 mb-4">
                  A beautiful web application built with modern technologies.
                </p>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
                    React
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                    Next.js
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-white rounded-3xl shadow-xl p-12 max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-8">Get In Touch</h2>
          <p className="text-center text-gray-600 mb-8">
            Have a project in mind? Let's work together!
          </p>
          <form className="space-y-4">
            <input
              type="text"
              placeholder="Your Name"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
            />
            <input
              type="email"
              placeholder="Your Email"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
            />
            <textarea
              placeholder="Your Message"
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
            ></textarea>
            <button className="w-full bg-gray-900 text-white py-4 rounded-xl font-semibold hover:bg-gray-800">
              Send Message
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}`
  },

  {
    id: 'ecommerce-product',
    name: 'E-commerce Product Page',
    description: 'Product page with gallery, details, and add to cart functionality',
    type: 'webapp',
    category: 'E-commerce',
    icon: '🛍️',
    tags: ['ecommerce', 'shop', 'product', 'retail'],
    preview: '/templates/ecommerce.png',
    code: `'use client'

import { useState } from 'react'

export default function ProductPage() {
  const [selectedSize, setSelectedSize] = useState('M')
  const [quantity, setQuantity] = useState(1)

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-6">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square bg-gradient-to-br from-purple-400 to-blue-500 rounded-2xl"></div>
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-square bg-gradient-to-br from-purple-300 to-blue-400 rounded-xl cursor-pointer hover:scale-105 transition-transform"></div>
                ))}
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Premium Product Name
                </h1>
                <p className="text-3xl font-bold text-purple-600">$99.99</p>
              </div>

              <p className="text-gray-600 text-lg">
                High-quality product with amazing features. Perfect for your needs.
                Made with premium materials and attention to detail.
              </p>

              {/* Size Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Size
                </label>
                <div className="flex gap-2">
                  {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={\`px-6 py-2 rounded-xl font-semibold transition-all \${
                        selectedSize === size
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }\`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 bg-gray-100 rounded-xl font-bold text-xl hover:bg-gray-200"
                  >
                    -
                  </button>
                  <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-12 bg-gray-100 rounded-xl font-bold text-xl hover:bg-gray-200"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart */}
              <button className="w-full bg-gray-900 text-white py-4 rounded-xl text-lg font-semibold hover:bg-gray-800">
                Add to Cart
              </button>

              {/* Features */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Features:</h3>
                <ul className="space-y-2">
                  {['Premium Quality', 'Fast Shipping', 'Easy Returns', '1 Year Warranty'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <span className="text-green-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}`
  },

  {
    id: 'blog-minimal',
    name: 'Minimal Blog',
    description: 'Clean blog layout with post list and article view',
    type: 'webapp',
    category: 'Content',
    icon: '📝',
    tags: ['blog', 'content', 'writing', 'articles'],
    preview: '/templates/blog.png',
    code: `export default function BlogPage() {
  const posts = [
    { title: 'Getting Started with Next.js', excerpt: 'Learn how to build modern web applications...', date: '2024-01-15' },
    { title: 'The Future of Web Development', excerpt: 'Exploring upcoming trends and technologies...', date: '2024-01-10' },
    { title: 'Building Scalable Applications', excerpt: 'Best practices for enterprise development...', date: '2024-01-05' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Blog</h1>
          <p className="text-gray-600">Thoughts on tech, design, and life</p>
        </div>
      </header>

      {/* Posts */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-12">
          {posts.map((post, i) => (
            <article key={i} className="border-b pb-12">
              <div className="text-sm text-gray-500 mb-2">{post.date}</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3 hover:text-purple-600 cursor-pointer">
                {post.title}
              </h2>
              <p className="text-gray-600 text-lg mb-4">{post.excerpt}</p>
              <a href="#" className="text-purple-600 font-semibold hover:text-purple-700">
                Read more →
              </a>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}`
  },

  {
    id: 'auth-forms',
    name: 'Authentication Forms',
    description: 'Sign in and sign up forms with validation',
    type: 'webapp',
    category: 'Authentication',
    icon: '🔐',
    tags: ['auth', 'login', 'signup', 'forms'],
    preview: '/templates/auth.png',
    code: `'use client'

import { useState } from 'react'

export default function AuthForms() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        {/* Toggle */}
        <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setIsLogin(true)}
            className={\`flex-1 py-2 rounded-lg font-semibold transition-all \${
              isLogin ? 'bg-white shadow-sm' : 'text-gray-600'
            }\`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={\`flex-1 py-2 rounded-lg font-semibold transition-all \${
              !isLogin ? 'bg-white shadow-sm' : 'text-gray-600'
            }\`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {isLogin && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-purple-600 font-semibold hover:text-purple-700">
                Forgot password?
              </a>
            </div>
          )}

          <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Social Login */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 font-semibold">
              <span>G</span> Google
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 font-semibold">
              <span>f</span> Facebook
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}`
  },

  {
    id: 'supabase-app',
    name: 'Full-Stack App with Database',
    description: 'Complete app with Supabase database, auth, and real-time features',
    type: 'webapp',
    category: 'saas',
    icon: '🗄️',
    tags: ['supabase', 'database', 'auth', 'realtime', 'fullstack', 'saas'],
    preview: '/templates/supabase-app.png',
    code: `
    <!-- Supabase-powered app template -->
    <!-- Includes: Database, Auth, Real-time -->
    `
  },
]

export function getTemplatesByCategory(category?: string) {
  if (!category || category === 'all') {
    return templates
  }
  return templates.filter(t => t.category.toLowerCase() === category.toLowerCase())
}

export function getTemplatesByType(type?: string) {
  if (!type || type === 'all') {
    return templates
  }
  return templates.filter(t => t.type === type)
}

export function searchTemplates(query: string) {
  const lowerQuery = query.toLowerCase()
  return templates.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.includes(lowerQuery))
  )
}

export function getTemplateById(id: string) {
  return templates.find(t => t.id === id)
}