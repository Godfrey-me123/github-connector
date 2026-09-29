import React, { useState, useMemo, useEffect } from 'react';
import {
  Menu,
  Home,
  User,
  Hash,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
  BadgeInfo,
  FolderOpen,
  PlusCircle,
  FileCheck,
  ChevronDown,
  Layers,
  ArrowLeft,
  Eye,
  AlertTriangle,
  Loader2,
  Info,
  X,
  CreditCard,
  ScrollText,
  Car,
  Globe,
  Receipt,
  Building2,
  GraduationCap,
  HeartPulse,
  Briefcase,
  Star,
  Settings,
} from 'lucide-react';
import { FloatingInput } from './FloatingInput';
import { FloatingSelect } from './FloatingSelect';
import { FloatingDatePicker } from './FloatingDatePicker';
import { PassportPhotoUpload } from './PassportPhotoUpload';
import { SignaturePad } from './SignaturePad';
import { TermsAndConditions } from './TermsAndConditions';
import { TemplateRequiredModal } from './TemplateRequiredModal';
import { MappingResultModal } from './MappingResultModal';
import { SubmissionProgressModal } from './SubmissionProgressModal';
import { ServiceMenuDrawer } from '../navigation/ServiceMenuDrawer';
import { HorizontalActionRow } from '../common/HorizontalActionRow';
import { AppFooter } from '../common/AppFooter';
import { UniversalBackButton } from '../common/UniversalBackButton';
import { NidaTemplateSelectionStep } from './NidaTemplateSelectionStep';
import {
  INITIAL_SUBMISSION_STEPS,
  WorkflowStep,
  SubmissionStepId,
} from './submissionWorkflow';
import {
  formatNidaNumber,
  validateNidaNumber,
  NidaValidationResult,
} from './nidaValidation';
import { useTemplateStore } from '../../store/useTemplateStore';
import { SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';
import {
  isTemplateSelectedOrCreated,
  detectTemplateType,
  TEMPLATE_TYPE_PROFILES,
  DetectedTemplateType,
} from '../../utils/templateTypeDetector';
import {
  applyTemplateMapping,
  isBackSideTemplate,
  PopulatedTemplateResult,
  sanitizeTemplateForSaving,
} from '../../utils/templateMappingEngine';
import { CardTemplate, NidaSubmissionRecord } from '../../types';
import { renderTemplateToCanvas } from '../../utils/export';

export interface NidaFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  gender: string;
  nidaNumber: string;
  photoUrl?: string | null;
  signatureUrl?: string | null;
  termsAccepted: boolean;
}

import { UserUsageBadge } from '../auth/UserUsageBadge';

export interface NidaFormScreenProps {
  onSuccess?: (data: NidaFormData) => void;
  onCancel?: () => void;
}

