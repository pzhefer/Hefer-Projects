import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, Filter, CreditCard as Edit2, Trash2, Package, Barcode, Image as ImageIcon, FileText, Tag, MapPin, Box, DollarSign, TrendingUp, Check, X, Upload, Download, Grid2x2 as Grid, List, Printer, QrCode, Hash, Columns2 as Columns, ChevronDown, ChevronUp, Group, ArrowUp, ArrowDown, ArrowUpDown, GripVertical, FilterX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateBarcode, generateQRCode, generateAssetCode } from '../lib/barcodeHelpers';
import SerializedItemsManager from './SerializedItemsManager';
import StockItemGallery from './StockItemGallery';
import SuccessNotificationModal from './SuccessNotificationModal';
import ErrorNotificationModal from './ErrorNotificationModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface StockItem {
  id: string;
  item_code: string;
  name: string;
  description?: string;
  store_id?: string;
  bin_id?: string;
  category_id?: string;
  unit_of_measure?: string;
  item_type: string;
  is_serialized?: boolean;
  is_kit: boolean;
  manufacturer?: string;
  model?: string;
  year?: number;
  dimensions?: string;
  weight?: number;
  color?: string;
  capacity?: string;
  barcode?: string;
  qr_code?: string;
  purchase_cost?: number;
  replacement_cost?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  is_active: boolean;
  custom_fields?: any;
  stores?: { code: string; name: string };
  bins?: { code: string; name: string };
  categories?: { name: string };
  total_quantity?: number;
  available_quantity?: number;
  serialized_count?: number;
}

interface Store {
  id: string;
  code: string;
  name: string;
}

interface Bin {
  id: string;
  store_id: string;
  code: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  parent_id?: string;
  path?: string;
}

interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
  unit_type: string;
  is_active: boolean;
}

interface StockItemImage {
  id: string;
  item_id: string;
  file_path: string;
  is_primary: boolean;
}

type ColumnKey = 'item_code' | 'photo' | 'description' | 'quantity' | 'store' | 'bin' | 'unit' | 'cost' | 'location' | 'category' | 'manufacturer' | 'type' | 'year' | 'color' | 'capacity' | 'barcode' | 'status';

interface Column {
  key: ColumnKey;
  label: string;
  visible: boolean;
  width?: number;
  sortDirection?: 'asc' | 'desc' | null;
}

