import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Calendar, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Photo {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  file_path: string;
  category: string;
  location: string | null;
  taken_at: string;
  tags: string[];
}

interface PhotoPreviewModalProps {
  photos: Photo[];
  currentPhotoId: string;
  onClose: () => void;
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

export default function PhotoPreviewModal({ photos, currentPhotoId, onClose }: PhotoPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(
    photos.findIndex(p => p.id === currentPhotoId)
  );
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    loadPhotoUrl();
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const loadPhotoUrl = async () => {
    if (!currentPhoto) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('photos')
        .createSignedUrl(currentPhoto.file_path, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        setPhotoUrl(data.signedUrl);
      }
    } catch (error) {
      console.error('Error loading photo URL:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('photos')
        .download(currentPhoto.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentPhoto.title || 'photo';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading photo:', error);
      alert('Failed to download photo');
    }
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  if (!currentPhoto) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black bg-opacity-50">
        <div className="flex-1 text-white">
          <h2 className="text-lg font-semibold truncate">{currentPhoto.title}</h2>
          <p className="text-sm text-gray-300">
            {currentIndex + 1} of {photos.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="Download"
          >
            <Download size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Image Area */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {loading ? (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        ) : (
          <img
            src={photoUrl}
            alt={currentPhoto.title}
            className="max-w-full max-h-full object-contain"
          />
        )}

        {/* Navigation Buttons */}
        {currentIndex > 0 && (
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-all"
          >
            <ChevronLeft size={32} />
          </button>
        )}

        {currentIndex < photos.length - 1 && (
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-all"
          >
            <ChevronRight size={32} />
          </button>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-black bg-opacity-50 p-4 text-white">
        <div className="max-w-4xl mx-auto">
          {currentPhoto.description && (
            <p className="text-sm mb-3">{currentPhoto.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-gray-300">
            <div className="flex items-center">
              <Calendar size={14} className="mr-1" />
              {new Date(currentPhoto.taken_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            {currentPhoto.location && (
              <div className="flex items-center">
                <MapPin size={14} className="mr-1" />
                {currentPhoto.location}
              </div>
            )}
            <div className="flex items-center">
              Category: {getCategoryLabel(currentPhoto.category)}
            </div>
          </div>
          {currentPhoto.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {currentPhoto.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-white bg-opacity-20 text-white rounded text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
