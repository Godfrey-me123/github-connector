// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
import React, { useState, useEffect } from "react";
import { CreditCard, User, ArrowRight, CheckCircle2, Shield, AlertCircle } from "lucide-react";
import { FloatingInput } from "./FloatingInput";
import { FloatingSelect } from "./FloatingSelect";
import { FloatingDatePicker } from "./FloatingDatePicker";
import { PassportPhotoUpload } from "./PassportPhotoUpload";
import { SignaturePad } from "./SignaturePad";
import { TermsAndConditions } from "./TermsAndConditions";
import { SubmissionProgressModal } from "./SubmissionProgressModal";
import { ServiceMenuDrawer } from "../navigation/ServiceMenuDrawer";
import { AppFooter } from "../common/AppFooter";
import { UniversalBackButton } from "../common/UniversalBackButton";
import { useTemplateStore } from "../../store/useTemplateStore";
import { applyTemplateMapping } from "../../utils/templateMappingEngine";
import { formatToDdMmYyyy, toTitleCase } from "../../utils/dateValidation";
import { WorkflowStep, SubmissionStepId } from "./submissionWorkflow";

export interface NrcZambiaFormData {
  nrcNumber: string;
  fullName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  district: string;
  village: string;
  chief: string;
  dateOfIssue: string;
  gender: string;
  photoUrl?: string | null;
  signatureUrl?: string | null;
  termsAccepted: boolean;
}

export interface NrcZambiaFormScreenProps {
  onCancel?: () => void;
  onSuccess?: (data: NrcZambiaFormData) => void;
}

const ZAMBIA_DISTRICTS = [
  "Lusaka", "Ndola", "Kitwe", "Livingstone", "Kabwe", "Chingola",
  "Mufulira", "Luanshya", "Kasama", "Chipata", "Solwezi", "Mongu",
  "Choma", "Mansa", "Kafue", "Mazabuka", "Monze", "Mpika", "Samfya"
];

