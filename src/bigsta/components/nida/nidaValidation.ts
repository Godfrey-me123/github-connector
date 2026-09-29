import { convertNidaDobBlockToDdMmmYyyy } from '../../utils/dateValidation';

/**
 * NIDA (National Identification Authority - Tanzania)
 * Validation and Formatting Utilities
 *
 * Format: YYYYMMDD-XXXXX-XXXXX-XX
 * Example: 19900101-00000-00000-01
 * Total digits: 20 (8 + 5 + 5 + 2)
 * Total length formatted: 23 characters
 */

export interface NidaValidationResult {
  isValid: boolean;
  isComplete: boolean;
  error: string | null;
  warning: string | null;
  digitCount: number;
  extractedDob?: string; // YYYY-MM-DD if valid
  parts: {
    dobBlock: string;
    centerBlock: string;
    sequenceBlock: string;
    checksumBlock: string;
  };
}

/**
 * Strips all non-digit characters from string, capped at 20 digits.
 */
export function sanitizeNidaInput(input: string): string {
  return input.replace(/\D/g, '').slice(0, 20);
}

/**
 * Formats a raw or partially typed string into the standard NIDA format:
 * YYYYMMDD-XXXXX-XXXXX-XX
 */
export function formatNidaNumber(input: string): string {
  const digits = sanitizeNidaInput(input);
  if (!digits) return '';

  const parts: string[] = [];

  // Block 1: YYYYMMDD (up to 8 digits)
  if (digits.length > 0) {
    parts.push(digits.slice(0, 8));
  }

  // Block 2: XXXXX (up to 5 digits)
  if (digits.length > 8) {
    parts.push(digits.slice(8, 13));
  }

  // Block 3: XXXXX (up to 5 digits)
  if (digits.length > 13) {
    parts.push(digits.slice(13, 18));
  }

  // Block 4: XX (up to 2 digits)
  if (digits.length > 18) {
    parts.push(digits.slice(18, 20));
  }

  return parts.join('-');
}

/**
 * Validates a NIDA date of birth component (YYYYMMDD)
 */
export function validateNidaDob(dobBlock: string): { isValid: boolean; message?: string; formattedDate?: string } {
  if (dobBlock.length < 8) {
    return { isValid: false, message: 'Incomplete birth date segment (YYYYMMDD)' };
  }

  const year = parseInt(dobBlock.slice(0, 4), 10);
  const month = parseInt(dobBlock.slice(4, 6), 10);
  const day = parseInt(dobBlock.slice(6, 8), 10);

  const currentYear = new Date().getFullYear();

  if (year < 1900 || year > currentYear) {
    return { isValid: false, message: `Birth year must be between 1900 and ${currentYear}` };
  }

  if (month < 1 || month > 12) {
    return { isValid: false, message: 'Invalid month in NIDA number (01-12)' };
  }

  // Days in month validation
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return { isValid: false, message: `Invalid day in NIDA number (01-${daysInMonth} for month ${month})` };
  }

  const strictFormattedDate = convertNidaDobBlockToDdMmmYyyy(dobBlock);
  return {
    isValid: true,
    formattedDate: strictFormattedDate || undefined,
  };
}

/**
 * Validates NIDA number in real-time.
 */
export function validateNidaNumber(input: string): NidaValidationResult {
  const digits = sanitizeNidaInput(input);
  const digitCount = digits.length;

  const parts = {
    dobBlock: digits.slice(0, 8),
    centerBlock: digits.slice(8, 13),
    sequenceBlock: digits.slice(13, 18),
    checksumBlock: digits.slice(18, 20),
  };

  // If empty
  if (digitCount === 0) {
    return {
      isValid: false,
      isComplete: false,
      error: null,
      warning: null,
      digitCount: 0,
      parts,
    };
  }

  // Check DOB portion if we have at least 8 digits
  let extractedDob: string | undefined;
  let dobWarning: string | null = null;
  if (parts.dobBlock.length === 8) {
    const dobCheck = validateNidaDob(parts.dobBlock);
    if (!dobCheck.isValid) {
      dobWarning = dobCheck.message || 'Invalid date component';
    } else {
      extractedDob = dobCheck.formattedDate;
    }
  }

  // Check complete length
  if (digitCount < 20) {
    const warningMsg = dobWarning
      ? `Incomplete NIDA number (${digitCount}/20 digits). Note: ${dobWarning}`
      : `Incomplete NIDA number (${digitCount}/20 digits entered). Required pattern: YYYYMMDD-XXXXX-XXXXX-XX`;

    return {
      isValid: false,
      isComplete: false,
      error: null,
      warning: warningMsg,
      digitCount,
      extractedDob,
      parts,
    };
  }

  // Complete length (20 digits)
  if (dobWarning) {
    return {
      isValid: false,
      isComplete: true,
      error: `Invalid NIDA format: ${dobWarning}`,
      warning: null,
      digitCount: 20,
      parts,
    };
  }

  // Full validation passed
  return {
    isValid: true,
    isComplete: true,
    error: null,
    warning: null,
    digitCount: 20,
    extractedDob,
    parts,
  };
}
