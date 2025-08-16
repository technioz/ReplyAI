'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  planId: string;
  planName: string;
  planPrice: number;
  onSuccess: () => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

interface CheckoutFormProps extends PaymentFormProps {
  clientSecret: string;
}

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#F5F7FA',
      backgroundColor: '#161922',
      '::placeholder': {
        color: '#C0C6CF',
      },
      iconColor: '#6D5EF8',
    },
    invalid: {
      color: '#EF4444',
      iconColor: '#EF4444',
    },
  },
  hidePostalCode: false,
};

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  planId,
  planName,
  planPrice,
  clientSecret,
  onSuccess,
  onError,
  onCancel
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setPaymentError('Card element not found');
      setIsProcessing(false);
      return;
    }

    try {
      // Create payment method
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (paymentMethodError) {
        setPaymentError(paymentMethodError.message || 'Payment method creation failed');
        setIsProcessing(false);
        return;
      }

      // Create subscription via our API
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          planId,
          paymentMethodId: paymentMethod.id,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Subscription creation failed');
      }

      setPaymentSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setPaymentError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="max-w-md mx-auto p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-accent to-accent-cyan rounded-full mb-4">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-ink mb-2">Complete Your Subscription</h3>
          <p className="text-ink-mute">
            Subscribe to <span className="text-accent font-medium">{planName}</span> for{' '}
            <span className="text-ink font-medium">${planPrice}/month</span>
          </p>
        </div>

        <AnimatePresence>
          {paymentSuccess ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-ink mb-2">Payment Successful!</h4>
              <p className="text-ink-mute">Your subscription is now active.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink mb-2">
                  Card Information
                </label>
                <div className="relative">
                  <div className="bg-card border border-stroke rounded-lg p-4 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                    <CardElement options={cardElementOptions} />
                  </div>
                </div>
              </div>

              {paymentError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-danger text-sm mb-4 p-3 bg-danger/10 rounded-lg border border-danger/20"
                >
                  <AlertCircle className="h-4 w-4" />
                  {paymentError}
                </motion.div>
              )}

              <div className="flex items-center gap-2 text-xs text-ink-mute mb-6">
                <Lock className="h-3 w-3" />
                Your payment information is secure and encrypted
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onCancel}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!stripe || isProcessing}
                  loading={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? 'Processing...' : `Subscribe $${planPrice}/mo`}
                </Button>
              </div>
            </form>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const setupPayment = async () => {
      try {
        const response = await fetch('/api/subscription/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Payment setup failed');
        }

        setClientSecret(result.setupIntent.clientSecret);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Payment setup failed';
        setSetupError(errorMessage);
        props.onError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    setupPayment();
  }, [props]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (setupError || !clientSecret) {
    return (
      <Card className="max-w-md mx-auto p-6 text-center">
        <AlertCircle className="h-12 w-12 text-danger mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-ink mb-2">Setup Error</h3>
        <p className="text-ink-mute mb-4">{setupError || 'Failed to initialize payment'}</p>
        <Button onClick={props.onCancel} variant="secondary">
          Go Back
        </Button>
      </Card>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} clientSecret={clientSecret} />
    </Elements>
  );
};
