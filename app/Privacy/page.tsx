import Footer from '../components/Footer'

export default function PrivacyPage() {
  return (
    <>
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 mb-6">
              Last updated: December 20, 2024
            </p>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
              <p className="text-gray-300">
                We collect information you provide directly to us, including name, email address, 
                and any other information you choose to provide.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-300">
                We use the information we collect to provide, maintain, and improve our services, 
                process your transactions, and send you technical notices and support messages.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Data Security</h2>
              <p className="text-gray-300">
                We take reasonable measures to help protect your personal information from loss, 
                theft, misuse, and unauthorized access.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Contact Us</h2>
              <p className="text-gray-300">
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:privacy@buildflow.com" className="text-purple-400 hover:text-purple-300">
                  privacy@buildflow.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}