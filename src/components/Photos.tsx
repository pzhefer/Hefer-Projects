import { useState, useEffect } from 'react';
import {
  Camera, Upload, Filter, Search, Calendar, MapPin, Edit, Download, Trash2, Plus, CheckSquare, Square, X, Edit3, Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PhotoUploadModal from './PhotoUploadModal';
import PhotoEditModal from './PhotoEditModal';
import PhotoPreviewModal from './PhotoPreviewModal';
import PhotoBulkEditModal from './PhotoBulkEditModal';
import DeleteConfirmModal from './DeleteConfirmModal';

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

interface Project {
  id: string;
  name: string;
}

interface PhotosByDate {
  [date: string]: Photo[];
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

interface PhotosProps {
  globalSelectedProjects?: string[];
  globalSelectedStatuses?: string[];
}

export default function Photos({ globalSelectedProjects = [], globalSelectedStatuses = [] }: PhotosProps) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; filePath: string } | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | '7d' | '30d' | '90d' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setCurrentPage(1);
    }
  }, [user, selectedProject, selectedCategory, globalSelectedProjects, globalSelectedStatuses, selectedDateRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (user) {
      fetchPhotos();
    }
  }, [user, selectedProject, selectedCategory, globalSelectedProjects, globalSelectedStatuses, currentPage, selectedDateRange, customStartDate, customEndDate]);

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

  const fetchPhotos = async () => {
    try {
      setLoading(true);

      // Build base query with filters
      let countQuery = supabase
        .from('photos')
        .select('*', { count: 'exact', head: true });

      let dataQuery = supabase
        .from('photos')
        .select('*')
        .order('taken_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (globalSelectedProjects.length > 0) {
        countQuery = countQuery.in('project_id', globalSelectedProjects);
        dataQuery = dataQuery.in('project_id', globalSelectedProjects);
      } else if (selectedProject !== 'all') {
        countQuery = countQuery.eq('project_id', selectedProject);
        dataQuery = dataQuery.eq('project_id', selectedProject);
      }

      if (selectedCategory !== 'all') {
        countQuery = countQuery.eq('category', selectedCategory);
        dataQuery = dataQuery.eq('category', selectedCategory);
      }

      // Apply date range filter
      if (selectedDateRange !== 'all') {
        const now = new Date();
        let startDate: Date;

        if (selectedDateRange === '7d') {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (selectedDateRange === '30d') {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (selectedDateRange === '90d') {
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        } else if (selectedDateRange === 'custom' && customStartDate) {
          startDate = new Date(customStartDate);
          if (customEndDate) {
            const endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999);
            countQuery = countQuery.lte('taken_at', endDate.toISOString());
            dataQuery = dataQuery.lte('taken_at', endDate.toISOString());
          }
        } else {
          startDate = new Date(0);
        }

        countQuery = countQuery.gte('taken_at', startDate.toISOString());
        dataQuery = dataQuery.gte('taken_at', startDate.toISOString());
      }

      const [{ count }, { data, error }] = await Promise.all([
        countQuery,
        dataQuery
      ]);

      if (error) throw error;

      setTotalPhotos(count || 0);
      setPhotos(data || []);
      if (data && data.length > 0) {
        loadPhotoUrls(data);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotoUrls = async (photoList: Photo[]) => {
    const urls: Record<string, string> = {};

    // Batch signed URL generation in chunks of 20 for better performance
    const chunkSize = 20;
    for (let i = 0; i < photoList.length; i += chunkSize) {
      const chunk = photoList.slice(i, i + chunkSize);

      await Promise.all(
        chunk.map(async (photo) => {
          try {
            const { data, error } = await supabase.storage
              .from('photos')
              .createSignedUrl(photo.file_path, 3600);

            if (!error && data?.signedUrl) {
              urls[photo.id] = data.signedUrl;
            }
          } catch (error) {
            console.error(`Error loading URL for photo ${photo.id}:`, error);
          }
        })
      );

      // Update state after each chunk so users see photos loading progressively
      setPhotoUrls({ ...urls });
    }
  };

  const getPhotoUrl = (photoId: string) => {
    return photoUrls[photoId] || '';
  };

  const confirmDeletePhoto = (photoId: string, filePath: string) => {
    setDeleteTarget({ id: photoId, filePath });
    setShowDeleteModal(true);
  };

  const handleDeletePhoto = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', deleteTarget.id);

      if (dbError) throw dbError;

      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([deleteTarget.filePath]);

      if (storageError) console.error('Error deleting file:', storageError);

      fetchPhotos();
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmBulkDelete = () => {
    if (selectedPhotos.size === 0) return;
    setShowBulkDeleteModal(true);
  };

  const handleBulkDelete = async () => {
    if (selectedPhotos.size === 0) return;

    setIsDeleting(true);
    try {
      const photosToDelete = photos.filter(p => selectedPhotos.has(p.id));

      for (const photo of photosToDelete) {
        await supabase.from('photos').delete().eq('id', photo.id);
        await supabase.storage.from('photos').remove([photo.file_path]);
      }

      setSelectedPhotos(new Set());
      setIsSelectionMode(false);
      setShowBulkDeleteModal(false);
      fetchPhotos();
    } catch (error) {
      console.error('Error deleting photos:', error);
      alert('Failed to delete photos');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedPhotos.size === 0) return;

    try {
      const photosToDownload = photos.filter(p => selectedPhotos.has(p.id));

      for (const photo of photosToDownload) {
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
      }
    } catch (error) {
      console.error('Error downloading photos:', error);
      alert('Failed to download photos');
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedPhotos.size === filteredPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(filteredPhotos.map(p => p.id)));
    }
  };

  const filteredPhotos = photos.filter(photo =>
    photo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    photo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    photo.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupPhotosByDate = (photos: Photo[]): PhotosByDate => {
    const groups = photos.reduce((groups, photo) => {
      const date = new Date(photo.taken_at).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(photo);
      return groups;
    }, {} as PhotosByDate);

    // Sort photos within each date group by taken_at descending (latest first)
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
    });

    return groups;
  };

  const photosByDate = groupPhotosByDate(filteredPhotos);
  const dateKeys = Object.keys(photosByDate).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  const getCategoryColor = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Camera className="mr-3 text-blue-600" size={32} />
            Construction Photos
          </h1>
          <p className="text-gray-600 mt-1">
            {filteredPhotos.length} {filteredPhotos.length === 1 ? 'photo' : 'photos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSelectionMode && selectedPhotos.size > 0 && (
            <>
              <button
                onClick={() => setShowBulkEditModal(true)}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Edit3 size={16} className="mr-2" />
                Edit ({selectedPhotos.size})
              </button>
              <button
                onClick={handleBulkDownload}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Download size={16} className="mr-2" />
                Download ({selectedPhotos.size})
              </button>
              <button
                onClick={confirmBulkDelete}
                className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <Trash2 size={16} className="mr-2" />
                Delete ({selectedPhotos.size})
              </button>
            </>
          )}
          <button
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedPhotos(new Set());
            }}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${
              isSelectionMode
                ? 'bg-gray-600 text-white hover:bg-gray-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isSelectionMode ? <X size={16} className="mr-2" /> : <CheckSquare size={16} className="mr-2" />}
            {isSelectionMode ? 'Cancel' : 'Select'}
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload size={20} className="mr-2" />
            Upload
          </button>
        </div>
      </div>

      {/* Interactive Date Range Timeline */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border border-gray-700 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Progress Timeline</h3>
          <div className="flex items-center gap-2">
            {selectedDateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-600 bg-gray-800 text-white rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Start date"
                />
                <span className="text-white text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-600 bg-gray-800 text-white rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="End date"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 mb-2">
          <button
            onClick={() => setSelectedDateRange('7d')}
            className={`flex-1 px-3 py-2 rounded transition-all ${
              selectedDateRange === '7d'
                ? 'bg-green-500 text-white shadow-lg scale-105'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="text-xs font-medium">Last 7 Days</div>
          </button>
          <button
            onClick={() => setSelectedDateRange('30d')}
            className={`flex-1 px-3 py-2 rounded transition-all ${
              selectedDateRange === '30d'
                ? 'bg-blue-500 text-white shadow-lg scale-105'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="text-xs font-medium">Last 30 Days</div>
          </button>
          <button
            onClick={() => setSelectedDateRange('90d')}
            className={`flex-1 px-3 py-2 rounded transition-all ${
              selectedDateRange === '90d'
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="text-xs font-medium">Last 90 Days</div>
          </button>
          <button
            onClick={() => setSelectedDateRange('all')}
            className={`flex-1 px-3 py-2 rounded transition-all ${
              selectedDateRange === 'all'
                ? 'bg-gray-500 text-white shadow-lg scale-105'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="text-xs font-medium">All Time</div>
          </button>
          <button
            onClick={() => setSelectedDateRange('custom')}
            className={`flex-1 px-3 py-2 rounded transition-all ${
              selectedDateRange === 'custom'
                ? 'bg-purple-500 text-white shadow-lg scale-105'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="text-xs font-medium">Custom</div>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
          <span>Oldest</span>
          <span>Latest</span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search photos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter size={20} className="mr-2" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Projects</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Selection Controls */}
      {isSelectionMode && filteredPhotos.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-blue-700 hover:text-blue-800 font-medium"
            >
              {selectedPhotos.size === filteredPhotos.length ? (
                <CheckSquare size={20} />
              ) : (
                <Square size={20} />
              )}
              {selectedPhotos.size === filteredPhotos.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-blue-700">
              {selectedPhotos.size} of {filteredPhotos.length} selected
            </span>
          </div>
        </div>
      )}

      {/* Photos Grouped by Date */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Camera size={64} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
          <p className="text-gray-600 mb-6">
            Start documenting your construction project by uploading photos
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload size={20} className="mr-2" />
            Upload First Photo
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {dateKeys.map(date => (
            <div key={date} className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-700">{date}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {photosByDate[date].map(photo => {
                  const isExpanded = expandedPhoto === photo.id;
                  const isSelected = selectedPhotos.has(photo.id);

                  return (
                    <div
                      key={photo.id}
                      className={`relative bg-white rounded border transition-all ${
                        isExpanded
                          ? 'col-span-2 row-span-2 border-blue-500 shadow-lg'
                          : isSelected
                          ? 'border-blue-500 border-2'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        onClick={() => {
                          if (isSelectionMode) {
                            togglePhotoSelection(photo.id);
                          } else {
                            setExpandedPhoto(isExpanded ? null : photo.id);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <div className={`relative ${isExpanded ? 'aspect-square' : 'aspect-square'} bg-gray-100 overflow-hidden rounded-t`}>
                          <img
                            src={getPhotoUrl(photo.id)}
                            alt={photo.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {isSelectionMode && (
                            <div className="absolute top-1 left-1">
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'bg-white border-gray-300'
                                }`}
                              >
                                {isSelected && <CheckSquare size={16} className="text-white" />}
                              </div>
                            </div>
                          )}
                          {!isSelectionMode && !isExpanded && (
                            <span className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-xs font-medium ${getCategoryColor(photo.category)}`}>
                              {CATEGORIES.find(c => c.value === photo.category)?.label.charAt(0)}
                            </span>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="p-2 space-y-1">
                            <h3 className="font-medium text-sm text-gray-900 line-clamp-2">{photo.title}</h3>
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
                            <div className="flex items-center gap-1 pt-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPhoto(photo);
                                  setShowPreviewModal(true);
                                }}
                                className="flex-1 p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                title="Preview"
                              >
                                <Eye size={12} className="mx-auto" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPhoto(photo);
                                  setShowEditModal(true);
                                }}
                                className="flex-1 p-1 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                                title="Edit"
                              >
                                <Edit size={12} className="mx-auto" />
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
                                className="flex-1 p-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                title="Download"
                              >
                                <Download size={12} className="mx-auto" />
                              </button>
                              {photo.taken_by === user?.id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDeletePhoto(photo.id, photo.file_path);
                                  }}
                                  className="flex-1 p-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={12} className="mx-auto" />
                                </button>
                              )}
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

          {/* Pagination */}
          {totalPhotos > pageSize && (
            <div className="flex justify-center items-center gap-2 mt-6 pb-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {currentPage} of {Math.ceil(totalPhotos / pageSize)}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalPhotos / pageSize), p + 1))}
                disabled={currentPage >= Math.ceil(totalPhotos / pageSize)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showUploadModal && (
        <PhotoUploadModal
          projects={projects}
          defaultProjectId={selectedProject !== 'all' ? selectedProject : undefined}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            fetchPhotos();
            setShowUploadModal(false);
          }}
        />
      )}

      {showEditModal && selectedPhoto && (
        <PhotoEditModal
          photo={selectedPhoto}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPhoto(null);
          }}
          onSuccess={() => {
            fetchPhotos();
            setShowEditModal(false);
            setSelectedPhoto(null);
          }}
        />
      )}

      {showPreviewModal && selectedPhoto && (
        <PhotoPreviewModal
          photos={filteredPhotos}
          currentPhotoId={selectedPhoto.id}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedPhoto(null);
          }}
        />
      )}

      {showBulkEditModal && (
        <PhotoBulkEditModal
          photoIds={Array.from(selectedPhotos)}
          onClose={() => setShowBulkEditModal(false)}
          onSuccess={() => {
            fetchPhotos();
            setShowBulkEditModal(false);
            setSelectedPhotos(new Set());
            setIsSelectionMode(false);
          }}
        />
      )}

      {showDeleteModal && deleteTarget && (
        <DeleteConfirmModal
          title="Delete Photo"
          message="Are you sure you want to delete this photo? This will permanently remove it from storage."
          onConfirm={handleDeletePhoto}
          onCancel={() => {
            setShowDeleteModal(false);
            setDeleteTarget(null);
          }}
          isDeleting={isDeleting}
        />
      )}

      {showBulkDeleteModal && (
        <DeleteConfirmModal
          title="Delete Multiple Photos"
          message="Are you sure you want to delete the selected photos? This will permanently remove them from storage."
          itemCount={selectedPhotos.size}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
