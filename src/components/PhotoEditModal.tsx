import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Photo {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  location_id: string | null;
  weather: string | null;
  tags: string[];
}

interface PhotoEditModalProps {
  photo: Photo;
  onClose: () => void;
  onSuccess: () => void;
}

interface Project {
  id: string;
  name: string;
}

interface ProjectLocation {
  id: string;
  name: string;
  project_id: string;
  parent_id: string | null;
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

export default function PhotoEditModal({ photo, onClose, onSuccess }: PhotoEditModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectLocations, setProjectLocations] = useState<ProjectLocation[]>([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: photo.title,
    description: photo.description || '',
    project_id: photo.project_id,
    category: photo.category,
    location: photo.location || '',
    location_id: photo.location_id || '',
    weather: photo.weather || '',
    tags: photo.tags.join(', '),
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (formData.project_id) {
      fetchProjectLocations(formData.project_id);
    }
  }, [formData.project_id]);

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

  const fetchProjectLocations = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_locations')
        .select('id, name, project_id, parent_id')
        .eq('project_id', projectId)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setProjectLocations(data || []);
    } catch (error) {
      console.error('Error fetching project locations:', error);
      setProjectLocations([]);
    }
  };

  function buildLocationPath(locationId: string): string {
    const location = projectLocations.find(l => l.id === locationId);
    if (!location) return '';

    if (location.parent_id) {
      const parentPath = buildLocationPath(location.parent_id);
      return parentPath ? `${parentPath} > ${location.name}` : location.name;
    }

    return location.name;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const { error } = await supabase
        .from('photos')
        .update({
          title: formData.title,
          description: formData.description || null,
          project_id: formData.project_id,
          category: formData.category,
          location: formData.location || null,
          location_id: formData.location_id || null,
          weather: formData.weather || null,
          tags: tagsArray,
          updated_at: new Date().toISOString(),
        })
        .eq('id', photo.id);

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error('Error updating photo:', error);
      alert('Failed to update photo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit Photo
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (Optional)
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter a title for this photo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {projectLocations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Location
              </label>
              <select
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No specific location</option>
                {projectLocations.map(location => (
                  <option key={location.id} value={location.id}>
                    {buildLocationPath(location.id)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Notes
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Additional location details"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weather
            </label>
            <input
              type="text"
              value={formData.weather}
              onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
              placeholder="e.g., Sunny, Cloudy, Rainy"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="Enter tags separated by commas"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
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
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
