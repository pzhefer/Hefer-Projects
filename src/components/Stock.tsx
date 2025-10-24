import { useState, useEffect } from 'react';
import {
  Package, Plus, Search, TrendingUp, AlertCircle, Clock, DollarSign, Users, ShoppingCart,
  Truck, Wrench, FileText, CheckSquare, BarChart, Settings as SettingsIcon, Box, MapPin, Hash, Layers, LayoutDashboard
} from 'lucide-react';
import { supabase, type StockItem, type HireBooking, type StockLocation } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import StockItemsManager from './StockItemsManager';
import StockSettings from './StockSettings';

export default function Stock() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<'dashboard' | 'items' | 'hires' | 'transfers' | 'maintenance' | 'invoices' | 'customers' | 'reports' | 'settings'>('dashboard');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [hireBookings, setHireBookings] = useState<HireBooking[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [itemsResult, bookingsResult, locationsResult, serializedCountResult] = await Promise.all([
        supabase
          .from('stock_items')
          .select('*')
          .order('name'),
        supabase
          .from('hire_bookings')
          .select('*')
          .in('status', ['reserved', 'checked_out', 'overdue'])
          .order('created_at', { ascending: false }),
        supabase
          .from('stock_locations')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('stock_serialized_items')
          .select('id, item_id, status')
      ]);

      if (itemsResult.error) throw itemsResult.error;
      if (bookingsResult.error) throw bookingsResult.error;
      if (locationsResult.error) throw locationsResult.error;

      const items = itemsResult.data || [];
      const serializedItems = serializedCountResult.data || [];

      const enrichedItems = items.map(item => {
        if (item.is_serialized) {
          const itemSerializedUnits = serializedItems.filter(si => si.item_id === item.id);
          return {
            ...item,
            serialized_count: itemSerializedUnits.length,
            available_count: itemSerializedUnits.filter(si => si.status === 'available').length
          };
        }
        return item;
      });

      setStockItems(enrichedItems as any);
      setHireBookings(bookingsResult.data || []);
      setLocations(locationsResult.data || []);
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const serializedItems = stockItems.filter(i => (i as any).is_serialized);
  const nonSerializedItems = stockItems.filter(i => !(i as any).is_serialized);
  const totalSerializedUnits = serializedItems.reduce((sum, item) => sum + ((item as any).serialized_count || 0), 0);

  const stats = {
    totalItems: stockItems.length,
    activeItems: stockItems.filter(i => i.is_active).length,
    serializedItems: serializedItems.length,
    totalSerializedUnits: totalSerializedUnits,
    nonSerializedItems: nonSerializedItems.length,
    lowStock: stockItems.filter(i => i.reorder_point > 0).length,
    onHire: hireBookings.filter(b => b.status === 'checked_out').length,
    overdue: hireBookings.filter(b => b.status === 'overdue').length,
    totalValue: stockItems.reduce((sum, item) => sum + (item.replacement_cost || 0), 0),
    locations: locations.length
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'items', name: 'Stock Items', icon: Package, count: stats.totalItems },
    { id: 'hires', name: 'Hires & Bookings', icon: Truck, count: stats.onHire },
    { id: 'transfers', name: 'Transfers', icon: MapPin },
    { id: 'maintenance', name: 'Maintenance', icon: Wrench },
    { id: 'invoices', name: 'Invoicing', icon: FileText },
    { id: 'customers', name: 'Customers', icon: Users },
    { id: 'reports', name: 'Reports', icon: BarChart },
    { id: 'settings', name: 'Settings', icon: SettingsIcon }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading stock management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Collapsible Sidebar */}
      <aside
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={`${
          sidebarExpanded ? 'w-64' : 'w-20'
        } bg-slate-800 text-white transition-all duration-300 flex-shrink-0`}
      >
        <nav className="py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as any)}
                className={`w-full flex items-center px-4 py-3 transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white border-l-4 border-blue-500'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarExpanded && (
                  <span className="ml-3 font-medium whitespace-nowrap">{item.name}</span>
                )}
                {sidebarExpanded && item.count !== undefined && (
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-200'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        {activeSection === 'dashboard' && (
        <div className="p-6 space-y-6 overflow-y-auto">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Stock Dashboard</h2>
            <p className="text-gray-600 mt-1">Overview of your inventory and operations</p>
          </div>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalItems}</p>
                </div>
                <Box className="text-gray-400" size={24} />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Serialized Items</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{stats.serializedItems}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.totalSerializedUnits} units</p>
                </div>
                <Hash className="text-purple-400" size={24} />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Bulk Items</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.nonSerializedItems}</p>
                </div>
                <Layers className="text-green-400" size={24} />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">On Hire</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.onHire}</p>
                </div>
                <Truck className="text-blue-400" size={24} />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{stats.overdue}</p>
                </div>
                <AlertCircle className="text-red-400" size={24} />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{stats.lowStock}</p>
                </div>
                <Clock className="text-orange-400" size={24} />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Locations</p>
                  <p className="text-2xl font-bold text-gray-600 mt-1">{stats.locations}</p>
                </div>
                <MapPin className="text-gray-400" size={24} />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(stats.totalValue)}</p>
                </div>
                <DollarSign className="text-green-400" size={24} />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Content Section */}
        {activeSection !== 'dashboard' && (
        <div className="flex-1 min-h-0 px-6 pb-6">
          {activeSection === 'items' ? (
            <StockItemsManager />
          ) : activeSection === 'settings' ? (
            <StockSettings />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-center py-12">
                <Package className="mx-auto text-gray-400 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {navigation.find(n => n.id === activeSection)?.name}
                </h3>
                <p className="text-gray-600 mb-6">
                  This section is currently under development. The comprehensive stock management system will include:
                </p>

                {activeSection === 'hires' && (
                <div className="max-w-2xl mx-auto text-left bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Hire & Booking Features:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Internal hire to projects with automatic cost allocation</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>External customer rentals with rate management</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Reservation system with conflict detection</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Check-out and check-in workflows with condition tracking</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Overdue tracking and automated reminders</span>
                    </li>
                  </ul>
                </div>
              )}

              {activeSection === 'transfers' && (
                <div className="max-w-2xl mx-auto text-left bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Transfer Features:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Inter-location stock transfers with approval workflow</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>In-transit tracking and receiving</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Bulk transfer processing</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Transfer documentation and history</span>
                    </li>
                  </ul>
                </div>
              )}

              {activeSection === 'maintenance' && (
                <div className="max-w-2xl mx-auto text-left bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Maintenance Features:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Service scheduling and maintenance tracking</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Job cards and work orders</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Service meter readings and usage tracking</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Safety inspections and compliance certificates</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Maintenance cost tracking</span>
                    </li>
                  </ul>
                </div>
              )}

              {activeSection === 'invoices' && (
                <div className="max-w-2xl mx-auto text-left bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Invoicing Features:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Automated invoice generation from hire bookings</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Customer billing and payment tracking</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Purchase orders and supplier management</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Damage charges and late fees</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Financial reporting and aging analysis</span>
                    </li>
                  </ul>
                </div>
              )}

              {activeSection === 'customers' && (
                <div className="max-w-2xl mx-auto text-left bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Customer Management Features:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Customer database with contact details and history</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Customer-specific pricing and discounts</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Credit limits and payment terms</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Customer portal for self-service</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Supplier management and purchase orders</span>
                    </li>
                  </ul>
                </div>
              )}

              {activeSection === 'reports' && (
                <div className="max-w-2xl mx-auto text-left bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Reporting Features:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Stock valuation and inventory reports</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Utilization analysis and hire revenue reports</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Stock takes and cycle counting</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Project cost allocation reports</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Maintenance cost analysis</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Custom report builder with exports</span>
                    </li>
                  </ul>
                </div>
              )}
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
