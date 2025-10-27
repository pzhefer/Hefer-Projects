import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface StockItemExportData {
  item_code: string;
  name: string;
  description: string;
  sku: string;
  category_name?: string;
  manufacturer?: string;
  model_number?: string;
  serial_number?: string;
  item_type: 'serialized' | 'non_serialized';
  quantity_on_hand?: number;
  reorder_level?: number;
  reorder_quantity?: number;
  unit_cost?: number;
  selling_price?: number;
  store_name?: string;
  bin_name?: string;
  barcode_type?: string;
  barcode_value?: string;
  qr_code?: string;
  capacity?: number;
  capacity_uom?: string;
  status: 'active' | 'inactive' | 'discontinued';
  notes?: string;
}

export interface ImportResult {
  success: boolean;
  data?: StockItemExportData[];
  errors?: string[];
  rowCount?: number;
}

export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
}

export const exportToCSV = (data: StockItemExportData[], filename: string = 'stock_items.csv') => {
  const csv = Papa.unparse(data, {
    quotes: true,
    header: true,
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

export const exportToExcel = (data: StockItemExportData[], filename: string = 'stock_items.xlsx') => {
  const worksheet = XLSX.utils.json_to_sheet(data);

  const columnWidths = [
    { wch: 15 },  // item_code
    { wch: 30 },  // name
    { wch: 40 },  // description
    { wch: 15 },  // sku
    { wch: 20 },  // category_name
    { wch: 20 },  // manufacturer
    { wch: 20 },  // model_number
    { wch: 20 },  // serial_number
    { wch: 15 },  // item_type
    { wch: 12 },  // quantity_on_hand
    { wch: 12 },  // reorder_level
    { wch: 15 },  // reorder_quantity
    { wch: 12 },  // unit_cost
    { wch: 12 },  // selling_price
    { wch: 20 },  // store_name
    { wch: 20 },  // bin_name
    { wch: 15 },  // barcode_type
    { wch: 25 },  // barcode_value
    { wch: 30 },  // qr_code
    { wch: 12 },  // capacity
    { wch: 15 },  // capacity_uom
    { wch: 12 },  // status
    { wch: 40 },  // notes
  ];
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Items');

  XLSX.writeFile(workbook, filename);
};

export const parseCSVFile = (file: File): Promise<ImportResult> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = [];

        if (results.errors.length > 0) {
          results.errors.forEach((error) => {
            errors.push(`Row ${error.row}: ${error.message}`);
          });
        }

        if (errors.length > 0) {
          resolve({
            success: false,
            errors,
          });
          return;
        }

        const data = results.data as StockItemExportData[];
        resolve({
          success: true,
          data,
          rowCount: data.length,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          errors: [error.message],
        });
      },
    });
  });
};

export const parseExcelFile = (file: File): Promise<ImportResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          defval: '',
        }) as StockItemExportData[];

        resolve({
          success: true,
          data: jsonData,
          rowCount: jsonData.length,
        });
      } catch (error) {
        resolve({
          success: false,
          errors: [`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        errors: ['Failed to read file'],
      });
    };

    reader.readAsBinaryString(file);
  });
};

export const validateImportData = (data: StockItemExportData[]): ImportValidationError[] => {
  const errors: ImportValidationError[] = [];

  data.forEach((row, index) => {
    const rowNumber = index + 2;

    if (!row.item_code || row.item_code.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'item_code',
        message: 'Item code is required',
      });
    }

    if (!row.name || row.name.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'name',
        message: 'Name is required',
      });
    }

    if (!row.sku || row.sku.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'sku',
        message: 'SKU is required',
      });
    }

    if (!row.item_type || (row.item_type !== 'serialized' && row.item_type !== 'non_serialized')) {
      errors.push({
        row: rowNumber,
        field: 'item_type',
        message: 'Item type must be either "serialized" or "non_serialized"',
      });
    }

    if (row.item_type === 'non_serialized') {
      if (row.quantity_on_hand === undefined || row.quantity_on_hand === null) {
        errors.push({
          row: rowNumber,
          field: 'quantity_on_hand',
          message: 'Quantity on hand is required for non-serialized items',
        });
      }
    }

    if (!row.status || !['active', 'inactive', 'discontinued'].includes(row.status)) {
      errors.push({
        row: rowNumber,
        field: 'status',
        message: 'Status must be "active", "inactive", or "discontinued"',
      });
    }

    if (row.unit_cost !== undefined && row.unit_cost !== null && isNaN(Number(row.unit_cost))) {
      errors.push({
        row: rowNumber,
        field: 'unit_cost',
        message: 'Unit cost must be a valid number',
      });
    }

    if (row.selling_price !== undefined && row.selling_price !== null && isNaN(Number(row.selling_price))) {
      errors.push({
        row: rowNumber,
        field: 'selling_price',
        message: 'Selling price must be a valid number',
      });
    }

    if (row.quantity_on_hand !== undefined && row.quantity_on_hand !== null && isNaN(Number(row.quantity_on_hand))) {
      errors.push({
        row: rowNumber,
        field: 'quantity_on_hand',
        message: 'Quantity on hand must be a valid number',
      });
    }
  });

  return errors;
};

export const downloadTemplate = (type: 'csv' | 'excel') => {
  const templateData: StockItemExportData[] = [
    {
      item_code: 'EXAMPLE001',
      name: 'Example Item',
      description: 'This is an example item description',
      sku: 'SKU-EXAMPLE-001',
      category_name: 'Example Category',
      manufacturer: 'Example Manufacturer',
      model_number: 'MODEL-001',
      serial_number: 'SN-001',
      item_type: 'serialized',
      quantity_on_hand: 0,
      reorder_level: 10,
      reorder_quantity: 50,
      unit_cost: 100.00,
      selling_price: 150.00,
      store_name: 'Main Store',
      bin_name: 'Bin A1',
      barcode_type: 'CODE128',
      barcode_value: 'EXAMPLE001',
      qr_code: 'EXAMPLE001',
      capacity: 100,
      capacity_uom: 'units',
      status: 'active',
      notes: 'Example notes',
    },
  ];

  if (type === 'csv') {
    exportToCSV(templateData, 'stock_items_template.csv');
  } else {
    exportToExcel(templateData, 'stock_items_template.xlsx');
  }
};
