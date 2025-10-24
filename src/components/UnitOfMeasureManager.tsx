import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DeleteConfirmModal from './DeleteConfirmModal';

type UnitOfMeasure = {
  id: string;
  code: string;
  name: string;
  unit_type: 'quantity' | 'weight' | 'length' | 'volume' | 'area' | 'time' | 'other';
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

const UNIT_TYPES = [
  { value: 'quantity', label: 'Quantity' },
  { value: 'weight', label: 'Weight' },
  { value: 'length', label: 'Length' },
  { value: 'volume', label: 'Volume' },
  { value: 'area', label: 'Area' },
  { value: 'time', label: 'Time' },
  { value: 'other', label: 'Other' }
];

export default function UnitOfMeasureManager() {
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitOfMeasure | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; unit: UnitOfMeasure | null }>({
    show: false,
    unit: null
  });
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units_of_measure')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error loading units:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const unitData = {
      code: (formData.get('code') as string).toUpperCase(),
      name: formData.get('name') as string,
      unit_type: formData.get('unit_type') as string,
      is_active: formData.get('is_active') === 'on',
      display_order: parseInt(formData.get('display_order') as string) || 0
    };

    try {
      if (editingUnit) {
        const { error } = await supabase
          .from('units_of_measure')
          .update(unitData)
          .eq('id', editingUnit.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('units_of_measure')
          .insert([unitData]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingUnit(null);
      loadUnits();
    } catch (error: any) {
      console.error('Error saving unit:', error);
      alert(error.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.unit) return;

    try {
      const { error } = await supabase
        .from('units_of_measure')
        .delete()
        .eq('id', deleteConfirm.unit.id);

      if (error) throw error;

      setDeleteConfirm({ show: false, unit: null });
      loadUnits();
    } catch (error: any) {
      console.error('Error deleting unit:', error);
      alert(error.message);
    }
  };

  const filteredUnits = filterType === 'all'
    ? units
    : units.filter(u => u.unit_type === filterType);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Units of Measure</h2>
          <p className="text-gray-600 mt-1">Manage units of measure used throughout the system</p>
        </div>
        <button
          onClick={() => {
            setEditingUnit(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Unit
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Types</option>
          {UNIT_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Display Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUnits.map((unit) => (
              <tr key={unit.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {unit.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {unit.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {UNIT_TYPES.find(t => t.value === unit.unit_type)?.label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {unit.display_order}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    unit.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {unit.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setEditingUnit(unit);
                      setShowModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ show: true, unit })}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUnits.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No units of measure found
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingUnit ? 'Edit Unit of Measure' : 'Add Unit of Measure'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingUnit(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  name="code"
                  defaultValue={editingUnit?.code}
                  required
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  placeholder="e.g., EA, KG, M"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingUnit?.name}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Each, Kilogram, Meter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Type *
                </label>
                <select
                  name="unit_type"
                  defaultValue={editingUnit?.unit_type || 'quantity'}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {UNIT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  name="display_order"
                  defaultValue={editingUnit?.display_order || 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={editingUnit?.is_active !== false}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUnit(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingUnit ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, unit: null })}
        onConfirm={handleDelete}
        title="Delete Unit of Measure"
        message={`Are you sure you want to delete "${deleteConfirm.unit?.name}"? This may affect items using this unit.`}
      />
    </div>
  );
}
