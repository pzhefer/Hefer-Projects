import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PhotoBulkEditModalProps {
  photoIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

interface Project {
  id: string;
  name: string;
}

const CATEGORIES = [
  { value: 'progress', label: 'Progress' },
  { value: 'safety', label: 'Safety' },
  { value: 'quality', label: 'Quality' },
  { value: 'issue', label: 'Issue' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'team', label: 'Team' },
  { value: 'site', label: 'Site' },
  { value: 'other', label: 'Other' },
];

export default function PhotoBulkEditModal({ photoIds, onClose, onSuccess }: PhotoBulkEditModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    category: '',
    location: '',
    weather: '',
    tags: '',
  });
  const [updateFields, setUpdateFields] = useState({
    project_id: false,
    category: false,
    location: false,
    weather: false,
    tags: false,
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasSelectedFields = Object.values(updateFields).some(v => v);
    if (!hasSelectedFields) {
      alert('Please select at least one field to update');
      return;
    }

    setSaving(true);
    try {
      const updates: any = {};

      if (updateFields.project_id && formData.project_id) {
        updates.project_id = formData.project_id;
      }
      if (updateFields.category && formData.category) {
        updates.category = formData.category;
      }
      if (updateFields.location) {
        updates.location = formData.location || null;
      }
      if (updateFields.weather) {
        updates.weather = formData.weather || null;
      }
      if (updateFields.tags) {
        const tagsArray = formData.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
        updates.tags = tagsArray;
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from('photos')
          .update(updates)
          .in('id', photoIds);

        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error('Error updating photos:', error);
      alert('Failed to update photos');
    } finally {
      setSaving(false);
    }
  };

  const toggleField = (field: keyof typeof updateFields) => {
    setUpdateFields({ ...updateFields, [field]: !updateFields[field] });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Bulk Edit Photos ({photoIds.length})
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Select the fields you want to update for all selected photos:
          </p>

          <div className="space-y-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                checked={updateFields.project_id}
                onChange={() => toggleField('project_id')}
                className="mt-1 mr-3"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  disabled={!updateFields.project_id}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                checked={updateFields.category}
                onChange={() => toggleField('category')}
                className="mt-1 mr-3"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  disabled={!updateFields.category}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                checked={updateFields.location}
                onChange={() => toggleField('location')}
                className="mt-1 mr-3"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  disabled={!updateFields.location}
                  placeholder="e.g., Building A - 2nd Floor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                checked={updateFields.weather}
                onChange={() => toggleField('weather')}
                className="mt-1 mr-3"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weather
                </label>
                <input
                  type="text"
                  value={formData.weather}
                  onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
                  disabled={!updateFields.weather}
                  placeholder="e.g., Sunny, Cloudy, Rainy"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                checked={updateFields.tags}
                onChange={() => toggleField('tags')}
                className="mt-1 mr-3"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  disabled={!updateFields.tags}
                  placeholder="Enter tags separated by commas"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will replace existing tags
                </p>
              </div>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Update {photoIds.length} Photo{photoIds.length > 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
