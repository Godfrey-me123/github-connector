import { CardTemplate, Layer, TextLayer, ImageLayer, PlaceholderLayer, BarcodeLayer, QRCodeLayer } from '../types';
import { NidaFormData } from '../components/nida/NidaFormScreen';
import { normalizeDateInput, formatToDdMmYyyy, formatToMmmDdYyyy, toTitleCase } from './dateValidation';

export type { NidaFormData };

export type SupportedBinding =
  | 'FIRST_NAME'
  | 'MIDDLE_NAME'
  | 'LAST_NAME'
  | 'DOB'
  | 'GENDER'
  | 'NIDA_NUMBER'
  | 'PHOTO'
  | 'SIGNATURE'
  | 'FIRST_MIDDLE_NAME'
  | 'CATEGORIES_FIELD9'
  | 'DRIVING_LICENCE_CATEGORIES'
  | 'CLASSES_TABLE'
  | 'ISSUE_DATE'
  | 'EXPIRY_DATE'
  | 'ISSUING_AUTHORITY'
  | 'REGION'
  | 'PIN_NUMBER'
  | 'LICENCE_NUMBER'
  | 'CARD_NO'
  | 'FULL_NAME'
  | 'CARD_STATUS'
  | 'NHIF_CARD_NUMBER'
  | 'NHIF_FULL_NAME'
  | 'NHIF_GENDER'
  | 'NHIF_DATE_OF_BIRTH'
  | 'NHIF_CARD_STATUS'
  | 'NHIF_PASSPORT_PHOTO'
  | 'NHIF_QR';

export const ALL_SUPPORTED_BINDINGS: SupportedBinding[] = [
  'FIRST_NAME',
  'MIDDLE_NAME',
  'LAST_NAME',
  'DOB',
  'GENDER',
  'NIDA_NUMBER',
  'PHOTO',
  'SIGNATURE',
  'FIRST_MIDDLE_NAME',
  'CATEGORIES_FIELD9',
  'DRIVING_LICENCE_CATEGORIES',
  'CLASSES_TABLE',
  'ISSUE_DATE',
  'EXPIRY_DATE',
  'ISSUING_AUTHORITY',
  'REGION',
  'PIN_NUMBER',
  'CARD_NO',
  'FULL_NAME',
  'CARD_STATUS',
  'NHIF_CARD_NUMBER',
  'NHIF_FULL_NAME',
  'NHIF_GENDER',
  'NHIF_DATE_OF_BIRTH',
  'NHIF_CARD_STATUS',
  'NHIF_PASSPORT_PHOTO',
  'NHIF_QR',
];

export interface FieldMappingDetail {
  binding: SupportedBinding;
  layerId: string;
  layerName: string;
  layerType: Layer['type'];
  originalValue: string;
  newValue: string;
}

export interface MissingBindingDetail {
  binding: SupportedBinding;
  label: string;
  warning: string;
}

export interface MappingPlan {
  templateId: string;
  templateName: string;
  matchedBindings: SupportedBinding[];
  missingBindings: MissingBindingDetail[];
  fieldMappings: FieldMappingDetail[];
  warnings: string[];
}

export interface PopulatedTemplateResult {
  success: boolean;
  populatedTemplate: CardTemplate;
  plan: MappingPlan;
  populatedCount: number;
  skippedCount: number;
  warnings: string[];
  error?: string;
  isBackSide?: boolean;
}

/**
 * Checks if a template is a Back Side template
 */
export function isBackSideTemplate(template: CardTemplate | null | undefined): boolean {
  if (!template) return false;
  if (template.isUniversalBack) return true;
  if (template.isUniversalFront) return false;
  const side = (template.side || '').toLowerCase();
  const name = (template.templateName || '').toLowerCase();
  const id = (template.id || '').toLowerCase();
  return (
    side.includes('back') ||
    name.includes('back side') ||
    name.includes('back-side') ||
    name.includes('(back)') ||
    name.includes('backside') ||
    id.endsWith('_back')
  );
}

/**
 * Ensures a template has explicit fieldId, fieldName, bindingKey, and fieldType attributes on all variable layers.
 * Guarantees persistent 1-to-1 mapping across environments and cached stores.
 */
export function ensureTemplateFieldIds(template: CardTemplate): CardTemplate {
  if (!template || !Array.isArray(template.layers)) return template;

  const keyMap: Record<SupportedBinding, string> = {
    FIRST_NAME: 'firstName',
    MIDDLE_NAME: 'middleName',
    LAST_NAME: 'lastName',
    DOB: 'dateOfBirth',
    GENDER: 'gender',
    NIDA_NUMBER: 'nidaNumber',
    PHOTO: 'photo',
    SIGNATURE: 'signature',
    FIRST_MIDDLE_NAME: 'firstMiddleName',
    CATEGORIES_FIELD9: 'categories',
    DRIVING_LICENCE_CATEGORIES: 'classes',
    CLASSES_TABLE: 'classes',
    ISSUE_DATE: 'dateOfIssue',
    EXPIRY_DATE: 'dateOfExpiry',
    ISSUING_AUTHORITY: 'issuingAuthority',
    REGION: 'region',
    PIN_NUMBER: 'pinNumber',
    LICENCE_NUMBER: 'licenceNumber',
    CARD_NO: 'cardNumber',
    FULL_NAME: 'fullName',
    CARD_STATUS: 'cardStatus',
    NHIF_CARD_NUMBER: 'nhif_card_number',
    NHIF_FULL_NAME: 'nhif_full_name',
    NHIF_GENDER: 'nhif_gender',
    NHIF_DATE_OF_BIRTH: 'nhif_date_of_birth',
    NHIF_CARD_STATUS: 'nhif_status',
    NHIF_PASSPORT_PHOTO: 'nhif_passport_photo',
    NHIF_QR: 'nhif_qr',
  };

  const sanitizedLayers = template.layers.map((layer) => {
    const resolvedBinding = getLayerBinding(layer, template.layers);
    if (!resolvedBinding) return layer;

    const canonicalKey = keyMap[resolvedBinding] || 'field';

    return {
      ...layer,
      bindingKey: layer.bindingKey || resolvedBinding,
      fieldId: layer.fieldId || layer.fieldName || canonicalKey,
      fieldName: layer.fieldName || layer.fieldId || canonicalKey,
      fieldType: layer.fieldType || canonicalKey,
    };
  });

  return {
    ...template,
    layers: sanitizedLayers,
  };
}

/**
 * Strict 1-to-1 Field Binding Resolution.
 * Identifies the exact canonical field binding for a layer based on explicit properties, tokens, layer IDs, or composite label patterns.
 * Never uses "first available field", "fallback text field", or position guessing.
 */
