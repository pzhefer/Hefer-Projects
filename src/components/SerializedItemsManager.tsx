import { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, X, Save, Hash, MapPin, Calendar,
  AlertCircle, CheckCircle, Wrench, Package, AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SerializedItem {
  id: string;
  item_id: string;
  serial_number: string;
  location_id?: string;
  condition: string;
  status: string;
  purchase_date?: string;
  purchase_cost?: number;
  warranty_expiry?: string;
  last_service_date?: string;
  next_service_date?: string;
  notes?: string;
  created_at: string;
  stock_item?: {
    item_code: string;
    name: string;
    manufacturer?: string;
    model?: string;
  };
  location?: {
    name: string;
  };
}

interface Location {
  id: string;
  name: string;
  type: string;
}

interface Props {
  itemId: string;
  itemName: string;
  onClose: () => void;
}

export default function SerializedItemsManager({ itemId, itemName, onClose }: Props) {
  const { user } = useAuth();
  const [serializedItems, setSerializedItems] = useState<SerializedItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SerializedItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    serial_number: '',
    location_id: '',
    condition: 'good',
    status: 'available',
    purchase_date: '',
    purchase_cost: '',
    warranty_expiry: '',
    last_service_date: '',
    next_service_date: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, itemId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [itemsResult, locationsResult] = await Promise.all([
        supabase
          .from('stock_serialized_items')
          .select(`
            *,
            stock_item:stock_items(item_code, name, manufacturer, model),
            location:stock_locations(name)
          `)
          .eq('item_id', itemId)
          .order('serial_number'),
        supabase
          .from('stock_locations')
          .select('id, name, type')
          .eq('is_active', true)
          .order('name')
      ]);

      if (itemsResult.data) setSerializedItems(itemsResult.data as any);
      if (locationsResult.data) setLocations(locationsResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item?: SerializedItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        serial_number: item.serial_number,
        location_id: item.location_id || '',
        condition: item.condition,
        status: item.status,
        purchase_date: item.purchase_date || '',
        purchase_cost: item.purchase_cost?.toString() || '',
        warranty_expiry: item.warranty_expiry || '',
        last_service_date: item.last_service_date || '',
        next_service_date: item.next_service_date || '',
        notes: item.notes || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        serial_number: '',
        location_id: '',
        condition: 'good',
        status: 'available',
        purchase_date: '',
        purchase_cost: '',
        warranty_expiry: '',
        last_service_date: '',
        next_service_date: '',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToSave = {
        item_id: itemId,
        serial_number: formData.serial_number,
        location_id: formData.location_id || null,
        condition: formData.condition,
        status: formData.status,
        purchase_date: formData.purchase_date || null,
        purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null,
        warranty_expiry: formData.warranty_expiry || null,
        last_service_date: formData.last_service_date || null,
        next_service_date: formData.next_service_date || null,
        notes: formData.notes || null
      };

      if (editingItem) {
        const { error } = await supabase
          .from('stock_serialized_items')
          .update(dataToSave)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('stock_serialized_items')
          .insert([dataToSave]);

        if (error) throw error;
      }

      setShowModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving serialized item:', error);
      alert(error.message || 'Failed to save serialized item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this serialized item?')) return;

    try {
      const { error } = await supabase
        .from('stock_serialized_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      console.error('Error deleting serialized item:', error);
      alert('Failed to delete serialized item');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="text-green-600" size={16} />;
      case 'in_use': return <Package className="text-blue-600" size={16} />;
      case 'on_hire': return <Package className="text-purple-600" size={16} />;
      case 'maintenance': return <Wrench className="text-orange-600" size={16} />;
      case 'retired': return <AlertCircle className="text-gray-600" size={16} />;
      default: return <AlertTriangle className="text-red-600" size={16} />;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-orange-100 text-orange-800';
      case 'damaged': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'in_use': return 'bg-blue-100 text-blue-800';
      case 'on_hire': return 'bg-purple-100 text-purple-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      case 'retired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const filteredItems = serializedItems.filter(item =>
    item.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusCounts = serializedItems.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Serialized Items</h2>
              <p className="text-sm text-gray-600 mt-1">{itemName}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Available</div>
              <div className="text-2xl font-bold text-green-600">{statusCounts.available || 0}</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">In Use</div>
              <div className="text-2xl font-bold text-blue-600">{statusCounts.in_use || 0}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">On Hire</div>
              <div className="text-2xl font-bold text-purple-600">{statusCounts.on_hire || 0}</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Maintenance</div>
              <div className="text-2xl font-bold text-orange-600">{statusCounts.maintenance || 0}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Retired</div>
              <div className="text-2xl font-bold text-gray-600">{statusCounts.retired || 0}</div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by serial number or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              Add Serialized Item
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warranty Expiry</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Hash size={16} className="text-gray-400" />
                        <span className="font-mono font-medium text-gray-900">{item.serial_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.location?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getConditionColor(item.condition)}`}>
                        {item.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.warranty_expiry ? new Date(item.warranty_expiry).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openModal(item)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <form onSubmit={handleSubmit}>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingItem ? 'Edit' : 'Add'} Serialized Item
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serial Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Enter serial number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <select
                      value={formData.location_id}
                      onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select location</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Condition
                    </label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="available">Available</option>
                      <option value="in_use">In Use</option>
                      <option value="on_hire">On Hire</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="retired">Retired</option>
                      <option value="disposed">Disposed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.purchase_cost}
                      onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warranty Expiry
                    </label>
                    <input
                      type="date"
                      value={formData.warranty_expiry}
                      onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Service Date
                    </label>
                    <input
                      type="date"
                      value={formData.last_service_date}
                      onChange={(e) => setFormData({ ...formData, last_service_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Next Service Date
                    </label>
                    <input
                      type="date"
                      value={formData.next_service_date}
                      onChange={(e) => setFormData({ ...formData, next_service_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save size={20} />
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
