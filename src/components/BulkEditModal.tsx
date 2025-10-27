import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BulkEditModalProps {
  selectedItemIds: string[];
  onClose: () => void;
  onComplete: () => void;
}

interface Store {
  id: string;
  name: string;
}

interface Bin {
  id: string;
  name: string;
  store_id: string;
}

interface Category {
  id: string;
  name: string;
}

interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({ selectedItemIds, onClose, onComplete }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasure[]>([]);
  const [loading, setLoading] = useState(false);

  const [fieldsToUpdate, setFieldsToUpdate] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Record<string, any>>({
    category_id: '',
    store_id: '',
    bin_id: '',
    manufacturer: '',
    model: '',
    unit_of_measure: '',
    purchase_cost: '',
    replacement_cost: '',
    reorder_point: '',
    reorder_quantity: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [storesData, binsData, categoriesData, unitsData] = await Promise.all([
        supabase.from('stock_stores').select('id, name').order('name'),
        supabase.from('stock_bins').select('id, name, store_id').order('name'),
        supabase.from('stock_categories').select('id, name').order('name'),
        supabase.from('units_of_measure').select('id, code, name').order('name'),
      ]);

      if (storesData.data) setStores(storesData.data);
      if (binsData.data) setBins(binsData.data);
      if (categoriesData.data) setCategories(categoriesData.data);
      if (unitsData.data) setUnitsOfMeasure(unitsData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const toggleField = (fieldName: string) => {
    const newFields = new Set(fieldsToUpdate);
    if (newFields.has(fieldName)) {
      newFields.delete(fieldName);
    } else {
      newFields.add(fieldName);
    }
    setFieldsToUpdate(newFields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (fieldsToUpdate.size === 0) {
      alert('Please select at least one field to update.');
      return;
    }

    setLoading(true);

    try {
      const updateData: Record<string, any> = {};

      fieldsToUpdate.forEach(field => {
        const value = formData[field];
        if (value === '' || value === null) {
          updateData[field] = null;
        } else {
          updateData[field] = value;
        }
      });

      const { error } = await supabase
        .from('stock_items')
        .update(updateData)
        .in('id', selectedItemIds);

      if (error) throw error;

      onComplete();
      onClose();
    } catch (error) {
      console.error('Error updating items:', error);
      alert('Failed to update items: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const filteredBins = formData.store_id
    ? bins.filter(bin => bin.store_id === formData.store_id)
    : bins;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bulk Edit Items</h2>
            <p className="text-sm text-gray-600 mt-1">
              Editing {selectedItemIds.length} item{selectedItemIds.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Select fields to update</p>
                <p>Check the boxes next to the fields you want to update. Unchecked fields will remain unchanged.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Category */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={fieldsToUpdate.has('category_id')}
                onChange={() => toggleField('category_id')}
                className="mt-2 h-4 w-4 text-blue-600 rounded"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  disabled={!fieldsToUpdate.has('category_id')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Store */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={fieldsToUpdate.has('store_id')}
                onChange={() => toggleField('store_id')}
                className="mt-2 h-4 w-4 text-blue-600 rounded"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store
                </label>
                <select
                  value={formData.store_id}
                  onChange={(e) => {
                    setFormData({ ...formData, store_id: e.target.value, bin_id: '' });
                  }}
                  disabled={!fieldsToUpdate.has('store_id')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- Select Store --</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bin */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={fieldsToUpdate.has('bin_id')}
                onChange={() => toggleField('bin_id')}
                className="mt-2 h-4 w-4 text-blue-600 rounded"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bin
                </label>
                <select
                  value={formData.bin_id}
                  onChange={(e) => setFormData({ ...formData, bin_id: e.target.value })}
                  disabled={!fieldsToUpdate.has('bin_id')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- Select Bin --</option>
                  {filteredBins.map(bin => (
                    <option key={bin.id} value={bin.id}>{bin.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Manufacturer */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={fieldsToUpdate.has('manufacturer')}
                onChange={() => toggleField('manufacturer')}
                className="mt-2 h-4 w-4 text-blue-600 rounded"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  disabled={!fieldsToUpdate.has('manufacturer')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter manufacturer"
                />
              </div>
            </div>

            {/* Model */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={fieldsToUpdate.has('model')}
                onChange={() => toggleField('model')}
                className="mt-2 h-4 w-4 text-blue-600 rounded"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  disabled={!fieldsToUpdate.has('model')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter model"
                />
              </div>
            </div>

            {/* Unit of Measure */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={fieldsToUpdate.has('unit_of_measure')}
                onChange={() => toggleField('unit_of_measure')}
                className="mt-2 h-4 w-4 text-blue-600 rounded"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit of Measure
                </label>
                <select
                  value={formData.unit_of_measure}
                  onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                  disabled={!fieldsToUpdate.has('unit_of_measure')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- Select Unit --</option>
                  {unitsOfMeasure.map(unit => (
                    <option key={unit.id} value={unit.code}>
                      {unit.name} ({unit.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Purchase Cost */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={fieldsToUpdate.has('purchase_cost')}
                onChange={() => toggleField('purchase_cost')}
                className="mt-2 h-4 w-4 text-blue-600 rounded"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Cost
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchase_cost}
                  onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                  disabled={!fieldsToUpdate.has('purchase_cost')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Replacement Cost */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={fieldsToUpdate.has('replacement_cost')}
                onChange={() => toggleField('replacement_cost')}
                className="mt-2 h-4 w-4 text-blue-600 rounded"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Replacement Cost
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.replacement_cost}
                  onChange={(e) => setFormData({ ...formData, replacement_cost: e.target.value })}
                  disabled={!fieldsToUpdate.has('replacement_cost')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Reorder Point */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={fieldsToUpdate.has('reorder_point')}
                onChange={() => toggleField('reorder_point')}
                className="mt-2 h-4 w-4 text-blue-600 rounded"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reorder Point
                </label>
                <input
                  type="number"
                  value={formData.reorder_point}
                  onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
                  disabled={!fieldsToUpdate.has('reorder_point')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Reorder Quantity */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={fieldsToUpdate.has('reorder_quantity')}
                onChange={() => toggleField('reorder_quantity')}
                className="mt-2 h-4 w-4 text-blue-600 rounded"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reorder Quantity
                </label>
                <input
                  type="number"
                  value={formData.reorder_quantity}
                  onChange={(e) => setFormData({ ...formData, reorder_quantity: e.target.value })}
                  disabled={!fieldsToUpdate.has('reorder_quantity')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={fieldsToUpdate.has('is_active')}
                onChange={() => toggleField('is_active')}
                className="mt-2 h-4 w-4 text-blue-600 rounded"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                  disabled={!fieldsToUpdate.has('is_active')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || fieldsToUpdate.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {loading ? 'Updating...' : `Update ${selectedItemIds.length} Item${selectedItemIds.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkEditModal;
