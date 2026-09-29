import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  User,
  ArrowRight,
  CheckCircle2,
  Menu,
} from 'lucide-react';
import { FloatingInput } from './FloatingInput';
import { FloatingSelect } from './FloatingSelect';
import { FloatingDatePicker } from './FloatingDatePicker';
import { PassportPhotoUpload } from './PassportPhotoUpload';
import { TermsAndConditions } from './TermsAndConditions';
import { SubmissionProgressModal } from './SubmissionProgressModal';
import { ServiceMenuDrawer } from '../navigation/ServiceMenuDrawer';
import { AppFooter } from '../common/AppFooter';
import { UniversalBackButton } from '../common/UniversalBackButton';
import { useTemplateStore } from '../../store/useTemplateStore';
import { applyTemplateMapping } from '../../utils/templateMappingEngine';
import { formatToDdMmYyyy, formatToMmmDdYyyy, toTitleCase } from '../../utils/dateValidation';
import { WorkflowStep, SubmissionStepId } from './submissionWorkflow';

export interface NhifFormData {
  cardNumber: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  cardStatus: string;
  photoUrl?: string | null;
  termsAccepted: boolean;
}

export interface NhifFormScreenProps {
  onCancel?: () => void;
  onSuccess?: (data: NhifFormData) => void;
}

