import { useState, useEffect, useRef } from 'react';
import { X, Save, Camera, Image as ImageIcon, MapPin, Upload, FolderOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Photo {
  id: string;
  title: string;
  file_path: string;
  taken_at: string;
  category: string;
  project_id: string;
}

interface DrawingPhotoAttachModalProps {
  sheetId: string;
  projectId: string;
  x: number;
  y: number;
  onClose: () => void;
  onSuccess: () => void;
  addToExistingPin?: boolean;
}

type TabType = 'existing' | 'upload' | 'camera';

export default function DrawingPhotoAttachModal({
  sheetId,
  projectId,
  x,
  y,
  onClose,
  onSuccess,
  addToExistingPin = false,
}: DrawingPhotoAttachModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('camera');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    label: '',
    description: '',
  });

  // Upload state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [uploadMetadata, setUploadMetadata] = useState({
    title: '',
    category: 'progress',
  });
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchProjectPhotos();
  }, [projectId]);

  useEffect(() => {
    // Cleanup camera stream when modal closes or tab changes
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const fetchProjectPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('project_id', projectId)
        .order('taken_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);

      // Load thumbnails for photos
      if (data) {
        const urls: Record<string, string> = {};
        for (const photo of data.slice(0, 20)) {
          const { data: urlData } = await supabase.storage
            .from('photos')
            .createSignedUrl(photo.file_path, 3600);
          if (urlData?.signedUrl) {
            urls[photo.id] = urlData.signedUrl;
          }
        }
        setPhotoUrls(urls);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    setUploadFiles(prev => [...prev, ...imageFiles]);

    // Generate previews for new files
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
    setUploadPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearUploadFiles = () => {
    setUploadFiles([]);
    setUploadPreviews([]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleUploadAndAttach = async () => {
    if (uploadFiles.length === 0) {
      alert('Please select at least one file to upload');
      return;
    }

    setUploading(true);
    try {
      // Upload all files
      for (let i = 0; i < uploadFiles.length; i++) {
        const uploadFile = uploadFiles[i];

        // Upload file to storage
        const fileExt = uploadFile.name.split('.').pop();
        const fileName = `${projectId}/${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, uploadFile, {
            contentType: uploadFile.type,
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Create photo record
        const title = uploadFiles.length > 1
          ? uploadFile.name.replace(/\.[^/.]+$/, '')
          : (uploadMetadata.title.trim() || uploadFile.name.replace(/\.[^/.]+$/, ''));

        const { data: photoData, error: photoError } = await supabase
          .from('photos')
          .insert({
            project_id: projectId,
            title: title,
            description: formData.description || null,
            category: uploadMetadata.category,
            file_path: fileName,
            file_size: uploadFile.size,
            mime_type: uploadFile.type,
            taken_at: new Date().toISOString(),
            taken_by: user?.id,
          })
          .select()
          .single();

        if (photoError) {
          console.error('Photo record error:', photoError);
          throw new Error(`Database insert failed: ${photoError.message}`);
        }

        // Attach to drawing (don't call onSuccess inside the loop)
        await attachPhotoToDrawing(photoData.id, false);
      }

      // Call onSuccess only once after all photos are processed
      onSuccess();
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      alert(`Failed to upload photo: ${error.message || 'Unknown error'}`);
      setUploading(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setStream(mediaStream);
      setCameraError('');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraError('Unable to access camera. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImages(prev => [...prev, imageData]);
      }
    }
  };

  const removeCapturedImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const clearCapturedImages = () => {
    setCapturedImages([]);
  };

  const handleCaptureAndAttach = async () => {
    if (capturedImages.length === 0) {
      alert('Please capture at least one photo first');
      return;
    }

    setUploading(true);
    try {
      // Process all captured images
      for (let i = 0; i < capturedImages.length; i++) {
        const capturedImage = capturedImages[i];

        // Convert base64 to blob with proper MIME type
        const base64Data = capturedImage.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let j = 0; j < byteCharacters.length; j++) {
          byteNumbers[j] = byteCharacters.charCodeAt(j);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });

        // Upload file to storage
        const fileName = `${projectId}/${Date.now()}_${i}_camera.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Create photo record
        const title = capturedImages.length > 1
          ? `Photo ${i + 1}`
          : (uploadMetadata.title.trim() || 'Photo');

        const { data: photoData, error: photoError } = await supabase
          .from('photos')
          .insert({
            project_id: projectId,
            title: title,
            description: formData.description || null,
            category: uploadMetadata.category,
            file_path: fileName,
            file_size: blob.size,
            mime_type: 'image/jpeg',
            taken_at: new Date().toISOString(),
            taken_by: user?.id,
          })
          .select()
          .single();

        if (photoError) {
          console.error('Photo record error:', photoError);
          throw new Error(`Database insert failed: ${photoError.message}`);
        }

        // Attach to drawing (don't call onSuccess inside the loop)
        await attachPhotoToDrawing(photoData.id, false);
      }

      // Call onSuccess only once after all photos are processed
      onSuccess();
    } catch (error: any) {
      console.error('Error saving captured photo:', error);
      alert(`Failed to save captured photo: ${error.message || 'Unknown error'}`);
      setUploading(false);
    }
  };

  const attachPhotoToDrawing = async (photoId: string | null, callOnSuccess: boolean = true) => {
    try {
      const tolerance = 0.001;

      // When adding to existing pin, get label/description from existing pins at this location
      let pinLabel = formData.label;
      let pinDescription = formData.description;

      // Check for existing pins at this location
      const { data: existingPinsAtLocation } = await supabase
        .from('drawing_photo_pins')
        .select('id, photo_id, label, description, sequence')
        .eq('sheet_id', sheetId)
        .gte('x_coordinate', x - tolerance)
        .lte('x_coordinate', x + tolerance)
        .gte('y_coordinate', y - tolerance)
        .lte('y_coordinate', y + tolerance)
        .order('sequence', { ascending: true });

      if (addToExistingPin && existingPinsAtLocation && existingPinsAtLocation.length > 0) {
        pinLabel = existingPinsAtLocation[0].label || '';
        pinDescription = existingPinsAtLocation[0].description || '';
      }

      // If adding a photo (photoId is not null) and there's an empty pin (photo_id is null), update it instead of creating new
      if (photoId && existingPinsAtLocation && existingPinsAtLocation.length > 0) {
        const emptyPin = existingPinsAtLocation.find(pin => pin.photo_id === null);

        if (emptyPin) {
          // Update the empty pin with the photo
          const { error } = await supabase
            .from('drawing_photo_pins')
            .update({
              photo_id: photoId,
              label: pinLabel,
              description: pinDescription,
            })
            .eq('id', emptyPin.id);

          if (error) throw error;

          if (callOnSuccess) {
            onSuccess();
          }
          return;
        }
      }

      // Get the next sequence number for this location
      const { data: existingPins } = await supabase
        .from('drawing_photo_pins')
        .select('sequence')
        .eq('sheet_id', sheetId)
        .order('sequence', { ascending: false })
        .limit(1);

      const nextSequence = existingPins && existingPins.length > 0
        ? (existingPins[0].sequence || 0) + 1
        : 1;

      // Create new pin
      const { error } = await supabase
        .from('drawing_photo_pins')
        .insert({
          sheet_id: sheetId,
          photo_id: photoId,
          x_coordinate: x,
          y_coordinate: y,
          label: pinLabel,
          description: pinDescription,
          sequence: nextSequence,
          created_by: user?.id,
        });

      if (error) throw error;

      if (callOnSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error attaching photo:', error);
      alert('Failed to attach photo to drawing');
      throw error;
    }
  };

  const handleCreateEmptyPin = async () => {
    setSaving(true);
    try {
      await attachPhotoToDrawing(null);
    } catch (error) {
      setSaving(false);
    }
  };

  const handleSubmitExisting = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPhotoIds.length === 0) {
      alert('Please select at least one photo');
      return;
    }

    setSaving(true);
    try {
      // Attach all selected photos
      for (const photoId of selectedPhotoIds) {
        await attachPhotoToDrawing(photoId, false);
      }
      // Call onSuccess only once after all photos are processed
      onSuccess();
    } catch (error) {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'camera' && !stream && capturedImages.length === 0) {
      startCamera();
    }
  }, [activeTab]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <MapPin className="mr-2 text-blue-600" size={24} />
            {addToExistingPin ? 'Add Photos to Pin' : 'Attach Photo to Drawing'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('existing')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'existing'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FolderOpen size={18} />
            <span>Existing Photos</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'upload'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload size={18} />
            <span>Upload New</span>
          </button>
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'camera'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Camera size={18} />
            <span>Take Photo</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Location:</strong> X: {(x * 100).toFixed(1)}%, Y: {(y * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-blue-600 mt-1">
              You can attach multiple photos to the same location over time to track progress.
            </p>
          </div>

          {!addToExistingPin && (
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Label (Optional)
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Column A5, North Wall, Room 101"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what you're tracking at this location..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Existing Photos Tab */}
          {activeTab === 'existing' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Photos * ({selectedPhotoIds.length} selected)
                </label>
                {selectedPhotoIds.length > 0 && (
                  <button
                    onClick={() => setSelectedPhotoIds([])}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : photos.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <Camera className="mx-auto text-gray-400 mb-2" size={48} />
                  <p className="text-gray-600 mb-2">No photos in this project</p>
                  <p className="text-sm text-gray-500">Switch to Upload or Camera tab to add photos</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {photos.map((photo) => {
                    const isSelected = selectedPhotoIds.includes(photo.id);
                    return (
                      <div
                        key={photo.id}
                        onClick={() => {
                          setSelectedPhotoIds(prev =>
                            isSelected
                              ? prev.filter(id => id !== photo.id)
                              : [...prev, photo.id]
                          );
                        }}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          isSelected
                            ? 'border-blue-600 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-blue-400'
                        }`}
                      >
                        {photoUrls[photo.id] ? (
                          <img
                            src={photoUrls[photo.id]}
                            alt={photo.title}
                            className="w-full h-32 object-cover"
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                            <ImageIcon className="text-gray-400" size={32} />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2">
                          <p className="truncate font-medium">{photo.title}</p>
                          <p className="text-gray-300 text-xs">
                            {new Date(photo.taken_at).toLocaleDateString()}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full px-4 py-8 border-2 border-dashed rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Upload size={48} className="mb-2" />
                  <span className="font-medium">
                    {isDragging ? 'Drop image here' : 'Click to select or drag & drop'}
                  </span>
                  <span className="text-sm text-gray-500 mt-1">JPG, PNG, or other image formats</span>
                </div>
              </div>

              {uploadPreviews.length > 0 && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Selected Photos ({uploadPreviews.length})
                      </label>
                      <button
                        onClick={clearUploadFiles}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                      {uploadPreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={uploadFiles[index]?.name || `Upload ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            onClick={() => removeUploadFile(index)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={16} />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 truncate">
                            {uploadFiles[index]?.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={uploadMetadata.category}
                      onChange={(e) => setUploadMetadata({ ...uploadMetadata, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="progress">Progress</option>
                      <option value="safety">Safety</option>
                      <option value="quality">Quality</option>
                      <option value="issue">Issue</option>
                      <option value="equipment">Equipment</option>
                      <option value="team">Team</option>
                      <option value="site">Site</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Camera Tab */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              {cameraError ? (
                <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
                  <Camera className="mx-auto text-red-400 mb-2" size={48} />
                  <p className="text-red-600 mb-4">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-96 object-contain"
                    />
                  </div>
                  <button
                    onClick={capturePhoto}
                    disabled={!stream}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center"
                  >
                    <Camera size={20} className="mr-2" />
                    Capture Photo {capturedImages.length > 0 && `(${capturedImages.length} captured)`}
                  </button>

                  {capturedImages.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Captured Photos ({capturedImages.length})
                        </label>
                        <button
                          onClick={clearCapturedImages}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                        {capturedImages.map((img, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={img}
                              alt={`Captured ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-300"
                            />
                            <button
                              onClick={() => removeCapturedImage(index)}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {capturedImages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={uploadMetadata.category}
                    onChange={(e) => setUploadMetadata({ ...uploadMetadata, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="progress">Progress</option>
                    <option value="safety">Safety</option>
                    <option value="quality">Quality</option>
                    <option value="issue">Issue</option>
                    <option value="equipment">Equipment</option>
                    <option value="team">Team</option>
                    <option value="site">Site</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
          {!addToExistingPin && (
            <button
              type="button"
              onClick={handleCreateEmptyPin}
              disabled={saving || uploading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition-colors flex items-center text-sm font-medium"
              title="Create a pin marker at this location without attaching photos yet"
            >
              <MapPin size={16} className="mr-2" />
              Create Pin Without Photo
            </button>
          )}
          <div className={`flex items-center gap-3 ${addToExistingPin ? 'ml-auto' : ''}`}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              disabled={saving || uploading}
            >
              Cancel
            </button>
            {activeTab === 'existing' && (
            <button
              onClick={handleSubmitExisting}
              disabled={saving || selectedPhotoIds.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Attaching...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Attach {selectedPhotoIds.length > 0 ? `${selectedPhotoIds.length} Photo${selectedPhotoIds.length > 1 ? 's' : ''}` : 'Photos'}
                </>
              )}
            </button>
          )}
          {activeTab === 'upload' && (
            <button
              onClick={handleUploadAndAttach}
              disabled={uploading || uploadFiles.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={18} className="mr-2" />
                  Upload & Attach {uploadFiles.length > 0 ? `${uploadFiles.length} Photo${uploadFiles.length > 1 ? 's' : ''}` : ''}
                </>
              )}
            </button>
          )}
          {activeTab === 'camera' && capturedImages.length > 0 && (
            <button
              onClick={handleCaptureAndAttach}
              disabled={uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Save & Attach {capturedImages.length > 0 ? `${capturedImages.length} Photo${capturedImages.length > 1 ? 's' : ''}` : ''}
                </>
              )}
            </button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
