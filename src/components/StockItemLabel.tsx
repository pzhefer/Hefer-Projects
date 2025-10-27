import React, { useEffect, useState } from 'react';
import { X, Printer, Download } from 'lucide-react';
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

interface StockItemLabelProps {
  item: StockItem;
  onClose: () => void;
  mode?: 'preview' | 'print';
}

const StockItemLabel: React.FC<StockItemLabelProps> = ({ item, onClose, mode = 'preview' }) => {
  const [barcodeImage, setBarcodeImage] = useState<string>('');
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateImages();
  }, [item]);

  const generateImages = async () => {
    try {
      setLoading(true);
      setError(null);

      const barcode = await generateBarcode({
        code: item.barcode || item.sku,
        format: item.barcode_format || 'CODE128',
      });

      const qrContent = item.qr_code || JSON.stringify({
        id: item.id,
        code: item.item_code,
        sku: item.sku,
        name: item.name,
      });

      const qr = await generateQRCode({ content: qrContent });

      setBarcodeImage(barcode);
      setQrCodeImage(qr);
    } catch (err) {
      console.error('Error generating codes:', err);
      setError('Failed to generate barcode or QR code');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const labelData: LabelData = {
      itemName: item.name,
      itemCode: item.item_code,
      sku: item.sku,
      category: item.categories?.name,
      location: item.stores?.name || item.bins?.name,
      barcodeImage,
      qrCodeImage,
      serialNumber: item.serial_number,
    };

    const html = generateLabelHTML(labelData);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label - ${item.name}</title>
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
          ${html}
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

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Could not access iframe document');
      }

      iframeDoc.open();
      iframeDoc.write(printContent);
      iframeDoc.close();

      iframe.onload = () => {
        setTimeout(() => {
          const iframeWindow = iframe.contentWindow;
          if (iframeWindow) {
            iframeWindow.focus();
            iframeWindow.print();

            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 1000);
          }
        }, 500);
      };
    } catch (error) {
      console.error('Error printing label:', error);
      document.body.removeChild(iframe);
      alert('Failed to print label');
    }
  };

  const handleDownload = () => {
    const labelData: LabelData = {
      itemName: item.name,
      itemCode: item.item_code,
      sku: item.sku,
      category: item.categories?.name,
      location: item.stores?.name || item.bins?.name,
      barcodeImage,
      qrCodeImage,
      serialNumber: item.serial_number,
    };

    const html = generateLabelHTML(labelData);

    const blob = new Blob([`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${item.name} Label</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `], { type: 'text/html' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `label-${item.sku}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (mode === 'print' && !loading && barcodeImage && qrCodeImage) {
    setTimeout(handlePrint, 100);
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900">Item Label Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Generating codes...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {!loading && !error && barcodeImage && qrCodeImage && (
            <>
              <div className="border-2 border-gray-300 rounded-lg p-6 bg-white mx-auto" style={{ width: '4in' }}>
                <div className="flex justify-between mb-4">
                  <div className="flex-1">
                    <div className="font-bold text-lg mb-2">{item.name}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {item.categories?.name && <div>Category: {item.categories.name}</div>}
                      {(item.stores?.name || item.bins?.name) && <div>Location: {item.stores?.name || item.bins?.name}</div>}
                      {item.serial_number && <div>S/N: {item.serial_number}</div>}
                    </div>
                  </div>
                  <div>
                    <img src={qrCodeImage} alt="QR Code" className="w-20 h-20" />
                  </div>
                </div>

                <div className="text-center mt-4">
                  <img src={barcodeImage} alt="Barcode" className="mx-auto max-w-full" style={{ height: '60px' }} />
                  <div className="text-xs mt-2 text-gray-700">
                    <strong>SKU:</strong> {item.sku} | <strong>Code:</strong> {item.item_code}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print Label
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockItemLabel;
