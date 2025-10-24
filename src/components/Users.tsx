import { useState, useEffect } from 'react';
import { Users as UsersIcon, Search, Plus, Edit, Trash2, Mail, Phone, Briefcase, Building, Shield, CheckCircle, XCircle, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import EditUserModal from './EditUserModal';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  phone: string;
  job_title: string;
  department: string;
  role: string;
  company: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export default function Users() {
  const { profile: currentUserProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.job_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesDepartment = filterDepartment === 'all' || user.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? user.is_active : !user.is_active);
    return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
  });

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-700',
      project_manager: 'bg-blue-100 text-blue-700',
      supervisor: 'bg-green-100 text-green-700',
      worker: 'bg-gray-100 text-gray-700',
      viewer: 'bg-slate-100 text-slate-700',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  const isAdmin = currentUserProfile?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        {isAdmin && (
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            <span>Invite User</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <UsersIcon className="text-gray-400" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <CheckCircle className="text-green-400" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactive Users</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.inactive}</p>
            </div>
            <XCircle className="text-red-400" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Administrators</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.admins}</p>
            </div>
            <Shield className="text-purple-400" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search users by name, email, or job title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="project_manager">Project Manager</option>
              <option value="supervisor">Supervisor</option>
              <option value="worker">Worker</option>
              <option value="viewer">Viewer</option>
            </select>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Departments</option>
              <option value="Management">Management</option>
              <option value="Engineering">Engineering</option>
              <option value="Safety">Safety</option>
              <option value="Finance">Finance</option>
              <option value="Operations">Operations</option>
              <option value="Quality">Quality</option>
              <option value="Procurement">Procurement</option>
              <option value="HR">HR</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <UsersIcon className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600">
            {searchTerm || filterRole !== 'all' || filterDepartment !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your search or filters'
              : 'No users available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredUsers.map((user) => {
            const isExpanded = expandedCard === user.id;
            const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase();

            return (
              <div
                key={user.id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all overflow-hidden"
              >
                <div className="p-3">
                  <div
                    onClick={() => setExpandedCard(isExpanded ? null : user.id)}
                    className="cursor-pointer hover:bg-gray-50 -m-3 p-3 rounded-t-lg"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{user.full_name}</h3>
                        <p className="text-xs text-gray-500 truncate">{user.job_title || 'No title'}</p>
                      </div>
                      {user.is_active ? (
                        <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle size={14} className="text-red-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                      {user.department && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 truncate">
                          {user.department}
                        </span>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center space-x-1 mt-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(user.id, user.is_active);
                        }}
                        className={`flex items-center justify-center p-1.5 rounded transition-colors ${
                          user.is_active
                            ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {user.is_active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingUser(user);
                          setShowEditModal(true);
                        }}
                        className="flex items-center justify-center p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteUser(user.id);
                        }}
                        className="flex items-center justify-center p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors ml-auto"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 p-3 space-y-2 bg-gray-50">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center text-gray-600">
                        <Mail size={12} className="mr-1.5 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center text-gray-600">
                          <Phone size={12} className="mr-1.5 flex-shrink-0" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      {user.department && (
                        <div className="flex items-center text-gray-600">
                          <Building size={12} className="mr-1.5 flex-shrink-0" />
                          <span>{user.department}</span>
                        </div>
                      )}
                      {user.company && (
                        <div className="flex items-center text-gray-600">
                          <Briefcase size={12} className="mr-1.5 flex-shrink-0" />
                          <span>{user.company}</span>
                        </div>
                      )}
                      {user.last_login && (
                        <div className="text-gray-500 pt-1">
                          <span className="font-medium">Last login:</span> {formatDate(user.last_login)}
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center space-x-1.5 pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(user.id, user.is_active);
                          }}
                          className={`flex-1 flex items-center justify-center px-2 py-1.5 rounded transition-colors text-xs ${
                            user.is_active
                              ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {user.is_active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                          <span className="ml-1">{user.is_active ? 'Deactivate' : 'Activate'}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingUser(user);
                            setShowEditModal(true);
                          }}
                          className="flex items-center justify-center px-2 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(user.id);
                          }}
                          className="flex items-center justify-center px-2 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
          onUserUpdated={() => {
            fetchUsers();
            setShowEditModal(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}