export function getLayerBinding(layer: Layer, _allLayers: Layer[] = []): SupportedBinding | null {
  if (!layer) return null;

  // 1. Explicit Layer bindingKey Check
  if (layer.bindingKey) {
    const b = layer.bindingKey.toUpperCase() as any;
    if ([
      'FIRST_NAME', 'MIDDLE_NAME', 'LAST_NAME', 'DOB', 'GENDER', 'NIDA_NUMBER', 'PHOTO', 'SIGNATURE',
      'FIRST_MIDDLE_NAME', 'CATEGORIES_FIELD9', 'DRIVING_LICENCE_CATEGORIES', 'CLASSES_TABLE',
      'ISSUE_DATE', 'EXPIRY_DATE', 'ISSUING_AUTHORITY', 'REGION', 'PIN_NUMBER', 'LICENCE_NUMBER',
      'CARD_NO', 'CARD_NUMBER', 'FULL_NAME', 'CARD_STATUS',
      'NHIF_CARD_NUMBER', 'NHIF_FULL_NAME', 'NHIF_GENDER', 'NHIF_DATE_OF_BIRTH', 'NHIF_CARD_STATUS', 'NHIF_PASSPORT_PHOTO', 'NHIF_QR'
    ].includes(b)) {
      return b as SupportedBinding;
    }
  }

  // 2. Text Layer Literal Token Matching (high priority, overrides label checks!)
  if (layer.type === 'text') {
    const textLayer = layer as TextLayer;
    const text = (textLayer.text || '').trim();

    if (/\{\{(?:nhif_card_number|card_no|card_number|cardno|cardnumber)\}\}/i.test(text)) return 'CARD_NO';
    if (/\{\{(?:nhif_full_name|full_name|fullname|member_name)\}\}/i.test(text)) return 'FULL_NAME';
    if (/\{\{(?:nhif_status|card_status|membership_status)\}\}/i.test(text)) return 'CARD_STATUS';
    if (/\{\{(?:nhif_gender)\}\}/i.test(text)) return 'GENDER';
    if (/\{\{\s*(?:nhif_date_of_birth|nhif_dob)\s*\}\}/i.test(text)) return 'DOB';

    if (/\{\{(?:first_middle_name|first_name_middle_name|first_name_plus_middle_name|first_plus_middle_name|first_name_\+_middle_name|display_name_line1|displaynameline1|first_name_and_middle_name)\}\}/i.test(text)) return 'FIRST_MIDDLE_NAME';
    if (/\{\{(?:first_name|firstname|given_name|given_names|fname)\}\}/i.test(text) && /\{\{(?:middle_name|middlename|other_names|othernames|mname)\}\}/i.test(text)) return 'FIRST_MIDDLE_NAME';
    if (/\{\{(?:first_name|firstname|given_name|given_names|fname)\}\}/i.test(text)) return 'FIRST_NAME';
    if (/\{\{(?:middle_name|middlename|other_names|othernames|mname)\}\}/i.test(text)) return 'MIDDLE_NAME';
    if (/\{\{(?:last_name|lastname|surname|family_name|lname)\}\}/i.test(text)) return 'LAST_NAME';
    if (/\{\{\s*(?:dob|date_of_birth|birth_date|birthdate|dateofbirth|birth)\s*\}\}/i.test(text)) return 'DOB';
    if (/\{\{(?:gender|sex|jinsia|jinsi|gender_val|sex_val|jinsi_val)\}\}/i.test(text)) return 'GENDER';
    if (/\{\{(?:nida_number|nida|id_number|national_id|nin|id_no|namba_nida)\}\}/i.test(text)) return 'NIDA_NUMBER';
    if (/\{\{(?:categories_field9|field_9|categories_of_vehicles|categories|classes_front)\}\}/i.test(text)) return 'CATEGORIES_FIELD9';
    if (/\{\{(?:driving_licence_categories|classes_table|classes_list|categories_table|categories_back)\}\}/i.test(text)) return 'DRIVING_LICENCE_CATEGORIES';
    if (/\{\{\s*(?:issue_date|date_of_issue|issued_date|issueddate|dateofissue|issuedate|first_issue_date|first_issued_date|date_of_first_issue|valid_from|date_issued|issue)\s*\}\}/i.test(text)) return 'ISSUE_DATE';
    if (/\{\{\s*(?:expiry_date|date_of_expiry|expirydate|dateofexpiry|expiration_date|expirationdate|expires|expire_date|valid_to|valid_until|date_expired|expiry)\s*\}\}/i.test(text)) return 'EXPIRY_DATE';
    if (/\{\{(?:issuing_authority|authority)\}\}/i.test(text)) return 'ISSUING_AUTHORITY';
    if (/\{\{(?:region|residence|place_of_residence)\}\}/i.test(text)) return 'REGION';
    if (/\{\{(?:pin_number|pin)\}\}/i.test(text)) return 'PIN_NUMBER';
    if (/\{\{(?:licence_number|license_number|licence_no|license_no|licence|license|dl_no)\}\}/i.test(text)) return 'LICENCE_NUMBER';
  }

  // 3. Explicit Layer Attribute Checks (fieldName, fieldId, fieldType)
  const explicitField = (
    layer.fieldName ||
    layer.fieldId ||
    layer.fieldType ||
    ''
  ).toLowerCase();

  if (explicitField) {
    if (/nhif_card_number|nhif_card_no|card_?no|card_?number|membership_?number|namba_?ya_?kadi/i.test(explicitField)) return 'CARD_NO';
    if (/nhif_full_name|full_?name|member_?name|jina_?kamili/i.test(explicitField)) return 'FULL_NAME';
    if (/nhif_status|card_?status|membership_?status/i.test(explicitField)) return 'CARD_STATUS';
    if (/nhif_gender/i.test(explicitField)) return 'GENDER';
    if (/nhif_date_of_birth|nhif_dob/i.test(explicitField)) return 'DOB';
    if (/nhif_passport_photo/i.test(explicitField)) return 'PHOTO';
    if (/nhif_qr/i.test(explicitField)) return 'CARD_NO';
    if (/first_?middle_?name|firstname_?middlename|first_?name_?plus_?middle_?name|display_?name_?line1/i.test(explicitField)) return 'FIRST_MIDDLE_NAME';
    if (/first_?name|fname|given_?name/i.test(explicitField)) return 'FIRST_NAME';
    if (/middle_?name|mname|other_?name/i.test(explicitField)) return 'MIDDLE_NAME';
    if (/last_?name|lname|surname|family_?name/i.test(explicitField)) return 'LAST_NAME';
    if (/dob|date_?of_?birth|birth_?date|birthdate/i.test(explicitField)) return 'DOB';
    if (/gender|sex|jinsi|jinsia/i.test(explicitField)) return 'GENDER';
    if (/licence_?number|license_?number|licence_?no|license_?no|dl_?no/i.test(explicitField)) return 'LICENCE_NUMBER';
    if (/nida_?number|nida|id_?number|national_?id|nin/i.test(explicitField)) return 'NIDA_NUMBER';
    if (/photo|portrait|avatar|picture/i.test(explicitField)) return 'PHOTO';
    if (/signature|sign|specimen|sahihi/i.test(explicitField)) return 'SIGNATURE';
    if (/categories_field9|field_9|categories|classes_front/i.test(explicitField)) return 'CATEGORIES_FIELD9';
    if (/driving_licence_categories|classes_table|classes_list|categories_back/i.test(explicitField)) return 'DRIVING_LICENCE_CATEGORIES';
    if (/(?:issue_?date|date_?of_?issue|issued_?date|first_?issue_?date|date_?of_?first_?issue|valid_?from|date_?issued)/i.test(explicitField)) return 'ISSUE_DATE';
    if (/(?:expiry_?date|date_?of_?expiry|expirydate|expiration_?date|expire_?date|valid_?to|valid_?until|date_?expired)/i.test(explicitField)) return 'EXPIRY_DATE';
    if (/issuing_authority|authority/i.test(explicitField)) return 'ISSUING_AUTHORITY';
    if (/region|residence/i.test(explicitField)) return 'REGION';
    if (/pin_?number|pin/i.test(explicitField)) return 'PIN_NUMBER';
  }

  // 4. Static Labels Protection (only blocks if no explicit key/token matches above)
  const isLabelIdOrName =
    /lbl_|label|header|title|authority|country|jamhuri|legal_|address/i.test(layer.id) ||
    /label|header|title|authority|country|jamhuri|legal|address/i.test(layer.name);

  if (isLabelIdOrName) {
    return null; // Explicitly static label, do NOT inject!
  }

  // 5. Barcode / QR Code Layers
  if (layer.type === 'barcode') {
    const b = layer as BarcodeLayer;
    if (/\{\{(?:licence_number|license_number|licence_no|license_no|licence|license|dl_no)\}\}/i.test(b.data) || /licence|license|dl_barcode|barcode_dl/i.test(layer.id) || /licence|license/i.test(layer.name)) {
      return 'LICENCE_NUMBER';
    }
    if (/\{\{(?:card_no|card_number|cardno|cardnumber)\}\}/i.test(b.data) || /nhif|card_no|barcode_nhif/i.test(layer.id)) {
      return 'CARD_NO';
    }
    if (/\{\{(?:id_number|nida_number|nida)\}\}/i.test(b.data) || /nida|id_no|barcode_nida/i.test(layer.id)) {
      return 'NIDA_NUMBER';
    }
  }

  if (layer.type === 'qrcode') {
    const q = layer as QRCodeLayer;
    if (/\{\{(?:licence_number|license_number|licence_no|license_no|licence|license|dl_no)\}\}/i.test(q.data) || /licence|license|dl_qr|qr_dl/i.test(layer.id) || /licence|license/i.test(layer.name)) {
      return 'LICENCE_NUMBER';
    }
    if (/\{\{(?:card_no|card_number|cardno|cardnumber)\}\}/i.test(q.data) || /nhif|card_no|qr_nhif/i.test(layer.id)) {
      return 'CARD_NO';
    }
    if (/\{\{(?:id_number|nida_number|nida)\}\}/i.test(q.data) || /qr_nida/i.test(layer.id)) {
      return 'NIDA_NUMBER';
    }
  }

  // 6. Image or Placeholder Photo/Signature layers by ID / Name
  if (layer.type === 'image' || layer.type === 'placeholder') {
    if (/photo/i.test(layer.id) || /photo/i.test(layer.name)) return 'PHOTO';
    if (/sig/i.test(layer.id) || /signature/i.test(layer.name)) return 'SIGNATURE';
  }

  // 7. Text Layer Suffix and Composite matching (when no tokens present)
  if (layer.type === 'text') {
    const textLayer = layer as TextLayer;
    const text = (textLayer.text || '').trim();

    // Check MRZ machine-readable lines on back templates
    if (/mrz_line1|mrz.*1/i.test(layer.id) || /mrz.*1/i.test(layer.name)) {
      return 'NIDA_NUMBER';
    }

    // Check static label text without colon or token
    if (/^(?:SURNAME|JINA LA UKOO|FIRST NAME|JINA LA KWANZA|MIDDLE NAME|LA KATI|DATE OF BIRTH|TAREHE YA KUZALIWA|SEX|JINSIA|NATIONAL ID NO|NAMBARI YA NIDA|SIGNATURE|SAHIHI|JAMHURI|NATIONAL IDENTIFICATION)/i.test(text)) {
      if (!text.includes(':') && !text.includes('{{') && !/var_/i.test(layer.id)) {
        return null;
      }
    }

    // Check Specific Layer ID / Name Suffix (supporting spaces, underscores, or hyphens)
    const layerIdentifier = `${layer.id} ${layer.name}`.toLowerCase();
    if (/(?:^|[_\s-])(?:var|txt)?[_\s-]*(?:first_?middle_?name|firstname_?middlename|first_?name_?plus_?middle_?name)(?:[_\s-]*var)?/i.test(layerIdentifier)) return 'FIRST_MIDDLE_NAME';
    if (/(?:^|[_\s-])(?:var|txt)?[_\s-]*(?:first[_\s-]*name|given[_\s-]*name|firstname|givenname|fname)(?:[_\s-]*var)?/i.test(layerIdentifier)) return 'FIRST_NAME';
    if (/(?:^|[_\s-])(?:var|txt)?[_\s-]*(?:middle[_\s-]*name|other[_\s-]*names|middlename|othernames|mname)(?:[_\s-]*var)?/i.test(layerIdentifier)) return 'MIDDLE_NAME';
    if (/(?:^|[_\s-])(?:var|txt)?[_\s-]*(?:last[_\s-]*name|surname|family[_\s-]*name|lastname|familyname|lname)(?:[_\s-]*var)?/i.test(layerIdentifier)) return 'LAST_NAME';
    if (/(?:^|[_\s-])(?:var|txt)?[_\s-]*(?:dob|date[_\s-]*of[_\s-]*birth|birth[_\s-]*date|birthdate)(?:[_\s-]*var)?/i.test(layerIdentifier)) return 'DOB';
    if (/(?:^|[_\s-])(?:var|txt)?[_\s-]*(?:gender|sex|jinsi|jinsia)(?:[_\s-]*var)?/i.test(layerIdentifier)) return 'GENDER';
    if (/(?:^|[_\s-])(?:var|txt)?[_\s-]*(?:licence[_\s-]*number|license[_\s-]*number|licence[_\s-]*no|license[_\s-]*no|dl[_\s-]*no|licence|license)(?:[_\s-]*var)?/i.test(layerIdentifier)) return 'LICENCE_NUMBER';
    if (/(?:^|[_\s-])(?:var|txt)?[_\s-]*(?:nida[_\s-]*number|nida|id[_\s-]*number|national[_\s-]*id|nin|id[_\s-]*no|namba[_\s-]*nida|barcode)(?:[_\s-]*var)?/i.test(layerIdentifier)) return 'NIDA_NUMBER';
    if (/(?:^|[_\s-])(?:var|txt)?[_\s-]*(?:categories_field9|field_9|categories|classes_front)(?:[_\s-]*var)?/i.test(layerIdentifier)) return 'CATEGORIES_FIELD9';
    if (/(?:^|[_\s-])(?:var|txt)?[_\s-]*(?:driving_licence_categories|classes_table|classes_list|categories_back)(?:[_\s-]*var)?/i.test(layerIdentifier)) return 'DRIVING_LICENCE_CATEGORIES';
    if (/(?:^|[_\s-])(?:var|txt)?[_\s-]*(?:issue_?date|date[_\s-]*of[_\s-]*issue|issued[_\s-]*date|first[_\s-]*issue|valid[_\s-]*from|date[_\s-]*issued)(?:[_\s-]*var)?/i.test(layerIdentifier)) return 'ISSUE_DATE';
    if (/(?:^|[_\s-])(?:var|txt)?[_\s-]*(?:expiry_?date|date[_\s-]*of[_\s-]*expiry|expirydate|expiration[_\s-]*date|expire[_\s-]*date|valid[_\s-]*to|valid[_\s-]*until|date[_\s-]*expired)(?:[_\s-]*var)?/i.test(layerIdentifier)) return 'EXPIRY_DATE';
    if (/(?:^|[_\s-])(?:var|txt)?[_\s-]*(?:issuing_authority|authority)(?:[_\s-]*var)?/i.test(layerIdentifier)) return 'ISSUING_AUTHORITY';
    if (/(?:^|[_\s-])(?:var|txt)?[_\s-]*(?:region|residence)(?:[_\s-]*var)?/i.test(layerIdentifier)) return 'REGION';
    if (/(?:^|[_\s-])(?:var|txt)?[_\s-]*(?:pin_number|pin)(?:[_\s-]*var)?/i.test(layerIdentifier)) return 'PIN_NUMBER';

    // Check Composite Text Label Prefixes (supporting optional colons)
    if (/^(?:first\s*and\s*middle\s*name|first\s*\+\s*middle\s*name|first\s*&\s*middle\s*name)\s*[:：\-]?\s*/i.test(text)) return 'FIRST_MIDDLE_NAME';
    if (/^(?:jina|given\s*names?)\s*[:：\-]?\s*/i.test(text) && !/jina\s+la\s+(?:mwisho|ukoo)/i.test(text)) return 'FIRST_MIDDLE_NAME';
    if (/^(?:jina\s+la\s+(?:mwisho|ukoo)|surname|last\s*name)\s*[:：\-]?\s*/i.test(text)) return 'LAST_NAME';
    if (/^(?:middle\s*name|la\s+kati)\s*[:：\-]?\s*/i.test(text)) return 'MIDDLE_NAME';
    if (/^(?:tarehe\s+ya\s+kuzaliwa|date\s+of\s+birth|dob)\s*[:：\-]?\s*/i.test(text)) return 'DOB';
    if (/^(?:tarehe\s+ya\s+kutolewa|date\s+of\s+issue|issue\s*date|issued\s*date)\s*[:：\-]?\s*/i.test(text)) return 'ISSUE_DATE';
    if (/^(?:tarehe\s+ya\s+mwisho|tarehe\s+ya\s+kuisha|date\s+of\s+expiry|expiry\s*date|expiration\s*date|expires)\s*[:：\-]?\s*/i.test(text)) return 'EXPIRY_DATE';
    if (/^(?:jinsi|jinsia|sex|gender)\s*[:：\-]?\s*/i.test(text)) return 'GENDER';
    if (/^(?:licence\s*no|licence\s*number|license\s*no|license\s*number)\s*[:：\-]?\s*/i.test(text)) return 'LICENCE_NUMBER';
    if (/^(?:national\s*id\s*no|nambari\s*ya\s*nida|nida\s*no)\s*[:：\-]?\s*/i.test(text)) return 'NIDA_NUMBER';
  }

  return null;
}

