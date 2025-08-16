export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="section-container section-padding">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
          
          <div className="space-y-6 text-ink-mute">
            <p className="text-lg">
              Last updated: January 2025
            </p>
            
            <section>
              <h2 className="text-xl font-semibold text-ink mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Quirkly, you accept and agree to be bound by the terms 
                and provision of this agreement.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-ink mb-4">2. Use License</h2>
              <p>
                Permission is granted to temporarily download one copy of Quirkly per device 
                for personal, non-commercial transitory viewing only.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-ink mb-4">3. Disclaimer</h2>
              <p>
                The materials on Quirkly are provided on an 'as is' basis. Quirkly makes no warranties, 
                expressed or implied, and hereby disclaims all other warranties.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-ink mb-4">4. Limitations</h2>
              <p>
                In no event shall Quirkly or its suppliers be liable for any damages arising 
                out of the use or inability to use Quirkly.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-ink mb-4">5. Contact Information</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us at{' '}
                <a href="mailto:legal@quirkly.app" className="text-accent hover:underline">
                  legal@quirkly.app
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

