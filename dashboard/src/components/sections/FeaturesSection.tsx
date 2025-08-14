import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { 
  Bot, 
  Zap, 
  Shield, 
  BarChart3, 
  Smartphone, 
  Users,
  Clock,
  Target
} from 'lucide-react';

const features = [
  {
    icon: <Bot className="h-8 w-8 text-primary-500" />,
    title: 'AI-Powered Replies',
    description: 'Generate human-like responses that match your brand voice and tone preferences.',
    color: 'bg-primary-50',
  },
  {
    icon: <Zap className="h-8 w-8 text-accent-500" />,
    title: 'Lightning Fast',
    description: 'Get engaging replies in seconds, not hours. Save time while maintaining quality.',
    color: 'bg-accent-50',
  },
  {
    icon: <Shield className="h-8 w-8 text-success-500" />,
    title: 'Secure & Private',
    description: 'Your data stays private. We use enterprise-grade security and encryption.',
    color: 'bg-success-50',
  },
  {
    icon: <BarChart3 className="h-8 w-8 text-primary-500" />,
    title: 'Analytics & Insights',
    description: 'Track engagement metrics and optimize your social media strategy.',
    color: 'bg-primary-50',
  },
  {
    icon: <Smartphone className="h-8 w-8 text-accent-500" />,
    title: 'Seamless Integration',
    description: 'Works directly within X\'s interface. No switching between apps.',
    color: 'bg-accent-50',
  },
  {
    icon: <Users className="h-8 w-8 text-success-500" />,
    title: 'Team Collaboration',
    description: 'Share API keys with your team and manage permissions easily.',
    color: 'bg-success-50',
  },
  {
    icon: <Clock className="h-8 w-8 text-primary-500" />,
    title: '24/7 Availability',
    description: 'Generate replies anytime, anywhere. Never miss an engagement opportunity.',
    color: 'bg-primary-50',
  },
  {
    icon: <Target className="h-8 w-8 text-accent-500" />,
    title: 'Custom Tones',
    description: 'Train AI on your specific brand voice and communication style.',
    color: 'bg-accent-50',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to engage your audience
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              ReplyAI combines cutting-edge AI technology with intuitive design to help you 
              create meaningful connections on social media.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="h-full text-center hover:shadow-medium transition-all duration-300">
                <div className={`w-16 h-16 ${feature.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16"
        >
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary-500 to-primary-600 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Ready to transform your social media engagement?
            </h3>
            <p className="text-primary-100 mb-6">
              Join thousands of creators and businesses who are already using ReplyAI to 
              save time and boost engagement.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Get Started Free
              </button>
              <button className="border border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors">
                View Demo
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
