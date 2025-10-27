import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, Star, Image as ImageIcon, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Camera, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DeleteConfirmModal from './DeleteConfirmModal';

interface StockItemImage {
  id: string;
  item_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  caption?: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

interface StockItemGalleryProps {
  itemId: string;
  itemName: string;
  onClose: () => void;
}

export default function StockItemGallery({ itemId, itemName, onClose }: StockItemGalleryProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<StockItemImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; image: StockItemImage | null }>({
    show: false,
    image: null
  });
  const [viewerMode, setViewerMode] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    loadImages();
  }, [itemId]);

  useEffect(() => {
    loadImageUrls();
  }, [images]);

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_item_images')
        .select('*')
        .eq('item_id', itemId)
        .order('display_order');

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadImageUrls = async () => {
    const urls: Record<string, string> = {};
    for (const image of images) {
      try {
        const { data } = await supabase.storage
          .from('stock-item-images')
          .createSignedUrl(image.file_path, 3600);

        if (data) {
          urls[image.id] = data.signedUrl;
        }
      } catch (error) {
        console.error('Error loading image URL:', error);
      }
    }
    setImageUrls(urls);
  };

  const processFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      alert('Please select valid image files');
      return;
    }

    setSelectedFiles(imageFiles);
    const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
    previews.forEach(url => URL.revokeObjectURL(url));
    setPreviews(newPreviews);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
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

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const removePreview = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    URL.revokeObjectURL(previews[index]);

    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${itemId}/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('stock-item-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const maxOrder = images.length > 0 ? Math.max(...images.map(img => img.display_order)) : 0;

        const { error: dbError } = await supabase
          .from('stock_item_images')
          .insert([{
            item_id: itemId,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            is_primary: images.length === 0 && i === 0,
            display_order: maxOrder + i + 1,
            uploaded_by: user?.id
          }]);

        if (dbError) throw dbError;
      }

      setSelectedFiles([]);
      previews.forEach(url => URL.revokeObjectURL(url));
      setPreviews([]);
      loadImages();
    } catch (error: any) {
      console.error('Error uploading images:', error);
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await supabase
        .from('stock_item_images')
        .update({ is_primary: false })
        .eq('item_id', itemId);

      const { error } = await supabase
        .from('stock_item_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      if (error) throw error;
      loadImages();
    } catch (error: any) {
      console.error('Error setting primary image:', error);
      alert(error.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.image) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('stock-item-images')
        .remove([deleteConfirm.image.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('stock_item_images')
        .delete()
        .eq('id', deleteConfirm.image.id);

      if (dbError) throw dbError;

      setDeleteConfirm({ show: false, image: null });
      loadImages();
    } catch (error: any) {
      console.error('Error deleting image:', error);
      alert(error.message);
    }
  };

  const openViewer = (index: number) => {
    setCurrentImageIndex(index);
    setViewerMode(true);
    setZoom(1);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
    setZoom(1);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoom(1);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Loading images...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Photo Gallery</h2>
              <p className="text-gray-600 mt-1">{itemName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            <div className="mb-6">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-4">
                  Drag and drop images here, or click to select
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    Browse Files
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    Capture Photo
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  {...({ capture: true } as any)}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {previews.length > 0 && (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">{previews.length} file(s) selected</h3>
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>Uploading...</>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Upload All
                        </>
                      )}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {previews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removePreview(index)}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {images.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No images uploaded yet</p>
              </div>
            ) : (
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Uploaded Images ({images.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-all hover:shadow-lg"
                      style={{
                        borderColor: image.is_primary ? '#f59e0b' : 'transparent'
                      }}
                    >
                    {imageUrls[image.id] ? (
                      <img
                        src={imageUrls[image.id]}
                        alt={image.file_name}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => openViewer(index)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-300" />
                      </div>
                    )}

                      {image.is_primary && (
                        <div className="absolute top-2 left-2 bg-amber-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          Primary
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => handleSetPrimary(image.id)}
                          className="p-2 bg-white rounded-full hover:bg-amber-100"
                          title="Set as primary image"
                        >
                          <Star className={`w-4 h-4 ${image.is_primary ? 'fill-amber-500 text-amber-500' : 'text-gray-600'}`} />
                        </button>
                      <button
                        onClick={() => setDeleteConfirm({ show: true, image })}
                        className="p-2 bg-white rounded-full hover:bg-red-100"
                        title="Delete image"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent text-white text-xs p-2 truncate">
                        {image.file_name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>{images.length} image{images.length !== 1 ? 's' : ''}</span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewerMode && images.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60]">
          <button
            onClick={() => setViewerMode(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={prevImage}
            className="absolute left-4 text-white hover:text-gray-300 z-10"
            disabled={images.length <= 1}
          >
            <ChevronLeft className="w-12 h-12" />
          </button>

          <button
            onClick={nextImage}
            className="absolute right-4 text-white hover:text-gray-300 z-10"
            disabled={images.length <= 1}
          >
            <ChevronRight className="w-12 h-12" />
          </button>

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black bg-opacity-75 px-6 py-3 rounded-full">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              className="text-white hover:text-gray-300"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-white text-sm">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              className="text-white hover:text-gray-300"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <span className="text-white text-sm ml-4">
              {currentImageIndex + 1} / {images.length}
            </span>
          </div>

          <div className="max-w-7xl max-h-[80vh] overflow-auto">
            {imageUrls[images[currentImageIndex].id] && (
              <img
                src={imageUrls[images[currentImageIndex].id]}
                alt={images[currentImageIndex].file_name}
                style={{ transform: `scale(${zoom})` }}
                className="transition-transform duration-200"
              />
            )}
          </div>
        </div>
      )}

      {deleteConfirm.show && (
        <DeleteConfirmModal
          onCancel={() => setDeleteConfirm({ show: false, image: null })}
          onConfirm={handleDelete}
          title="Delete Image"
          message={`Are you sure you want to delete "${deleteConfirm.image?.file_name}"?`}
        />
      )}
    </>
  );
}
