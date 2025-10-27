import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, Eye } from 'lucide-react';
import { supabase, type Project, type DrawingSet } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DrawingSheetUploadModalProps {
  projects: Project[];
  sets: DrawingSet[];
  onClose: () => void;
  onDrawingUploaded: () => void;
}

export default function DrawingSheetUploadModal({ projects, sets, onClose, onDrawingUploaded }: DrawingSheetUploadModalProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>('');

  const [formData, setFormData] = useState({
    project_id: '',
    set_id: '',
    sheet_number: '',
    sheet_name: '',
    discipline: 'Architectural',
    version_number: '1',
    status: 'draft' as const,
    changes_description: '',
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
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

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

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setFilePreviewUrl(previewUrl);

    const fileName = file.name.replace(/\.[^/.]+$/, '');
    const match = fileName.match(/([A-Z]-?\d+)/i);
    if (match && !formData.sheet_number) {
      setFormData(prev => ({ ...prev, sheet_number: match[0] }));
    }
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
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

    if (!formData.sheet_number || !formData.sheet_name) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setUploading(true);

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${formData.project_id}/${Date.now()}-${formData.sheet_number.replace(/\s+/g, '_')}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('drawings')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: sheetData, error: sheetError } = await supabase
        .from('drawing_sheets')
        .insert({
          project_id: formData.project_id,
          set_id: formData.set_id || null,
          sheet_number: formData.sheet_number,
          sheet_name: formData.sheet_name,
          discipline: formData.discipline,
          status: formData.status,
        })
        .select()
        .single();

      if (sheetError) throw sheetError;

      const { data: versionData, error: versionError } = await supabase
        .from('drawing_versions')
        .insert({
          sheet_id: sheetData.id,
          version_number: formData.version_number,
          file_url: uploadData.path,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          changes_description: formData.changes_description,
          uploaded_by: user?.id || null,
          is_current: true,
        })
        .select()
        .single();

      if (versionError) throw versionError;

      const { error: updateError } = await supabase
        .from('drawing_sheets')
        .update({ current_version_id: versionData.id })
        .eq('id', sheetData.id);

      if (updateError) throw updateError;

      onDrawingUploaded();
    } catch (err) {
      console.error('Error uploading drawing:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload drawing');
    } finally {
      setUploading(false);
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

  const isPDF = selectedFile?.type === 'application/pdf';
  const isImage = selectedFile?.type.startsWith('image/');

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Upload className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Upload Drawing Sheet</h2>
              <p className="text-sm text-gray-600">Add a new drawing sheet with version tracking</p>
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

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
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
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.project_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drawing Set (Optional)
                  </label>
                  <select
                    value={formData.set_id}
                    onChange={(e) => setFormData({ ...formData, set_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No Set (Unorganized)</option>
                    {hierarchicalSets.map(({ set, displayName }) => (
                      <option key={set.id} value={set.id}>
                        {displayName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
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
                    Version Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.version_number}
                    onChange={(e) => setFormData({ ...formData, version_number: e.target.value })}
                    placeholder="e.g., 1, A, Rev 1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
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
                  Changes Description (Optional)
                </label>
                <textarea
                  value={formData.changes_description}
                  onChange={(e) => setFormData({ ...formData, changes_description: e.target.value })}
                  placeholder="Describe what's new in this version..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Eye size={16} className="inline mr-1" />
                Preview
              </label>
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50" style={{ height: 'calc(100% - 32px)' }}>
                {selectedFile ? (
                  isPDF ? (
                    <object
                      data={filePreviewUrl}
                      type="application/pdf"
                      className="w-full h-full"
                    >
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center p-8">
                          <FileText size={48} className="mx-auto mb-2" />
                          <p className="text-sm">PDF preview unavailable</p>
                          <p className="text-xs mt-1">File will be uploaded normally</p>
                        </div>
                      </div>
                    </object>
                  ) : isImage ? (
                    <img
                      src={filePreviewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center p-8">
                        <FileText size={48} className="mx-auto mb-2" />
                        <p className="text-sm">Preview not available</p>
                        <p className="text-xs mt-1">{selectedFile.name}</p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <Eye size={48} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Select a file to preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
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
