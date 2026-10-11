// @ts-nocheck
import { TypewriterEffect, TextLayer } from "../types";

export interface TypewriterCharLayout {
  char: string;
  charIndex: number;
  lineIndex: number;
  x: number; // offset in px relative to layer top-left
  y: number; // offset in px relative to line baseline/top
  rotation: number; // degrees
  width: number; // px width of this character
  fontSizePx: number;
  fill: string;
  isAffected: boolean;
  isSelected: boolean;
}

export interface TypewriterLayoutResult {
  chars: TypewriterCharLayout[];
  totalWidthPx: number;
  totalHeightPx: number;
  isFallback: boolean;
}

// Offscreen 2D canvas context for high-precision glyph measurement
let cachedMeasureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!cachedMeasureCtx) {
    try {
      const c = document.createElement("canvas");
      cachedMeasureCtx = c.getContext("2d");
    } catch {
      cachedMeasureCtx = null;
    }
  }
  return cachedMeasureCtx;
}

/**
 * Accurately measures a single character's rendered advance width.
 * Uses offscreen canvas measureText, with fallback heuristic based on font size.
 */
export function measureCharWidth(
  char: string,
  fontFamily: string,
  fontSizePx: number,
  fontStyle: string = "normal"
): number {
  if (!char) return 0;

  const ctx = getMeasureContext();
  if (ctx) {
    try {
      ctx.font = `${fontStyle} ${fontSizePx}px ${fontFamily || "Helvetica, Arial, sans-serif"}`;
      const metrics = ctx.measureText(char);
      if (metrics && typeof metrics.width === "number" && metrics.width > 0) {
        return metrics.width;
      }
    } catch {
      // Fallback below
    }
  }

  // Reliable proportional fallback metrics
  if (char === " ") return fontSizePx * 0.35;
  if (/^[ijlI|!':;,.]$/.test(char)) return fontSizePx * 0.28;
  if (/^[frt]$/.test(char)) return fontSizePx * 0.38;
  if (/^[mwMW]$/.test(char)) return fontSizePx * 0.85;
  if (/^[A-Z0-9]$/.test(char)) return fontSizePx * 0.65;
  return fontSizePx * 0.55;
}

/**
 * Deterministic pseudo-random number generator for stable typewriter rendering
 * Returns a value in [-1, 1] based on seed and character position.
 */
function getDeterministicRandom(seed: number, index: number, lineIndex: number, component: number): number {
  const s = (seed || 12345) * 13.37;
  const i = (index + 1) * 31.17;
  const l = (lineIndex + 1) * 97.43;
  const c = component * 127.89;
  const angle = s + i + l + c;
  return Math.sin(angle);
}

/**
 * Computes exact irregular typewriter character positions across lines.
 * Guarantees that:
 * 1. Characters advance by their true measured widths + spacing, preserving normal word length.
 * 2. Text never collapses into a single letter box or column.
 * 3. Seeded randomness is 100% deterministic (no jitter on re-renders).
 * 4. Per-character manual adjustments (X, Y, rotation) apply accurately to selected index.
 */
export function calculateTypewriterLayout(
  text: string,
  layer: Partial<TextLayer> & { typewriterEffect?: TypewriterEffect },
  pxPerMm: number,
  scaleX: number = 1,
  scaleY: number = 1
): TypewriterLayoutResult {
  const fallbackResult: TypewriterLayoutResult = {
    chars: [],
    totalWidthPx: 0,
    totalHeightPx: 0,
    isFallback: true,
  };

  if (!text || typeof text !== "string") {
    return fallbackResult;
  }

  const effect = layer.typewriterEffect;
  if (!effect || !effect.enabled) {
    return fallbackResult;
  }

  const fontSizePx = Math.max(4, (layer.fontSize ?? 3) * pxPerMm);
  const fontFamily = layer.fontFamily || "Helvetica";
  const fontStyle = layer.fontStyle || "normal";
  const spacingPx = (effect.spacing ?? 0) * pxPerMm;
  const intensity = typeof effect.intensity === "number" ? Math.max(0, Math.min(2, effect.intensity)) : 0.5;
  const baseHOffsetPx = (effect.horizontalOffset ?? 0) * pxPerMm;
  const baseVOffsetPx = (effect.verticalOffset ?? 0) * pxPerMm;
  const baseRotRange = typeof effect.rotation === "number" ? effect.rotation : 0;
  const seed = effect.seed || 12345;
  const affectedCount = effect.affectedCharacters ?? 0;
  const selectedIndex = typeof effect.selectedIndex === "number" ? effect.selectedIndex : -1;
  const selectedLine = typeof effect.selectedLine === "number" ? effect.selectedLine : 0;
  const manualXPx = (effect.manualX ?? 0) * pxPerMm;
  const manualYPx = (effect.manualY ?? 0) * pxPerMm;
  const manualRot = effect.manualRotation ?? 0;

  const lines = text.split("\n");
  const lineGap = fontSizePx * (layer.lineHeight || 1.15);
  const layerWidthPx = (layer.width ?? 0) * pxPerMm * scaleX;

  const charLayouts: TypewriterCharLayout[] = [];
  let maxLineWidth = 0;

  lines.forEach((lineText, lineIdx) => {
    const chars = lineText.split("");
    const charWidths: number[] = chars.map((ch) =>
      measureCharWidth(ch, fontFamily, fontSizePx, fontStyle) * scaleX
    );

    const totalLineWidth =
      charWidths.reduce((sum, w) => sum + w, 0) +
      Math.max(0, chars.length - 1) * spacingPx;

    if (totalLineWidth > maxLineWidth) {
      maxLineWidth = totalLineWidth;
    }

    // Alignment offset calculation
    let lineAlignOffset = 0;
    if (layer.align === "center") {
      lineAlignOffset = layerWidthPx > totalLineWidth ? (layerWidthPx - totalLineWidth) / 2 : 0;
    } else if (layer.align === "right") {
      lineAlignOffset = layerWidthPx > totalLineWidth ? layerWidthPx - totalLineWidth : 0;
    }

    let cursorX = lineAlignOffset;
    const lineBaseY = lineIdx * lineGap;

    chars.forEach((char, charIdx) => {
      const charWidth = charWidths[charIdx];
      const isAffected = affectedCount === 0 || charIdx < affectedCount;
      const isSelected = charIdx === selectedIndex && (selectedLine === lineIdx || lines.length === 1);

      // Deterministic pseudo-random variation scaled by intensity and character size
      const rx = getDeterministicRandom(seed, charIdx, lineIdx, 1);
      const ry = getDeterministicRandom(seed, charIdx, lineIdx, 2);
      const rr = getDeterministicRandom(seed, charIdx, lineIdx, 3);

      // Subtle typewriter mechanical jitter
      const jitterXPx = isAffected ? (rx * intensity * fontSizePx * 0.12) + baseHOffsetPx : 0;
      const jitterYPx = isAffected ? (ry * intensity * fontSizePx * 0.12) + baseVOffsetPx : 0;
      const jitterRot = isAffected ? (rr * intensity * (baseRotRange || 6)) : 0;

      // Manual adjustments for the selected character
      const extraXPx = isSelected ? manualXPx : 0;
      const extraYPx = isSelected ? manualYPx : 0;
      const extraRot = isSelected ? manualRot : 0;

      const finalX = cursorX + jitterXPx + extraXPx;
      const finalY = lineBaseY + jitterYPx + extraYPx;
      const finalRot = jitterRot + extraRot;

      charLayouts.push({
        char,
        charIndex: charIdx,
        lineIndex: lineIdx,
        x: finalX,
        y: finalY,
        rotation: finalRot,
        width: charWidth,
        fontSizePx,
        fill: layer.color || "#000000",
        isAffected,
        isSelected,
      });

      // Advance cursor strictly by character width plus spacing
      cursorX += charWidth + spacingPx;
    });
  });

  return {
    chars: charLayouts,
    totalWidthPx: Math.max(maxLineWidth, layerWidthPx),
    totalHeightPx: Math.max(lines.length * lineGap, (layer.height ?? 0) * pxPerMm * scaleY),
    isFallback: false,
  };
}
