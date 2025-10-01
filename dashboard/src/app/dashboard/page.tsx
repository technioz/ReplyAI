'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Bot, 
  Key, 
  BarChart3, 
  LogOut,
  Plus,
  Copy,
  Eye,
  EyeOff,
  CreditCard,
  Trash2,
  Edit3,
  Shield,
  Settings,
  Users,
  RefreshCw,
  User
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import QuirklyDashboardConfig from '@/lib/config';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ProfileSettings } from '@/components/user/ProfileSettings';
import { DetailedAnalytics } from '@/components/analytics/DetailedAnalytics';
import ProfilePage from '../profile/page';

interface ApiKey {
  id: string;
  key: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newlyGeneratedKeys, setNewlyGeneratedKeys] = useState<{[key: string]: string}>({});
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    console.log('🔍 Dashboard useEffect - loading:', loading, 'user:', !!user);
    if (!loading && !user) {
      console.log('🔍 No user, redirecting to login');
      router.push('/login');
    } else if (user) {
      console.log('🔍 User exists, calling fetchApiKeys');
      fetchApiKeys();
    }
  }, [user, loading, router]);

  const fetchApiKeys = async () => {
    try {
      console.log('🔍 fetchApiKeys called');
      const token = localStorage.getItem('quirkly_token');
      console.log('🔍 Token exists:', !!token);
      console.log('🔍 Token length:', token ? token.length : 0);
      if (!token) {
        console.log('❌ No token found, returning');
        return;
      }

      const apiUrl = `${QuirklyDashboardConfig.getApiBaseUrl()}/api-keys`;
      console.log('🔍 API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 API Keys data:', data);
        setApiKeys(data.apiKeys || []);
        
        // Clean up newly generated keys that are no longer in the list
        if (data.apiKeys) {
          setNewlyGeneratedKeys(prev => {
            const newKeys: {[key: string]: string} = {};
            data.apiKeys.forEach((key: any) => {
              if (prev[key.id]) {
                newKeys[key.id] = prev[key.id];
              }
            });
            return newKeys;
          });
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch API keys:', errorData);
      }
    } catch (error) {
      console.error('❌ Error fetching API keys:', error);
    } finally {
      setLoadingApiKeys(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const copyApiKey = () => {
    if (user?.apiKey) {
      navigator.clipboard.writeText(user.apiKey);
      toast.success('API key copied to clipboard');
    } else {
      toast.error('No API key available');
    }
  };

  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  const maskApiKey = (apiKey: string) => {
    if (!apiKey) return '••••••••••••••••••••••••••••••••';
    return apiKey.slice(0, 8) + '•'.repeat(20) + apiKey.slice(-8);
  };

  const generateApiKey = async () => {
    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) return;

      const response = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/api-keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newKeyName.trim() || 'New API Key'
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store the newly generated key in state
        if (data.apiKey && data.apiKey.key) {
          setNewlyGeneratedKeys(prev => ({
            ...prev,
            [data.apiKey.id]: data.apiKey.key
          }));
        }
        
        toast.success('API key generated successfully');
        setNewKeyName('');
        setShowNewKeyForm(false);
        await fetchApiKeys(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to generate API key');
      }
    } catch (error) {
      toast.error('Error generating API key');
      console.error('Error generating API key:', error);
    }
  };

  const deleteApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to delete "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) return;

      const response = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('API key deleted successfully');
        await fetchApiKeys(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to delete API key');
      }
    } catch (error) {
      toast.error('Error deleting API key');
      console.error('Error deleting API key:', error);
    }
  };

  const regenerateApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to regenerate "${keyName}"? The old key will become invalid.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) return;

      // First delete the old key
      const deleteResponse = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/api-keys`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keyId })
      });

      if (deleteResponse.ok) {
        // Then generate a new one
        const generateResponse = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/api-keys`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: keyName })
        });

        if (generateResponse.ok) {
          const data = await generateResponse.json();
          
          // Store the newly generated key
          if (data.apiKey && data.apiKey.key) {
            setNewlyGeneratedKeys(prev => ({
              ...prev,
              [data.apiKey.id]: data.apiKey.key
            }));
          }
          
          toast.success('API key regenerated successfully');
          await fetchApiKeys(); // Refresh the list
        } else {
          const errorData = await generateResponse.json();
          toast.error(errorData.message || 'Failed to regenerate API key');
        }
      } else {
        toast.error('Failed to delete old API key');
      }
    } catch (error) {
      toast.error('Error regenerating API key');
      console.error('Error regenerating API key:', error);
    }
  };

  const copyApiKeyToClipboard = (apiKey: any) => {
    // Check if we have the key value (either from newly generated or if it exists)
    const keyValue = newlyGeneratedKeys[apiKey.id] || apiKey.key;
    
    if (keyValue) {
      navigator.clipboard.writeText(keyValue);
      toast.success('API key copied to clipboard');
    } else {
      toast.error('API key value not available. Please regenerate the key.');
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
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">Q</span>
              </div>
              <span className="text-xl font-bold text-ink">Quirkly Dashboard</span>
              {user?.role === 'admin' && (
                <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                  Admin
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                  <span className="text-accent font-medium text-sm">
                    {user.fullName?.charAt(0) || user.email.charAt(0)}
                  </span>
                </div>
                <span className="text-sm text-ink">{user.fullName || user.email}</span>
              </div>
              <button className="btn-ghost" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-surface border-b border-stroke">
        <div className="section-container">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveSection('overview')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSection === 'overview'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-mute hover:text-ink'
              }`}
            >
              <Bot className="h-4 w-4" />
              <span>Overview</span>
            </button>
            
            <button
              onClick={() => setActiveSection('profile')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSection === 'profile'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-mute hover:text-ink'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </button>

            <button
              onClick={() => setActiveSection('settings')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSection === 'settings'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-mute hover:text-ink'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => setActiveSection('analytics')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSection === 'analytics'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-mute hover:text-ink'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </button>

            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveSection('admin')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeSection === 'admin'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-ink-mute hover:text-ink'
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="section-container section-padding">
        {activeSection === 'overview' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-ink">Welcome back, {user.fullName || user.email}!</h1>
              <p className="text-ink-mute">Here's what's happening with your Quirkly account today.</p>
            </div>
          </>
        )}

        {activeSection === 'profile' && <ProfilePage />}

        {activeSection === 'settings' && <ProfileSettings />}
        
        {activeSection === 'analytics' && <DetailedAnalytics />}
        
        {activeSection === 'admin' && user?.role === 'admin' && <AdminDashboard />}

        {activeSection === 'overview' && (
          <>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="premium-card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mr-4">
                <Bot className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-mute">Credits Used</p>
                <p className="text-2xl font-bold text-ink">{user.credits?.used || 0}</p>
              </div>
            </div>
          </div>

          <div className="premium-card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-accent-cyan/20 rounded-lg flex items-center justify-center mr-4">
                <BarChart3 className="h-6 w-6 text-accent-cyan" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-mute">Credits Available</p>
                <p className="text-2xl font-bold text-ink">{user.credits?.available || 0}</p>
              </div>
            </div>
          </div>

          <div className="premium-card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-success/20 rounded-lg flex items-center justify-center mr-4">
                <CreditCard className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-mute">Plan</p>
                <p className="text-2xl font-bold text-ink capitalize">
                  {user.hasActiveSubscription ? 'Pro' : 'Free'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* API Keys Management Section */}
        <div className="premium-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink">API Keys</h2>
            <div className="flex items-center space-x-3">
              <button 
                className="btn-ghost text-sm"
                onClick={toggleApiKeyVisibility}
              >
                {showApiKey ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showApiKey ? 'Hide Keys' : 'Show Keys'}
              </button>
              <button 
                className="btn-secondary"
                onClick={() => setShowNewKeyForm(!showNewKeyForm)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate New Key
              </button>
            </div>
          </div>

          {/* New Key Form */}
          {showNewKeyForm && (
            <div className="bg-surface rounded-button p-4 mb-4">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  placeholder="Enter key name (optional)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-card border border-stroke rounded-lg text-ink placeholder-ink-mute focus:border-accent focus:outline-none"
                />
                <button
                  onClick={generateApiKey}
                  className="btn-primary"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewKeyForm(false);
                    setNewKeyName('');
                  }}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* API Keys List */}
          {loadingApiKeys ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-2"></div>
              <p className="text-ink-mute">Loading API keys...</p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 text-ink-mute mx-auto mb-3" />
              <p className="text-ink-mute">No API keys found</p>
              <p className="text-sm text-ink-mute mt-1">Generate your first API key to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="bg-surface rounded-button p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-sm font-medium text-ink">{apiKey.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          apiKey.isActive 
                            ? 'bg-success/20 text-success' 
                            : 'bg-ink-mute/20 text-ink-mute'
                        }`}>
                          {apiKey.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {newlyGeneratedKeys[apiKey.id] && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent">
                            New
                          </span>
                        )}
                      </div>
                      <code className="text-sm text-ink-mute font-mono block truncate">
                        {showApiKey ? (newlyGeneratedKeys[apiKey.id] || apiKey.key || 'Key not available') : maskApiKey(newlyGeneratedKeys[apiKey.id] || apiKey.key || '')}
                      </code>
                      {!newlyGeneratedKeys[apiKey.id] && !apiKey.key && (
                        <p className="text-xs text-warning mt-1">
                          ⚠️ Key value not available. Please regenerate to copy.
                        </p>
                      )}
                      <p className="text-xs text-ink-mute mt-1">
                        Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                        {apiKey.lastUsedAt && ` • Last used: ${new Date(apiKey.lastUsedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button 
                        className="btn-ghost text-sm"
                        onClick={() => copyApiKeyToClipboard(apiKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      {!newlyGeneratedKeys[apiKey.id] && !apiKey.key && (
                        <button 
                          className="btn-ghost text-sm text-accent hover:bg-accent/10"
                          onClick={() => regenerateApiKey(apiKey.id, apiKey.name)}
                          title="Regenerate API key to copy its value"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      <button 
                        className="btn-ghost text-sm text-danger hover:bg-danger/10"
                        onClick={() => deleteApiKey(apiKey.id, apiKey.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4 p-3 bg-accent/10 rounded-lg">
            <p className="text-sm text-accent">
              💡 Use these API keys in your Quirkly Chrome extension to authenticate requests. 
              Keep them secure and don't share them publicly.
            </p>
            <p className="text-xs text-accent mt-2">
              🔒 For security, API key values are only shown once when generated. 
              Use the regenerate button if you need to copy a key again.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="premium-card p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">Usage Analytics</h3>
            <div className="space-y-4">
              {/* Usage Chart */}
              <div className="bg-surface rounded-button p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-ink">Credits Usage (Last 7 Days)</span>
                  <span className="text-xs text-ink-mute">Daily</span>
                </div>
                
                {/* Simple Bar Chart */}
                <div className="flex items-end space-x-1 h-16">
                  {[0, 2, 1, 4, 3, 0, 1].map((usage, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-accent rounded-sm transition-all duration-300"
                        style={{ 
                          height: `${Math.max(4, (usage / 5) * 100)}%`,
                          opacity: usage === 0 ? 0.2 : 1
                        }}
                      ></div>
                      <span className="text-xs text-ink-mute mt-1">
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between text-xs text-ink-mute mt-2">
                  <span>0 credits</span>
                  <span>5 credits</span>
                </div>
              </div>
              
              {/* Usage Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface rounded-button p-3 text-center">
                  <div className="text-lg font-bold text-accent">{user.credits?.used || 0}</div>
                  <div className="text-xs text-ink-mute">This Week</div>
                </div>
                <div className="bg-surface rounded-button p-3 text-center">
                  <div className="text-lg font-bold text-success">{user.credits?.available || 0}</div>
                  <div className="text-xs text-ink-mute">Remaining</div>
                </div>
              </div>
              
              <button 
                className="btn-secondary w-full justify-start"
                onClick={() => setActiveSection('analytics')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Detailed Analytics
              </button>
            </div>
          </div>

          <div className="premium-card p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                className="btn-secondary w-full justify-start"
                onClick={() => setActiveSection('profile')}
              >
                <User className="h-4 w-4 mr-2" />
                Profile Management
              </button>
              <button 
                className="btn-secondary w-full justify-start"
                onClick={() => router.push('/subscription')}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Subscription
              </button>
              <button 
                className="btn-secondary w-full justify-start"
                onClick={() => setActiveSection('settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Account Settings
              </button>
              {user?.role === 'admin' && (
                <button 
                  className="btn-secondary w-full justify-start"
                  onClick={() => setActiveSection('admin')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Admin Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
          </>
        )}
      </main>
    </div>
  );
}
