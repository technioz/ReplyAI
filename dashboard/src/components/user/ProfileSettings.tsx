'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  User, 
  Mail, 
  Lock, 
  Bell,
  Palette,
  Save,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import QuirklyDashboardConfig from '@/lib/config';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
}

interface PreferencesData {
  defaultTone: string;
  notifications: {
    email: boolean;
    marketing: boolean;
  };
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ProfileSettings() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  
  // Profile form state
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: ''
  });

  // Preferences form state
  const [preferencesData, setPreferencesData] = useState<PreferencesData>({
    defaultTone: 'professional',
    notifications: {
      email: true,
      marketing: false
    }
  });

  // Password form state
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Account deletion state
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email
      });
      
      setPreferencesData({
        defaultTone: user.preferences?.defaultTone || 'professional',
        notifications: {
          email: user.preferences?.notifications?.email ?? true,
          marketing: user.preferences?.notifications?.marketing ?? false
        }
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        toast.success('Profile updated successfully');
        await refreshUser();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/user/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferencesData)
      });

      if (response.ok) {
        toast.success('Preferences updated successfully');
        await refreshUser();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update preferences');
      }
    } catch (error) {
      console.error('Preferences update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/user/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        toast.success('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm account deletion');
      return;
    }

    if (!deletePassword.trim()) {
      toast.error('Password is required to delete your account');
      return;
    }

    if (!confirm('This action cannot be undone. Are you absolutely sure you want to delete your account?')) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/user/account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: deletePassword,
          confirmation: deleteConfirmation
        })
      });

      if (response.ok) {
        toast.success('Account deleted successfully');
        // Clear local storage and redirect
        localStorage.removeItem('quirkly_token');
        window.location.href = '/';
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Account deletion error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  const toneOptions = [
    { value: 'professional', label: 'Professional', description: 'Formal and business-appropriate' },
    { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
    { value: 'humorous', label: 'Humorous', description: 'Light-hearted and witty' },
    { value: 'empathetic', label: 'Empathetic', description: 'Understanding and supportive' },
    { value: 'analytical', label: 'Analytical', description: 'Thoughtful and data-driven' },
    { value: 'enthusiastic', label: 'Enthusiastic', description: 'Energetic and positive' }
  ];

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-ink mb-2">Account Settings</h2>
        <p className="text-ink-mute">Manage your profile, preferences, and security settings.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-stroke">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-ink-mute hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card className="p-6">
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-ink mb-4">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-ink mb-2">
                    First Name
                  </label>
                  <Input
                    id="firstName"
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter your first name"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-ink mb-2">
                    Last Name
                  </label>
                  <Input
                    id="lastName"
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter your last name"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
                  required
                />
                <p className="text-xs text-ink-mute mt-1">
                  Changing your email will require verification
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <Card className="p-6">
          <form onSubmit={handlePreferencesUpdate} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-ink mb-4">AI Preferences</h3>
              
              <div>
                <label htmlFor="defaultTone" className="block text-sm font-medium text-ink mb-2">
                  Default Reply Tone
                </label>
                <select
                  id="defaultTone"
                  value={preferencesData.defaultTone}
                  onChange={(e) => setPreferencesData(prev => ({ ...prev, defaultTone: e.target.value }))}
                  className="w-full p-3 bg-surface border border-stroke rounded-button focus:outline-none focus:ring-2 focus:ring-accent text-ink"
                >
                  {toneOptions.map((tone) => (
                    <option key={tone.value} value={tone.value}>
                      {tone.label} - {tone.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-ink mb-4">Notifications</h3>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={preferencesData.notifications.email}
                    onChange={(e) => setPreferencesData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, email: e.target.checked }
                    }))}
                    className="w-4 h-4 text-accent bg-surface border-stroke rounded focus:ring-accent focus:ring-2"
                  />
                  <div>
                    <div className="font-medium text-ink">Email Notifications</div>
                    <div className="text-sm text-ink-mute">Receive important updates and alerts</div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={preferencesData.notifications.marketing}
                    onChange={(e) => setPreferencesData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, marketing: e.target.checked }
                    }))}
                    className="w-4 h-4 text-accent bg-surface border-stroke rounded focus:ring-accent focus:ring-2"
                  />
                  <div>
                    <div className="font-medium text-ink">Marketing Communications</div>
                    <div className="text-sm text-ink-mute">Product updates, tips, and promotional content</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card className="p-6">
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-ink mb-4">Change Password</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-ink mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter your current password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ink-mute hover:text-ink"
                    >
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-ink mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter your new password"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ink-mute hover:text-ink"
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm your new password"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ink-mute hover:text-ink"
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-warning mb-1">Password Requirements</p>
                    <ul className="text-warning/80 space-y-1">
                      <li>• At least 8 characters long</li>
                      <li>• Include uppercase and lowercase letters</li>
                      <li>• Include at least one number</li>
                      <li>• Include at least one special character</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                <Lock className="h-4 w-4 mr-2" />
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Danger Zone Tab */}
      {activeTab === 'danger' && (
        <Card className="p-6 border-danger/20">
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-danger mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-danger mb-2">Danger Zone</h3>
                <p className="text-danger/80 text-sm">
                  Once you delete your account, there is no going back. Please be certain.
                  This action will:
                </p>
                <ul className="text-danger/80 text-sm mt-2 space-y-1">
                  <li>• Permanently delete your account and all associated data</li>
                  <li>• Cancel any active subscriptions</li>
                  <li>• Remove all API keys and access tokens</li>
                  <li>• Delete your usage history and statistics</li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleAccountDeletion} className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-ink mb-4">Delete Account</h4>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="deleteConfirmation" className="block text-sm font-medium text-ink mb-2">
                    Type <code className="bg-surface px-1 rounded">DELETE</code> to confirm
                  </label>
                  <Input
                    id="deleteConfirmation"
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Type DELETE here"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="deletePassword" className="block text-sm font-medium text-ink mb-2">
                    Enter your password to confirm
                  </label>
                  <div className="relative">
                    <Input
                      id="deletePassword"
                      type={showDeletePassword ? "text" : "password"}
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ink-mute hover:text-ink"
                    >
                      {showDeletePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={loading || deleteConfirmation !== 'DELETE' || !deletePassword.trim()}
                className="bg-danger hover:bg-danger/90 text-white"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {loading ? 'Deleting Account...' : 'Delete My Account'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
