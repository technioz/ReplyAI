import Link from 'next/link';
import { ArrowRight, Sparkles, Zap, Clock } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden section-padding-lg">
      {/* Background with grain texture */}
      <div className="absolute inset-0 bg-bg grain-overlay" />
      
      {/* Gradient ring accent */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-96 h-96 gradient-ring" />
      
      {/* Floating elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-accent/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-bounce-gentle" />
      <div className="absolute top-40 right-20 w-72 h-72 bg-accent-cyan/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-bounce-gentle" style={{ animationDelay: '1s' }} />
      
      <div className="relative section-container">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-8 border border-accent/20 fade-scale">
            <Sparkles className="w-4 h-4 mr-2" />
            #1 AI Reply Generator for X (Twitter)
          </div>
          
          {/* Main Headline */}
          <h1 className="text-hero font-bold text-ink mb-6 leading-editorial text-balance fade-scale">
            Replies that read like you—<br />
            <span className="gradient-text">on your best day.</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-subhero text-ink-mute mb-8 max-w-3xl mx-auto leading-tight text-balance fade-scale">
            One-line responses that spark conversation, not cringe. 
            Join 2,000+ creators who've increased their engagement by 340% while saving 15+ hours per week.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 fade-scale">
            <Link href="/signup">
              <button className="btn-primary text-lg px-8 py-4 flex items-center space-x-2">
                <span>Try Quirkly Free</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="#demo">
              <button className="btn-secondary text-lg px-8 py-4 flex items-center space-x-2">
                <span>Watch 2-Min Demo</span>
                <Zap className="w-5 h-5" />
              </button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center space-x-8 text-sm text-ink-mute mb-16 fade-scale">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span>Free forever plan available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span>Setup in 60 seconds</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
        
        {/* Social Proof */}
        <div className="text-center mb-16 fade-scale">
          <p className="text-sm text-ink-mute mb-4">Trusted by creators, marketers, and businesses worldwide</p>
          <div className="flex items-center justify-center space-x-8 opacity-60">
            <div className="text-ink-mute font-medium">TechCrunch</div>
            <div className="text-ink-mute font-medium">Buffer</div>
            <div className="text-ink-mute font-medium">Hootsuite</div>
            <div className="text-ink-mute font-medium">Later</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 fade-scale">
          <div className="text-center">
            <div className="text-3xl font-bold text-accent mb-2">340%</div>
            <div className="text-ink-mute">Average engagement increase</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-accent mb-2 flex items-center justify-center">
              <Clock className="w-8 h-8 mr-2" />
              15+ hrs
            </div>
            <div className="text-ink-mute">Time saved per week</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-accent mb-2">2,000+</div>
            <div className="text-ink-mute">Active creators</div>
          </div>
        </div>
      </div>
    </section>
  );
}