/**
 * Backward compatibility matchLayerToBinding wrapper
 */
export function matchLayerToBinding(layer: Layer, binding: SupportedBinding, allLayers: Layer[] = []): boolean {
  const resolved = getLayerBinding(layer, allLayers);
  return resolved === binding;
}

/**
 * Extracts form value for a binding
 */
export function getFormValueForBinding(binding: SupportedBinding, formData: Partial<NidaFormData>): string {
  const isDL = !!(
    (formData as any).classes ||
    (formData as any).categories ||
    (formData as any).licenceNumber ||
    (formData as any).issuingAuthority ||
    (formData as any).pinNumber
  );

  switch (binding) {
    case 'FIRST_MIDDLE_NAME': {
      const f = formData.firstName?.trim() || '';
      const m = formData.middleName?.trim() || '';
      return m ? `${f} ${m}` : f;
    }
    case 'FIRST_NAME':
      return formData.firstName?.trim() || '';
    case 'MIDDLE_NAME':
      return formData.middleName?.trim() || '';
    case 'LAST_NAME':
      return formData.lastName?.trim() || '';
    case 'DOB': {
      const isNhif = !!((formData as any).cardNumber || (formData as any).card_no || (formData as any).cardNo);
      const rawDob = (formData.dob || (formData as any).dateOfBirth || '').trim();
      if (isNhif) return rawDob ? formatToMmmDdYyyy(rawDob) : '';
      return rawDob ? (isDL ? formatToDdMmYyyy(rawDob) : normalizeDateInput(rawDob)) : '';
    }
    case 'ISSUE_DATE': {
      const rawIssue = ((formData as any).dateOfIssue || (formData as any).issueDate || '').trim();
      return rawIssue ? (isDL ? formatToDdMmYyyy(rawIssue) : normalizeDateInput(rawIssue)) : '';
    }
    case 'EXPIRY_DATE': {
      const rawExpiry = ((formData as any).dateOfExpiry || (formData as any).expiryDate || '').trim();
      return rawExpiry ? (isDL ? formatToDdMmYyyy(rawExpiry) : normalizeDateInput(rawExpiry)) : '';
    }
    case 'GENDER': {
      const isNhif = !!((formData as any).cardNumber || (formData as any).card_no || (formData as any).cardNo);
      const g = (formData.gender || '').trim();
      if (isNhif) {
        if (g.toLowerCase().startsWith('m')) return 'Male';
        if (g.toLowerCase().startsWith('f')) return 'Female';
        return 'Male';
      }
      const gUpper = g.toUpperCase();
      if (gUpper.startsWith('M')) return 'M';
      if (gUpper.startsWith('F')) return 'F';
      return gUpper || 'M';
    }
    case 'NIDA_NUMBER':
      return (formData.nidaNumber || (formData as any).licenceNumber || '').trim();
    case 'LICENCE_NUMBER':
      return ((formData as any).licenceNumber || formData.nidaNumber || '').trim();
    case 'CATEGORIES_FIELD9':
      return formatDrivingLicenceCategoriesFront((formData as any).classes || (formData as any).categories);
    case 'DRIVING_LICENCE_CATEGORIES':
    case 'CLASSES_TABLE': {
      const rawIssue = ((formData as any).dateOfIssue || (formData as any).issueDate || '').trim();
      const rawExpiry = ((formData as any).dateOfExpiry || (formData as any).expiryDate || '').trim();
      return formatDrivingLicenceCategoriesBack(
        (formData as any).classes || (formData as any).categories,
        rawIssue ? formatToDdMmYyyy(rawIssue) : '',
        rawExpiry ? formatToDdMmYyyy(rawExpiry) : ''
      );
    }
    case 'ISSUING_AUTHORITY':
      return ((formData as any).issuingAuthority || '').trim();
    case 'REGION':
      return ((formData as any).region || '').trim();
    case 'PIN_NUMBER':
      return ((formData as any).pinNumber || '').trim();
    case 'CARD_NO':
      return ((formData as any).cardNumber || (formData as any).card_no || (formData as any).cardNo || '').trim();
    case 'FULL_NAME':
      return toTitleCase(((formData as any).fullName || (formData as any).full_name || '').trim());
    case 'CARD_STATUS':
      return toTitleCase(((formData as any).cardStatus || (formData as any).card_status || 'Active').trim());
    case 'PHOTO':
      return formData.photoUrl || '';
    case 'SIGNATURE':
      return formData.signatureUrl || '';
    default:
      return '';
  }
}

/**
 * Injects EXACT value into a matched layer.
 * Guarantees that a layer assigned to `lastName` receives `formData.lastName`, `dob` receives `formData.dob`, `gender` receives `'M'`/`'F'`, etc.
 */
/**
 * Detects the casing requested by the template placeholder (uppercase vs lowercase as saved in template)
 * and formats the injected value to match.
 */
function followCasing(textLayer: TextLayer, value: string): string {
  const originalText = textLayer.text || '';
  
  // 1. Check if the original text contains any uppercase placeholder token
  const hasUpperPlaceholder = /\{\{[A-Z0-9_]+\}\}/.test(originalText);
  const hasLowerPlaceholder = /\{\{[a-z0-9_]+\}\}/.test(originalText);
  
  if (hasUpperPlaceholder) {
    return value.toUpperCase();
  }
  if (hasLowerPlaceholder) {
    return value; // Keep as typed (case-preserving)
  }

  // 2. Fall back to checking if the original text layer was entirely uppercase
  if (originalText === originalText.toUpperCase() && originalText !== originalText.toLowerCase()) {
    return value.toUpperCase();
  }
  if (originalText === originalText.toLowerCase() && originalText !== originalText.toUpperCase()) {
    return value.toLowerCase();
  }

  return value;
}


export function replaceAllTokens(layer: Layer, formData: any): Layer {
  if (layer.type !== 'text') return layer;
  let text = (layer as any).text || '';
  if (!text.includes('{{')) return layer;

  const isDL = !!(
    formData.classes ||
    formData.categories ||
    formData.licenceNumber ||
    formData.issuingAuthority ||
    formData.pinNumber
  );

  const fVal = (formData.firstName || '').trim();
  const mVal = (formData.middleName || '').trim();
  const lVal = (formData.lastName || formData.surname || '').trim();
  const rawDob = (formData.dob || formData.dateOfBirth || '').trim();
  const dob = rawDob ? (isDL ? formatToDdMmYyyy(rawDob) : normalizeDateInput(rawDob)) : '';
  const gender = (formData.gender || '').trim().toUpperCase().startsWith('M') ? 'M' : 'F';
  const nida = (formData.nidaNumber || formData.licenceNumber || '').trim();
  const rawIssue = (formData.issueDate || formData.dateOfIssue || '').trim();
  const issue = rawIssue ? (isDL ? formatToDdMmYyyy(rawIssue) : normalizeDateInput(rawIssue)) : '';
  const rawExpiry = (formData.expiryDate || formData.dateOfExpiry || '').trim();
  const expiry = rawExpiry ? (isDL ? formatToDdMmYyyy(rawExpiry) : normalizeDateInput(rawExpiry)) : '';
  const auth = (formData.issuingAuthority || '').trim();
  const region = (formData.region || '').trim();
  const pin = (formData.pinNumber || '').trim();
  const licence = (formData.licenceNumber || formData.nidaNumber || '').trim();

  const categoriesFront = formatDrivingLicenceCategoriesFront(formData.classes || formData.categories);
  const categoriesBack = formatDrivingLicenceCategoriesBack(formData.classes || formData.categories, issue, expiry);

  const isNhif = !!(formData.cardNumber || formData.card_no || formData.cardNo);
  const cardNo = (formData.cardNumber || formData.card_no || formData.cardNo || '').trim();
  const fullName = toTitleCase((formData.fullName || formData.full_name || '').trim());
  const cardStatus = toTitleCase((formData.cardStatus || formData.card_status || 'Active').trim());

  if (isNhif) {
    const nhifDob = rawDob ? formatToMmmDdYyyy(rawDob) : '';
    const nhifGender = (formData.gender || '').trim().toLowerCase().startsWith('m') ? 'Male' : 'Female';
    text = text.replace(/\{\{(?:nhif_card_number|card_no|card_number|cardno|cardnumber)\}\}/gi, cardNo);
    text = text.replace(/\{\{(?:nhif_full_name|full_name|fullname|member_name)\}\}/gi, fullName);
    text = text.replace(/\{\{(?:nhif_status|card_status|membership_status)\}\}/gi, cardStatus);
    text = text.replace(/\{\{\s*(?:nhif_date_of_birth|nhif_dob|dob|date_of_birth|birth_date|birthdate|dateofbirth|birth)\s*\}\}/gi, nhifDob);
    text = text.replace(/\{\{(?:nhif_gender|gender|sex|jinsia|jinsi)\}\}/gi, nhifGender);
  } else {
    text = text.replace(/\{\{(?:nhif_card_number|card_no|card_number|cardno|cardnumber)\}\}/gi, cardNo);
    text = text.replace(/\{\{(?:nhif_full_name|full_name|fullname|member_name)\}\}/gi, fullName);
    text = text.replace(/\{\{(?:nhif_status|card_status|membership_status)\}\}/gi, cardStatus);
    text = text.replace(/\{\{\s*(?:dob|date_of_birth|birth_date|birthdate|dateofbirth|birth)\s*\}\}/gi, dob);
    text = text.replace(/\{\{(?:gender|sex|jinsia|jinsi)\}\}/gi, gender);
  }
  text = text.replace(/\{\{(?:nida_number|nida|id_number|national_id|nin)\}\}/gi, nida);
  text = text.replace(/\{\{\s*(?:issue_date|date_of_issue|issued_date|issueddate|dateofissue|issuedate|first_issue_date|first_issued_date|date_of_first_issue|valid_from|date_issued|issue)\s*\}\}/gi, issue);
  text = text.replace(/\{\{\s*(?:expiry_date|date_of_expiry|expirydate|dateofexpiry|expiration_date|expirationdate|expires|expire_date|valid_to|valid_until|date_expired|expiry)\s*\}\}/gi, expiry);
  text = text.replace(/\{\{(?:issuing_authority|authority)\}\}/gi, auth);
  text = text.replace(/\{\{(?:region|residence|place_of_residence)\}\}/gi, region);
  text = text.replace(/\{\{(?:pin_number|pin)\}\}/gi, pin);
  text = text.replace(/\{\{(?:licence_number|license_number|licence|license|dl_no)\}\}/gi, licence);
  text = text.replace(/\{\{(?:categories_field9|field_9|categories_of_vehicles|categories|classes_front)\}\}/gi, categoriesFront);
  text = text.replace(/\{\{(?:driving_licence_categories|classes_table|classes_list|categories_table|categories_back)\}\}/gi, categoriesBack);

  return { ...layer, text } as any;
}

