export const FONT_LIBRARY = [
  'Archivo Black',
  'Arial Black',
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
  'Impact',
  'Trebuchet MS',
  'Georgia',
  'Verdana',
  'Comic Sans MS',
  'Tahoma',
];

export interface FontWeightOption {
  label: string;
  value: number; // 300, 400, 500, 600, 700, 800, 900
  name: string;  // Light, Regular, Medium, Semi Bold, Bold, Extra Bold, Black
}

export const ALL_FONT_WEIGHTS: FontWeightOption[] = [
  { label: 'Light — 300', value: 300, name: 'Light' },
  { label: 'Regular — 400', value: 400, name: 'Regular' },
  { label: 'Medium — 500', value: 500, name: 'Medium' },
  { label: 'Semi Bold — 600', value: 600, name: 'Semi Bold' },
  { label: 'Bold — 700', value: 700, name: 'Bold' },
  { label: 'Extra Bold — 800', value: 800, name: 'Extra Bold' },
  { label: 'Black — 900', value: 900, name: 'Black' },
];

// Available weights mapping per font family based on standard font files and web availability
export const FONT_WEIGHTS_BY_FAMILY: Record<string, number[]> = {
  'Archivo Black': [400],
  'Arial': [400, 700],
  'Arial Black': [900],
  'Helvetica': [300, 400, 500, 700],
  'Times New Roman': [400, 700],
  'Courier New': [400, 700],
  'Impact': [400, 900],
  'Trebuchet MS': [400, 700],
  'Georgia': [400, 700],
  'Verdana': [400, 700],
  'Comic Sans MS': [400, 700],
  'Tahoma': [400, 700],
};

export function getAvailableWeightsForFont(fontFamily: string): FontWeightOption[] {
  const allowedValues = FONT_WEIGHTS_BY_FAMILY[fontFamily] || [400, 700];
  return ALL_FONT_WEIGHTS.filter((w) => allowedValues.includes(w.value));
}

export function getClosestValidWeight(fontFamily: string, currentWeight: number): number {
  const options = getAvailableWeightsForFont(fontFamily);
  if (options.some((o) => o.value === currentWeight)) {
    return currentWeight;
  }
  let closest = options[0].value;
  let minDiff = Math.abs(currentWeight - closest);
  for (const opt of options) {
    const diff = Math.abs(currentWeight - opt.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = opt.value;
    }
  }
  return closest;
}

export function getWeightLabel(value: number): string {
  const match = ALL_FONT_WEIGHTS.find((w) => w.value === value);
  return match ? match.label : `Weight ${value}`;
}

export const FONT_SCOPE_STORAGE_KEY = 'id_card_font_scope_preference';
export const WEIGHT_SCOPE_STORAGE_KEY = 'id_card_weight_scope_preference';

export type FontScope = 'selected' | 'all';

export function getStoredFontScope(): FontScope {
  try {
    const saved = localStorage.getItem(FONT_SCOPE_STORAGE_KEY);
    if (saved === 'selected' || saved === 'all') {
      return saved;
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return 'selected';
}

export function setStoredFontScope(scope: FontScope): void {
  try {
    localStorage.setItem(FONT_SCOPE_STORAGE_KEY, scope);
  } catch (e) {
    // Ignore localStorage errors
  }
}

export function getStoredWeightScope(): FontScope {
  try {
    const saved = localStorage.getItem(WEIGHT_SCOPE_STORAGE_KEY);
    if (saved === 'selected' || saved === 'all') {
      return saved;
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return 'selected';
}

export function setStoredWeightScope(scope: FontScope): void {
  try {
    localStorage.setItem(WEIGHT_SCOPE_STORAGE_KEY, scope);
  } catch (e) {
    // Ignore localStorage errors
  }
}

