/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'from-blue-500', 'to-blue-600',
    'from-purple-500', 'to-purple-600',
    'from-green-500', 'to-green-600',
    'from-orange-500', 'to-orange-600',
    'from-red-500', 'to-red-600',
    'bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-red-600',
    'bg-orange-600',
    'hover:bg-blue-700', 'hover:bg-purple-700',
    'text-blue-400', 'text-purple-400', 'text-green-400',
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}