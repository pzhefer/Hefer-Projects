import { useState, useEffect } from 'react';
import { X, Plus, Tag, Trash2, Edit2 } from 'lucide-react';
import { supabase, type DrawingTag, type DrawingSheet, type Project } from '../lib/supabase';

interface DrawingTagManagerProps {
  project: Project;
  sheet?: DrawingSheet;
  onClose: () => void;
  onTagsUpdated: () => void;
}

export default function DrawingTagManager({ project, sheet, onClose, onTagsUpdated }: DrawingTagManagerProps) {
  const [tags, setTags] = useState<DrawingTag[]>([]);
  const [sheetTags, setSheetTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');

  const colorOptions = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
  ];

  useEffect(() => {
    fetchTags();
    if (sheet) {
      fetchSheetTags();
    }
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('drawing_tags')
        .select('*')
        .eq('project_id', project.id)
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSheetTags = async () => {
    if (!sheet) return;

    try {
      const { data, error } = await supabase
        .from('drawing_sheet_tags')
        .select('tag_id')
        .eq('sheet_id', sheet.id);

      if (error) throw error;
      setSheetTags(data?.map(st => st.tag_id) || []);
    } catch (error) {
      console.error('Error fetching sheet tags:', error);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const { error } = await supabase
        .from('drawing_tags')
        .insert({
          project_id: project.id,
          name: newTagName.trim(),
          color: newTagColor,
        });

      if (error) throw error;

      setNewTagName('');
      setNewTagColor('#3B82F6');
      fetchTags();
      onTagsUpdated();
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('Failed to create tag');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Delete this tag? It will be removed from all drawings.')) return;

    try {
      const { error } = await supabase
        .from('drawing_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      fetchTags();
      onTagsUpdated();
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('Failed to delete tag');
    }
  };

  const handleToggleSheetTag = async (tagId: string) => {
    if (!sheet) return;

    try {
      const isTagged = sheetTags.includes(tagId);

      if (isTagged) {
        const { error } = await supabase
          .from('drawing_sheet_tags')
          .delete()
          .eq('sheet_id', sheet.id)
          .eq('tag_id', tagId);

        if (error) throw error;
        setSheetTags(sheetTags.filter(id => id !== tagId));
      } else {
        const { error } = await supabase
          .from('drawing_sheet_tags')
          .insert({
            sheet_id: sheet.id,
            tag_id: tagId,
          });

        if (error) throw error;
        setSheetTags([...sheetTags, tagId]);
      }

      onTagsUpdated();
    } catch (error) {
      console.error('Error toggling tag:', error);
      alert('Failed to update tag');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Tag className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage Tags</h2>
              <p className="text-sm text-gray-600">
                {sheet ? `Tagging: ${sheet.sheet_number}` : project.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleCreateTag} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-3">Create New Tag</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Tag name (e.g., Urgent, Ground Floor, MEP)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tag Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTagColor(color)}
                          className={`w-10 h-10 rounded-lg border-2 transition-all ${
                            newTagColor === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus size={16} />
                    <span>Create Tag</span>
                  </button>
                </div>
              </form>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  {sheet ? 'Select Tags for This Sheet' : 'All Project Tags'}
                </h3>
                {tags.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Tag className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-gray-600">No tags yet. Create your first tag above.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tags.map(tag => (
                      <div
                        key={tag.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          sheet && sheetTags.includes(tag.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <button
                          onClick={() => sheet && handleToggleSheetTag(tag.id)}
                          className="flex-1 flex items-center space-x-3 text-left"
                          disabled={!sheet}
                        >
                          <div
                            className="w-8 h-8 rounded flex-shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{tag.name}</p>
                            {sheet && sheetTags.includes(tag.id) && (
                              <p className="text-xs text-blue-600">Applied to this sheet</p>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Tag"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
