import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Tag as TagIcon } from 'lucide-react';
import { supabase, type DrawingSheet, type DrawingSet, type DrawingTag, type Project } from '../lib/supabase';
import DrawingTagManager from './DrawingTagManager';

interface DrawingEditModalProps {
  sheet: DrawingSheet;
  sets: DrawingSet[];
  onClose: () => void;
  onUpdated: () => void;
}

export default function DrawingEditModal({ sheet, sets, onClose, onUpdated }: DrawingEditModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showTagManager, setShowTagManager] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [sheetTags, setSheetTags] = useState<DrawingTag[]>([]);

  const [formData, setFormData] = useState({
    project_id: sheet.project_id,
    set_id: sheet.set_id || '',
    sheet_number: sheet.sheet_number,
    sheet_name: sheet.sheet_name,
    discipline: sheet.discipline,
    status: sheet.status,
  });

  const disciplines = [
    'Architectural',
    'Structural',
    'Mechanical',
    'Electrical',
    'Plumbing',
    'Civil',
    'Landscape',
    'Fire Protection',
    'General'
  ];

  useEffect(() => {
    fetchProjects();
    fetchProject();
    fetchSheetTags();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', sheet.project_id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchSheetTags = async () => {
    try {
      const { data, error } = await supabase
        .from('drawing_sheet_tags')
        .select('tag_id, drawing_tags(*)')
        .eq('sheet_id', sheet.id);

      if (error) throw error;
      const tags = data?.map(st => st.drawing_tags).filter(Boolean) as DrawingTag[] || [];
      setSheetTags(tags);
    } catch (error) {
      console.error('Error fetching sheet tags:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.project_id || !formData.sheet_number || !formData.sheet_name) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      const { error: updateError } = await supabase
        .from('drawing_sheets')
        .update({
          project_id: formData.project_id,
          set_id: formData.set_id || null,
          sheet_number: formData.sheet_number,
          sheet_name: formData.sheet_name,
          discipline: formData.discipline,
          status: formData.status,
        })
        .eq('id', sheet.id);

      if (updateError) throw updateError;

      onUpdated();
    } catch (err) {
      console.error('Error updating drawing:', err);
      setError(err instanceof Error ? err.message : 'Failed to update drawing');
    } finally {
      setSaving(false);
    }
  };

  const filteredSets = sets.filter(set => set.project_id === formData.project_id);

  // Build hierarchical display for sets
  const buildSetHierarchy = () => {
    const result: Array<{ set: DrawingSet; displayName: string }> = [];

    const addSetWithChildren = (parentId: string | null, prefix: string = '') => {
      const children = filteredSets.filter(s => s.parent_id === parentId);
      children.forEach((set, index) => {
        const isLast = index === children.length - 1;
        const hasChildren = filteredSets.some(s => s.parent_id === set.id);

        let displayName = '';
        if (set.level === 0) {
          displayName = set.name;
        } else {
          displayName = `${prefix}${isLast ? '└─' : '├─'} ${set.name}`;
        }

        result.push({ set, displayName });

        if (hasChildren) {
          const childPrefix = set.level === 0 ? '' : `${prefix}${isLast ? '   ' : '│  '}`;
          addSetWithChildren(set.id, childPrefix);
        }
      });
    };

    addSetWithChildren(null);
    return result;
  };

  const hierarchicalSets = buildSetHierarchy();

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Save className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Drawing Sheet</h2>
                <p className="text-sm text-gray-600">Update sheet metadata and tags</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {error && (
            <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value, set_id: '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Project</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select the project this drawing belongs to
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Drawing Set (Optional)
              </label>
              <select
                value={formData.set_id}
                onChange={(e) => setFormData({ ...formData, set_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!formData.project_id}
              >
                <option value="">No Set (Unorganized)</option>
                {hierarchicalSets.map(({ set, displayName }) => (
                  <option key={set.id} value={set.id}>
                    {displayName}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Organize this drawing into a set or folder for better management
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Drawing Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.sheet_number}
                onChange={(e) => setFormData({ ...formData, sheet_number: e.target.value })}
                placeholder="e.g., A-101"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Drawing Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.sheet_name}
                onChange={(e) => setFormData({ ...formData, sheet_name: e.target.value })}
                placeholder="e.g., Ground Floor Plan"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discipline <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.discipline}
                  onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {disciplines.map((discipline) => (
                    <option key={discipline} value={discipline}>
                      {discipline}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="draft">Draft</option>
                  <option value="for_review">For Review</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 min-h-[60px]">
                {sheetTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {sheetTags.map(tag => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-2">No tags applied</p>
                )}
                <button
                  type="button"
                  onClick={() => setShowTagManager(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                >
                  <TagIcon size={14} />
                  <span>Manage Tags</span>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Add tags to categorize and filter drawings
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showTagManager && project && (
        <DrawingTagManager
          project={project}
          sheet={sheet}
          onClose={() => setShowTagManager(false)}
          onTagsUpdated={() => {
            fetchSheetTags();
            onUpdated();
          }}
        />
      )}
    </>
  );
}