export function injectValueIntoLayer(

  layer: Layer,
  binding: SupportedBinding,
  formData: NidaFormData,
  allLayers: Layer[] = []
): Layer {
  const targetGender: 'M' | 'F' = (formData.gender || '').trim().toUpperCase().startsWith('M') ? 'M' : 'F';

  if (binding === 'PHOTO') {
    if (layer.type === 'placeholder' || layer.type === 'image') {
      if (!formData.photoUrl) {
        return { ...layer, hidden: true };
      }
      return {
        ...layer,
        type: 'image',
        src: formData.photoUrl,
        hidden: false,
        aspectRatioLocked: true,
      } as ImageLayer;
    }
    return layer; // NEVER replace text fields with photo!
  }

  if (binding === 'SIGNATURE') {
    if (layer.type === 'placeholder' || layer.type === 'image') {
      if (!formData.signatureUrl) {
        return { ...layer, hidden: true };
      }
      return {
        ...layer,
        type: 'image',
        src: formData.signatureUrl,
        hidden: false,
        aspectRatioLocked: true,
      } as ImageLayer;
    }
    return layer; // NEVER replace text fields with signature!
  }

  if (layer.type === 'text') {
    const textLayer = layer as TextLayer;
    let text = textLayer.text || '';

    switch (binding) {
      case 'FIRST_MIDDLE_NAME': {
        const fVal = (formData.firstName || '').trim();
        const mVal = (formData.middleName || '').trim();
        const rawVal = mVal ? `${fVal} ${mVal}` : fVal;
        const val = rawVal ? followCasing(textLayer, rawVal) : '';
        if (text.includes('{{')) {
          if (/\{\{(?:first_name|firstname|given_name|given_names|fname)\}\}/i.test(text) && /\{\{(?:middle_name|middlename|other_names|othernames|mname)\}\}/i.test(text)) {
            let t = text.replace(/\{\{(?:first_name|firstname|given_name|given_names|fname)\}\}/gi, fVal ? followCasing(textLayer, fVal) : '');
            if (mVal) {
              t = t.replace(/\{\{(?:middle_name|middlename|other_names|othernames|mname)\}\}/gi, followCasing(textLayer, mVal));
            } else {
              t = t.replace(/\s*\{\{(?:middle_name|middlename|other_names|othernames|mname)\}\}/gi, '');
            }
            text = t.replace(/\s+/g, ' ').trim();
          } else {
            text = text.replace(/\{\{(?:first_middle_name|first_name_middle_name|first_name_plus_middle_name|first_plus_middle_name|first_name_\+_middle_name|display_name_line1|displaynameline1|first_name_and_middle_name|first_name|firstname|given_name|given_names|fname)\}\}/gi, val);
          }
        } else if (/^(?:jina|given\s*names?|first\s*and\s*middle\s*name|first\s*\+\s*middle\s*name|first\s*&\s*middle\s*name)\s*[:：\-]?\s*/i.test(text)) {
          text = val ? text.replace(/^(?:jina|given\s*names?|first\s*and\s*middle\s*name|first\s*\+\s*middle\s*name|first\s*&\s*middle\s*name)\s*[:：\-]?\s*.*/i, `JINA : ${val}`) : '';
        } else {
          text = val;
        }
        break;
      }
      case 'FIRST_NAME': {
        const fVal = (formData.firstName || '').trim();
        const mVal = (formData.middleName || '').trim();
        const hasMiddleLayer = allLayers.some(
          (l) => l.type === 'text' && getLayerBinding(l, allLayers) === 'MIDDLE_NAME'
        );
        const rawVal = (!hasMiddleLayer && mVal) ? `${fVal} ${mVal}` : fVal;
        const val = rawVal ? followCasing(textLayer, rawVal) : '';
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:first_name|firstname|given_name|given_names|fname)\}\}/gi, val);
        } else if (/^(?:jina|given\s*names?)\s*[:：\-]?\s*/i.test(text)) {
          text = val ? text.replace(/^(?:jina|given\s*names?)\s*[:：\-]?\s*.*/i, `JINA : ${val}`) : '';
        } else {
          text = val;
        }
        break;
      }
      case 'MIDDLE_NAME': {
        const rawVal = (formData.middleName || '').trim();
        const val = rawVal ? followCasing(textLayer, rawVal) : '';
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:middle_name|middlename|other_names|othernames|mname)\}\}/gi, val);
        } else if (/^(?:middle\s*name|la\s+kati)\s*[:：\-]?\s*/i.test(text)) {
          text = val ? text.replace(/^(?:middle\s*name|la\s+kati)\s*[:：\-]?\s*.*/i, `MIDDLE NAME : ${val}`) : '';
        } else {
          text = val;
        }
        break;
      }
      case 'LAST_NAME': {
        const rawVal = (formData.lastName || '').trim();
        const val = rawVal ? followCasing(textLayer, rawVal) : '';
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:last_name|lastname|surname|family_name|lname)\}\}/gi, val);
        } else if (/^(?:jina\s+la\s+(?:mwisho|ukoo)|surname|last\s*name)\s*[:：\-]?\s*/i.test(text)) {
          text = val ? text.replace(/^(?:jina\s+la\s+(?:mwisho|ukoo)|surname|last\s*name)\s*[:：\-]?\s*.*/i, `JINA LA MWISHO : ${val}`) : '';
        } else {
          text = val;
        }
        break;
      }
      case 'DOB': {
        const isNhif = !!((formData as any).cardNumber || (formData as any).card_no || (formData as any).cardNo);
        const isDrivingLicence = !!(
          (formData as any).classes ||
          (formData as any).categories ||
          (formData as any).licenceNumber ||
          (formData as any).issuingAuthority ||
          (formData as any).pinNumber ||
          (textLayer as any).licenseCategoryGroup !== undefined ||
          (textLayer as any).licenseCategoriesSeparator !== undefined
        );
        const rawDob = (formData.dob || (formData as any).dateOfBirth || '').trim();
        const val = rawDob ? (isNhif ? formatToMmmDdYyyy(rawDob) : isDrivingLicence ? formatToDdMmYyyy(rawDob) : normalizeDateInput(rawDob)) : '';
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:dob|date_of_birth|birth_date|birthdate)\}\}/gi, val);
        } else if (/^(?:tarehe\s+ya\s+kuzaliwa|date\s+of\s+birth|dob)\s*[:：\-]?\s*/i.test(text)) {
          text = val ? text.replace(/^(?:tarehe\s+ya\s+kuzaliwa|date\s+of\s+birth|dob)\s*[:：\-]?\s*.*/i, `TAREHE YA KUZALIWA: ${val}`) : '';
        } else {
          text = val;
        }
        break;
      }
      case 'GENDER': {
        const isNhif = !!((formData as any).cardNumber || (formData as any).card_no || (formData as any).cardNo);
        const rawGender = (formData.gender || '').trim();
        const nhifGender = rawGender.toLowerCase().startsWith('m') ? 'Male' : rawGender.toLowerCase().startsWith('f') ? 'Female' : 'Male';
        const val = rawGender ? (isNhif ? nhifGender : targetGender) : '';
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:gender|sex|jinsia|jinsi|gender_val|sex_val|jinsi_val)\}\}/gi, val);
        } else if (/^(?:jinsi|jinsia|sex|gender)\s*[:：\-]?\s*/i.test(text)) {
          text = val ? text.replace(/^(?:jinsi|jinsia|sex|gender)\s*[:：\-]?\s*.*/i, `JINSI : ${val}`) : '';
        } else {
          text = val;
        }
        break;
      }
      case 'LICENCE_NUMBER': {
        const val = ((formData as any).licenceNumber || formData.nidaNumber || '').trim();
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:licence_number|license_number|licence|license|dl_no)\}\}/gi, val);
        } else {
          text = val;
        }
        break;
      }
      case 'NIDA_NUMBER': {
        const val = ((formData as any).licenceNumber || formData.nidaNumber || '').trim();
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:nida_number|nida|id_number|national_id|nin|id_no|namba_nida|licence_number|license_number)\}\}/gi, val);
        } else if (/^(?:national\s*id\s*no|nambari\s*ya\s*nida|nida\s*no|licence\s*no|licence\s*number)\s*[:：\-]?\s*/i.test(text)) {
          text = val ? text.replace(/^(?:national\s*id\s*no|nambari\s*ya\s*nida|nida\s*no|licence\s*no|licence\s*number)\s*[:：\-]?\s*.*/i, `LICENCE NO: ${val}`) : '';
        } else {
          text = val;
        }
        break;
      }
      case 'CATEGORIES_FIELD9': {
        const val = formatDrivingLicenceCategoriesFront((formData as any).classes || (formData as any).categories);
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:categories_field9|field_9|categories_of_vehicles|categories|classes_front)\}\}/gi, val);
        } else {
          text = val;
        }
        // Ensure no artificial stretching letterSpacing
        if ((textLayer as any).letterSpacing && (textLayer as any).letterSpacing > 0.05) {
          (textLayer as any).letterSpacing = 0;
        }
        break;
      }
      case 'DRIVING_LICENCE_CATEGORIES':
      case 'CLASSES_TABLE': {
        const val = formatDrivingLicenceCategoriesBack(
          (formData as any).classes || (formData as any).categories,
          (formData as any).dateOfIssue || (formData as any).issueDate,
          (formData as any).dateOfExpiry || (formData as any).expiryDate
        );
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:driving_licence_categories|classes_table|classes_list|categories_table|categories_back)\}\}/gi, val);
        } else {
          text = val;
        }
        break;
      }
      case 'ISSUE_DATE': {
        const isDrivingLicence = !!(
          (formData as any).classes ||
          (formData as any).categories ||
          (formData as any).licenceNumber ||
          (formData as any).issuingAuthority ||
          (formData as any).pinNumber
        );
        const rawIssue = ((formData as any).dateOfIssue || (formData as any).issueDate || '').trim();
        const val = rawIssue ? (isDrivingLicence ? formatToDdMmYyyy(rawIssue) : normalizeDateInput(rawIssue)) : '';
        if (text.includes('{{')) {
          text = text.replace(/\{\{\s*(?:issue_date|date_of_issue|issued_date|issueddate|dateofissue|issuedate|first_issue_date|first_issued_date|date_of_first_issue|valid_from|date_issued|issue)\s*\}\}/gi, val);
          if (text.startsWith('{{') && text.endsWith('}}')) {
            text = val;
          }
        } else {
          text = val;
        }
        break;
      }
      case 'EXPIRY_DATE': {
        const isDrivingLicence = !!(
          (formData as any).classes ||
          (formData as any).categories ||
          (formData as any).licenceNumber ||
          (formData as any).issuingAuthority ||
          (formData as any).pinNumber
        );
        const rawExpiry = ((formData as any).dateOfExpiry || (formData as any).expiryDate || '').trim();
        const val = rawExpiry ? (isDrivingLicence ? formatToDdMmYyyy(rawExpiry) : normalizeDateInput(rawExpiry)) : '';
        if (text.includes('{{')) {
          text = text.replace(/\{\{\s*(?:expiry_date|date_of_expiry|expirydate|dateofexpiry|expiration_date|expirationdate|expires|expire_date|valid_to|valid_until|date_expired|expiry)\s*\}\}/gi, val);
          if (text.startsWith('{{') && text.endsWith('}}')) {
            text = val;
          }
        } else {
          text = val;
        }
        break;
      }
      case 'ISSUING_AUTHORITY': {
        const val = ((formData as any).issuingAuthority || '').trim();
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:issuing_authority|authority)\}\}/gi, val);
        } else {
          text = val;
        }
        break;
      }
      case 'REGION': {
        const val = ((formData as any).region || '').trim();
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:region|residence|place_of_residence)\}\}/gi, val);
        } else {
          text = val;
        }
        break;
      }
      case 'PIN_NUMBER': {
        const val = ((formData as any).pinNumber || '').trim();
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:pin_number|pin)\}\}/gi, val);
        } else {
          text = val;
        }
        break;
      }
      case 'CARD_NO':
      case 'NHIF_CARD_NUMBER': {
        const rawVal = ((formData as any).cardNumber || (formData as any).card_no || (formData as any).cardNo || '').trim();
        const val = rawVal;
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:nhif_card_number|card_no|card_number|cardno|cardnumber)\}\}/gi, val);
          if (text.startsWith('{{') && text.endsWith('}}')) {
            text = val;
          }
        } else {
          text = val;
        }
        break;
      }
      case 'FULL_NAME':
      case 'NHIF_FULL_NAME': {
        const rawVal = ((formData as any).fullName || (formData as any).full_name || '').trim();
        const val = rawVal ? toTitleCase(rawVal) : '';
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:nhif_full_name|full_name|fullname|member_name)\}\}/gi, val);
          if (text.startsWith('{{') && text.endsWith('}}')) {
            text = val;
          }
        } else {
          text = val;
        }
        break;
      }
      case 'CARD_STATUS':
      case 'NHIF_CARD_STATUS': {
        const rawVal = ((formData as any).cardStatus || (formData as any).card_status || 'Active').trim();
        const val = rawVal ? toTitleCase(rawVal) : 'Active';
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:nhif_status|card_status|membership_status)\}\}/gi, val);
          if (text.startsWith('{{') && text.endsWith('}}')) {
            text = val;
          }
        } else {
          text = val;
        }
        break;
      }
      case 'NHIF_GENDER': {
        const rawGender = (formData.gender || '').trim();
        const nhifGender = rawGender.toLowerCase().startsWith('m') ? 'Male' : rawGender.toLowerCase().startsWith('f') ? 'Female' : 'Male';
        if (text.includes('{{')) {
          text = text.replace(/\{\{(?:nhif_gender|gender|sex)\}\}/gi, nhifGender);
        } else {
          text = nhifGender;
        }
        break;
      }
      case 'NHIF_DATE_OF_BIRTH': {
        const rawDob = (formData.dob || (formData as any).dateOfBirth || '').trim();
        const val = rawDob ? formatToMmmDdYyyy(rawDob) : '';
        if (text.includes('{{')) {
          text = text.replace(/\{\{\s*(?:nhif_date_of_birth|nhif_dob|dob|date_of_birth)\s*\}\}/gi, val);
        } else {
          text = val;
        }
        break;
      }
    }

    // Replace any remaining tokens for general fields
    if (text.includes('{{')) {
      const fd = formData as any;
      const fVal = (fd.firstName || '').trim();
      const sVal = (fd.secondName || fd.middleName || '').trim();
      const tVal = (fd.thirdName || fd.lastName || '').trim();
      const givenNames = sVal ? `${fVal} ${sVal}` : fVal;

      text = text.replace(/\{\{given_names\}\}/gi, givenNames);
      text = text.replace(/\{\{family_name\}\}/gi, tVal);
      text = text.replace(/\{\{first_name\}\}/gi, fVal);
      text = text.replace(/\{\{second_name\}\}/gi, sVal);
      text = text.replace(/\{\{third_name\}\}/gi, tVal);
      text = text.replace(/\{\{dob\}\}/gi, fd.dob ? normalizeDateInput(fd.dob) : '');
      text = text.replace(/\{\{gender\}\}/gi, fd.gender ? ((fd.gender || '').trim().toUpperCase().startsWith('M') ? 'M' : 'F') : '');
      text = text.replace(/\{\{nationality\}\}/gi, fd.nationality || '');
    }

    // Clean up empty data / empty labels (PROMPT 44 & 45 Protection)
    const trimmed = text.trim();
    const isTrailingLabelOnly = /^[\w\s\/\\&-]+\s*[:：\-]\s*$/i.test(trimmed);
    if (!trimmed || isTrailingLabelOnly) {
      return { ...textLayer, text: '', hidden: true };
    }

    return { ...textLayer, text, hidden: false };
  }

  if (layer.type === 'barcode') {
    const b = layer as BarcodeLayer;
    if (binding === 'LICENCE_NUMBER' || /\{\{(?:licence_number|license_number|licence_no|license_no|licence|license|dl_no)\}\}/i.test(b.data) || /licence|license|dl_barcode|barcode_dl/i.test(layer.id) || /licence|license/i.test(layer.name)) {
      const val = ((formData as any).licenceNumber || (formData as any).licenseNumber || formData.nidaNumber || '').trim();
      return { ...b, data: val };
    }
    if (binding === 'NIDA_NUMBER' || /\{\{(?:id_number|nida_number|nida)\}\}/i.test(b.data) || /nida|id_no|barcode_nida/i.test(layer.id)) {
      const val = (formData.nidaNumber || (formData as any).licenceNumber || '').replace(/-/g, '');
      return { ...b, data: val };
    }
    if (binding === 'CARD_NO' || /\{\{(?:card_no|card_number|cardno|cardnumber)\}\}/i.test(b.data) || /nhif|card_no|barcode_nhif/i.test(layer.id)) {
      const val = ((formData as any).cardNumber || (formData as any).card_no || '').replace(/-/g, '');
      return { ...b, data: val };
    }
    if (b.data && b.data.includes('{{')) {
      const replaced = replaceTextTokens(b.data, formData);
      return { ...b, data: replaced };
    }
    return b;
  }

  if (layer.type === 'qrcode') {
    const q = layer as QRCodeLayer;
    if (binding === 'LICENCE_NUMBER' || /\{\{(?:licence_number|license_number|licence_no|license_no|licence|license|dl_no)\}\}/i.test(q.data) || /licence|license|dl_qr|qr_dl/i.test(layer.id) || /licence|license/i.test(layer.name)) {
      const val = ((formData as any).licenceNumber || (formData as any).licenseNumber || formData.nidaNumber || '').trim();
      return { ...q, data: val };
    }
    if (binding === 'NIDA_NUMBER' || /\{\{(?:id_number|nida_number|nida)\}\}/i.test(q.data) || /qr_nida/i.test(layer.id)) {
      const val = formData.nidaNumber || (formData as any).licenceNumber || '';
      return { ...q, data: val };
    }
    if (binding === 'CARD_NO' || /\{\{(?:card_no|card_number|cardno|cardnumber)\}\}/i.test(q.data) || /nhif|card_no|qr_nhif/i.test(layer.id)) {
      const val = (formData as any).cardNumber || (formData as any).card_no || '';
      return { ...q, data: val };
    }
    if (q.data && q.data.includes('{{')) {
      const replaced = replaceTextTokens(q.data, formData);
      return { ...q, data: replaced };
    }
    return q;
  }

  return layer;
}

