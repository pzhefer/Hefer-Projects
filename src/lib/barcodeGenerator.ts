import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export interface BarcodeData {
  code: string;
  format: 'CODE128' | 'EAN13' | 'UPC' | 'CODE39';
}

export interface QRCodeData {
  content: string;
}

export const generateBarcode = async (data: BarcodeData): Promise<string> => {
  const canvas = document.createElement('canvas');

  try {
    JsBarcode(canvas, data.code, {
      format: data.format,
      width: 2,
      height: 80,
      displayValue: true,
      fontSize: 14,
      margin: 10,
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating barcode:', error);
    throw new Error('Failed to generate barcode');
  }
};

export const generateQRCode = async (data: QRCodeData): Promise<string> => {
  try {
    const qrDataURL = await QRCode.toDataURL(data.content, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    return qrDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

export const generateItemCode = (prefix: string, id: string): string => {
  const timestamp = Date.now().toString().slice(-6);
  const shortId = id.slice(0, 8).toUpperCase();
  return `${prefix}-${shortId}-${timestamp}`;
};

export const generateEAN13 = (): string => {
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += Math.floor(Math.random() * 10);
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return code + checkDigit;
};

export const generateSKU = (itemName: string, category?: string): string => {
  const namePart = itemName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X');

  const categoryPart = category
    ? category.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)
    : 'GEN';

  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${categoryPart}-${namePart}-${randomPart}`;
};

export interface LabelData {
  itemName: string;
  itemCode: string;
  sku: string;
  category?: string;
  location?: string;
  barcodeImage: string;
  qrCodeImage: string;
  serialNumber?: string;
}

export const generateLabelHTML = (data: LabelData): string => {
  return `
    <div class="label-page" style="width: 4in; height: 2in; padding: 0.25in; border: 1px solid #000; font-family: Arial, sans-serif; page-break-after: always; page-break-inside: avoid; box-sizing: border-box; display: block; position: relative;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <div style="flex: 1;">
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px; line-height: 1.2;">${data.itemName}</div>
          <div style="font-size: 11px; color: #666; line-height: 1.3;">
            ${data.category ? `Category: ${data.category}<br>` : ''}
            ${data.location ? `Location: ${data.location}<br>` : ''}
            ${data.serialNumber ? `S/N: ${data.serialNumber}<br>` : ''}
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0;">
          <img src="${data.qrCodeImage}" style="width: 60px; height: 60px; display: block;" />
        </div>
      </div>
      <div style="text-align: center; margin-top: 8px;">
        <img src="${data.barcodeImage}" style="max-width: 100%; height: 60px; display: block; margin: 0 auto;" />
        <div style="font-size: 10px; margin-top: 4px; line-height: 1.2;">
          <strong>SKU:</strong> ${data.sku} | <strong>Code:</strong> ${data.itemCode}
        </div>
      </div>
    </div>
  `;
};
