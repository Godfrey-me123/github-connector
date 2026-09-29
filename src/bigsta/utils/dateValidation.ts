/**
 * Strict Date of Birth (DOB) Validation and Normalization
 * Standard format: DD MMM YYYY (e.g. 01 MAR 1998)
 *
 * Rules:
 * - Day = 2 digits (01-31)
 * - Month = 3-letter uppercase abbreviation (JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC)
 * - Year = 4 digits (1900 to current year)
 * - Exactly one space between DD, MMM, and YYYY
 * - No slashes, no hyphens, no numeric months, no full month names
 */

export const MONTH_ABBREVIATIONS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

export type MonthAbbr = (typeof MONTH_ABBREVIATIONS)[number];

const MONTH_INDEX_MAP: Record<string, number> = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

/**
 * Validates strictly: DD MMM YYYY
 * e.g., 01 MAR 1998
 */
export function validateDdMmmYyyy(input: string): { isValid: boolean; error?: string } {
  if (!input || input.trim() === '') {
    return { isValid: false, error: 'Date of birth is required.' };
  }

  const trimmed = input.trim().toUpperCase();
  const parts = trimmed.split(' ');

  if (parts.length !== 3) {
    return {
      isValid: false,
      error: 'Date must follow strict format: DD MMM YYYY (e.g., 01 MAR 1998)',
    };
  }

  const [dayStr, monthStr, yearStr] = parts;

  // Day check
  if (!/^\d{2}$/.test(dayStr)) {
    return { isValid: false, error: 'Day must be exactly 2 digits (e.g., 01, 15).' };
  }
  const day = parseInt(dayStr, 10);

  // Month check
  if (!MONTH_ABBREVIATIONS.includes(monthStr as MonthAbbr)) {
    return {
      isValid: false,
      error: `Month must be 3-letter uppercase code (${MONTH_ABBREVIATIONS.join(', ')}).`,
    };
  }
  const monthIndex = MONTH_INDEX_MAP[monthStr];

  // Year check
  if (!/^\d{4}$/.test(yearStr)) {
    return { isValid: false, error: 'Year must be exactly 4 digits (e.g., 1998).' };
  }
  const year = parseInt(yearStr, 10);
  const currentYear = new Date().getFullYear();

  if (year < 1900 || year > currentYear) {
    return { isValid: false, error: `Year must be between 1900 and ${currentYear}.` };
  }

  // Days in month validation (including leap years)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return {
      isValid: false,
      error: `${monthStr} ${year} only has ${daysInMonth} days.`,
    };
  }

  return { isValid: true };
}

/**
 * Converts YYYYMMDD block (from NIDA) directly to DD MMM YYYY
 * e.g. "19980301" -> "01 MAR 1998"
 */
export function convertNidaDobBlockToDdMmmYyyy(dobBlock: string): string | null {
  if (!dobBlock || dobBlock.length !== 8 || !/^\d{8}$/.test(dobBlock)) {
    return null;
  }

  const year = parseInt(dobBlock.slice(0, 4), 10);
  const month = parseInt(dobBlock.slice(4, 6), 10);
  const day = parseInt(dobBlock.slice(6, 8), 10);

  if (month < 1 || month > 12) return null;
  const monthAbbr = MONTH_ABBREVIATIONS[month - 1];
  const dayStr = day.toString().padStart(2, '0');

  return `${dayStr} ${monthAbbr} ${year}`;
}

/**
 * Converts ISO date (YYYY-MM-DD) to DD MMM YYYY
 * e.g. "1998-03-01" -> "01 MAR 1998"
 */
export function convertIsoToDdMmmYyyy(isoDate: string): string | null {
  if (!isoDate) return null;
  const parts = isoDate.split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (month < 1 || month > 12) return null;

  const monthAbbr = MONTH_ABBREVIATIONS[month - 1];
  const dayStr = day.toString().padStart(2, '0');

  return `${dayStr} ${monthAbbr} ${year}`;
}

/**
 * Converts ISO date (YYYY-MM-DD) to DD/MM/YYYY
 * e.g. "2021-08-23" -> "23/08/2021"
 */
