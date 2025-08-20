'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Ban,
  UserCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import QuirklyDashboardConfig from '@/lib/config';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  credits: {
    available: number;
    used: number;
    total: number;
  };
  createdAt: string;
  lastLoginAt?: string;
  apiKeys: any[];
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalCreditsUsed: number;
  totalRepliesGenerated: number;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
      fetchStats();
    }
  }, [user, currentPage, searchTerm, statusFilter]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) return;

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });

      if (searchTerm) queryParams.append('search', searchTerm);
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);

      const response = await fetch(
        `${QuirklyDashboardConfig.getApiBaseUrl()}/users?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error fetching users');
    }
  };

  const fetchStats = async () => {
    try {
      // Calculate stats from users data (simplified version)
      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.status === 'active').length;
      const totalCreditsUsed = users.reduce((sum, u) => sum + u.credits.used, 0);
      
      setStats({
        totalUsers,
        activeUsers,
        totalCreditsUsed,
        totalRepliesGenerated: totalCreditsUsed // Assuming 1 credit = 1 reply
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) return;

      const response = await fetch(
        `${QuirklyDashboardConfig.getApiBaseUrl()}/users/${userId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        }
      );

      if (response.ok) {
        toast.success(`User status updated to ${newStatus}`);
        fetchUsers(); // Refresh the list
      } else {
        toast.error('Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Error updating user status');
    }
  };

  const resetUserCredits = async (userId: string) => {
    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) return;

      const response = await fetch(
        `${QuirklyDashboardConfig.getApiBaseUrl()}/credits/reset`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId })
        }
      );

      if (response.ok) {
        toast.success('User credits reset successfully');
        fetchUsers(); // Refresh the list
      } else {
        toast.error('Failed to reset user credits');
      }
    } catch (error) {
      console.error('Error resetting user credits:', error);
      toast.error('Error resetting user credits');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'suspended':
        return <Ban className="h-4 w-4 text-danger" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-ink-mute" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'active':
        return `${baseClasses} bg-success/10 text-success`;
      case 'suspended':
        return `${baseClasses} bg-danger/10 text-danger`;
      case 'inactive':
        return `${baseClasses} bg-ink-mute/10 text-ink-mute`;
      default:
        return `${baseClasses} bg-warning/10 text-warning`;
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 text-ink-mute mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-ink mb-2">Access Denied</h3>
        <p className="text-ink-mute">You need admin privileges to access this section.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
        <p className="text-ink-mute">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-accent/10 to-accent-cyan/10 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-2">
          <Shield className="h-6 w-6 text-accent" />
          <h2 className="text-xl font-bold text-ink">Admin Dashboard</h2>
        </div>
        <p className="text-ink-mute">Manage users, monitor system performance, and oversee platform operations.</p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-mute">Total Users</p>
                <p className="text-2xl font-bold text-ink">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-accent" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-mute">Active Users</p>
                <p className="text-2xl font-bold text-ink">{stats.activeUsers}</p>
              </div>
              <UserCheck className="h-8 w-8 text-success" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-mute">Credits Used</p>
                <p className="text-2xl font-bold text-ink">{stats.totalCreditsUsed.toLocaleString()}</p>
              </div>
              <CreditCard className="h-8 w-8 text-warning" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-mute">Replies Generated</p>
                <p className="text-2xl font-bold text-ink">{stats.totalRepliesGenerated.toLocaleString()}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-accent-cyan" />
            </div>
          </Card>
        </div>
      )}

      {/* User Management */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-ink">User Management</h3>
          <Button
            variant="ghost"
            onClick={() => fetchUsers()}
            className="btn-ghost"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ink-mute" />
            <input
              type="text"
              placeholder="Search users by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-stroke rounded-button focus:outline-none focus:ring-2 focus:ring-accent text-ink"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ink-mute" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 bg-surface border border-stroke rounded-button focus:outline-none focus:ring-2 focus:ring-accent text-ink appearance-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stroke">
                <th className="text-left py-3 px-4 font-medium text-ink-mute">User</th>
                <th className="text-left py-3 px-4 font-medium text-ink-mute">Role</th>
                <th className="text-left py-3 px-4 font-medium text-ink-mute">Status</th>
                <th className="text-left py-3 px-4 font-medium text-ink-mute">Credits</th>
                <th className="text-left py-3 px-4 font-medium text-ink-mute">API Keys</th>
                <th className="text-left py-3 px-4 font-medium text-ink-mute">Created</th>
                <th className="text-left py-3 px-4 font-medium text-ink-mute">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-stroke hover:bg-surface/50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-ink">{user.fullName}</div>
                      <div className="text-sm text-ink-mute">{user.email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-accent/10 text-accent' 
                        : 'bg-ink-mute/10 text-ink-mute'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(user.status)}
                      <span className={getStatusBadge(user.status)}>
                        {user.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div className="font-medium text-ink">{user.credits.used}/{user.credits.total}</div>
                      <div className="text-ink-mute">{user.credits.available} available</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-ink">{user.apiKeys.length} keys</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-ink-mute">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      {user.status === 'active' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateUserStatus(user.id, 'suspended')}
                          className="text-danger hover:bg-danger/10"
                        >
                          <Ban className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateUserStatus(user.id, 'active')}
                          className="text-success hover:bg-success/10"
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resetUserCredits(user.id)}
                        className="text-accent hover:bg-accent/10"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-ink-mute">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
