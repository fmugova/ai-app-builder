// Portfolio Website Template
export const portfolioTemplate = {
  name: "Portfolio Website",
  displayName: "Modern Portfolio",
  description: "A beautiful, modern portfolio website for developers and designers. Built with Tailwind CSS.",
  category: "portfolio",
  icon: "👨‍💻",
  template: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self'; font-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self';">
            <title>Portfolio</title>

        </head>
        <body class="bg-gray-900 text-white">
            <div id="root">
                <header class="py-20 px-4">
                    <div class="max-w-4xl mx-auto text-center">
                        <div class="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-6"></div>
                        <h1 class="text-5xl font-bold mb-4">John Doe</h1>
                        <p class="text-xl text-gray-400 mb-8">Full Stack Developer & Designer</p>
                        <div class="flex gap-4 justify-center">
                            <button class="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition" data-action="view-work">View Work</button>
                            <button class="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition" data-action="contact-me">Contact Me</button>
                        </div>
                    </div>
                </header>
                <section class="py-20 px-4">
                    <div class="max-w-7xl mx-auto text-center">
                        <h1 class="text-5xl md:text-6xl font-bold text-gray-900 mb-6">Build Something <span class="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Amazing</span></h1>
                        <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">Transform your ideas into reality with our powerful platform. Start building today.</p>
                        <div class="flex flex-col sm:flex-row gap-4 justify-center">
                            <button class="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium text-lg">Start Free Trial</button>
                            <button class="px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 rounded-lg transition font-medium text-lg">Watch Demo</button>
                        </div>
                    </div>
                </section>
                <section id="features" class="py-20 px-4 bg-white">
                    <div class="max-w-7xl mx-auto">
                        <h2 class="text-4xl font-bold text-center text-gray-900 mb-12">Powerful Features</h2>
                        <div class="grid md:grid-cols-3 gap-8">
                            <div class="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition">
                                <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4"><span class="text-2xl">⚡</span></div>
                                <h3 class="text-xl font-bold text-gray-900 mb-2">Lightning Fast</h3>
                                <p class="text-gray-600">Optimized for speed and performance from the ground up.</p>
                            </div>
                            <div class="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition">
                                <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4"><span class="text-2xl">🔒</span></div>
                                <h3 class="text-xl font-bold text-gray-900 mb-2">Secure by Default</h3>
                                <p class="text-gray-600">Enterprise-grade security built into every feature.</p>
                            </div>
                            <div class="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition">
                                <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4"><span class="text-2xl">📊</span></div>
                                <h3 class="text-xl font-bold text-gray-900 mb-2">Analytics Included</h3>
                                <p class="text-gray-600">Track everything with powerful built-in analytics.</p>
                            </div>
                        </div>
                    </div>
                </section>
                <section id="pricing" class="py-20 px-4">
                    <div class="max-w-7xl mx-auto">
                        <h2 class="text-4xl font-bold text-center text-gray-900 mb-12">Simple Pricing</h2>
                        <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            <div class="p-8 rounded-xl border-2 border-gray-200 bg-white">
                                <h3 class="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                                <p class="text-gray-600 mb-6">Perfect for trying out</p>
                                <div class="mb-6"><span class="text-4xl font-bold text-gray-900">$0</span><span class="text-gray-600">/month</span></div>
                                <button class="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition font-medium">Get Started</button>
                            </div>
                            <div class="p-8 rounded-xl border-2 border-purple-600 bg-purple-50 relative">
                                <div class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-600 text-white rounded-full text-sm font-medium">Popular</div>
                                <h3 class="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
                                <p class="text-gray-600 mb-6">For professionals</p>
                                <div class="mb-6"><span class="text-4xl font-bold text-gray-900">$29</span><span class="text-gray-600">/month</span></div>
                                <button class="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium">Get Started</button>
                            </div>
                            <div class="p-8 rounded-xl border-2 border-gray-200 bg-white">
                                <h3 class="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
                                <p class="text-gray-600 mb-6">For large teams</p>
                                <div class="mb-6"><span class="text-4xl font-bold text-gray-900">$99</span><span class="text-gray-600">/month</span></div>
                                <button class="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition font-medium">Contact Sales</button>
                            </div>
                        </div>
                    </div>
                </section>
                <section id="contact" class="py-20 px-4 bg-white">
                    <div class="max-w-3xl mx-auto">
                        <h2 class="text-4xl font-bold text-center text-gray-900 mb-12">Get in Touch</h2>
                        <form class="space-y-6">
                            <div class="grid md:grid-cols-2 gap-6">
                                <input type="text" placeholder="Your Name" class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none" />
                                <input type="email" placeholder="Your Email" class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none" />
                            </div>
                            <textarea placeholder="Your Message" rows="5" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"></textarea>
                            <button type="submit" class="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium text-lg">Send Message</button>
                        </form>
                    </div>
                </section>
                <footer class="bg-gray-900 text-white py-12 px-4">
                    <div class="max-w-7xl mx-auto text-center">
                        <p class="text-gray-400">© 2026 YourBrand. All rights reserved.</p>
                    </div>
                </footer>
            </div>
            <!-- Toast notification container -->
            <div id="toastContainer" class="toast-container"></div>
            <script src="script.js" type="module"></script>
        </body>
        </html>`
};

// Landing Page Template
export const landingPageTemplate = {
  name: "Landing Page",
  displayName: "Modern Landing Page",
  description: "A modern, responsive landing page template with pricing and contact form. Built with Tailwind CSS.",
  category: "landing",
  icon: "🚀",
  template: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self'; font-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self';">
            <title>Modern Landing Page</title>

        </head>
        <body class="bg-gray-50">
            <div id="root">
                <nav class="bg-white shadow-sm sticky top-0 z-50">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex justify-between items-center h-16">
                            <div class="flex items-center gap-2">
                                <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg"></div>
                                <span class="text-xl font-bold text-gray-900">YourBrand</span>
                            </div>
                            <div class="hidden md:flex items-center gap-8">
                                <a href="#features" class="text-gray-600 hover:text-gray-900 transition">Features</a>
                                <a href="#pricing" class="text-gray-600 hover:text-gray-900 transition">Pricing</a>
                                <a href="#contact" class="text-gray-600 hover:text-gray-900 transition">Contact</a>
                                <button class="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium" data-action="get-started">Get Started</button>
                            </div>
                        </div>
                    </div>
                </nav>
                ...existing code...
            </div>
            <!-- Toast notification container -->
            <div id="toastContainer" class="toast-container"></div>
            <script src="script.js" type="module"></script>
        </body>
        </html>`
};