export function convertIsoToDdMmYyyy(isoDate: string): string | null {
  if (!isoDate) return null;
  const parts = isoDate.split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (month < 1 || month > 12) return null;

  const dayStr = day.toString().padStart(2, '0');
  const monthStr = month.toString().padStart(2, '0');

  return `${dayStr}/${monthStr}/${year}`;
}

/**
 * Standardizes any date string (ISO, DD MMM YYYY, DD-MM-YYYY, YYYYMMDD, DD/MM/YYYY)
 * to strict Driving Licence format: DD/MM/YYYY (e.g. 23/08/2021, 15/09/2027)
 */
export function formatToDdMmYyyy(val: string | null | undefined): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed) return '';

  // Already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    return `${parts[0]}/${parts[1]}/${parts[2]}`;
  }

  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const res = convertIsoToDdMmYyyy(trimmed);
    if (res) return res;
  }

  // DD MMM YYYY (e.g. 23 AUG 2021 or 01 MAR 1998)
  const parts = trimmed.toUpperCase().split(' ');
  if (parts.length === 3) {
    const [dayStr, monthStr, yearStr] = parts;
    const mIdx = MONTH_ABBREVIATIONS.indexOf(monthStr as MonthAbbr);
    if (mIdx !== -1 && /^\d{1,2}$/.test(dayStr) && /^\d{4}$/.test(yearStr)) {
      const day = parseInt(dayStr, 10).toString().padStart(2, '0');
      const month = (mIdx + 1).toString().padStart(2, '0');
      return `${day}/${month}/${yearStr}`;
    }
  }

  // 8-digit numeric YYYYMMDD
  if (/^\d{8}$/.test(trimmed)) {
    const yyyy = trimmed.slice(0, 4);
    const mm = trimmed.slice(4, 6);
    const dd = trimmed.slice(6, 8);
    return `${dd}/${mm}/${yyyy}`;
  }

  return trimmed;
}

/**
 * Converts any date format to ISO YYYY-MM-DD for native <input type="date">
 */
export function convertAnyDateToIso(val: string | null | undefined): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed) return '';

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // If DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/');
    const dd = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const yyyy = parts[2];
    return `${yyyy}-${mm}-${dd}`;
  }

  // If DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    const dd = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const yyyy = parts[2];
    return `${yyyy}-${mm}-${dd}`;
  }

  // If DD MMM YYYY
  const parts = trimmed.toUpperCase().split(' ');
  if (parts.length === 3) {
    const [dayStr, monthStr, yearStr] = parts;
    const mIdx = MONTH_ABBREVIATIONS.indexOf(monthStr as MonthAbbr);
    if (mIdx !== -1 && /^\d{1,2}$/.test(dayStr) && /^\d{4}$/.test(yearStr)) {
      const dd = parseInt(dayStr, 10).toString().padStart(2, '0');
      const mm = (mIdx + 1).toString().padStart(2, '0');
      return `${yearStr}-${mm}-${dd}`;
    }
  }

  // 8-digit numeric YYYYMMDD
  if (/^\d{8}$/.test(trimmed)) {
    const yyyy = trimmed.slice(0, 4);
    const mm = trimmed.slice(4, 6);
    const dd = trimmed.slice(6, 8);
    return `${yyyy}-${mm}-${dd}`;
  }

  return '';
}

/**
 * Validates strict DD/MM/YYYY format
 */
export function validateDdMmYyyy(input: string): { isValid: boolean; error?: string } {
  if (!input || input.trim() === '') {
    return { isValid: false, error: 'Date is required.' };
  }

  const trimmed = input.trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Date must follow DD/MM/YYYY format (e.g. 23/08/2021)',
    };
  }

  const [dayStr, monthStr, yearStr] = trimmed.split('/');
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  if (month < 1 || month > 12) {
    return { isValid: false, error: 'Month must be between 01 and 12.' };
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return { isValid: false, error: `Invalid day for month: ${day}. Max is ${daysInMonth}.` };
  }

  return { isValid: true };
}

/**
 * Normalizes user input into DD MMM YYYY if possible
 */
