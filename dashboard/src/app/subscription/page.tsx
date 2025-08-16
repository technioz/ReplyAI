'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  CreditCard, 
  Check, 
  ArrowLeft,
  Crown,
  Zap,
  Shield,
  Download,
  Calendar,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import QuirklyDashboardConfig from '@/lib/config';

interface SubscriptionPlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  stripePriceId: string;
  features: string[];
}

interface CurrentSubscription {
  id: string;
  status: string;
  plan: string;
  planName: string;
  creditsIncluded: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

interface BillingInvoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  description: string;
  downloadUrl: string;
  pdfUrl: string;
}

export default function SubscriptionPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingInvoice[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchPlans();
      fetchCurrentSubscription();
      fetchBillingHistory();
    }
  }, [user, loading, router]);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/subscription/plans`);
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      } else {
        toast.error('Failed to fetch subscription plans');
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Error fetching subscription plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) return;

      const response = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/subscription/current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentSubscription(data.subscription);
      } else {
        console.error('Failed to fetch current subscription');
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const fetchBillingHistory = async () => {
    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) return;

      const response = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/subscription/billing`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBillingHistory(data.invoices || []);
      } else {
        console.error('Failed to fetch billing history');
      }
    } catch (error) {
      console.error('Error fetching billing history:', error);
    } finally {
      setLoadingBilling(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period.')) {
      return;
    }

    setProcessingAction(true);
    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) return;

      const response = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Subscription canceled. You will still have access until the end of your billing period.');
        await fetchCurrentSubscription();
        await refreshUser();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Error canceling subscription');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setProcessingAction(true);
    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) return;

      const response = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/subscription/reactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Subscription reactivated successfully!');
        await fetchCurrentSubscription();
        await refreshUser();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to reactivate subscription');
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      toast.error('Error reactivating subscription');
    } finally {
      setProcessingAction(false);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'basic':
        return <Zap className="h-6 w-6" />;
      case 'pro':
        return <Crown className="h-6 w-6" />;
      case 'enterprise':
        return <Shield className="h-6 w-6" />;
      default:
        return <CreditCard className="h-6 w-6" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'basic':
        return 'text-accent';
      case 'pro':
        return 'text-warning';
      case 'enterprise':
        return 'text-success';
      default:
        return 'text-ink-mute';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-ink-mute">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-surface border-b border-stroke">
        <div className="section-container">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/dashboard')}
                className="btn-ghost"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </button>
              <span className="text-xl font-bold text-ink">Subscription Management</span>
            </div>
          </div>
        </div>
      </header>

      <main className="section-container section-padding">
        {/* Current Subscription Status */}
        {!loadingSubscription && (
          <div className="mb-8">
            {currentSubscription ? (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getPlanColor(currentSubscription.plan)} bg-current/10`}>
                      {getPlanIcon(currentSubscription.plan)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-ink">{currentSubscription.planName}</h2>
                      <p className="text-ink-mute">
                        {currentSubscription.creditsIncluded.toLocaleString()} credits per month
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      currentSubscription.status === 'active' 
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {currentSubscription.status === 'active' ? 'Active' : currentSubscription.status}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-surface rounded-button p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="h-4 w-4 text-ink-mute" />
                      <span className="text-sm font-medium text-ink-mute">Current Period</span>
                    </div>
                    <p className="text-ink">
                      {new Date(currentSubscription.currentPeriodStart).toLocaleDateString()} - {' '}
                      {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="bg-surface rounded-button p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CreditCard className="h-4 w-4 text-ink-mute" />
                      <span className="text-sm font-medium text-ink-mute">Credits Available</span>
                    </div>
                    <p className="text-ink">{user.credits?.available || 0} / {user.credits?.total || 0}</p>
                  </div>
                </div>

                {currentSubscription.cancelAtPeriodEnd && (
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                      <div>
                        <p className="font-medium text-warning mb-1">Subscription Canceled</p>
                        <p className="text-sm text-warning/80">
                          Your subscription will end on {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}.
                          You can reactivate it anytime before then.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  {currentSubscription.cancelAtPeriodEnd ? (
                    <Button 
                      onClick={handleReactivateSubscription}
                      disabled={processingAction}
                    >
                      {processingAction ? 'Processing...' : 'Reactivate Subscription'}
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost"
                      onClick={handleCancelSubscription}
                      disabled={processingAction}
                      className="text-danger hover:bg-danger/10"
                    >
                      {processingAction ? 'Processing...' : 'Cancel Subscription'}
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="p-6 text-center">
                <CreditCard className="h-12 w-12 text-ink-mute mx-auto mb-4" />
                <h2 className="text-xl font-bold text-ink mb-2">No Active Subscription</h2>
                <p className="text-ink-mute mb-4">
                  You're currently on the free plan with {user.credits?.total || 50} credits.
                </p>
                <p className="text-ink-mute">Choose a plan below to get more credits and unlock premium features.</p>
              </Card>
            )}
          </div>
        )}

        {/* Available Plans */}
        {!loadingPlans && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-ink mb-6">Available Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card key={plan.id} className={`p-6 relative ${
                  plan.id === 'pro' ? 'ring-2 ring-accent' : ''
                }`}>
                  {plan.id === 'pro' && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-accent text-white px-3 py-1 rounded-full text-xs font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className={`w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-4 ${getPlanColor(plan.id)} bg-current/10`}>
                      {getPlanIcon(plan.id)}
                    </div>
                    <h3 className="text-xl font-bold text-ink mb-2">{plan.name}</h3>
                    <div className="text-3xl font-bold text-ink mb-1">
                      ${plan.price}
                      <span className="text-base font-normal text-ink-mute">/month</span>
                    </div>
                    <p className="text-ink-mute">{plan.credits.toLocaleString()} credits per month</p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <Check className="h-4 w-4 text-success flex-shrink-0" />
                        <span className="text-ink">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full"
                    variant={currentSubscription?.plan === plan.id ? "ghost" : "primary"}
                    disabled={currentSubscription?.plan === plan.id}
                  >
                    {currentSubscription?.plan === plan.id ? 'Current Plan' : `Choose ${plan.name}`}
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Billing History */}
        {!loadingBilling && billingHistory.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-ink mb-6">Billing History</h2>
            <Card className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stroke">
                      <th className="text-left py-3 px-4 font-medium text-ink-mute">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-ink-mute">Description</th>
                      <th className="text-left py-3 px-4 font-medium text-ink-mute">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-ink-mute">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-ink-mute">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-stroke hover:bg-surface/50">
                        <td className="py-3 px-4">
                          <span className="text-ink">
                            {new Date(invoice.date).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-ink">{invoice.description}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-ink font-medium">
                            ${invoice.amount.toFixed(2)} {invoice.currency}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.status === 'paid' 
                              ? 'bg-success/10 text-success'
                              : 'bg-warning/10 text-warning'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            {invoice.downloadUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(invoice.downloadUrl, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            )}
                            {invoice.pdfUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(invoice.pdfUrl, '_blank')}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                PDF
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}