export const NrcZambiaFormScreen: React.FC<NrcZambiaFormScreenProps> = ({ onCancel, onSuccess }) => {
  const {
    setActiveScreen,
    setNidaSuccessNotification,
    setPopulatedCardPair,
    saveNidaSubmissionRecord,
    lastNrcFormData,
    setLastNrcFormData,
    getUniversalFrontTemplate,
    getUniversalBackTemplate,
    loadTemplate,
    pushHistoryState,
  } = useTemplateStore();

  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);

  const [formData, setFormData] = useState<NrcZambiaFormData>(() => {
    if (lastNrcFormData && typeof lastNrcFormData === "object") {
      return {
        nrcNumber: typeof lastNrcFormData.nrcNumber === "string" ? lastNrcFormData.nrcNumber : "",
        fullName: typeof lastNrcFormData.fullName === "string" ? lastNrcFormData.fullName : "",
        dateOfBirth: typeof lastNrcFormData.dateOfBirth === "string" ? formatToDdMmYyyy(lastNrcFormData.dateOfBirth) : "",
        placeOfBirth: typeof lastNrcFormData.placeOfBirth === "string" ? lastNrcFormData.placeOfBirth : "",
        district: typeof lastNrcFormData.district === "string" ? lastNrcFormData.district : "Lusaka",
        village: typeof lastNrcFormData.village === "string" ? lastNrcFormData.village : "",
        chief: typeof lastNrcFormData.chief === "string" ? lastNrcFormData.chief : "",
        dateOfIssue: typeof lastNrcFormData.dateOfIssue === "string" ? formatToDdMmYyyy(lastNrcFormData.dateOfIssue) : "",
        gender: typeof lastNrcFormData.gender === "string" && lastNrcFormData.gender ? lastNrcFormData.gender : "Male",
        photoUrl: lastNrcFormData.photoUrl || null,
        signatureUrl: lastNrcFormData.signatureUrl || null,
        termsAccepted: !!lastNrcFormData.termsAccepted,
      };
    }
    return {
      nrcNumber: "",
      fullName: "",
      dateOfBirth: "",
      placeOfBirth: "",
      district: "Lusaka",
      village: "",
      chief: "",
      dateOfIssue: "",
      gender: "Male",
      photoUrl: null,
      signatureUrl: null,
      termsAccepted: false,
    };
  });

  useEffect(() => {
    setLastNrcFormData(formData);
  }, [formData, setLastNrcFormData]);

  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [isWorkflowCompleted, setIsWorkflowCompleted] = useState(false);
  const [currentStepId, setCurrentStepId] = useState<SubmissionStepId | null>(null);

  const [submissionSteps, setSubmissionSteps] = useState<WorkflowStep[]>([
    {
      id: "step1_fields",
      stepNumber: 1,
      label: "Validate NRC Details",
      description: "Checking NRC registration number, name and origin",
      status: "pending",
    },
    {
      id: "step3_photo",
      stepNumber: 2,
      label: "Biometric Portrait",
      description: "Verifying applicant photograph crop",
      status: "pending",
    },
    {
      id: "step4_signature",
      stepNumber: 3,
      label: "Applicant Signature",
      description: "Checking specimen signature or sign mark",
      status: "pending",
    },
    {
      id: "step6_template",
      stepNumber: 4,
      label: "Load Universal Template",
      description: "Preparing official NRC card templates",
      status: "pending",
    },
    {
      id: "step7_mapping",
      stepNumber: 5,
      label: "Format NRC Fields",
      description: "Mapping provincial credentials and barcode sync",
      status: "pending",
    },
    {
      id: "step8_populate",
      stepNumber: 6,
      label: "Generate Card Output",
      description: "Compiling front and back NRC templates",
      status: "pending",
    },
    {
      id: "step9_open",
      stepNumber: 7,
      label: "Ready for Output",
      description: "Opening preview and export screen",
      status: "pending",
    },
  ]);

  const validateField = (name: string, value: any): string => {
    switch (name) {
      case "nrcNumber":
        if (!value || typeof value !== "string" || !value.trim()) return "NRC Number is required";
        if (value.trim().length < 5) return "Invalid NRC Number format (e.g. 123456/78/1)";
        return "";
      case "fullName":
        if (!value || typeof value !== "string" || !value.trim()) return "Full Name is required";
        if (value.trim().length < 3) return "Full Name is too short";
        return "";
      case "dateOfBirth":
        if (!value || typeof value !== "string" || !value.trim()) return "Date of Birth is required";
        return "";
      case "dateOfIssue":
        if (!value || typeof value !== "string" || !value.trim()) return "Date of Issue is required";
        return "";
      case "district":
        if (!value) return "District is required";
        return "";
      case "gender":
        if (!value) return "Gender is required";
        return "";
      case "photoUrl":
        if (!value) return "Passport photo is required";
        return "";
      case "signatureUrl":
        if (!value) return "Applicant signature is required";
        return "";
      case "termsAccepted":
        if (!value) return "You must accept the terms & conditions";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (field: keyof NrcZambiaFormData, valOrEvent: any) => {
    let value = valOrEvent;
    if (valOrEvent && typeof valOrEvent === "object" && "target" in valOrEvent) {
      value = valOrEvent.target.value;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleBlur = (field: keyof NrcZambiaFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    const fieldsToValidate: (keyof NrcZambiaFormData)[] = [
      "nrcNumber",
      "fullName",
      "dateOfBirth",
      "dateOfIssue",
      "district",
      "gender",
      "photoUrl",
      "signatureUrl",
      "termsAccepted",
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
      nrcNumber: true,
      fullName: true,
      dateOfBirth: true,
      dateOfIssue: true,
      district: true,
      gender: true,
      photoUrl: true,
      signatureUrl: true,
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

    const updateStep = (
      id: SubmissionStepId,
      status: "pending" | "in_progress" | "completed" | "failed",
      errorMessage?: string,
    ) => {
      setSubmissionSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status, errorMessage } : s)),
      );
    };

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // Step 1: Validate Fields
      setCurrentStepId("step1_fields");
      updateStep("step1_fields", "in_progress");
      await delay(250);
      updateStep("step1_fields", "completed");

      // Step 2: Photo
      setCurrentStepId("step3_photo");
      updateStep("step3_photo", "in_progress");
      await delay(250);
      if (!formData.photoUrl) {
        updateStep("step3_photo", "failed", "Applicant photograph is required.");
        setWorkflowError("Photograph is required.");
        setIsSubmitting(false);
        return;
      }
      updateStep("step3_photo", "completed");

      // Step 3: Signature
      setCurrentStepId("step4_signature");
      updateStep("step4_signature", "in_progress");
      await delay(250);
      if (!formData.signatureUrl) {
        updateStep("step4_signature", "failed", "Applicant signature is required.");
        setWorkflowError("Signature is required.");
        setIsSubmitting(false);
        return;
      }
      updateStep("step4_signature", "completed");

      // Step 4: Load Universal Templates
      setCurrentStepId("step6_template");
      updateStep("step6_template", "in_progress");
      await delay(250);
      const frontTemplate = getUniversalFrontTemplate("nrc_zambia");
      const backTemplate = getUniversalBackTemplate("nrc_zambia");

      if (!frontTemplate || !backTemplate) {
        updateStep("step6_template", "failed", "NRC Zambia universal template missing.");
        setWorkflowError("NRC Zambia universal template not found.");
        setIsSubmitting(false);
        return;
      }
      updateStep("step6_template", "completed");

      // Step 5 & 6: Map & Populate
      setCurrentStepId("step7_mapping");
      updateStep("step7_mapping", "in_progress");
      await delay(250);
      updateStep("step7_mapping", "completed");

      setCurrentStepId("step8_populate");
      updateStep("step8_populate", "in_progress");
      await delay(300);

      const formattedName = toTitleCase(formData.fullName.trim());
      const formattedDob = formatToDdMmYyyy(formData.dateOfBirth);
      const formattedIssue = formatToDdMmYyyy(formData.dateOfIssue);
      const formattedGender = formData.gender.trim().toLowerCase().startsWith("m") ? "MALE" : "FEMALE";
      const formattedPlace = toTitleCase(formData.placeOfBirth.trim() || formData.district);
      const formattedVillage = toTitleCase(formData.village.trim() || "-");
      const formattedChief = toTitleCase(formData.chief.trim() || "-");

      const mappedFormData = {
        nrcNumber: formData.nrcNumber.trim(),
        nrc_number: formData.nrcNumber.trim(),
        nrcNo: formData.nrcNumber.trim(),
        cardNumber: formData.nrcNumber.trim(),
        fullName: formattedName,
        full_name: formattedName,
        name: formattedName,
        gender: formattedGender,
        sex: formattedGender,
        dateOfBirth: formattedDob,
        date_of_birth: formattedDob,
        dob: formattedDob,
        dateOfIssue: formattedIssue,
        date_of_issue: formattedIssue,
        issue_date: formattedIssue,
        placeOfBirth: formattedPlace,
        place_of_birth: formattedPlace,
        district: formData.district,
        village: formattedVillage,
        chief: formattedChief,
        photoUrl: formData.photoUrl,
        photo: formData.photoUrl,
        signatureUrl: formData.signatureUrl,
        signature: formData.signatureUrl,
      };

      const frontRes = applyTemplateMapping(frontTemplate, mappedFormData as any);
      const backRes = applyTemplateMapping(backTemplate, mappedFormData as any);

      if (!frontRes.success) {
        updateStep("step8_populate", "failed", frontRes.error || "Failed to populate NRC card.");
        setWorkflowError(frontRes.error || "Failed to populate NRC layers.");
        setIsSubmitting(false);
        return;
      }

      // Save submission record
      const submissionRecord = {
        id: `nrc_${Date.now()}`,
        nidaNumber: formData.nrcNumber.trim(),
        firstName: formattedName,
        secondName: "",
        thirdName: "",
        dateOfBirth: formattedDob,
        gender: formattedGender.startsWith("M") ? "M" : "F",
        photo: formData.photoUrl || undefined,
        signature: formData.signatureUrl || undefined,
        submittedAt: new Date().toISOString(),
      };
      await saveNidaSubmissionRecord(submissionRecord as any);

      const populatedFront = frontRes.populatedTemplate || frontTemplate;
      const populatedBack = backRes.populatedTemplate || backTemplate;

      setPopulatedCardPair(populatedFront, populatedBack, mappedFormData);
      loadTemplate(populatedFront);
      pushHistoryState(populatedFront);

      updateStep("step8_populate", "completed");

      // Step 7: Open Preview
      setCurrentStepId("step9_open");
      updateStep("step9_open", "in_progress");
      await delay(250);

      const accessVal = useTemplateStore.getState().validateServiceAccess("nrc_zambia");
      if (!accessVal.allowed) {
        updateStep("step9_open", "failed", accessVal.message || "Payment or tokens required.");
        setWorkflowError(accessVal.message || "Payment or token usage required.");
        setIsSubmitting(false);
        return;
      }

      updateStep("step9_open", "completed");
      setIsWorkflowCompleted(true);
      setIsSubmitting(false);

      setNidaSuccessNotification({
        title: "NRC Card Populated",
        message: "Front and back NRC card design compiled with sample credentials.",
        populatedCount: (frontRes.populatedCount || 0) + (backRes.populatedCount || 0),
        isBackSide: false,
      });

      onSuccess?.(formData);

      setTimeout(() => {
        setShowProgressModal(false);
        setActiveScreen("preview");
      }, 400);
    } catch (err: any) {
      console.error("NRC form submission failed:", err);
      setWorkflowError(err?.message || "An unexpected error occurred during card population.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EF] text-[#101010] flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-[#C8C2BE] bg-[#FFFFFF] px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UniversalBackButton target="home" fallbackLabel="Dashboard" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#101010]/60">
                  Republic of Zambia
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  NRC Card
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#101010] flex items-center gap-2">
                NRC card-zambia
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[11px] font-semibold text-[#101010]/70 bg-[#F5F2EF] px-2.5 py-1 rounded-lg border border-[#C8C2BE]">
              1 Token / Card
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Form */}
      <div className="max-w-4xl mx-auto w-full px-4 py-6 flex-1">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sample Card Notice */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold block text-sm">SAMPLE NOTICE</span>
              All outputs produced are design mockups clearly designated as <strong>SAMPLE — NOT A VALID ID</strong> for testing and layout purposes.
            </div>
          </div>

          {/* Section 1: Identification */}
          <div className="bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E7E2DE] pb-3">
              <CreditCard className="w-4 h-4 text-[#101010]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
                1. Identification Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FloatingInput
                label="NRC Number"
                value={formData.nrcNumber}
                onChange={(e) => handleChange("nrcNumber", e)}
                onBlur={() => handleBlur("nrcNumber")}
                error={touched.nrcNumber ? errors.nrcNumber : undefined}
                helperText="e.g. 123456/78/1"
                required
              />

              <FloatingInput
                label="Full Name"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e)}
                onBlur={() => handleBlur("fullName")}
                error={touched.fullName ? errors.fullName : undefined}
                helperText="First and Surname"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FloatingSelect
                label="Gender"
                value={formData.gender}
                onChange={(e) => handleChange("gender", e)}
                onBlur={() => handleBlur("gender")}
                error={touched.gender ? errors.gender : undefined}
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                ]}
              />

              <FloatingDatePicker
                label="Date of Birth"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange("dateOfBirth", e)}
                error={touched.dateOfBirth ? errors.dateOfBirth : undefined}
              />

              <FloatingDatePicker
                label="Date of Issue"
                value={formData.dateOfIssue}
                onChange={(e) => handleChange("dateOfIssue", e)}
                error={touched.dateOfIssue ? errors.dateOfIssue : undefined}
              />
            </div>
          </div>

          {/* Section 2: Origin & Registration */}
          <div className="bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E7E2DE] pb-3">
              <Shield className="w-4 h-4 text-[#101010]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
                2. Origin & Place of Registration
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FloatingInput
                label="Place of Birth"
                value={formData.placeOfBirth}
                onChange={(e) => handleChange("placeOfBirth", e)}
                onBlur={() => handleBlur("placeOfBirth")}
                helperText="Town or Health Center"
              />

              <FloatingSelect
                label="District"
                value={formData.district}
                onChange={(e) => handleChange("district", e)}
                options={ZAMBIA_DISTRICTS.map((d) => ({ value: d, label: d }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FloatingInput
                label="Village"
                value={formData.village}
                onChange={(e) => handleChange("village", e)}
                onBlur={() => handleBlur("village")}
                helperText="Village of origin"
              />

              <FloatingInput
                label="Chief"
                value={formData.chief}
                onChange={(e) => handleChange("chief", e)}
                onBlur={() => handleBlur("chief")}
                helperText="Traditional Chief"
              />
            </div>
          </div>

          {/* Section 3: Biometrics */}
          <div className="bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl p-5 shadow-xs space-y-6">
            <div className="flex items-center gap-2 border-b border-[#E7E2DE] pb-3">
              <User className="w-4 h-4 text-[#101010]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
                3. Biometrics & Specimen Signature
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101010] mb-2">
                  Passport Photograph
                </label>
                <PassportPhotoUpload
                  value={formData.photoUrl}
                  onChange={(photo) => handleChange("photoUrl", photo)}
                />
                {touched.photoUrl && errors.photoUrl && (
                  <p className="text-xs text-rose-500 font-medium mt-1">{errors.photoUrl}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101010] mb-2">
                  Applicant Signature
                </label>
                <SignaturePad
                  value={formData.signatureUrl}
                  onChange={(sig) => handleChange("signatureUrl", sig)}
                />
                {touched.signatureUrl && errors.signatureUrl && (
                  <p className="text-xs text-rose-500 font-medium mt-1">{errors.signatureUrl}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Terms and Submission */}
          <div className="bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl p-5 shadow-xs space-y-4">
            <TermsAndConditions
              checked={formData.termsAccepted}
              onChange={(checked) => handleChange("termsAccepted", checked)}
            />
            {touched.termsAccepted && errors.termsAccepted && (
              <p className="text-xs text-rose-500 font-medium">{errors.termsAccepted}</p>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => (onCancel ? onCancel() : setActiveScreen("home"))}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#C8C2BE] text-[#101010] hover:bg-[#F5F2EF] font-medium transition-colors text-sm cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#101010] hover:bg-[#252525] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>Generate NRC Card</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>

      <AppFooter />

      {/* Navigation Menu Drawer */}
      <ServiceMenuDrawer isOpen={isMenuDrawerOpen} onClose={() => setIsMenuDrawerOpen(false)} />

      {/* Submission Progress Modal */}
      <SubmissionProgressModal
        isOpen={showProgressModal}
        steps={submissionSteps}
        currentStepId={currentStepId}
        isCompleted={isWorkflowCompleted}
        error={workflowError}
        onClose={() => setShowProgressModal(false)}
        title="NRC Zambia Card Workflow"
      />
    </div>
  );
};