export default function StockItemsManager() {
  const { user } = useAuth();
  const [items, setItems] = useState<StockItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasure[]>([]);
  const [itemImages, setItemImages] = useState<Record<string, StockItemImage | null>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedBin, setSelectedBin] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [showSerializedManager, setShowSerializedManager] = useState<{ itemId: string; itemName: string } | null>(null);
  const [showGallery, setShowGallery] = useState<{ itemId: string; itemName: string } | null>(null);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [expandedFilterSections, setExpandedFilterSections] = useState<Set<string>>(new Set(['category', 'manufacturer', 'type', 'status']));
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);
  const [selectedItemTypes, setSelectedItemTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [successNotification, setSuccessNotification] = useState<{ title: string; message: string } | null>(null);
  const [errorNotification, setErrorNotification] = useState<{ title: string; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ item: StockItem } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [sortColumn, setSortColumn] = useState<ColumnKey | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [resizingColumn, setResizingColumn] = useState<ColumnKey | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [openFilterColumn, setOpenFilterColumn] = useState<ColumnKey | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<number | null>(null);

  const columnSelectorRef = useRef<HTMLDivElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const groupByPanelRef = useRef<HTMLDivElement>(null);

  const [columns, setColumns] = useState<Column[]>([
    { key: 'item_code', label: 'Item Code', visible: true },
    { key: 'description', label: 'Description', visible: true },
    { key: 'photo', label: 'Photo', visible: true },
    { key: 'quantity', label: 'Quantity', visible: true },
    { key: 'store', label: 'Store', visible: false },
    { key: 'bin', label: 'Bin', visible: false },
    { key: 'location', label: 'Location', visible: false },
    { key: 'category', label: 'Category', visible: false },
    { key: 'status', label: 'Status', visible: false },
    { key: 'unit', label: 'Unit', visible: true },
    { key: 'cost', label: 'Cost', visible: true },
    { key: 'manufacturer', label: 'Manufacturer', visible: false },
    { key: 'type', label: 'Type', visible: false },
    { key: 'year', label: 'Year', visible: false },
    { key: 'color', label: 'Color', visible: false },
    { key: 'capacity', label: 'Capacity', visible: false },
    { key: 'barcode', label: 'Barcode', visible: false }
  ]);

  useEffect(() => {
    if (user) {
      loadUserPreferences();
      fetchData();
    }
  }, [user, selectedStore, selectedBin]);

  useEffect(() => {
    if (preferencesLoaded && user) {
      saveUserPreferences();
    }
  }, [columns, columnFilters, sortColumn, sortDirection, viewMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (columnSelectorRef.current && !columnSelectorRef.current.contains(target)) {
        setShowColumnSelector(false);
      }

      if (showFilterPanel && filterPanelRef.current && !filterPanelRef.current.contains(target)) {
        const filterButton = document.querySelector('[title="Filters"]');
        if (filterButton && !filterButton.contains(target)) {
          setShowFilterPanel(false);
        }
      }

      if (groupByPanelRef.current && !groupByPanelRef.current.contains(target)) {
        const panel = document.getElementById('groupByPanel');
        if (panel) panel.classList.add('hidden');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterPanel]);

  const loadUserPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .eq('module', 'stock_items')
        .maybeSingle();

      if (error) throw error;

      if (data?.preferences) {
        const prefs = data.preferences as any;
        if (prefs.columns) {
          setColumns(currentColumns => {
            const savedColumns = prefs.columns as Column[];
            const defaultColumns = [
              { key: 'item_code', label: 'Item Code', visible: true },
              { key: 'description', label: 'Description', visible: true },
              { key: 'photo', label: 'Photo', visible: true },
              { key: 'quantity', label: 'Quantity', visible: true },
              { key: 'store', label: 'Store', visible: false },
              { key: 'bin', label: 'Bin', visible: false },
              { key: 'location', label: 'Location', visible: false },
              { key: 'category', label: 'Category', visible: false },
              { key: 'status', label: 'Status', visible: false },
              { key: 'unit', label: 'Unit', visible: true },
              { key: 'cost', label: 'Cost', visible: true },
              { key: 'manufacturer', label: 'Manufacturer', visible: false },
              { key: 'type', label: 'Type', visible: false },
              { key: 'year', label: 'Year', visible: false },
              { key: 'color', label: 'Color', visible: false },
              { key: 'capacity', label: 'Capacity', visible: false },
              { key: 'barcode', label: 'Barcode', visible: false }
            ] as Column[];

            const mergedColumns = defaultColumns.map(defaultCol => {
              const savedCol = savedColumns.find(c => c.key === defaultCol.key);
              return savedCol || defaultCol;
            });

            return mergedColumns;
          });
        }
        if (prefs.columnFilters) setColumnFilters(prefs.columnFilters);
        if (prefs.sortColumn) setSortColumn(prefs.sortColumn);
        if (prefs.sortDirection) setSortDirection(prefs.sortDirection);
        if (prefs.viewMode) setViewMode(prefs.viewMode);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setPreferencesLoaded(true);
    }
  };

  const saveUserPreferences = async () => {
    if (!user) return;

    try {
      const preferences = {
        columns,
        columnFilters,
        sortColumn,
        sortDirection,
        viewMode
      };

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          module: 'stock_items',
          preferences
        }, {
          onConflict: 'user_id,module'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const getCategoryPath = (categoryId: string, allCategories: Category[]): string => {
    const category = allCategories.find(c => c.id === categoryId);
    if (!category) return '';

    if (category.parent_id) {
      const parentPath = getCategoryPath(category.parent_id, allCategories);
      return parentPath ? `${parentPath} → ${category.name}` : category.name;
    }

    return category.name;
  };

  const fetchData = async () => {
    await fetchUnitsOfMeasure();
    try {
      setLoading(true);

      let itemsQuery = supabase
        .from('stock_items')
        .select(`
          *,
          stores:stock_stores(code, name),
          bins:stock_bins(code, name),
          categories:stock_categories(name)
        `)
        .order('item_code');

      if (selectedStore) {
        itemsQuery = itemsQuery.eq('store_id', selectedStore);
      }
      if (selectedBin) {
        itemsQuery = itemsQuery.eq('bin_id', selectedBin);
      }

      const [itemsResult, storesResult, binsResult, categoriesResult, serializedCountResult, quantitiesResult] = await Promise.all([
        itemsQuery,
        supabase.from('stock_stores').select('*').eq('is_active', true).order('code'),
        supabase.from('stock_bins').select('*').eq('is_active', true).order('code'),
        supabase.from('stock_categories').select('*'),
        supabase.from('stock_serialized_items').select('id, item_id'),
        supabase.from('stock_quantities').select('item_id, quantity_on_hand')
      ]);

      if (itemsResult.error) {
        console.error('Items query error:', itemsResult.error);
        throw itemsResult.error;
      }
      if (storesResult.error) {
        console.error('Stores query error:', storesResult.error);
        throw storesResult.error;
      }
      if (binsResult.error) {
        console.error('Bins query error:', binsResult.error);
        throw binsResult.error;
      }
      if (categoriesResult.error) {
        console.error('Categories query error:', categoriesResult.error);
        throw categoriesResult.error;
      }

      console.log('Fetched items:', itemsResult.data?.length || 0);
      console.log('Fetched stores:', storesResult.data?.length || 0);
      console.log('Fetched bins:', binsResult.data?.length || 0);

      const allCategories = categoriesResult.data || [];

      const items = itemsResult.data || [];
      const serializedItems = serializedCountResult.data || [];
      const quantities = quantitiesResult.data || [];

      const enrichedItems = items.map(item => {
        if (item.is_serialized) {
          const itemSerializedUnits = serializedItems.filter(si => si.item_id === item.id);
          return {
            ...item,
            serialized_count: itemSerializedUnits.length,
            total_quantity: itemSerializedUnits.length
          };
        } else {
          const itemQuantities = quantities.filter(q => q.item_id === item.id);
          const totalQty = itemQuantities.reduce((sum, q) => sum + (q.quantity_on_hand || 0), 0);
          return {
            ...item,
            total_quantity: totalQty
          };
        }
      });

      setItems(enrichedItems);
      setStores(storesResult.data || []);
      setBins(binsResult.data || []);
      setCategories(allCategories);

      const itemIds = enrichedItems.map(item => item.id);
      await fetchItemImages(itemIds);
    } catch (error) {
      console.error('Error fetching stock items:', error);
      setErrorNotification({
        title: 'Loading Error',
        message: 'Failed to load stock items. Please check the console for details.'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitsOfMeasure = async () => {
    try {
      const { data, error } = await supabase
        .from('units_of_measure')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setUnitsOfMeasure(data || []);
    } catch (error) {
      console.error('Error fetching units of measure:', error);
    }
  };

  const fetchItemImages = async (itemIds: string[]) => {
    if (itemIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('stock_item_images')
        .select('id, item_id, file_path, is_primary')
        .in('item_id', itemIds)
        .eq('is_primary', true);

      if (error) throw error;

      const imageMap: Record<string, StockItemImage | null> = {};
      itemIds.forEach(id => {
        const image = data?.find(img => img.item_id === id);
        imageMap[id] = image || null;
      });

      setItemImages(imageMap);
    } catch (error) {
      console.error('Error fetching item images:', error);
    }
  };

  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => {
      const matchesSearch =
        item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategories.length === 0 ||
        (item.category_id && selectedCategories.includes(item.category_id));

      const matchesManufacturer = selectedManufacturers.length === 0 ||
        (item.manufacturer && selectedManufacturers.includes(item.manufacturer));

      const matchesItemType = selectedItemTypes.length === 0 ||
        selectedItemTypes.includes(item.item_type);

      const matchesStatus = selectedStatuses.length === 0 ||
        (selectedStatuses.includes('active') && item.is_active) ||
        (selectedStatuses.includes('inactive') && !item.is_active);

      // Apply column filters
      const matchesColumnFilters = Object.entries(columnFilters).every(([columnKey, filterValues]) => {
        if (!filterValues || filterValues.length === 0) return true;

        const key = columnKey as ColumnKey;
        switch (key) {
          case 'category':
            return item.categories?.name && filterValues.includes(item.categories.name);
          case 'manufacturer':
            return item.manufacturer && filterValues.includes(item.manufacturer);
          case 'type':
            return filterValues.includes(item.item_type);
          case 'color':
            return item.color && filterValues.includes(item.color);
          case 'status':
            return (filterValues.includes('Active') && item.is_active) ||
                   (filterValues.includes('Inactive') && !item.is_active);
          case 'location':
            return item.stores?.name && filterValues.includes(item.stores.name);
          case 'store':
            return item.stores?.name && filterValues.includes(item.stores.name);
          case 'bin':
            return item.bins?.name && filterValues.includes(item.bins.name);
          case 'unit':
            return item.unit_of_measure && filterValues.includes(item.unit_of_measure);
          default:
            return true;
        }
      });

      return matchesSearch && matchesCategory && matchesManufacturer && matchesItemType && matchesStatus && matchesColumnFilters;
    });

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortColumn) {
          case 'item_code':
            aVal = a.item_code;
            bVal = b.item_code;
            break;
          case 'description':
            aVal = a.name;
            bVal = b.name;
            break;
          case 'quantity':
            aVal = a.is_serialized ? (a.serialized_count || 0) : (a.total_quantity || 0);
            bVal = b.is_serialized ? (b.serialized_count || 0) : (b.total_quantity || 0);
            break;
          case 'cost':
            aVal = a.replacement_cost || 0;
            bVal = b.replacement_cost || 0;
            break;
          case 'category':
            aVal = a.categories?.name || '';
            bVal = b.categories?.name || '';
            break;
          case 'manufacturer':
            aVal = a.manufacturer || '';
            bVal = b.manufacturer || '';
            break;
          case 'type':
            aVal = a.item_type;
            bVal = b.item_type;
            break;
          case 'year':
            aVal = a.year || 0;
            bVal = b.year || 0;
            break;
          case 'color':
            aVal = a.color || '';
            bVal = b.color || '';
            break;
          case 'unit':
            aVal = a.unit_of_measure || '';
            bVal = b.unit_of_measure || '';
            break;
          case 'location':
            aVal = a.stores?.name || '';
            bVal = b.stores?.name || '';
            break;
          case 'store':
            aVal = a.stores?.name || '';
            bVal = b.stores?.name || '';
            break;
          case 'bin':
            aVal = a.bins?.name || '';
            bVal = b.bins?.name || '';
            break;
          default:
            return 0;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return filtered;
  }, [items, searchTerm, selectedCategories, selectedManufacturers, selectedItemTypes, selectedStatuses, columnFilters, sortColumn, sortDirection]);

  const uniqueManufacturers = useMemo(() => {
    const manufacturers = items
      .map(item => item.manufacturer)
      .filter((m): m is string => !!m)
      .filter((m, i, arr) => arr.indexOf(m) === i)
      .sort();
    return manufacturers;
  }, [items]);

  const uniqueItemTypes = useMemo(() => {
    const types = items
      .map(item => item.item_type)
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .sort();
    return types;
  }, [items]);

  // Helper function to get all descendant category IDs
  const getDescendantCategoryIds = (categoryId: string): string[] => {
    const descendants: string[] = [];
    const children = categories.filter(cat => cat.parent_id === categoryId);

    children.forEach(child => {
      descendants.push(child.id);
      descendants.push(...getDescendantCategoryIds(child.id));
    });

    return descendants;
  };

  // Helper function to get all ancestor category IDs
  const getAncestorCategoryIds = (categoryId: string): string[] => {
    const ancestors: string[] = [];
    const category = categories.find(cat => cat.id === categoryId);

    if (category?.parent_id) {
      ancestors.push(category.parent_id);
      ancestors.push(...getAncestorCategoryIds(category.parent_id));
    }

    return ancestors;
  };

  // Helper function to get category depth level
  const getCategoryDepth = (categoryId: string): number => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category?.parent_id) return 0;
    return 1 + getCategoryDepth(category.parent_id);
  };

  // Handle category selection with parent-child logic
  const handleCategorySelection = (categoryId: string, checked: boolean) => {
    let newSelection = [...selectedCategories];

    if (checked) {
      // Add the category and all its descendants
      newSelection.push(categoryId);
      const descendants = getDescendantCategoryIds(categoryId);
      descendants.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
    } else {
      // Remove the category and all its descendants
      const descendants = getDescendantCategoryIds(categoryId);
      newSelection = newSelection.filter(id => id !== categoryId && !descendants.includes(id));
    }

    setSelectedCategories(newSelection);
  };

  // Get categories in hierarchical order
  const getHierarchicalCategories = (): Category[] => {
    const result: Category[] = [];

    const addCategoryAndChildren = (parentId: string | null | undefined) => {
      const children = categories
        .filter(cat => cat.parent_id === parentId)
        .sort((a, b) => a.name.localeCompare(b.name));

      children.forEach(cat => {
        result.push(cat);
        addCategoryAndChildren(cat.id);
      });
    };

    addCategoryAndChildren(null);
    addCategoryAndChildren(undefined);

    return result;
  };

  const groupedItems = useMemo(() => {
    if (groupBy.length === 0) return null;

    const groups: Record<string, StockItem[]> = {};

    filteredItems.forEach(item => {
      const groupKey = groupBy.map(field => {
        switch (field) {
          case 'store':
            return item.stores?.name || 'No Store';
          case 'bin':
            return item.bins?.name || 'No Bin';
          case 'category':
            return item.categories?.name || 'Uncategorized';
          case 'manufacturer':
            return item.manufacturer || 'Unknown';
          case 'type':
            return item.item_type || 'Unknown';
          case 'location':
            return item.stores?.name || 'No Location';
          case 'status':
            return item.is_active ? 'Active' : 'Inactive';
          default:
            return 'Other';
        }
      }).join(' > ');

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredItems, groupBy]);

  const filteredBins = selectedStore
    ? bins.filter(bin => bin.store_id === selectedStore)
    : bins;

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleDragStart = (index: number) => {
    setDraggedColumn(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverColumn(index);
  };

  const handleDragEnd = () => {
    if (draggedColumn !== null && dragOverColumn !== null && draggedColumn !== dragOverColumn) {
      const newColumns = [...columns];
      const [removed] = newColumns.splice(draggedColumn, 1);
      newColumns.splice(dragOverColumn, 0, removed);
      setColumns(newColumns);
    }
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDelete = (item: StockItem) => {
    setDeleteConfirm({ item });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('stock_items')
        .delete()
        .eq('id', deleteConfirm.item.id);

      if (error) throw error;

      setDeleteConfirm(null);
      setSuccessNotification({
        title: 'Item Deleted',
        message: `${deleteConfirm.item.name} has been successfully deleted.`
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      setErrorNotification({
        title: 'Delete Failed',
        message: 'Failed to delete the item. Please try again.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getUniqueColumnValues = (columnKey: ColumnKey): string[] => {
    const values = new Set<string>();
    items.forEach(item => {
      switch (columnKey) {
        case 'category':
          if (item.categories?.name) values.add(item.categories.name);
          break;
        case 'manufacturer':
          if (item.manufacturer) values.add(item.manufacturer);
          break;
        case 'type':
          values.add(item.item_type);
          break;
        case 'color':
          if (item.color) values.add(item.color);
          break;
        case 'status':
          values.add(item.is_active ? 'Active' : 'Inactive');
          break;
        case 'location':
          if (item.stores?.name) values.add(item.stores.name);
          break;
        case 'store':
          if (item.stores?.name) values.add(item.stores.name);
          break;
        case 'bin':
          if (item.bins?.name) values.add(item.bins.name);
          break;
        case 'unit':
          if (item.unit_of_measure) values.add(item.unit_of_measure);
          break;
      }
    });
    return Array.from(values).sort();
  };

  const handleColumnSort = (columnKey: ColumnKey) => {
    if (sortColumn === columnKey) {
      // Toggle direction or clear
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handleColumnFilterChange = (columnKey: ColumnKey, value: string, checked: boolean) => {
    setColumnFilters(prev => {
      const current = prev[columnKey] || [];
      if (checked) {
        return { ...prev, [columnKey]: [...current, value] };
      } else {
        return { ...prev, [columnKey]: current.filter(v => v !== value) };
      }
    });
  };

  const handleResizeStart = (e: React.MouseEvent, columnKey: ColumnKey) => {
    e.preventDefault();
    const column = columns.find(c => c.key === columnKey);
    if (column) {
      setResizingColumn(columnKey);
      setResizeStartX(e.clientX);
      setResizeStartWidth(column.width || 150);
    }
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (resizingColumn) {
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(80, resizeStartWidth + diff);
      setColumns(prev => prev.map(col =>
        col.key === resizingColumn ? { ...col, width: newWidth } : col
      ));
    }
  };

  const handleResizeEnd = () => {
    setResizingColumn(null);
  };

  useEffect(() => {
    if (resizingColumn) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingColumn, resizeStartX, resizeStartWidth]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const storeId = formData.get('store_id') as string;
    const binId = formData.get('bin_id') as string;
    const categoryId = formData.get('category_id') as string;
    const itemType = formData.get('item_type') as string;

    const itemData = {
      item_code: formData.get('item_code') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      store_id: storeId && storeId !== '' ? storeId : null,
      bin_id: binId && binId !== '' ? binId : null,
      category_id: categoryId && categoryId !== '' ? categoryId : null,
      unit_of_measure: formData.get('unit_of_measure') as string || null,
      item_type: itemType,
      is_serialized: itemType === 'serialized',
      is_kit: false,
      manufacturer: formData.get('manufacturer') as string || null,
      model: formData.get('model') as string || null,
      year: formData.get('year') ? parseInt(formData.get('year') as string) : null,
      dimensions: formData.get('dimensions') as string || null,
      weight: formData.get('weight') ? parseFloat(formData.get('weight') as string) : null,
      color: formData.get('color') as string || null,
      capacity: formData.get('capacity') ? parseFloat(formData.get('capacity') as string) : null,
      purchase_cost: formData.get('purchase_cost') ? parseFloat(formData.get('purchase_cost') as string) : null,
      replacement_cost: formData.get('replacement_cost') ? parseFloat(formData.get('replacement_cost') as string) : null,
      is_active: formData.get('is_active') === 'on',
    };

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('stock_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;

        setShowAddModal(false);
        setEditingItem(null);
        setSuccessNotification({
          title: 'Item Updated',
          message: `${itemData.name} has been successfully updated.`
        });
        fetchData();
      } else {
        const barcode = await generateBarcode(itemData.item_code);
        const qrCode = await generateQRCode(itemData.item_code);

        const { error } = await supabase
          .from('stock_items')
          .insert({
            ...itemData,
            barcode,
            qr_code: qrCode,
          });

        if (error) throw error;

        setShowAddModal(false);
        setEditingItem(null);
        setSuccessNotification({
          title: 'Item Added',
          message: `${itemData.name} has been successfully added to your inventory.`
        });
        fetchData();
      }
    } catch (error: any) {
      console.error('Error saving item:', error);
      setErrorNotification({
        title: 'Save Failed',
        message: error.message || 'Failed to save item. Please check the console for more details.'
      });
    }
  };

  const buildHierarchicalCategoryList = (categories: any[], excludeId?: string) => {
    const categoryMap = new Map<string, any>();
    const rootCategories: any[] = [];

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
        parent.children.push(category);
      } else {
        rootCategories.push(category);
      }
    });

    // Sort root categories and their children alphabetically
    const sortCategories = (cats: any[]) => {
      cats.sort((a, b) => a.name.localeCompare(b.name));
      cats.forEach(cat => {
        if (cat.children && cat.children.length > 0) {
          sortCategories(cat.children);
        }
      });
    };
    sortCategories(rootCategories);

    // Flatten the tree into a list with level information
    const flatList: any[] = [];
    const traverse = (nodes: any[], level: number = 0) => {
      nodes.forEach(node => {
        const hasChildren = node.children && node.children.length > 0;
        flatList.push({ ...node, level, hasChildren });
        if (hasChildren) {
          traverse(node.children, level + 1);
        }
      });
    };
    traverse(rootCategories);

    return flatList;
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('category_name') as string;
    const parent_id = formData.get('parent_id') as string || null;

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('stock_categories')
          .update({ name, parent_id })
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('stock_categories')
          .insert([{ name, parent_id }])
          .select()
          .single();

        if (error) throw error;

        // Auto-select the newly created category
        if (data) {
          setCategories([...categories, data]);
          setTimeout(() => {
            const selectElement = document.querySelector('select[name="category_id"]') as HTMLSelectElement;
            if (selectElement) {
              selectElement.value = data.id;
            }
          }, 100);
        }
      }

      setShowCategoryModal(false);
      setEditingCategory(null);
      setSuccessNotification({
        title: editingCategory ? 'Category Updated' : 'Category Added',
        message: `Category "${name}" has been successfully ${editingCategory ? 'updated' : 'added'}.`
      });
      fetchData();
    } catch (error) {
      console.error('Error saving category:', error);
      setErrorNotification({
        title: 'Save Failed',
        message: 'Failed to save category. Please try again.'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading stock items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stock Items</h2>
          <p className="text-gray-600 mt-1">Manage your inventory catalog</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Item
        </button>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 flex-shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={selectedStore}
            onChange={(e) => {
              setSelectedStore(e.target.value);
              setSelectedBin('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.code} - {store.name}
              </option>
            ))}
          </select>

          <select
            value={selectedBin}
            onChange={(e) => setSelectedBin(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!selectedStore}
          >
            <option value="">All Bins</option>
            {filteredBins.map((bin) => (
              <option key={bin.id} value={bin.id}>
                {bin.code} - {bin.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <div className="relative" ref={columnSelectorRef}>
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title="Column Visibility"
              >
                <Columns size={20} />
                Columns
              </button>
              {showColumnSelector && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg border border-gray-200 shadow-lg z-50 p-3 max-h-96 overflow-y-auto">
                  <div className="font-semibold text-sm text-gray-700 mb-2 sticky top-0 bg-white pb-2 border-b">
                    <div className="flex items-center justify-between">
                      <span>Columns</span>
                      <span className="text-xs text-gray-500 font-normal">Drag to reorder</span>
                    </div>
                  </div>
                  <div className="space-y-1 mt-2">
                  {columns.map((col, index) => (
                    <div
                      key={col.key}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-2 text-sm p-2 rounded cursor-move transition-all ${
                        draggedColumn === index ? 'opacity-50' : ''
                      } ${
                        dragOverColumn === index && draggedColumn !== index
                          ? 'border-t-2 border-blue-500'
                          : ''
                      } hover:bg-gray-50`}
                    >
                      <div className="flex items-center gap-2 text-gray-400">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                          <circle cx="3" cy="3" r="1" />
                          <circle cx="9" cy="3" r="1" />
                          <circle cx="3" cy="6" r="1" />
                          <circle cx="9" cy="6" r="1" />
                          <circle cx="3" cy="9" r="1" />
                          <circle cx="9" cy="9" r="1" />
                        </svg>
                      </div>
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={(e) => {
                          setColumns(columns.map(c =>
                            c.key === col.key ? { ...c, visible: e.target.checked } : c
                          ));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1">{col.label}</span>
                    </div>
                  ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title="Filters"
              >
                <Filter size={20} />
                Filters
                {(selectedCategories.length > 0 || selectedManufacturers.length > 0 || selectedItemTypes.length > 0 || selectedStatuses.length > 0) && (
                  <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {selectedCategories.length + selectedManufacturers.length + selectedItemTypes.length + selectedStatuses.length}
                  </span>
                )}
              </button>
              {showFilterPanel && (
                <div ref={filterPanelRef} className="absolute right-0 mt-2 w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-[32rem] overflow-y-auto">
                  <div className="p-3">
                    <div className="font-semibold text-sm text-gray-700 mb-3 sticky top-0 bg-white pb-2 border-b">Filters</div>

                    {/* Category Filter */}
                    <div className="mb-2">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedFilterSections);
                          if (newExpanded.has('category')) {
                            newExpanded.delete('category');
                          } else {
                            newExpanded.add('category');
                          }
                          setExpandedFilterSections(newExpanded);
                        }}
                        className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
                      >
                        <span>Category {selectedCategories.length > 0 && `(${selectedCategories.length})`}</span>
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${expandedFilterSections.has('category') ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {expandedFilterSections.has('category') && (
                        <div className="ml-2 mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2 space-y-0.5">
                          {getHierarchicalCategories().map(cat => {
                            const depth = getCategoryDepth(cat.id);
                            return (
                              <label
                                key={cat.id}
                                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                                style={{ paddingLeft: `${depth * 16 + 4}px` }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCategories.includes(cat.id)}
                                  onChange={(e) => handleCategorySelection(cat.id, e.target.checked)}
                                  className="rounded text-blue-600 flex-shrink-0"
                                />
                                <span className="text-xs">{cat.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Manufacturer Filter */}
                    <div className="mb-2">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedFilterSections);
                          if (newExpanded.has('manufacturer')) {
                            newExpanded.delete('manufacturer');
                          } else {
                            newExpanded.add('manufacturer');
                          }
                          setExpandedFilterSections(newExpanded);
                        }}
                        className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
                      >
                        <span>Manufacturer {selectedManufacturers.length > 0 && `(${selectedManufacturers.length})`}</span>
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${expandedFilterSections.has('manufacturer') ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {expandedFilterSections.has('manufacturer') && (
                        <div className="ml-2 mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2 space-y-1">
                          {uniqueManufacturers.map(mfr => (
                            <label key={mfr} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={selectedManufacturers.includes(mfr)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedManufacturers([...selectedManufacturers, mfr]);
                                  } else {
                                    setSelectedManufacturers(selectedManufacturers.filter(m => m !== mfr));
                                  }
                                }}
                                className="rounded text-blue-600"
                              />
                              <span className="text-xs">{mfr}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Type Filter */}
                    <div className="mb-2">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedFilterSections);
                          if (newExpanded.has('type')) {
                            newExpanded.delete('type');
                          } else {
                            newExpanded.add('type');
                          }
                          setExpandedFilterSections(newExpanded);
                        }}
                        className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
                      >
                        <span>Type {selectedItemTypes.length > 0 && `(${selectedItemTypes.length})`}</span>
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${expandedFilterSections.has('type') ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {expandedFilterSections.has('type') && (
                        <div className="ml-2 mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2 space-y-1">
                          {uniqueItemTypes.map(type => (
                            <label key={type} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={selectedItemTypes.includes(type)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedItemTypes([...selectedItemTypes, type]);
                                  } else {
                                    setSelectedItemTypes(selectedItemTypes.filter(t => t !== type));
                                  }
                                }}
                                className="rounded text-blue-600"
                              />
                              <span className="text-xs">{type}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status Filter */}
                    <div className="mb-2">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedFilterSections);
                          if (newExpanded.has('status')) {
                            newExpanded.delete('status');
                          } else {
                            newExpanded.add('status');
                          }
                          setExpandedFilterSections(newExpanded);
                        }}
                        className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
                      >
                        <span>Status {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}</span>
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${expandedFilterSections.has('status') ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {expandedFilterSections.has('status') && (
                        <div className="ml-2 mt-1 border border-gray-200 rounded p-2 space-y-1">
                          {['active', 'inactive'].map(status => (
                            <label key={status} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={selectedStatuses.includes(status)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStatuses([...selectedStatuses, status]);
                                  } else {
                                    setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                                  }
                                }}
                                className="rounded text-blue-600"
                              />
                              <span className="text-xs capitalize">{status}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Clear All Button */}
                    {(selectedCategories.length > 0 || selectedManufacturers.length > 0 || selectedItemTypes.length > 0 || selectedStatuses.length > 0) && (
                      <button
                        onClick={() => {
                          setSelectedCategories([]);
                          setSelectedManufacturers([]);
                          setSelectedItemTypes([]);
                          setSelectedStatuses([]);
                        }}
                        className="w-full text-xs text-red-600 hover:text-red-700 mt-3 pt-3 border-t sticky bottom-0 bg-white"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {(Object.values(columnFilters).some(filters => filters.length > 0) ||
              selectedCategories.length > 0 ||
              selectedManufacturers.length > 0 ||
              selectedItemTypes.length > 0 ||
              selectedStatuses.length > 0) && (
              <button
                onClick={() => {
                  setColumnFilters({});
                  setSelectedCategories([]);
                  setSelectedManufacturers([]);
                  setSelectedItemTypes([]);
                  setSelectedStatuses([]);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                title="Clear all filters"
              >
                <FilterX size={20} className="stroke-2" />
              </button>
            )}

            <div className="relative" ref={groupByPanelRef}>
              <button
                onClick={() => {
                  const panel = document.getElementById('groupByPanel');
                  if (panel) panel.classList.toggle('hidden');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title="Group By"
              >
                <Group size={20} />
                Group
                {groupBy.length > 0 && (
                  <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {groupBy.length}
                  </span>
                )}
              </button>
              <div id="groupByPanel" className="hidden absolute right-0 mt-2 w-56 bg-white rounded-lg border border-gray-200 shadow-lg z-50 p-3 max-h-96 overflow-y-auto">
                <div className="font-semibold text-sm text-gray-700 mb-2 sticky top-0 bg-white pb-2">Group By</div>
                <div className="space-y-2">
                {['store', 'bin', 'category', 'status', 'type', 'manufacturer', 'location'].map(field => (
                  <label key={field} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={groupBy.includes(field)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGroupBy([...groupBy, field]);
                        } else {
                          setGroupBy(groupBy.filter(f => f !== field));
                        }
                      }}
                      className="rounded text-green-600 focus:ring-green-500"
                    />
                    <span className="capitalize">{field}</span>
                  </label>
                ))}
                </div>
                {groupBy.length > 0 && (
                  <button
                    onClick={() => setGroupBy([])}
                    className="w-full text-xs text-red-600 hover:text-red-700 mt-2 pt-2 border-t sticky bottom-0 bg-white"
                  >
                    Clear Grouping
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Items List/Grid */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-lg border border-gray-200 flex-1 min-h-0 overflow-auto">
          <table className="min-w-max w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                {columns.filter(c => c.visible).map((col, idx) => {
                  const originalIndex = columns.findIndex(c => c.key === col.key);
                  return renderHeaderCell(col, originalIndex);
                })}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupedItems ? (
                groupedItems.map(([groupKey, groupItems]) => {
                  const isExpanded = expandedGroups.has(groupKey);
                  return (
                    <React.Fragment key={groupKey}>
                      <tr className="bg-gray-100">
                        <td colSpan={columns.filter(c => c.visible).length + 1} className="p-0">
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedGroups);
                              if (isExpanded) {
                                newExpanded.delete(groupKey);
                              } else {
                                newExpanded.add(groupKey);
                              }
                              setExpandedGroups(newExpanded);
                            }}
                            className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-200 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                              <span className="font-semibold text-gray-900">{groupKey}</span>
                              <span className="text-sm text-gray-600">({groupItems.length} items)</span>
                            </div>
                          </button>
                        </td>
                      </tr>
                      {isExpanded && groupItems.map((item) => renderTableRow(item))}
                    </React.Fragment>
                  );
                })
              ) : (
                filteredItems.map((item) => renderTableRow(item))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="text-center">
            <Package className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No items found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              Add your first item
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingItem) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Edit Stock Item' : 'Add New Stock Item'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Code *
                    </label>
                    <input
                      type="text"
                      name="item_code"
                      defaultValue={editingItem?.item_code}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., SAFMAS002"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingItem?.name}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Safety Boots"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      defaultValue={editingItem?.description}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Detailed description of the item..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Type *
                    </label>
                    <select
                      name="item_type"
                      defaultValue={editingItem?.item_type || 'non_serialized'}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="serialized">Serialized - Track individual units by serial number</option>
                      <option value="non_serialized">Non-Serialized - Track by bulk quantity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit of Measure
                    </label>
                    <select
                      name="unit_of_measure"
                      defaultValue={editingItem?.unit_of_measure}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Unit</option>
                      {unitsOfMeasure.map((unit) => (
                        <option key={unit.id} value={unit.code}>
                          {unit.code} - {unit.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Store
                    </label>
                    <select
                      name="store_id"
                      defaultValue={editingItem?.store_id}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bin
                    </label>
                    <select
                      name="bin_id"
                      defaultValue={editingItem?.bin_id}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Bin</option>
                      {bins.map((bin) => (
                        <option key={bin.id} value={bin.id}>
                          {bin.code} - {bin.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <div className="flex gap-2">
                      <select
                        name="category_id"
                        defaultValue={editingItem?.category_id}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Category</option>
                        {buildHierarchicalCategoryList(categories).map((category) => (
                          <option
                            key={category.id}
                            value={category.id}
                            disabled={category.hasChildren}
                            className={category.hasChildren ? 'text-gray-400 font-medium' : ''}
                          >
                            {'  '.repeat(category.level)}{category.level > 0 ? '└─ ' : ''}{category.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(null);
                          setShowCategoryModal(true);
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                        title="Add New Category"
                      >
                        + New
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Specifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      name="manufacturer"
                      defaultValue={editingItem?.manufacturer}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Bova"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      name="model"
                      defaultValue={editingItem?.model}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Chelsea Black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="text"
                      name="color"
                      defaultValue={editingItem?.color}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dimensions
                    </label>
                    <input
                      type="text"
                      name="dimensions"
                      defaultValue={editingItem?.dimensions}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 30cm x 20cm x 10cm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="weight"
                      defaultValue={editingItem?.weight}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year
                    </label>
                    <input
                      type="number"
                      name="year"
                      defaultValue={editingItem?.year}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      name="capacity"
                      defaultValue={editingItem?.capacity}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 500"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="purchase_cost"
                      defaultValue={editingItem?.purchase_cost}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Replacement Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="replacement_cost"
                      defaultValue={editingItem?.replacement_cost}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Options</h3>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_kit"
                      defaultChecked={editingItem?.is_kit}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Is Kit</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={editingItem?.is_active ?? true}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              {/* Images */}
              {editingItem && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Images</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowGallery({ itemId: editingItem.id, itemName: editingItem.name });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Manage Photo Gallery
                  </button>
                  <p className="text-sm text-gray-500">
                    Upload and manage images for this item
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSerializedManager && (
        <SerializedItemsManager
          itemId={showSerializedManager.itemId}
          itemName={showSerializedManager.itemName}
          onClose={() => {
            setShowSerializedManager(null);
            fetchData();
          }}
        />
      )}

      {showGallery && (
        <StockItemGallery
          itemId={showGallery.itemId}
          itemName={showGallery.itemName}
          onClose={() => {
            setShowGallery(null);
            if (editingItem && editingItem.id === showGallery.itemId) {
              setShowAddModal(true);
            }
          }}
        />
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Category</h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  name="category_name"
                  defaultValue={editingCategory?.name}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Safety Equipment"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Category
                </label>
                <select
                  name="parent_id"
                  defaultValue={editingCategory?.parent_id}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None (Top Level)</option>
                  {buildHierarchicalCategoryList(categories, editingCategory?.id).map((category) => (
                    <option key={category.id} value={category.id}>
                      {'  '.repeat(category.level)}{category.level > 0 ? '└─ ' : ''}{category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Notification Modal */}
      {successNotification && (
        <SuccessNotificationModal
          title={successNotification.title}
          message={successNotification.message}
          onClose={() => setSuccessNotification(null)}
        />
      )}

      {/* Error Notification Modal */}
      {errorNotification && (
        <ErrorNotificationModal
          title={errorNotification.title}
          message={errorNotification.message}
          onClose={() => setErrorNotification(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          title="Delete Item"
          message={`Are you sure you want to delete "${deleteConfirm.item.name}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );

  function renderHeaderCell(col: Column, index: number) {
    const canFilter = ['category', 'manufacturer', 'type', 'color', 'status', 'location', 'unit', 'store', 'bin'].includes(col.key);
    const canSort = !['photo'].includes(col.key);
    const uniqueValues = canFilter ? getUniqueColumnValues(col.key) : [];
    const activeFilters = columnFilters[col.key] || [];
    const isFiltered = activeFilters.length > 0;
    const isSorted = sortColumn === col.key;
    const showFilterDropdown = openFilterColumn === col.key;
    const isDragging = draggedColumn === index;
    const isDragOver = dragOverColumn === index;

    return (
      <th
        key={col.key}
        draggable
        onDragStart={() => handleDragStart(index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragEnd={handleDragEnd}
        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 relative group cursor-move transition-all ${
          isDragging ? 'opacity-50' : ''
        } ${
          isDragOver && !isDragging ? 'border-l-4 border-blue-500' : ''
        }`}
        style={{ width: col.width ? `${col.width}px` : 'auto', minWidth: col.key === 'description' ? '200px' : '80px' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <svg width="8" height="12" viewBox="0 0 8 12" className="text-gray-400 flex-shrink-0" fill="currentColor">
              <circle cx="2" cy="2" r="1" />
              <circle cx="6" cy="2" r="1" />
              <circle cx="2" cy="6" r="1" />
              <circle cx="6" cy="6" r="1" />
              <circle cx="2" cy="10" r="1" />
              <circle cx="6" cy="10" r="1" />
            </svg>
            <span>{col.label}</span>

            {/* Sort Icon */}
            {canSort && (
              <button
                onClick={() => handleColumnSort(col.key)}
                className="hover:bg-gray-200 rounded p-1 transition-colors"
                title={`Sort by ${col.label}`}
              >
                {isSorted ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp size={14} className="text-blue-600" />
                  ) : (
                    <ArrowDown size={14} className="text-blue-600" />
                  )
                ) : (
                  <ArrowUpDown size={14} className="text-gray-400 group-hover:text-gray-600" />
                )}
              </button>
            )}

            {/* Filter Icon */}
            {canFilter && (
              <div className="relative">
                <button
                  onClick={() => setOpenFilterColumn(showFilterDropdown ? null : col.key)}
                  className={`hover:bg-gray-200 rounded p-1 transition-colors ${isFiltered ? 'bg-blue-100' : ''}`}
                  title={`Filter ${col.label}`}
                >
                  <Filter size={14} className={isFiltered ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'} />
                </button>

                {showFilterDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setOpenFilterColumn(null)}
                    />
                    <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-64 overflow-y-auto">
                      <div className="p-2">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
                          <span className="text-xs font-medium text-gray-700">Filter {col.label}</span>
                          {activeFilters.length > 0 && (
                            <button
                              onClick={() => setColumnFilters(prev => ({ ...prev, [col.key]: [] }))}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        {uniqueValues.map(value => (
                          <label key={value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={activeFilters.includes(value)}
                              onChange={(e) => handleColumnFilterChange(col.key, value, e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{value}</span>
                          </label>
                        ))}
                        {uniqueValues.length === 0 && (
                          <div className="text-xs text-gray-500 text-center py-2">No values available</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={(e) => handleResizeStart(e, col.key)}
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
            title="Drag to resize"
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical size={14} className="text-gray-400" />
            </div>
          </div>
        </div>
      </th>
    );
  }

  function renderTableRow(item: StockItem) {
    const visibleColumns = columns.filter(c => c.visible);
    const primaryImage = itemImages[item.id];

    const renderCell = (col: Column) => {
      switch (col.key) {
        case 'item_code':
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{item.item_code}</span>
              {item.barcode && <Barcode size={16} className="text-gray-400" title="Has barcode" />}
              {item.qr_code && <QrCode size={16} className="text-gray-400" title="Has QR code" />}
              {item.is_kit && <Box size={16} className="text-blue-500" title="Kit" />}
            </div>
          );

        case 'description':
          return (
            <div className="text-sm max-w-md">
              <div className="font-medium text-gray-900">{item.name}</div>
              {item.description && (
                <div className="text-gray-500 truncate">{item.description}</div>
              )}
            </div>
          );

        case 'photo':
          return (
            <div className="flex items-center justify-center">
              {primaryImage ? (
                <img
                  src={`${supabase.storage.from('stock-item-images').getPublicUrl(primaryImage.file_path).data.publicUrl}`}
                  alt={item.name}
                  className="w-12 h-12 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80"
                  onClick={() => setShowGallery({ itemId: item.id, itemName: item.name })}
                />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                  <ImageIcon size={16} className="text-gray-400" />
                </div>
              )}
            </div>
          );

        case 'quantity':
          return (
            <div className="text-sm text-gray-900">
              {item.is_serialized ? (
                <button
                  onClick={() => setShowSerializedManager({ itemId: item.id, itemName: item.name })}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {item.serialized_count || 0} units
                </button>
              ) : (
                <span>{item.total_quantity || 0}</span>
              )}
            </div>
          );

        case 'unit':
          return (
            <div className="text-sm text-gray-600">
              {item.unit_of_measure || '-'}
            </div>
          );

        case 'cost':
          return (
            <div className="text-sm text-gray-900 font-medium">
              {formatCurrency(item.replacement_cost)}
            </div>
          );

        case 'location':
          return (
            <div className="text-sm text-gray-500">
              {item.stores && <div className="font-medium">{item.stores.name}</div>}
              {item.bins && <div className="text-xs text-gray-400">{item.bins.name}</div>}
            </div>
          );

        case 'category':
          return (
            <div className="text-sm text-gray-600">
              {item.categories?.name || '-'}
            </div>
          );

        case 'manufacturer':
          return (
            <div className="text-sm text-gray-600">
              {item.manufacturer && <div>{item.manufacturer}</div>}
              {item.model && <div className="text-xs text-gray-400">{item.model}</div>}
            </div>
          );

        case 'type':
          return (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{item.item_type}</span>
              {item.is_serialized && <Hash size={14} className="text-blue-500" title="Serialized" />}
            </div>
          );

        case 'year':
          return (
            <div className="text-sm text-gray-600">
              {item.year || '-'}
            </div>
          );

        case 'color':
          return (
            <div className="text-sm text-gray-600">
              {item.color || '-'}
            </div>
          );

        case 'capacity':
          return (
            <div className="text-sm text-gray-600">
              {item.capacity || '-'}
            </div>
          );

        case 'barcode':
          return (
            <div className="text-sm text-gray-600">
              {item.barcode ? <Barcode size={20} className="text-gray-600" /> : '-'}
            </div>
          );

        case 'store':
          return (
            <div className="text-sm text-gray-600">
              {item.stores?.name || '-'}
            </div>
          );

        case 'bin':
          return (
            <div className="text-sm text-gray-600">
              {item.bins?.name || '-'}
            </div>
          );

        case 'status':
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {item.is_active ? 'Active' : 'Inactive'}
            </span>
          );

        default:
          return null;
      }
    };

    return (
      <tr key={item.id} className="hover:bg-gray-50">
        {visibleColumns.map(col => (
          <td key={col.key} className="px-6 py-4 whitespace-nowrap">
            {renderCell(col)}
          </td>
        ))}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingItem(item)}
              className="text-blue-600 hover:text-blue-800"
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => setShowGallery({ itemId: item.id, itemName: item.name })}
              className="text-green-600 hover:text-green-800"
              title="Photo Gallery"
            >
              <ImageIcon size={16} />
            </button>
            <button
              onClick={() => handleDelete(item)}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
            <button
              className="text-gray-600 hover:text-gray-800"
              title="Print Label"
            >
              <Printer size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  }
}
