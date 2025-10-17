'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import QuirklyDashboardConfig from '@/lib/config';
import { QuickPostGenerator } from '@/components/post/QuickPostGenerator';

interface ProfileData {
  xHandle: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  joinDate: string;
  followerCount: number;
  followingCount: number;
  verified: boolean;
  profileImageUrl: string;
  pinnedTweet: {
    content: string;
    createdAt: string;
  };
  expertise: {
    domains: string[];
    keywords: string[];
    topics: string[];
  };
  toneAnalysis: {
    primaryTone: string;
    secondaryTones: string[];
    vocabulary: string[];
    avgTweetLength: number;
  };
  privacy: {
    extractPublicData: boolean;
    includeTweets: boolean;
    includeEngagement: boolean;
  };
  extractedAt: string;
  lastUpdated: string;
  isActive: boolean;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      fetchProfileData();
    }
  }, [user, loading]);

  const fetchProfileData = async () => {
    try {
      setLoadingProfile(true);
      setError(null);
      
      const token = localStorage.getItem('quirkly_token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      if (!user?.id) {
        setError('User ID not available');
        return;
      }

      const response = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/profile/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 ProfilePage: API Response data:', data);
        if (data.success && data.hasProfileData) {
          console.log('🔍 ProfilePage: Profile data received:', data.profileData);
          console.log('🔍 ProfilePage: Follower count:', data.profileData?.followerCount);
          console.log('🔍 ProfilePage: Join date:', data.profileData?.joinDate);
          console.log('🔍 ProfilePage: All profile data keys:', Object.keys(data.profileData || {}));
          setProfileData(data.profileData);
        } else {
          console.log('🔍 ProfilePage: No profile data available');
          setProfileData(null);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch profile data');
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setError('Failed to fetch profile data');
    } finally {
      setLoadingProfile(false);
    }
  };

  const updatePrivacySettings = async (privacyUpdates: Partial<ProfileData['privacy']>) => {
    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);
      
      const token = localStorage.getItem('quirkly_token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/profile/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ privacy: privacyUpdates })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProfileData(prev => prev ? {
            ...prev,
            privacy: { ...prev.privacy, ...privacyUpdates },
            lastUpdated: data.profileData.lastUpdated
          } : null);
          setSuccess('Privacy settings updated successfully');
        } else {
          setError(data.message || 'Failed to update privacy settings');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update privacy settings');
      }
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      setError('Failed to update privacy settings');
    } finally {
      setUpdating(false);
    }
  };

  const deleteProfileData = async () => {
    if (!confirm('Are you sure you want to delete all your profile data? This action cannot be undone.')) {
      return;
    }

    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);
      
      const token = localStorage.getItem('quirkly_token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/profile/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProfileData(null);
          setSuccess('Profile data deleted successfully');
        } else {
          setError(data.message || 'Failed to delete profile data');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete profile data');
      }
    } catch (error) {
      console.error('Error deleting profile data:', error);
      setError('Failed to delete profile data');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not available';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Invalid date';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num: number) => {
    if (num === null || num === undefined || isNaN(num)) {
      return '0';
    }
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile Management</h1>
            <p className="text-muted-foreground">
              Manage your X profile data and privacy settings for AI-powered replies
            </p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Quick Post Generator - New Feature */}
          <div className="mb-8">
            <QuickPostGenerator />
          </div>

          {!profileData ? (
            /* No Profile Data */
            <div className="bg-card rounded-lg border p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No Profile Data Found</h3>
                <p className="text-muted-foreground mb-6">
                  Visit your X profile page with the Quirkly extension to automatically extract your profile data for personalized AI replies.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">To extract your profile data:</p>
                  <ol className="list-decimal list-inside space-y-1 text-left max-w-md mx-auto">
                    <li>Make sure you're authenticated with Quirkly</li>
                    <li>Visit your X profile page</li>
                    <li>Profile data will be automatically extracted</li>
                    <li>Return here to view and manage your data</li>
                  </ol>
                </div>
                
                <button
                  onClick={fetchProfileData}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Refresh Profile Data
                </button>
              </div>
            </div>
          ) : (
            /* Profile Data Available */
            <div className="space-y-6">
              {/* Profile Overview */}
              <div className="bg-card rounded-lg border p-6">
                <div className="flex items-start gap-4 mb-6">
                  {profileData.profileImageUrl && (
                    <img
                      src={profileData.profileImageUrl}
                      alt="Profile"
                      className="w-16 h-16 rounded-full border-2 border-border"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-2xl font-bold text-foreground">{profileData.displayName}</h2>
                      {profileData.verified && (
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-lg text-muted-foreground mb-2">{profileData.xHandle}</p>
                    {profileData.bio && (
                      <p className="text-foreground mb-3">{profileData.bio}</p>
                    )}
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Joined {formatDate(profileData.joinDate)}</span>
                      {profileData.location && <span>• {profileData.location}</span>}
                      {profileData.website && (
                        <span>• <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{profileData.website}</a></span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{formatNumber(profileData.followerCount)}</p>
                    <p className="text-sm text-muted-foreground">Followers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{formatNumber(profileData.followingCount)}</p>
                    <p className="text-sm text-muted-foreground">Following</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{profileData.toneAnalysis.avgTweetLength}</p>
                    <p className="text-sm text-muted-foreground">Avg Tweet Length</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{profileData.expertise.domains.length}</p>
                    <p className="text-sm text-muted-foreground">Expertise Areas</p>
                  </div>
                </div>
              </div>

              {/* Tone Analysis */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">Writing Style Analysis</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Primary Tone</h4>
                    <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                      {profileData.toneAnalysis.primaryTone}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Secondary Tones</h4>
                    <div className="flex flex-wrap gap-2">
                      {profileData.toneAnalysis.secondaryTones.map((tone, index) => (
                        <span key={index} className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm">
                          {tone}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expertise */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">Expertise Areas</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Domains</h4>
                    <div className="flex flex-wrap gap-2">
                      {profileData.expertise.domains.map((domain, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          {domain}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {profileData.expertise.keywords.slice(0, 10).map((keyword, index) => (
                        <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  {profileData.expertise.topics.length > 0 && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Topics</h4>
                      <div className="flex flex-wrap gap-2">
                        {profileData.expertise.topics.slice(0, 10).map((topic, index) => (
                          <span key={index} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                            #{topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">Privacy Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">Extract Public Data</h4>
                      <p className="text-sm text-muted-foreground">Allow extraction of publicly visible profile information</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profileData.privacy.extractPublicData}
                        onChange={(e) => updatePrivacySettings({ extractPublicData: e.target.checked })}
                        className="sr-only peer"
                        disabled={updating}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">Include Tweet Content</h4>
                      <p className="text-sm text-muted-foreground">Use recent tweets for tone and expertise analysis</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profileData.privacy.includeTweets}
                        onChange={(e) => updatePrivacySettings({ includeTweets: e.target.checked })}
                        className="sr-only peer"
                        disabled={updating}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">Include Engagement Data</h4>
                      <p className="text-sm text-muted-foreground">Use engagement metrics for analysis</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profileData.privacy.includeEngagement}
                        onChange={(e) => updatePrivacySettings({ includeEngagement: e.target.checked })}
                        className="sr-only peer"
                        disabled={updating}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Data Information */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">Data Information</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-foreground">Extracted:</span>
                    <span className="ml-2 text-muted-foreground">{formatDate(profileData.extractedAt)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Last Updated:</span>
                    <span className="ml-2 text-muted-foreground">{formatDate(profileData.lastUpdated)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      profileData.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {profileData.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">Actions</h3>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={fetchProfileData}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Refresh Data
                  </button>
                  <button
                    onClick={() => {
                      console.log('🔍 DEBUG: Current profile data:', profileData);
                      console.log('🔍 DEBUG: User object:', user);
                      console.log('🔍 DEBUG: API Base URL:', QuirklyDashboardConfig.getApiBaseUrl());
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors ml-2"
                  >
                    Debug Info
                  </button>
                  <button
                    onClick={deleteProfileData}
                    disabled={updating}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Delete All Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
