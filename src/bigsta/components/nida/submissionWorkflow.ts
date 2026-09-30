import { NidaFormData } from './NidaFormScreen';
import { CardTemplate } from '../../types';
import { validateNidaNumber } from './nidaValidation';
import { isTemplateSelectedOrCreated, detectTemplateType, TEMPLATE_TYPE_PROFILES } from '../../utils/templateTypeDetector';
import { planTemplateMapping, applyTemplateMapping, PopulatedTemplateResult, isBackSideTemplate } from '../../utils/templateMappingEngine';

export type SubmissionStepId =
  | 'step1_fields'
  | 'step2_nida'
  | 'step3_photo'
  | 'step4_signature'
  | 'step5_terms'
  | 'step6_template'
  | 'step7_mapping'
  | 'step8_populate'
  | 'step9_open';

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface WorkflowStep {
  id: SubmissionStepId;
  stepNumber: number;
  label: string;
  description: string;
  status: StepStatus;
  errorMessage?: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  failedStep?: SubmissionStepId;
  errorMessage?: string;
  fieldFocus?: string;
}

export const INITIAL_SUBMISSION_STEPS: WorkflowStep[] = [
  {
    id: 'step1_fields',
    stepNumber: 1,
    label: 'Validate All Fields',
    description: 'Verifying personal identification details (Names, DOB, Gender)',
    status: 'pending',
  },
  {
    id: 'step2_nida',
    stepNumber: 2,
    label: 'Validate NIDA Number',
    description: 'Verifying 20-digit Tanzania standard format and birthdate block',
    status: 'pending',
  },
  {
    id: 'step3_photo',
    stepNumber: 3,
    label: 'Validate Passport Photo',
    description: 'Checking compliant 35×45mm biometric portrait photograph',
    status: 'pending',
  },
  {
    id: 'step4_signature',
    stepNumber: 4,
    label: 'Validate Digital Signature',
    description: 'Checking recorded specimen signature image or drawing',
    status: 'pending',
  },
  {
    id: 'step5_terms',
    stepNumber: 5,
    label: 'Validate Terms Acceptance',
    description: 'Confirming legal terms & statutory registration consent',
    status: 'pending',
  },
  {
    id: 'step6_template',
    stepNumber: 6,
    label: 'Check Template Exists',
    description: 'Verifying active ID card template in workspace',
    status: 'pending',
  },
  {
    id: 'step7_mapping',
    stepNumber: 7,
    label: 'Map Fields',
    description: 'Matching placeholders and synchronizing barcode sources',
    status: 'pending',
  },
  {
    id: 'step8_populate',
    stepNumber: 8,
    label: 'Populate Template',
    description: 'Injecting verified identity records into card layers',
    status: 'pending',
  },
  {
    id: 'step9_open',
    stepNumber: 9,
    label: 'Open Card Preview',
    description: 'Transitioning to Card Preview for inspection and export',
    status: 'pending',
  },
];

/**
 * Validates the form data step-by-step before executing population.
 */
export function validateWorkflowPreflight(
  formData: NidaFormData,
  template: CardTemplate | null | undefined
): WorkflowValidationResult {
  const isBackSide = isBackSideTemplate(template);
  const detectedType = detectTemplateType(template);
  const profile = TEMPLATE_TYPE_PROFILES[detectedType] || TEMPLATE_TYPE_PROFILES.NIDA;
  const enabledBindings = new Set(profile.fields.map((f) => f.bindingKey));

  // Step 1: Validate all fields (Names, DOB, Gender)
  // For back-side only templates, personal names are optional, but for standard NIDA cards they are validated
  if (!isBackSide) {
    if (enabledBindings.has('FIRST_NAME') && (!formData.firstName || formData.firstName.trim().length === 0)) {
      return {
        valid: false,
        failedStep: 'step1_fields',
        errorMessage: 'First name is required. Please provide the cardholder given name.',
        fieldFocus: 'firstName',
      };
    }

    if (enabledBindings.has('LAST_NAME') && (!formData.lastName || formData.lastName.trim().length === 0)) {
      return {
        valid: false,
        failedStep: 'step1_fields',
        errorMessage: 'Last name / Surname is required. Please provide the cardholder family name.',
        fieldFocus: 'lastName',
      };
    }

    if (enabledBindings.has('DOB') && (!formData.dob || formData.dob.trim().length === 0)) {
      return {
        valid: false,
        failedStep: 'step1_fields',
        errorMessage: 'Date of birth is required. Please provide a valid birthdate.',
        fieldFocus: 'dob',
      };
    }

    if (enabledBindings.has('GENDER') && (!formData.gender || formData.gender.trim().length === 0)) {
      return {
        valid: false,
        failedStep: 'step1_fields',
        errorMessage: 'Gender selection is required. Please select Male or Female.',
        fieldFocus: 'gender',
      };
    }
  }

  // Step 2: Validate NIDA Number
  const nidaValidation = validateNidaNumber(formData.nidaNumber);
  if (!nidaValidation.isValid) {
    return {
      valid: false,
      failedStep: 'step2_nida',
      errorMessage: nidaValidation.error || 'NIDA Number must contain exactly 20 digits matching YYYYMMDD-XXXXX-XXXXX-XX.',
      fieldFocus: 'nidaNumber',
    };
  }

  // Step 3: Validate Photo
  if (!isBackSide && enabledBindings.has('PHOTO') && !formData.photoUrl) {
    return {
      valid: false,
      failedStep: 'step3_photo',
      errorMessage: 'Passport photograph is required. Please upload or capture a 35×45mm biometric portrait.',
      fieldFocus: 'photo',
    };
  }

  // Step 4: Validate Signature
  if (!isBackSide && enabledBindings.has('SIGNATURE') && !formData.signatureUrl) {
    return {
      valid: false,
      failedStep: 'step4_signature',
      errorMessage: 'Specimen signature is required. Please draw or upload the cardholder signature.',
      fieldFocus: 'signature',
    };
  }

  // Step 5: Validate Terms Acceptance
  if (!formData.termsAccepted) {
    return {
      valid: false,
      failedStep: 'step5_terms',
      errorMessage: 'You must review and accept the NIDA Registration Terms & Conditions to proceed.',
      fieldFocus: 'terms',
    };
  }

  // Step 6: Check Template Exists
  if (!isTemplateSelectedOrCreated(template)) {
    return {
      valid: false,
      failedStep: 'step6_template',
      errorMessage: 'No template has been selected or created. A valid ID card template is required.',
      fieldFocus: 'template',
    };
  }

  return { valid: true };
}
