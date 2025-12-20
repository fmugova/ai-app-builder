import Footer from '../components/Footer'
import { Zap, Code, Smartphone, Download, Github, Lock } from 'lucide-react'

export default function FeaturesPage() {
  const features = [
    {
      icon: Zap,
      title: 'AI-Powered Generation',
      description: 'Generate production-ready code using Claude Sonnet 4'
    },
    {
      icon: Code,
      title: 'Clean Code Output',
      description: 'Get semantic HTML, modern CSS, and optimized JavaScript'
    },
    {
      icon: Smartphone,
      title: 'Responsive Design',
      description: 'All generated apps are mobile-first and responsive'
    },
    {
      icon: Download,
      title: 'Export Options',
      description: 'Download as HTML, push to GitHub, or deploy instantly'
    },
    {
      icon: Github,
      title: 'GitHub Integration',
      description: 'Seamlessly push your projects to GitHub repositories'
    },
    {
      icon: Lock,
      title: 'Secure & Private',
      description: 'Your projects are encrypted and privately stored'
    }
  ]

  return (
    <>
      <div className="min-h-screen bg-gray-950">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-purple-900/20 to-gray-950 py-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold text-white mb-6">
              Powerful Features for Modern Development
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Everything you need to build, deploy, and manage production-ready web applications
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-8 hover:border-purple-500 transition"
              >
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}