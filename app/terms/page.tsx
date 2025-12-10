export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: December 10, 2025
          </p>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using BuildFlow AI app builder service, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Use License</h2>
            <p>
              Permission is granted to use this service for personal and commercial purposes in accordance with your subscription plan. You retain full ownership of the code generated through our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. User Responsibilities</h2>
            <p>
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Maintaining the confidentiality of your account</li>
              <li>All activities that occur under your account</li>
              <li>Ensuring your use complies with applicable laws</li>
              <li>Not using the service for any illegal or unauthorized purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Disclaimer</h2>
            <p>
              The materials and AI-generated content on this service are provided on an &apos;as is&apos; basis. We make no warranties, expressed or implied, regarding the accuracy, reliability, or suitability of any generated content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Limitations</h2>
            <p>
              In no event shall BuildFlow or its suppliers be liable for any damages arising out of the use or inability to use the materials or services provided.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Modifications</h2>
            <p>
              We may revise these terms of service at any time without prior notice. By continuing to use this service after changes are made, you agree to be bound by the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Contact Us</h2>
            <p>
              For any questions regarding these Terms of Service, please contact us at:
            </p>
            <ul className="list-none pl-0 mt-4 space-y-2">
              <li>
                <strong>General Enquiries:</strong>{' '}
                <a href="mailto:enquiries@buildflow-ai.app" className="text-purple-600 hover:underline">
                  enquiries@buildflow-ai.app
                </a>
              </li>
              <li>
                <strong>Support:</strong>{' '}
                <a href="mailto:support@buildflow-ai.app" className="text-purple-600 hover:underline">
                  support@buildflow-ai.app
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}