'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Zap, Building } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

interface SubscriptionPlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  features: string[];
  stripePriceId: string;
  popular?: boolean;
  enterprise?: boolean;
}

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan?: boolean;
  isLoading?: boolean;
  onSubscribe: (planId: string) => void;
}

const planIcons = {
  basic: <Zap className="h-6 w-6" />,
  pro: <Crown className="h-6 w-6" />,
  enterprise: <Building className="h-6 w-6" />
};

const planColors = {
  basic: 'from-blue-500 to-cyan-500',
  pro: 'from-purple-500 to-pink-500',
  enterprise: 'from-amber-500 to-orange-500'
};

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  plan,
  isCurrentPlan = false,
  isLoading = false,
  onSubscribe
}) => {
  const handleSubscribe = () => {
    if (!isCurrentPlan && !isLoading) {
      onSubscribe(plan.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative ${plan.popular ? 'scale-105 z-10' : ''}`}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-gradient-to-r from-accent to-accent-cyan text-white text-sm font-medium px-4 py-1 rounded-full shadow-lg">
            Most Popular
          </div>
        </div>
      )}

      <Card className={`h-full p-6 ${plan.popular ? 'border-accent shadow-xl' : ''} ${isCurrentPlan ? 'ring-2 ring-success' : ''}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg bg-gradient-to-r ${planColors[plan.id as keyof typeof planColors]} text-white`}>
              {planIcons[plan.id as keyof typeof planIcons]}
            </div>
            <div>
              <h3 className="text-xl font-bold text-ink">{plan.name}</h3>
              {isCurrentPlan && (
                <span className="text-sm text-success font-medium">Current Plan</span>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-ink">${plan.price}</span>
              <span className="text-ink-mute">/month</span>
            </div>
            <p className="text-sm text-ink-mute mt-1">
              {plan.credits.toLocaleString()} AI replies included
            </p>
          </div>

          {/* Features */}
          <div className="flex-grow mb-6">
            <ul className="space-y-3">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-ink-mute text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleSubscribe}
            disabled={isCurrentPlan || isLoading}
            loading={isLoading}
            variant={plan.popular ? 'primary' : 'secondary'}
            className="w-full"
          >
            {isCurrentPlan ? 'Current Plan' : `Get ${plan.name}`}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};
