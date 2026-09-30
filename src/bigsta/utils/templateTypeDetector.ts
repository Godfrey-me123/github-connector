import { CardTemplate } from '../types';

export type DetectedTemplateType =
  | 'NIDA'
  | 'Driving License'
  | 'Passport'
  | 'Birth Certificate'
  | 'Business License'
  | 'Generic ID';

export type SupportedBindingKey =
  | 'FIRST_NAME'
  | 'MIDDLE_NAME'
  | 'LAST_NAME'
  | 'DOB'
  | 'GENDER'
  | 'NIDA_NUMBER'
  | 'PHOTO'
  | 'SIGNATURE'
  | 'CUSTOM'
  | 'FIRST_MIDDLE_NAME'
  | 'CATEGORIES_FIELD9'
  | 'DRIVING_LICENCE_CATEGORIES'
  | 'CLASSES_TABLE'
  | 'ISSUE_DATE'
  | 'EXPIRY_DATE';

export interface TemplateFieldRequirement {
  bindingKey: SupportedBindingKey;
  label: string;
  fieldKey: string;
  type: 'text' | 'date' | 'select' | 'photo' | 'signature';
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
}

export interface TemplateTypeProfile {
  type: DetectedTemplateType;
  title: string;
  description: string;
  badgeColor: string;
  fields: TemplateFieldRequirement[];
}

/**
 * Registry of template types and their dynamically required fields
 */
