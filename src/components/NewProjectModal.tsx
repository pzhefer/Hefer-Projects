import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NewProjectModalProps {
  onClose: () => void;
  onProjectCreated: () => void;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  job_title: string;
  department: string;
}

interface ProjectType {
  id: string;
  name: string;
}

interface ProjectSubtype {
  id: string;
  project_type_id: string;
  name: string;
}

export default function NewProjectModal({ onClose, onProjectCreated }: NewProjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [projectSubtypes, setProjectSubtypes] = useState<ProjectSubtype[]>([]);
  const [selectedSubtypes, setSelectedSubtypes] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    health: 'good',
    start_date: new Date().toISOString().split('T')[0],
    target_end_date: '',
    progress: 0,
    budget: '',
    spent: '0',
    location: '',
    client_name: '',
    project_manager: '',
    team_size: '',
    priority: 'medium',
    project_type: 'commercial',
  });

  useEffect(() => {
    loadAvailableUsers();
    loadProjectTypes();
  }, []);

  const loadProjectTypes = async () => {
    try {
      const [typesResult, subtypesResult] = await Promise.all([
        supabase.from('project_types').select('id, name').eq('is_active', true).order('display_order'),
        supabase.from('project_subtypes').select('id, project_type_id, name').eq('is_active', true).order('display_order'),
      ]);

      if (typesResult.error) throw typesResult.error;
      if (subtypesResult.error) throw subtypesResult.error;

      setProjectTypes(typesResult.data || []);
      setProjectSubtypes(subtypesResult.data || []);
    } catch (error) {
      console.error('Error loading project types:', error);
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

  const handleAddUser = (userId: string) => {
    if (!selectedUsers.includes(userId)) {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(id => id !== userId));
  };

  const filteredUsers = availableUsers.filter(user => {
    const searchLower = userSearchTerm.toLowerCase();
    return (
      (user.full_name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.job_title?.toLowerCase().includes(searchLower)) &&
      !selectedUsers.includes(user.id)
    );
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.target_end_date || !formData.budget) {
      alert('Please fill in all required fields');
      return;
    }

    if (selectedSubtypes.length === 0) {
      alert('Please select at least one project type');
      return;
    }

    try {
      setLoading(true);

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([{
          name: formData.name,
          description: formData.description,
          status: formData.status,
          health: formData.health,
          start_date: formData.start_date,
          target_end_date: formData.target_end_date,
          progress: Number(formData.progress),
          budget: Number(formData.budget),
          spent: Number(formData.spent),
          location: formData.location,
          client_name: formData.client_name,
          project_manager: formData.project_manager,
          team_size: selectedUsers.length,
          priority: formData.priority,
          project_type: formData.project_type,
        }])
        .select()
        .single();

      if (projectError) throw projectError;

      if (selectedUsers.length > 0) {
        const { data: currentUser } = await supabase.auth.getUser();
        const assignments = selectedUsers.map(userId => ({
          user_id: userId,
          project_id: projectData.id,
          assigned_by: currentUser?.user?.id,
        }));

        const { error: assignmentError } = await supabase
          .from('user_project_assignments')
          .insert(assignments);

        if (assignmentError) throw assignmentError;
      }

      if (selectedSubtypes.length > 0) {
        const subtypeAssignments = selectedSubtypes.map(subtypeId => ({
          project_id: projectData.id,
          project_subtype_id: subtypeId,
        }));

        const { error: subtypeError } = await supabase
          .from('project_subtype_assignments')
          .insert(subtypeAssignments);

        if (subtypeError) throw subtypeError;
      }

      onProjectCreated();
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Create New Project</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project name"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project description"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Type(s) <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3 border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {projectTypes.map((type) => {
                    const typeSubtypes = projectSubtypes.filter(s => s.project_type_id === type.id);
                    return (
                      <div key={type.id} className="space-y-2">
                        <h4 className="font-medium text-gray-900">{type.name}</h4>
                        <div className="grid grid-cols-2 gap-2 pl-4">
                          {typeSubtypes.map((subtype) => (
                            <label key={subtype.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={selectedSubtypes.includes(subtype.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSubtypes([...selectedSubtypes, subtype.id]);
                                  } else {
                                    setSelectedSubtypes(selectedSubtypes.filter(id => id !== subtype.id));
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{subtype.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedSubtypes.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">Please select at least one project type</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Project location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Client name"
                />
              </div>
            </div>
          </div>

          {/* Schedule Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="target_end_date"
                  value={formData.target_end_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Budget & Team */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget & Team</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Size
                </label>
                <input
                  type="number"
                  name="team_size"
                  value={formData.team_size}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Manager
                </label>
                <input
                  type="text"
                  name="project_manager"
                  value={formData.project_manager}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Manager name"
                />
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Team Members
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search users by name, email, or job title..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {userSearchTerm && filteredUsers.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg">
                    {filteredUsers.slice(0, 5).map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          handleAddUser(user.id);
                          setUserSearchTerm('');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                      >
                        <p className="font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.job_title && (
                          <p className="text-xs text-gray-500">{user.job_title}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedUsers.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected Team Members ({selectedUsers.length})
                  </p>
                  <div className="space-y-2">
                    {selectedUsers.map(userId => {
                      const user = availableUsers.find(u => u.id === userId);
                      if (!user) return null;
                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name}</p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveUser(user.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove from team"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress & Health */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress & Health</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Progress (%)
                </label>
                <input
                  type="number"
                  name="progress"
                  value={formData.progress}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Health Status
                </label>
                <select
                  name="health"
                  value={formData.health}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="good">On Track</option>
                  <option value="at_risk">At Risk</option>
                  <option value="poor">Delayed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