export const NidaFormScreen: React.FC<NidaFormScreenProps> = ({ onSuccess, onCancel }) => {
  const {
    currentTemplate,
    loadTemplate,
    setActiveScreen,
    pushHistoryState,
    setNidaSuccessNotification,
    setPopulatedCardPair,
    lastNidaFormData,
    selectedFrontTemplateId,
    selectedBackTemplateId,
    defaultNidaFrontTemplateId,
    defaultNidaBackTemplateId,
    setSelectedFrontTemplateId,
    setSelectedBackTemplateId,
    saveNidaSubmissionRecord,
    loadSavedTemplates,
    setLastNidaFormData,
    authRole,
  } = useTemplateStore();

  // Step state: 'templates' (Template Selection) | 'form' (Filling Form)
  const [currentNidaStep, setCurrentNidaStep] = useState<'templates' | 'form'>(() => {
    // If standard user, always skip template selection and use defaults
    if (authRole === 'user') return 'form';
    
    const frontId = typeof window !== 'undefined' ? localStorage.getItem('nida_default_front_template_id') : null;
    const backId = typeof window !== 'undefined' ? localStorage.getItem('nida_default_back_template_id') : null;
    return (frontId && backId) ? 'form' : 'templates';
  });

  const [formData, setFormData] = useState<NidaFormData>(() => ({
    firstName: lastNidaFormData?.firstName || '',
    middleName: lastNidaFormData?.middleName || '',
    lastName: lastNidaFormData?.lastName || '',
    dob: lastNidaFormData?.dob || '',
    gender: lastNidaFormData?.gender
      ? (lastNidaFormData.gender.toUpperCase().startsWith('F') ? 'Female' : 'Male')
      : 'Male',
    nidaNumber: lastNidaFormData?.nidaNumber || '',
    photoUrl: lastNidaFormData?.photoUrl || null,
    signatureUrl: lastNidaFormData?.signatureUrl || null,
    termsAccepted: lastNidaFormData?.termsAccepted ?? false,
  }));

  useEffect(() => {
    setLastNidaFormData(formData);
  }, [formData, setLastNidaFormData]);

  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Resolved Front & Back templates for preview banners
  const [resolvedFrontTpl, setResolvedFrontTpl] = useState<CardTemplate | null>(null);
  const [resolvedBackTpl, setResolvedBackTpl] = useState<CardTemplate | null>(null);
  const [frontThumbMini, setFrontThumbMini] = useState<string | null>(null);
  const [backThumbMini, setBackThumbMini] = useState<string | null>(null);

  // Modals state
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [infoService, setInfoService] = useState<{
    id?: string;
    name: string;
    authority: string;
    description: string;
    features: string[];
  } | null>(null);
  const [isTemplateRequiredModalOpen, setIsTemplateRequiredModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [populatedResult, setPopulatedResult] = useState<PopulatedTemplateResult | null>(null);

  // 9-Step Submission Workflow State
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [submissionSteps, setSubmissionSteps] = useState<WorkflowStep[]>(INITIAL_SUBMISSION_STEPS);
  const [currentStepId, setCurrentStepId] = useState<SubmissionStepId | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isWorkflowCompleted, setIsWorkflowCompleted] = useState(false);

  // Load and resolve Front and Back templates
  useEffect(() => {
    loadSavedTemplates().then(() => {
      const { getUniversalFrontTemplate, getUniversalBackTemplate } = useTemplateStore.getState();
      const foundFront = getUniversalFrontTemplate('nida');
      const foundBack = getUniversalBackTemplate('nida');

      setResolvedFrontTpl(foundFront);
      setResolvedBackTpl(foundBack);

      if (foundFront) {
        renderTemplateToCanvas(foundFront, {}, 48)
          .then((canvas) => setFrontThumbMini(canvas.toDataURL('image/png')))
          .catch(() => setFrontThumbMini(null));
      }
      if (foundBack) {
        renderTemplateToCanvas(foundBack, {}, 48)
          .then((canvas) => setBackThumbMini(canvas.toDataURL('image/png')))
          .catch(() => setBackThumbMini(null));
      }
    });
  }, [selectedFrontTemplateId, selectedBackTemplateId, defaultNidaFrontTemplateId, defaultNidaBackTemplateId, loadSavedTemplates]);

  // Automatic Template Type Detection
  const detectedType: DetectedTemplateType = useMemo(() => {
    return detectTemplateType(resolvedFrontTpl || currentTemplate);
  }, [resolvedFrontTpl, currentTemplate]);

  // Dynamic field requirements profile based on detected template type
  const activeProfile = useMemo(() => {
    return TEMPLATE_TYPE_PROFILES[detectedType] || TEMPLATE_TYPE_PROFILES.NIDA;
  }, [detectedType]);

  // Determine which fields are enabled in the active profile
  const enabledBindings = useMemo(() => {
    return new Set(activeProfile.fields.map((f) => f.bindingKey));
  }, [activeProfile]);

  // Real-time NIDA validation
  const nidaValidation: NidaValidationResult = useMemo(() => {
    return validateNidaNumber(formData.nidaNumber);
  }, [formData.nidaNumber]);

  // Handle NIDA Number typing with automatic formatting & validation
  const handleNidaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatNidaNumber(rawValue);

    setFormData((prev) => ({
      ...prev,
      nidaNumber: formatted,
    }));

    setTouched((prev) => ({ ...prev, nidaNumber: true }));
  };

  // Generic field handler
  const handleFieldChange = <K extends keyof NidaFormData>(field: K, value: NidaFormData[K]) => {
    let finalVal = value;
    if (field === 'gender' && typeof value === 'string') {
      const g = value.trim().toUpperCase();
      if (g.startsWith('F')) finalVal = 'Female' as NidaFormData[K];
      else finalVal = 'Male' as NidaFormData[K];
    }
    setFormData((prev) => ({
      ...prev,
      [field]: finalVal,
    }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Sync DOB from valid NIDA number
  const handleSyncDobFromNida = (extractedDate: string) => {
    handleFieldChange('dob', extractedDate);
  };

  // Check if form can proceed
  const canContinue = useMemo(() => {
    const nidaRequired = enabledBindings.has('NIDA_NUMBER');
    if (nidaRequired && !nidaValidation.isValid) return false;
    return formData.termsAccepted;
  }, [enabledBindings, nidaValidation.isValid, formData.termsAccepted]);

  // Transition from template selection to form
  const handleContinueFromTemplateSelection = (front: CardTemplate, back: CardTemplate) => {
    setResolvedFrontTpl(front);
    setResolvedBackTpl(back);
    setSelectedFrontTemplateId(front.id);
    setSelectedBackTemplateId(back.id);
    setCurrentNidaStep('form');
  };

  // Complete 9-Step NIDA Submission Workflow
  const executeSubmissionWorkflow = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setSubmissionError(null);
    setIsWorkflowCompleted(false);
    setIsSubmissionModalOpen(true);

    const isOnline = navigator.onLine;
    const hasCachedTemplates = resolvedFrontTpl && resolvedBackTpl;

    const updateStep = (id: SubmissionStepId, status: WorkflowStep['status'], errorMessage?: string) => {
      setSubmissionSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status, errorMessage } : s))
      );
    };

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Reset all steps to pending
    setSubmissionSteps(
      INITIAL_SUBMISSION_STEPS.map((s) => ({ ...s, status: 'pending', errorMessage: undefined }))
    );

    // Step 0: Connectivity Check (Internal logic)
    if (!isOnline && !hasCachedTemplates) {
      setSubmissionError('Internet connection required for first-time template sync. Please check your connection and try again.');
      setIsProcessing(false);
      return;
    }

    // STEP 1: Validate all fields
    setCurrentStepId('step1_fields');
    updateStep('step1_fields', 'in_progress');
    await delay(200);

    if (enabledBindings.has('FIRST_NAME') && (!formData.firstName || formData.firstName.trim().length === 0)) {
      updateStep('step1_fields', 'failed', 'First name is required.');
      setSubmissionError('First name is required. Please provide cardholder given name.');
      setIsProcessing(false);
      return;
    }

    if (enabledBindings.has('LAST_NAME') && (!formData.lastName || formData.lastName.trim().length === 0)) {
      updateStep('step1_fields', 'failed', 'Last name is required.');
      setSubmissionError('Last name / Surname is required.');
      setIsProcessing(false);
      return;
    }

    if (enabledBindings.has('DOB') && (!formData.dob || formData.dob.trim().length === 0)) {
      updateStep('step1_fields', 'failed', 'Date of birth is required.');
      setSubmissionError('Date of birth is required.');
      setIsProcessing(false);
      return;
    }

    if (enabledBindings.has('GENDER') && (!formData.gender || formData.gender.trim().length === 0)) {
      updateStep('step1_fields', 'failed', 'Gender selection (M/F) is required.');
      setSubmissionError('Gender selection is required. Please choose Male or Female.');
      setIsProcessing(false);
      return;
    }
    updateStep('step1_fields', 'completed');

    // STEP 2: Validate NIDA Number
    setCurrentStepId('step2_nida');
    updateStep('step2_nida', 'in_progress');
    await delay(200);

    if (enabledBindings.has('NIDA_NUMBER')) {
      if (!nidaValidation.isValid) {
        updateStep('step2_nida', 'failed', nidaValidation.error || 'Invalid 20-digit NIDA number format.');
        setSubmissionError(nidaValidation.error || 'NIDA format invalid. 20 numerical digits required.');
        setIsProcessing(false);
        return;
      }
    }
    updateStep('step2_nida', 'completed');

    // STEP 3: Validate Biometric Photo
    setCurrentStepId('step3_photo');
    updateStep('step3_photo', 'in_progress');
    await delay(180);
    updateStep('step3_photo', 'completed');

    // STEP 4: Validate Signature
    setCurrentStepId('step4_signature');
    updateStep('step4_signature', 'in_progress');
    await delay(180);
    updateStep('step4_signature', 'completed');

    // STEP 5: Validate Terms Acceptance
    setCurrentStepId('step5_terms');
    updateStep('step5_terms', 'in_progress');
    await delay(180);

    if (!formData.termsAccepted) {
      updateStep('step5_terms', 'failed', 'Terms acceptance is required.');
      setSubmissionError('You must review and accept the NIDA Registration Terms & Conditions to proceed.');
      setIsProcessing(false);
      return;
    }
    updateStep('step5_terms', 'completed');

    // STEP 6: Check Template Exists
    setCurrentStepId('step6_template');
    updateStep('step6_template', 'in_progress');
    await delay(200);

    // Resolve templates pool
    await loadSavedTemplates();
    const { getUniversalFrontTemplate, getUniversalBackTemplate } = useTemplateStore.getState();

    // Force resolve NIDA templates specifically to avoid using leftover IDs from other services
    const frontSourceRaw = getUniversalFrontTemplate('nida');
    const backSourceRaw = getUniversalBackTemplate('nida');

    // Always sanitize templates to clean placeholder tokens first, resolving any leftover hardcoded/populated data
    const frontSource = sanitizeTemplateForSaving(frontSourceRaw);
    const backSource = sanitizeTemplateForSaving(backSourceRaw);

    if (!frontSource || !backSource) {
      if (!isOnline) {
        updateStep('step6_template', 'failed', 'No internet connection to fetch templates.');
        setSubmissionError('Offline: Templates not found in cache and no internet available. Please connect to sync.');
      } else {
        updateStep('step6_template', 'failed', 'Templates could not be resolved.');
        setSubmissionError('Please ensure valid Front and Back NIDA templates are selected.');
      }
      setIsProcessing(false);
      return;
    }
    updateStep('step6_template', 'completed');

    // STEP 7: Map Fields
    setCurrentStepId('step7_mapping');
    updateStep('step7_mapping', 'in_progress');
    await delay(220);
    updateStep('step7_mapping', 'completed');

    // STEP 8: Populate Templates
    setCurrentStepId('step8_populate');
    updateStep('step8_populate', 'in_progress');
    await delay(260);

    // Ensure strict gender M/F
    const normalizedFormData: NidaFormData = {
      ...formData,
      gender: formData.gender?.trim().toUpperCase().startsWith('M') ? 'M' : 'F',
    };

    const frontRes = applyTemplateMapping(frontSource, normalizedFormData);
    const backRes = applyTemplateMapping(backSource, normalizedFormData);

    if (!frontRes.success) {
      updateStep('step8_populate', 'failed');
      setSubmissionError(frontRes.error || 'Field mapping validation failed. Stopping card generation.');
      setIsProcessing(false);
      return;
    }

    // Persist submission record
    const submissionRecord: NidaSubmissionRecord = {
      id: 'nida_sub_' + Date.now(),
      frontTemplateId: frontSource.id,
      backTemplateId: backSource.id,
      frontTemplateName: frontSource.templateName,
      backTemplateName: backSource.templateName,
      firstName: normalizedFormData.firstName,
      middleName: normalizedFormData.middleName,
      lastName: normalizedFormData.lastName,
      dateOfBirth: normalizedFormData.dob,
      gender: normalizedFormData.gender === 'M' ? 'M' : 'F',
      nidaNumber: normalizedFormData.nidaNumber,
      photo: normalizedFormData.photoUrl,
      signature: normalizedFormData.signatureUrl,
      submittedAt: new Date().toISOString(),
    };
    await saveNidaSubmissionRecord(submissionRecord);

    setPopulatedCardPair(frontRes.populatedTemplate, backRes.populatedTemplate, normalizedFormData);
    loadTemplate(frontRes.populatedTemplate);
    pushHistoryState(frontRes.populatedTemplate);
    setPopulatedResult(frontRes);
    updateStep('step8_populate', 'completed');

    // STEP 9: Open Card Preview & Export Screen
    setCurrentStepId('step9_open');
    updateStep('step9_open', 'in_progress');
    await delay(280);

    const accessVal = useTemplateStore.getState().validateServiceAccess('nida');
    if (!accessVal.allowed) {
      updateStep('step9_open', 'failed', accessVal.message || 'Access Required: Approved payment & available tokens needed.');
      setSubmissionError(accessVal.message || 'Access Required: Please recharge or check payment status.');
      setIsProcessing(false);
      return;
    }

    updateStep('step9_open', 'completed');
    setIsWorkflowCompleted(true);
    setIsProcessing(false);

    // Set success notification toast
    setNidaSuccessNotification({
      title: 'NIDA Card Successfully Populated!',
      message: `Front & Back templates populated with verified data (${frontRes.populatedCount + backRes.populatedCount} elements mapped). Ready for preview and export.`,
      populatedCount: frontRes.populatedCount + backRes.populatedCount,
      isBackSide: false,
    });

    onSuccess?.(normalizedFormData);

    // Transition to the Card Preview / Generate page
    setTimeout(() => {
      setIsSubmissionModalOpen(false);
      setActiveScreen('preview');
    }, 450);
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      nidaNumber: true,
      firstName: true,
      lastName: true,
      dob: true,
      gender: true,
      terms: true,
    });

    if (!canContinue || isProcessing) {
      return;
    }

    executeSubmissionWorkflow();
  };

  return (
    <div className="min-h-screen bg-[#D8D2CE] text-[#101010] flex flex-col items-center justify-start p-3 sm:p-6 lg:p-10 font-sans overflow-y-auto pb-24 sm:pb-12">
      {/* Main Container Card */}
      <div className="relative w-full max-w-2xl bg-[#E7E2DE] border border-[#C8C2BE] rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-8 lg:p-9 my-2 sm:my-4 transition-all">
        
        {/* Header with Authority Aesthetic & Navigation */}
        <div className="flex items-center justify-between border-b border-[#C8C2BE] pb-5 mb-5">
          <div className="flex items-center gap-2">
            {onCancel ? (
              <UniversalBackButton onClickCustom={onCancel} />
            ) : (
              <UniversalBackButton />
            )}
            
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#101010]">
                National ID Auto-Fill
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
          </div>
        </div>

        {/* Form Content */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Section 1: NIDA Number (Primary Identifier) */}
              {enabledBindings.has('NIDA_NUMBER') && (
                <div className="p-4 sm:p-5 bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#101010]" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
                        Identity Document Number
                      </h2>
                    </div>

                    {/* Progress counter text alone (no badge box) */}
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#101010]/80">
                      <span>{nidaValidation.digitCount}/20 Digits</span>
                    </div>
                  </div>

                  {/* NIDA Input Field with Real-time Auto-Formatting & Immediate Hint Hiding */}
                  <FloatingInput
                    label="NIDA Number (YYYYMMDD-XXXXX-XXXXX-XX)"
                    icon={Hash}
                    value={formData.nidaNumber}
                    onChange={handleNidaChange}
                    placeholder={formData.nidaNumber.length === 0 ? "19900101-00000-00000-01" : ""}
                    maxLength={23} // 20 digits + 3 hyphens
                    autoComplete="off"
                    spellCheck={false}
                    error={nidaValidation.error || undefined}
                    warning={formData.nidaNumber.length > 0 && nidaValidation.warning ? nidaValidation.warning : undefined}
                    success={nidaValidation.isValid}
                    successMessage={nidaValidation.isValid ? "Valid NIDA format (20/20 digits verified)" : undefined}
                    badge={
                      nidaValidation.isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : nidaValidation.warning && formData.nidaNumber.length > 0 ? (
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : nidaValidation.error ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : null
                    }
                    helperText={formData.nidaNumber.length === 0 ? "Required pattern: 8-digit birthdate (YYYYMMDD), 5-digit district, 5-digit sequence, 2-digit check" : undefined}
                  />

                  {/* Visual Breakdown of Blocks: HIDE COMPLETELY WHEN TYPING (if formData.nidaNumber.length > 0) */}
                  {formData.nidaNumber.length === 0 && (
                    <div className="grid grid-cols-4 gap-1.5 pt-1 text-center font-mono text-[10px]">
                      <div className="p-1.5 rounded-lg bg-[#E7E2DE] border border-[#C8C2BE]">
                        <span className="block text-[#101010]/60 text-[9px] uppercase font-bold">Birthdate</span>
                        <span className="font-bold text-[#101010] truncate block">
                          YYYYMMDD
                        </span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#E7E2DE] border border-[#C8C2BE]">
                        <span className="block text-[#101010]/60 text-[9px] uppercase font-bold">District</span>
                        <span className="font-bold text-[#101010] truncate block">
                          XXXXX
                        </span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#E7E2DE] border border-[#C8C2BE]">
                        <span className="block text-[#101010]/60 text-[9px] uppercase font-bold">Sequence</span>
                        <span className="font-bold text-[#101010] truncate block">
                          XXXXX
                        </span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#E7E2DE] border border-[#C8C2BE]">
                        <span className="block text-[#101010]/60 text-[9px] uppercase font-bold">Check Digits</span>
                        <span className="font-bold text-[#101010] truncate block">
                          XX
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Section 2: Personal Identification Details */}
              <div className="p-4 sm:p-5 bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#101010]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
                    Personal Identification Details
                  </h2>
                </div>

                {/* Names Fields */}
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {enabledBindings.has('FIRST_NAME') && (
                      <FloatingInput
                        label="First Name"
                        icon={User}
                        value={formData.firstName}
                        onChange={(e) => handleFieldChange('firstName', e.target.value)}
                        placeholder="e.g. Juma"
                        autoComplete="given-name"
                      />
                    )}

                    {enabledBindings.has('MIDDLE_NAME') && (
                      <FloatingInput
                        label="Middle Name"
                        icon={User}
                        value={formData.middleName}
                        onChange={(e) => handleFieldChange('middleName', e.target.value)}
                        placeholder="e.g. Ali"
                        autoComplete="additional-name"
                      />
                    )}
                  </div>

                  {enabledBindings.has('LAST_NAME') && (
                    <FloatingInput
                      label="Last Name / Surname"
                      icon={User}
                      value={formData.lastName}
                      onChange={(e) => handleFieldChange('lastName', e.target.value)}
                      placeholder="e.g. Mwangi"
                      autoComplete="family-name"
                    />
                  )}
                </div>

                {/* Date of Birth & Gender Fields (Strict M/F) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {enabledBindings.has('DOB') && (
                    <FloatingDatePicker
                      label="Date of Birth"
                      value={formData.dob}
                      onChange={(e) => handleFieldChange('dob', e.target.value)}
                      suggestedDate={nidaValidation.extractedDob}
                      onApplySuggestedDate={handleSyncDobFromNida}
                      helperText={
                        nidaValidation.extractedDob && formData.dob !== nidaValidation.extractedDob
                          ? `Extracted from NIDA: ${nidaValidation.extractedDob}`
                          : undefined
                      }
                    />
                  )}

                  {enabledBindings.has('GENDER') && (
                    <FloatingSelect
                      id="nida-gender-select"
                      label="Gender"
                      value={formData.gender.toUpperCase().startsWith('F') ? 'Female' : 'Male'}
                      onChange={(e) => handleFieldChange('gender', e.target.value)}
                      options={[
                        { value: 'Male', label: 'Male' },
                        { value: 'Female', label: 'Female' },
                      ]}
                    />
                  )}
                </div>
              </div>

              {/* Section 3: Passport Photo Upload */}
              {enabledBindings.has('PHOTO') && (
                <PassportPhotoUpload
                  value={formData.photoUrl}
                  onChange={(photo) => handleFieldChange('photoUrl', photo)}
                />
              )}

              {/* Section 4: Signature System */}
              {enabledBindings.has('SIGNATURE') && (
                <SignaturePad
                  value={formData.signatureUrl}
                  onChange={(signature) => handleFieldChange('signatureUrl', signature)}
                />
              )}

              {/* Section 5: Terms and Conditions */}
              <TermsAndConditions
                checked={formData.termsAccepted}
                onChange={(accepted) => handleFieldChange('termsAccepted', accepted)}
                showWarning={touched.terms && !formData.termsAccepted}
              />

              {/* Security / System Notice */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#E7E2DE] border border-[#C8C2BE] text-xs">
                <Lock className="w-4 h-4 text-[#101010] shrink-0 mt-0.5" />
                <div className="text-[11px] text-[#101010]/80 leading-relaxed font-medium">
                  <span className="font-bold text-[#101010]">Tanzania NIDA Standard Compliance:</span>{' '}
                  All 20 digits, portrait specifications (35×45mm), and signature records are verified according to the national registration format. This information is prepared for direct template auto-population.
                </div>
              </div>

              {/* Form Actions / Continuation Guard */}
              <div className="pt-2">
                <button
                  id="submit-nida-form-btn"
                  type="submit"
                  disabled={!canContinue || isProcessing}
                  className={`w-full py-3.5 px-5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2.5 shadow-md ${
                    canContinue && !isProcessing
                      ? 'bg-[#101010] hover:bg-[#252525] text-white cursor-pointer active:scale-[0.99]'
                      : 'bg-[#C8C2BE] text-[#101010]/50 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Populate</span>
                      <ArrowRight className={`w-4 h-4 transition-transform ${canContinue ? 'group-hover:translate-x-1' : ''}`} />
                    </>
                  )}
                </button>

                {!canContinue && (
                  <p className="text-center text-[11px] text-amber-800 font-semibold mt-2.5 flex items-center justify-center gap-1.5">
                    <BadgeInfo className="w-3.5 h-3.5" />
                    <span>
                      {enabledBindings.has('NIDA_NUMBER') && !nidaValidation.isValid
                        ? formData.nidaNumber.length === 0
                          ? 'Enter a valid 20-digit NIDA number to enable continuation'
                          : nidaValidation.error || 'Complete the valid 20-digit NIDA format to proceed'
                        : !formData.termsAccepted
                        ? 'You must accept the Terms and Conditions to proceed'
                        : 'Please fill in required fields'}
                    </span>
                  </p>
                )}
              </div>
            </form>
          </div>
      </div>

      {/* Available Services Section (Natural vertical scrolling after form) */}
      <div className="w-full max-w-2xl my-6 space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#101010]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
              Other Document & Card Services
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveScreen('home')}
            className="text-xs text-[#101010] hover:underline flex items-center gap-1 font-bold cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Custom Studio Service */}
          <div
            onClick={() => setActiveScreen('upload')}
            className="p-3.5 rounded-2xl bg-[#E7E2DE] hover:bg-[#FFFFFF] border border-[#C8C2BE] hover:border-[#101010] transition-all cursor-pointer flex items-center gap-3 group shadow-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-[#B5A5FF] border border-[#101010]/20 text-[#101010] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-[#101010] truncate">Custom Card Studio</h3>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">Active</span>
              </div>
              <p className="text-[10px] text-[#101010]/70 truncate font-medium">Upload & design any ID layout</p>
            </div>
          </div>

          {/* Driving License Service */}
          <div
            onClick={() => setInfoService({
              id: 'driving_license',
              name: 'Driving License Services',
              authority: 'Traffic & Vehicle Inspection Division',
              description: 'Driver permit issuance, class endorsements & digital driver identification cards.',
              features: ['Class Endorsements (A, B, C, D, E)', 'Barcode Encoding', 'Penalty Points Tracker', 'Biometric Photo Matrix'],
            })}
            className="p-3.5 rounded-2xl bg-[#E7E2DE] hover:bg-[#FFFFFF] border border-[#C8C2BE] hover:border-[#101010] transition-all cursor-pointer flex items-center gap-3 group shadow-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-[#B5A5FF] border border-[#101010]/20 text-[#101010] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Car className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-[#101010] truncate">Driving License</h3>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FFFFFF] text-[#101010] font-bold border border-[#C8C2BE]">Traffic</span>
              </div>
              <p className="text-[10px] text-[#101010]/70 truncate font-medium">Permit & endorsements</p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Application Footer */}
      <AppFooter className="max-w-2xl" />

      {/* MODAL 1: TEMPLATE REQUIRED MODAL */}
      <TemplateRequiredModal
        isOpen={isTemplateRequiredModalOpen}
        onClose={() => setIsTemplateRequiredModalOpen(false)}
        onCreateNewTemplate={() => {
          setIsTemplateRequiredModalOpen(false);
          setActiveScreen('upload');
        }}
        onUseExistingTemplate={() => {
          setIsTemplateRequiredModalOpen(false);
          setActiveScreen('templates');
        }}
      />

      {/* MODAL 2: AUTO-FILL POPULATION RESULT */}
      <MappingResultModal
        isOpen={isResultModalOpen}
        result={populatedResult}
        onClose={() => setIsResultModalOpen(false)}
        onOpenEditor={() => {
          setIsResultModalOpen(false);
          setActiveScreen('editor');
        }}
      />

      {/* MODAL 3: 9-STEP SUBMISSION WORKFLOW PROGRESS MODAL */}
      <SubmissionProgressModal
        isOpen={isSubmissionModalOpen}
        steps={submissionSteps}
        currentStepId={currentStepId}
        isCompleted={isWorkflowCompleted}
        error={submissionError}
        onRetry={executeSubmissionWorkflow}
        onClose={() => {
          setIsSubmissionModalOpen(false);
          setIsProcessing(false);
        }}
        title="NIDA Identity Form Submission"
      />

      {/* Services Navigation Drawer */}
      <ServiceMenuDrawer
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
        onSelectInfoService={(srv) => setInfoService(srv)}
      />

      {/* Informational modal for non-active services */}
      {infoService && (
        <div
          onClick={() => setInfoService(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#E7E2DE] border border-[#C8C2BE] rounded-2xl shadow-2xl p-5 space-y-4 text-left cursor-default"
          >
            <div className="flex items-start justify-between border-b border-[#C8C2BE] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#101010] text-[#FFFFFF]">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#101010] tracking-wide">
                    {infoService.name}
                  </h3>
                  <p className="text-[11px] text-[#101010]/70 font-medium">{infoService.authority}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInfoService(null)}
                className="text-[#101010]/60 hover:text-[#101010] p-1 rounded-lg hover:bg-[#FFFFFF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#101010]/80 leading-relaxed font-medium">
              {infoService.description}
            </p>

            {infoService.features && infoService.features.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#101010]/70">
                  Planned Standard Features
                </span>
                <div className="space-y-1">
                  {infoService.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-[#101010]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="font-medium">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInfoService(null)}
                className="px-4 py-2 bg-[#101010] hover:bg-[#252525] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
