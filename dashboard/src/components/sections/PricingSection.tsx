import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Check, Star, Zap, Crown } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    description: 'Perfect for individuals getting started with social media',
    features: [
      '100 AI replies per month',
      'Basic tone options (5 tones)',
      'Chrome extension access',
      'Basic analytics',
      'Email support',
      'Community forum access'
    ],
    cta: 'Get Started Free',
    popular: false,
    icon: <Zap className="h-6 w-6" />
  },
  {
    name: 'Creator',
    price: '$19',
    period: 'per month',
    description: 'Ideal for content creators and influencers',
    features: [
      '1,000 AI replies per month',
      'All tone options (9 tones)',
      'Custom tone training',
      'Advanced analytics & insights',
      'Priority email support',
      'API access',
      'Team collaboration (up to 3 users)',
      'Export & backup',
      'Mobile app access'
    ],
    cta: 'Start Free Trial',
    popular: true,
    icon: <Star className="h-6 w-6" />,
    savings: 'Save $60/year'
  },
  {
    name: 'Business',
    price: '$49',
    period: 'per month',
    description: 'For teams and businesses with high-volume needs',
    features: [
      'Unlimited AI replies',
      'Custom AI model training',
      'Advanced team management',
      'White-label options',
      'Dedicated account manager',
      'Phone & priority support',
      'Custom integrations',
      'Advanced security features',
      'SLA guarantees',
      'Training & onboarding'
    ],
    cta: 'Start Free Trial',
    popular: false,
    icon: <Crown className="h-6 w-6" />,
    savings: 'Save $120/year'
  }
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing that grows with you
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Start free, upgrade when you're ready. No hidden fees, no surprises. 
            Cancel or change plans anytime.
          </p>
          
          {/* Annual Savings Banner */}
          <div className="mt-8 inline-flex items-center px-6 py-3 bg-accent-50 rounded-full">
            <span className="text-accent-700 font-medium">
              💰 Save up to 20% with annual billing
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div key={index} className="relative">
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-primary-500 text-white">
                    Most Popular
                  </span>
                </div>
              )}
              
              <Card className={`h-full p-8 relative ${plan.popular ? 'ring-2 ring-primary-500 shadow-strong' : ''}`}>
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${plan.popular ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'}`}>
                      {plan.icon}
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    {plan.period !== 'forever' && (
                      <span className="text-gray-500 ml-1">/{plan.period}</span>
                    )}
                  </div>
                  
                  {plan.savings && (
                    <p className="text-sm text-accent-600 font-medium">{plan.savings}</p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="h-5 w-5 text-success-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="text-center">
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-primary-500 hover:bg-primary-600' : 'bg-gray-900 hover:bg-gray-800'}`}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                  
                  {plan.period !== 'forever' && (
                    <p className="text-xs text-gray-500 mt-2">
                      ✓ 14-day free trial • ✓ Cancel anytime
                    </p>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Enterprise Section */}
        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-gray-900 to-gray-800 text-white">
            <h3 className="text-2xl font-bold mb-4">Need something custom?</h3>
            <p className="text-gray-300 mb-6">
              We offer enterprise solutions with custom pricing, dedicated support, 
              and tailored features for large organizations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-gray-900">
                Contact Sales
              </Button>
              <Button variant="ghost" size="lg" className="text-white hover:bg-white hover:text-gray-900">
                Schedule Demo
              </Button>
            </div>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h4>
              <p className="text-gray-600">Yes! You can upgrade, downgrade, or cancel your plan at any time. Changes take effect immediately.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What happens after my free trial?</h4>
              <p className="text-gray-600">After 14 days, you'll be charged for your chosen plan. You can cancel anytime before the trial ends.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Do you offer refunds?</h4>
              <p className="text-gray-600">We offer a 30-day money-back guarantee. If you're not satisfied, we'll refund your payment.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Is there a setup fee?</h4>
              <p className="text-gray-600">No setup fees! All plans include instant access to our platform and Chrome extension.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
