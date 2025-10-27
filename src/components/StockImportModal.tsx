import React, { useState, useRef } from 'react';
import { X, Upload, Download, AlertCircle, CheckCircle, FileText, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  parseCSVFile,
  parseExcelFile,
  validateImportData,
  downloadTemplate,
  StockItemExportData,
  ImportValidationError,
} from '../lib/stockImportExport';

interface StockImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

const StockImportModal: React.FC<StockImportModalProps> = ({ onClose, onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ImportValidationError[]>([]);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [step, setStep] = useState<'select' | 'validate' | 'import' | 'complete'>('select');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationErrors([]);
      setImportResult(null);
      setStep('select');
    }
  };

  const handleValidate = async () => {
    if (!file) return;

    setImporting(true);
    setValidationErrors([]);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let result;

      if (fileExtension === 'csv') {
        result = await parseCSVFile(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        result = await parseExcelFile(file);
      } else {
        alert('Unsupported file format. Please use CSV or Excel files.');
        setImporting(false);
        return;
      }

      if (!result.success || !result.data) {
        alert('Failed to parse file: ' + (result.errors?.join('\n') || 'Unknown error'));
        setImporting(false);
        return;
      }

      const errors = validateImportData(result.data);
      setValidationErrors(errors);

      if (errors.length === 0) {
        setStep('validate');
      } else {
        setStep('validate');
      }
    } catch (error) {
      console.error('Validation error:', error);
      alert('Failed to validate file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let result;

      if (fileExtension === 'csv') {
        result = await parseCSVFile(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        result = await parseExcelFile(file);
      } else {
        alert('Unsupported file format');
        setImporting(false);
        return;
      }

      if (!result.success || !result.data) {
        alert('Failed to parse file');
        setImporting(false);
        return;
      }

      const importErrors: string[] = [];
      let successCount = 0;
      let failedCount = 0;

      for (const item of result.data) {
        try {
          let categoryId: string | null = null;
          if (item.category_name) {
            const { data: category } = await supabase
              .from('stock_categories')
              .select('id')
              .eq('name', item.category_name)
              .maybeSingle();

            if (!category) {
              const { data: newCategory } = await supabase
                .from('stock_categories')
                .insert({ name: item.category_name, description: '' })
                .select('id')
                .single();
              categoryId = newCategory?.id || null;
            } else {
              categoryId = category.id;
            }
          }

          let storeId: string | null = null;
          if (item.store_name) {
            const { data: store } = await supabase
              .from('stock_stores')
              .select('id')
              .eq('name', item.store_name)
              .maybeSingle();

            if (!store) {
              const { data: newStore } = await supabase
                .from('stock_stores')
                .insert({ name: item.store_name, description: '' })
                .select('id')
                .single();
              storeId = newStore?.id || null;
            } else {
              storeId = store.id;
            }
          }

          let binId: string | null = null;
          if (item.bin_name && storeId) {
            const { data: bin } = await supabase
              .from('stock_bins')
              .select('id')
              .eq('name', item.bin_name)
              .eq('store_id', storeId)
              .maybeSingle();

            if (!bin) {
              const { data: newBin } = await supabase
                .from('stock_bins')
                .insert({ name: item.bin_name, store_id: storeId })
                .select('id')
                .single();
              binId = newBin?.id || null;
            } else {
              binId = bin.id;
            }
          }

          const { error: insertError } = await supabase.from('stock_items').insert({
            item_code: item.item_code,
            name: item.name,
            description: item.description || '',
            sku: item.sku,
            category_id: categoryId,
            manufacturer: item.manufacturer || null,
            model_number: item.model_number || null,
            serial_number: item.serial_number || null,
            item_type: item.item_type,
            quantity_on_hand: item.quantity_on_hand || 0,
            reorder_level: item.reorder_level || null,
            reorder_quantity: item.reorder_quantity || null,
            unit_cost: item.unit_cost || null,
            selling_price: item.selling_price || null,
            store_id: storeId,
            bin_id: binId,
            barcode_type: item.barcode_type || null,
            barcode_value: item.barcode_value || null,
            qr_code: item.qr_code || null,
            capacity: item.capacity || null,
            capacity_uom: item.capacity_uom || null,
            status: item.status || 'active',
            notes: item.notes || null,
          });

          if (insertError) {
            failedCount++;
            importErrors.push(`Row ${item.item_code}: ${insertError.message}`);
          } else {
            successCount++;
          }
        } catch (error) {
          failedCount++;
          importErrors.push(
            `Row ${item.item_code}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      setImportResult({
        success: successCount,
        failed: failedCount,
        errors: importErrors,
      });

      setStep('complete');

      if (successCount > 0) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import items: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Import Stock Items</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Download Template</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Download a template file to see the required format for importing stock items.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => downloadTemplate('csv')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FileText size={20} />
                Download CSV Template
              </button>
              <button
                onClick={() => downloadTemplate('excel')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileSpreadsheet size={20} />
                Download Excel Template
              </button>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload File</h3>

            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Upload size={20} />
                Select File
              </button>
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: <span className="font-medium">{file.name}</span>
                </p>
              )}
            </div>

            {file && step === 'select' && (
              <div className="mb-4">
                <button
                  onClick={handleValidate}
                  disabled={importing}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {importing ? 'Validating...' : 'Validate File'}
                </button>
              </div>
            )}

            {step === 'validate' && (
              <div className="mt-6">
                {validationErrors.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <CheckCircle size={20} />
                      <span className="font-semibold">Validation Passed</span>
                    </div>
                    <p className="text-sm text-green-700">
                      All rows are valid and ready to import.
                    </p>
                    <button
                      onClick={handleImport}
                      disabled={importing}
                      className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                    >
                      {importing ? 'Importing...' : 'Import Items'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-800 mb-2">
                      <AlertCircle size={20} />
                      <span className="font-semibold">Validation Errors Found</span>
                    </div>
                    <p className="text-sm text-red-700 mb-3">
                      Please fix the following errors and try again:
                    </p>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-red-100">
                          <tr>
                            <th className="text-left p-2">Row</th>
                            <th className="text-left p-2">Field</th>
                            <th className="text-left p-2">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validationErrors.map((error, index) => (
                            <tr key={index} className="border-t border-red-200">
                              <td className="p-2">{error.row}</td>
                              <td className="p-2 font-medium">{error.field}</td>
                              <td className="p-2">{error.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 'complete' && importResult && (
              <div className="mt-6">
                <div className={`border rounded-lg p-4 ${
                  importResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <h4 className="font-semibold text-lg mb-3">Import Complete</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-green-700">
                      ✓ Successfully imported: <span className="font-bold">{importResult.success}</span> items
                    </p>
                    {importResult.failed > 0 && (
                      <p className="text-red-700">
                        ✗ Failed: <span className="font-bold">{importResult.failed}</span> items
                      </p>
                    )}
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="mt-4">
                      <p className="font-semibold text-sm text-gray-700 mb-2">Errors:</p>
                      <div className="max-h-48 overflow-y-auto bg-white rounded p-3 text-xs">
                        {importResult.errors.map((error, index) => (
                          <div key={index} className="text-red-600 mb-1">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={onClose}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockImportModal;