/**
 * Validates the populated template to prevent cross-contamination errors before generating the card.
 */
/**
 * Formats Driving Licence categories for front card rendering:
 * - Selected categories rendered as a continuous list with a single normal space between each selected category.
 * - Ignore all unselected categories completely.
 * - Spacing must be based only on selected categories.
 * - Exactly one space between displayed categories.
 * - Do not insert commas.
 * - Do not reserve gaps for unchecked categories.
 * - Do not stretch spacing based on missing categories.
 * Formats front-side categories of vehicles continuous display.
 * Displays only selected categories separated by exactly TWO spaces.
 * Does not insert commas.
 * Does not reserve gaps for unselected categories.
 *
 * Examples:
 *   Selected: A, G -> "A  G"
 *   Selected: A, B, D, E, G -> "A  B  D  E  G"
 *   Selected: C1, C3 -> "C1  C3"
 */
export function formatDrivingLicenceCategoriesFront(classes: any, separator: string = '  '): string {
  if (!classes) return '';
  const selectedCodes: string[] = [];

  if (Array.isArray(classes)) {
    classes.forEach((c: any) => {
      if (!c) return;
      if (typeof c === 'string') {
        const trimmed = c.trim();
        if (trimmed) selectedCodes.push(trimmed);
      } else if (typeof c === 'object' && c.enabled && c.classCode) {
        const trimmed = String(c.classCode).trim();
        if (trimmed) selectedCodes.push(trimmed);
      }
    });
  } else if (typeof classes === 'string') {
    classes
      .split(/[\s,;/]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((code) => selectedCodes.push(code));
  }

  // Deduplicate while strictly preserving order
  const uniqueCodes = Array.from(new Set(selectedCodes));
  // Continuous list with exactly TWO spaces between each selected category, no commas, no reserved gaps
  return uniqueCodes.join('  ').trim();
}

export function formatDrivingLicenceCategoriesBack(
  classes: any[],
  defaultIssueDate?: string,
  defaultExpiryDate?: string
): string {
  const ALL_CLASS_CODES = ['A', 'A1', 'A2', 'A3', 'B', 'C', 'C1', 'C2', 'C3', 'D', 'E', 'F', 'G'];
  const classMap = new Map<string, any>();
  if (Array.isArray(classes)) {
    classes.forEach((c: any) => {
      if (c && c.classCode) {
        classMap.set(String(c.classCode).trim().toUpperCase(), c);
      }
    });
  }

  const lines: string[] = [];
  ALL_CLASS_CODES.forEach((code) => {
    const item = classMap.get(code);
    const isEnabled = !!(item && (item.enabled === true || item.enabled === 1 || item.selected === true || item.checked === true));

    if (isEnabled) {
      const rawIssue = item?.issueDate || defaultIssueDate;
      const rawExpiry = item?.expiryDate || defaultExpiryDate;
      
      const issueStr = (rawIssue && rawIssue.trim() !== '') ? formatToDdMmYyyy(rawIssue) : '';
      const expiryStr = (rawExpiry && rawExpiry.trim() !== '') ? formatToDdMmYyyy(rawExpiry) : '';

      if (issueStr !== '' && expiryStr !== '') {
        const paddedIssue = issueStr.padEnd(16, ' ');
        lines.push(`${paddedIssue}${expiryStr}`.trimEnd());
      }
    }
  });

  return lines.join('\n');
}

export function validatePopulatedTemplate(
  layers: Layer[],
  formData: NidaFormData,
  isBackSide: boolean = false
): { valid: boolean; error?: string; warnings: string[] } {
  const warnings: string[] = [];

  if (isBackSide) {
    return { valid: true, warnings };
  }

  const firstName = (formData.firstName || '').trim().toUpperCase();
  const lastName = (formData.lastName || '').trim().toUpperCase();
  const dob = (formData.dob || '').trim();
  const gender = (formData.gender || '').trim().toUpperCase().startsWith('M') ? 'M' : 'F';

  let injectedLastName: string | null = null;
  let injectedDob: string | null = null;
  let injectedGender: string | null = null;
  let injectedLicenceNumber: string | null = null;
  const licenceNumber = ((formData as any).licenceNumber || formData.nidaNumber || '').trim().toUpperCase();

  for (const layer of layers) {
    const binding = getLayerBinding(layer, layers);
    if (layer.type === 'text') {
      const text = (layer as TextLayer).text.toUpperCase();

      if (binding === 'LAST_NAME') {
        injectedLastName = text;
      } else if (binding === 'DOB') {
        injectedDob = text;
      } else if (binding === 'GENDER') {
        injectedGender = text;
      } else if (binding === 'LICENCE_NUMBER' || binding === 'NIDA_NUMBER') {
        injectedLicenceNumber = text;
      }
    }
  }

  // Cross-field collision checks
  if (firstName && lastName && firstName !== lastName && injectedLastName) {
    if (injectedLastName.endsWith(firstName) || (injectedLastName.includes(firstName) && !injectedLastName.includes(lastName))) {
      return {
        valid: false,
        error: `Field Mapping Validation Error: First Name ('${firstName}') was incorrectly injected into Last Name field ('${injectedLastName}'). Expected '${lastName}'.`,
        warnings: [`Last Name layer received '${injectedLastName}' instead of '${lastName}'`],
      };
    }
  }

  if (firstName && dob && firstName !== dob && injectedDob) {
    if (injectedDob.endsWith(firstName) || injectedDob.includes(firstName)) {
      return {
        valid: false,
        error: `Field Mapping Validation Error: First Name ('${firstName}') was incorrectly injected into Date of Birth field ('${injectedDob}'). Expected '${dob}'.`,
        warnings: [`DOB layer received '${injectedDob}' instead of '${dob}'`],
      };
    }
  }


  if (firstName && licenceNumber && firstName !== licenceNumber && injectedLicenceNumber) {
    if (injectedLicenceNumber.includes(firstName)) {
      return {
        valid: false,
        error: `Field Mapping Validation Error: First Name ('${firstName}') was incorrectly injected into Licence Number field ('${injectedLicenceNumber}'). Expected '${licenceNumber}'.`,
        warnings: [`Licence Number layer received '${injectedLicenceNumber}' instead of '${licenceNumber}'`],
      };
    }
  }

  if (firstName && gender && firstName !== gender && injectedGender) {
    if (injectedGender.endsWith(firstName) || injectedGender.includes(firstName)) {
      return {
        valid: false,
        error: `Field Mapping Validation Error: First Name ('${firstName}') was incorrectly injected into Gender field ('${injectedGender}'). Expected '${gender}'.`,
        warnings: [`Gender layer received '${injectedGender}' instead of '${gender}'`],
      };
    }
  }

  return { valid: true, warnings };
}

/**
 * Plans mapping between template and form data without mutating the template.
 */
export function planTemplateMapping(template: CardTemplate, formData: Partial<NidaFormData>): MappingPlan {
  const sanitizedTemplate = ensureTemplateFieldIds(template);
  const isBackSide = isBackSideTemplate(sanitizedTemplate);
  const matchedBindingsSet = new Set<SupportedBinding>();
  const fieldMappings: FieldMappingDetail[] = [];
  const warnings: string[] = [];

  const isDL = !!(
    sanitizedTemplate.cardType === 'Driving License' ||
    sanitizedTemplate.id?.includes('driving_license') ||
    sanitizedTemplate.templateName?.toLowerCase().includes('driving license') ||
    sanitizedTemplate.templateName?.toLowerCase().includes('driving licence') ||
    (formData as any).classes ||
    (formData as any).categories ||
    (formData as any).licenceNumber
  );

  const bindingsToCheck: SupportedBinding[] = (isBackSide && !isDL) ? ['NIDA_NUMBER'] : ALL_SUPPORTED_BINDINGS;

  for (const layer of sanitizedTemplate.layers) {
    if (layer.type === 'text') {
      const textLayer = layer as TextLayer;
      if (textLayer.licenseCategoryGroup !== undefined) {
        const classes = (formData as any).classes || (formData as any).categories || [];
        const matchedClass = classes.find((c: any) => c && c.classCode === textLayer.licenseCategoryGroup);
        const isEnabled = matchedClass && !!matchedClass.enabled;
        let dateValue = '';
        if (isEnabled) {
          const rawDate = textLayer.licenseCategoryDateType === 'expiryDate'
            ? (matchedClass.expiryDate || (formData as any).dateOfExpiry || (formData as any).expiryDate || '')
            : (matchedClass.issueDate || (formData as any).dateOfIssue || (formData as any).issueDate || '');
          dateValue = rawDate ? formatToDdMmYyyy(rawDate) : '';
        }
        fieldMappings.push({
          binding: 'CUSTOM_CATEGORY_DATE' as any,
          layerId: layer.id,
          layerName: layer.name,
          layerType: layer.type,
          originalValue: textLayer.text,
          newValue: dateValue,
        });
        continue;
      } else if (textLayer.licenseCategoriesSeparator !== undefined) {
        const classes = (formData as any).classes || (formData as any).categories || [];
        const textValue = formatDrivingLicenceCategoriesFront(classes);
        fieldMappings.push({
          binding: 'CUSTOM_CATEGORIES_LIST' as any,
          layerId: layer.id,
          layerName: layer.name,
          layerType: layer.type,
          originalValue: textLayer.text,
          newValue: textValue,
        });
        continue;
      }
    }

    const binding = getLayerBinding(layer, sanitizedTemplate.layers);
    if (binding && bindingsToCheck.includes(binding)) {
      matchedBindingsSet.add(binding);
      const formVal = getFormValueForBinding(binding, formData);

      let original = '';
      if (layer.type === 'text') original = (layer as TextLayer).text;
      else if (layer.type === 'placeholder') original = `[Placeholder: ${(layer as PlaceholderLayer).label}]`;
      else if (layer.type === 'barcode') original = (layer as BarcodeLayer).data;
      else if (layer.type === 'qrcode') original = (layer as QRCodeLayer).data;
      else if (layer.type === 'image') original = '[Image Layer]';

      fieldMappings.push({
        binding,
        layerId: layer.id,
        layerName: layer.name,
        layerType: layer.type,
        originalValue: original,
        newValue: formVal,
      });
    }
  }

  const missingBindings: MissingBindingDetail[] = [];
  for (const binding of bindingsToCheck) {
    if (!matchedBindingsSet.has(binding)) {
      const label = binding.replace(/_/g, ' ');
      missingBindings.push({
        binding,
        label,
        warning: `Placeholder for "${label}" was not found in template "${sanitizedTemplate.templateName}". Skipping this field.`,
      });
    }
  }

  return {
    templateId: sanitizedTemplate.id,
    templateName: sanitizedTemplate.templateName,
    matchedBindings: Array.from(matchedBindingsSet),
    missingBindings,
    fieldMappings,
    warnings,
  };
}

/**
 * Applies the Template Field Mapping Engine to populate card templates.
 */
export function applyTemplateMapping(template: CardTemplate, formData: NidaFormData): PopulatedTemplateResult {
  // Enforce absolute separation of Template Layout Structure and Cardholder Personal Records:
  // Sanitize the template first to ensure any embedded sample values are treated strictly as placeholders.
  const sanitizedTemplate = sanitizeTemplateForSaving(ensureTemplateFieldIds(template));
  const isBackSide = isBackSideTemplate(sanitizedTemplate);
  const plan = planTemplateMapping(sanitizedTemplate, formData);

  const clonedLayers: Layer[] = [];
  let populatedCount = 0;
  let skippedCount = 0;

  for (const layer of sanitizedTemplate.layers) {
    if (layer.type === 'text') {
      const textLayer = layer as TextLayer;
      if (textLayer.licenseCategoryGroup !== undefined) {
        const classes = (formData as any).classes || (formData as any).categories || [];
        const groupCode = String(textLayer.licenseCategoryGroup || '').trim().toUpperCase();
        const matchedClass = classes.find((c: any) => c && String(c.classCode || '').trim().toUpperCase() === groupCode);
        const isEnabled = matchedClass && !!(matchedClass.enabled || matchedClass.selected || matchedClass.checked);
        let dateValue = '';
        if (isEnabled) {
          const isExpiryType = textLayer.licenseCategoryDateType === 'expiryDate' || /exp/i.test(String(textLayer.licenseCategoryDateType || ''));
          const rawDate = isExpiryType
            ? (matchedClass.expiryDate || (formData as any).dateOfExpiry || (formData as any).expiryDate || (formData as any).date_of_expiry || '')
            : (matchedClass.issueDate || (formData as any).dateOfIssue || (formData as any).issueDate || (formData as any).date_of_issue || '');
          dateValue = rawDate ? formatToDdMmYyyy(rawDate) : '';
        }
        clonedLayers.push({
          ...textLayer,
          text: dateValue,
        });
        populatedCount++;
        continue;
      } else if (textLayer.licenseCategoriesSeparator !== undefined) {
        const classes = (formData as any).classes || (formData as any).categories || [];
        const textValue = formatDrivingLicenceCategoriesFront(classes);
        clonedLayers.push({
          ...textLayer,
          text: textValue,
          letterSpacing: 0,
        });
        populatedCount++;
        continue;
      }
    }

    const binding = getLayerBinding(layer, sanitizedTemplate.layers);

    if (binding) {
      const injected = injectValueIntoLayer(layer, binding, formData, sanitizedTemplate.layers);
      clonedLayers.push(injected);
      populatedCount++;
    } else {
      // Unbound layers should simply be left alone, or just have strict token replacement.
      // We will perform a generic token replacement for known placeholders just in case,
      // without doing destructive fallback overrides.
      const injected = replaceAllTokens(layer, formData);
      clonedLayers.push(injected);
      skippedCount++;
    }
  }

  // Run validation pass before returning
  const validation = validatePopulatedTemplate(clonedLayers, formData, isBackSide);

  const populatedTemplate: CardTemplate = {
    ...sanitizedTemplate,
    layers: clonedLayers,
    updatedAt: new Date().toISOString(),
  };

  return {
    success: validation.valid,
    populatedTemplate,
    plan,
    populatedCount,
    skippedCount,
    warnings: [...plan.warnings, ...validation.warnings],
    error: validation.error,
    isBackSide,
  };
}

/**
 * Legacy text token replacement helper
 */
export function replaceTextTokens(text: string, formData: NidaFormData): string {
  let result = text;
  const fVal = (formData.firstName || '').trim();
  const mVal = (formData.middleName || '').trim();
  const lVal = (formData.lastName || '').trim();
  const displayNameLine1 = mVal ? `${fVal} ${mVal}`.trim() : fVal;

  result = result.replace(/\{\{(?:first_middle_name|first_name_middle_name|first_name_plus_middle_name|first_plus_middle_name|first_name_\+_middle_name|display_name_line1|displaynameline1|first_name_and_middle_name)\}\}/gi, displayNameLine1.toUpperCase());

  if (formData.firstName !== undefined && formData.firstName !== null) {
    const hasMiddleToken = /\{\{(?:middle_name|middlename|other_names|othernames|mname)\}\}/i.test(text);
    const valForFirstName = (hasMiddleToken || !mVal) ? fVal : displayNameLine1;
    result = result.replace(/\{\{(?:first_name|firstname|given_name|given_names|fname)\}\}/gi, valForFirstName.toUpperCase());
  }
  if (formData.middleName !== undefined && formData.middleName !== null) {
    if (mVal) {
      result = result.replace(/\{\{(?:middle_name|middlename|other_names|othernames|mname)\}\}/gi, mVal.toUpperCase());
    } else {
      result = result.replace(/\s*\{\{(?:middle_name|middlename|other_names|othernames|mname)\}\}/gi, '');
    }
  } else {
    result = result.replace(/\s*\{\{(?:middle_name|middlename|other_names|othernames|mname)\}\}/gi, '');
  }
  if (formData.lastName !== undefined && formData.lastName !== null) {
    result = result.replace(/\{\{(?:last_name|lastname|surname|family_name|lname)\}\}/gi, lVal.toUpperCase());
  }
  if (formData.dob) {
    result = result.replace(/\{\{(?:dob|date_of_birth|birth_date|birthdate)\}\}/gi, formData.dob);
  }
  if (formData.gender) {
    const g = formData.gender.trim().toUpperCase().startsWith('M') ? 'M' : 'F';
    result = result.replace(/\{\{(?:gender|sex|jinsia|jinsi|gender_val|sex_val|jinsi_val)\}\}/gi, g);
  }
  if (formData.nidaNumber) {
    result = result.replace(/\{\{(?:nida_number|nida|id_number|national_id|nin|id_no|namba_nida)\}\}/gi, formData.nidaNumber);
  }

  const licenceNo = ((formData as any).licenceNumber || (formData as any).licenseNumber || formData.nidaNumber || '').trim();
  if (licenceNo) {
    result = result.replace(/\{\{(?:licence_number|license_number|licence_no|license_no|licence|license|dl_no)\}\}/gi, licenceNo);
  }

  if ((formData as any).dateOfIssue || (formData as any).issueDate) {
    const rawIssue = ((formData as any).dateOfIssue || (formData as any).issueDate || '').trim();
    result = result.replace(/\{\{(?:issue_date|date_of_issue|issued_date|valid_from|date_issued)\}\}/gi, formatToDdMmYyyy(rawIssue));
  }

  if ((formData as any).dateOfExpiry || (formData as any).expiryDate) {
    const rawExpiry = ((formData as any).dateOfExpiry || (formData as any).expiryDate || '').trim();
    result = result.replace(/\{\{(?:expiry_date|date_of_expiry|expirydate|valid_to|valid_until|date_expired)\}\}/gi, formatToDdMmYyyy(rawExpiry));
  }

  if ((formData as any).issuingAuthority) {
    result = result.replace(/\{\{(?:issuing_authority|authority)\}\}/gi, (formData as any).issuingAuthority);
  }

  if ((formData as any).region) {
    result = result.replace(/\{\{(?:region|residence|place_of_residence)\}\}/gi, (formData as any).region);
  }

  if ((formData as any).pinNumber) {
    result = result.replace(/\{\{(?:pin_number|pin)\}\}/gi, (formData as any).pinNumber);
  }

  const rawClasses = (formData as any).classes || (formData as any).categories;
  if (rawClasses) {
    if (result.includes('{{categories_field9}}') || result.includes('{{field_9}}') || result.includes('{{categories_of_vehicles}}') || result.includes('{{categories}}') || result.includes('{{classes_front}}')) {
      result = result.replace(/\{\{(?:categories_field9|field_9|categories_of_vehicles|categories|classes_front)\}\}/gi, formatDrivingLicenceCategoriesFront(rawClasses));
    }
    if (result.includes('{{driving_licence_categories}}') || result.includes('{{classes_table}}') || result.includes('{{classes_list}}') || result.includes('{{categories_table}}') || result.includes('{{categories_back}}')) {
      result = result.replace(
        /\{\{(?:driving_licence_categories|classes_table|classes_list|categories_table|categories_back)\}\}/gi,
        formatDrivingLicenceCategoriesBack(
          rawClasses,
          (formData as any).dateOfIssue || (formData as any).issueDate,
          (formData as any).dateOfExpiry || (formData as any).expiryDate
        )
      );
    }

    // Individual category token replacements (e.g. {{class_c_issue}}, {{class_c_expiry}}, {{class_e_issue}}, {{class_e_expiry}})
    if (Array.isArray(rawClasses)) {
      const ALL_CODES = ['A', 'A1', 'A2', 'A3', 'B', 'C', 'C1', 'C2', 'C3', 'D', 'E', 'F', 'G'];
      ALL_CODES.forEach((code) => {
        const lowerCode = code.toLowerCase();
        const found = rawClasses.find((c: any) => c && String(c.classCode || '').trim().toUpperCase() === code);
        const isEnabled = !!(found && (found.enabled || found.selected || found.checked));
        const issueStr = isEnabled ? formatToDdMmYyyy(found?.issueDate || (formData as any).dateOfIssue || (formData as any).issueDate || (formData as any).date_of_issue || '') : '';
        const expiryStr = isEnabled ? formatToDdMmYyyy(found?.expiryDate || (formData as any).dateOfExpiry || (formData as any).expiryDate || (formData as any).date_of_expiry || '') : '';

        const issuePattern = new RegExp(`\\{\\{(?:class_${lowerCode}_issue|category_${lowerCode}_issue|cat_${lowerCode}_issue|${lowerCode}_issue|issue_${lowerCode}|issue_date_${lowerCode}|${lowerCode}_issue_date)\\}\\}`, 'gi');
        const expiryPattern = new RegExp(`\\{\\{(?:class_${lowerCode}_expiry|category_${lowerCode}_expiry|cat_${lowerCode}_expiry|${lowerCode}_expiry|expiry_${lowerCode}|expiry_date_${lowerCode}|${lowerCode}_expiry_date)\\}\\}`, 'gi');

        result = result.replace(issuePattern, issueStr);
        result = result.replace(expiryPattern, expiryStr);
      });
    }
  }

  return result;
}

export function replaceGenderInText(text: string, targetGender: 'M' | 'F'): string {
  if (text.includes('{{')) {
    return text.replace(/\{\{(?:gender|sex|jinsia|jinsi|gender_val|sex_val|jinsi_val)\}\}/gi, targetGender);
  }
  return targetGender;
}

export function isGenderLabelLayer(layer: Layer): boolean {
  if (layer.type !== 'text') return false;
  const text = ((layer as TextLayer).text || '').trim();
  if (text.includes('{{') || /:\s*[A-Za-z0-9]/.test(text)) return false;
  return /^(?:sex|jinsi|jinsia|gender|sex\s*[\/\\]\s*jinsi[a]?|jinsi[a]?\s*[\/\\]\s*sex|gender\s*[\/\\]\s*sex|sex\s*[\/\\]\s*gender)\s*[:：\-]?$/i.test(text) ||
    /lbl[_\s-]?gender|lbl[_\s-]?sex|lbl[_\s-]?jinsi/i.test(layer.id) ||
    /lbl[_\s-]?gender|lbl[_\s-]?sex|lbl[_\s-]?jinsi/i.test(layer.name);
}

export function isGenderValueLayer(layer: Layer, allLayers: Layer[] = []): boolean {
  return getLayerBinding(layer, allLayers) === 'GENDER';
}

/**
 * Strips any personal/cardholder data from template layers and replaces them with standard temporary placeholder tokens.
 * Separation of Template Structure and Cardholder data is strictly enforced.
 */
export function sanitizeTemplateForSaving(template: CardTemplate): CardTemplate {
  if (!template || !Array.isArray(template.layers)) return template;

  const sanitizedLayers = template.layers.map((layer) => {
    const binding = getLayerBinding(layer, template.layers);
    if (!binding) return { ...layer };

    if (layer.type === 'text') {
      const textLayer = layer as TextLayer;
      let text = textLayer.text || '';

      // Non-destructive sanitization: preserve prefixes and case indicators of placeholders
      switch (binding) {
        case 'FIRST_MIDDLE_NAME': {
          const isUpper = text.includes('{{FIRST_MIDDLE_NAME') || text === text.toUpperCase();
          const placeholder = isUpper ? '{{FIRST_MIDDLE_NAME}}' : '{{first_middle_name}}';
          if (/^(?:first\s*and\s*middle\s*name|first\s*\+\s*middle\s*name|first\s*&\s*middle\s*name)\s*[:：\-]?\s*/i.test(text)) {
            text = text.replace(/^(?:first\s*and\s*middle\s*name|first\s*\+\s*middle\s*name|first\s*&\s*middle\s*name)\s*[:：\-]?\s*.*/i, `FIRST & MIDDLE NAME: ${placeholder}`);
          } else if (text.includes('{{')) {
            // Keep original placeholder token as is
          } else {
            text = placeholder;
          }
          break;
        }
        case 'FIRST_NAME': {
          const isUpper = text.includes('{{FIRST_NAME') || text.includes('{{FIRSTNAME') || text === text.toUpperCase();
          const placeholder = isUpper ? '{{FIRST_NAME}}' : '{{first_name}}';
          if (/^(?:jina|given\s*name)\s*[:：\-]?\s*/i.test(text)) {
            text = text.replace(/^(?:jina|given\s*name)\s*[:：\-]?\s*.*/i, `JINA : ${placeholder}`);
          } else if (text.includes('{{')) {
            // Keep original placeholder token as is
          } else {
            text = placeholder;
          }
          break;
        }
        case 'MIDDLE_NAME': {
          const isUpper = text.includes('{{MIDDLE_NAME') || text.includes('{{MNAME') || text === text.toUpperCase();
          const placeholder = isUpper ? '{{MIDDLE_NAME}}' : '{{middle_name}}';
          if (/^(?:middle\s*name|la\s+kati)\s*[:：\-]?\s*/i.test(text)) {
            text = text.replace(/^(?:middle\s*name|la\s+kati)\s*[:：\-]?\s*.*/i, `MIDDLE NAME : ${placeholder}`);
          } else if (text.includes('{{')) {
            // Keep as is
          } else {
            text = placeholder;
          }
          break;
        }
        case 'LAST_NAME': {
          const isUpper = text.includes('{{LAST_NAME') || text.includes('{{SURNAME') || text === text.toUpperCase();
          const placeholder = isUpper ? '{{LAST_NAME}}' : '{{last_name}}';
          if (/^(?:jina\s+la\s+(?:mwisho|ukoo)|surname|last\s*name)\s*[:：\-]?\s*/i.test(text)) {
            text = text.replace(/^(?:jina\s+la\s+(?:mwisho|ukoo)|surname|last\s*name)\s*[:：\-]?\s*.*/i, `JINA LA MWISHO : ${placeholder}`);
          } else if (text.includes('{{')) {
            // Keep as is
          } else {
            text = placeholder;
          }
          break;
        }
        case 'DOB': {
          const isUpper = text.includes('{{DOB') || text.includes('{{DATE') || text === text.toUpperCase();
          const placeholder = isUpper ? '{{DOB}}' : '{{dob}}';
          if (/^(?:tarehe\s+ya\s+kuzaliwa|date\s+of\s+birth|dob)\s*[:：\-]?\s*/i.test(text)) {
            text = text.replace(/^(?:tarehe\s+ya\s+kuzaliwa|date\s+of\s+birth|dob)\s*[:：\-]?\s*.*/i, `TAREHE YA KUZALIWA: ${placeholder}`);
          } else if (text.includes('{{')) {
            // Keep as is
          } else {
            text = placeholder;
          }
          break;
        }
        case 'GENDER': {
          const isUpper = text.includes('{{GENDER') || text.includes('{{SEX') || text === text.toUpperCase();
          const placeholder = isUpper ? '{{GENDER}}' : '{{gender}}';
          if (/^(?:jinsi|jinsia|sex|gender)\s*[:：\-]?\s*/i.test(text)) {
            text = text.replace(/^(?:jinsi|jinsia|sex|gender)\s*[:：\-]?\s*.*/i, `JINSI : ${placeholder}`);
          } else if (text.includes('{{')) {
            // Keep as is
          } else {
            text = placeholder;
          }
          break;
        }
        case 'NIDA_NUMBER': {
          const isUpper = text.includes('{{NIDA_NUMBER') || text.includes('{{NIN') || text === text.toUpperCase();
          const placeholder = isUpper ? '{{NIDA_NUMBER}}' : '{{nida_number}}';
          if (/^(?:national\s*id\s*no|nambari\s*ya\s*nida|nida\s*no)\s*[:：\-]?\s*/i.test(text)) {
            text = text.replace(/^(?:national\s*id\s*no|nambari\s*ya\s*nida|nida\s*no)\s*[:：\-]?\s*.*/i, `NATIONAL ID NO: ${placeholder}`);
          } else if (text.includes('{{')) {
            // Keep as is
          } else {
            text = placeholder;
          }
          break;
        }
        case 'LICENCE_NUMBER': {
          const isUpper = text.includes('{{LICENCE_NUMBER') || text.includes('{{LICENSE_NUMBER') || text === text.toUpperCase();
          const placeholder = isUpper ? '{{LICENCE_NUMBER}}' : '{{licence_number}}';
          if (text.includes('{{')) {
            // Keep original placeholder token
          } else {
            text = placeholder;
          }
          break;
        }
        case 'PIN_NUMBER': {
          const isUpper = text.includes('{{PIN_NUMBER') || text.includes('{{PIN') || text === text.toUpperCase();
          const placeholder = isUpper ? '{{PIN_NUMBER}}' : '{{pin_number}}';
          if (text.includes('{{')) {
            // Keep original placeholder token
          } else {
            text = placeholder;
          }
          break;
        }
        case 'ISSUE_DATE': {
          const isUpper = text.includes('{{ISSUE_DATE') || text.includes('{{DATE_OF_ISSUE') || text === text.toUpperCase();
          const placeholder = isUpper ? '{{ISSUE_DATE}}' : '{{issue_date}}';
          if (text.includes('{{')) {
            // Keep original placeholder token
          } else {
            text = placeholder;
          }
          break;
        }
        case 'EXPIRY_DATE': {
          const isUpper = text.includes('{{EXPIRY_DATE') || text.includes('{{DATE_OF_EXPIRY') || text === text.toUpperCase();
          const placeholder = isUpper ? '{{EXPIRY_DATE}}' : '{{expiry_date}}';
          if (text.includes('{{')) {
            // Keep original placeholder token
          } else {
            text = placeholder;
          }
          break;
        }
        case 'ISSUING_AUTHORITY': {
          const isUpper = text.includes('{{ISSUING_AUTHORITY') || text === text.toUpperCase();
          const placeholder = isUpper ? '{{ISSUING_AUTHORITY}}' : '{{issuing_authority}}';
          if (text.includes('{{')) {
            // Keep as is
          } else {
            text = placeholder;
          }
          break;
        }
        case 'REGION': {
          const isUpper = text.includes('{{REGION') || text === text.toUpperCase();
          const placeholder = isUpper ? '{{REGION}}' : '{{region}}';
          if (text.includes('{{')) {
            // Keep as is
          } else {
            text = placeholder;
          }
          break;
        }
        case 'CATEGORIES_FIELD9': {
          const isUpper = text.includes('{{CATEGORIES') || text === text.toUpperCase();
          const placeholder = isUpper ? '{{CATEGORIES_FIELD9}}' : '{{categories_field9}}';
          if (text.includes('{{')) {
            // Keep original
          } else {
            text = placeholder;
          }
          break;
        }
        case 'DRIVING_LICENCE_CATEGORIES':
        case 'CLASSES_TABLE': {
          const isUpper = text.includes('{{DRIVING_LICENCE_CATEGORIES') || text === text.toUpperCase();
          const placeholder = isUpper ? '{{DRIVING_LICENCE_CATEGORIES}}' : '{{driving_licence_categories}}';
          if (text.includes('{{')) {
            // Keep original
          } else {
            text = placeholder;
          }
          break;
        }
      }

      // Check if it's a Group Category Date element or a Licence Categories List
      if (textLayer.licenseCategoryGroup !== undefined) {
        text = textLayer.licenseCategoryDateType === 'expiryDate' ? '{{expiry_date}}' : '{{issue_date}}';
      } else if (textLayer.licenseCategoriesSeparator !== undefined) {
        text = '{{categories_field9}}';
      }

      return {
        ...textLayer,
        text,
      };
    }

    if (binding === 'PHOTO') {
      if (layer.type === 'image' || layer.type === 'placeholder') {
        const imgLayer = layer as any;
        return {
          ...imgLayer,
          type: 'placeholder',
          placeholderKey: 'photo',
          placeholderType: 'photo',
          label: 'Cardholder Photograph',
          src: undefined,
        } as any;
      }
    }

    if (binding === 'SIGNATURE') {
      if (layer.type === 'image' || layer.type === 'placeholder') {
        const imgLayer = layer as any;
        return {
          ...imgLayer,
          type: 'placeholder',
          placeholderKey: 'signature',
          placeholderType: 'signature',
          label: 'Cardholder Signature',
          src: undefined,
        } as any;
      }
    }

    if (layer.type === 'barcode' && binding === 'NIDA_NUMBER') {
      const b = layer as BarcodeLayer;
      return { ...b, data: '12345678901234567890' };
    }

    if (layer.type === 'qrcode' && binding === 'NIDA_NUMBER') {
      const q = layer as QRCodeLayer;
      return { ...q, data: '12345678901234567890' };
    }

    return { ...layer };
  });

  return {
    ...template,
    layers: sanitizedLayers,
    updatedAt: new Date().toISOString(),
  };
}

export interface ValidationIssue {
  layerId: string;
  layerName: string;
  layerType: string;
  variable: string; // The token found, e.g. "{{nationality}}"
  type: 'error' | 'warning';
  message: string;
  suggestedFix?: string;
  suggestedReplacement?: string; // What valid token we recommend using
}

const RECOGNIZED_TOKENS = new Set([
  'first_name', 'firstname', 'given_name', 'given_names', 'fname',
  'middle_name', 'middlename', 'other_names', 'othernames', 'mname',
  'last_name', 'lastname', 'surname', 'family_name', 'lname',
  'dob', 'date_of_birth', 'birth_date', 'birthdate',
  'gender', 'sex', 'jinsia', 'jinsi', 'gender_val', 'sex_val', 'jinsi_val',
  'nida_number', 'nida', 'id_number', 'national_id', 'nin', 'id_no', 'namba_nida'
]);

function getEditDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

export function getClosestSupportedToken(token: string): string | undefined {
  const lowerToken = token.toLowerCase().trim();
  
  // Smart mappings
  if (lowerToken.includes('first')) return '{{first_name}}';
  if (lowerToken.includes('last')) return '{{last_name}}';
  if (lowerToken.includes('mid')) return '{{middle_name}}';
  if (lowerToken.includes('birth') || lowerToken.includes('date') || lowerToken === 'dob') return '{{dob}}';
  if (lowerToken.includes('gen') || lowerToken.includes('sex') || lowerToken.includes('jin')) return '{{gender}}';
  if (lowerToken.includes('nida') || lowerToken.includes('nin') || lowerToken.includes('num') || lowerToken.includes('id_')) return '{{nida_number}}';
  
  const cleanDefaults = [
    'first_name',
    'middle_name',
    'last_name',
    'dob',
    'gender',
    'nida_number',
  ];
  
  let bestDist = 999;
  let bestMatch: string | undefined = undefined;
  
  for (const candidate of cleanDefaults) {
    const dist = getEditDistance(lowerToken, candidate);
    if (dist < bestDist && dist <= 4) {
      bestDist = dist;
      bestMatch = `{{${candidate}}}`;
    }
  }
  
  return bestMatch;
}

/**
 * Scans the template layers and identifies validation issues like unmapped variables,
 * unbound containers, and static barcodes to ensure render-time integrity.
 */
export function getTemplateValidationIssues(template: CardTemplate): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!template || !Array.isArray(template.layers)) return issues;

  template.layers.forEach((layer) => {
    // 1. Text Layers Variable Extraction & Check
    if (layer.type === 'text') {
      const textLayer = layer as TextLayer;
      const text = textLayer.text || '';
      
      const variableRegex = /\{\{([^}]+)\}\}/g;
      let match;
      
      while ((match = variableRegex.exec(text)) !== null) {
        const fullToken = match[0];
        const rawVar = match[1].trim();
        
        if (!RECOGNIZED_TOKENS.has(rawVar.toLowerCase())) {
          const suggestion = getClosestSupportedToken(rawVar);
          issues.push({
            layerId: layer.id,
            layerName: layer.name,
            layerType: 'text',
            variable: fullToken,
            type: 'error',
            message: `Variable '${fullToken}' is unbound and won't be resolved at render time.`,
            suggestedFix: suggestion 
              ? `Correct spelling or use standard NIDA variable: '${suggestion}'`
              : 'Replace this with a supported NIDA dynamic field (First Name, Last Name, DOB, etc.).',
            suggestedReplacement: suggestion,
          });
        }
      }
    }

    // 2. Barcode & QR Code Dynamic Linkage Checks
    if (layer.type === 'barcode' || layer.type === 'qrcode') {
      const binding = getLayerBinding(layer, template.layers);
      if (!binding) {
        const payload = layer.type === 'barcode' ? (layer as BarcodeLayer).data : (layer as QRCodeLayer).data;
        const hasBraces = payload?.includes('{{');
        
        if (hasBraces) {
          // Has variable braces but they don't resolve to a binding
          const variableRegex = /\{\{([^}]+)\}\}/g;
          const match = variableRegex.exec(payload || '');
          const fullToken = match ? match[0] : '{{variable}}';
          issues.push({
            layerId: layer.id,
            layerName: layer.name,
            layerType: layer.type,
            variable: fullToken,
            type: 'error',
            message: `Variable '${fullToken}' inside ${layer.type === 'barcode' ? 'Barcode' : 'QR Code'} payload is unbound.`,
            suggestedFix: `Use standard dynamic variable '{{nida_number}}' to bind it to the cardholder ID.`,
            suggestedReplacement: '{{nida_number}}',
          });
        } else {
          // Completely static
          issues.push({
            layerId: layer.id,
            layerName: layer.name,
            layerType: layer.type,
            variable: 'STATIC_PAYLOAD',
            type: 'warning',
            message: `${layer.type === 'barcode' ? 'Barcode' : 'QR Code'} has a static payload and won't change per-cardholder.`,
            suggestedFix: `Insert '{{nida_number}}' to dynamically link it to the identity's NIDA Number.`,
            suggestedReplacement: '{{nida_number}}',
          });
        }
      }
    }

    // 3. Image/Placeholder Containers meant for Photo / Signature but unbound
    if (layer.type === 'placeholder' || layer.type === 'image') {
      const idLower = layer.id.toLowerCase();
      const nameLower = layer.name.toLowerCase();
      const isPhotoLike = idLower.includes('photo') || idLower.includes('portrait') || idLower.includes('avatar') || nameLower.includes('photo') || nameLower.includes('portrait');
      const isSigLike = idLower.includes('sig') || idLower.includes('signature') || nameLower.includes('sig') || nameLower.includes('signature');
      
      const binding = getLayerBinding(layer, template.layers);
      if ((isPhotoLike || isSigLike) && !binding) {
        issues.push({
          layerId: layer.id,
          layerName: layer.name,
          layerType: layer.type,
          variable: isPhotoLike ? 'PHOTO' : 'SIGNATURE',
          type: 'warning',
          message: `Container meant for ${isPhotoLike ? 'Photo' : 'Signature'} is missing a valid data binding.`,
          suggestedFix: `Rename this layer name or ID to include '${isPhotoLike ? 'photo' : 'signature'}' to auto-bind it.`,
        });
      }
    }
  });

  return issues;
}
