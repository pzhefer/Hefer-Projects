import React, { useState, useEffect, useMemo } from 'react';
import { Plus, CreditCard as Edit2, Trash2, X, Save, Building2, Box, Tag, FolderTree, ChevronRight, ChevronDown, Settings2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LocationSelector from './LocationSelector';
import CustomFieldsManager from './CustomFieldsManager';

interface Store {
  id: string;
  code: string;
  name: string;
  location?: string;
  address?: string;
  city_id?: string;
  state_id?: string;
  country_id?: string;
  postal_code?: string;
  is_active: boolean;
  city_name?: string | null;
  state_name?: string | null;
  country_name?: string | null;
}

interface Bin {
  id: string;
  store_id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  store_code?: string;
  store_name?: string;
}

interface Category {
  id: string;
  name: string;
  parent_id?: string;
  children?: Category[];
  level?: number;
}

type SettingSection = 'stores' | 'bins' | 'categories' | 'item_types' | 'custom_fields';

export default function StockSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingSection>('stores');
  const [stores, setStores] = useState<Store[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [itemTypes] = useState(['inventory', 'asset', 'tool', 'consumable']);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [storesResult, binsResult, categoriesResult] = await Promise.all([
        supabase.from('stock_stores').select(`
          *,
          city_name:global_cities!city(name),
          state_name:global_states!state(name),
          country_name:global_countries!country(name)
        `).order('code'),
        supabase.from('stock_bins').select(`
          *,
          store:stock_stores!store_id(code, name)
        `).order('code'),
        supabase.from('stock_categories').select('*')
      ]);

      console.log('Stores result:', storesResult);
      if (storesResult.error) {
        console.error('Stores query error:', storesResult.error);
      }

      if (storesResult.data) {
        const transformedStores = storesResult.data.map((store: any) => ({
          ...store,
          city_name: store.city_name?.name || null,
          state_name: store.state_name?.name || null,
          country_name: store.country_name?.name || null
        }));
        console.log('Transformed stores:', transformedStores);
        setStores(transformedStores);
      }
      if (binsResult.data) {
        const transformedBins = binsResult.data.map((bin: any) => ({
          ...bin,
          store_code: bin.store?.code || null,
          store_name: bin.store?.name || null
        }));
        setBins(transformedBins);
      }
      if (categoriesResult.data) setCategories(categoriesResult.data);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildCategoryTree = (categories: Category[]): Category[] => {
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [], level: 0 });
    });

    categories.forEach(cat => {
      const category = categoryMap.get(cat.id)!;
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          category.level = (parent.level || 0) + 1;
          parent.children!.push(category);
        } else {
          rootCategories.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  };

  const buildHierarchicalCategoryList = (categories: Category[], excludeId?: string) => {
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    // First pass: create all category nodes
    categories.forEach(cat => {
      if (cat.id !== excludeId) {
        categoryMap.set(cat.id, { ...cat, children: [] });
      }
    });

    // Second pass: build the tree structure
    categories.forEach(cat => {
      if (cat.id === excludeId) return;
      const category = categoryMap.get(cat.id);
      if (!category) return;

      if (cat.parent_id && categoryMap.has(cat.parent_id)) {
        const parent = categoryMap.get(cat.parent_id);
        parent!.children!.push(category);
      } else {
        rootCategories.push(category);
      }
    });

    // Sort root categories and their children alphabetically
    const sortCategories = (cats: Category[]) => {
      cats.sort((a, b) => a.name.localeCompare(b.name));
      cats.forEach(cat => {
        if (cat.children && cat.children.length > 0) {
          sortCategories(cat.children);
        }
      });
    };
    sortCategories(rootCategories);

    // Flatten the tree into a list with level information
    const flatList: Category[] = [];
    const traverse = (nodes: Category[], level: number = 0) => {
      nodes.forEach(node => {
        flatList.push({ ...node, level });
        if (node.children && node.children.length > 0) {
          traverse(node.children, level + 1);
        }
      });
    };
    traverse(rootCategories);

    return flatList;
  };

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

  const flattenTree = (tree: Category[]): Category[] => {
    const result: Category[] = [];
    const traverse = (nodes: Category[]) => {
      nodes.forEach(node => {
        result.push(node);
        if (node.children && node.children.length > 0 && expandedCategories.has(node.id)) {
          traverse(node.children);
        }
      });
    };
    traverse(tree);
    return result;
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getLeafCategories = (categories: Category[]): Category[] => {
    return categories.filter(cat => {
      const hasChildren = categories.some(c => c.parent_id === cat.id);
      return !hasChildren;
    });
  };

  // Group bins by store
  const binsByStore = useMemo(() => {
    const grouped = new Map<string, Bin[]>();
    bins.forEach(bin => {
      if (!grouped.has(bin.store_id)) {
        grouped.set(bin.store_id, []);
      }
      grouped.get(bin.store_id)!.push(bin);
    });
    return grouped;
  }, [bins]);

  const toggleStore = (storeId: string) => {
    const newExpanded = new Set(expandedStores);
    if (newExpanded.has(storeId)) {
      newExpanded.delete(storeId);
    } else {
      newExpanded.add(storeId);
    }
    setExpandedStores(newExpanded);
  };

  const openStoreModal = (store?: Store) => {
    setEditingItem(store || null);
    setSelectedCountry(store?.country || '');
    setSelectedState(store?.state || '');
    setSelectedCity(store?.city || '');
    setShowModal(true);
  };

  const openBinModal = (bin?: Bin) => {
    setEditingItem(bin || null);
    setShowModal(true);
  };

  const openCategoryModal = (category?: Category) => {
    setEditingItem(category || null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      if (activeTab === 'stores') {
        const storeData = {
          code: formData.get('code') as string,
          name: formData.get('name') as string,
          location: formData.get('location') as string || null,
          address: formData.get('address') as string || null,
          city: formData.get('city') as string || null,
          state: formData.get('state') as string || null,
          postal_code: formData.get('postal_code') as string || null,
          country: formData.get('country') as string || null,
          is_active: formData.get('is_active') === 'on',
        };

        if (editingItem) {
          const { error } = await supabase
            .from('stock_stores')
            .update(storeData)
            .eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('stock_stores')
            .insert(storeData);
          if (error) throw error;
        }
      } else if (activeTab === 'bins') {
        const binData = {
          store_id: formData.get('store_id') as string,
          code: formData.get('code') as string,
          name: formData.get('name') as string,
          description: formData.get('description') as string || null,
          is_active: formData.get('is_active') === 'on',
        };

        if (editingItem) {
          const { error } = await supabase
            .from('stock_bins')
            .update(binData)
            .eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('stock_bins')
            .insert(binData);
          if (error) throw error;
        }
      } else if (activeTab === 'categories') {
        const categoryData = {
          name: formData.get('name') as string,
          parent_id: formData.get('parent_id') as string || null,
        };

        if (editingItem) {
          const { error } = await supabase
            .from('stock_categories')
            .update(categoryData)
            .eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('stock_categories')
            .insert(categoryData);
          if (error) throw error;
        }
      }

      setShowModal(false);
      setEditingItem(null);
      fetchData();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save. Check console for details.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      let error;
      if (activeTab === 'stores') {
        ({ error } = await supabase.from('stock_stores').delete().eq('id', id));
      } else if (activeTab === 'bins') {
        ({ error } = await supabase.from('stock_bins').delete().eq('id', id));
      } else if (activeTab === 'categories') {
        ({ error } = await supabase.from('stock_categories').delete().eq('id', id));
      }

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete. Check console for details.');
    }
  };

  const tabs = [
    { id: 'stores', name: 'Stores & Locations', icon: Building2 },
    { id: 'bins', name: 'Bins & Shelves', icon: Box },
    { id: 'categories', name: 'Categories', icon: FolderTree },
    { id: 'item_types', name: 'Item Types', icon: Tag },
    { id: 'custom_fields', name: 'Custom Fields', icon: Settings2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingSection)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={20} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Stores Section */}
          {activeTab === 'stores' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Stores & Locations</h3>
                  <p className="text-sm text-gray-600 mt-1">Manage warehouses, stores, and locations</p>
                </div>
                <button
                  onClick={() => openStoreModal()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus size={20} />
                  Add Store
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-y border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stores.map((store) => (
                      <tr key={store.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{store.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{store.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{store.location || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{store.city_name || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            store.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {store.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <button
                            onClick={() => openStoreModal(store)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(store.id)}
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
          )}

          {/* Bins Section */}
          {activeTab === 'bins' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Bins & Shelves</h3>
                  <p className="text-sm text-gray-600 mt-1">Manage storage bins and shelving locations</p>
                </div>
                <button
                  onClick={() => openBinModal()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus size={20} />
                  Add Bin
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-y border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store / Bin</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stores.map((store) => {
                      const storeBins = binsByStore.get(store.id) || [];
                      const isExpanded = expandedStores.has(store.id);

                      return (
                        <React.Fragment key={store.id}>
                          <tr className="bg-gray-50 hover:bg-gray-100">
                            <td colSpan={6} className="px-4 py-3">
                              <button
                                onClick={() => toggleStore(store.id)}
                                className="flex items-center gap-2 w-full text-left"
                              >
                                {isExpanded ? (
                                  <ChevronDown size={16} className="text-gray-500" />
                                ) : (
                                  <ChevronRight size={16} className="text-gray-500" />
                                )}
                                <Building2 size={16} className="text-blue-600" />
                                <span className="font-semibold text-gray-900">
                                  {store.code} - {store.name}
                                </span>
                                <span className="text-sm text-gray-500 ml-2">
                                  ({storeBins.length} {storeBins.length === 1 ? 'bin' : 'bins'})
                                </span>
                              </button>
                            </td>
                          </tr>
                          {isExpanded && storeBins.map((bin) => (
                            <tr key={bin.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">
                                <div className="pl-8 text-gray-500">└─</div>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{bin.code}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{bin.name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{bin.description || '-'}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  bin.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {bin.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                <button
                                  onClick={() => openBinModal(bin)}
                                  className="text-blue-600 hover:text-blue-800 mr-3"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(bin.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Categories Section */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Categories</h3>
                  <p className="text-sm text-gray-600 mt-1">Organize items into categories</p>
                </div>
                <button
                  onClick={() => openCategoryModal()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus size={20} />
                  Add Category
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-y border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {flattenTree(categoryTree).map((category) => {
                      const hasChildren = category.children && category.children.length > 0;
                      const isExpanded = expandedCategories.has(category.id);
                      const indentLevel = category.level || 0;

                      return (
                        <tr key={category.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            <div
                              className="flex items-center gap-2"
                              style={{ paddingLeft: `${indentLevel * 24}px` }}
                            >
                              {hasChildren ? (
                                <button
                                  onClick={() => toggleCategory(category.id)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  {isExpanded ? (
                                    <ChevronDown size={16} />
                                  ) : (
                                    <ChevronRight size={16} />
                                  )}
                                </button>
                              ) : (
                                <div className="w-4"></div>
                              )}
                              <span className={`${hasChildren ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                {category.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              hasChildren
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {hasChildren ? 'Parent' : 'Leaf'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <button
                              onClick={() => openCategoryModal(category)}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(category.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Item Types Section */}
          {activeTab === 'item_types' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Item Types</h3>
                <p className="text-sm text-gray-600 mt-1">System-defined item types for classification</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {itemTypes.map((type) => (
                  <div key={type} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                      <Tag className="text-blue-600" size={24} />
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{type}</p>
                        <p className="text-xs text-gray-500">System type</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Item types are system-defined and cannot be modified. They include:
                  Inventory (general stock), Asset (fixed assets), Tool (equipment/tools), and Consumable (single-use items).
                </p>
              </div>
            </div>
          )}

          {/* Custom Fields Section */}
          {activeTab === 'custom_fields' && (
            <CustomFieldsManager />
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Edit' : 'Add'} {activeTab === 'stores' ? 'Store' : activeTab === 'bins' ? 'Bin' : 'Category'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {activeTab === 'stores' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Store Code *
                      </label>
                      <input
                        type="text"
                        name="code"
                        defaultValue={editingItem?.code}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., STORE-1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Store Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingItem?.name}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Main Warehouse"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location Description
                      </label>
                      <input
                        type="text"
                        name="location"
                        defaultValue={editingItem?.location}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Building A, Floor 2"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        defaultValue={editingItem?.address}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 123 Main St"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <LocationSelector
                        countryValue={selectedCountry}
                        stateValue={selectedState}
                        cityValue={selectedCity}
                        onCountryChange={setSelectedCountry}
                        onStateChange={setSelectedState}
                        onCityChange={setSelectedCity}
                        showLabels={true}
                      />
                      <input type="hidden" name="country" value={selectedCountry} />
                      <input type="hidden" name="state" value={selectedState} />
                      <input type="hidden" name="city" value={selectedCity} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        name="postal_code"
                        defaultValue={editingItem?.postal_code}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={editingItem?.is_active ?? true}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </>
              )}

              {activeTab === 'bins' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Store *
                    </label>
                    <select
                      name="store_id"
                      defaultValue={editingItem?.store_id}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Store</option>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.code} - {store.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bin Code *
                      </label>
                      <input
                        type="text"
                        name="code"
                        defaultValue={editingItem?.code}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., A-01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bin Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingItem?.name}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Aisle A, Shelf 1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      defaultValue={editingItem?.description}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={editingItem?.is_active ?? true}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </>
              )}

              {activeTab === 'categories' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingItem?.name}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Safety Equipment"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Category
                    </label>
                    <select
                      name="parent_id"
                      defaultValue={editingItem?.parent_id}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">None (Top Level)</option>
                      {buildHierarchicalCategoryList(categories, editingItem?.id).map((category) => (
                        <option key={category.id} value={category.id}>
                          {'\u00a0\u00a0'.repeat(category.level || 0)}{(category.level || 0) > 0 ? '└─ ' : ''}{category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
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
