import { Card } from '@/components/ui/Card';
import { 
  Bot, 
  Zap, 
  Shield, 
  BarChart3, 
  Smartphone, 
  Users,
  Clock,
  Target,
  Star,
  TrendingUp
} from 'lucide-react';

const features = [
  {
    icon: <Bot className="h-8 w-8 text-primary-500" />,
    title: 'AI-Powered Intelligence',
    description: 'Advanced GPT-4 technology that understands context, tone, and your brand voice to generate replies that sound genuinely human.',
    color: 'bg-primary-50',
    highlight: 'Most Popular',
    stats: '99.2% accuracy'
  },
  {
    icon: <Zap className="h-8 w-8 text-accent-500" />,
    title: 'Lightning Fast Generation',
    description: 'Get engaging replies in under 3 seconds. No more staring at blank screens wondering what to write.',
    color: 'bg-accent-50',
    highlight: 'Speed Champion',
    stats: '< 3 seconds'
  },
  {
    icon: <Shield className="h-8 w-8 text-success-500" />,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with end-to-end encryption. Your data and conversations stay completely private.',
    color: 'bg-success-50',
    highlight: 'Security First',
    stats: 'SOC 2 Certified'
  },
  {
    icon: <BarChart3 className="h-8 w-8 text-primary-500" />,
    title: 'Smart Analytics',
    description: 'Track engagement metrics, reply performance, and optimize your social media strategy with data-driven insights.',
    color: 'bg-primary-50',
    highlight: 'Data Driven',
    stats: 'Real-time insights'
  },
  {
    icon: <Smartphone className="h-8 w-8 text-accent-500" />,
    title: 'Seamless Integration',
    description: 'Works directly within X\'s interface. No switching between apps or copying/pasting. Just click and reply.',
    color: 'bg-accent-50',
    highlight: 'Zero Friction',
    stats: '1-click setup'
  },
  {
    icon: <Users className="h-8 w-8 text-success-500" />,
    title: 'Team Collaboration',
    description: 'Share API keys with your team, manage permissions, and maintain consistent brand voice across all team members.',
    color: 'bg-success-50',
    highlight: 'Team Ready',
    stats: 'Unlimited users'
  },
  {
    icon: <Clock className="h-8 w-8 text-primary-500" />,
    title: '24/7 Availability',
    description: 'Never miss an engagement opportunity. Generate replies anytime, anywhere, even when you\'re offline.',
    color: 'bg-primary-50',
    highlight: 'Always On',
    stats: '99.9% uptime'
  },
  {
    icon: <Target className="h-8 w-8 text-accent-500" />,
    title: 'Custom Tone Training',
    description: 'Train AI on your specific brand voice, communication style, and industry terminology for perfectly tailored replies.',
    color: 'bg-accent-50',
    highlight: 'Personalized',
    stats: 'Custom AI models'
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why 2,000+ creators choose Quirkly
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We've solved the biggest pain points that creators face: time-consuming replies, 
              inconsistent engagement, and the struggle to maintain an active social presence.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="group">
              <Card className="h-full text-center hover:shadow-strong transition-all duration-300 border-2 border-transparent hover:border-primary-200 relative overflow-hidden">
                {/* Highlight Badge */}
                {feature.highlight && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                      {feature.highlight}
                    </span>
                  </div>
                )}
                
                {/* Icon Container */}
                <div className={`w-20 h-20 ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                
                {/* Content */}
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {feature.description}
                </p>
                
                {/* Stats */}
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {feature.stats}
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <Card className="max-w-3xl mx-auto bg-gradient-to-r from-primary-500 to-primary-600 text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12"></div>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-3xl font-bold mb-4">
                Ready to 10x your social media engagement?
              </h3>
              <p className="text-primary-100 mb-6 text-lg">
                Join thousands of creators who've transformed their social media presence with Quirkly. 
                Start your free trial today and see results in your first week.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg">
                  Start Free Trial
                </button>
                <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors text-lg">
                  Schedule Demo
                </button>
              </div>
              <p className="text-primary-200 text-sm mt-4">
                ✓ No credit card required • ✓ 14-day free trial • ✓ Cancel anytime
              </p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
