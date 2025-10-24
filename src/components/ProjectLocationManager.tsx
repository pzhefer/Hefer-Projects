import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, ChevronRight, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProjectLocation {
  id: string;
  project_id: string;
  name: string;
  parent_id: string | null;
  location_type: string | null;
  description: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface ProjectLocationManagerProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export default function ProjectLocationManager({ projectId, projectName, onClose }: ProjectLocationManagerProps) {
  const [locations, setLocations] = useState<ProjectLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ProjectLocation | null>(null);
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    parent_id: null as string | null,
    location_type: '',
    description: '',
    display_order: 0,
  });

  useEffect(() => {
    loadLocations();
  }, [projectId]);

  async function loadLocations() {
    try {
      const { data, error } = await supabase
        .from('project_locations')
        .select('*')
        .eq('project_id', projectId)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  }

  function buildLocationTree(parentId: string | null = null, level: number = 0): JSX.Element[] {
    const children = locations.filter(loc => loc.parent_id === parentId);

    return children.map(location => {
      const hasChildren = locations.some(loc => loc.parent_id === location.id);

      return (
        <div key={location.id}>
          <div
            className={`flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 ${
              level > 0 ? 'ml-' + (level * 6) : ''
            }`}
            style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
          >
            <div className="flex items-center space-x-3 flex-1">
              {level > 0 && <ChevronRight size={16} className="text-gray-400" />}
              <Building2 size={18} className="text-blue-600" />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-gray-900">{location.name}</h4>
                  {location.location_type && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      {location.location_type}
                    </span>
                  )}
                </div>
                {location.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{location.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setSelectedParent(location.id);
                  setFormData({
                    name: '',
                    parent_id: location.id,
                    location_type: '',
                    description: '',
                    display_order: 0,
                  });
                  setShowAddModal(true);
                }}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Add sub-location"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={() => {
                  setSelectedLocation(location);
                  setFormData({
                    name: location.name,
                    parent_id: location.parent_id,
                    location_type: location.location_type || '',
                    description: location.description || '',
                    display_order: location.display_order,
                  });
                  setShowEditModal(true);
                }}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Edit location"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => {
                  setSelectedLocation(location);
                  setShowDeleteConfirm(true);
                }}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete location"
                disabled={hasChildren}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          {buildLocationTree(location.id, level + 1)}
        </div>
      );
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (selectedLocation) {
        const { error } = await supabase
          .from('project_locations')
          .update({
            name: formData.name,
            parent_id: formData.parent_id,
            location_type: formData.location_type || null,
            description: formData.description,
            display_order: formData.display_order,
          })
          .eq('id', selectedLocation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_locations')
          .insert({
            project_id: projectId,
            name: formData.name,
            parent_id: formData.parent_id,
            location_type: formData.location_type || null,
            description: formData.description,
            display_order: formData.display_order,
          });

        if (error) throw error;
      }

      await loadLocations();
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedLocation(null);
      setSelectedParent(null);
      setFormData({
        name: '',
        parent_id: null,
        location_type: '',
        description: '',
        display_order: 0,
      });
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Failed to save location');
    }
  }

  async function handleDelete() {
    if (!selectedLocation) return;

    try {
      const { error } = await supabase
        .from('project_locations')
        .delete()
        .eq('id', selectedLocation.id);

      if (error) throw error;

      await loadLocations();
      setShowDeleteConfirm(false);
      setSelectedLocation(null);
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Failed to delete location');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Project Locations</h2>
            <p className="text-sm text-gray-600 mt-1">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading locations...</p>
            </div>
          ) : (
            <>
              {locations.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No locations yet</h3>
                  <p className="text-gray-600 mb-4">
                    Add locations to organize your project spaces
                  </p>
                  <button
                    onClick={() => {
                      setFormData({
                        name: '',
                        parent_id: null,
                        location_type: '',
                        description: '',
                        display_order: 0,
                      });
                      setShowAddModal(true);
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={18} />
                    <span>Add Location</span>
                  </button>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {buildLocationTree()}
                </div>
              )}
            </>
          )}
        </div>

        {locations.length > 0 && (
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  parent_id: null,
                  location_type: '',
                  description: '',
                  display_order: 0,
                });
                setShowAddModal(true);
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              <span>Add Root Location</span>
            </button>
          </div>
        )}
      </div>

      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {showEditModal ? 'Edit Location' : 'Add Location'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedLocation(null);
                  setSelectedParent(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  placeholder="e.g., Building A, Floor 2, Room 101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <input
                  type="text"
                  value={formData.location_type}
                  onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., building, floor, room"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional details..."
                />
              </div>

              {!showEditModal && !selectedParent && locations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Location
                  </label>
                  <select
                    value={formData.parent_id || ''}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">None (Root level)</option>
                    {locations.filter(l => !l.parent_id).map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedLocation(null);
                    setSelectedParent(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showEditModal ? 'Update' : 'Add'} Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Location</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{selectedLocation.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedLocation(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
