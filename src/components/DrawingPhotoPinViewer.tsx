import { useState, useEffect } from 'react';
import { X, Camera, Calendar, MapPin, Edit, Download, Trash2, Plus, Eye, Edit3, Move } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PhotoEditModal from './PhotoEditModal';
import PhotoPreviewModal from './PhotoPreviewModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface PhotoPin {
  id: string;
  sheet_id: string;
  photo_id: string;
  x_coordinate: number;
  y_coordinate: number;
  label: string;
  description: string;
  sequence: number;
  created_by: string;
  created_at: string;
  photos?: {
    id: string;
    title: string;
    description: string | null;
    file_path: string;
    taken_at: string;
    category: string;
    taken_by: string;
    location: string | null;
  };
}

interface DrawingPhotoPinViewerProps {
  sheetId: string;
  x: number;
  y: number;
  onClose: () => void;
  onUpdate: () => void;
  onAddMore?: () => void;
  onMovePin?: (pinId: string) => void;
}

const CATEGORIES = [
  { value: 'progress', label: 'Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'safety', label: 'Safety', color: 'bg-red-100 text-red-800' },
  { value: 'quality', label: 'Quality', color: 'bg-green-100 text-green-800' },
  { value: 'issue', label: 'Issue', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'equipment', label: 'Equipment', color: 'bg-purple-100 text-purple-800' },
  { value: 'team', label: 'Team', color: 'bg-pink-100 text-pink-800' },
  { value: 'site', label: 'Site', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' },
];

export default function DrawingPhotoPinViewer({
  sheetId,
  x,
  y,
  onClose,
  onUpdate,
  onAddMore,
  onMovePin,
}: DrawingPhotoPinViewerProps) {
  const { user } = useAuth();
  const [pins, setPins] = useState<PhotoPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [pinInfo, setPinInfo] = useState<{ label: string; description: string } | null>(null);
  const [isEditingPinInfo, setIsEditingPinInfo] = useState(false);
  const [pinInfoForm, setPinInfoForm] = useState({ label: '', description: '' });
  const [savingPinInfo, setSavingPinInfo] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; filePath: string } | null>(null);
  const [showDeletePinModal, setShowDeletePinModal] = useState(false);
  const [deletingPin, setDeletingPin] = useState(false);

  const tolerance = 0.05;

  useEffect(() => {
    fetchPhotoPins();
  }, [sheetId, x, y]);

  const fetchPhotoPins = async () => {
    try {
      const { data, error } = await supabase
        .from('drawing_photo_pins')
        .select('*, photos(*)')
        .eq('sheet_id', sheetId)
        .gte('x_coordinate', x - tolerance)
        .lte('x_coordinate', x + tolerance)
        .gte('y_coordinate', y - tolerance)
        .lte('y_coordinate', y + tolerance)
        .order('sequence', { ascending: true });

      if (error) throw error;
      setPins(data || []);

      // Set pin info from first pin
      if (data && data.length > 0) {
        setPinInfo({
          label: data[0].label || '',
          description: data[0].description || '',
        });
        setPinInfoForm({
          label: data[0].label || '',
          description: data[0].description || '',
        });
      }

      // Load photo URLs
      if (data) {
        const urls: Record<string, string> = {};
        for (const pin of data) {
          if (pin.photos?.file_path) {
            const { data: urlData } = await supabase.storage
              .from('photos')
              .createSignedUrl(pin.photos.file_path, 3600);
            if (urlData?.signedUrl) {
              urls[pin.photo_id] = urlData.signedUrl;
            }
          }
        }
        setPhotoUrls(urls);
      }
    } catch (error) {
      console.error('Error fetching photo pins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePinInfo = async () => {
    setSavingPinInfo(true);
    try {
      // Update all pins at this location with the same label/description
      const pinIds = pins.map(p => p.id);
      const { error } = await supabase
        .from('drawing_photo_pins')
        .update({
          label: pinInfoForm.label,
          description: pinInfoForm.description,
        })
        .in('id', pinIds);

      if (error) throw error;

      setPinInfo(pinInfoForm);
      setIsEditingPinInfo(false);
      fetchPhotoPins();
      onUpdate();
    } catch (error) {
      console.error('Error updating pin info:', error);
      alert('Failed to update pin information');
    } finally {
      setSavingPinInfo(false);
    }
  };

  const handleDeletePin = async (pinId: string) => {
    try {
      const { error } = await supabase
        .from('drawing_photo_pins')
        .delete()
        .eq('id', pinId);

      if (error) throw error;

      fetchPhotoPins();
      onUpdate();
    } catch (error) {
      console.error('Error deleting pin:', error);
      alert('Failed to remove photo from pin');
    }
  };

  const confirmDeletePin = (pinId: string, filePath: string) => {
    setDeleteTarget({ id: pinId, filePath });
    setShowDeleteModal(true);
  };

  const handleDeleteAllPins = async () => {
    setDeletingPin(true);
    try {
      // Delete all pins at this location
      const { error } = await supabase
        .from('drawing_photo_pins')
        .delete()
        .eq('sheet_id', sheetId)
        .gte('x_coordinate', x - tolerance)
        .lte('x_coordinate', x + tolerance)
        .gte('y_coordinate', y - tolerance)
        .lte('y_coordinate', y + tolerance);

      if (error) throw error;

      setShowDeletePinModal(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting pin:', error);
      alert('Failed to delete pin');
      setDeletingPin(false);
    }
  };

  const getCategoryColor = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.color || 'bg-gray-100 text-gray-800';
  };

  const getPhotoUrl = (photoId: string) => {
    return photoUrls[photoId] || '';
  };

  // Group photos by date
  const photosByDate: { [date: string]: PhotoPin[] } = {};
  pins.forEach(pin => {
    if (pin.photos) {
      const date = new Date(pin.photos.taken_at).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!photosByDate[date]) {
        photosByDate[date] = [];
      }
      photosByDate[date].push(pin);
    }
  });

  const dateKeys = Object.keys(photosByDate);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (pins.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">No Photos Found</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <div className="text-center py-8">
            <Camera className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-600 mb-4">No photos attached to this location</p>
            {onAddMore && (
              <button
                onClick={onAddMore}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
              >
                <Plus size={16} className="mr-2" />
                Add Photo
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              Progress Photos {pinInfo?.label && `- ${pinInfo.label}`}
            </h2>
            <p className="text-sm text-gray-500">
              {pins.length} {pins.length === 1 ? 'photo' : 'photos'} at this location
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeletePinModal(true)}
              className="text-red-600 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-lg"
              title="Delete Pin"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Pin Information Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-blue-900 flex items-center">
                <MapPin size={16} className="mr-2" />
                Pin Information
              </h3>
              {!isEditingPinInfo && (
                <button
                  onClick={() => {
                    setPinInfoForm({
                      label: pinInfo?.label || '',
                      description: pinInfo?.description || '',
                    });
                    setIsEditingPinInfo(true);
                  }}
                  className="text-blue-700 hover:text-blue-900 transition-colors"
                  title="Edit pin information"
                >
                  <Edit size={16} />
                </button>
              )}
            </div>
            {isEditingPinInfo ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Location Label
                  </label>
                  <input
                    type="text"
                    value={pinInfoForm.label}
                    onChange={(e) => setPinInfoForm({ ...pinInfoForm, label: e.target.value })}
                    placeholder="e.g., Column A5, North Wall, Room 101"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={pinInfoForm.description}
                    onChange={(e) => setPinInfoForm({ ...pinInfoForm, description: e.target.value })}
                    placeholder="Describe what you're tracking at this location..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePinInfo}
                    disabled={savingPinInfo}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
                  >
                    {savingPinInfo ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setIsEditingPinInfo(false)}
                    disabled={savingPinInfo}
                    className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {pinInfo?.label && (
                  <p className="text-sm text-gray-900 font-medium">{pinInfo.label}</p>
                )}
                {pinInfo?.description && (
                  <p className="text-sm text-gray-700">{pinInfo.description}</p>
                )}
                {!pinInfo?.label && !pinInfo?.description && (
                  <p className="text-sm text-gray-500 italic">No pin details added</p>
                )}
                <p className="text-xs text-gray-600 mt-2">
                  Location: X: {(x * 100).toFixed(1)}%, Y: {(y * 100).toFixed(1)}%
                </p>
                {onMovePin && pins.length > 0 && (
                  <button
                    onClick={() => {
                      onMovePin(pins[0].id);
                      onClose();
                    }}
                    className="mt-3 w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm font-medium"
                  >
                    <Move size={16} className="mr-2" />
                    Move Pin Location
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Progress Timeline */}
          {pins.length > 1 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Progress Timeline</p>
              <div className="flex items-center gap-2">
                {pins.map((pin, idx) => (
                  <div
                    key={pin.id}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      idx === 0 ? 'bg-green-500' : idx === pins.length - 1 ? 'bg-blue-600' : 'bg-blue-400'
                    }`}
                    title={`Photo ${idx + 1} - ${pin.photos?.taken_at ? new Date(pin.photos.taken_at).toLocaleDateString() : ''}`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Oldest</span>
                <span>Latest</span>
              </div>
            </div>
          )}

          {/* Add More Photos Button */}
          {onAddMore && (
            <div className="flex justify-center">
              <button
                onClick={onAddMore}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
              >
                <Plus size={20} />
                Add More Photos to This Pin
              </button>
            </div>
          )}

          {/* Photos Grouped by Date */}
          <div className="space-y-6">
            {dateKeys.length === 0 && pins.length > 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <Camera className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-600 mb-2">No photos attached to this pin yet</p>
                <p className="text-sm text-gray-500">Use the button above to add photos</p>
              </div>
            )}
            {dateKeys.map(date => (
              <div key={date} className="space-y-3">
                <h3 className="text-base font-semibold text-gray-700">{date}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {photosByDate[date].map(pin => {
                    const photo = pin.photos!;
                    const isExpanded = expandedPhoto === photo.id;

                    return (
                      <div
                        key={pin.id}
                        className={`relative bg-white rounded-lg border transition-all ${
                          isExpanded
                            ? 'col-span-2 row-span-2 border-blue-500 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div
                          onClick={() => setExpandedPhoto(isExpanded ? null : photo.id)}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setSelectedPhoto(photo);
                            setShowPreviewModal(true);
                          }}
                          className="cursor-pointer"
                        >
                          <div className={`relative ${isExpanded ? 'aspect-square' : 'aspect-square'} bg-gray-100 overflow-hidden rounded-t-lg`}>
                            <img
                              src={getPhotoUrl(pin.photo_id)}
                              alt={photo.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {!isExpanded && (
                              <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${getCategoryColor(photo.category)}`}>
                                {CATEGORIES.find(c => c.value === photo.category)?.label.charAt(0)}
                              </span>
                            )}
                          </div>

                          {isExpanded && (
                            <div className="p-3 space-y-2">
                              <h4 className="font-medium text-sm text-gray-900 line-clamp-2">{photo.title}</h4>
                              {photo.description && (
                                <p className="text-xs text-gray-600 line-clamp-2">{photo.description}</p>
                              )}
                              <div className="flex items-center text-xs text-gray-500">
                                <Calendar size={10} className="mr-1" />
                                {new Date(photo.taken_at).toLocaleDateString()}
                              </div>
                              {photo.location && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <MapPin size={10} className="mr-1" />
                                  <span className="truncate">{photo.location}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 pt-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPhoto(photo);
                                    setShowPreviewModal(true);
                                  }}
                                  className="flex-1 p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                  title="Preview"
                                >
                                  <Eye size={14} className="mx-auto" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPhoto(photo);
                                    setShowEditModal(true);
                                  }}
                                  className="flex-1 p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                                  title="Edit"
                                >
                                  <Edit size={14} className="mx-auto" />
                                </button>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const { data, error } = await supabase.storage
                                      .from('photos')
                                      .download(photo.file_path);

                                    if (!error && data) {
                                      const url = URL.createObjectURL(data);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = photo.title || 'photo';
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      URL.revokeObjectURL(url);
                                    }
                                  }}
                                  className="flex-1 p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                  title="Download"
                                >
                                  <Download size={14} className="mx-auto" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDeletePin(pin.id, photo.file_path);
                                  }}
                                  className="flex-1 p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                  title="Remove from Pin"
                                >
                                  <Trash2 size={14} className="mx-auto" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEditModal && selectedPhoto && (
        <PhotoEditModal
          photo={selectedPhoto}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPhoto(null);
          }}
          onSuccess={() => {
            fetchPhotoPins();
            setShowEditModal(false);
            setSelectedPhoto(null);
          }}
        />
      )}

      {showPreviewModal && selectedPhoto && (
        <PhotoPreviewModal
          photos={pins.map(p => p.photos!)}
          currentPhotoId={selectedPhoto.id}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedPhoto(null);
          }}
        />
      )}

      {showDeleteModal && deleteTarget && (
        <DeleteConfirmModal
          title="Remove Photo from Pin"
          message="Are you sure you want to remove this photo from the pin? The photo will still exist in the Photos module."
          onConfirm={async () => {
            await handleDeletePin(deleteTarget.id);
            setShowDeleteModal(false);
            setDeleteTarget(null);
          }}
          onCancel={() => {
            setShowDeleteModal(false);
            setDeleteTarget(null);
          }}
        />
      )}

      {showDeletePinModal && (
        <DeleteConfirmModal
          title="Delete Photo Pin"
          message={`Are you sure you want to delete this entire pin? All ${pins.length} photo${pins.length > 1 ? 's' : ''} will be removed from this pin location. The photos themselves will remain in the Photos module.`}
          confirmText="Delete Pin"
          onConfirm={handleDeleteAllPins}
          onCancel={() => setShowDeletePinModal(false)}
          isDeleting={deletingPin}
        />
      )}
    </div>
  );
}
