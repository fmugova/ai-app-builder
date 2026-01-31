import Footer from '../components/Footer'

export default function AboutPage() {
  return (
    <>
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-5xl font-bold mb-8">About BuildFlow</h1>
          
          <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
            <p className="text-xl">
              BuildFlow is an AI-powered no-code platform that transforms ideas into 
              production-ready web applications.
            </p>
            
            <p>
              We believe that everyone should have the ability to build and deploy web applications, 
              regardless of their technical background. Our platform leverages the power of Claude AI 
              to generate clean, semantic code that follows modern best practices.
            </p>

            <h2 className="text-3xl font-bold text-white mt-12 mb-4">Our Mission</h2>
            <p>
              To democratize web development by making it accessible, fast, and enjoyable for 
              everyone from entrepreneurs to experienced developers.
            </p>

            <h2 className="text-3xl font-bold text-white mt-12 mb-4">Why BuildFlow?</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Generate production-ready code in seconds</li>
              <li>Built on Claude Sonnet 4 for superior code quality</li>
              <li>Export to GitHub or download as HTML</li>
              <li>Responsive, mobile-first designs</li>
              <li>Secure project storage</li>
            </ul>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
