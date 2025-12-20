import Footer from '../components/Footer'

export default function TermsPage() {
  return (
    <>
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 mb-6">
              Last updated: December 20, 2024
            </p>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-300">
                By accessing and using BuildFlow, you accept and agree to be bound by the terms 
                and provision of this agreement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
              <p className="text-gray-300">
                Permission is granted to temporarily use BuildFlow for personal, non-commercial 
                transitory viewing only.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
              <p className="text-gray-300">
                You are responsible for maintaining the confidentiality of your account and password.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Termination</h2>
              <p className="text-gray-300">
                We may terminate or suspend your account immediately, without prior notice or liability, 
                for any reason whatsoever.
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}