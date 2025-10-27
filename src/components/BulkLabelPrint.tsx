import React, { useState, useEffect } from 'react';
import { X, Printer, Check } from 'lucide-react';
import { generateBarcode, generateQRCode, generateLabelHTML, type LabelData } from '../lib/barcodeGenerator';

interface StockItem {
  id: string;
  name: string;
  item_code: string;
  sku: string;
  barcode: string;
  barcode_format: 'CODE128' | 'EAN13' | 'UPC' | 'CODE39';
  qr_code: string;
  categories?: { name: string };
  stores?: { name: string };
  bins?: { name: string };
  serial_number?: string;
}

interface BulkLabelPrintProps {
  items: StockItem[];
  onClose: () => void;
}

const BulkLabelPrint: React.FC<BulkLabelPrintProps> = ({ items, onClose }) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(items.map(i => i.id)));
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(i => i.id)));
    }
  };

  const handlePrintBulk = async () => {
    const itemsToPrint = items.filter(item => selectedItems.has(item.id));
    if (itemsToPrint.length === 0) return;

    console.log('Starting bulk print for', itemsToPrint.length, 'items');
    setLoading(true);
    setProgress(0);

    try {
      const labelsHTML: string[] = [];

      for (let i = 0; i < itemsToPrint.length; i++) {
        const item = itemsToPrint[i];
        console.log(`Processing item ${i + 1}/${itemsToPrint.length}:`, item.name);

        try {
          const barcodeCode = item.barcode || item.sku || item.item_code;
          console.log('Generating barcode for:', barcodeCode);

          const barcode = await generateBarcode({
            code: barcodeCode,
            format: item.barcode_format || 'CODE128',
          });
          console.log('Barcode generated successfully');

          const qrContent = item.qr_code || JSON.stringify({
            id: item.id,
            code: item.item_code,
            sku: item.sku || '',
            name: item.name,
          });
          console.log('Generating QR code');

          const qr = await generateQRCode({ content: qrContent });
          console.log('QR code generated successfully');

          const labelData: LabelData = {
            itemName: item.name,
            itemCode: item.item_code,
            sku: item.sku || item.item_code,
            category: item.categories?.name,
            location: item.stores?.name || item.bins?.name,
            barcodeImage: barcode,
            qrCodeImage: qr,
            serialNumber: item.serial_number,
          };

          labelsHTML.push(generateLabelHTML(labelData));
          console.log('Label HTML generated for:', item.name);
        } catch (itemError) {
          console.error(`Error generating label for item ${item.name}:`, itemError);
          alert(`Failed to generate label for ${item.name}. Skipping this item.`);
        }

        setProgress(((i + 1) / itemsToPrint.length) * 100);
      }

      if (labelsHTML.length === 0) {
        console.error('No labels were generated');
        throw new Error('No labels were generated successfully');
      }

      console.log('All labels generated, creating print iframe...');
      console.log('Total HTML length:', labelsHTML.join('\n').length);

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Bulk Print Labels</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }

              html, body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
              }

              .label-page {
                width: 4in;
                height: 2in;
                page-break-after: always;
                page-break-inside: avoid;
                break-after: page;
                break-inside: avoid;
              }

              @page {
                size: 4in 2in;
                margin: 0;
              }

              @media print {
                html, body {
                  width: 4in;
                  height: 2in;
                  margin: 0;
                  padding: 0;
                }

                .label-page {
                  width: 4in;
                  height: 2in;
                  page-break-after: always;
                  page-break-inside: avoid;
                  break-after: page;
                  break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            ${labelsHTML.join('\n')}
          </body>
        </html>
      `;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';

      document.body.appendChild(iframe);
      console.log('Iframe created and added to DOM');

      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          throw new Error('Could not access iframe document');
        }

        iframeDoc.open();
        iframeDoc.write(printContent);
        iframeDoc.close();
        console.log('Content written to iframe');

        iframe.onload = () => {
          console.log('Iframe loaded, waiting for images...');

          setTimeout(() => {
            const iframeWindow = iframe.contentWindow;
            if (iframeWindow) {
              console.log('Triggering print...');
              iframeWindow.focus();
              iframeWindow.print();

              setTimeout(() => {
                console.log('Removing iframe');
                document.body.removeChild(iframe);
                onClose();
              }, 1000);
            }
          }, 500);
        };
      } catch (writeError) {
        console.error('Error writing to iframe:', writeError);
        document.body.removeChild(iframe);
        throw new Error('Failed to write content to iframe: ' + writeError);
      }
    } catch (error) {
      console.error('Error printing labels:', error);
      alert('Failed to generate labels for printing: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Bulk Print Labels ({selectedItems.size} selected)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-md">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              </div>
              <p className="text-center text-gray-700 mb-2">Generating labels...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                {Math.round(progress)}% complete
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <button
                  onClick={toggleAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedItems.size === items.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedItems.has(item.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedItems.has(item.id)
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedItems.has(item.id) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <div className="mt-1 text-sm text-gray-500 space-y-1">
                          <div><strong>SKU:</strong> {item.sku}</div>
                          <div><strong>Code:</strong> {item.item_code}</div>
                          {item.categories?.name && <div><strong>Category:</strong> {item.categories.name}</div>}
                          {(item.stores?.name || item.bins?.name) && <div><strong>Location:</strong> {item.stores?.name || item.bins?.name}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t p-4 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePrintBulk}
                    disabled={selectedItems.size === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print {selectedItems.size} Label{selectedItems.size !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BulkLabelPrint;
