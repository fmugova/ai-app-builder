'use client';

import { useState } from 'react';
import { Menu, X, ArrowRight, Zap, Code, Rocket, Users } from 'lucide-react';
import Link from 'next/link';

export default function PreviewPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Generate production-ready websites in seconds with AI'
    },
    {
      icon: Code,
      title: 'Full Control',
      description: 'Edit, customize, and deploy your code with ease'
    },
    {
      icon: Rocket,
      title: 'One-Click Deploy',
      description: 'Deploy directly to Vercel or export to GitHub'
    },
    {
      icon: Users,
      title: 'Collaborate',
      description: 'Share and collaborate on projects with your team'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center font-bold">
                ⚡
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                BuildFlow AI
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="hover:text-purple-400 transition">
                Features
              </a>
              <a href="#showcase" className="hover:text-purple-400 transition">
                Showcase
              </a>
              <a href="#pricing" className="hover:text-purple-400 transition">
                Pricing
              </a>
              <a href="#contact" className="hover:text-purple-400 transition">
                Contact
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/login"
                className="px-4 py-2 text-gray-300 hover:text-white transition"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition font-medium"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-800 rounded-lg transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-800 space-y-3">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 hover:bg-gray-800 rounded-lg transition"
              >
                Features
              </a>
              <a
                href="#showcase"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 hover:bg-gray-800 rounded-lg transition"
              >
                Showcase
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 hover:bg-gray-800 rounded-lg transition"
              >
                Pricing
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 hover:bg-gray-800 rounded-lg transition"
              >
                Contact
              </a>
              <div className="pt-4 space-y-2 border-t border-gray-800">
                <Link
                  href="/login"
                  className="block px-4 py-2 text-center hover:bg-gray-800 rounded-lg transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="block px-4 py-2 text-center bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Create <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Professional Websites
            </span> with AI
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Generate, customize, and deploy production-ready websites in minutes. No coding required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition font-semibold flex items-center justify-center gap-2"
            >
              Start Building <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/builder"
              className="px-8 py-4 border border-gray-700 rounded-lg hover:bg-gray-800 transition font-semibold"
            >
              Try Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
            Powerful Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-6 bg-gray-900 border border-gray-700 rounded-lg hover:border-purple-500 transition"
                >
                  <Icon className="w-8 h-8 text-purple-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section id="showcase" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
            Featured Projects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden hover:border-purple-500 transition"
              >
                <div className="h-48 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                  <Code className="w-12 h-12 text-white opacity-50" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2">Project {item}</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Amazing website created with BuildFlow AI
                  </p>
                  <a href="#" className="text-purple-400 hover:text-purple-300 text-sm font-medium">
                    View Project →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
            Simple Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Free', price: '$0', features: ['10 generations', '3 projects', 'Basic support'] },
              { name: 'Pro', price: '$29', features: ['Unlimited generations', 'Unlimited projects', 'Priority support'], featured: true },
              { name: 'Enterprise', price: 'Custom', features: ['Everything in Pro', 'Custom domain', 'Dedicated support'] }
            ].map((plan, index) => (
              <div
                key={index}
                className={`p-8 border rounded-lg transition ${
                  plan.featured
                    ? 'bg-gradient-to-br from-purple-600 to-blue-600 border-purple-400 relative'
                    : 'bg-gray-900 border-gray-700 hover:border-purple-500'
                }`}
              >
                {plan.featured && (
                  <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                    Popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold mb-6">{plan.price}</div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-current rounded-full" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-2 rounded-lg font-medium transition ${
                  plan.featured
                    ? 'bg-white text-purple-600 hover:bg-gray-100'
                    : 'border border-gray-700 hover:bg-gray-800'
                }`}>
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Create?
          </h2>
          <p className="text-gray-400 mb-8">
            Join thousands of creators building amazing websites with AI
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition font-semibold"
          >
            Start Free Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-800 text-center text-gray-400">
        <p>© 2024 BuildFlow AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
