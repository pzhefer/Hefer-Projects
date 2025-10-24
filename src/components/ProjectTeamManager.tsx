import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Users, Search, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  job_title: string;
  department: string;
}

interface ProjectAssignment {
  id: string;
  user_id: string;
  project_id: string;
  assigned_at: string;
  user_profiles: UserProfile;
}

interface ProjectTeamManagerProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}


export default function ProjectTeamManager({ projectId, projectName, onClose }: ProjectTeamManagerProps) {
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAssignments();
    loadAvailableUsers();
  }, [projectId]);

  const loadAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('user_project_assignments')
        .select(`
          *,
          user_profiles!user_project_assignments_user_id_fkey (
            id,
            email,
            full_name,
            job_title,
            department
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
      showMessage('error', 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, job_title, department')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUser) {
      showMessage('error', 'Please select a user');
      return;
    }

    const existingAssignment = assignments.find(a => a.user_id === selectedUser);
    if (existingAssignment) {
      showMessage('error', 'User is already assigned to this project');
      return;
    }

    try {
      const { data: currentUser } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('user_project_assignments')
        .insert({
          user_id: selectedUser,
          project_id: projectId,
          assigned_by: currentUser?.user?.id,
        });

      if (error) throw error;

      showMessage('success', 'User added to project successfully');
      setSelectedUser('');
      loadAssignments();
    } catch (error) {
      console.error('Error adding user:', error);
      showMessage('error', 'Failed to add user to project');
    }
  };

  const handleRemoveUser = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this user from the project?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_project_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      showMessage('success', 'User removed from project');
      loadAssignments();
    } catch (error) {
      console.error('Error removing user:', error);
      showMessage('error', 'Failed to remove user from project');
    }
  };


  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const filteredUsers = availableUsers.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.job_title.toLowerCase().includes(searchLower)
    );
  });

  const unassignedUsers = filteredUsers.filter(
    user => !assignments.some(a => a.user_id === user.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Project Team
            </h2>
            <p className="text-gray-600 mt-1">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {message && (
          <div className={`mx-6 mt-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Team Member</h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a user</option>
                  {unassignedUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddUser}
                  disabled={!selectedUser}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  Add to Project
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Current Team Members ({assignments.length})
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading team members...</p>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No team members assigned to this project yet</p>
                <p className="text-gray-500 text-sm mt-2">Add users above to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {assignment.user_profiles.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {assignment.user_profiles.full_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {assignment.user_profiles.email}
                          </p>
                          {assignment.user_profiles.job_title && (
                            <p className="text-xs text-gray-500">
                              {assignment.user_profiles.job_title}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => handleRemoveUser(assignment.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove from project"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
