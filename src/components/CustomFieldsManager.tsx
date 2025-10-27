import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DeleteConfirmModal from './DeleteConfirmModal';
import SuccessNotificationModal from './SuccessNotificationModal';
import ErrorNotificationModal from './ErrorNotificationModal';

interface CustomField {
  id: string;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';
  field_options?: string[];
  applies_to_categories: string[];
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  parent_id?: string;
  children?: Category[];
  level?: number;
}

export default function CustomFieldsManager() {
  const { user } = useAuth();
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [successNotification, setSuccessNotification] = useState<{ title: string; message: string } | null>(null);
  const [errorNotification, setErrorNotification] = useState<{ title: string; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ field: CustomField } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(false);

  const [formData, setFormData] = useState({
    field_key: '',
    field_label: '',
    field_type: 'text' as CustomField['field_type'],
    field_options: [] as string[],
    applies_to_categories: [] as string[],
    is_required: false,
    sort_order: 0,
    is_active: true
  });
  const [optionInput, setOptionInput] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fieldsResult, categoriesResult] = await Promise.all([
        supabase.from('stock_custom_fields').select('*').order('sort_order'),
        supabase.from('stock_categories').select('*').order('name')
      ]);

      if (fieldsResult.data) {
        const transformedFields = fieldsResult.data.map(field => ({
          ...field,
          field_options: field.field_options || []
        }));
        setCustomFields(transformedFields);
      }
      if (categoriesResult.data) setCategories(categoriesResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorNotification({
        title: 'Load Failed',
        message: 'Failed to load custom fields. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (field?: CustomField) => {
    if (field) {
      setEditingField(field);
      setFormData({
        field_key: field.field_key,
        field_label: field.field_label,
        field_type: field.field_type,
        field_options: field.field_options || [],
        applies_to_categories: field.applies_to_categories || [],
        is_required: field.is_required,
        sort_order: field.sort_order,
        is_active: field.is_active
      });
    } else {
      setEditingField(null);
      setFormData({
        field_key: '',
        field_label: '',
        field_type: 'text',
        field_options: [],
        applies_to_categories: [],
        is_required: false,
        sort_order: customFields.length,
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingField(null);
    setOptionInput('');
  };

  const generateFieldKey = (label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleLabelChange = (label: string) => {
    setFormData(prev => ({
      ...prev,
      field_label: label,
      field_key: editingField ? prev.field_key : generateFieldKey(label)
    }));
  };

  const handleAddOption = () => {
    if (optionInput.trim()) {
      setFormData(prev => ({
        ...prev,
        field_options: [...prev.field_options, optionInput.trim()]
      }));
      setOptionInput('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      field_options: prev.field_options.filter((_, i) => i !== index)
    }));
  };

  const handleToggleCategory = (categoryId: string) => {
    setFormData(prev => {
      const isSelected = prev.applies_to_categories.includes(categoryId);
      return {
        ...prev,
        applies_to_categories: isSelected
          ? prev.applies_to_categories.filter(id => id !== categoryId)
          : [...prev.applies_to_categories, categoryId]
      };
    });
  };

  const handleSave = async () => {
    if (!formData.field_label.trim() || !formData.field_key.trim()) {
      setErrorNotification({
        title: 'Validation Error',
        message: 'Field label and key are required.'
      });
      return;
    }

    if ((formData.field_type === 'select' || formData.field_type === 'multiselect') && formData.field_options.length === 0) {
      setErrorNotification({
        title: 'Validation Error',
        message: 'Select and multiselect fields must have at least one option.'
      });
      return;
    }

    try {
      const payload = {
        field_key: formData.field_key,
        field_label: formData.field_label,
        field_type: formData.field_type,
        field_options: (formData.field_type === 'select' || formData.field_type === 'multiselect')
          ? formData.field_options
          : null,
        applies_to_categories: formData.applies_to_categories,
        is_required: formData.is_required,
        sort_order: formData.sort_order,
        is_active: formData.is_active
      };

      if (editingField) {
        const { error } = await supabase
          .from('stock_custom_fields')
          .update(payload)
          .eq('id', editingField.id);

        if (error) throw error;

        setSuccessNotification({
          title: 'Field Updated',
          message: `Custom field "${formData.field_label}" has been updated successfully.`
        });
      } else {
        const { error } = await supabase
          .from('stock_custom_fields')
          .insert([payload]);

        if (error) throw error;

        setSuccessNotification({
          title: 'Field Created',
          message: `Custom field "${formData.field_label}" has been created successfully.`
        });
      }

      handleCloseModal();
      fetchData();
    } catch (error: any) {
      console.error('Error saving custom field:', error);
      setErrorNotification({
        title: 'Save Failed',
        message: error.message || 'Failed to save custom field. Please try again.'
      });
    }
  };

  const handleDelete = (field: CustomField) => {
    setDeleteConfirm({ field });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('stock_custom_fields')
        .delete()
        .eq('id', deleteConfirm.field.id);

      if (error) throw error;

      setDeleteConfirm(null);
      setSuccessNotification({
        title: 'Field Deleted',
        message: `Custom field "${deleteConfirm.field.field_label}" has been deleted successfully.`
      });
      fetchData();
    } catch (error: any) {
      console.error('Error deleting field:', error);
      setErrorNotification({
        title: 'Delete Failed',
        message: error.message || 'Failed to delete custom field. Please try again.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const buildCategoryHierarchy = (categories: Category[]): Category[] => {
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    // Create map of all categories
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [], level: 0 });
    });

    // Build hierarchy
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

    // Flatten hierarchy for display
    const flatList: Category[] = [];
    const traverse = (nodes: Category[]) => {
      nodes.forEach(node => {
        flatList.push(node);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    traverse(rootCategories);

    return flatList;
  };

  const hierarchicalCategories = buildCategoryHierarchy(categories);

  const fieldTypeLabels: Record<CustomField['field_type'], string> = {
    text: 'Text',
    number: 'Number',
    date: 'Date',
    boolean: 'Yes/No',
    select: 'Dropdown',
    multiselect: 'Multi-Select'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading custom fields...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Custom Fields</h3>
          <p className="text-sm text-gray-600 mt-1">Define custom attributes for stock items by category</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm lg:text-base"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Add Field</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {customFields.length === 0 ? (
        <div className="text-center py-12">
          <Tag className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Custom Fields</h3>
          <p className="text-gray-600 mb-6">Create custom fields to add industry-specific attributes to your stock items.</p>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
          >
            <Plus size={18} />
            <span>Create First Field</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Label</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Key</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Categories</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Required</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customFields.map((field) => (
                <tr key={field.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{field.field_label}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{field.field_key}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{fieldTypeLabels[field.field_type]}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {field.applies_to_categories.length === 0 ? (
                      <span className="text-gray-500">All Categories</span>
                    ) : field.applies_to_categories.length <= 2 ? (
                      <span>{field.applies_to_categories.map(getCategoryName).join(', ')}</span>
                    ) : (
                      <span>{field.applies_to_categories.length} categories</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {field.is_required ? (
                      <span className="text-orange-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-gray-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {field.is_active ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(field)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(field)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg lg:text-xl font-semibold text-gray-900">
                {editingField ? 'Edit Custom Field' : 'Add Custom Field'}
              </h3>
              <button onClick={handleCloseModal} className="p-1 hover:bg-gray-100 rounded transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 lg:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field Label <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.field_label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Engine Hours"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field Key <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.field_key}
                  onChange={(e) => setFormData({ ...formData, field_key: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="e.g., engine_hours"
                  disabled={!!editingField}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editingField ? 'Field key cannot be changed after creation' : 'Auto-generated from label, but can be customized'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field Type <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.field_type}
                  onChange={(e) => setFormData({ ...formData, field_type: e.target.value as CustomField['field_type'] })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="boolean">Yes/No</option>
                  <option value="select">Dropdown (Single Select)</option>
                  <option value="multiselect">Multi-Select</option>
                </select>
              </div>

              {(formData.field_type === 'select' || formData.field_type === 'multiselect') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={optionInput}
                      onChange={(e) => setOptionInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add option..."
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-1">
                    {formData.field_options.map((option, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded border border-gray-200">
                        <span className="text-gray-900 text-sm">{option}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Applies to Categories
                  </label>
                  <button
                    type="button"
                    onClick={() => setExpandedCategories(!expandedCategories)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                  >
                    {expandedCategories ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {expandedCategories ? 'Collapse' : 'Expand'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">Leave empty to apply to all categories</p>
                {expandedCategories && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto space-y-1">
                    {hierarchicalCategories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors"
                        style={{ paddingLeft: `${(category.level || 0) * 20 + 8}px` }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.applies_to_categories.includes(category.id)}
                          onChange={() => handleToggleCategory(category.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-900 text-sm">
                          {(category.level || 0) > 0 && (
                            <span className="text-gray-400 mr-1">{'└'.repeat(1)}</span>
                          )}
                          {category.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {formData.applies_to_categories.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    Selected: {formData.applies_to_categories.map(getCategoryName).join(', ')}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_required}
                    onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-900 text-sm">Required Field</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-900 text-sm">Active</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 lg:p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Save size={18} />
                {editingField ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <DeleteConfirmModal
          isOpen={!!deleteConfirm}
          title="Delete Custom Field"
          message={`Are you sure you want to delete the custom field "${deleteConfirm.field.field_label}"? This will remove the field definition, but existing data in stock items will not be deleted.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          isDeleting={isDeleting}
        />
      )}

      {successNotification && (
        <SuccessNotificationModal
          isOpen={!!successNotification}
          title={successNotification.title}
          message={successNotification.message}
          onClose={() => setSuccessNotification(null)}
        />
      )}

      {errorNotification && (
        <ErrorNotificationModal
          isOpen={!!errorNotification}
          title={errorNotification.title}
          message={errorNotification.message}
          onClose={() => setErrorNotification(null)}
        />
      )}
    </div>
  );
}
