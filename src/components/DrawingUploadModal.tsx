import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { supabase, type Project } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProjectLocation {
  id: string;
  name: string;
  parent_id: string | null;
}

interface DrawingUploadModalProps {
  projects: Project[];
  onClose: () => void;
  onDrawingUploaded: () => void;
}

export default function DrawingUploadModal({ projects, onClose, onDrawingUploaded }: DrawingUploadModalProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [locations, setLocations] = useState<ProjectLocation[]>([]);

  const [formData, setFormData] = useState({
    project_id: '',
    drawing_number: '',
    title: '',
    discipline: 'Architectural',
    revision: 'A',
    status: 'draft' as const,
    notes: '',
    location_id: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
    if (formData.project_id) {
      loadLocations(formData.project_id);
    } else {
      setLocations([]);
    }
  }, [formData.project_id]);

  async function loadLocations(projectId: string) {
    try {
      const { data, error } = await supabase
        .from('project_locations')
        .select('id, name, parent_id')
        .eq('project_id', projectId)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setLocations(data || []);
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  }

  function buildLocationPath(locationId: string): string {
    const location = locations.find(l => l.id === locationId);
    if (!location) return '';

    if (location.parent_id) {
      const parentPath = buildLocationPath(location.parent_id);
      return parentPath ? `${parentPath} > ${location.name}` : location.name;
    }

    return location.name;
  }

  const processFile = (file: File) => {
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 50MB');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, JPG, PNG, TIFF, and Excel files are allowed');
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    if (!formData.project_id) {
      setError('Please select a project');
      return;
    }

    if (!formData.drawing_number || !formData.title) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setUploading(true);

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${formData.project_id}/${Date.now()}-${formData.drawing_number.replace(/\s+/g, '_')}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('drawings')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('drawings')
        .insert({
          project_id: formData.project_id,
          drawing_number: formData.drawing_number,
          title: formData.title,
          discipline: formData.discipline,
          revision: formData.revision,
          file_url: uploadData.path,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          status: formData.status,
          notes: formData.notes,
          location_id: formData.location_id || null,
          uploaded_by: user?.id || null,
        });

      if (insertError) throw insertError;

      onDrawingUploaded();
    } catch (err) {
      console.error('Error uploading drawing:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload drawing');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Upload className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Upload Drawing</h2>
              <p className="text-sm text-gray-600">Add a new drawing to your project</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Drawing File <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.tiff,.xls,.xlsx"
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex items-center justify-center space-x-2">
                  <FileText className="text-blue-600" size={24} />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className={`mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} size={32} />
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, TIFF, or Excel (max 50MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value, location_id: '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location Selection */}
          {formData.project_id && locations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No specific location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {buildLocationPath(location.id)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Drawing Number and Revision */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Drawing Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.drawing_number}
                onChange={(e) => setFormData({ ...formData, drawing_number: e.target.value })}
                placeholder="e.g., A-101"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Revision <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.revision}
                onChange={(e) => setFormData({ ...formData, revision: e.target.value })}
                placeholder="e.g., A, B, C"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Drawing Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Ground Floor Plan"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Discipline and Status */}
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

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes or comments..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Upload Drawing</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
