export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: December 10, 2025
          </p>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us when using our AI app builder service, including:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Account information (name, email address)</li>
              <li>Project data and generated code</li>
              <li>Payment information (processed securely via Stripe)</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, and support messages</li>
              <li>Respond to your comments and questions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Data Security</h2>
            <p>
              We take reasonable measures to help protect your personal information from loss, theft, misuse, and unauthorized access. Your data is encrypted in transit and at rest.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed to provide you services. You can request deletion of your data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
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