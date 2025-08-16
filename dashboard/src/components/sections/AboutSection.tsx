import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Users, Award, Globe, Heart, Target, Zap } from 'lucide-react';

const stats = [
  { number: '2,000+', label: 'Active Creators', icon: <Users className="h-6 w-6" /> },
  { number: '50M+', label: 'Replies Generated', icon: <Zap className="h-6 w-6" /> },
  { number: '99.2%', label: 'Customer Satisfaction', icon: <Heart className="h-6 w-6" /> },
  { number: '15+', label: 'Hours Saved/Week', icon: <Target className="h-6 w-6" /> },
];

const team = [
  {
    name: 'Sarah Chen',
    role: 'CEO & Co-Founder',
    bio: 'Former Product Manager at Twitter. Led AI initiatives that reached 300M+ users.',
    avatar: 'SC'
  },
  {
    name: 'Marcus Rodriguez',
    role: 'CTO & Co-Founder',
    bio: 'Ex-Google AI researcher. Built language models used by 100M+ people worldwide.',
    avatar: 'MR'
  },
  {
    name: 'Dr. Emily Watson',
    role: 'Head of AI Research',
    bio: 'PhD in Computational Linguistics from Stanford. 15+ years in NLP research.',
    avatar: 'EW'
  }
];

export function AboutSection() {
  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mission Statement */}
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Our Mission
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            We believe that meaningful social media engagement shouldn't require hours of your time. 
            <strong> Quirkly</strong> was born from the frustration of seeing brilliant creators 
            struggle to maintain consistent engagement due to time constraints.
          </p>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mt-6">
            Our goal is simple: <span className="text-primary-600 font-semibold">democratize high-quality social media engagement</span> 
            by making AI-powered replies accessible to everyone.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-600">
                {stat.icon}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Story Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              The Story Behind Quirkly
            </h3>
            <div className="space-y-4 text-gray-600">
              <p>
                In 2023, our founders were running successful creator agencies when they noticed a 
                recurring pattern: clients were spending 15-20 hours per week just responding to 
                social media comments and messages.
              </p>
              <p>
                Despite having amazing content and engaged audiences, they couldn't scale their 
                engagement without hiring full-time community managers. That's when the idea hit: 
                <span className="text-primary-600 font-semibold"> What if AI could handle the routine responses while maintaining the human touch?</span>
              </p>
              <p>
                After 18 months of development and testing with 500+ creators, Quirkly was born. 
                Today, we're helping creators save hundreds of hours while actually improving their 
                engagement rates.
              </p>
            </div>
          </div>
          
          <div className="relative">
            <Card className="p-8 bg-gradient-to-br from-primary-50 to-accent-50">
              <div className="text-center">
                <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Globe className="h-10 w-10 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-4">
                  Global Impact
                </h4>
                <p className="text-gray-600 mb-6">
                  We're proud to serve creators from over 45 countries, helping them build 
                  meaningful connections with their audiences in multiple languages.
                </p>
                <div className="flex justify-center space-x-4 text-sm text-gray-500">
                  <span>🇺🇸 English</span>
                  <span>🇪🇸 Spanish</span>
                  <span>🇫🇷 French</span>
                  <span>🇩🇪 German</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Team Section */}
        <div className="text-center mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Meet the Team
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We're a team of AI researchers, product designers, and social media experts 
            passionate about solving real problems for creators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {team.map((member, index) => (
            <Card key={index} className="text-center p-6 hover:shadow-medium transition-shadow">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600 font-bold text-lg">
                {member.avatar}
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">{member.name}</h4>
              <p className="text-primary-600 font-medium mb-3">{member.role}</p>
              <p className="text-gray-600 text-sm">{member.bio}</p>
            </Card>
          ))}
        </div>

        {/* Values Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-accent-600">
              <Heart className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Human-First AI</h4>
            <p className="text-gray-600 text-sm">
              We believe AI should enhance human creativity, not replace it. Every feature we build 
              is designed to amplify your unique voice.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-success-600">
              <Award className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Quality Over Quantity</h4>
            <p className="text-gray-600 text-sm">
              We'd rather help you send 100 meaningful replies than 1,000 generic ones. 
              Quality engagement drives real results.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-primary-600">
              <Users className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Community Driven</h4>
            <p className="text-gray-600 text-sm">
              Our product roadmap is shaped by user feedback. We're building Quirkly 
              with creators, for creators.
            </p>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary-500 to-primary-600 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Join the Quirkly Movement
            </h3>
            <p className="text-primary-100 mb-6">
              Be part of the future of social media engagement. Start your free trial today 
              and see why thousands of creators trust us with their community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-primary-600 hover:bg-gray-100">
                Start Free Trial
              </Button>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary-600">
                Learn More
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
