import { Unit } from '../types';

export const DEFAULT_DPI = 300;
export const MM_PER_INCH = 25.4;
export const CM_PER_INCH = 2.54;

/**
 * Standard ID Card Dimensions (CR80)
 */
export const CR80_WIDTH_MM = 85.60;
export const CR80_HEIGHT_MM = 53.98;

/**
 * Convert value from Millimeters (mm) to target Unit
 */
export function convertFromMm(valueMm: number, targetUnit: Unit, dpi: number = DEFAULT_DPI): number {
  switch (targetUnit) {
    case 'mm':
      return Number(valueMm.toFixed(2));
    case 'cm':
      return Number((valueMm / 10).toFixed(3));
    case 'in':
      return Number((valueMm / MM_PER_INCH).toFixed(3));
    case 'px':
      return Number(((valueMm / MM_PER_INCH) * dpi).toFixed(1));
    default:
      return valueMm;
  }
}

/**
 * Convert value from specified Unit to Millimeters (mm)
 */
export function convertToMm(value: number, sourceUnit: Unit, dpi: number = DEFAULT_DPI): number {
  switch (sourceUnit) {
    case 'mm':
      return value;
    case 'cm':
      return value * 10;
    case 'in':
      return value * MM_PER_INCH;
    case 'px':
      return (value / dpi) * MM_PER_INCH;
    default:
      return value;
  }
}

/**
 * Convert screen canvas pixels to internal physical mm
 */
export function pxToMm(px: number, dpi: number = DEFAULT_DPI): number {
  return (px / dpi) * MM_PER_INCH;
}

/**
 * Convert internal physical mm to screen canvas pixels
 */
export function mmToPx(mm: number, dpi: number = DEFAULT_DPI): number {
  return (mm / MM_PER_INCH) * dpi;
}

/**
 * Format value with unit string for display
 */
export function formatUnitValue(valueMm: number, unit: Unit, dpi: number = DEFAULT_DPI): string {
  const converted = convertFromMm(valueMm, unit, dpi);
  switch (unit) {
    case 'mm':
      return `${converted.toFixed(1)} mm`;
    case 'cm':
      return `${converted.toFixed(2)} cm`;
    case 'in':
      return `${converted.toFixed(2)} in`;
    case 'px':
      return `${Math.round(converted)} px`;
  }
}

/**
 * Calculate suitable screen canvas pixel size while maintaining exact mm aspect ratio
 */
export function calculateCanvasPxSize(
  cardWidthMm: number,
  cardHeightMm: number,
  maxDisplayWidthPx: number = 800,
  maxDisplayHeightPx: number = 600
): { pxWidth: number; pxHeight: number; screenScale: number; dpi: number } {
  // Base rendering DPI for crisp display
  const targetDpi = 300;
  const rawPxWidth = mmToPx(cardWidthMm, targetDpi);
  const rawPxHeight = mmToPx(cardHeightMm, targetDpi);

  const scaleX = maxDisplayWidthPx / rawPxWidth;
  const scaleY = maxDisplayHeightPx / rawPxHeight;
  const screenScale = Math.min(scaleX, scaleY, 1.0); // Fit in view box

  return {
    pxWidth: Math.round(rawPxWidth * screenScale),
    pxHeight: Math.round(rawPxHeight * screenScale),
    screenScale,
    dpi: targetDpi,
  };
}
