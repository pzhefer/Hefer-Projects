import { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, FileText, Calendar, User, Package } from 'lucide-react';
import { supabase, type Drawing } from '../lib/supabase';

interface DrawingViewerProps {
  drawing: Drawing;
  onClose: () => void;
}

export default function DrawingViewer({ drawing, onClose }: DrawingViewerProps) {
  const [fileUrl, setFileUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    loadDrawing();
  }, [drawing]);

  const loadDrawing = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('drawings')
        .createSignedUrl(drawing.file_url, 3600);

      if (error) throw error;
      setFileUrl(data.signedUrl);
    } catch (error) {
      console.error('Error loading drawing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('drawings')
        .download(drawing.file_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = drawing.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading drawing:', error);
      alert('Failed to download drawing');
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isPDF = drawing.file_type === 'application/pdf';
  const isImage = drawing.file_type.startsWith('image/');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col z-50">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <FileText size={24} />
          <div>
            <h2 className="text-lg font-semibold">
              {drawing.drawing_number} - Rev {drawing.revision}
            </h2>
            <p className="text-sm text-gray-400">{drawing.title}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Zoom Controls */}
          {isImage && (
            <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
              <button
                onClick={handleZoomOut}
                className="text-gray-300 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={20} />
              </button>
              <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
              <button
                onClick={handleZoomIn}
                className="text-gray-300 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={20} />
              </button>
            </div>
          )}

          {/* Rotate */}
          {isImage && (
            <button
              onClick={handleRotate}
              className="bg-gray-800 text-gray-300 hover:text-white px-3 py-2 rounded-lg transition-colors"
              title="Rotate"
            >
              <RotateCw size={20} />
            </button>
          )}

          {/* Download */}
          <button
            onClick={handleDownload}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Download size={20} />
            <span>Download</span>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Drawing Viewer */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-8">
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              <p className="mt-4 text-white">Loading drawing...</p>
            </div>
          ) : isPDF ? (
            <iframe
              src={fileUrl}
              className="w-full h-full rounded-lg"
              title={drawing.title}
            />
          ) : isImage ? (
            <div className="overflow-auto max-w-full max-h-full">
              <img
                src={fileUrl}
                alt={drawing.title}
                className="max-w-full h-auto"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                  transition: 'transform 0.3s ease'
                }}
              />
            </div>
          ) : (
            <div className="text-center">
              <FileText className="mx-auto text-gray-400 mb-4" size={64} />
              <p className="text-white mb-4">Preview not available for this file type</p>
              <button
                onClick={handleDownload}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <Download size={20} />
                <span>Download to View</span>
              </button>
            </div>
          )}
        </div>

        {/* Info Sidebar */}
        <div className="w-80 bg-gray-900 text-white p-6 overflow-y-auto border-l border-gray-800">
          <h3 className="text-lg font-semibold mb-6">Drawing Information</h3>

          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-3">Basic Information</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Drawing Number</p>
                  <p className="text-sm font-medium mt-1">{drawing.drawing_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Revision</p>
                  <p className="text-sm font-medium mt-1">{drawing.revision}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Title</p>
                  <p className="text-sm font-medium mt-1">{drawing.title}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Discipline</p>
                  <p className="text-sm font-medium mt-1">{drawing.discipline}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-medium mt-1 capitalize">
                    {drawing.status.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>

            {/* File Info */}
            <div className="pt-6 border-t border-gray-800">
              <h4 className="text-sm font-medium text-gray-400 mb-3">File Information</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">File Name</p>
                  <p className="text-sm font-medium mt-1 break-all">{drawing.file_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">File Size</p>
                  <p className="text-sm font-medium mt-1">{formatFileSize(drawing.file_size)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">File Type</p>
                  <p className="text-sm font-medium mt-1">{drawing.file_type}</p>
                </div>
              </div>
            </div>

            {/* Upload Info */}
            <div className="pt-6 border-t border-gray-800">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Upload Information</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 flex items-center">
                    <Calendar size={12} className="mr-1" />
                    Uploaded
                  </p>
                  <p className="text-sm font-medium mt-1">{formatDate(drawing.created_at)}</p>
                </div>
                {drawing.updated_at !== drawing.created_at && (
                  <div>
                    <p className="text-xs text-gray-500 flex items-center">
                      <Calendar size={12} className="mr-1" />
                      Last Modified
                    </p>
                    <p className="text-sm font-medium mt-1">{formatDate(drawing.updated_at)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Approval Info */}
            {drawing.approved_at && (
              <div className="pt-6 border-t border-gray-800">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Approval Information</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Approved At</p>
                    <p className="text-sm font-medium mt-1">{formatDate(drawing.approved_at)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {drawing.notes && (
              <div className="pt-6 border-t border-gray-800">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Notes</h4>
                <p className="text-sm text-gray-300 leading-relaxed">{drawing.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
