export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="section-container section-padding">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="space-y-6 text-ink-mute">
            <p className="text-lg">
              Last updated: January 2025
            </p>
            
            <section>
              <h2 className="text-xl font-semibold text-ink mb-4">1. Information We Collect</h2>
              <p>
                We collect information you provide directly to us, such as when you create an account, 
                use our services, or contact us for support.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-ink mb-4">2. How We Use Your Information</h2>
              <p>
                We use the information we collect to provide, maintain, and improve our services, 
                process transactions, and communicate with you.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-ink mb-4">3. Information Sharing</h2>
              <p>
                We do not sell, trade, or otherwise transfer your personal information to third parties 
                without your consent, except as described in this policy.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-ink mb-4">4. Data Security</h2>
              <p>
                We implement appropriate security measures to protect your personal information 
                against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-ink mb-4">5. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:privacy@quirkly.app" className="text-accent hover:underline">
                  privacy@quirkly.app
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

