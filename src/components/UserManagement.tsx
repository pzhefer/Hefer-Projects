import { useState, useEffect, useMemo } from 'react';
import {
  UserPlus, Shield, X, Check, AlertCircle, Edit, Trash2, Plus,
  Users as UsersIcon, Key, Lock, Unlock, Mail, Briefcase, Building, ChevronDown, ChevronRight, Save, Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  getAllRoles,
  getUserRoles,
  assignRoleToUser,
  removeRoleFromUser,
  isAdministrator,
  Role,
  UserRole,
  Permission,
  getRolePermissions,
  getAllPermissions,
} from '../lib/permissions';
import { useAuth } from '../contexts/AuthContext';
import UnifiedPermissionManager from './UnifiedPermissionManager';
import DeleteConfirmModal from './DeleteConfirmModal';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  job_title: string;
  department: string;
  is_active: boolean;
  created_at: string;
}

type Tab = 'users' | 'roles' | 'permissions';

export default function UserManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserJobTitle, setNewUserJobTitle] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('');

  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editDepartment, setEditDepartment] = useState('');

  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDescription, setEditRoleDescription] = useState('');

  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: 'role' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    loadUsers();
    loadRoles();
    loadPermissions();
  }, []);

  useEffect(() => {
    if (roles.length > 0 && roleFilter.length === 0) {
      setRoleFilter(roles.map(r => r.id));
    }
  }, [roles]);

  async function checkAdminStatus() {
    if (!user) return;
    const adminStatus = await isAdministrator(user.id);
    setIsAdmin(adminStatus);
    if (!adminStatus) {
      setMessage({ type: 'error', text: 'Access denied. Administrator privileges required.' });
    }
  }

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRoles() {
    try {
      const rolesData = await getAllRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  }

  async function loadPermissions() {
    try {
      const permsData = await getAllPermissions();
      setPermissions(permsData);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  }

  async function handleSelectUser(userProfile: UserProfile) {
    setSelectedUser(userProfile);
    try {
      const userRolesData = await getUserRoles(userProfile.id);
      setUserRoles(userRolesData);
    } catch (error) {
      console.error('Error loading user roles:', error);
    }
  }

  const [userRolesMap, setUserRolesMap] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    async function loadAllUserRoles() {
      const rolesMap = new Map<string, string[]>();

      for (const user of users) {
        const userRolesData = await getUserRoles(user.id);
        rolesMap.set(user.id, userRolesData.map(ur => ur.role_id));
      }

      setUserRolesMap(rolesMap);
    }

    if (users.length > 0) {
      loadAllUserRoles();
    }
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch =
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active);

      const userRoleIds = userRolesMap.get(user.id) || [];
      const matchesRole = roleFilter.length === 0 || roleFilter.some(roleId => userRoleIds.includes(roleId));

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter, userRolesMap]);

  async function handleSelectRole(role: Role) {
    setSelectedRole(role);
    try {
      const rolePermsData = await getRolePermissions(role.id);
      setRolePermissions(rolePermsData);
    } catch (error) {
      console.error('Error loading role permissions:', error);
    }
  }

  async function handleAddUser() {
    if (!newUserEmail.trim() || !newUserFullName.trim()) {
      setMessage({ type: 'error', text: 'Email and full name are required' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const redirectUrl = `${window.location.origin}/login`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: newUserEmail.trim(),
            full_name: newUserFullName.trim(),
            job_title: newUserJobTitle.trim() || '',
            department: newUserDepartment.trim() || '',
            redirect_url: redirectUrl,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create user');
      }

      setMessage({ type: 'success', text: 'User created and invitation email sent' });
      setShowNewUserModal(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFullName('');
      setNewUserJobTitle('');
      setNewUserDepartment('');
      await loadUsers();
    } catch (error: any) {
      console.error('Error adding user:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to add user' });
    }

    setTimeout(() => setMessage(null), 3000);
  }

  async function handleEditUser(userProfile: UserProfile) {
    setEditingUser(userProfile);
    setEditFullName(userProfile.full_name);
    setEditJobTitle(userProfile.job_title || '');
    setEditDepartment(userProfile.department || '');
    setShowEditUserModal(true);
  }

  async function handleSaveUserEdit() {
    if (!editingUser) return;

    if (!editFullName.trim()) {
      setMessage({ type: 'error', text: 'Full name is required' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: editFullName.trim(),
          job_title: editJobTitle.trim() || '',
          department: editDepartment.trim() || '',
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'User updated successfully' });
      setShowEditUserModal(false);
      setEditingUser(null);
      await loadUsers();

      if (selectedUser?.id === editingUser.id) {
        const updatedUser = users.find(u => u.id === editingUser.id);
        if (updatedUser) setSelectedUser(updatedUser);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setMessage({ type: 'error', text: 'Failed to update user' });
    }

    setTimeout(() => setMessage(null), 3000);
  }

  async function handleToggleUserStatus(userId: string, currentStatus: boolean) {
    try {
      console.log('Toggling user status:', { userId, currentStatus, newStatus: !currentStatus });

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId)
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setMessage({
        type: 'success',
        text: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      });
      await loadUsers();

      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, is_active: !currentStatus });
      }
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      setMessage({ type: 'error', text: error?.message || 'Failed to update user status' });
    }

    setTimeout(() => setMessage(null), 3000);
  }

  async function handleToggleUserRole(userId: string, roleId: string, isAssigned: boolean) {
    try {
      if (isAssigned) {
        const { error } = await removeRoleFromUser(userId, roleId);
        if (error) throw error;
      } else {
        const { error } = await assignRoleToUser(userId, roleId, user?.id || '');
        if (error) throw error;
      }

      setMessage({ type: 'success', text: `Role ${isAssigned ? 'removed' : 'assigned'} successfully` });

      if (selectedUser?.id === userId) {
        const updatedUserRoles = await getUserRoles(userId);
        setUserRoles(updatedUserRoles);
      }
    } catch (error) {
      console.error('Error toggling role:', error);
      setMessage({ type: 'error', text: 'Failed to update role' });
    }

    setTimeout(() => setMessage(null), 3000);
  }

  async function handleAddRole() {
    if (!newRoleName.trim()) {
      setMessage({ type: 'error', text: 'Role name is required' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      const { error } = await supabase
        .from('roles')
        .insert({
          name: newRoleName.trim(),
          description: newRoleDescription.trim(),
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Role created successfully' });
      setShowNewRoleModal(false);
      setNewRoleName('');
      setNewRoleDescription('');
      await loadRoles();
    } catch (error) {
      console.error('Error creating role:', error);
      setMessage({ type: 'error', text: 'Failed to create role' });
    }

    setTimeout(() => setMessage(null), 3000);
  }

  async function handleEditRole(role: Role) {
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDescription(role.description || '');
    setShowEditRoleModal(true);
  }

  async function handleSaveRoleEdit() {
    if (!editingRole) return;

    if (!editRoleName.trim()) {
      setMessage({ type: 'error', text: 'Role name is required' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      const { error } = await supabase
        .from('roles')
        .update({
          name: editRoleName.trim(),
          description: editRoleDescription.trim() || null,
        })
        .eq('id', editingRole.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Role updated successfully' });
      setShowEditRoleModal(false);
      setEditingRole(null);
      await loadRoles();

      if (selectedRole?.id === editingRole.id) {
        setSelectedRole({ ...editingRole, name: editRoleName.trim(), description: editRoleDescription.trim() });
      }
    } catch (error) {
      console.error('Error updating role:', error);
      setMessage({ type: 'error', text: 'Failed to update role' });
    }

    setTimeout(() => setMessage(null), 3000);
  }

  async function handleDeleteRole() {
    if (!deleteConfirm) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Role deleted successfully' });
      await loadRoles();

      if (selectedRole?.id === deleteConfirm.id) {
        setSelectedRole(null);
      }
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting role:', error);
      setMessage({ type: 'error', text: 'Failed to delete role' });
    } finally {
      setIsDeleting(false);
    }

    setTimeout(() => setMessage(null), 3000);
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center space-x-3">
          <AlertCircle className="text-red-600" size={24} />
          <div>
            <h3 className="font-semibold text-red-900">Access Denied</h3>
            <p className="text-red-700">You need administrator privileges to access user management.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'users'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UsersIcon size={20} />
              <span>Users</span>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'roles'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Shield size={20} />
              <span>Roles</span>
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'permissions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Key size={20} />
              <span>Permissions</span>
            </button>
          </div>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">All Users</h3>
              <button
                onClick={() => setShowNewUserModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus size={20} />
                <span>Add User</span>
              </button>
            </div>

            <div className="mb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, email, job title, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      statusFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter('active')}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      statusFilter === 'active'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setStatusFilter('inactive')}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      statusFilter === 'inactive'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Inactive
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Roles:</span>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => {
                          if (roleFilter.includes(role.id)) {
                            setRoleFilter(roleFilter.filter(id => id !== role.id));
                          } else {
                            setRoleFilter([...roleFilter, role.id]);
                          }
                        }}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          roleFilter.includes(role.id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {role.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </div>

            <div className="space-y-3">
              {filteredUsers.map((userProfile) => {
                const isExpanded = expandedUserId === userProfile.id;
                return (
                  <div
                    key={userProfile.id}
                    className="border border-gray-200 rounded-lg bg-white overflow-hidden"
                  >
                    <div className="p-4">
                      <button
                        onClick={() => {
                          if (isExpanded) {
                            setExpandedUserId(null);
                            setSelectedUser(null);
                          } else {
                            setExpandedUserId(userProfile.id);
                            handleSelectUser(userProfile);
                          }
                        }}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{userProfile.full_name}</p>
                            <p className="text-sm text-gray-600 truncate">{userProfile.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {userProfile.job_title && (
                            <span className="hidden sm:inline-flex text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {userProfile.job_title}
                            </span>
                          )}
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              userProfile.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {userProfile.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </button>

                      <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditUser(userProfile);
                          }}
                          className="flex items-center justify-center p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleUserStatus(userProfile.id, userProfile.is_active);
                          }}
                          className={`flex items-center justify-center p-1.5 rounded transition-colors ${
                            userProfile.is_active
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                          title={userProfile.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {userProfile.is_active ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && selectedUser && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          {userProfile.job_title && (
                            <div className="flex items-center space-x-2 text-gray-600">
                              <Briefcase size={16} className="flex-shrink-0" />
                              <span>{userProfile.job_title}</span>
                            </div>
                          )}
                          {userProfile.department && (
                            <div className="flex items-center space-x-2 text-gray-600">
                              <Building size={16} className="flex-shrink-0" />
                              <span>{userProfile.department}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Mail size={16} className="flex-shrink-0" />
                            <span className="truncate">{userProfile.email}</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Assigned Roles</h4>
                          <div className="flex flex-wrap gap-2">
                            {roles.map((role) => {
                              const isAssigned = userRoles.some(ur => ur.role_id === role.id);
                              return (
                                <button
                                  key={role.id}
                                  onClick={() => handleToggleUserRole(userProfile.id, role.id, isAssigned)}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    isAssigned
                                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  {isAssigned && <Check size={14} className="inline mr-1" />}
                                  {role.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">All Roles</h3>
              <button
                onClick={() => setShowNewRoleModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                <span>Add Role</span>
              </button>
            </div>

            <div className="space-y-3">
              {roles.map((role) => {
                const isExpanded = expandedRoleId === role.id;
                return (
                  <div
                    key={role.id}
                    className="border border-gray-200 rounded-lg bg-white overflow-hidden"
                  >
                    <div className="p-4">
                      <button
                        onClick={() => {
                          if (isExpanded) {
                            setExpandedRoleId(null);
                            setSelectedRole(null);
                          } else {
                            setExpandedRoleId(role.id);
                            handleSelectRole(role);
                          }
                        }}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900">{role.name}</p>
                            <p className="text-sm text-gray-600 truncate">{role.description}</p>
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRole(role);
                          }}
                          className="flex items-center justify-center p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ id: role.id, name: role.name, type: 'role' });
                          }}
                          className="flex items-center justify-center p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRole(role);
                            setActiveTab('permissions');
                          }}
                          className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                          Manage Permissions
                        </button>
                      </div>
                    </div>

                    {isExpanded && selectedRole && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Description:</span>
                            <p className="text-sm text-gray-600 mt-1">{role.description || 'No description'}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Assigned Permissions:</span>
                            <p className="text-sm text-gray-600 mt-1">{rolePermissions.length} permissions</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Role to Manage Permissions
              </label>
              <select
                value={selectedRole?.id || ''}
                onChange={(e) => {
                  const role = roles.find(r => r.id === e.target.value);
                  if (role) handleSelectRole(role);
                }}
                className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a role...</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedRole ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-1">{selectedRole.name}</h3>
                  <p className="text-sm text-blue-700">{selectedRole.description}</p>
                </div>

                <UnifiedPermissionManager
                  selectedRole={selectedRole}
                  allPermissions={permissions}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                <Key size={48} className="mb-4 text-gray-400" />
                <p>Select a role to manage its permissions</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New User Modal */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New User</h3>
              <button
                onClick={() => {
                  setShowNewUserModal(false);
                  setNewUserEmail('');
                  setNewUserPassword('');
                  setNewUserFullName('');
                  setNewUserJobTitle('');
                  setNewUserDepartment('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <Mail size={16} className="inline mr-2" />
                  An invitation email will be sent to the user with instructions to set their password and access the app.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  value={newUserJobTitle}
                  onChange={(e) => setNewUserJobTitle(e.target.value)}
                  placeholder="Site Manager"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={newUserDepartment}
                  onChange={(e) => setNewUserDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select department...</option>
                  <option value="Management">Management</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Safety">Safety</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                  <option value="Quality">Quality</option>
                  <option value="Procurement">Procurement</option>
                  <option value="HR">HR</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowNewUserModal(false);
                  setNewUserEmail('');
                  setNewUserPassword('');
                  setNewUserFullName('');
                  setNewUserJobTitle('');
                  setNewUserDepartment('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <UserPlus size={18} />
                <span>Add User</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
              <button
                onClick={() => {
                  setShowEditUserModal(false);
                  setEditingUser(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  value={editJobTitle}
                  onChange={(e) => setEditJobTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select department...</option>
                  <option value="Management">Management</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Safety">Safety</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                  <option value="Quality">Quality</option>
                  <option value="Procurement">Procurement</option>
                  <option value="HR">HR</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowEditUserModal(false);
                  setEditingUser(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserEdit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Save size={18} />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Role Modal */}
      {showNewRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create New Role</h3>
              <button
                onClick={() => {
                  setShowNewRoleModal(false);
                  setNewRoleName('');
                  setNewRoleDescription('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., Site Manager"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Describe the role's responsibilities..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowNewRoleModal(false);
                  setNewRoleName('');
                  setNewRoleDescription('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRole}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Plus size={18} />
                <span>Create Role</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditRoleModal && editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Role</h3>
              <button
                onClick={() => {
                  setShowEditRoleModal(false);
                  setEditingRole(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editRoleDescription}
                  onChange={(e) => setEditRoleDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowEditRoleModal(false);
                  setEditingRole(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoleEdit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Save size={18} />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <DeleteConfirmModal
          title="Delete Role?"
          message={`Are you sure you want to delete the role "${deleteConfirm.name}"? This action cannot be undone.`}
          onConfirm={handleDeleteRole}
          onCancel={() => setDeleteConfirm(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
