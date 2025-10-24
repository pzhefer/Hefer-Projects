import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, FolderTree, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProjectType {
  id: string;
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

interface ProjectSubtype {
  id: string;
  project_type_id: string;
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

export default function ProjectTypeManager() {
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [subtypes, setSubtypes] = useState<ProjectSubtype[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [showAddSubtypeModal, setShowAddSubtypeModal] = useState(false);
  const [showEditTypeModal, setShowEditTypeModal] = useState(false);
  const [showEditSubtypeModal, setShowEditSubtypeModal] = useState(false);
  const [selectedType, setSelectedType] = useState<ProjectType | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<ProjectSubtype | null>(null);
  const [selectedTypeForSubtype, setSelectedTypeForSubtype] = useState<string | null>(null);

  const [typeFormData, setTypeFormData] = useState({
    name: '',
    description: '',
    display_order: 0,
    is_active: true,
  });

  const [subtypeFormData, setSubtypeFormData] = useState({
    name: '',
    description: '',
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [typesResult, subtypesResult] = await Promise.all([
        supabase.from('project_types').select('*').order('display_order'),
        supabase.from('project_subtypes').select('*').order('display_order'),
      ]);

      if (typesResult.error) throw typesResult.error;
      if (subtypesResult.error) throw subtypesResult.error;

      setTypes(typesResult.data || []);
      setSubtypes(subtypesResult.data || []);
    } catch (error) {
      console.error('Error loading project types:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpanded(typeId: string) {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(typeId)) {
      newExpanded.delete(typeId);
    } else {
      newExpanded.add(typeId);
    }
    setExpandedTypes(newExpanded);
  }

  async function handleSaveType() {
    try {
      if (selectedType) {
        const { error } = await supabase
          .from('project_types')
          .update(typeFormData)
          .eq('id', selectedType.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_types')
          .insert(typeFormData);
        if (error) throw error;
      }

      await loadData();
      setShowAddTypeModal(false);
      setShowEditTypeModal(false);
      setSelectedType(null);
      setTypeFormData({ name: '', description: '', display_order: 0, is_active: true });
    } catch (error) {
      console.error('Error saving project type:', error);
      alert('Failed to save project type');
    }
  }

  async function handleSaveSubtype() {
    if (!selectedTypeForSubtype && !selectedSubtype) return;

    try {
      if (selectedSubtype) {
        const { error } = await supabase
          .from('project_subtypes')
          .update(subtypeFormData)
          .eq('id', selectedSubtype.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_subtypes')
          .insert({
            ...subtypeFormData,
            project_type_id: selectedTypeForSubtype,
          });
        if (error) throw error;
      }

      await loadData();
      setShowAddSubtypeModal(false);
      setShowEditSubtypeModal(false);
      setSelectedSubtype(null);
      setSelectedTypeForSubtype(null);
      setSubtypeFormData({ name: '', description: '', display_order: 0, is_active: true });
    } catch (error) {
      console.error('Error saving project subtype:', error);
      alert('Failed to save project subtype');
    }
  }

  async function handleDeleteType(type: ProjectType) {
    const typeSubtypes = subtypes.filter(s => s.project_type_id === type.id);
    if (typeSubtypes.length > 0) {
      alert('Cannot delete a project type that has subtypes. Please delete all subtypes first.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${type.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('project_types')
        .delete()
        .eq('id', type.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting project type:', error);
      alert('Failed to delete project type');
    }
  }

  async function handleDeleteSubtype(subtype: ProjectSubtype) {
    if (!confirm(`Are you sure you want to delete "${subtype.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('project_subtypes')
        .delete()
        .eq('id', subtype.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting project subtype:', error);
      alert('Failed to delete project subtype');
    }
  }

  function getSubtypesForType(typeId: string) {
    return subtypes.filter(s => s.project_type_id === typeId);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Project Types</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage main project types and their subtypes
          </p>
        </div>
        <button
          onClick={() => {
            setTypeFormData({ name: '', description: '', display_order: types.length, is_active: true });
            setShowAddTypeModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          <span>Add Type</span>
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {types.map((type) => {
          const typeSubtypes = getSubtypesForType(type.id);
          const isExpanded = expandedTypes.has(type.id);

          return (
            <div key={type.id} className="border-b border-gray-200 last:border-b-0">
              <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center space-x-3 flex-1">
                  <button
                    onClick={() => toggleExpanded(type.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <ChevronRight
                      size={18}
                      className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>
                  <FolderTree size={20} className="text-blue-600" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{type.name}</h4>
                      {!type.is_active && (
                        <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                          Inactive
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                        {typeSubtypes.length} subtypes
                      </span>
                    </div>
                    {type.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{type.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedTypeForSubtype(type.id);
                      setSubtypeFormData({
                        name: '',
                        description: '',
                        display_order: typeSubtypes.length,
                        is_active: true,
                      });
                      setShowAddSubtypeModal(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Add subtype"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedType(type);
                      setTypeFormData({
                        name: type.name,
                        description: type.description,
                        display_order: type.display_order,
                        is_active: type.is_active,
                      });
                      setShowEditTypeModal(true);
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title="Edit type"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteType(type)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete type"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {isExpanded && typeSubtypes.length > 0 && (
                <div className="bg-gray-50 border-t border-gray-200">
                  {typeSubtypes.map((subtype) => (
                    <div
                      key={subtype.id}
                      className="flex items-center justify-between p-4 pl-16 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h5 className="font-medium text-gray-800">{subtype.name}</h5>
                          {!subtype.is_active && (
                            <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        {subtype.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{subtype.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedSubtype(subtype);
                            setSubtypeFormData({
                              name: subtype.name,
                              description: subtype.description,
                              display_order: subtype.display_order,
                              is_active: subtype.is_active,
                            });
                            setShowEditSubtypeModal(true);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                          title="Edit subtype"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteSubtype(subtype)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Delete subtype"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Type Modal */}
      {(showAddTypeModal || showEditTypeModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {showEditTypeModal ? 'Edit' : 'Add'} Project Type
              </h3>
              <button
                onClick={() => {
                  setShowAddTypeModal(false);
                  setShowEditTypeModal(false);
                  setSelectedType(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={typeFormData.name}
                  onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={typeFormData.description}
                  onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={typeFormData.display_order}
                  onChange={(e) => setTypeFormData({ ...typeFormData, display_order: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="type_is_active"
                  checked={typeFormData.is_active}
                  onChange={(e) => setTypeFormData({ ...typeFormData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="type_is_active" className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddTypeModal(false);
                    setShowEditTypeModal(false);
                    setSelectedType(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveType}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save size={16} />
                  <span>{showEditTypeModal ? 'Update' : 'Add'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Subtype Modal */}
      {(showAddSubtypeModal || showEditSubtypeModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {showEditSubtypeModal ? 'Edit' : 'Add'} Project Subtype
              </h3>
              <button
                onClick={() => {
                  setShowAddSubtypeModal(false);
                  setShowEditSubtypeModal(false);
                  setSelectedSubtype(null);
                  setSelectedTypeForSubtype(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={subtypeFormData.name}
                  onChange={(e) => setSubtypeFormData({ ...subtypeFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={subtypeFormData.description}
                  onChange={(e) => setSubtypeFormData({ ...subtypeFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={subtypeFormData.display_order}
                  onChange={(e) => setSubtypeFormData({ ...subtypeFormData, display_order: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="subtype_is_active"
                  checked={subtypeFormData.is_active}
                  onChange={(e) => setSubtypeFormData({ ...subtypeFormData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="subtype_is_active" className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddSubtypeModal(false);
                    setShowEditSubtypeModal(false);
                    setSelectedSubtype(null);
                    setSelectedTypeForSubtype(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSubtype}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save size={16} />
                  <span>{showEditSubtypeModal ? 'Update' : 'Add'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
