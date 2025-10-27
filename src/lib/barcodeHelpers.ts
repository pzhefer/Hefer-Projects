export function generateBarcode(prefix: string = 'STK'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

export function generateQRCode(itemCode: string, itemId: string): string {
  return JSON.stringify({
    type: 'stock_item',
    code: itemCode,
    id: itemId,
    timestamp: new Date().toISOString()
  });
}

export function generateAssetCode(storeCode: string, categoryPrefix: string = 'AS'): string {
  const year = new Date().getFullYear().toString().substring(2);
  const sequence = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${storeCode}-${categoryPrefix}${year}-${sequence}`;
}

export function formatBarcodeForDisplay(barcode: string): string {
  if (!barcode) return '';
  return barcode.match(/.{1,4}/g)?.join('-') || barcode;
}

export function validateBarcode(barcode: string): boolean {
  return /^[A-Z0-9]{6,20}$/.test(barcode);
}

export function parseQRCode(qrData: string): { type: string; code: string; id: string; timestamp: string } | null {
  try {
    const data = JSON.parse(qrData);
    if (data.type === 'stock_item' && data.code && data.id) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export function generatePrintableLabel(item: {
  item_code: string;
  name: string;
  barcode?: string;
  qr_code?: string;
}): string {
  return `
    <div style="width: 4in; height: 2in; border: 1px solid #000; padding: 0.25in; font-family: Arial, sans-serif;">
      <div style="font-size: 18pt; font-weight: bold; margin-bottom: 0.1in;">${item.item_code}</div>
      <div style="font-size: 12pt; margin-bottom: 0.1in;">${item.name}</div>
      ${item.barcode ? `<div style="font-size: 10pt; font-family: 'Courier New', monospace;">${formatBarcodeForDisplay(item.barcode)}</div>` : ''}
      ${item.qr_code ? `<div style="font-size: 8pt; margin-top: 0.1in; word-wrap: break-word;">QR: ${item.qr_code.substring(0, 50)}...</div>` : ''}
    </div>
  `;
}