export const TEMPLATE_TYPE_PROFILES: Record<DetectedTemplateType, TemplateTypeProfile> = {
  NIDA: {
    type: 'NIDA',
    title: 'NIDA National ID',
    description: 'National Identification Authority - Citizen & Resident Registration',
    badgeColor: '#47A5FF',
    fields: [
      {
        bindingKey: 'FIRST_NAME',
        fieldKey: 'firstName',
        label: 'First Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Juma',
        description: 'First or given name as registered',
      },
      {
        bindingKey: 'MIDDLE_NAME',
        fieldKey: 'middleName',
        label: 'Middle Name',
        type: 'text',
        required: false,
        placeholder: 'e.g. Ali',
        description: 'Second or patronymic name',
      },
      {
        bindingKey: 'LAST_NAME',
        fieldKey: 'lastName',
        label: 'Last Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Mwangi',
        description: 'Family or surname',
      },
      {
        bindingKey: 'DOB',
        fieldKey: 'dob',
        label: 'Date of Birth',
        type: 'date',
        required: true,
        placeholder: 'YYYY-MM-DD',
        description: 'Format: YYYY-MM-DD',
      },
      {
        bindingKey: 'GENDER',
        fieldKey: 'gender',
        label: 'Gender',
        type: 'select',
        required: true,
        options: [
          { value: 'MALE', label: 'Male (M)' },
          { value: 'FEMALE', label: 'Female (F)' },
        ],
        description: 'Gender as registered with NIDA',
      },
      {
        bindingKey: 'NIDA_NUMBER',
        fieldKey: 'nidaNumber',
        label: 'NIDA Number',
        type: 'text',
        required: true,
        placeholder: 'YYYYMMDD-XXXXX-XXXXX-XX',
        description: 'Standard 20-digit Tanzania National Identification Number',
      },
      {
        bindingKey: 'PHOTO',
        fieldKey: 'photoUrl',
        label: 'Passport Photo',
        type: 'photo',
        required: false,
        description: 'Compliant 35×45mm passport ratio portrait',
      },
      {
        bindingKey: 'SIGNATURE',
        fieldKey: 'signatureUrl',
        label: 'Specimen Signature',
        type: 'signature',
        required: false,
        description: 'Digital or drawn specimen signature',
      },
    ],
  },
  'Driving License': {
    type: 'Driving License',
    title: 'Driving License',
    description: 'Motor Vehicle Driving Permit & Endorsements',
    badgeColor: '#10B981',
    fields: [
      {
        bindingKey: 'FIRST_NAME',
        fieldKey: 'firstName',
        label: 'First Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. David',
      },
      {
        bindingKey: 'MIDDLE_NAME',
        fieldKey: 'middleName',
        label: 'Middle Name',
        type: 'text',
        required: false,
        placeholder: 'e.g. Peter',
      },
      {
        bindingKey: 'LAST_NAME',
        fieldKey: 'lastName',
        label: 'Last Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Kimaro',
      },
      {
        bindingKey: 'DOB',
        fieldKey: 'dob',
        label: 'Date of Birth',
        type: 'date',
        required: true,
      },
      {
        bindingKey: 'GENDER',
        fieldKey: 'gender',
        label: 'Gender',
        type: 'select',
        required: true,
        options: [
          { value: 'MALE', label: 'Male (M)' },
          { value: 'FEMALE', label: 'Female (F)' },
        ],
      },
      {
        bindingKey: 'NIDA_NUMBER',
        fieldKey: 'nidaNumber',
        label: 'License / ID Number',
        type: 'text',
        required: true,
        placeholder: 'e.g. DL-84729104',
      },
      {
        bindingKey: 'PHOTO',
        fieldKey: 'photoUrl',
        label: 'Driver Photo',
        type: 'photo',
        required: false,
      },
      {
        bindingKey: 'SIGNATURE',
        fieldKey: 'signatureUrl',
        label: 'Driver Signature',
        type: 'signature',
        required: false,
      },
    ],
  },
  Passport: {
    type: 'Passport',
    title: 'Passport / Travel Document',
    description: 'International Travel & Consular Document',
    badgeColor: '#8B5CF6',
    fields: [
      {
        bindingKey: 'FIRST_NAME',
        fieldKey: 'firstName',
        label: 'Given Names',
        type: 'text',
        required: true,
        placeholder: 'e.g. Amina',
      },
      {
        bindingKey: 'MIDDLE_NAME',
        fieldKey: 'middleName',
        label: 'Middle Name',
        type: 'text',
        required: false,
        placeholder: 'e.g. Said',
      },
      {
        bindingKey: 'LAST_NAME',
        fieldKey: 'lastName',
        label: 'Surname',
        type: 'text',
        required: true,
        placeholder: 'e.g. Mwinyi',
      },
      {
        bindingKey: 'DOB',
        fieldKey: 'dob',
        label: 'Date of Birth',
        type: 'date',
        required: true,
      },
      {
        bindingKey: 'GENDER',
        fieldKey: 'gender',
        label: 'Sex',
        type: 'select',
        required: true,
        options: [
          { value: 'MALE', label: 'Male (M)' },
          { value: 'FEMALE', label: 'Female (F)' },
        ],
      },
      {
        bindingKey: 'NIDA_NUMBER',
        fieldKey: 'nidaNumber',
        label: 'Passport / National ID No',
        type: 'text',
        required: true,
        placeholder: 'e.g. AB1234567',
      },
      {
        bindingKey: 'PHOTO',
        fieldKey: 'photoUrl',
        label: 'Passport Photo',
        type: 'photo',
        required: false,
      },
      {
        bindingKey: 'SIGNATURE',
        fieldKey: 'signatureUrl',
        label: 'Bearer Signature',
        type: 'signature',
        required: false,
      },
    ],
  },
  'Birth Certificate': {
    type: 'Birth Certificate',
    title: 'Birth Certificate',
    description: 'Civil Registration Record of Birth',
    badgeColor: '#F59E0B',
    fields: [
      {
        bindingKey: 'FIRST_NAME',
        fieldKey: 'firstName',
        label: 'Child First Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Baraka',
      },
      {
        bindingKey: 'MIDDLE_NAME',
        fieldKey: 'middleName',
        label: 'Middle Name',
        type: 'text',
        required: false,
        placeholder: 'e.g. Joseph',
      },
      {
        bindingKey: 'LAST_NAME',
        fieldKey: 'lastName',
        label: 'Family Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Makundi',
      },
      {
        bindingKey: 'DOB',
        fieldKey: 'dob',
        label: 'Date of Birth',
        type: 'date',
        required: true,
      },
      {
        bindingKey: 'GENDER',
        fieldKey: 'gender',
        label: 'Sex',
        type: 'select',
        required: true,
        options: [
          { value: 'MALE', label: 'Male (M)' },
          { value: 'FEMALE', label: 'Female (F)' },
        ],
      },
      {
        bindingKey: 'NIDA_NUMBER',
        fieldKey: 'nidaNumber',
        label: 'Certificate / Entry Number',
        type: 'text',
        required: true,
        placeholder: 'e.g. BC-2024-9182',
      },
    ],
  },
  'Business License': {
    type: 'Business License',
    title: 'Business License / Permit',
    description: 'Commercial Registration & Trade Authorization',
    badgeColor: '#EC4899',
    fields: [
      {
        bindingKey: 'FIRST_NAME',
        fieldKey: 'firstName',
        label: 'Owner / Representative Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Hassan',
      },
      {
        bindingKey: 'LAST_NAME',
        fieldKey: 'lastName',
        label: 'Business / Enterprise Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Safari Logistics Ltd',
      },
      {
        bindingKey: 'NIDA_NUMBER',
        fieldKey: 'nidaNumber',
        label: 'TIN / Business Reg No',
        type: 'text',
        required: true,
        placeholder: 'e.g. 104-582-991',
      },
      {
        bindingKey: 'SIGNATURE',
        fieldKey: 'signatureUrl',
        label: 'Authorized Signature',
        type: 'signature',
        required: false,
      },
    ],
  },
  'Generic ID': {
    type: 'Generic ID',
    title: 'Standard ID Card',
    description: 'General Identification Card',
    badgeColor: '#64748B',
    fields: [
      {
        bindingKey: 'FIRST_NAME',
        fieldKey: 'firstName',
        label: 'First Name',
        type: 'text',
        required: true,
      },
      {
        bindingKey: 'MIDDLE_NAME',
        fieldKey: 'middleName',
        label: 'Middle Name',
        type: 'text',
        required: false,
      },
      {
        bindingKey: 'LAST_NAME',
        fieldKey: 'lastName',
        label: 'Last Name',
        type: 'text',
        required: true,
      },
      {
        bindingKey: 'DOB',
        fieldKey: 'dob',
        label: 'Date of Birth',
        type: 'date',
        required: true,
      },
      {
        bindingKey: 'GENDER',
        fieldKey: 'gender',
        label: 'Gender',
        type: 'select',
        required: true,
        options: [
          { value: 'MALE', label: 'Male (M)' },
          { value: 'FEMALE', label: 'Female (F)' },
        ],
      },
      {
        bindingKey: 'NIDA_NUMBER',
        fieldKey: 'nidaNumber',
        label: 'ID Number',
        type: 'text',
        required: true,
      },
      {
        bindingKey: 'PHOTO',
        fieldKey: 'photoUrl',
        label: 'Photo',
        type: 'photo',
        required: false,
      },
      {
        bindingKey: 'SIGNATURE',
        fieldKey: 'signatureUrl',
        label: 'Signature',
        type: 'signature',
        required: false,
      },
    ],
  },
};

