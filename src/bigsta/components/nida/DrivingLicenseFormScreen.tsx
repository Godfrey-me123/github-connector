import React, { useState, useMemo, useEffect } from 'react';
import {
  Menu,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Info,
  Copy,
  Calendar,
  Globe,
  MapPin,
  Key,
  CreditCard,
  Shield,
} from 'lucide-react';
import { FloatingInput } from './FloatingInput';
import { FloatingSelect } from './FloatingSelect';
import { FloatingDatePicker } from './FloatingDatePicker';
import { PassportPhotoUpload } from './PassportPhotoUpload';
import { SignaturePad } from './SignaturePad';
import { TermsAndConditions } from './TermsAndConditions';
import { SubmissionProgressModal } from './SubmissionProgressModal';
import { CopyToModal, VehicleClassItem } from './CopyToModal';
import { ServiceMenuDrawer } from '../navigation/ServiceMenuDrawer';
import { AppFooter } from '../common/AppFooter';
import { UniversalBackButton } from '../common/UniversalBackButton';
import { useTemplateStore } from '../../store/useTemplateStore';
import { SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';
import { CardTemplate } from '../../types';
import { applyTemplateMapping, sanitizeTemplateForSaving } from '../../utils/templateMappingEngine';
import { formatToDdMmYyyy, validateDdMmYyyy } from '../../utils/dateValidation';
import { renderTemplateToCanvas } from '../../utils/export';

export interface DrivingLicenseFormData {
  firstName: string;
  secondName: string;
  thirdName: string;
  dob: string;
  dateOfIssue: string;
  dateOfExpiry: string;
  issuingAuthority: string;
  region: string;
  licenceNumber: string;
  pinNumber: string;
  gender: string;
  nationality: string;
  photoUrl?: string | null;
  signatureUrl?: string | null;
  termsAccepted: boolean;
  classes: VehicleClassItem[];
}

export interface DrivingLicenseFormScreenProps {
  onCancel?: () => void;
  onSuccess?: (data: DrivingLicenseFormData) => void;
}

const SUPPORTED_CLASS_CODES = ['A', 'A1', 'A2', 'A3', 'B', 'C', 'C1', 'C2', 'C3', 'D', 'E', 'F', 'G'];

export const DrivingLicenseFormScreen: React.FC<DrivingLicenseFormScreenProps> = ({ onCancel, onSuccess }) => {
  const {
    currentTemplate,
    loadTemplate,
    setActiveScreen,
    pushHistoryState,
    setNidaSuccessNotification,
    setPopulatedCardPair,
    saveNidaSubmissionRecord,
    customTemplates,
    lastDrivingLicenseFormData,
    setLastDrivingLicenseFormData,
  } = useTemplateStore();

  const [formData, setFormData] = useState<DrivingLicenseFormData>(() => {
    if (lastDrivingLicenseFormData) {
      return {
        ...lastDrivingLicenseFormData,
        dob: lastDrivingLicenseFormData.dob ? formatToDdMmYyyy(lastDrivingLicenseFormData.dob) : '',
        dateOfIssue: lastDrivingLicenseFormData.dateOfIssue ? formatToDdMmYyyy(lastDrivingLicenseFormData.dateOfIssue) : '',
        dateOfExpiry: lastDrivingLicenseFormData.dateOfExpiry ? formatToDdMmYyyy(lastDrivingLicenseFormData.dateOfExpiry) : '',
        classes: (lastDrivingLicenseFormData.classes || []).map((c) => ({
          ...c,
          issueDate: c.issueDate ? formatToDdMmYyyy(c.issueDate) : '',
          expiryDate: c.expiryDate ? formatToDdMmYyyy(c.expiryDate) : '',
        })),
      };
    }
    return {
      firstName: '',
      secondName: '',
      thirdName: '',
      dob: '',
      dateOfIssue: '',
      dateOfExpiry: '',
      issuingAuthority: '',
      region: '',
      licenceNumber: '',
      pinNumber: '',
      gender: 'Male',
      nationality: 'TANZANIAN',
      photoUrl: null,
      signatureUrl: null,
      termsAccepted: false,
      classes: SUPPORTED_CLASS_CODES.map((code) => ({
        classCode: code,
        enabled: code === 'B', // Default enable Class B
        issueDate: '',
        expiryDate: '',
      })),
    };
  });

  useEffect(() => {
    setLastDrivingLicenseFormData(formData);
  }, [formData, setLastDrivingLicenseFormData]);

  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // COPY TO Modal State
  const [copyModalState, setCopyModalState] = useState<{
    isOpen: boolean;
    sourceClassCode: string;
    sourceIssueDate: string;
    sourceExpiryDate: string;
  }>({
    isOpen: false,
    sourceClassCode: '',
    sourceIssueDate: '',
    sourceExpiryDate: '',
  });

  // Resolved Universal Templates for background mapping (active in store)
  const [resolvedFrontTpl, setResolvedFrontTpl] = useState<CardTemplate | null>(null);
  const [resolvedBackTpl, setResolvedBackTpl] = useState<CardTemplate | null>(null);

  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isWorkflowCompleted, setIsWorkflowCompleted] = useState(false);

  // Load Universal Front and Back Driving License Templates
  useEffect(() => {
    // Ensure we have the latest templates loaded
    useTemplateStore.getState().loadSavedTemplates();
  }, []);

  useEffect(() => {
    const { getUniversalFrontTemplate, getUniversalBackTemplate } = useTemplateStore.getState();
    const targetFront = getUniversalFrontTemplate('driving_license');
    const targetBack = getUniversalBackTemplate('driving_license');

    if (targetFront) {
      setResolvedFrontTpl(targetFront);
    }

    if (targetBack) {
      setResolvedBackTpl(targetBack);
    }
  }, [customTemplates]);

  // Form Validation
  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required.';
    if (!formData.thirdName.trim()) errs.thirdName = 'Third Name / Surname is required.';
    if (!formData.dob) {
      errs.dob = 'Date of birth is required.';
    } else {
      const v = validateDdMmYyyy(formData.dob);
      if (!v.isValid) errs.dob = v.error || 'Date must be DD/MM/YYYY';
    }
    if (!formData.dateOfIssue) {
      errs.dateOfIssue = 'Date of issue is required.';
    } else {
      const v = validateDdMmYyyy(formData.dateOfIssue);
      if (!v.isValid) errs.dateOfIssue = v.error || 'Date must be DD/MM/YYYY';
    }
    if (!formData.dateOfExpiry) {
      errs.dateOfExpiry = 'Date of expiry is required.';
    } else {
      const v = validateDdMmYyyy(formData.dateOfExpiry);
      if (!v.isValid) errs.dateOfExpiry = v.error || 'Date must be DD/MM/YYYY';
    }
    if (!formData.licenceNumber.trim()) {
      errs.licenceNumber = 'Licence number is required.';
    } else if (formData.licenceNumber.trim().length < 4) {
      errs.licenceNumber = 'Licence number must be at least 4 characters.';
    }
    if (!formData.photoUrl) errs.photo = 'Driver photograph is required.';
    if (!formData.signatureUrl) errs.signature = 'Driver specimen signature is required.';
    if (!formData.termsAccepted) errs.terms = 'Terms acceptance is required.';
    return errs;
  }, [formData]);

  const canContinue = Object.keys(errors).length === 0;

  // COPY TO Handler: Applies dates from source class to selected target classes
  const handleApplyCopyTo = (targetClassCodes: string[]) => {
    const { sourceIssueDate, sourceExpiryDate } = copyModalState;
    setFormData((prev) => ({
      ...prev,
      classes: prev.classes.map((cls) => {
        if (targetClassCodes.includes(cls.classCode)) {
          return {
            ...cls,
            enabled: true,
            issueDate: formatToDdMmYyyy(sourceIssueDate),
            expiryDate: formatToDdMmYyyy(sourceExpiryDate),
          };
        }
        return cls;
      }),
    }));
  };

  // Submission Workflow
  const [submissionSteps, setSubmissionSteps] = useState<any[]>([
    { id: 'step1_fields', stepNumber: 1, label: 'Validate Driver Info', description: 'Checking core Section 1 driver fields', status: 'pending' },
    { id: 'step2_licence', stepNumber: 2, label: 'Validate Licence & PIN', description: 'Verifying permit number and PIN registration format', status: 'pending' },
    { id: 'step3_classes', stepNumber: 3, label: 'Permitting Classes', description: 'Checking vehicle endorsements & validity dates', status: 'pending' },
    { id: 'step4_photo', stepNumber: 4, label: 'Biometric Photograph', description: 'Checking portrait crop (285x309 frame ratio)', status: 'pending' },
    { id: 'step5_signature', stepNumber: 5, label: 'Signature Specimen', description: 'Validating driver sign specimen', status: 'pending' },
    { id: 'step6_template', stepNumber: 6, label: 'Prepare Layout', description: 'Preparing official card format and layout', status: 'pending' },
    { id: 'step7_mapping', stepNumber: 7, label: 'Format Endorsements', description: 'Formatting vehicle categories and driver credentials', status: 'pending' },
    { id: 'step8_populate', stepNumber: 8, label: 'Generate Licence', description: 'Compiling high-resolution card output', status: 'pending' },
    { id: 'step9_open', stepNumber: 9, label: 'Ready for Output', description: 'Opening generation & export options', status: 'pending' },
  ]);

  const [currentStepId, setCurrentStepId] = useState<string | null>(null);

  const executeSubmissionWorkflow = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setSubmissionError(null);
    setIsWorkflowCompleted(false);
    setIsSubmissionModalOpen(true);

    const isOnline = navigator.onLine;
    const hasCachedTemplates = resolvedFrontTpl && resolvedBackTpl;

    const updateStep = (id: string, status: 'pending' | 'in_progress' | 'completed' | 'failed', errorMessage?: string) => {
      setSubmissionSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status, errorMessage } : s))
      );
    };

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Reset steps
    setSubmissionSteps((prev) => prev.map((s) => ({ ...s, status: 'pending', errorMessage: undefined })));

    // Step 0: Connectivity Check (Internal logic)
    if (!isOnline && !hasCachedTemplates) {
      setSubmissionError('Internet connection required for first-time template sync. Please check your connection and try again.');
      setIsProcessing(false);
      return;
    }

    // Step 1: Validate Fields
    setCurrentStepId('step1_fields');
    updateStep('step1_fields', 'in_progress');
    await delay(250);
    if (errors.firstName || errors.thirdName || errors.dob || errors.dateOfIssue || errors.dateOfExpiry) {
      updateStep('step1_fields', 'failed', errors.firstName || errors.thirdName || errors.dob);
      setSubmissionError('Please complete driver identity information fields.');
      setIsProcessing(false);
      return;
    }
    updateStep('step1_fields', 'completed');

    // Step 2: Validate Licence & PIN
    setCurrentStepId('step2_licence');
    updateStep('step2_licence', 'in_progress');
    await delay(250);
    if (errors.licenceNumber) {
      updateStep('step2_licence', 'failed', errors.licenceNumber);
      setSubmissionError(errors.licenceNumber);
      setIsProcessing(false);
      return;
    }
    updateStep('step2_licence', 'completed');

    // Step 3: Vehicle Classes
    setCurrentStepId('step3_classes');
    updateStep('step3_classes', 'in_progress');
    await delay(200);
    updateStep('step3_classes', 'completed');

    // Step 4: Photo
    setCurrentStepId('step4_photo');
    updateStep('step4_photo', 'in_progress');
    await delay(200);
    if (errors.photo) {
      updateStep('step4_photo', 'failed', errors.photo);
      setSubmissionError('Driver photograph is required.');
      setIsProcessing(false);
      return;
    }
    updateStep('step4_photo', 'completed');

    // Step 5: Signature
    setCurrentStepId('step5_signature');
    updateStep('step5_signature', 'in_progress');
    await delay(200);
    if (errors.signature) {
      updateStep('step5_signature', 'failed', errors.signature);
      setSubmissionError('Driver signature is required.');
      setIsProcessing(false);
      return;
    }
    updateStep('step5_signature', 'completed');

    // Step 6: Load Universal Templates
    setCurrentStepId('step6_template');
    updateStep('step6_template', 'in_progress');
    await delay(250);
    if (!resolvedFrontTpl || !resolvedBackTpl) {
      if (!isOnline) {
        updateStep('step6_template', 'failed', 'No internet connection to fetch templates.');
        setSubmissionError('Offline: Universal templates not found in cache and no internet available. Please connect to sync.');
      } else {
        updateStep('step6_template', 'failed', 'Driving License universal templates missing.');
        setSubmissionError('Universal Driving License templates are not available or failed to load. Please try again.');
      }
      setIsProcessing(false);
      return;
    }
    updateStep('step6_template', 'completed');

    // Step 7 & 8: Map & Populate
    setCurrentStepId('step7_mapping');
    updateStep('step7_mapping', 'in_progress');
    await delay(250);
    updateStep('step7_mapping', 'completed');

    setCurrentStepId('step8_populate');
    updateStep('step8_populate', 'in_progress');
    await delay(300);

    // Combine First + Second Name -> given_names; Third Name -> family_name / last_name
    const givenNamesCombined = formData.secondName.trim()
      ? `${formData.firstName.trim()} ${formData.secondName.trim()}`
      : formData.firstName.trim();

    const normalizedFormData = {
      ...formData,
      // Standardize all dates to DD/MM/YYYY
      dob: formatToDdMmYyyy(formData.dob),
      dateOfBirth: formatToDdMmYyyy(formData.dob),
      dateOfIssue: formatToDdMmYyyy(formData.dateOfIssue),
      issueDate: formatToDdMmYyyy(formData.dateOfIssue),
      dateOfExpiry: formatToDdMmYyyy(formData.dateOfExpiry),
      expiryDate: formatToDdMmYyyy(formData.dateOfExpiry),
      classes: formData.classes.map((cls) => {
        const isEnabled = !!(cls.enabled || (cls as any).selected || (cls as any).checked);
        const resolvedIssue = cls.issueDate ? formatToDdMmYyyy(cls.issueDate) : (isEnabled && formData.dateOfIssue ? formatToDdMmYyyy(formData.dateOfIssue) : '');
        const resolvedExpiry = cls.expiryDate ? formatToDdMmYyyy(cls.expiryDate) : (isEnabled && formData.dateOfExpiry ? formatToDdMmYyyy(formData.dateOfExpiry) : '');
        return {
          ...cls,
          enabled: isEnabled,
          issueDate: resolvedIssue,
          expiryDate: resolvedExpiry,
        };
      }),
      // Binding mappings
      firstName: formData.firstName.trim(),
      middleName: formData.secondName.trim(),
      lastName: formData.thirdName.trim(),
      givenNames: givenNamesCombined,
      familyName: formData.thirdName.trim(),
      licenceNumber: formData.licenceNumber.trim(),
      nidaNumber: formData.licenceNumber.trim(), // Binds to licence number placeholder
      gender: formData.gender?.trim().toUpperCase().startsWith('M') ? 'M' : 'F',
    };

    const frontSource = sanitizeTemplateForSaving(resolvedFrontTpl);
    const backSource = sanitizeTemplateForSaving(resolvedBackTpl);

    const frontRes = applyTemplateMapping(frontSource, normalizedFormData as any);
    const backRes = applyTemplateMapping(backSource, normalizedFormData as any);

    if (!frontRes.success) {
      updateStep('step8_populate', 'failed', frontRes.error || 'Autofill failed.');
      setSubmissionError(frontRes.error || 'Failed to populate layers.');
      setIsProcessing(false);
      return;
    }

    // Persist record into store & downloads history
    const record = {
      id: 'dl_sub_' + Date.now(),
      frontTemplateId: frontSource.id,
      backTemplateId: backSource.id,
      frontTemplateName: frontSource.templateName,
      backTemplateName: backSource.templateName,
      firstName: normalizedFormData.firstName,
      secondName: normalizedFormData.middleName,
      thirdName: normalizedFormData.lastName,
      dateOfBirth: normalizedFormData.dob,
      dateOfIssue: normalizedFormData.dateOfIssue,
      dateOfExpiry: normalizedFormData.dateOfExpiry,
      region: normalizedFormData.region,
      licenceNumber: normalizedFormData.licenceNumber,
      pinNumber: normalizedFormData.pinNumber,
      gender: normalizedFormData.gender,
      nationality: normalizedFormData.nationality,
      photo: normalizedFormData.photoUrl,
      signature: normalizedFormData.signatureUrl,
      classes: normalizedFormData.classes,
      submittedAt: new Date().toISOString(),
    };
    await saveNidaSubmissionRecord(record as any);

    setPopulatedCardPair(frontRes.populatedTemplate, backRes.populatedTemplate, normalizedFormData);
    loadTemplate(frontRes.populatedTemplate);
    pushHistoryState(frontRes.populatedTemplate);

    updateStep('step8_populate', 'completed');

    // Step 9: Open Card Preview
    setCurrentStepId('step9_open');
    updateStep('step9_open', 'in_progress');
    await delay(250);

    const accessVal = useTemplateStore.getState().validateServiceAccess('driving_license');
    if (!accessVal.allowed) {
      updateStep('step9_open', 'failed', accessVal.message || 'Access Required: Approved payment & available tokens needed.');
      setSubmissionError(accessVal.message || 'Access Required: Please recharge or check payment status.');
      setIsProcessing(false);
      return;
    }

    updateStep('step9_open', 'completed');

    setIsWorkflowCompleted(true);
    setIsProcessing(false);

    setNidaSuccessNotification({
      title: 'Driving License Generated!',
      message: `Front & Back templates populated with verified driver details and vehicle classes. Ready for export.`,
      populatedCount: frontRes.populatedCount + backRes.populatedCount,
      isBackSide: false,
    });

    onSuccess?.(formData);

    setTimeout(() => {
      setIsSubmissionModalOpen(false);
      setActiveScreen('preview');
    }, 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      firstName: true,
      thirdName: true,
      dob: true,
      dateOfIssue: true,
      dateOfExpiry: true,
      licenceNumber: true,
      terms: true,
    });

    if (!canContinue || isProcessing) return;
    executeSubmissionWorkflow();
  };

  return (
    <div className="min-h-screen bg-[#D8D2CE] text-[#101010] flex flex-col items-center justify-start p-2.5 sm:p-6 lg:p-10 font-sans overflow-y-auto overflow-x-hidden w-full max-w-full pb-24 sm:pb-12">
      <div className="relative w-full max-w-full sm:max-w-3xl min-w-0 bg-[#E7E2DE] border border-[#C8C2BE] rounded-2xl sm:rounded-3xl shadow-xl p-3 sm:p-6 lg:p-8 my-1 sm:my-3 transition-all overflow-hidden">
        
        {/* Compact Service Header */}
        <div className="flex items-center justify-between border-b border-[#C8C2BE] pb-2.5 mb-3.5 gap-2 w-full min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <UniversalBackButton />
            <button
              type="button"
              onClick={() => setIsMenuDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F5F2EF] text-[#101010] border border-[#C8C2BE] text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs active:scale-95"
              title="Open Services Menu"
              aria-label="Open Services Navigation Menu"
            >
              <Menu className="w-3.5 h-3.5 text-[#101010]" />
              <span className="text-[11px]">Menu</span>
            </button>
          </div>
        </div>

        {/* Form Main Container */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECTION 1: DRIVER INFORMATION */}
          <div className="p-4 sm:p-6 bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E7E2DE] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
                  Section 1: Driver Information
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#101010]/60 font-semibold">
                11 Core Fields
              </span>
            </div>

            {/* Names Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FloatingInput
                id="firstName"
                label="FIRST NAME"
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                onBlur={() => setTouched((p) => ({ ...p, firstName: true }))}
                error={touched.firstName ? errors.firstName : undefined}
                placeholder="e.g. JACKSON"
              />
              <FloatingInput
                id="secondName"
                label="SECOND NAME"
                value={formData.secondName}
                onChange={(e) => setFormData((prev) => ({ ...prev, secondName: e.target.value }))}
                placeholder="e.g. FERDINANDI"
              />
              <FloatingInput
                id="thirdName"
                label="THIRD NAME (FAMILY NAME)"
                value={formData.thirdName}
                onChange={(e) => setFormData((prev) => ({ ...prev, thirdName: e.target.value }))}
                onBlur={() => setTouched((p) => ({ ...p, thirdName: true }))}
                error={touched.thirdName ? errors.thirdName : undefined}
                placeholder="e.g. MWANGI"
              />
            </div>



            {/* Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FloatingDatePicker
                id="dob"
                label="DATE OF BIRTH"
                value={formData.dob}
                onChange={(e) => setFormData((prev) => ({ ...prev, dob: e.target.value }))}
                error={touched.dob ? errors.dob : undefined}
                noManualTyping={true}
                dateFormat="DD/MM/YYYY"
              />
              <FloatingDatePicker
                id="dateOfIssue"
                label="DATE OF ISSUE"
                value={formData.dateOfIssue}
                onChange={(e) => setFormData((prev) => ({ ...prev, dateOfIssue: e.target.value }))}
                error={touched.dateOfIssue ? errors.dateOfIssue : undefined}
                noManualTyping={true}
                dateFormat="DD/MM/YYYY"
              />
              <FloatingDatePicker
                id="dateOfExpiry"
                label="DATE OF EXPIRY"
                value={formData.dateOfExpiry}
                onChange={(e) => setFormData((prev) => ({ ...prev, dateOfExpiry: e.target.value }))}
                error={touched.dateOfExpiry ? errors.dateOfExpiry : undefined}
                noManualTyping={true}
                dateFormat="DD/MM/YYYY"
              />
            </div>

            {/* Identification & Region Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FloatingInput
                id="licenceNumber"
                label="LICENCE NUMBER"
                icon={CreditCard}
                value={formData.licenceNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, licenceNumber: e.target.value }))}
                onBlur={() => setTouched((p) => ({ ...p, licenceNumber: true }))}
                error={touched.licenceNumber ? errors.licenceNumber : undefined}
                placeholder="e.g. DL-10829375"
              />
              <FloatingInput
                id="pinNumber"
                label="PIN NUMBER"
                icon={Key}
                value={formData.pinNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, pinNumber: e.target.value }))}
                placeholder="e.g. PIN-849302"
              />
            </div>

            {/* Demographics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FloatingInput
                id="region"
                label="REGION / RESIDENCE"
                icon={MapPin}
                value={formData.region}
                onChange={(e) => setFormData((prev) => ({ ...prev, region: e.target.value }))}
                placeholder="e.g. Dar es Salaam"
              />
              <FloatingInput
                id="issuingAuthority"
                label="ISSUING AUTHORITY"
                icon={Shield}
                value={formData.issuingAuthority}
                onChange={(e) => setFormData((prev) => ({ ...prev, issuingAuthority: e.target.value }))}
                placeholder="e.g. TANZANIA REVENUE AUTHORITY"
              />
              <FloatingSelect
                id="gender"
                label="GENDER"
                value={formData.gender}
                onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
                options={[
                  { value: 'Male', label: 'Male (M)' },
                  { value: 'Female', label: 'Female (F)' },
                ]}
              />
              <FloatingInput
                id="nationality"
                label="NATIONALITY"
                icon={Globe}
                value={formData.nationality}
                onChange={(e) => setFormData((prev) => ({ ...prev, nationality: e.target.value }))}
                placeholder="e.g. Tanzanian"
              />
            </div>
          </div>

          {/* SECTION 2: VEHICLE CLASSES & ENDORSEMENTS */}
          <div className="p-4 sm:p-6 bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E7E2DE] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
                  Section 2: Vehicle Classes & Endorsements
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#101010]/60 font-semibold">
                13 Permitting Classes (A - G)
              </span>
            </div>

            <p className="text-xs text-[#101010]/70 font-medium">
              Enable required classes, set issue & expiry dates, or use <strong>COPY TO</strong> to apply dates to multiple classes at once.
            </p>

            {/* Vehicle Class Rows */}
            <div className="space-y-3 pt-1">
              {formData.classes.map((clsItem, index) => {
                const canCopy = clsItem.issueDate.trim().length > 0 && clsItem.expiryDate.trim().length > 0;

                return (
                  <div
                    key={clsItem.classCode}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      clsItem.enabled
                        ? 'bg-[#F8F6F4] border-amber-400/80 shadow-xs'
                        : 'bg-white border-[#E7E2DE] opacity-80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Class Checkbox Toggle */}
                      <label className="flex items-center gap-3 cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          checked={clsItem.enabled}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setFormData((prev) => ({
                              ...prev,
                              classes: prev.classes.map((c) =>
                                c.classCode === clsItem.classCode
                                  ? {
                                      ...c,
                                      enabled: isChecked,
                                      issueDate: isChecked ? (c.issueDate || formatToDdMmYyyy(prev.dateOfIssue)) : '',
                                      expiryDate: isChecked ? (c.expiryDate || formatToDdMmYyyy(prev.dateOfExpiry)) : '',
                                    }
                                  : c
                              ),
                            }));
                          }}
                          className="w-4 h-4 accent-[#101010] rounded cursor-pointer"
                        />
                        <div>
                          <span className="text-sm font-bold font-mono text-[#101010]">
                            Class {clsItem.classCode}
                          </span>
                          <span className="block text-[10px] text-[#101010]/60 font-semibold">
                            {clsItem.classCode === 'A' && 'Motorcycles & Tricycles'}
                            {clsItem.classCode === 'A1' && 'Light Motorcycles'}
                            {clsItem.classCode === 'A2' && 'Heavy Motorcycles'}
                            {clsItem.classCode === 'A3' && 'Tricycles / Bajaj'}
                            {clsItem.classCode === 'B' && 'Private Passenger Vehicles'}
                            {clsItem.classCode === 'C' && 'Public Service Vehicles (PSV)'}
                            {clsItem.classCode === 'C1' && 'Light Bus'}
                            {clsItem.classCode === 'C2' && 'Medium Bus'}
                            {clsItem.classCode === 'C3' && 'Heavy Bus / Coaster'}
                            {clsItem.classCode === 'D' && 'Commercial Heavy Trucks'}
                            {clsItem.classCode === 'E' && 'Articulated / Trailer Vehicles'}
                            {clsItem.classCode === 'F' && 'Tractors & Farm Machinery'}
                            {clsItem.classCode === 'G' && 'Construction Heavy Equipment'}
                          </span>
                        </div>
                      </label>

                      {/* Dates Inputs & COPY TO Button */}
                      <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 flex-1 justify-end w-full sm:w-auto min-w-0">
                        <div className="flex-1 sm:flex-initial sm:w-32 min-w-0">
                          <FloatingDatePicker
                            id={`cls_issue_${clsItem.classCode}`}
                            label="Issue Date"
                            value={clsItem.issueDate}
                            disabled={!clsItem.enabled}
                            noManualTyping={true}
                            dateFormat="DD/MM/YYYY"
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                classes: prev.classes.map((c) =>
                                  c.classCode === clsItem.classCode ? { ...c, issueDate: val } : c
                                ),
                              }));
                            }}
                          />
                        </div>

                        <div className="flex-1 sm:flex-initial sm:w-32 min-w-0">
                          <FloatingDatePicker
                            id={`cls_expiry_${clsItem.classCode}`}
                            label="Expiry Date"
                            value={clsItem.expiryDate}
                            disabled={!clsItem.enabled}
                            noManualTyping={true}
                            dateFormat="DD/MM/YYYY"
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                classes: prev.classes.map((c) =>
                                  c.classCode === clsItem.classCode ? { ...c, expiryDate: val } : c
                                ),
                              }));
                            }}
                          />
                        </div>

                        {/* COPY TO Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setCopyModalState({
                              isOpen: true,
                              sourceClassCode: clsItem.classCode,
                              sourceIssueDate: clsItem.issueDate,
                              sourceExpiryDate: clsItem.expiryDate,
                            });
                          }}
                          disabled={!clsItem.enabled || !canCopy}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                            canCopy && clsItem.enabled
                              ? 'bg-[#101010] hover:bg-[#252525] text-amber-400 shadow-xs'
                              : 'bg-[#E7E2DE] text-[#101010]/40 cursor-not-allowed'
                          }`}
                          title="Copy these dates to other vehicle classes"
                        >
                          <Copy className="w-3.5 h-3.5 shrink-0" />
                          <span>COPY TO</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: PHOTOGRAPH & SIGNATURE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 sm:p-5 bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl shadow-xs flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
                  Driver Photograph (285 × 309 Frame Ratio)
                </h2>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <PassportPhotoUpload
                  value={formData.photoUrl}
                  onChange={(url) => setFormData((prev) => ({ ...prev, photoUrl: url }))}
                />
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl shadow-xs flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
                  Driver Signature Specimen (Transparent PNG)
                </h2>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <SignaturePad
                  value={formData.signatureUrl}
                  onChange={(url) => setFormData((prev) => ({ ...prev, signatureUrl: url }))}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: STATUTORY TERMS */}
          <div className="p-4 sm:p-5 bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
                Terms and Conditions Acceptance
              </h2>
            </div>
            <TermsAndConditions
              checked={formData.termsAccepted}
              onChange={(acc) => setFormData((prev) => ({ ...prev, termsAccepted: acc }))}
              showWarning={touched.terms && !formData.termsAccepted}
            />
            {touched.terms && errors.terms && (
              <p className="text-xs text-red-600 font-semibold">{errors.terms}</p>
            )}
          </div>

          {/* Form Control Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-[#C8C2BE]">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-3 rounded-2xl bg-white hover:bg-[#F5F2EF] text-[#101010] border border-[#C8C2BE] text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Cancel</span>
            </button>

            <button
              type="submit"
              disabled={!canContinue || isProcessing}
              className={`px-6 py-3.5 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-95 ${
                canContinue && !isProcessing
                  ? 'bg-[#101010] hover:bg-[#252525]'
                  : 'bg-gray-400 cursor-not-allowed opacity-60'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Licence...</span>
                </>
              ) : (
                <>
                  <span>Auto-Fill & Generate Licence</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <AppFooter />

      {/* Service Menu Drawer */}
      <ServiceMenuDrawer
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
        onSelectInfoService={(srv) => {
          setIsMenuDrawerOpen(false);
          if (srv.id === 'nida') {
            setActiveScreen('nida');
          } else if (srv.id === 'driving_license') {
            setActiveScreen('driving_license');
          }
        }}
      />

      {/* COPY TO Modal */}
      <CopyToModal
        isOpen={copyModalState.isOpen}
        sourceClassCode={copyModalState.sourceClassCode}
        sourceIssueDate={copyModalState.sourceIssueDate}
        sourceExpiryDate={copyModalState.sourceExpiryDate}
        allClasses={formData.classes}
        onApply={handleApplyCopyTo}
        onClose={() => setCopyModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Submission Steps Progress Modal */}
      <SubmissionProgressModal
        isOpen={isSubmissionModalOpen}
        steps={submissionSteps}
        currentStepId={currentStepId as any}
        isCompleted={isWorkflowCompleted}
        error={submissionError}
        onRetry={executeSubmissionWorkflow}
        onClose={() => {
          setIsSubmissionModalOpen(false);
          setIsProcessing(false);
        }}
        title="Driving Licence Form Submission"
      />
    </div>
  );
};