export const NhifFormScreen: React.FC<NhifFormScreenProps> = ({ onCancel, onSuccess }) => {
  const {
    setActiveScreen,
    setNidaSuccessNotification,
    setPopulatedCardPair,
    saveNidaSubmissionRecord,
    lastNhifFormData,
    setLastNhifFormData,
    getUniversalFrontTemplate,
    getUniversalBackTemplate,
    loadTemplate,
    pushHistoryState,
  } = useTemplateStore();

  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);

  const [formData, setFormData] = useState<NhifFormData>(() => {
    if (lastNhifFormData && typeof lastNhifFormData === 'object') {
      return {
        cardNumber: typeof lastNhifFormData.cardNumber === 'string' ? lastNhifFormData.cardNumber : '',
        fullName: typeof lastNhifFormData.fullName === 'string' ? lastNhifFormData.fullName : '',
        gender: typeof lastNhifFormData.gender === 'string' && lastNhifFormData.gender ? lastNhifFormData.gender : 'Male',
        dateOfBirth: typeof lastNhifFormData.dateOfBirth === 'string' && lastNhifFormData.dateOfBirth ? formatToDdMmYyyy(lastNhifFormData.dateOfBirth) : '',
        cardStatus: typeof lastNhifFormData.cardStatus === 'string' && lastNhifFormData.cardStatus ? lastNhifFormData.cardStatus : 'Active',
        photoUrl: lastNhifFormData.photoUrl || null,
        termsAccepted: !!lastNhifFormData.termsAccepted,
      };
    }
    return {
      cardNumber: '',
      fullName: '',
      gender: 'Male',
      dateOfBirth: '',
      cardStatus: 'Active',
      photoUrl: null,
      termsAccepted: false,
    };
  });

  useEffect(() => {
    setLastNhifFormData(formData);
  }, [formData, setLastNhifFormData]);

  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [isWorkflowCompleted, setIsWorkflowCompleted] = useState(false);
  const [currentStepId, setCurrentStepId] = useState<SubmissionStepId | null>(null);

  const [submissionSteps, setSubmissionSteps] = useState<WorkflowStep[]>([
    { id: 'step1_fields', stepNumber: 1, label: 'Validate Member Details', description: 'Checking card number and full name', status: 'pending' },
    { id: 'step3_photo', stepNumber: 2, label: 'Biometric Photograph', description: 'Verifying portrait photo aspect ratio', status: 'pending' },
    { id: 'step6_template', stepNumber: 3, label: 'Load Universal Template', description: 'Preparing official NHIF card templates', status: 'pending' },
    { id: 'step7_mapping', stepNumber: 4, label: 'Format NHIF Credentials', description: 'Mapping membership fields & QR code', status: 'pending' },
    { id: 'step8_populate', stepNumber: 5, label: 'Generate Card Output', description: 'Compiling front and back NHIF templates', status: 'pending' },
    { id: 'step9_open', stepNumber: 6, label: 'Ready for Output', description: 'Opening preview and export screen', status: 'pending' },
  ]);

  const validateField = (name: string, value: any): string => {
    switch (name) {
      case 'cardNumber':
        if (!value || typeof value !== 'string' || !value.trim()) return 'Card Number is required';
        if (value.trim().length < 5) return 'Invalid Card Number format';
        return '';
      case 'fullName':
        if (!value || typeof value !== 'string' || !value.trim()) return 'Full Name is required';
        if (value.trim().length < 3) return 'Full Name is too short';
        return '';
      case 'gender':
        if (!value) return 'Gender selection is required';
        return '';
      case 'dateOfBirth':
        if (!value || typeof value !== 'string' || !value.trim()) return 'Date of Birth is required';
        return '';
      case 'photoUrl':
        if (!value) return 'Passport photo is required';
        return '';
      case 'termsAccepted':
        if (!value) return 'You must accept the terms & conditions';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (field: keyof NhifFormData, valOrEvent: any) => {
    let value = valOrEvent;
    if (valOrEvent && typeof valOrEvent === 'object' && 'target' in valOrEvent) {
      value = valOrEvent.target.value;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleBlur = (field: keyof NhifFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    const fieldsToValidate: (keyof NhifFormData)[] = [
      'cardNumber',
      'fullName',
      'gender',
      'dateOfBirth',
      'photoUrl',
      'termsAccepted',
    ];

    fieldsToValidate.forEach((field) => {
      const err = validateField(field, formData[field]);
      if (err) {
        newErrors[field] = err;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched({
      cardNumber: true,
      fullName: true,
      gender: true,
      dateOfBirth: true,
      photoUrl: true,
      termsAccepted: true,
    });

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setShowProgressModal(true);
    setWorkflowError(null);
    setIsWorkflowCompleted(false);

    const updateStep = (id: SubmissionStepId, status: 'pending' | 'in_progress' | 'completed' | 'failed', errorMessage?: string) => {
      setSubmissionSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status, errorMessage } : s))
      );
    };

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // Step 1: Validate Fields
      setCurrentStepId('step1_fields');
      updateStep('step1_fields', 'in_progress');
      await delay(250);
      updateStep('step1_fields', 'completed');

      // Step 2: Photo
      setCurrentStepId('step3_photo');
      updateStep('step3_photo', 'in_progress');
      await delay(250);
      if (!formData.photoUrl) {
        updateStep('step3_photo', 'failed', 'Member passport photo is required.');
        setWorkflowError('Passport photo is required.');
        setIsSubmitting(false);
        return;
      }
      updateStep('step3_photo', 'completed');

      // Step 3: Load Universal Templates
      setCurrentStepId('step6_template');
      updateStep('step6_template', 'in_progress');
      await delay(250);
      const frontTemplate = getUniversalFrontTemplate('nhif');
      const backTemplate = getUniversalBackTemplate('nhif');

      if (!frontTemplate || !backTemplate) {
        updateStep('step6_template', 'failed', 'NHIF universal template missing.');
        setWorkflowError('NHIF universal template not found.');
        setIsSubmitting(false);
        return;
      }
      updateStep('step6_template', 'completed');

      // Step 4 & 5: Map & Populate
      setCurrentStepId('step7_mapping');
      updateStep('step7_mapping', 'in_progress');
      await delay(250);
      updateStep('step7_mapping', 'completed');

      setCurrentStepId('step8_populate');
      updateStep('step8_populate', 'in_progress');
      await delay(300);

      const formattedName = toTitleCase(formData.fullName.trim());
      const formattedDob = formatToMmmDdYyyy(formData.dateOfBirth);
      const formattedGender = formData.gender.trim().toLowerCase().startsWith('m') ? 'Male' : 'Female';
      const formattedStatus = toTitleCase(formData.cardStatus || 'Active');

      const mappedFormData = {
        cardNumber: formData.cardNumber.trim(),
        card_no: formData.cardNumber.trim(),
        cardNo: formData.cardNumber.trim(),
        fullName: formattedName,
        full_name: formattedName,
        gender: formattedGender,
        dateOfBirth: formattedDob,
        date_of_birth: formattedDob,
        dob: formattedDob,
        cardStatus: formattedStatus,
        card_status: formattedStatus,
        photoUrl: formData.photoUrl,
        passportPhoto: formData.photoUrl,
      };

      const frontRes = applyTemplateMapping(frontTemplate, mappedFormData as any);
      const backRes = applyTemplateMapping(backTemplate, mappedFormData as any);

      if (!frontRes.success) {
        updateStep('step8_populate', 'failed', frontRes.error || 'Failed to populate NHIF card.');
        setWorkflowError(frontRes.error || 'Failed to populate NHIF layers.');
        setIsSubmitting(false);
        return;
      }

      // Save submission record
      const submissionRecord = {
        id: `nhif_${Date.now()}`,
        nidaNumber: formData.cardNumber.trim(),
        firstName: formData.fullName.trim(),
        secondName: '',
        thirdName: '',
        dateOfBirth: formatToDdMmYyyy(formData.dateOfBirth),
        gender: formData.gender === 'Female' ? 'F' : 'M',
        photo: formData.photoUrl || undefined,
        submittedAt: new Date().toISOString(),
      };
      await saveNidaSubmissionRecord(submissionRecord as any);

      const populatedFront = frontRes.populatedTemplate || frontTemplate;
      const populatedBack = backRes.populatedTemplate || backTemplate;

      setPopulatedCardPair(populatedFront, populatedBack, mappedFormData);
      loadTemplate(populatedFront);
      pushHistoryState(populatedFront);

      updateStep('step8_populate', 'completed');

      // Step 6: Ready for Output
      setCurrentStepId('step9_open');
      updateStep('step9_open', 'in_progress');
      await delay(250);

      const accessVal = useTemplateStore.getState().validateServiceAccess('nhif');
      if (!accessVal.allowed) {
        updateStep('step9_open', 'failed', accessVal.message || 'Access Required.');
        setWorkflowError(accessVal.message || 'Access Required: Please recharge.');
        setIsSubmitting(false);
        return;
      }

      updateStep('step9_open', 'completed');
      setIsWorkflowCompleted(true);
      setIsSubmitting(false);

      setNidaSuccessNotification({
        title: 'NHIF Membership Card Generated!',
        message: `Front & Back NHIF templates successfully populated with member credentials.`,
        populatedCount: (frontRes.populatedCount || 0) + (backRes.populatedCount || 0),
        isBackSide: false,
      });

      if (onSuccess) {
        onSuccess(formData);
      }

      setTimeout(() => {
        setShowProgressModal(false);
        setActiveScreen('preview');
      }, 1000);
    } catch (err: any) {
      console.error('Error generating NHIF Card:', err);
      setWorkflowError(err?.message || 'An error occurred while generating the NHIF card.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#D8D2CE] text-[#101010] flex flex-col items-center justify-start p-3 sm:p-6 lg:p-10 font-sans overflow-y-auto pb-24 sm:pb-12">
      {/* Main Container Card */}
      <div className="relative w-full max-w-2xl bg-[#E7E2DE] border border-[#C8C2BE] rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-8 lg:p-9 my-2 sm:my-4 transition-all">
        
        {/* Clean Header: ← NHIF Membership Card */}
        <div className="flex items-center justify-between border-b border-[#C8C2BE] pb-4 mb-5">
          <div className="flex items-center gap-2">
            {onCancel ? (
              <UniversalBackButton onClickCustom={onCancel} />
            ) : (
              <UniversalBackButton />
            )}
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#101010]">
              NHIF Membership Card
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F5F2EF] text-[#101010] border border-[#C8C2BE] text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs active:scale-95"
            title="Open Services Menu"
          >
            <Menu className="w-3.5 h-3.5 text-[#101010]" />
            <span className="text-[11px]">Menu</span>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Member Credentials */}
          <div className="p-4 sm:p-5 bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-[#E7E9EB] pb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#101010]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
                Member Credentials
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card Number */}
              <div>
                <FloatingInput
                  label="Card Number *"
                  icon={CreditCard}
                  value={formData.cardNumber}
                  onChange={(val) => handleChange('cardNumber', val)}
                  onBlur={() => handleBlur('cardNumber')}
                  error={touched.cardNumber ? errors.cardNumber : ''}
                  placeholder="e.g. 1234567890"
                  required
                />
              </div>

              {/* Full Name */}
              <div>
                <FloatingInput
                  label="Full Name *"
                  icon={User}
                  value={formData.fullName}
                  onChange={(val) => handleChange('fullName', val)}
                  onBlur={() => handleBlur('fullName')}
                  error={touched.fullName ? errors.fullName : ''}
                  placeholder="e.g. John Sample Member"
                  required
                />
              </div>

              {/* Gender */}
              <div>
                <FloatingSelect
                  label="Gender *"
                  icon={User}
                  value={formData.gender}
                  onChange={(val) => handleChange('gender', val)}
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                  ]}
                  error={touched.gender ? errors.gender : ''}
                  required
                />
              </div>

              {/* Date of Birth */}
              <div>
                <FloatingDatePicker
                  label="Date of Birth *"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  error={touched.dateOfBirth ? errors.dateOfBirth : null}
                />
              </div>
            </div>

            {/* Readonly Card Status */}
            <div className="bg-[#FAF9F6] border border-[#E7E9EB] rounded-xl p-3 flex items-center justify-between text-xs mt-2">
              <span className="text-[#606060] font-medium">Membership Status:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Active
              </span>
            </div>
          </div>

          {/* Section 2: Member Passport Photo */}
          <div className="p-4 sm:p-5 bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-[#E7E9EB] pb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#101010]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
                Member Passport Photo
              </h2>
            </div>

            <PassportPhotoUpload
              value={formData.photoUrl || ''}
              onChange={(url) => handleChange('photoUrl', url)}
            />
          </div>

          {/* Section 3: Terms & Submission */}
          <div className="p-4 sm:p-5 bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl space-y-5 shadow-xs">
            <TermsAndConditions
              checked={formData.termsAccepted}
              onChange={(checked) => handleChange('termsAccepted', checked)}
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => (onCancel ? onCancel() : setActiveScreen('home'))}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#C8C2BE] text-[#101010] hover:bg-[#F5F2EF] font-medium transition-colors text-sm cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#101010] hover:bg-[#252525] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>Generate NHIF Card</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>

      <AppFooter />

      {/* Navigation Menu Drawer */}
      <ServiceMenuDrawer
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
      />

      {/* Submission Progress Modal */}
      <SubmissionProgressModal
        isOpen={showProgressModal}
        steps={submissionSteps}
        currentStepId={currentStepId}
        isCompleted={isWorkflowCompleted}
        error={workflowError}
        onClose={() => setShowProgressModal(false)}
        title="NHIF Membership Form Workflow"
      />
    </div>
  );
};