/**
 * Checks whether a template exists (either selected from available templates or created)
 */
export function isTemplateSelectedOrCreated(template: CardTemplate | null | undefined): boolean {
  if (!template) return false;

  // A template is considered created or selected if:
  // 1. It has layers (e.g. loaded sample template, saved template, or user added elements)
  const hasLayers = Array.isArray(template.layers) && template.layers.length > 0;

  // 2. OR it has an uploaded background image
  const hasImageBg = Boolean(
    template.background &&
      template.background.type === 'image' &&
      Boolean(template.background.src && template.background.src.length > 10)
  );

  // 3. OR it has a named ID from a saved or sample template (e.g. 'sample_national_id')
  const isSampleOrSaved = Boolean(
    template.id &&
      (template.id.startsWith('sample_') ||
        template.id.startsWith('template_') && template.templateName !== 'Untitled Card Template')
  );

  return hasLayers || hasImageBg || (isSampleOrSaved && template.templateName !== 'Untitled Card Template');
}

/**
 * Automatically detects the template type from a CardTemplate's metadata, name, cardType, and layer contents.
 */
export function detectTemplateType(template: CardTemplate | null | undefined): DetectedTemplateType {
  if (!template) return 'NIDA';

  const name = (template.templateName || '').toLowerCase();
  const cardType = (template.cardType || '').toLowerCase();

  // Combine layer names and placeholder text for deep inspection
  const layerText = (template.layers || [])
    .map((l) => {
      let t = (l.name || '').toLowerCase();
      if (l.type === 'text') t += ' ' + (l.text || '').toLowerCase();
      if (l.type === 'placeholder') t += ' ' + (l.placeholderKey || '').toLowerCase() + ' ' + (l.label || '').toLowerCase();
      if (l.type === 'barcode' || l.type === 'qrcode') t += ' ' + (l.data || '').toLowerCase();
      return t;
    })
    .join(' ');

  // 1. Driving License Detection
  if (
    cardType === 'driving license' ||
    name.includes('driving') ||
    name.includes('driver') ||
    name.includes('license') ||
    name.includes('licence') ||
    name.includes('permit') ||
    layerText.includes('driving license') ||
    layerText.includes('driving licence') ||
    layerText.includes('dl_number')
  ) {
    return 'Driving License';
  }

  // 2. NIDA Detection
  if (
    cardType === 'national id' ||
    name.includes('nida') ||
    name.includes('national id') ||
    name.includes('tanzania') ||
    name.includes('citizen') ||
    name.includes('kitambulisho') ||
    layerText.includes('nida') ||
    layerText.includes('national identification') ||
    layerText.includes('republic identity') ||
    layerText.includes('nida_number')
  ) {
    return 'NIDA';
  }

  // 3. Passport Detection
  if (
    name.includes('passport') ||
    name.includes('travel doc') ||
    layerText.includes('passport') ||
    layerText.includes('p<') ||
    layerText.includes('nationality')
  ) {
    return 'Passport';
  }

  // 4. Birth Certificate Detection
  if (
    name.includes('birth') ||
    name.includes('certificate of birth') ||
    name.includes('kuzaliwa') ||
    layerText.includes('birth certificate') ||
    layerText.includes('cheti cha kuzaliwa')
  ) {
    return 'Birth Certificate';
  }

  // 5. Business License Detection
  if (
    name.includes('business') ||
    name.includes('brela') ||
    name.includes('trade') ||
    name.includes('commercial') ||
    layerText.includes('business license') ||
    layerText.includes('tin')
  ) {
    return 'Business License';
  }

  // Default fallback for ID templates
  if (cardType === 'national id' || cardType === 'employee id' || cardType === 'student id') {
    return 'NIDA';
  }

  return 'NIDA';
}
