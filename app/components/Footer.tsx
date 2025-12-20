import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-950 border-t border-gray-800 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">BuildFlow</h3>
            <p className="text-gray-400 text-sm">
              AI-powered no-code platform for building production-ready web applications
            </p>
          </div>
          
          {/* Product Column */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/features" className="text-gray-400 hover:text-white text-sm transition">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-400 hover:text-white text-sm transition">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/builder" className="text-gray-400 hover:text-white text-sm transition">
                  Builder
                </Link>
              </li>
              <li>
                <Link href="/templates" className="text-gray-400 hover:text-white text-sm transition">
                  Templates
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Company Column */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white text-sm transition">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white text-sm transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Legal Column */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            © {currentYear} BuildFlow. All rights reserved.
          </p>
          
          <div className="flex items-center gap-6">
            <a 
              href="https://twitter.com/buildflow" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition"
            >
              Twitter
            </a>
            <a 
              href="https://github.com/buildflow" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition"
            >
              GitHub
            </a>
            <a 
              href="mailto:hello@buildflow.com"
              className="text-gray-400 hover:text-white transition"
            >
              Email
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}