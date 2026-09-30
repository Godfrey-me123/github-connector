import bwipjs from 'bwip-js';
import QRCode from 'qrcode';
import { BarcodeType } from '../types';

/**
 * Generate a Barcode image data URL (PNG)
 */
export async function generateBarcodeDataUrl(
  type: BarcodeType,
  rawText: string,
  lineColor: string = '#000000',
  backgroundColor: string = '#ffffff',
  includeText: boolean = true
): Promise<string> {
  let text = rawText || '123456789';
  // Replace template variables for visual preview if unrendered
  if (text.includes('{{')) {
    text = text.replace(/\{\{.*?\}\}/g, '123456789');
  }

  // Ensure EAN13 has correct length/digits if needed
  if (type === 'EAN13') {
    text = text.replace(/\D/g, ''); // keep numbers only
    if (text.length < 12) {
      text = text.padEnd(12, '0');
    } else if (text.length > 13) {
      text = text.substring(0, 12);
    }
  }

  let bcid = 'code128';
  if (type === 'PDF417') bcid = 'pdf417';
  if (type === 'EAN13') bcid = 'ean13';

  // Convert hex color to RRGGBB without #
  const cleanLineColor = lineColor.replace('#', '') || '000000';
  const cleanBgColor = backgroundColor.replace('#', '') || 'ffffff';

  try {
    const canvas = document.createElement('canvas');
    bwipjs.toCanvas(canvas, {
      bcid,
      text: text || '12345678',
      scale: 3,
      height: type === 'PDF417' ? 15 : 10,
      includetext: includeText,
      textxalign: 'center',
      barcolor: cleanLineColor,
      backgroundcolor: cleanBgColor,
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn(`Barcode generation warning for ${type} with text "${text}":`, err);
    // Fallback Code128 or simpler rendering
    try {
      const fallbackCanvas = document.createElement('canvas');
      bwipjs.toCanvas(fallbackCanvas, {
        bcid: 'code128',
        text: '12345678',
        scale: 2,
        height: 10,
        includetext: true,
      });
      return fallbackCanvas.toDataURL('image/png');
    } catch {
      return '';
    }
  }
}

/**
 * Generate a QR Code image data URL (PNG)
 */
export async function generateQRCodeDataUrl(
  rawText: string,
  darkColor: string = '#000000',
  lightColor: string = '#ffffff'
): Promise<string> {
  let text = rawText || 'BIGSTA';
  if (text.includes('{{')) {
    text = text.replace(/\{\{.*?\}\}/g, 'SAMPLE-ID-12345');
  }

  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 256,
      margin: 1,
      color: {
        dark: darkColor,
        light: lightColor,
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('QR Code generation error:', err);
    return '';
  }
}
