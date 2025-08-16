'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar,
  Clock,
  Target,
  Activity,
  Download,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import QuirklyDashboardConfig from '@/lib/config';

interface UsageStats {
  period: string;
  data: Array<{
    date?: string;
    month?: string;
    creditsUsed: number;
    repliesGenerated: number;
    daysActive?: number;
  }>;
  totals: {
    creditsUsed: number;
    repliesGenerated: number;
    accountAgeDays: number;
    averageCreditsPerDay: number;
  };
  current: {
    available: number;
    used: number;
    total: number;
    utilizationRate: number;
  };
}

interface UserStats {
  account: {
    createdAt: string;
    ageDays: number;
    lastLoginAt: string;
    status: string;
  };
  usage: {
    total: {
      replies: number;
      creditsUsed: number;
      averageRepliesPerDay: number;
    };
    thisMonth: {
      replies: number;
      creditsUsed: number;
      activeDays: number;
    };
    today: {
      replies: number;
      creditsUsed: number;
    };
  };
  credits: {
    available: number;
    used: number;
    total: number;
    lastResetAt: string;
    utilizationRate: number;
  };
  subscription: {
    hasActive: boolean;
    plan: string;
    status: string | null;
    currentPeriodEnd: string | null;
  };
}

export function DetailedAnalytics() {
  const { user } = useAuth();
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'month'>('day');
  const [limit, setLimit] = useState(30);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, period, limit]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) return;

      // Fetch usage statistics
      const statsResponse = await fetch(
        `${QuirklyDashboardConfig.getApiBaseUrl()}/credits/stats?period=${period}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setUsageStats(statsData.stats);
      }

      // Fetch detailed user statistics
      const userStatsResponse = await fetch(
        `${QuirklyDashboardConfig.getApiBaseUrl()}/user/stats`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (userStatsResponse.ok) {
        const userStatsData = await userStatsResponse.json();
        setUserStats(userStatsData.stats);
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) return;

      const response = await fetch(
        `${QuirklyDashboardConfig.getApiBaseUrl()}/credits/stats?period=month&limit=12`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quirkly-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Analytics data exported successfully');
      } else {
        toast.error('Failed to export data');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Error exporting data');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-surface rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-surface rounded-button"></div>
            ))}
          </div>
          <div className="h-96 bg-surface rounded-button"></div>
        </div>
      </div>
    );
  }

  const maxCredits = Math.max(...(usageStats?.data.map(d => d.creditsUsed) || [1]));
  const maxReplies = Math.max(...(usageStats?.data.map(d => d.repliesGenerated) || [1]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink mb-2">Detailed Analytics</h2>
          <p className="text-ink-mute">Comprehensive insights into your Quirkly usage and performance.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button variant="ghost" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-mute">Total Replies</p>
                <p className="text-2xl font-bold text-ink">{userStats.usage.total.replies.toLocaleString()}</p>
                <p className="text-xs text-ink-mute mt-1">
                  {userStats.usage.total.averageRepliesPerDay.toFixed(1)} per day avg
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-accent" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-mute">Credits Used</p>
                <p className="text-2xl font-bold text-ink">{userStats.usage.total.creditsUsed.toLocaleString()}</p>
                <p className="text-xs text-ink-mute mt-1">
                  {userStats.credits.utilizationRate}% utilization
                </p>
              </div>
              <Target className="h-8 w-8 text-warning" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-mute">This Month</p>
                <p className="text-2xl font-bold text-ink">{userStats.usage.thisMonth.replies}</p>
                <p className="text-xs text-ink-mute mt-1">
                  {userStats.usage.thisMonth.activeDays} active days
                </p>
              </div>
              <Calendar className="h-8 w-8 text-success" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-mute">Account Age</p>
                <p className="text-2xl font-bold text-ink">{userStats.account.ageDays}</p>
                <p className="text-xs text-ink-mute mt-1">days</p>
              </div>
              <Clock className="h-8 w-8 text-accent-cyan" />
            </div>
          </Card>
        </div>
      )}

      {/* Period Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-ink">Period:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'day' | 'month')}
              className="px-3 py-1 bg-surface border border-stroke rounded-button text-ink text-sm"
            >
              <option value="day">Daily</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-ink">Show:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="px-3 py-1 bg-surface border border-stroke rounded-button text-ink text-sm"
            >
              <option value={7}>Last 7 {period === 'day' ? 'days' : 'months'}</option>
              <option value={30}>Last 30 {period === 'day' ? 'days' : 'months'}</option>
              <option value={90}>Last 90 {period === 'day' ? 'days' : 'months'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Usage Charts */}
      {usageStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Credits Usage Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-ink">Credits Usage</h3>
              <div className="text-sm text-ink-mute">
                Total: {usageStats.totals.creditsUsed.toLocaleString()}
              </div>
            </div>
            
            <div className="space-y-2">
              {usageStats.data.map((item, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-20 text-xs text-ink-mute">
                    {period === 'day' 
                      ? new Date(item.date!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : item.month
                    }
                  </div>
                  <div className="flex-1 bg-surface rounded-full h-6 relative">
                    <div
                      className="bg-accent rounded-full h-full transition-all duration-300"
                      style={{ 
                        width: `${maxCredits > 0 ? (item.creditsUsed / maxCredits) * 100 : 0}%` 
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-ink">
                      {item.creditsUsed}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Replies Generated Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-ink">Replies Generated</h3>
              <div className="text-sm text-ink-mute">
                Total: {usageStats.totals.repliesGenerated.toLocaleString()}
              </div>
            </div>
            
            <div className="space-y-2">
              {usageStats.data.map((item, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-20 text-xs text-ink-mute">
                    {period === 'day' 
                      ? new Date(item.date!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : item.month
                    }
                  </div>
                  <div className="flex-1 bg-surface rounded-full h-6 relative">
                    <div
                      className="bg-success rounded-full h-full transition-all duration-300"
                      style={{ 
                        width: `${maxReplies > 0 ? (item.repliesGenerated / maxReplies) * 100 : 0}%` 
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-ink">
                      {item.repliesGenerated}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Account Summary */}
      {userStats && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-ink mb-4">Account Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface rounded-button p-4">
              <div className="flex items-center space-x-3">
                <Activity className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm font-medium text-ink-mute">Account Status</p>
                  <p className="text-lg font-bold text-ink capitalize">{userStats.account.status}</p>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-button p-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium text-ink-mute">Member Since</p>
                  <p className="text-lg font-bold text-ink">
                    {new Date(userStats.account.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-button p-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-medium text-ink-mute">Last Login</p>
                  <p className="text-lg font-bold text-ink">
                    {new Date(userStats.account.lastLoginAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-button p-4">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-accent-cyan" />
                <div>
                  <p className="text-sm font-medium text-ink-mute">Subscription</p>
                  <p className="text-lg font-bold text-ink capitalize">
                    {userStats.subscription.plan}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
