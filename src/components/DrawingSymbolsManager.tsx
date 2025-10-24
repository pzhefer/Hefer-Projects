import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Shapes, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DrawingSymbol {
  id: string;
  name: string;
  category: string;
  svg_path: string;
  view_box: string;
  is_custom: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: 'electrical', label: 'Electrical', icon: '⚡' },
  { value: 'plumbing', label: 'Plumbing', icon: '🚰' },
  { value: 'hvac', label: 'HVAC', icon: '❄️' },
  { value: 'fire_safety', label: 'Fire Safety', icon: '🔥' },
  { value: 'structural', label: 'Structural', icon: '🏛️' },
  { value: 'general', label: 'General', icon: '📐' },
];

export default function DrawingSymbolsManager() {
  const { user } = useAuth();
  const [symbols, setSymbols] = useState<DrawingSymbol[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<DrawingSymbol | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'general',
    svg_path: '',
    view_box: '0 0 24 24',
    is_active: true,
  });

  useEffect(() => {
    loadSymbols();
  }, []);

  async function loadSymbols() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('drawing_symbols')
        .select('*')
        .order('category')
        .order('name');

      if (error) throw error;
      setSymbols(data || []);
    } catch (error) {
      console.error('Error loading symbols:', error);
      alert('Failed to load symbols');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      category: 'general',
      svg_path: '',
      view_box: '0 0 24 24',
      is_active: true,
    });
  }

  function openAddModal() {
    resetForm();
    setShowAddModal(true);
  }

  function openEditModal(symbol: DrawingSymbol) {
    setSelectedSymbol(symbol);
    setFormData({
      name: symbol.name,
      category: symbol.category,
      svg_path: symbol.svg_path,
      view_box: symbol.view_box,
      is_active: symbol.is_active,
    });
    setShowEditModal(true);
  }

  async function handleAdd() {
    if (!formData.name || !formData.svg_path) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('drawing_symbols')
        .insert({
          name: formData.name,
          category: formData.category,
          svg_path: formData.svg_path,
          view_box: formData.view_box,
          is_custom: true,
          is_active: formData.is_active,
          created_by: user?.id,
        });

      if (error) throw error;

      setShowAddModal(false);
      resetForm();
      loadSymbols();
    } catch (error) {
      console.error('Error adding symbol:', error);
      alert('Failed to add symbol');
    }
  }

  async function handleEdit() {
    if (!selectedSymbol || !formData.name || !formData.svg_path) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('drawing_symbols')
        .update({
          name: formData.name,
          category: formData.category,
          svg_path: formData.svg_path,
          view_box: formData.view_box,
          is_active: formData.is_active,
        })
        .eq('id', selectedSymbol.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedSymbol(null);
      resetForm();
      loadSymbols();
    } catch (error) {
      console.error('Error updating symbol:', error);
      alert('Failed to update symbol');
    }
  }

  async function handleToggleActive(symbol: DrawingSymbol) {
    try {
      const { error } = await supabase
        .from('drawing_symbols')
        .update({ is_active: !symbol.is_active })
        .eq('id', symbol.id);

      if (error) throw error;
      loadSymbols();
    } catch (error) {
      console.error('Error toggling symbol:', error);
      alert('Failed to toggle symbol');
    }
  }

  async function handleDelete(symbol: DrawingSymbol) {
    if (!confirm(`Are you sure you want to delete "${symbol.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('drawing_symbols')
        .delete()
        .eq('id', symbol.id);

      if (error) throw error;
      loadSymbols();
    } catch (error) {
      console.error('Error deleting symbol:', error);
      alert('Failed to delete symbol');
    }
  }

  const filteredSymbols = selectedCategory === 'all'
    ? symbols
    : symbols.filter(s => s.category === selectedCategory);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shapes className="text-blue-600" />
              Drawing Symbols
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage construction symbols for drawing annotations
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Symbol
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Symbols Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredSymbols.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Shapes size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">No symbols found in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSymbols.map(symbol => (
            <div
              key={symbol.id}
              className={`border rounded-lg p-4 transition-all ${
                symbol.is_active
                  ? 'bg-white border-gray-200 hover:shadow-md'
                  : 'bg-gray-50 border-gray-300 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50">
                    <svg
                      viewBox={symbol.view_box}
                      className="w-8 h-8 text-gray-700"
                      fill="currentColor"
                    >
                      <path d={symbol.svg_path} />
                    </svg>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(symbol)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    title={symbol.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {symbol.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => openEditModal(symbol)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  {symbol.is_custom && (
                    <button
                      onClick={() => handleDelete(symbol)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{symbol.name}</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    {CATEGORIES.find(c => c.value === symbol.category)?.label || symbol.category}
                  </span>
                  {symbol.is_custom && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      Custom
                    </span>
                  )}
                  {!symbol.is_active && (
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Add New Symbol</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symbol Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Light Switch"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SVG Path Data *
                </label>
                <textarea
                  value={formData.svg_path}
                  onChange={(e) => setFormData({ ...formData, svg_path: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="e.g., M12 2L2 7v10l10 5 10-5V7L12 2z..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the SVG path data (d attribute). You can get this from any SVG icon library.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  View Box
                </label>
                <input
                  type="text"
                  value={formData.view_box}
                  onChange={(e) => setFormData({ ...formData, view_box: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0 0 24 24"
                />
                <p className="text-xs text-gray-500 mt-1">
                  SVG viewBox attribute (default: 0 0 24 24)
                </p>
              </div>

              {formData.svg_path && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </label>
                  <div className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <svg
                      viewBox={formData.view_box}
                      className="w-16 h-16 text-gray-700"
                      fill="currentColor"
                    >
                      <path d={formData.svg_path} />
                    </svg>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active_add"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="is_active_add" className="text-sm text-gray-700">
                  Active (available for use in drawings)
                </label>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Add Symbol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedSymbol && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Edit Symbol</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSymbol(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symbol Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Light Switch"
                  disabled={!selectedSymbol.is_custom}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SVG Path Data *
                </label>
                <textarea
                  value={formData.svg_path}
                  onChange={(e) => setFormData({ ...formData, svg_path: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="e.g., M12 2L2 7v10l10 5 10-5V7L12 2z..."
                  disabled={!selectedSymbol.is_custom}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  View Box
                </label>
                <input
                  type="text"
                  value={formData.view_box}
                  onChange={(e) => setFormData({ ...formData, view_box: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0 0 24 24"
                  disabled={!selectedSymbol.is_custom}
                />
              </div>

              {formData.svg_path && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </label>
                  <div className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <svg
                      viewBox={formData.view_box}
                      className="w-16 h-16 text-gray-700"
                      fill="currentColor"
                    >
                      <path d={formData.svg_path} />
                    </svg>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active_edit"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="is_active_edit" className="text-sm text-gray-700">
                  Active (available for use in drawings)
                </label>
              </div>

              {!selectedSymbol.is_custom && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    This is a built-in symbol. You can only change its category and active status.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSymbol(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