export function normalizeDateInput(val: string): string {
  if (!val) return '';
  // If already strict DD MMM YYYY:
  const upper = val.trim().toUpperCase();
  if (/^\d{2}\s[A-Z]{3}\s\d{4}$/.test(upper)) {
    return upper;
  }

  // If ISO YYYY-MM-DD:
  if (/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    const converted = convertIsoToDdMmmYyyy(val.trim());
    if (converted) return converted;
  }

  return upper;
}

/**
 * Converts any date representation (DD/MM/YYYY, DD MMM YYYY, DD-MM-YYYY, YYYY-MM-DD)
 * to ISO YYYY-MM-DD for native HTML5 date input binding.
 */
export function convertDateToIso(val: string): string {
  if (!val) return '';
  const trimmed = val.trim();

  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return `${y}-${m}-${d}`;
  }

  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('-');
    return `${y}-${m}-${d}`;
  }

  // DD MMM YYYY
  const parts = trimmed.toUpperCase().split(/\s+/);
  if (parts.length === 3) {
    const [dayStr, monthStr, yearStr] = parts;
    const mIndex = MONTH_ABBREVIATIONS.indexOf(monthStr as MonthAbbr);
    if (mIndex !== -1) {
      const dd = dayStr.padStart(2, '0');
      const mm = (mIndex + 1).toString().padStart(2, '0');
      return `${yearStr}-${mm}-${dd}`;
    }
  }

  return '';
}

/**
 * Converts any string to Title Case (e.g. "JOHN MICHAEL SAMPLE" -> "John Michael Sample")
 */
export function toTitleCase(val: string | null | undefined): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed) return '';

  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Standardizes any date string (ISO, DD/MM/YYYY, DD-MM-YYYY, YYYYMMDD, DD MMM YYYY)
 * to NHIF format: MMM DD, YYYY (e.g. Jun 16, 1981, Jan 01, 2000)
 */
export function formatToMmmDdYyyy(val: string | null | undefined): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed) return '';

  const MONTH_TITLES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Already MMM DD, YYYY (e.g., Jun 16, 1981)
  const mmmDdYyyyMatch = /^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/.exec(trimmed);
  if (mmmDdYyyyMatch) {
    const mStr = mmmDdYyyyMatch[1].toLowerCase();
    const mIdx = MONTH_TITLES.findIndex((m) => m.toLowerCase() === mStr);
    if (mIdx !== -1) {
      const monthTitle = MONTH_TITLES[mIdx];
      const day = parseInt(mmmDdYyyyMatch[2], 10).toString().padStart(2, '0');
      const year = mmmDdYyyyMatch[3];
      return `${monthTitle} ${day}, ${year}`;
    }
  }

  // DD MMM YYYY (e.g. 16 JUN 1981 or 16 Jun 1981)
  const ddMmmYyyyMatch = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(trimmed);
  if (ddMmmYyyyMatch) {
    const day = parseInt(ddMmmYyyyMatch[1], 10).toString().padStart(2, '0');
    const mStr = ddMmmYyyyMatch[2].toLowerCase();
    const mIdx = MONTH_TITLES.findIndex((m) => m.toLowerCase() === mStr);
    const year = ddMmmYyyyMatch[3];
    if (mIdx !== -1) {
      return `${MONTH_TITLES[mIdx]} ${day}, ${year}`;
    }
  }

  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    const year = parts[0];
    const mIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10).toString().padStart(2, '0');
    if (mIdx >= 0 && mIdx < 12) {
      return `${MONTH_TITLES[mIdx]} ${day}, ${year}`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[\/\-]/);
    const day = parseInt(parts[0], 10).toString().padStart(2, '0');
    const mIdx = parseInt(parts[1], 10) - 1;
    const year = parts[2];
    if (mIdx >= 0 && mIdx < 12) {
      return `${MONTH_TITLES[mIdx]} ${day}, ${year}`;
    }
  }

  // YYYYMMDD
  if (/^\d{8}$/.test(trimmed)) {
    const year = trimmed.slice(0, 4);
    const mIdx = parseInt(trimmed.slice(4, 6), 10) - 1;
    const day = parseInt(trimmed.slice(6, 8), 10).toString().padStart(2, '0');
    if (mIdx >= 0 && mIdx < 12) {
      return `${MONTH_TITLES[mIdx]} ${day}, ${year}`;
    }
  }

  return trimmed;
}
