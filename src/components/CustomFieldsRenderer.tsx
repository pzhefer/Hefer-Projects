import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

interface CustomFieldsRendererProps {
  categoryId?: string;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  errors?: Record<string, string>;
}

export default function CustomFieldsRenderer({
  categoryId,
  values,
  onChange,
  errors = {}
}: CustomFieldsRendererProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomFields();
  }, [categoryId]);

  const fetchCustomFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stock_custom_fields')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      if (data) {
        const transformedFields = data.map(field => ({
          ...field,
          field_options: field.field_options || []
        }));

        const applicableFields = categoryId
          ? transformedFields.filter(
              field =>
                field.applies_to_categories.length === 0 ||
                field.applies_to_categories.includes(categoryId)
            )
          : transformedFields;

        setCustomFields(applicableFields);
      }
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldKey: string, value: any) => {
    onChange({
      ...values,
      [fieldKey]: value
    });
  };

  const handleMultiselectChange = (fieldKey: string, option: string, checked: boolean) => {
    const currentValues = (values[fieldKey] as string[]) || [];
    const newValues = checked
      ? [...currentValues, option]
      : currentValues.filter(v => v !== option);

    handleFieldChange(fieldKey, newValues);
  };

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading custom fields...</div>;
  }

  if (customFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Custom Fields</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customFields.map((field) => (
            <div
              key={field.id}
              className={field.field_type === 'multiselect' ? 'md:col-span-2' : ''}
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.field_label}
                {field.is_required && <span className="text-red-600 ml-1">*</span>}
              </label>

              {field.field_type === 'text' && (
                <input
                  type="text"
                  value={(values[field.field_key] as string) || ''}
                  onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                  required={field.is_required}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Enter ${field.field_label.toLowerCase()}`}
                />
              )}

              {field.field_type === 'number' && (
                <input
                  type="number"
                  value={(values[field.field_key] as number) || ''}
                  onChange={(e) => handleFieldChange(field.field_key, parseFloat(e.target.value) || null)}
                  required={field.is_required}
                  step="any"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Enter ${field.field_label.toLowerCase()}`}
                />
              )}

              {field.field_type === 'date' && (
                <input
                  type="date"
                  value={(values[field.field_key] as string) || ''}
                  onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                  required={field.is_required}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}

              {field.field_type === 'boolean' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(values[field.field_key] as boolean) || false}
                    onChange={(e) => handleFieldChange(field.field_key, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {field.field_label}
                  </span>
                </label>
              )}

              {field.field_type === 'select' && (
                <select
                  value={(values[field.field_key] as string) || ''}
                  onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                  required={field.is_required}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select {field.field_label.toLowerCase()}</option>
                  {field.field_options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}

              {field.field_type === 'multiselect' && (
                <div className="space-y-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {field.field_options?.map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={((values[field.field_key] as string[]) || []).includes(option)}
                        onChange={(e) => handleMultiselectChange(field.field_key, option, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {errors[field.field_key] && (
                <p className="mt-1 text-sm text-red-600">{errors[field.field_key]}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
