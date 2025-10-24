import { useState, useEffect } from 'react';
import {
  X, Download, Trash2, Edit, Save, MapPin, Calendar, User,
  Tag, Cloud, MessageCircle, Send, ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Photo {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_size: number;
  mime_type: string;
  width: number | null;
  height: number | null;
  category: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  taken_by: string;
  taken_at: string;
  weather: string | null;
  tags: string[];
  is_featured: boolean;
  visibility: string;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    full_name: string;
  };
}

interface Comment {
  id: string;
  photo_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_profiles?: {
    full_name: string;
  };
}

interface PhotoViewerProps {
  photo: Photo;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: (photoId: string, filePath: string) => void;
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

export default function PhotoViewer({ photo, onClose, onUpdate, onDelete }: PhotoViewerProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [editedData, setEditedData] = useState({
    title: photo.title,
    description: photo.description || '',
    category: photo.category,
    location: photo.location || '',
    weather: photo.weather || '',
    tags: photo.tags.join(', '),
    project_id: photo.project_id,
  });

  useEffect(() => {
    fetchComments();
    loadPhotoUrl();
    fetchProjects();
  }, [photo.id]);

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

  const loadPhotoUrl = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('photos')
        .createSignedUrl(photo.file_path, 3600); // 1 hour expiry

      if (error) throw error;
      if (data?.signedUrl) {
        setPhotoUrl(data.signedUrl);
      }
    } catch (error) {
      console.error('Error loading photo URL:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('photo_comments')
        .select('*')
        .eq('photo_id', photo.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const tagsArray = editedData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const { error } = await supabase
        .from('photos')
        .update({
          title: editedData.title,
          description: editedData.description || null,
          category: editedData.category,
          location: editedData.location || null,
          weather: editedData.weather || null,
          tags: tagsArray,
          project_id: editedData.project_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', photo.id);

      if (error) throw error;

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating photo:', error);
      alert('Failed to update photo');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSendingComment(true);
    try {
      const { error } = await supabase
        .from('photo_comments')
        .insert({
          photo_id: photo.id,
          user_id: user?.id,
          comment: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    } finally {
      setSendingComment(false);
    }
  };

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('photos')
        .download(photo.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.title || 'photo';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading photo:', error);
      alert('Failed to download photo');
    }
  };


  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="w-full h-full flex">
        {/* Image Area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <img
            src={photoUrl}
            alt={photo.title}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Info Panel */}
        <div className="w-96 bg-white h-full overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h2 className="font-semibold text-gray-900 truncate">Photo Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 space-y-6">
            {/* Title and Description */}
            <div>
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editedData.title}
                      onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={editedData.description}
                      onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project
                    </label>
                    <select
                      value={editedData.project_id}
                      onChange={(e) => setEditedData({ ...editedData, project_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      value={editedData.category}
                      onChange={(e) => setEditedData({ ...editedData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={editedData.location}
                      onChange={(e) => setEditedData({ ...editedData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weather
                    </label>
                    <input
                      type="text"
                      value={editedData.weather}
                      onChange={(e) => setEditedData({ ...editedData, weather: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={editedData.tags}
                      onChange={(e) => setEditedData({ ...editedData, tags: e.target.value })}
                      placeholder="Enter tags separated by commas"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{photo.title}</h3>
                  {photo.description && (
                    <p className="text-gray-600 text-sm">{photo.description}</p>
                  )}
                </>
              )}
            </div>

            {/* Metadata */}
            <div className="space-y-3 text-sm">
              <div className="flex items-start">
                <Calendar className="text-gray-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-gray-500">Taken on</p>
                  <p className="text-gray-900">
                    {new Date(photo.taken_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <User className="text-gray-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-gray-500">Uploaded by</p>
                  <p className="text-gray-900">User</p>
                </div>
              </div>

              {!isEditing && photo.location && (
                <div className="flex items-start">
                  <MapPin className="text-gray-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p className="text-gray-900">{photo.location}</p>
                  </div>
                </div>
              )}

              {!isEditing && photo.weather && (
                <div className="flex items-start">
                  <Cloud className="text-gray-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-gray-500">Weather</p>
                    <p className="text-gray-900">{photo.weather}</p>
                  </div>
                </div>
              )}

              {!isEditing && photo.tags.length > 0 && (
                <div className="flex items-start">
                  <Tag className="text-gray-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-gray-500 mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {photo.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-200 text-xs text-gray-500">
                <p>Dimensions: {photo.width} × {photo.height}px</p>
                <p>File Size: {formatFileSize(photo.file_size)}</p>
                <p>Format: {photo.mime_type}</p>
              </div>
            </div>

            {/* Comments */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <MessageCircle size={18} className="mr-2" />
                Comments ({comments.length})
              </h4>

              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {comments.map(comment => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        User
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.comment}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  type="submit"
                  disabled={sendingComment || !newComment.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedData({
                      title: photo.title,
                      description: photo.description || '',
                      category: photo.category,
                      location: photo.location || '',
                      weather: photo.weather || '',
                      tags: photo.tags.join(', '),
                      project_id: photo.project_id,
                    });
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
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
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  <Download size={18} className="mr-2" />
                  Download
                </button>
                {photo.taken_by === user?.id && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <Edit size={18} className="mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(photo.id, photo.file_path)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
