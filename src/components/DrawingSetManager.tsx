import { useState, useEffect } from 'react';
import { X, Plus, Folder, Edit2, Trash2, Save, ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { supabase, type DrawingSet, type Project } from '../lib/supabase';
import DeleteConfirmModal from './DeleteConfirmModal';

interface DrawingSetManagerProps {
  project?: Project;
  onClose: () => void;
  onSetCreated: () => void;
}

interface DrawingSetTree extends DrawingSet {
  children: DrawingSetTree[];
  isExpanded?: boolean;
}

export default function DrawingSetManager({ project: initialProject, onClose, onSetCreated }: DrawingSetManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(initialProject || null);
  const [sets, setSets] = useState<DrawingSet[]>([]);
  const [setTree, setSetTree] = useState<DrawingSetTree[]>([]);
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState({
    name: '',
    description: '',
    discipline: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; hasChildren: boolean } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [draggedSet, setDraggedSet] = useState<DrawingSet | null>(null);
  const [dragOverSet, setDragOverSet] = useState<string | null>(null);
  const [newSet, setNewSet] = useState({
    name: '',
    description: '',
    discipline: '',
    parent_id: null as string | null,
  });
  const [showAddForm, setShowAddForm] = useState(false);

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
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchSets();
    }
  }, [selectedProject]);

  useEffect(() => {
    buildTree();
  }, [sets, expandedSets]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, status')
        .order('name');

      if (error) throw error;
      setProjects(data || []);

      if (!initialProject && data && data.length > 0) {
        setSelectedProject(data[0]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchSets = async () => {
    if (!selectedProject) {
      setSets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('drawing_sets')
        .select('*')
        .eq('project_id', selectedProject.id)
        .order('level, display_order, name');

      if (error) throw error;
      setSets(data || []);
    } catch (error) {
      console.error('Error fetching drawing sets:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = () => {
    const setMap = new Map<string, DrawingSetTree>();
    const rootSets: DrawingSetTree[] = [];

    sets.forEach(set => {
      setMap.set(set.id, {
        ...set,
        children: [],
        isExpanded: expandedSets.has(set.id)
      });
    });

    sets.forEach(set => {
      const node = setMap.get(set.id)!;
      if (set.parent_id && setMap.has(set.parent_id)) {
        setMap.get(set.parent_id)!.children.push(node);
      } else {
        rootSets.push(node);
      }
    });

    setSetTree(rootSets);
  };

  const toggleExpand = (setId: string) => {
    const newExpandedSets = new Set(expandedSets);
    if (newExpandedSets.has(setId)) {
      newExpandedSets.delete(setId);
    } else {
      newExpandedSets.add(setId);
    }
    setExpandedSets(newExpandedSets);
  };

  const handleCreateSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSet.name.trim() || !selectedProject) return;

    const parentLevel = newSet.parent_id
      ? sets.find(s => s.id === newSet.parent_id)?.level ?? -1
      : -1;

    try {
      const { error } = await supabase
        .from('drawing_sets')
        .insert({
          project_id: selectedProject.id,
          name: newSet.name,
          description: newSet.description,
          discipline: newSet.discipline || null,
          parent_id: newSet.parent_id,
          level: parentLevel + 1,
          display_order: sets.filter(s => s.parent_id === newSet.parent_id).length,
        });

      if (error) throw error;

      setNewSet({ name: '', description: '', discipline: '', parent_id: null });
      setShowAddForm(false);
      fetchSets();
      onSetCreated();
    } catch (error) {
      console.error('Error creating set:', error);
      alert('Failed to create drawing set');
    }
  };

  const handleUpdateSet = async (setId: string) => {
    if (!editingData.name.trim()) {
      alert('Please enter a name');
      return;
    }

    try {
      const { error } = await supabase
        .from('drawing_sets')
        .update({
          name: editingData.name,
          description: editingData.description || null,
          discipline: editingData.discipline || null,
        })
        .eq('id', setId);

      if (error) throw error;

      fetchSets();
      setEditingId(null);
      setEditingData({ name: '', description: '', discipline: '' });
    } catch (error) {
      console.error('Error updating set:', error);
      alert('Failed to update drawing set');
    }
  };

  const handleDeleteSet = async () => {
    if (!deleteConfirm) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('drawing_sets')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;

      setDeleteConfirm(null);
      fetchSets();
      onSetCreated();
    } catch (error) {
      console.error('Error deleting set:', error);
      alert('Failed to delete drawing set');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, set: DrawingSet) => {
    setDraggedSet(set);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetSet: DrawingSet) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedSet && draggedSet.id !== targetSet.id && draggedSet.parent_id === targetSet.parent_id) {
      setDragOverSet(targetSet.id);
    }
  };

  const handleDragLeave = () => {
    setDragOverSet(null);
  };

  const handleDrop = async (e: React.DragEvent, targetSet: DrawingSet) => {
    e.preventDefault();
    setDragOverSet(null);

    if (!draggedSet || draggedSet.id === targetSet.id || draggedSet.parent_id !== targetSet.parent_id) {
      setDraggedSet(null);
      return;
    }

    try {
      const siblingsSets = sets.filter(s => s.parent_id === draggedSet.parent_id);
      const draggedIndex = siblingsSets.findIndex(s => s.id === draggedSet.id);
      const targetIndex = siblingsSets.findIndex(s => s.id === targetSet.id);

      if (draggedIndex === -1 || targetIndex === -1) return;

      const reorderedSets = [...siblingsSets];
      const [removed] = reorderedSets.splice(draggedIndex, 1);
      reorderedSets.splice(targetIndex, 0, removed);

      const updates = reorderedSets.map((set, index) => ({
        id: set.id,
        display_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('drawing_sets')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      fetchSets();
    } catch (error) {
      console.error('Error reordering sets:', error);
      alert('Failed to reorder sets');
    } finally {
      setDraggedSet(null);
    }
  };

  const renderSetNode = (set: DrawingSetTree, depth: number = 0) => {
    const hasChildren = set.children.length > 0;
    const isExpanded = set.isExpanded;
    const indent = depth * 24;
    const isDragOver = dragOverSet === set.id;
    const isDragging = draggedSet?.id === set.id;

    return (
      <div key={set.id}>
        <div
          draggable={editingId !== set.id}
          onDragStart={(e) => handleDragStart(e, set)}
          onDragOver={(e) => handleDragOver(e, set)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, set)}
          onDragEnd={() => setDraggedSet(null)}
          className={`bg-gray-50 rounded-lg p-3 border mb-2 transition-all ${
            isDragOver ? 'border-blue-500 border-2 bg-blue-50' : 'border-gray-200'
          } ${isDragging ? 'opacity-50' : ''} ${editingId !== set.id ? 'cursor-move' : ''}`}
          style={{ marginLeft: `${indent}px` }}
        >
          {editingId === set.id ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editingData.name}
                onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Set name *"
                autoFocus
              />
              <input
                type="text"
                value={editingData.description}
                onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Description"
              />
              <select
                value={editingData.discipline}
                onChange={(e) => setEditingData({ ...editingData, discipline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Select Discipline</option>
                {disciplines.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <div className="flex items-center justify-end space-x-2">
                <button
                  onClick={() => {
                    setEditingId(null);
                    setEditingData({ name: '', description: '', discipline: '' });
                  }}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateSet(set.id)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1">
                <GripVertical className="text-gray-400 flex-shrink-0" size={16} />
                {hasChildren && (
                  <button
                    onClick={() => toggleExpand(set.id)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                )}
                {!hasChildren && <div className="w-4" />}
                <Folder className="text-blue-600" size={18} />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{set.name}</h3>
                  {set.description && (
                    <p className="text-xs text-gray-600 mt-0.5">{set.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {set.discipline && (
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {set.discipline}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      Level {set.level}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {set.level < 2 && (
                  <button
                    onClick={() => {
                      setNewSet({ name: '', description: '', discipline: '', parent_id: set.id });
                      setShowAddForm(true);
                    }}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Add child set"
                  >
                    <Plus size={16} />
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingId(set.id);
                    setEditingData({
                      name: set.name,
                      description: set.description || '',
                      discipline: set.discipline || '',
                    });
                  }}
                  className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => setDeleteConfirm({ id: set.id, name: set.name, hasChildren })}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
        {isExpanded && hasChildren && (
          <div>
            {set.children.map(child => renderSetNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const getParentOptions = () => {
    return sets.filter(s => s.level < 2);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 flex-1">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Folder className="text-blue-600" size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">Manage Drawing Sets</h2>
              <select
                value={selectedProject?.id || ''}
                onChange={(e) => {
                  const project = projects.find(p => p.id === e.target.value);
                  setSelectedProject(project || null);
                  setShowAddForm(false);
                  setEditingId(null);
                }}
                className="mt-1 w-full max-w-md px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!selectedProject ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Folder className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-600">Please select a project to manage its drawing sets</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {setTree.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Folder className="mx-auto text-gray-400 mb-3" size={48} />
                  <p className="text-gray-600 mb-2">No drawing sets yet</p>
                  <p className="text-sm text-gray-500 mb-4">Create a hierarchical structure like: Building A → Architectural → Layout</p>
                  {!showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={16} />
                      <span>Create First Set</span>
                    </button>
                  )}
                </div>
              ) : (
                setTree.map(set => renderSetNode(set, 0))
              )}

              {showAddForm && (
                <form onSubmit={handleCreateSet} className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {newSet.parent_id ? 'New Child Set' : 'New Root Set'}
                  </h3>
                  {newSet.parent_id && (
                    <div className="mb-3 p-2 bg-blue-100 rounded text-sm text-blue-900">
                      Parent: <strong>{sets.find(s => s.id === newSet.parent_id)?.name}</strong>
                    </div>
                  )}
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newSet.name}
                      onChange={(e) => setNewSet({ ...newSet, name: e.target.value })}
                      placeholder="Set name (e.g., Building A, Architectural, Layout)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      autoFocus
                    />
                    <input
                      type="text"
                      value={newSet.description}
                      onChange={(e) => setNewSet({ ...newSet, description: e.target.value })}
                      placeholder="Description (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {!newSet.parent_id && (
                      <select
                        value={newSet.parent_id || ''}
                        onChange={(e) => setNewSet({ ...newSet, parent_id: e.target.value || null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Root Level (no parent)</option>
                        {getParentOptions().map(s => (
                          <option key={s.id} value={s.id}>
                            {'  '.repeat(s.level)} {s.name} (Level {s.level})
                          </option>
                        ))}
                      </select>
                    )}
                    <select
                      value={newSet.discipline}
                      onChange={(e) => setNewSet({ ...newSet, discipline: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">No specific discipline</option>
                      {disciplines.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <div className="flex items-center space-x-2">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Create Set
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewSet({ name: '', description: '', discipline: '', parent_id: null });
                        }}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {!showAddForm && selectedProject && (
            <button
              onClick={() => {
                setNewSet({ name: '', description: '', discipline: '', parent_id: null });
                setShowAddForm(true);
              }}
              className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus size={20} />
              <span>Add New Root Set</span>
            </button>
          )}
        </div>
      </div>

      {deleteConfirm && (
        <DeleteConfirmModal
          title="Delete Drawing Set?"
          message={
            deleteConfirm.hasChildren
              ? `Deleting "${deleteConfirm.name}" will also delete all child sets and unorganize their drawings.`
              : `Are you sure you want to delete "${deleteConfirm.name}"? Drawings in this set will become unorganized.`
          }
          onConfirm={handleDeleteSet}
          onCancel={() => setDeleteConfirm(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
