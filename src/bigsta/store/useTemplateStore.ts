// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
let isPaymentRequestsSubscribed = false;
let unsubscribePaymentRequests: (() => void) | null = null;

export function unsubscribePaymentRequestsListener() {
  if (unsubscribePaymentRequests) {
    try {
      unsubscribePaymentRequests();
    } catch (e) {
      console.warn("[Supabase] Failed to remove payment_requests channel:", e);
    }
    unsubscribePaymentRequests = null;
  }
  isPaymentRequestsSubscribed = false;
}
import { create } from "zustand";
import {
  CardTemplate,
  Layer,
  TextLayer,
  Guide,
  Unit,
  GridSettings,
  SnapSettings,
  SmartGuide,
  BackgroundConfig,
  UploadedBackground,
  NidaSubmissionRecord,
  ConfigurablePaymentMethod,
  UserProfileSettings,
  UserPreferences,
  AdminSystemSettings,
  UserPaymentSubmission,
  TokenTransaction,
  LastEditingContext,
} from "../types";
import { CR80_WIDTH_MM, CR80_HEIGHT_MM } from "../utils/units";
import { SAMPLE_TEMPLATES } from "../utils/sampleTemplates";
import {
  ensureTemplateFieldIds,
  sanitizeTemplateForSaving,
  SupportedBinding,
  isBackSideTemplate,
} from "../utils/templateMappingEngine";
import {
  resolveDocumentTypeId,
  normalizeSide,
  checkTemplateCompletion,
} from "../utils/templateCategoryEngine";
import { getClosestValidWeight } from "../utils/fonts";
// import { parseUniversalGSON } from '../utils/gsonImporter';

const parseUniversalGSON = (jsonString: string, asNew: boolean) => {
  return { success: false, message: "GSON import not supported" };
};
import {
  saveTemplateDB,
  getAllTemplatesDB,
  getTemplateByIdDB,
  deleteTemplateDB,
  saveBackgroundDB,
  getAllBackgroundsDB,
  deleteBackgroundDB,
  saveStudioDraftDB,
  getStudioDraftDB,
  deleteStudioDraftDB,
} from "../utils/idb";

// Save guards: a stalled network call must never leave the Save spinner stuck.
const SAVE_TIMEOUT_MS = 45000;
const withSaveTimeout = <T,>(p: Promise<T>, label: string): Promise<T | null> =>
  Promise.race([
    p,
    new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn(`[Save] ${label} timed out after ${SAVE_TIMEOUT_MS}ms`);
        resolve(null);
      }, SAVE_TIMEOUT_MS),
    ),
  ]);

const notifySaveIssue = (msg: string) => {
  import("sonner")
    .then(({ toast }) => toast.error(msg))
    .catch(() => {});
};

export interface DynamicElementRegistration {
  id: string;
  name: string;
  type: "text";
  defaultText: string;
  bindingKey: SupportedBinding;
  getterKey: "displayNameLine1" | string;
  computeValue: (formData: Record<string, any>) => string;
  defaultWidth: number;
  defaultHeight: number;
}

export interface ManualApplicationRequest {
  id: string;
  fullName: string;
  whatsappNumber: string;
  normalCallNumber: string;
  serviceName: string;
  submittedAt: string;
  status: "PENDING" | "PROCESSING" | "APPROVED" | "COMPLETED";
  userPasskey?: string;
}

export interface ServiceValidationResult {
  allowed: boolean;
  reason?: "NOT_LOGGED_IN" | "DISABLED" | "PAYMENT_REQUIRED" | "OUT_OF_TOKENS" | "NO_CARD_DATA";
  message?: string;
  cost?: number;
  remainingUsages?: number;
  paymentStatus?: PaymentStatus;
}

export function computeDisplayNameLine1(formData: Record<string, any>): string {
  const f = (formData?.firstName || "").trim();
  const m = (formData?.middleName || "").trim();
  return m ? `${f} ${m}` : f;
}

export const DYNAMIC_ELEMENT_REGISTRY: Record<string, DynamicElementRegistration> = {
  FULL_NAME: {
    id: "full_name",
    name: "Full Name",
    type: "text",
    defaultText: "{{first_middle_name}}",
    bindingKey: "FIRST_MIDDLE_NAME",
    getterKey: "displayNameLine1",
    computeValue: (formData) => computeDisplayNameLine1(formData),
    defaultWidth: 50,
    defaultHeight: 6,
  },
  FIRST_MIDDLE_NAME: {
    id: "first_middle_name",
    name: "First Name + Middle Name",
    type: "text",
    defaultText: "{{first_middle_name}}",
    bindingKey: "FIRST_MIDDLE_NAME",
    getterKey: "displayNameLine1",
    computeValue: (formData) => computeDisplayNameLine1(formData),
    defaultWidth: 50,
    defaultHeight: 6,
  },
  FIRST_NAME: {
    id: "first_name",
    name: "First Name",
    type: "text",
    defaultText: "{{first_name}}",
    bindingKey: "FIRST_NAME",
    getterKey: "firstName",
    computeValue: (formData) => (formData?.firstName || "").trim(),
    defaultWidth: 35,
    defaultHeight: 6,
  },
  MIDDLE_NAME: {
    id: "middle_name",
    name: "Middle Name",
    type: "text",
    defaultText: "{{middle_name}}",
    bindingKey: "MIDDLE_NAME",
    getterKey: "middleName",
    computeValue: (formData) => (formData?.middleName || "").trim(),
    defaultWidth: 35,
    defaultHeight: 6,
  },
  LAST_NAME: {
    id: "last_name",
    name: "Last Name",
    type: "text",
    defaultText: "{{last_name}}",
    bindingKey: "LAST_NAME",
    getterKey: "lastName",
    computeValue: (formData) => (formData?.lastName || "").trim(),
    defaultWidth: 35,
    defaultHeight: 6,
  },
  NIDA_NUMBER: {
    id: "nida_number",
    name: "NIDA Number",
    type: "text",
    defaultText: "{{nida_number}}",
    bindingKey: "NIDA_NUMBER",
    getterKey: "nidaNumber",
    computeValue: (formData) => (formData?.nidaNumber || "").trim(),
    defaultWidth: 45,
    defaultHeight: 6,
  },
};

export type AuthRole = "admin" | "user" | null;

export type PaymentStatus = "PENDING" | "ACTIVE" | "EXHAUSTED" | "DISABLED";

export interface PasskeyUsageHistoryItem {
  id: string;
  timestamp: string;
  serviceName: string;
  details?: string;
}

export interface UsagePackage {
  id: string;
  name: string;
  usages: number;
  price: string;
  active?: boolean;
  description?: string;
  visibility?: "public" | "hidden";
  sortOrder?: number;
  bonus?: number;
  promotion?: string;
}

export interface ServiceData {
  id: string;
  name: string;
  authority: string;
  description: string;
  category: string;
  iconName: string;
  active: boolean;
  tokenCost: number;
  features: string[];
  processingMode?: "auto" | "manual";
}

export const NIDA_USAGE_PACKAGES: UsagePackage[] = [
  {
    id: "pkg_basic",
    name: "Basic Package",
    usages: 3,
    price: "TSh 10,000",
    description: "Affordable starter tokens for document generation",
    active: true,
  },
  {
    id: "pkg_standard",
    name: "Standard Package",
    usages: 7,
    price: "TSh 20,000",
    description: "Popular bundle for active card creators",
    active: true,
  },
  {
    id: "pkg_premium",
    name: "Premium Package",
    usages: 18,
    price: "TSh 45,000",
    description: "High volume card processing with priority generation",
    active: true,
  },
];

export const INITIAL_SERVICES: ServiceData[] = [
  {
    id: "nida",
    name: "NIDA Services",
    authority: "National Identification Authority",
    description:
      "Instant auto-fill, verification & CR80 card generation for Front & Back National IDs.",
    category: "identity",
    iconName: "UserCheck",
    active: true,
    tokenCost: 1,
    features: [
      "20-Digit ID Verification",
      "Biometric Photo Cropping",
      "Digital Signature Pad",
      "Barcode Sync",
    ],
    processingMode: "auto",
  },
  {
    id: "driving_license",
    name: "Driving License Services",
    authority: "Traffic & Vehicle Inspection",
    description:
      "Driver permit issuance, class endorsements & digital driver identification cards.",
    category: "civil",
    iconName: "Car",
    active: true,
    tokenCost: 1,
    features: [
      "Class Endorsements (A, B, C, D, E)",
      "Penalty Point Tracking",
      "Digital QR Validation",
    ],
    processingMode: "auto",
  },
  {
    id: "birth_certificate",
    name: "Birth Certificate Services",
    authority: "RITA Civil Registration",
    description:
      "Unofficial birth certificate issuance, verification & digital civil registry documentation.",
    category: "civil",
    iconName: "ScrollText",
    active: false,
    tokenCost: 1,
    features: [
      "Birth Certificate Archiving",
      "Legal Certification",
      "Unofficial Watermark Validation",
    ],
    processingMode: "auto",
  },
  {
    id: "passport",
    name: "Passport Services",
    authority: "Immigration Services Department",
    description: "East African e-Passport booklet formatting, bio-data pages & travel credentials.",
    category: "identity",
    iconName: "Globe",
    active: false,
    tokenCost: 1,
    features: [
      "ICAO 9303 Compliant MRZ",
      "Biometric Chip Layout",
      "Diplomatic & Ordinary Profiles",
    ],
    processingMode: "auto",
  },
  {
    id: "tin",
    name: "TIN Services",
    authority: "Tanzania Revenue Authority",
    description:
      "Taxpayer Identification Number cards, tax compliance credentials & PIN certificates.",
    category: "finance",
    iconName: "Receipt",
    active: false,
    tokenCost: 1,
    features: ["Taxpayer PIN Sync", "QR Compliance Stamp", "Corporate & Individual Formats"],
    processingMode: "auto",
  },
  {
    id: "business_license",
    name: "Business License Services",
    authority: "BRELA & Municipal Authorities",
    description:
      "Commercial enterprise registration certificates, municipal trade permits & corporate IDs.",
    category: "finance",
    iconName: "Building2",
    active: false,
    tokenCost: 1,
    features: ["BRELA Certificate Layout", "Annual Renewal Badges", "Sector Trade Validation"],
    processingMode: "auto",
  },
  {
    id: "heslb",
    name: "HESLB Student Loans Services",
    authority: "Higher Education Students’ Loans Board",
    description:
      "Student beneficiary loan allocation cards, academic verification & repayment IDs.",
    category: "education",
    iconName: "GraduationCap",
    active: false,
    tokenCost: 1,
    features: [
      "Index Number Verification",
      "Institution Allocation Status",
      "Beneficiary Smart Badges",
    ],
    processingMode: "auto",
  },
  {
    id: "nhif",
    name: "NHIF Membership Card",
    authority: "National Health Insurance Fund",
    description:
      "Healthcare membership smart cards, dependent coverage validation & biometric health passes.",
    category: "health",
    iconName: "HeartPulse",
    active: true,
    tokenCost: 1,
    features: [
      "Principal & Dependent Mapping",
      "Hospital Tier Endorsements",
      "Smart Card Chip Specs",
    ],
    processingMode: "auto",
  },
  {
    id: "nrc_zambia",
    name: "NRC card-zambia",
    authority: "National Registration Department",
    description:
      "Official Zambia National Registration Card (NRC) issuance, verification and CR80 card generation.",
    category: "identity",
    iconName: "CreditCard",
    active: true,
    tokenCost: 1,
    features: [
      "NRC Number Verification",
      "Biometric Photo Cropping",
      "Digital Signature Specimen",
      "Barcode & QR Validation",
    ],
    processingMode: "auto",
  },
  {
    id: "ajira",
    name: "Ajira Portal Services",
    authority: "Public Service Recruitment Secretariat",
    description:
      "Government job application portfolios, civil service recruitment IDs & applicant profiles.",
    category: "education",
    iconName: "Briefcase",
    active: false,
    tokenCost: 1,
    features: [
      "Civil Service Application Sync",
      "Cadre Certificate Validation",
      "Interview Pass Generation",
    ],
    processingMode: "auto",
  },
];

export interface PasskeyItem {
  id: string;
  key: string;
  role: "admin" | "user";
  active: boolean;
  createdDate: string;
  createdAtTimestamp: number;
  createdBy?: string;
  description?: string;
  lastUsed?: string;

  // Usage Manager fields
  totalUsages: number;
  usedUsages: number;
  remainingUsages: number;
  paymentStatus: PaymentStatus;
  packageName?: string;
  packagePrice?: string;
  usageHistory?: PasskeyUsageHistoryItem[];
  welcomeTokenGranted?: boolean;
  welcomeTokenGrantedAt?: string;
  grantId?: string;
  tokenTransactions?: {
    id: string;
    userId: string;
    type: "welcome_bonus" | "purchase" | "admin_grant" | "consumption";
    amount: number;
    timestamp: string;
    timestampMs: number;
    reason: string;
    grantId: string;
  }[];
  suspiciousStatus?: string;
}

export const DEFAULT_PASSKEYS: PasskeyItem[] = [];

export interface RegisteredUser {
  id: string;
  fullName: string;
  phone: string;
  passkey: string;
  passkeyId: string;
  role: "user";
  tokens: number;
  status: "ACTIVE" | "DISABLED" | "PENDING";
  registeredDate: string;
  createdAtTimestamp: number;
  lastActive: string;
  lastActiveTimestamp: number;
  isOnline: boolean;
  currentService: string;
  currentActivity: string;
  servicesUsed: string[];
}

export interface PaymentRequest {
  id: string;
  userId?: string;
  userName: string;
  userPhone: string;
  passkeyId: string;
  userPasskey: string;
  packageId: string;
  packageName: string;
  amount: string;
  requestedUsages: number;
  lipaNumber: string;
  date: string;
  timestamp: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewedDate?: string;
}

export interface ManualRequestItem {
  id: string;
  timestamp: number;
  date: string;
  serviceId: string;
  serviceName: string;
  fullName: string;
  whatsappNumber: string;
  normalNumber: string;
  normalCallNumber?: string;
  accountKey?: string;
  accountUser?: string;
  userPasskey?: string;
  status: "PENDING" | "PROCESSING" | "APPROVED" | "COMPLETED" | "REJECTED";
  adminNotes?: string;
  submittedAt?: number;
}

export const DEFAULT_MANUAL_REQUESTS: ManualRequestItem[] = [];

export const DEFAULT_REGISTERED_USERS: RegisteredUser[] = [];

export const DEFAULT_PAYMENT_REQUESTS: PaymentRequest[] = [];

interface TemplateState {
  activeScreen:
    | "home"
    | "upload"
    | "editor"
    | "templates"
    | "nida"
    | "nida_request"
    | "preview"
    | "downloads"
    | "driving_license"
    | "nhif"
    | "nrc_zambia"
    | "admin-payments"
    | "billing"
    | "settings"
    | "pdf_viewer"
    | "pdf_library"
    | "docx_to_pdf";
  currentTemplate: CardTemplate;
  frontPopulatedTemplate: CardTemplate | null;
  backPopulatedTemplate: CardTemplate | null;
  activePdf: any | null;
  setActivePdf: (pdf: any | null) => void;
  lastNidaFormData: any | null;
  lastDrivingLicenseFormData: any | null;
  lastNhifFormData: any | null;
  lastNrcFormData: any | null;
  manualRequestService: string;
  setLastNidaFormData: (data: any) => void;
  setLastDrivingLicenseFormData: (data: any) => void;
  setLastNhifFormData: (data: any) => void;
  setLastNrcFormData: (data: any) => void;
  setManualRequestService: (s: string) => void;
  customTemplates: CardTemplate[];

  // PROMPT 40: Payment Methods, Settings & User Profile
  paymentMethods: ConfigurablePaymentMethod[];
  userProfile: UserProfileSettings;
  userPreferences: UserPreferences;
  adminSettings: AdminSystemSettings;
  userPaymentSubmissions: UserPaymentSubmission[];
  tokenHistory: TokenTransaction[];
  weeklyOffers: any[];
  loadTokenPackages: () => Promise<void>;
  loadWeeklyOffers: () => Promise<void>;
  showSuccessActivation: (message: string) => void;
  successActivationMessage: string | null;
  setSuccessActivationMessage: (msg: string | null) => void;

  updatePaymentMethod: (id: string, updates: Partial<ConfigurablePaymentMethod>) => void;
  addPaymentMethod: (method: Omit<ConfigurablePaymentMethod, "id">) => void;
  deletePaymentMethod: (id: string) => void;
  publishPaymentMethodsToSupabase: () => Promise<boolean>;
  publishAdminSettingsToSupabase: () => Promise<boolean>;
  updateUserProfile: (updates: Partial<UserProfileSettings>) => void;
  updateUserPreferences: (updates: Partial<UserPreferences>) => void;
  updateAdminSettings: (updates: Partial<AdminSystemSettings>) => void;
  submitUserPayment: (data: {
    amount: number;
    sender: string;
    receiver: string;
    reference: string;
    date: string;
  }) => { success: boolean; message: string; submission?: UserPaymentSubmission };
  approveUserPayment: (
    submissionId: string,
    tokensToGrant?: number,
  ) => { success: boolean; message: string };
  rejectUserPayment: (
    submissionId: string,
    reason?: string,
  ) => { success: boolean; message: string };
  addTokenHistoryItem: (amount: number, reason: string, ownerId?: string) => void;
  loadTokenHistory: () => Promise<void>;

  // Multi-Service Studio Context
  activeServiceId: string;
  setActiveServiceId: (serviceId: string) => void;
  getUniversalFrontTemplate: (serviceId: string) => CardTemplate;
  getUniversalBackTemplate: (serviceId: string) => CardTemplate;
  saveUniversalFrontTemplate: (serviceId: string, template: CardTemplate) => Promise<void>;
  saveUniversalBackTemplate: (serviceId: string, template: CardTemplate) => Promise<void>;
  toggleTemplateActive: (templateId: string, isActive: boolean) => Promise<void>;

  // Studio Working Mode & Universal Navigation
  studioMode: boolean;
  lastEditingContext: LastEditingContext | null;
  setLastEditingContext: (context: LastEditingContext | null) => void;
  returnToEditingContext: () => void;
  navigationHistory: Array<{
    screen:
      | "home"
      | "upload"
      | "editor"
      | "templates"
      | "nida"
      | "nida_request"
      | "preview"
      | "downloads"
      | "driving_license"
      | "nhif"
      | "nrc_zambia"
      | "admin-payments"
      | "billing"
      | "settings"
      | "pdf_viewer"
      | "pdf_library"
      | "docx_to_pdf";
    serviceId?: string;
    templateId?: string;
  }>;
  hasUnsavedChanges: boolean;
  isUnsavedModalOpen: boolean;
  pendingNavigation: (() => void) | null;
  isSaving: boolean; // PROMPT 51: Global saving state for UI feedback
  setIsSaving: (saving: boolean) => void;
  loadingTemplates: boolean;
  loadingPasskeys: boolean;
  lastTemplateSync: number;

  setStudioMode: (enabled: boolean) => void;
  setHasUnsavedChanges: (dirty: boolean) => void;
  saveStudioDraft: () => void;
  restoreStudioDraft: (serviceId?: string) => void;
  clearStudioDraft: (serviceId?: string) => void;
  importTemplateJSON: (
    json: string,
    asNew?: boolean,
  ) => Promise<{ success: boolean; message: string }>;

  navigateSafely: (
    targetScreen:
      | "home"
      | "upload"
      | "editor"
      | "templates"
      | "nida"
      | "nida_request"
      | "preview"
      | "downloads"
      | "driving_license"
      | "nhif"
      | "nrc_zambia"
      | "admin-payments"
      | "billing"
      | "settings"
      | "pdf_viewer"
      | "pdf_library"
      | "docx_to_pdf",
    serviceId?: string,
    bypassDraftRestore?: boolean,
  ) => void;
  goBack: () => void;
  confirmPendingNavigation: (saveFirst?: boolean) => Promise<void>;
  cancelPendingNavigation: () => void;

  // Dynamic Token Packages state & actions
  tokenPackages: UsagePackage[];
  addTokenPackage: (pkg: Omit<UsagePackage, "id">) => void;
  editTokenPackage: (id: string, pkg: Partial<UsagePackage>) => void;
  deleteTokenPackage: (id: string) => void;
  toggleTokenPackage: (id: string) => void;

  // Weekly Offers state & actions
  addWeeklyOffer: (offer: any) => Promise<void>;
  editWeeklyOffer: (id: string, offer: any) => Promise<void>;
  deleteWeeklyOffer: (id: string) => Promise<void>;

  // Dynamic Services state & actions
  services: any[];
  addService: (service: any) => void;
  editService: (id: string, service: Partial<any>) => void;
  deleteService: (id: string) => void;
  toggleService: (id: string) => void;

  // Supabase Auth session state
  authLoading: boolean;
  authRole: AuthRole;
  currentAuthKey: string | null;
  activePasskeys: PasskeyItem[];
  isPasskeyManagerOpen: boolean;

  // Registered Users & Recharge Management
  registeredUsers: RegisteredUser[];
  paymentRequests: PaymentRequest[];
  manualRequests: ManualRequestItem[];
  isRechargeModalOpen: boolean;
  rechargeNotice: string | null;
  isManualAppModalOpen: boolean;
  selectedManualService: { id: string; name: string } | null;
  setManualAppModalOpen: (open: boolean, service?: { id: string; name: string } | null) => void;

  loginWithEmailPassword: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message: string }>;
  fetchPasskeysFromSupabase: () => Promise<void>;
  logoutPasskey: () => void;
  setPasskeyManagerOpen: (open: boolean) => void;
  setRechargeModalOpen: (open: boolean, notice?: string | null) => void;
  registerUserAccount: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<{ success: boolean; message: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  updateUserActivity: (currentService?: string, currentActivity?: string) => void;
  fetchPaymentRequestsFromSupabase: () => Promise<void>;
  unsubscribePaymentRequestsFromSupabase: () => void;
  submitPaymentRequest: (
    packageId: string,
    packageName: string,
    amount: string,
    requestedUsages: number,
  ) => { success: boolean; message: string; request?: PaymentRequest };
  cancelPaymentRequest: (requestId?: string) => { success: boolean; message: string };
  updateUserPaymentRequest: (
    requestId: string,
    packageId: string,
    packageName: string,
    amount: string,
    requestedUsages: number,
  ) => { success: boolean; message: string };
  approvePaymentRequest: (requestId: string) => { success: boolean; message: string };
  rejectPaymentRequest: (requestId: string) => { success: boolean; message: string };
  updatePaymentRequest: (
    requestId: string,
    updates: Partial<PaymentRequest>,
  ) => { success: boolean; message: string };
  reactivatePaymentRequest: (requestId: string) => { success: boolean; message: string };
  submitManualRequest: (data: {
    serviceId: string;
    serviceName: string;
    fullName: string;
    whatsappNumber: string;
    normalNumber?: string;
    normalCallNumber?: string;
  }) => { success: boolean; message: string; request?: ManualRequestItem };
  updateManualRequestStatus: (
    requestId: string,
    status: ManualRequestItem["status"],
    adminNotes?: string,
  ) => { success: boolean; message: string };
  deleteManualRequest: (requestId: string) => { success: boolean; message: string };
  toggleUserStatus: (userId: string) => void;
  deleteRegisteredUser: (userId: string) => void;
  refreshUserStatus: () => void;

  addPasskey: (item: Partial<PasskeyItem> & { key: string; role: "admin" | "user" }) => PasskeyItem;
  generateUserPasskey: (
    description?: string,
    usages?: number,
    options?: {
      paymentStatus?: PaymentStatus;
      packageName?: string;
      packagePrice?: number | string;
    },
  ) => PasskeyItem;
  generateUserPasskeyWithPackage: (
    packageName: string,
    usages: number,
    price: string,
    isAutoActive?: boolean,
    description?: string,
  ) => PasskeyItem;
  generateAdminPasskey: (description?: string) => PasskeyItem;
  resetAdminPasskey: (currentKey: string, newKey: string) => { success: boolean; message: string };
  togglePasskeyStatus: (id: string) => void;
  deletePasskey: (id: string) => void;

  // Usage Manager Actions
  consumeUsage: (
    serviceName?: string,
    details?: string,
    tokenCost?: number,
  ) => { success: boolean; remainingUsages: number; message?: string };
  confirmPaymentAndActivatePasskey: (id: string) => void;
  addUsagesToPasskey: (
    id: string,
    additionalUsages: number,
    newPackageName?: string,
    historyReason?: string,
  ) => void;

  // Central Authorization & Validation Gate
  checkAuthorization: () => boolean;
  executeProtectedAction: (actionCallback: () => void) => void;
  validateServiceAccess: (serviceId?: string) => ServiceValidationResult;
  validateExportAccess: (actionType?: string) => ServiceValidationResult;

  // NIDA Template Selections & Universal Defaults
  selectedFrontTemplateId: string | null;
  selectedBackTemplateId: string | null;
  defaultNidaFrontTemplateId: string | null;
  defaultNidaBackTemplateId: string | null;
  activeUnit: Unit;
  selectedLayerIds: string[];
  zoom: number; // 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 4.0
  panOffset: { x: number; y: number };

  gridSettings: GridSettings;
  snapSettings: SnapSettings;
  showRulers: boolean;
  showGuides: boolean;
  showSafeZones: boolean;

  cursorPosMm: { x: number; y: number };
  activeSmartGuides: SmartGuide[];

  uploadedBackgrounds: UploadedBackground[];
  activeEditorSide: "front" | "back";
  completionBannerMessage: string | null;
  setCompletionBannerMessage: (msg: string | null) => void;

  // Modals
  isTemplateLibraryOpen: boolean;
  isCardGeneratorOpen: boolean;
  isExportModalOpen: boolean;
  isMergeModalOpen: boolean;
  isSaveModalOpen: boolean;
  activeMobileSheet: "elements" | "layers" | "backgrounds" | "properties" | "settings" | null;
  activeStudioLeftTab: "elements" | "layers" | "backgrounds";
  setActiveStudioLeftTab: (tab: "elements" | "layers" | "backgrounds") => void;

  // NIDA Success Notification Toast
  nidaSuccessNotification: {
    title: string;
    message: string;
    populatedCount: number;
    isBackSide?: boolean;
  } | null;
  setNidaSuccessNotification: (
    notification: {
      title: string;
      message: string;
      populatedCount: number;
      isBackSide?: boolean;
    } | null,
  ) => void;

  // History stack for Undo/Redo
  history: CardTemplate[];
  historyIndex: number;

  // Actions
  setActiveScreen: (
    screen:
      | "home"
      | "upload"
      | "editor"
      | "templates"
      | "nida"
      | "nida_request"
      | "preview"
      | "downloads"
      | "driving_license"
      | "nhif"
      | "nrc_zambia"
      | "admin-payments"
      | "billing"
      | "settings"
      | "pdf_viewer"
      | "pdf_library"
      | "docx_to_pdf",
  ) => void;
  setPopulatedCardPair: (
    front: CardTemplate | null,
    back: CardTemplate | null,
    formData?: any,
  ) => void;
  createNewTemplate: (
    background: BackgroundConfig,
    name?: string,
    serviceId?: string,
    side?: "front" | "back",
    templateId?: string,
  ) => void;
  loadTemplate: (template: CardTemplate) => void;
  setCurrentTemplate: (template: CardTemplate) => void;
  updateTemplateMeta: (meta: Partial<CardTemplate>) => void;
  setActiveUnit: (unit: Unit) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPanOffset: (
    offset:
      { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number }),
  ) => void;
  recenterWorkspace: () => void;
  resetView: () => void;

  // Layer Management
  setSelectedLayerIds: (ids: string[]) => void;
  selectLayer: (id: string, multiSelect?: boolean) => void;
  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  updateLayerLive: (id: string, patch: Partial<Layer>) => void;
  applyFontToLayers: (
    fontFamily: string,
    scope: "selected" | "all",
    targetLayerId?: string,
  ) => void;
  applyWeightToLayers: (
    fontWeight: number,
    scope: "selected" | "all",
    targetLayerId?: string,
  ) => void;
  deleteSelectedLayers: () => void;
  duplicateSelectedLayers: () => void;
  reorderLayer: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;

  // Precision Movement & Alignment
  nudgeSelectedLayers: (dxMm: number, dyMm: number) => void;
  alignSelectedLayers: (type: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
  distributeSelectedLayers: (direction: "horizontal" | "vertical") => void;

  // Background Library
  loadUploadedBackgrounds: (
    docTypeId?: string,
    templateId?: string,
    side?: "front" | "back",
  ) => Promise<void>;
  addUploadedBackground: (
    bg: Omit<UploadedBackground, "id" | "createdAt">,
  ) => Promise<UploadedBackground>;
  updateUploadedBackground: (id: string, patch: Partial<UploadedBackground>) => Promise<void>;
  deleteUploadedBackground: (id: string) => Promise<void>;
  activateBackground: (
    bgId: string,
    docTypeId: string,
    templateId: string,
    side: "front" | "back",
  ) => Promise<any>;
  switchEditorSide: (targetSide: "front" | "back") => Promise<void>;

  // Guides & Rulers & Safe Zones
  addGuide: (guide: Omit<Guide, "id">) => void;
  updateGuide: (id: string, patch: Partial<Guide>) => void;
  deleteGuide: (id: string) => void;
  toggleRulers: () => void;
  toggleGuides: () => void;
  toggleSafeZones: () => void;

  // Grid & Snap
  setGridSettings: (settings: Partial<GridSettings>) => void;
  setSnapSettings: (settings: Partial<SnapSettings>) => void;

  // Live cursor & smart guides
  setCursorPosMm: (pos: { x: number; y: number }) => void;
  setActiveSmartGuides: (guides: SmartGuide[]) => void;

  // Modals
  setTemplateLibraryOpen: (open: boolean) => void;
  setCardGeneratorOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  setMergeModalOpen: (open: boolean) => void;
  setSaveModalOpen: (open: boolean) => void;
  setActiveMobileSheet: (
    sheet: "elements" | "layers" | "backgrounds" | "properties" | "settings" | null,
  ) => void;

  // Storage / Persistence
  saveCurrentTemplate: () => Promise<void>;
  saveAsNewTemplate: (newName: string, cardType?: any, side?: any) => Promise<CardTemplate>;
  loadSavedTemplates: (force?: boolean) => Promise<CardTemplate[]>;
  loadServiceTemplates: (serviceType: string) => Promise<{ front: any | null; back: any | null }>;
  deleteSavedTemplate: (id: string) => Promise<void>;

  updateAllLicenceCategoryStyle: (stylePatch: Partial<LicenceCategoryLayer>) => void;
  // NIDA Template Selection & Universal Default Actions
  setSelectedFrontTemplateId: (id: string | null) => void;
  setSelectedBackTemplateId: (id: string | null) => void;
  setUniversalDefaultNidaTemplates: (frontId: string, backId: string) => void;
  saveNidaSubmissionRecord: (record: NidaSubmissionRecord) => Promise<void>;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
  pushHistoryState: (template: CardTemplate) => void;
}

const DEFAULT_TEMPLATE: CardTemplate = {
  id: "template_" + Date.now(),
  templateName: "Untitled Card Template",
  cardWidth: CR80_WIDTH_MM,
  cardHeight: CR80_HEIGHT_MM,
  unit: "mm",
  dpi: 300,
  orientation: "landscape",
  background: {
    type: "color",
    color: "#ffffff",
  },
  layers: [],
  guides: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const normalizePasskeyItem = (raw: any): PasskeyItem => {
  const role: "admin" | "user" = raw.role === "admin" ? "admin" : "user";
  const totalUsages =
    typeof raw.totalUsages === "number" ? raw.totalUsages : role === "admin" ? 99999 : 5;
  const usedUsages = typeof raw.usedUsages === "number" ? raw.usedUsages : 0;
  const remainingUsages =
    typeof raw.remainingUsages === "number"
      ? raw.remainingUsages
      : Math.max(0, totalUsages - usedUsages);

  let paymentStatus: PaymentStatus = raw.paymentStatus;
  if (remainingUsages <= 0) {
    paymentStatus = "EXHAUSTED";
  } else if (paymentStatus === "EXHAUSTED" && remainingUsages > 0) {
    paymentStatus = "ACTIVE";
  } else if (!paymentStatus) {
    if (raw.active === false) paymentStatus = "DISABLED";
    else if (remainingUsages <= 0) paymentStatus = "EXHAUSTED";
    else paymentStatus = "ACTIVE";
  }

  return {
    id: raw.id || `pk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    key: raw.key,
    role,
    active: paymentStatus !== "DISABLED" && raw.active !== false,
    createdDate: raw.createdDate || new Date().toISOString().replace("T", " ").substring(0, 16),
    createdAtTimestamp: raw.createdAtTimestamp || Date.now(),
    createdBy: raw.createdBy || "System",
    description: raw.description || "",
    lastUsed: raw.lastUsed,
    totalUsages,
    usedUsages,
    remainingUsages,
    paymentStatus,
    packageName:
      raw.packageName || (role === "admin" ? "Unlimited Admin" : `${totalUsages} Usages Package`),
    packagePrice:
      raw.packagePrice ||
      (role === "admin"
        ? "Free"
        : totalUsages === 1
          ? "TSh 10,000"
          : totalUsages === 2
            ? "TSh 15,000"
            : "TSh 25,000"),
    usageHistory: Array.isArray(raw.usageHistory) ? raw.usageHistory : [],
  };
};

export function safeLocalStorageSetItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    if (
      err?.name === "QuotaExceededError" ||
      err?.code === 22 ||
      err?.number === -2147024882 ||
      err?.message?.includes("exceeded the quota")
    ) {
      console.warn(
        `[Storage System] LocalStorage quota limit reached for key '${key}'. Cleaning stale drafts...`,
      );
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("bigsta_studio_draft_") && k !== key) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        localStorage.setItem(key, value);
        return true;
      } catch {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === "object") {
            const stripped = { ...parsed };
            if (stripped.background?.type === "image" && stripped.background?.src?.length > 10000) {
              stripped.background = { ...stripped.background, src: "" };
            }
            if (Array.isArray(stripped.layers)) {
              stripped.layers = stripped.layers.map((l: any) => {
                if (l.type === "image" && l.src?.length > 10000) {
                  return { ...l, src: "" };
                }
                return l;
              });
            }
            localStorage.setItem(key, JSON.stringify(stripped));
            return true;
          }
        } catch {
          // Ignore
        }
        console.warn(
          `[Storage System] LocalStorage quota reached for '${key}'. Full template draft stored in IndexedDB.`,
        );
        return false;
      }
    } else {
      console.warn(`[Storage System] LocalStorage setItem error for '${key}':`, err);
      return false;
    }
  }
}

export const useTemplateStore = create<TemplateState>((set, get) => {
  const savedDefaultFrontId = null;
  const savedDefaultBackId = null;

  const savedSelectedFrontId = "sample_tanzania_nida";
  const savedSelectedBackId = "sample_tanzania_nida_back";

  const initialAuthRole: AuthRole = null;
  const initialAuthKey: string | null = null;
  const initialPasskeys: PasskeyItem[] = [];
  const initialRegisteredUsers: RegisteredUser[] = DEFAULT_REGISTERED_USERS;
  const initialPaymentRequests: PaymentRequest[] = DEFAULT_PAYMENT_REQUESTS;
  const initialManualRequests: ManualRequestItem[] = DEFAULT_MANUAL_REQUESTS;
  const initialTokenPackages: UsagePackage[] = NIDA_USAGE_PACKAGES;
  const initialServicesList: ServiceData[] = INITIAL_SERVICES;

  const DEFAULT_METHODS: ConfigurablePaymentMethod[] = [
    {
      id: "pm_mpesa",
      name: "M-Pesa",
      title: "Lipa kwa Simu / Till Number",
      number: "0123 000 111",
      accountName: "BIGSTA SERVICES LTD",
      amount: "TSh 10,000",
      instructions: "Dial *150*00# -> Pay Merchant (Lipa kwa Simu) -> Enter Till Number",
      confirmMessage:
        "Confirm after payment: Enter your transaction reference code below for instant verification.",
      whatsappNumber: "+255 712 345 678",
      irreversibleNotice: "Note: All mobile payments are final and irreversible once processed.",
      customMessage: "Instant automated activation after SMS or reference confirmation.",
      status: "active",
    },
    {
      id: "pm_mixx",
      name: "Mixx by Yas",
      title: "Merchant Number",
      number: "0123 000 222",
      accountName: "BIGSTA SERVICES LTD",
      amount: "TSh 10,000",
      instructions: "Dial *150*01# -> Pay Merchant -> Enter Number",
      confirmMessage:
        "Confirm payment by uploading receipt screenshot or sending reference code.",
      whatsappNumber: "+255 712 345 678",
      irreversibleNotice: "Payment is strictly irreversible. Verify recipient before confirming.",
      customMessage: "Available 24/7 with automatic token crediting.",
      status: "active",
    },
    {
      id: "pm_airtel",
      name: "Airtel Money",
      title: "Paybill / Agent Number",
      number: "0123 000 333",
      accountName: "BIGSTA SERVICES LTD",
      amount: "TSh 10,000",
      instructions: "Dial *150*60# -> Paybill -> Enter Business Number",
      confirmMessage: "Confirm after payment: Reference code is required for instant tokens.",
      whatsappNumber: "+255 712 345 678",
      irreversibleNotice:
        "Payment is irreversible. Double check the account name BIGSTA SERVICES LTD.",
      customMessage: "Tokens credit immediately upon reference match.",
      status: "active",
    },
    {
      id: "pm_halopesa",
      name: "HaloPesa",
      title: "Agent / Till Number",
      number: "0123 000 444",
      accountName: "BIGSTA SERVICES LTD",
      amount: "TSh 10,000",
      instructions: "Dial *150*88# -> Send Money / Pay Merchant",
      confirmMessage: "Confirm on WhatsApp or enter transaction ID below.",
      whatsappNumber: "+255 712 345 678",
      irreversibleNotice: "Payment is irreversible once submitted.",
      customMessage: "Contact support if tokens do not appear within 2 minutes.",
      status: "active",
    },
    {
      id: "pm_lipanamba",
      name: "Lipa Namba",
      title: "Merchant Till Number",
      number: "1234567",
      accountName: "BIGSTA SERVICES LTD",
      amount: "TSh 10,000",
      instructions: "Pay via Lipa Namba merchant payment to till number 1234567",
      confirmMessage: "Confirm after payment by entering your reference number.",
      whatsappNumber: "+255 712 345 678",
      irreversibleNotice: "Payment is irreversible once confirmed.",
      customMessage: "Direct merchant payment across all networks.",
      status: "active",
    },
  ];

  const initialPaymentMethods: ConfigurablePaymentMethod[] = DEFAULT_METHODS;

  const initialUserProfile: UserProfileSettings = { name: "", phone: "", email: "", region: "" };

  const initialUserPreferences: UserPreferences = {
    theme: "light",
    language: "en",
    fontSize: "standard",
    paymentAlerts: true,
    downloadAlerts: true,
    systemAlerts: true,
    downloadFolder: "Downloads/BIGsta",
    autoSave: true,
    openAfterDownload: false,
    keepHistoryDays: 30,
  };

  const initialAdminSettings: AdminSystemSettings = {
    ocrProvider: "Local AI / Tesseract Engine",
    ocrConfidenceThreshold: 85,
    autoApprovalEnabled: true,
    tokenPriceTsh: 2000,
    tokenRewardBonus: 10,
    maxDailyTokenLimit: 1000,
    autoApprovalRules: "Auto approve reference matches with confidence > 85%",
  };

  const initialUserPayments: UserPaymentSubmission[] = [
    {
      id: "sub_sample_1",
      userId: "pk_user_1",
      amount: 6000,
      sender: "John Sample (0123456789)",
      receiver: "BIGsta Services",
      reference: "ABC1234567",
      date: "2026-09-17",
      submittedAt: "2026-09-17T00:00:00.000Z",
      status: "verified",
      extractedData: {
        amount: 6000,
        sender: "John Sample",
        receiver: "BIGsta",
        reference: "ABC1234567",
        date: "2026-09-17",
      },
      tokensGranted: 3,
    },
  ];

  const initialTokenHistory: TokenTransaction[] = [
    {
      id: "th_1",
      userId: "pk_user_1",
      amount: 5,
      reason: "Welcome Token Package Granted",
      timestamp: "2026-09-15T00:00:00.000Z",
    },
    {
      id: "th_2",
      userId: "pk_user_1",
      amount: 3,
      reason: "Payment Top-Up Verified (Ref: ABC1234567)",
      timestamp: "2026-09-16T00:00:00.000Z",
    },
    {
      id: "th_3",
      userId: "pk_user_1",
      amount: -1,
      reason: "Generated ID Card Export",
      timestamp: "2026-09-17T00:00:00.000Z",
    },
  ];

  return {
    activeScreen: "home",
    activePdf: null,
    setActivePdf: (pdf: any | null) => set({ activePdf: pdf }),
    currentTemplate: DEFAULT_TEMPLATE,
    activeEditorSide: "front",
    activeStudioLeftTab: "elements",
    setActiveStudioLeftTab: (tab) => set({ activeStudioLeftTab: tab }),
    completionBannerMessage: null,
    setCompletionBannerMessage: (msg: string | null) => set({ completionBannerMessage: msg }),
    frontPopulatedTemplate: null,
    backPopulatedTemplate: null,
    lastNidaFormData: null,
    lastDrivingLicenseFormData: null,
    lastNhifFormData: null,
    lastNrcFormData: null,
    manualRequestService: "NIDA Request",
    setLastNidaFormData: (data: any) => set({ lastNidaFormData: data }),
    setLastDrivingLicenseFormData: (data: any) => set({ lastDrivingLicenseFormData: data }),
    setLastNhifFormData: (data: any) => set({ lastNhifFormData: data }),
    setLastNrcFormData: (data: any) => set({ lastNrcFormData: data }),
    setManualRequestService: (s: string) => set({ manualRequestService: s }),
    customTemplates: [],

    paymentMethods: initialPaymentMethods,
    userProfile: initialUserProfile,
    userPreferences: initialUserPreferences,
    adminSettings: initialAdminSettings,
    userPaymentSubmissions: initialUserPayments,
    tokenHistory: initialTokenHistory,
    weeklyOffers: [],
    successActivationMessage: null,

    setSuccessActivationMessage: (msg) => set({ successActivationMessage: msg }),

    showSuccessActivation: (message) => {
      set({ successActivationMessage: message });
      // Message will be cleared by the UI component after user clicks OK
    },

    loadTokenPackages: async () => {
      try {
        const { fetchTokenPackagesSupabase } = await import("../services/supabase");
        const pkgs = await fetchTokenPackagesSupabase();
        if (Array.isArray(pkgs)) {
          const mapped: UsagePackage[] = pkgs.map((p) => ({
            id: p.id,
            name: p.name,
            usages: p.usages,
            price: p.price,
            description: p.description || "",
            visibility: (p.visibility || "public") as "public" | "hidden",
            active: p.is_active !== false,
            sortOrder: p.sort_order ?? 0,
            bonus: p.bonus ?? 0,
            promotion: p.promotion || "",
          }));
          set({
            tokenPackages: mapped.length
              ? mapped
              : [
                  { id: "default_starter", name: "Starter Pack", usages: 3, price: 2000, description: "3 Tokens", visibility: "public", active: true, sortOrder: 1, bonus: 0, promotion: "" },
                  { id: "default_standard", name: "Standard Pack", usages: 7, price: 5000, description: "7 Tokens", visibility: "public", active: true, sortOrder: 2, bonus: 0, promotion: "Popular" },
                  { id: "default_pro", name: "Pro Creator Pack", usages: 18, price: 10000, description: "18 Tokens", visibility: "public", active: true, sortOrder: 3, bonus: 0, promotion: "Best Value" },
                ],
          });
        }
      } catch (e) {
        console.error("Error loading token packages from Supabase:", e);
      }
    },

    loadWeeklyOffers: async () => {
      try {
        const { fetchWeeklyOffersSupabase } = await import("../services/supabase");
        const offers = await fetchWeeklyOffersSupabase();
        if (offers) {
          const mapped = offers.map((o) => ({
            id: o.id,
            title: o.title,
            description: o.description,
            tokens: o.tokens,
            price: o.price,
            services: o.services,
            startDate: o.start_date,
            endDate: o.end_date,
            active: o.is_active,
          }));
          set({
            weeklyOffers: mapped.length
              ? mapped
              : [
                  {
                    id: "default_creator_pass",
                    title: "Special Creator Pass",
                    description: "Get 10 Tokens for only 6,000 TZS — 25% OFF this week",
                    tokens: 10,
                    price: 6000,
                    services: [],
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
                    active: true,
                  },
                ],
          });
        }
      } catch (e) {
        console.error("Error loading weekly offers from Supabase:", e);
      }
    },

    updatePaymentMethod: (id, updates) => {
      const updated = get().paymentMethods.map((pm) => (pm.id === id ? { ...pm, ...updates } : pm));
      safeLocalStorageSetItem("bigsta_payment_methods", JSON.stringify(updated));
      set({ paymentMethods: updated });
      import("../services/supabase")
        .then(({ savePaymentMethodsSupabase }) => {
          savePaymentMethodsSupabase(updated);
        })
        .catch((e) => console.warn("Supabase payment methods auto-sync skipped:", e));
    },

    addPaymentMethod: (method) => {
      const newMethod: ConfigurablePaymentMethod = { ...method, id: `pm_${Date.now()}` };
      const updated = [...get().paymentMethods, newMethod];
      safeLocalStorageSetItem("bigsta_payment_methods", JSON.stringify(updated));
      set({ paymentMethods: updated });
      import("../services/supabase")
        .then(({ savePaymentMethodsSupabase }) => {
          savePaymentMethodsSupabase(updated);
        })
        .catch((e) => console.warn("Supabase payment methods auto-sync skipped:", e));
    },

    deletePaymentMethod: (id) => {
      const updated = get().paymentMethods.filter((pm) => pm.id !== id);
      safeLocalStorageSetItem("bigsta_payment_methods", JSON.stringify(updated));
      set({ paymentMethods: updated });
      import("../services/supabase")
        .then(({ savePaymentMethodsSupabase }) => {
          savePaymentMethodsSupabase(updated);
        })
        .catch((e) => console.warn("Supabase payment methods auto-sync skipped:", e));
    },

    publishPaymentMethodsToSupabase: async () => {
      try {
        const { savePaymentMethodsSupabase } = await import("../services/supabase");
        const success = await savePaymentMethodsSupabase(get().paymentMethods);
        return success;
      } catch (e) {
        console.error("Failed to publish payment methods to Supabase:", e);
        return false;
      }
    },

    publishAdminSettingsToSupabase: async () => {
      try {
        const { saveAdminSettingsSupabase } = await import("../services/supabase");
        const success = await saveAdminSettingsSupabase(get().adminSettings);
        return success;
      } catch (e) {
        console.error("Failed to publish admin settings to Supabase:", e);
        return false;
      }
    },

    updateUserProfile: (updates) => {
      const updated = { ...get().userProfile, ...updates };
      safeLocalStorageSetItem("bigsta_user_profile", JSON.stringify(updated));
      set({ userProfile: updated });

      const { currentAuthKey } = get();
      if (currentAuthKey) {
        import("../services/supabase")
          .then(({ saveOwnProfileSupabase }) => {
            saveOwnProfileSupabase(currentAuthKey, updated);
          })
          .catch((e) => console.error("Failed to sync profile to Supabase", e));
      }
    },

    updateUserPreferences: (updates) => {
      const updated = { ...get().userPreferences, ...updates };
      safeLocalStorageSetItem("bigsta_user_preferences", JSON.stringify(updated));
      if (typeof document !== "undefined") {
        if (updated.theme === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.setAttribute("data-theme", "dark");
          document.body.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.setAttribute("data-theme", "light");
          document.body.classList.remove("dark");
        }
      }
      set({ userPreferences: updated });
    },

    updateAdminSettings: (updates) => {
      const updated = { ...get().adminSettings, ...updates };
      safeLocalStorageSetItem("bigsta_admin_settings", JSON.stringify(updated));
      set({ adminSettings: updated });
    },

    submitUserPayment: (data) => {
      const tokensCalculated = Math.max(
        1,
        Math.floor(data.amount / (get().adminSettings.tokenPriceTsh || 2000)),
      );
      const newSub: UserPaymentSubmission = {
        id: `sub_${Date.now()}`,
        userId: get().currentAuthKey || "user_default",
        passkeyId: get().currentAuthKey || "user_default",
        amount: data.amount,
        sender: data.sender,
        receiver: data.receiver || "BIGsta",
        reference: data.reference,
        date: data.date,
        submittedAt: new Date().toISOString(),
        status: "pending",
        extractedData: {
          amount: data.amount,
          sender: data.sender,
          receiver: data.receiver || "BIGsta",
          reference: data.reference,
          date: data.date,
        },
      };
      const updated = [newSub, ...get().userPaymentSubmissions];
      safeLocalStorageSetItem("bigsta_user_payment_submissions", JSON.stringify(updated));
      set({ userPaymentSubmissions: updated });
      return {
        success: true,
        message: "Payment screenshot & extracted data submitted for verification",
        submission: newSub,
      };
    },

    approveUserPayment: (submissionId, tokensToGrant) => {
      const sub = get().userPaymentSubmissions.find((s) => s.id === submissionId);
      if (!sub) return { success: false, message: "Submission not found" };

      const granted =
        tokensToGrant ||
        Math.max(1, Math.floor(sub.amount / (get().adminSettings.tokenPriceTsh || 2000)));
      const updatedSubs = get().userPaymentSubmissions.map((s) =>
        s.id === submissionId ? { ...s, status: "verified" as const, tokensGranted: granted } : s,
      );
      safeLocalStorageSetItem("bigsta_user_payment_submissions", JSON.stringify(updatedSubs));

      // Grant usages to user
      const targetPasskey = sub.passkeyId || get().currentAuthKey || "pk_user_1";
      get().addUsagesToPasskey(
        targetPasskey,
        granted,
        `Approved Payment: Ref ${sub.reference}`,
        `Top-Up Approved (Ref: ${sub.reference})`,
      );

      get().showSuccessActivation(
        `Your top-up of ${granted} tokens has been activated successfully.`,
      );

      set({ userPaymentSubmissions: updatedSubs });
      return { success: true, message: `Payment approved! Granted ${granted} tokens.` };
    },

    rejectUserPayment: (submissionId, reason) => {
      const updatedSubs = get().userPaymentSubmissions.map((s) =>
        s.id === submissionId
          ? {
              ...s,
              status: "rejected" as const,
              rejectionReason: reason || "Invalid payment receipt details",
            }
          : s,
      );
      safeLocalStorageSetItem("bigsta_user_payment_submissions", JSON.stringify(updatedSubs));
      set({ userPaymentSubmissions: updatedSubs });
      return { success: true, message: "Payment submission rejected." };
    },

    addTokenHistoryItem: (amount, reason, ownerId) => {
      if (!Number.isFinite(amount) || amount === 0) return;
      const newItem: TokenTransaction = {
        id: `th_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        userId: ownerId || get().currentAuthKey || "user_default",
        amount,
        reason,
        timestamp: new Date().toISOString(),
      };
      const updated = [newItem, ...get().tokenHistory].slice(0, 500);
      safeLocalStorageSetItem("bigsta_token_history", JSON.stringify(updated));
      set({ tokenHistory: updated });

      import("../services/supabase")
        .then(({ insertTokenHistorySupabase }) =>
          insertTokenHistorySupabase({
            id: newItem.id,
            ownerId: newItem.userId,
            amount: newItem.amount,
            reason: newItem.reason,
            timestamp: newItem.timestamp,
          }),
        )
        .catch((e) => console.warn("Token history sync skipped:", e));
    },

    loadTokenHistory: async () => {
      try {
        const { fetchTokenHistorySupabase } = await import("../services/supabase");
        const { authRole, currentAuthKey, activePasskeys } = get();
        let ownerIds: string[] | undefined;
        if (authRole !== "admin") {
          const own = activePasskeys.find(
            (p) => p.key.toLowerCase() === (currentAuthKey || "").toLowerCase(),
          );
          if (!own) return;
          ownerIds = [own.id];
        }
        const remote = await fetchTokenHistorySupabase(ownerIds);
        if (!remote) return;

        const merged = new Map<string, TokenTransaction>();
        for (const r of remote) {
          merged.set(r.id, {
            id: r.id,
            userId: r.ownerId,
            amount: r.amount,
            reason: r.reason,
            timestamp: r.timestamp,
          });
        }
        for (const local of get().tokenHistory) {
          const isRealLocalEntry = /^th_\d{10,}/.test(local.id);
          if (isRealLocalEntry && !merged.has(local.id)) merged.set(local.id, local);
        }
        const updated = Array.from(merged.values())
          .filter((t) => !ownerIds || ownerIds.includes(t.userId))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 500);
        safeLocalStorageSetItem("bigsta_token_history", JSON.stringify(updated));
        set({ tokenHistory: updated });
      } catch (e) {
        console.warn("Token history load skipped:", e);
      }
    },

    activeServiceId:
      typeof window !== "undefined"
        ? localStorage.getItem("bigsta_active_service") || "nida"
        : "nida",
    studioMode: false,
    navigationHistory: [],
    hasUnsavedChanges: false,
    isUnsavedModalOpen: false,
    pendingNavigation: null,
    isSaving: false,
    setIsSaving: (saving) => set({ isSaving: saving }),
    loadingTemplates: false,
    loadingPasskeys: false,
    lastTemplateSync: 0,

    setStudioMode: (enabled: boolean) => set({ studioMode: enabled }),
    setHasUnsavedChanges: (dirty: boolean) => set({ hasUnsavedChanges: dirty }),

    saveStudioDraft: () => {
      const { currentTemplate, activeServiceId } = get();
      if (typeof window !== "undefined" && currentTemplate) {
        saveStudioDraftDB(activeServiceId, currentTemplate).catch(() => {});
        safeLocalStorageSetItem(
          `bigsta_studio_draft_${activeServiceId}`,
          JSON.stringify(currentTemplate),
        );
        safeLocalStorageSetItem("bigsta_active_service", activeServiceId);
      }
    },

    restoreStudioDraft: (serviceId?: string) => {
      const targetService = serviceId || get().activeServiceId;
      if (typeof window !== "undefined") {
        const draft = localStorage.getItem(`bigsta_studio_draft_${targetService}`);
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            if (parsed && parsed.layers) {
              set({ currentTemplate: ensureTemplateFieldIds(parsed) });
            }
          } catch (e) {
            console.warn("Failed to restore studio draft from localStorage:", e);
          }
        }
        getStudioDraftDB(targetService)
          .then((dbDraft) => {
            if (dbDraft && dbDraft.layers) {
              set({ currentTemplate: ensureTemplateFieldIds(dbDraft) });
            }
          })
          .catch(() => {});
      }
    },

    clearStudioDraft: (serviceId?: string) => {
      const targetService = serviceId || get().activeServiceId;
      if (typeof window !== "undefined") {
        localStorage.removeItem(`bigsta_studio_draft_${targetService}`);
        deleteStudioDraftDB(targetService).catch(() => {});
      }
    },

    importTemplateJSON: async (jsonString, asNew = false) => {
      try {
        // First try GSON parser (dummy)
        const result = parseUniversalGSON(jsonString, asNew);
        if (result.success && result.template) {
          const template = result.template;
          if (asNew) {
            await saveTemplateDB(template);
            const all = await getAllTemplatesDB();
            set({ customTemplates: all });
          } else {
            get().loadTemplate(template);
          }
          return { success: true, message: result.message };
        }

        // Fallback to direct JSON parsing
        console.log("GSON import not supported or failed, trying direct JSON parse...");
        const template = JSON.parse(jsonString);

        // Basic validation
        if (!template.layers || !Array.isArray(template.layers)) {
          return { success: false, message: "Invalid template format: Missing layers" };
        }

        if (asNew) {
          await saveTemplateDB(template);
          const all = await getAllTemplatesDB();
          set({ customTemplates: all });
        } else {
          get().loadTemplate(template);
        }
        return { success: true, message: "Template imported successfully" };
      } catch (e: any) {
        return { success: false, message: e.message || "Import failed" };
      }
    },

    setActiveServiceId: (serviceId: string) => {
      get().saveStudioDraft();
      const savedDraft =
        typeof window !== "undefined"
          ? localStorage.getItem(`bigsta_studio_draft_${serviceId}`)
          : null;
      let targetTemplate: CardTemplate | null = null;
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed && parsed.layers) {
            targetTemplate = ensureTemplateFieldIds(parsed);
          }
        } catch (e) {
          console.warn("Error parsing draft:", e);
        }
      }
      if (!targetTemplate) {
        targetTemplate = get().getUniversalFrontTemplate(serviceId);
      }
      if (typeof window !== "undefined") {
        safeLocalStorageSetItem("bigsta_active_service", serviceId);
      }
      set({
        activeServiceId: serviceId,
        currentTemplate: targetTemplate,
      });

      getStudioDraftDB(serviceId)
        .then((dbDraft) => {
          if (dbDraft && dbDraft.layers) {
            set({ currentTemplate: ensureTemplateFieldIds(dbDraft) });
          }
        })
        .catch(() => {});
    },

    navigateSafely: (targetScreen, serviceId, bypassDraftRestore) => {
      const role = get().authRole;
      let finalTarget = targetScreen;

      if (
        role === "user" &&
        (targetScreen === "upload" || targetScreen === "editor" || targetScreen === "templates")
      ) {
        finalTarget = "home";
        set({ completionBannerMessage: "Template building is available to admin accounts only." });
      }

      const performNav = () => {
        const current = get().activeScreen;
        const history = get().navigationHistory;
        if (current !== finalTarget) {
          set({
            navigationHistory: [
              ...history,
              {
                screen: current,
                serviceId: get().activeServiceId,
                templateId: get().currentTemplate.id,
              },
            ].slice(-25),
          });
        }

        if (serviceId) {
          if (finalTarget === "editor" && bypassDraftRestore) {
            set({ activeServiceId: serviceId });
            safeLocalStorageSetItem("bigsta_active_service", serviceId);
          } else {
            get().setActiveServiceId(serviceId);
          }
        }

        set({
          activeScreen: finalTarget as any,
          studioMode: finalTarget === "editor",
          hasUnsavedChanges: false,
          isUnsavedModalOpen: false,
          pendingNavigation: null,
        });

        if (finalTarget === "editor" && !bypassDraftRestore) {
          get().restoreStudioDraft(serviceId || get().activeServiceId);
        }
      };

      if (get().hasUnsavedChanges && get().activeScreen === "editor" && finalTarget !== "editor") {
        set({
          isUnsavedModalOpen: true,
          pendingNavigation: () => performNav(),
        });
      } else {
        performNav();
      }
    },

    goBack: () => {
      const current = get().activeScreen;

      // 0. From 'editor' (Studio), if lastEditingContext came from 'preview', return directly to preview!
      if (current === "editor" && get().lastEditingContext?.sourceScreen === "preview") {
        get().returnToEditingContext();
        return;
      }

      // 1. Any service form (nida, driving_license, nhif, nrc_zambia) must ALWAYS navigate directly to 'home' when back is pressed!
      if (
        current === "nida" ||
        current === "nida_request" ||
        current === "driving_license" ||
        current === "nhif" ||
        current === "nrc_zambia"
      ) {
        const cleanedHistory = get().navigationHistory.filter(
          (h) => h.screen !== "preview" && h.screen !== "downloads" && h.screen !== current,
        );
        set({
          navigationHistory: cleanedHistory,
          activeScreen: "home",
          hasUnsavedChanges: false,
          isUnsavedModalOpen: false,
          pendingNavigation: null,
        });
        return;
      }

      // 2. From 'downloads', back must navigate safely to 'home'
      if (current === "downloads") {
        set({
          navigationHistory: get().navigationHistory.filter(
            (h) => h.screen !== "preview" && h.screen !== "downloads",
          ),
          activeScreen: "home",
          hasUnsavedChanges: false,
          isUnsavedModalOpen: false,
          pendingNavigation: null,
        });
        return;
      }

      // 3. From any step inside a card flow (preview, templates, upload, studio), Back always returns
      // to the form of the card currently being worked on — never to another category left in history.
      const FORM_BY_SERVICE: Record<string, string> = {
        nida: "nida",
        driving_license: "driving_license",
        nhif: "nhif",
        nrc_zambia: "nrc_zambia",
      };
      const serviceId = String(get().activeServiceId || "");
      const targetForm =
        FORM_BY_SERVICE[serviceId] ||
        Object.keys(FORM_BY_SERVICE).find((k) => serviceId.startsWith(k));
      if (targetForm && ["preview", "templates", "upload", "editor"].includes(current as string)) {
        const goToForm = () =>
          set({
            navigationHistory: get().navigationHistory.filter(
              (h) => h.screen !== "preview" && h.screen !== "downloads" && h.screen !== current,
            ),
            activeScreen: targetForm as any,
            studioMode: false,
            hasUnsavedChanges: false,
            isUnsavedModalOpen: false,
            pendingNavigation: null,
          });
        if (current === "editor" && get().hasUnsavedChanges) {
          set({ isUnsavedModalOpen: true, pendingNavigation: () => goToForm() });
        } else {
          goToForm();
        }
        return;
      }

      let history = [...get().navigationHistory];
      while (
        history.length > 0 &&
        (history[history.length - 1].screen === current ||
          history[history.length - 1].screen === "preview" ||
          history[history.length - 1].screen === "downloads")
      ) {
        history.pop();
      }

      if (history.length === 0) {
        set({
          navigationHistory: [],
          activeScreen: "home",
          hasUnsavedChanges: false,
          isUnsavedModalOpen: false,
          pendingNavigation: null,
        });
        return;
      }

      const last = history.pop();

      const performBack = () => {
        set({
          navigationHistory: history,
          activeScreen: (last?.screen as any) || "home",
          studioMode: last?.screen === "editor",
          hasUnsavedChanges: false,
          isUnsavedModalOpen: false,
          pendingNavigation: null,
        });
        if (last?.serviceId) {
          get().setActiveServiceId(last.serviceId);
        }
        if (last?.screen === "editor") {
          get().restoreStudioDraft(last.serviceId || get().activeServiceId);
        }
      };

      if (get().hasUnsavedChanges && get().activeScreen === "editor") {
        set({
          isUnsavedModalOpen: true,
          pendingNavigation: () => performBack(),
        });
      } else {
        performBack();
      }
    },

    confirmPendingNavigation: async (saveFirst = false) => {
      const { pendingNavigation, saveCurrentTemplate } = get();
      if (saveFirst) {
        await saveCurrentTemplate();
      }
      set({ hasUnsavedChanges: false, isUnsavedModalOpen: false });
      if (pendingNavigation) {
        pendingNavigation();
      }
    },

    cancelPendingNavigation: () => set({ isUnsavedModalOpen: false, pendingNavigation: null }),

    getUniversalFrontTemplate: (serviceId: string) => {
      const customTemplates = get().customTemplates;
      const sId = (serviceId || "").toLowerCase().trim();

      const isServiceMatch = (t: CardTemplate) => {
        const tServ = (t.serviceId || "").toLowerCase().trim();
        const tId = (t.id || "").toLowerCase().trim();
        const tType = (t.cardType || "").toLowerCase().trim();

        if (sId === "driving_license" || sId === "driving_licence") {
          return (
            tServ === "driving_license" ||
            tServ === "driving_licence" ||
            tId.includes("driving") ||
            tType.includes("driving") ||
            tType.includes("license") ||
            tType.includes("licence")
          );
        }
        if (sId === "nida") {
          return (
            tServ === "nida" ||
            tId.includes("nida") ||
            tType.includes("nida") ||
            tType.includes("national")
          );
        }
        if (sId === "nhif") {
          return (
            tServ === "nhif" ||
            tId.includes("nhif") ||
            tType.includes("nhif") ||
            tType.includes("health")
          );
        }
        if (sId === "nrc_zambia" || sId === "nrc card-zambia" || sId === "nrc") {
          return (
            tServ === "nrc_zambia" ||
            tServ === "nrc card-zambia" ||
            tId.includes("nrc") ||
            tType.includes("nrc") ||
            tType.includes("national registration")
          );
        }
        if (sId === "birth_certificate") {
          return tServ === "birth_certificate" || tId.includes("birth") || tType.includes("birth");
        }
        return tServ === sId || tId.includes(sId) || tType.includes(sId.replace("_", " "));
      };

      // 1. PRIMARY RULE: Fetch cloud/custom template matching service and side
      const frontCandidates = customTemplates.filter(
        (t) => isServiceMatch(t) && t.isActive !== false && !isBackSideTemplate(t),
      );
      const activeCustom = frontCandidates.find((t) => t.isUniversal) || frontCandidates[0];
      if (activeCustom) {
        console.log("Template resolution: Found cloud template", activeCustom.id);
        return ensureTemplateFieldIds(activeCustom);
      }

      console.log(
        "Template resolution: No cloud template found, falling back for service",
        serviceId,
      );

      // 2. Fallback to localStorage for explicit JSON object override (Legacy support)
      if (typeof window !== "undefined") {
        const rawObj = localStorage.getItem(`universal_front_obj_${serviceId}`);
        if (rawObj) {
          try {
            const parsed = JSON.parse(rawObj);
            if (parsed && parsed.layers && !isBackSideTemplate(parsed)) {
              return ensureTemplateFieldIds(parsed);
            }
          } catch (e) {
            console.warn("Error parsing universal front object from localStorage:", e);
          }
        }
      }

      // 3. Fallback to saved ID in localStorage (Legacy support)
      const savedId =
        typeof window !== "undefined" ? localStorage.getItem(`universal_front_${serviceId}`) : null;
      if (savedId) {
        const foundCustom = customTemplates.find((t) => t.id === savedId && !isBackSideTemplate(t));
        if (foundCustom) return ensureTemplateFieldIds(foundCustom);
        const foundSample = SAMPLE_TEMPLATES.find(
          (t) => t.id === savedId && !isBackSideTemplate(t),
        );
        if (foundSample) return ensureTemplateFieldIds(foundSample);
      }

      // 4. Fallback to sample templates specifically matching serviceId
      const sampleMatch = SAMPLE_TEMPLATES.find((t) => isServiceMatch(t) && !isBackSideTemplate(t));
      if (sampleMatch) return ensureTemplateFieldIds(sampleMatch);

      // 5. Final Fallback ONLY to default front template if serviceId match is not found
      const fallbackSample = SAMPLE_TEMPLATES.find(
        (t) => isServiceMatch(t) && !isBackSideTemplate(t),
      );
      if (fallbackSample) return ensureTemplateFieldIds(fallbackSample);

      return null;
    },

    getUniversalBackTemplate: (serviceId: string) => {
      const customTemplates = get().customTemplates;
      const sId = (serviceId || "").toLowerCase().trim();

      const isServiceMatch = (t: CardTemplate) => {
        const tServ = (t.serviceId || "").toLowerCase().trim();
        const tId = (t.id || "").toLowerCase().trim();
        const tType = (t.cardType || "").toLowerCase().trim();

        if (sId === "driving_license" || sId === "driving_licence") {
          return (
            tServ === "driving_license" ||
            tServ === "driving_licence" ||
            tId.includes("driving") ||
            tType.includes("driving") ||
            tType.includes("license") ||
            tType.includes("licence")
          );
        }
        if (sId === "nida") {
          return (
            tServ === "nida" ||
            tId.includes("nida") ||
            tType.includes("nida") ||
            tType.includes("national")
          );
        }
        if (sId === "nhif") {
          return (
            tServ === "nhif" ||
            tId.includes("nhif") ||
            tType.includes("nhif") ||
            tType.includes("health")
          );
        }
        if (sId === "nrc_zambia" || sId === "nrc card-zambia" || sId === "nrc") {
          return (
            tServ === "nrc_zambia" ||
            tServ === "nrc card-zambia" ||
            tId.includes("nrc") ||
            tType.includes("nrc") ||
            tType.includes("national registration")
          );
        }
        if (sId === "birth_certificate") {
          return tServ === "birth_certificate" || tId.includes("birth") || tType.includes("birth");
        }
        return tServ === sId || tId.includes(sId) || tType.includes(sId.replace("_", " "));
      };

      // 1. PRIMARY RULE: Fetch cloud/custom template matching service and side
      const backCandidates = customTemplates.filter(
        (t) => isServiceMatch(t) && t.isActive !== false && isBackSideTemplate(t),
      );
      const activeCustom = backCandidates.find((t) => t.isUniversal) || backCandidates[0];
      if (activeCustom) return ensureTemplateFieldIds(activeCustom);

      // 2. Fallback to localStorage for explicit JSON object override (Legacy support)
      if (typeof window !== "undefined") {
        const rawObj = localStorage.getItem(`universal_back_obj_${serviceId}`);
        if (rawObj) {
          try {
            const parsed = JSON.parse(rawObj);
            if (parsed && parsed.layers && isBackSideTemplate(parsed)) {
              return ensureTemplateFieldIds(parsed);
            }
          } catch (e) {
            console.warn("Error parsing universal back object from localStorage:", e);
          }
        }
      }

      // 3. Fallback to saved ID in localStorage (Legacy support)
      const savedId =
        typeof window !== "undefined" ? localStorage.getItem(`universal_back_${serviceId}`) : null;
      if (savedId) {
        const foundCustom = customTemplates.find((t) => t.id === savedId && isBackSideTemplate(t));
        if (foundCustom) return ensureTemplateFieldIds(foundCustom);
        const foundSample = SAMPLE_TEMPLATES.find((t) => t.id === savedId && isBackSideTemplate(t));
        if (foundSample) return ensureTemplateFieldIds(foundSample);
      }

      // 4. Fallback to sample templates specifically matching serviceId
      const sampleMatch = SAMPLE_TEMPLATES.find((t) => isServiceMatch(t) && isBackSideTemplate(t));
      if (sampleMatch) return ensureTemplateFieldIds(sampleMatch);

      const fallbackSample = SAMPLE_TEMPLATES.find(
        (t) => isServiceMatch(t) && isBackSideTemplate(t),
      );
      if (fallbackSample) return ensureTemplateFieldIds(fallbackSample);

      return null;
    },

    saveUniversalFrontTemplate: async (serviceId: string, template: CardTemplate) => {
      set({ isSaving: true });
      try {
        // Pre-save integrity check
        if (!template || !template.background) {
          throw new Error(
            "Pre-save validation error: Template background or layer state is missing.",
          );
        }
        if (template.background.type === "image" && !template.background.src) {
          throw new Error(
            "Pre-save validation error: Background image source URL is missing or empty.",
          );
        }

        const nowIso = new Date().toISOString();
        const uniqueFrontId = template.id.endsWith("_front")
          ? template.id
          : `${template.id.replace(/_back$/, "")}_front`;

        // Admin decides active status. By default when saving/publishing a new universal, we make it active.
        const updatedTpl: CardTemplate = {
          ...template,
          id: uniqueFrontId,
          serviceId,
          side: "Front Side",
          isUniversal: true,
          isUniversalFront: true,
          isUniversalBack: false,
          isActive: true, // New requirement: Admin controlled, but new saves start as active
          visibility: "universal",
          status: "published",
          publishedAt: nowIso,
          publishedBy: "Admin",
          version: (template.version || 0) + 1,
          updatedAt: nowIso,
        };

        // Auto-Deactivate logic for local state
        const updatedCustoms = get().customTemplates.map((t) => {
          if (t.serviceId === serviceId && !isBackSideTemplate(t) && t.id !== uniqueFrontId) {
            return { ...t, isActive: false };
          }
          return t;
        });

        let sanitized = sanitizeTemplateForSaving(updatedTpl);
        try {
          const { sanitizeAndUploadTemplateBackground } = await import("../services/supabase");
          sanitized =
            (await withSaveTimeout(
              sanitizeAndUploadTemplateBackground(sanitized),
              "Front background upload",
            )) || sanitized;
        } catch {}
        await saveTemplateDB(sanitized);

        // Persist deactivated same-side templates to IndexedDB
        for (const t of updatedCustoms) {
          if (t.serviceId === serviceId && !isBackSideTemplate(t) && t.id !== uniqueFrontId) {
            await saveTemplateDB(sanitizeTemplateForSaving(t));
          }
        }

        if (typeof window !== "undefined") {
          safeLocalStorageSetItem(`universal_front_${serviceId}`, sanitized.id);
          safeLocalStorageSetItem(`universal_front_obj_${serviceId}`, JSON.stringify(sanitized));
        }

        // Supabase Universal Template Sync (PROMPT 50.4)
        try {
          const { saveUniversalTemplateSupabase } = await import("../services/supabase");
          // Note: saveUniversalTemplateSupabase already handles server-side auto-deactivation
          const ok = await withSaveTimeout(
            saveUniversalTemplateSupabase(serviceId, sanitized, true, false),
            "Front template cloud save",
          );
          if (!ok) {
            notifySaveIssue(
              "Saved on this device, but the cloud save did not complete. Check your connection and Save again.",
            );
          }
        } catch (e) {
          console.warn("Supabase sync for universal front template skipped:", e);
          notifySaveIssue(
            "Saved on this device, but the cloud save did not complete. Check your connection and Save again.",
          );
        }

        set({
          customTemplates: [...updatedCustoms.filter((t) => t.id !== sanitized.id), sanitized],
          currentTemplate: sanitized,
          hasUnsavedChanges: false,
        });

        await get().loadSavedTemplates();
        get().saveStudioDraft();
      } finally {
        set({ isSaving: false });
      }
    },

    saveUniversalBackTemplate: async (serviceId: string, template: CardTemplate) => {
      set({ isSaving: true });
      try {
        // Pre-save integrity check
        if (!template || !template.background) {
          throw new Error(
            "Pre-save validation error: Template background or layer state is missing.",
          );
        }
        if (template.background.type === "image" && !template.background.src) {
          throw new Error(
            "Pre-save validation error: Background image source URL is missing or empty.",
          );
        }

        const nowIsoBack = new Date().toISOString();
        const uniqueBackId = template.id.endsWith("_back")
          ? template.id
          : `${template.id.replace(/_front$/, "")}_back`;

        const updatedTpl: CardTemplate = {
          ...template,
          id: uniqueBackId,
          serviceId,
          side: "Back Side",
          isUniversal: true,
          isUniversalFront: false,
          isUniversalBack: true,
          isActive: true, // New requirement: Admin controlled, but new saves start as active
          visibility: "universal",
          status: "published",
          publishedAt: nowIsoBack,
          publishedBy: "Admin",
          version: (template.version || 0) + 1,
          updatedAt: nowIsoBack,
        };

        // Auto-Deactivate logic for local state
        const updatedCustoms = get().customTemplates.map((t) => {
          if (t.serviceId === serviceId && isBackSideTemplate(t) && t.id !== uniqueBackId) {
            return { ...t, isActive: false };
          }
          return t;
        });

        let sanitized = sanitizeTemplateForSaving(updatedTpl);
        try {
          const { sanitizeAndUploadTemplateBackground } = await import("../services/supabase");
          sanitized =
            (await withSaveTimeout(
              sanitizeAndUploadTemplateBackground(sanitized),
              "Back background upload",
            )) || sanitized;
        } catch {}
        await saveTemplateDB(sanitized);

        // Persist deactivated same-side templates to IndexedDB
        for (const t of updatedCustoms) {
          if (t.serviceId === serviceId && isBackSideTemplate(t) && t.id !== uniqueBackId) {
            await saveTemplateDB(sanitizeTemplateForSaving(t));
          }
        }

        if (typeof window !== "undefined") {
          safeLocalStorageSetItem(`universal_back_${serviceId}`, sanitized.id);
          safeLocalStorageSetItem(`universal_back_obj_${serviceId}`, JSON.stringify(sanitized));
        }

        // Supabase Universal Template Sync (PROMPT 50.4)
        try {
          const { saveUniversalTemplateSupabase } = await import("../services/supabase");
          // Note: saveUniversalTemplateSupabase already handles server-side auto-deactivation
          const ok = await withSaveTimeout(
            saveUniversalTemplateSupabase(serviceId, sanitized, false, true),
            "Back template cloud save",
          );
          if (!ok) {
            notifySaveIssue(
              "Saved on this device, but the cloud save did not complete. Check your connection and Save again.",
            );
          }
        } catch (e) {
          console.warn("Supabase sync for universal back template skipped:", e);
          notifySaveIssue(
            "Saved on this device, but the cloud save did not complete. Check your connection and Save again.",
          );
        }

        set({
          customTemplates: [...updatedCustoms.filter((t) => t.id !== sanitized.id), sanitized],
          currentTemplate: sanitized,
          hasUnsavedChanges: false,
        });

        await get().loadSavedTemplates();
        get().saveStudioDraft();
      } finally {
        set({ isSaving: false });
      }
    },

    toggleTemplateActive: async (templateId: string, isActive: boolean) => {
      const { customTemplates } = get();
      const target = customTemplates.find((t) => t.id === templateId);
      if (!target) return;

      const serviceId = target.serviceId;
      const isBack = isBackSideTemplate(target);

      // Auto-Deactivate rule: only one can be active per service/side
      const updatedCustoms = customTemplates.map((t) => {
        if (
          isActive &&
          t.serviceId === serviceId &&
          isBackSideTemplate(t) === isBack &&
          t.id !== templateId
        ) {
          return { ...t, isActive: false };
        }
        if (t.id === templateId) {
          return { ...t, isActive };
        }
        return t;
      });

      set({ customTemplates: updatedCustoms });

      // If we are editing the toggled template, sync currentTemplate
      if (get().currentTemplate.id === templateId) {
        set({ currentTemplate: { ...get().currentTemplate, isActive } });
      }

      // Persist to local DB for target and all affected same-side templates
      const updatedTarget = updatedCustoms.find((t) => t.id === templateId)!;
      for (const t of updatedCustoms) {
        if (
          t.id === templateId ||
          (isActive && t.serviceId === serviceId && isBackSideTemplate(t) === isBack)
        ) {
          await saveTemplateDB(sanitizeTemplateForSaving(t));
        }
      }

      // Persist to Supabase
      try {
        const { saveTemplateSupabase, saveUniversalTemplateSupabase } =
          await import("../services/supabase");
        if (updatedTarget.isUniversal) {
          await saveUniversalTemplateSupabase(
            serviceId || "custom",
            updatedTarget,
            !isBack,
            isBack,
          );
        } else {
          await saveTemplateSupabase(updatedTarget);
        }
      } catch (e) {
        console.warn("Supabase sync for isActive toggle failed:", e);
      }

      await get().loadSavedTemplates();
    },

    tokenPackages: initialTokenPackages,
    addTokenPackage: (pkg) => {
      const id = `pkg_${Date.now()}`;
      const newPkg: UsagePackage = { ...pkg, id, active: pkg.active !== false };
      const updated = [...get().tokenPackages, newPkg];
      safeLocalStorageSetItem("bigsta_token_packages", JSON.stringify(updated));
      set({ tokenPackages: updated });
      import("../services/supabase")
        .then(({ saveTokenPackageSupabase }) => {
          saveTokenPackageSupabase(newPkg);
        })
        .catch(() => {});
    },
    editTokenPackage: (id, updatedFields) => {
      const updated = get().tokenPackages.map((p) =>
        p.id === id ? { ...p, ...updatedFields } : p,
      );
      safeLocalStorageSetItem("bigsta_token_packages", JSON.stringify(updated));
      set({ tokenPackages: updated });
      const target = updated.find((p) => p.id === id);
      if (target) {
        import("../services/supabase")
          .then(({ saveTokenPackageSupabase }) => {
            saveTokenPackageSupabase(target);
          })
          .catch(() => {});
      }
    },
    deleteTokenPackage: (id) => {
      const updated = get().tokenPackages.filter((p) => p.id !== id);
      safeLocalStorageSetItem("bigsta_token_packages", JSON.stringify(updated));
      set({ tokenPackages: updated });
      import("../services/supabase")
        .then(({ deleteTokenPackageSupabase }) => {
          deleteTokenPackageSupabase(id);
        })
        .catch(() => {});
    },
    toggleTokenPackage: (id) => {
      const updated = get().tokenPackages.map((p) =>
        p.id === id ? { ...p, active: p.active === false ? true : false } : p,
      );
      safeLocalStorageSetItem("bigsta_token_packages", JSON.stringify(updated));
      set({ tokenPackages: updated });
      const target = updated.find((p) => p.id === id);
      if (target) {
        import("../services/supabase")
          .then(({ saveTokenPackageSupabase }) => {
            saveTokenPackageSupabase(target);
          })
          .catch(() => {});
      }
    },

    addWeeklyOffer: async (offer) => {
      const id = offer.id || `offer_${Date.now()}`;
      const newOffer = { ...offer, id, active: offer.active !== false };
      const updated = [...get().weeklyOffers, newOffer];
      set({ weeklyOffers: updated });
      const { saveWeeklyOfferSupabase } = await import("../services/supabase");
      await saveWeeklyOfferSupabase(newOffer);
    },
    editWeeklyOffer: async (id, fields) => {
      const updated = get().weeklyOffers.map((o) => (o.id === id ? { ...o, ...fields } : o));
      set({ weeklyOffers: updated });
      const target = updated.find((o) => o.id === id);
      if (target) {
        const { saveWeeklyOfferSupabase } = await import("../services/supabase");
        await saveWeeklyOfferSupabase(target);
      }
    },
    deleteWeeklyOffer: async (id) => {
      const updated = get().weeklyOffers.filter((o) => o.id !== id);
      set({ weeklyOffers: updated });
      const { deleteWeeklyOfferSupabase } = await import("../services/supabase");
      await deleteWeeklyOfferSupabase(id);
    },

    services: initialServicesList,
    addService: (service) => {
      const id = service.id || `srv_${Date.now()}`;
      const newSrv = { ...service, id, active: service.active !== false };
      const updated = [...get().services, newSrv];
      safeLocalStorageSetItem("bigsta_services", JSON.stringify(updated));
      set({ services: updated });
    },
    editService: (id, updatedFields) => {
      const updated = get().services.map((s) => (s.id === id ? { ...s, ...updatedFields } : s));
      safeLocalStorageSetItem("bigsta_services", JSON.stringify(updated));
      set({ services: updated });
    },
    deleteService: (id) => {
      const updated = get().services.filter((s) => s.id !== id);
      safeLocalStorageSetItem("bigsta_services", JSON.stringify(updated));
      set({ services: updated });
    },
    toggleService: (id) => {
      const updated = get().services.map((s) => (s.id === id ? { ...s, active: !s.active } : s));
      safeLocalStorageSetItem("bigsta_services", JSON.stringify(updated));
      set({ services: updated });
    },

    // Supabase Auth session state
    authLoading: true,
    authRole: initialAuthRole,
    currentAuthKey: initialAuthKey,
    activePasskeys: initialPasskeys,
    isPasskeyManagerOpen: false,

    registeredUsers: initialRegisteredUsers,
    paymentRequests: initialPaymentRequests,
    manualRequests: initialManualRequests,
    isRechargeModalOpen: false,
    rechargeNotice: null,
    isManualAppModalOpen: false,
    selectedManualService: null,

    setPasskeyManagerOpen: (open) => set({ isPasskeyManagerOpen: open }),
    setRechargeModalOpen: (open, notice = null) =>
      set({ isRechargeModalOpen: open, rechargeNotice: notice }),
    setManualAppModalOpen: (open, service = null) =>
      set({ isManualAppModalOpen: open, selectedManualService: service }),

    registerUserAccount: async (data) => {
      const { registerWithEmailPassword } = await import("../services/auth");
      const fullName = data.fullName.trim().slice(0, 120);
      const email = data.email.trim().toLowerCase();
      const phone = data.phone.trim().replace(/\s+/g, "");

      if (!fullName) return { success: false, message: "Please enter your full name." };
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return { success: false, message: "Enter a valid email address." };
      }
      if (!/^(?:\+255|255|0)[67]\d{8}$/.test(phone)) {
        return { success: false, message: "Enter a valid Tanzanian phone number." };
      }
      if (data.password.length < 8) {
        return { success: false, message: "Choose a password with at least 8 characters." };
      }

      return registerWithEmailPassword({
        fullName,
        email,
        phone,
        password: data.password,
      });
    },

    requestPasswordReset: async (email) => {
      const { requestPasswordReset } = await import("../services/auth");
      return requestPasswordReset(email);
    },

    updateUserActivity: (currentService, currentActivity) => {
      const currentAuthKey = get().currentAuthKey;
      if (!currentAuthKey) return;
      const users = get().registeredUsers;
      const match = users.find((u) => u.passkey.toLowerCase() === currentAuthKey.toLowerCase());
      if (!match) return;

      const nowTs = Date.now();
      const srv = currentService || match.currentService || "BIGsta Portal";
      const act = currentActivity || match.currentActivity || "Active Session";

      const servicesUsed = [...(match.servicesUsed || [])];
      if (srv && !servicesUsed.includes(srv)) {
        servicesUsed.push(srv);
      }

      const updatedUsers = users.map((u) =>
        u.id === match.id
          ? {
              ...u,
              currentService: srv,
              currentActivity: act,
              servicesUsed,
              lastActive: "Just now",
              lastActiveTimestamp: nowTs,
              isOnline: true,
            }
          : u,
      );

      try {
        localStorage.setItem("bigsta_registered_users", JSON.stringify(updatedUsers));
      } catch (e) {}

      set({ registeredUsers: updatedUsers });
    },

    submitPaymentRequest: (packageId, packageName, amount, requestedUsages) => {
      const currentAuthKey = get().currentAuthKey;
      const passkeys = get().activePasskeys;
      const users = get().registeredUsers;

      // Prevent multiple pending requests for the same user/passkey
      const existingPending = get().paymentRequests.find(
        (r) =>
          r.status === "PENDING" &&
          r.userPasskey.toLowerCase() === (currentAuthKey || "").toLowerCase(),
      );
      if (existingPending) {
        return {
          success: false,
          message: "Your previous payment request is still awaiting Admin approval.",
        };
      }

      const userPasskeyItem = passkeys.find(
        (p) => p.role === "user" && p.key.toLowerCase() === (currentAuthKey || "").toLowerCase(),
      );
      const userRecord = users.find(
        (u) => u.passkey.toLowerCase() === (currentAuthKey || "").toLowerCase(),
      );

      const now = new Date();
      const nowTs = now.getTime();
      const dateStr = now.toISOString().replace("T", " ").substring(0, 16);

      const newRequest: PaymentRequest = {
        id: `pay_${nowTs}`,
        userId: userRecord?.id,
        userName: userRecord?.fullName || userPasskeyItem?.createdBy || "Registered User",
        userPhone: userRecord?.phone || "N/A",
        passkeyId: userPasskeyItem?.id || "",
        userPasskey: userPasskeyItem?.key || currentAuthKey || "",
        packageId,
        packageName,
        amount,
        requestedUsages,
        lipaNumber: "1234678",
        date: dateStr,
        timestamp: nowTs,
        status: "PENDING",
      };

      const updatedRequests = [...get().paymentRequests, newRequest];

      const updatedPasskeys = passkeys.map((p) =>
        p.id === userPasskeyItem?.id
          ? { ...p, paymentStatus: "PENDING" as PaymentStatus, packageName, packagePrice: amount }
          : p,
      );

      try {
        localStorage.setItem("bigsta_payment_requests", JSON.stringify(updatedRequests));
      } catch (e) {}

      // Sync passkey status to Supabase
      const updatedUserPk = updatedPasskeys.find((p) => p.id === userPasskeyItem?.id);
      if (updatedUserPk) {
        import("../services/supabase")
          .then(({ syncPasskeySupabase }) => {
            syncPasskeySupabase(updatedUserPk);
          })
          .catch(() => {});
      }

      set({ paymentRequests: updatedRequests, activePasskeys: updatedPasskeys });

      // Sync payment request to Supabase for cross-device visibility
      import("../services/supabase")
        .then(({ syncPaymentRequestSupabase }) => {
          syncPaymentRequestSupabase(newRequest);
        })
        .catch(() => {});

      return {
        success: true,
        message: "Payment submitted. Please wait for Admin approval.",
        request: newRequest,
      };
    },

    approvePaymentRequest: (requestId) => {
      const requests = get().paymentRequests;
      const targetReq = requests.find((r) => r.id === requestId);
      if (!targetReq || targetReq.status !== "PENDING") {
        return { success: false, message: "Payment request not found or already processed." };
      }

      const now = new Date();
      const dateStr = now.toISOString().replace("T", " ").substring(0, 16);

      const updatedRequests = requests.map((r) =>
        r.id === requestId ? { ...r, status: "APPROVED" as const, reviewedDate: dateStr } : r,
      );

      const passkeys = get().activePasskeys;
      const updatedPasskeys = passkeys.map((p) => {
        if (
          p.id === targetReq.passkeyId ||
          p.key.toLowerCase() === targetReq.userPasskey.toLowerCase()
        ) {
          const newTotal = (p.totalUsages ?? 0) + targetReq.requestedUsages;
          const newRem = (p.remainingUsages ?? 0) + targetReq.requestedUsages;
          return {
            ...p,
            totalUsages: newTotal,
            remainingUsages: newRem,
            paymentStatus: "ACTIVE" as PaymentStatus,
            active: true,
            packageName: targetReq.packageName,
            packagePrice: targetReq.amount,
          };
        }
        return p;
      });

      const users = get().registeredUsers;
      const updatedUsers = users.map((u) => {
        if (
          u.passkey.toLowerCase() === targetReq.userPasskey.toLowerCase() ||
          u.id === targetReq.userId
        ) {
          return {
            ...u,
            status: "ACTIVE" as const,
            tokens: (u.tokens || 0) + targetReq.requestedUsages,
          };
        }
        return u;
      });

      try {
        localStorage.setItem("bigsta_payment_requests", JSON.stringify(updatedRequests));
        localStorage.setItem("bigsta_registered_users", JSON.stringify(updatedUsers));
      } catch (e) {}

      // Sync approved passkey to Supabase
      const approvedPk = updatedPasskeys.find(
        (p) =>
          p.id === targetReq.passkeyId ||
          p.key.toLowerCase() === targetReq.userPasskey.toLowerCase(),
      );
      if (approvedPk) {
        get().showSuccessActivation(
          `Congratulations! Your ${targetReq.packageName} has been activated successfully.`,
        );
        import("../services/supabase")
          .then(({ syncPasskeySupabase }) => {
            syncPasskeySupabase(approvedPk);
          })
          .catch(() => {});
      }

      set({
        paymentRequests: updatedRequests,
        activePasskeys: updatedPasskeys,
        registeredUsers: updatedUsers,
      });

      // Sync approved status and credit tokens to Supabase
      import("../services/supabase")
        .then(({ updatePaymentRequestStatusSupabase, creditUserTokensSupabase }) => {
          updatePaymentRequestStatusSupabase(requestId, "APPROVED", dateStr);
          const targetKey = targetReq.userId || targetReq.userPasskey;
          if (targetKey) {
            creditUserTokensSupabase(targetKey, targetReq.requestedUsages);
          }
        })
        .catch(() => {});

      return { success: true, message: "Payment request approved successfully. Usages activated!" };
    },

    rejectPaymentRequest: (requestId) => {
      const requests = get().paymentRequests;
      const targetReq = requests.find((r) => r.id === requestId);
      if (!targetReq) {
        return { success: false, message: "Payment request not found." };
      }

      const now = new Date();
      const dateStr = now.toISOString().replace("T", " ").substring(0, 16);

      const updatedRequests = requests.map((r) =>
        r.id === requestId ? { ...r, status: "REJECTED" as const, reviewedDate: dateStr } : r,
      );

      const passkeys = get().activePasskeys;
      const updatedPasskeys = passkeys.map((p) => {
        if (
          p.id === targetReq.passkeyId ||
          p.key.toLowerCase() === targetReq.userPasskey.toLowerCase()
        ) {
          const rem = p.remainingUsages ?? 0;
          return {
            ...p,
            paymentStatus: rem > 0 ? ("ACTIVE" as PaymentStatus) : ("EXHAUSTED" as PaymentStatus),
          };
        }
        return p;
      });

      try {
        localStorage.setItem("bigsta_payment_requests", JSON.stringify(updatedRequests));
      } catch (e) {}

      // Sync rejected passkey to Supabase
      const rejectedPk = updatedPasskeys.find(
        (p) =>
          p.id === targetReq.passkeyId ||
          p.key.toLowerCase() === targetReq.userPasskey.toLowerCase(),
      );
      if (rejectedPk) {
        import("../services/supabase")
          .then(({ syncPasskeySupabase }) => {
            syncPasskeySupabase(rejectedPk);
          })
          .catch(() => {});
      }

      set({ paymentRequests: updatedRequests, activePasskeys: updatedPasskeys });

      // Sync rejected status to Supabase
      import("../services/supabase")
        .then(({ updatePaymentRequestStatusSupabase }) => {
          updatePaymentRequestStatusSupabase(requestId, "REJECTED", dateStr);
        })
        .catch(() => {});

      return { success: true, message: "Payment request rejected." };
    },

    cancelPaymentRequest: (requestId) => {
      const currentAuthKey = get().currentAuthKey;
      const requests = get().paymentRequests;

      const targetReq = requestId
        ? requests.find((r) => r.id === requestId)
        : requests.find(
            (r) =>
              r.status === "PENDING" &&
              r.userPasskey.toLowerCase() === (currentAuthKey || "").toLowerCase(),
          );

      if (!targetReq) {
        return { success: false, message: "No active pending payment request found to cancel." };
      }

      const now = new Date();
      const dateStr = now.toISOString().replace("T", " ").substring(0, 16);

      const updatedRequests = requests.map((r) =>
        r.id === targetReq.id
          ? {
              ...r,
              status: "CANCELLED" as const,
              reviewedDate: dateStr,
              adminNotes: "Cancelled by user",
            }
          : r,
      );

      const passkeys = get().activePasskeys;
      const updatedPasskeys = passkeys.map((p) => {
        if (
          p.id === targetReq.passkeyId ||
          p.key.toLowerCase() === targetReq.userPasskey.toLowerCase()
        ) {
          const rem = p.remainingUsages ?? 0;
          return {
            ...p,
            paymentStatus: rem > 0 ? ("ACTIVE" as PaymentStatus) : ("EXHAUSTED" as PaymentStatus),
          };
        }
        return p;
      });

      try {
        localStorage.setItem("bigsta_payment_requests", JSON.stringify(updatedRequests));
        localStorage.setItem("bigsta_active_passkeys", JSON.stringify(updatedPasskeys));
      } catch (e) {}

      // Sync passkey status to Supabase
      const affectedPk = updatedPasskeys.find(
        (p) =>
          p.id === targetReq.passkeyId ||
          p.key.toLowerCase() === targetReq.userPasskey.toLowerCase(),
      );
      if (affectedPk) {
        import("../services/supabase")
          .then(({ syncPasskeySupabase }) => {
            syncPasskeySupabase(affectedPk);
          })
          .catch(() => {});
      }

      set({ paymentRequests: updatedRequests, activePasskeys: updatedPasskeys });

      // Sync cancelled status to Supabase
      import("../services/supabase")
        .then(({ updatePaymentRequestStatusSupabase }) => {
          updatePaymentRequestStatusSupabase(targetReq.id, "CANCELLED", dateStr);
        })
        .catch(() => {});

      return { success: true, message: "Token request cancelled successfully." };
    },

    updateUserPaymentRequest: (requestId, packageId, packageName, amount, requestedUsages) => {
      const requests = get().paymentRequests;
      const targetReq = requests.find((r) => r.id === requestId);
      if (!targetReq) {
        return { success: false, message: "Payment request not found." };
      }

      const now = new Date();
      const dateStr = now.toISOString().replace("T", " ").substring(0, 16);

      const updatedRequests = requests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              packageId,
              packageName,
              amount,
              requestedUsages,
              timestamp: Date.now(),
              date: dateStr,
            }
          : r,
      );

      const passkeys = get().activePasskeys;
      const updatedPasskeys = passkeys.map((p) => {
        if (
          p.id === targetReq.passkeyId ||
          p.key.toLowerCase() === targetReq.userPasskey.toLowerCase()
        ) {
          return {
            ...p,
            packageName: `${packageName} (${amount})`,
            packagePrice: amount,
            paymentStatus: "PENDING" as PaymentStatus,
          };
        }
        return p;
      });

      try {
        localStorage.setItem("bigsta_payment_requests", JSON.stringify(updatedRequests));
        localStorage.setItem("bigsta_active_passkeys", JSON.stringify(updatedPasskeys));
      } catch (e) {}

      const affectedPk = updatedPasskeys.find(
        (p) =>
          p.id === targetReq.passkeyId ||
          p.key.toLowerCase() === targetReq.userPasskey.toLowerCase(),
      );
      if (affectedPk) {
        import("../services/supabase")
          .then(({ syncPasskeySupabase }) => {
            syncPasskeySupabase(affectedPk);
          })
          .catch(() => {});
      }

      set({ paymentRequests: updatedRequests, activePasskeys: updatedPasskeys });

      const updatedReqItem = updatedRequests.find((r) => r.id === requestId);
      if (updatedReqItem) {
        import("../services/supabase")
          .then(({ syncPaymentRequestSupabase }) => {
            syncPaymentRequestSupabase(updatedReqItem);
          })
          .catch(() => {});
      }

      return {
        success: true,
        message: `Token request updated to ${packageName} (${amount}) successfully!`,
      };
    },

    updatePaymentRequest: (requestId, updates) => {
      const { paymentRequests } = get();
      const updated = paymentRequests.map((r) => (r.id === requestId ? { ...r, ...updates } : r));
      try {
        localStorage.setItem("bigsta_payment_requests", JSON.stringify(updated));
      } catch (e) {}
      set({ paymentRequests: updated });
      return { success: true, message: "Payment record updated successfully" };
    },

    reactivatePaymentRequest: (requestId) => {
      const { paymentRequests } = get();
      const target = paymentRequests.find((r) => r.id === requestId);
      if (!target) return { success: false, message: "Request not found" };

      const updated = paymentRequests.map((r) =>
        r.id === requestId ? { ...r, status: "PENDING" as const } : r,
      );
      try {
        localStorage.setItem("bigsta_payment_requests", JSON.stringify(updated));
      } catch (e) {}
      set({ paymentRequests: updated });

      import("../services/supabase")
        .then(({ updatePaymentRequestStatusSupabase }) => {
          updatePaymentRequestStatusSupabase(requestId, "PENDING");
        })
        .catch(() => {});

      return { success: true, message: "Payment reactivated to PENDING" };
    },

    submitManualRequest: (data) => {
      const currentAuthKey = get().currentAuthKey;
      const passkeys = get().activePasskeys;
      const users = get().registeredUsers;

      const userPasskeyItem = passkeys.find(
        (p) => p.key.toLowerCase() === (currentAuthKey || "").toLowerCase(),
      );
      const userRecord = users.find(
        (u) => u.passkey.toLowerCase() === (currentAuthKey || "").toLowerCase(),
      );

      const now = new Date();
      const nowTs = now.getTime();
      const dateStr = now.toISOString().replace("T", " ").substring(0, 16);

      const normalNum = data.normalNumber || data.normalCallNumber || "";

      const newRequest: ManualRequestItem = {
        id: `req_${nowTs}`,
        timestamp: nowTs,
        submittedAt: nowTs,
        date: dateStr,
        serviceId: data.serviceId,
        serviceName: data.serviceName,
        fullName: data.fullName.trim(),
        whatsappNumber: data.whatsappNumber.trim(),
        normalNumber: normalNum.trim(),
        normalCallNumber: normalNum.trim(),
        accountKey: userPasskeyItem?.key || currentAuthKey || "Guest",
        accountUser: userRecord?.fullName || userPasskeyItem?.createdBy || "System User",
        userPasskey: userPasskeyItem?.key || currentAuthKey || "Guest",
        status: "PENDING",
      };

      // Filter out any older request for the same service from this user/device
      const filteredOld = get().manualRequests.filter(
        (r) =>
          !(
            r.serviceId === data.serviceId &&
            (r.userPasskey === currentAuthKey || r.accountKey === currentAuthKey || !currentAuthKey)
          ),
      );
      const updatedRequests = [newRequest, ...filteredOld];
      try {
        localStorage.setItem("bigsta_manual_requests", JSON.stringify(updatedRequests));
      } catch (e) {}

      // Sync to Supabase in background
      import("../services/supabase")
        .then(({ syncManualRequestSupabase }) => {
          syncManualRequestSupabase(newRequest);
        })
        .catch((e) => console.warn("Supabase manual request sync skipped:", e));

      set({ manualRequests: updatedRequests });
      return {
        success: true,
        message: "Manual application request submitted successfully!",
        request: newRequest,
      };
    },

    updateManualRequestStatus: (requestId, status, adminNotes) => {
      const updated = get().manualRequests.map((r) =>
        r.id === requestId
          ? { ...r, status, ...(adminNotes !== undefined ? { adminNotes } : {}) }
          : r,
      );
      try {
        localStorage.setItem("bigsta_manual_requests", JSON.stringify(updated));
      } catch (e) {}

      const updatedItem = updated.find((r) => r.id === requestId);
      if (updatedItem) {
        import("../services/supabase")
          .then(({ syncManualRequestSupabase }) => {
            syncManualRequestSupabase(updatedItem);
          })
          .catch((e) => console.warn("Supabase manual request status sync skipped:", e));
      }

      set({ manualRequests: updated });
      return { success: true, message: `Request status updated to ${status}` };
    },

    deleteManualRequest: (requestId) => {
      const updated = get().manualRequests.filter((r) => r.id !== requestId);
      try {
        localStorage.setItem("bigsta_manual_requests", JSON.stringify(updated));
      } catch (e) {}

      import("../services/supabase")
        .then(({ supabase }) => {
          if (supabase) {
            supabase
              .from("manual_requests")
              .delete()
              .eq("id", requestId)
              .then(() => {});
          }
        })
        .catch((e) => console.warn("Supabase manual request delete skipped:", e));

      set({ manualRequests: updated });
      return { success: true, message: "Request deleted successfully" };
    },

    toggleUserStatus: (userId) => {
      const users = get().registeredUsers;
      const targetUser = users.find((u) => u.id === userId);
      if (!targetUser) return;

      const newStatus =
        targetUser.status === "ACTIVE" ? ("DISABLED" as const) : ("ACTIVE" as const);
      const updatedUsers = users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u));

      const passkeys = get().activePasskeys;
      const updatedPasskeys = passkeys.map((p) => {
        if (
          p.id === targetUser.passkeyId ||
          p.key.toLowerCase() === targetUser.passkey.toLowerCase()
        ) {
          const newActive = newStatus === "ACTIVE";
          return {
            ...p,
            active: newActive,
            paymentStatus: newActive ? ("ACTIVE" as PaymentStatus) : ("DISABLED" as PaymentStatus),
          };
        }
        return p;
      });

      try {
        localStorage.setItem("bigsta_registered_users", JSON.stringify(updatedUsers));
        localStorage.removeItem("bigsta_passkeys");
      } catch (e) {}

      const targetPk = updatedPasskeys.find(
        (p) =>
          p.id === targetUser.passkeyId || p.key.toLowerCase() === targetUser.passkey.toLowerCase(),
      );
      if (targetPk) {
        import("../services/supabase")
          .then(({ syncPasskeySupabase }) => {
            syncPasskeySupabase(targetPk);
          })
          .catch(() => {});
      }

      set({ registeredUsers: updatedUsers, activePasskeys: updatedPasskeys });
    },

    deleteRegisteredUser: (userId) => {
      const targetUser = get().registeredUsers.find((u) => u.id === userId);
      const updatedUsers = get().registeredUsers.filter((u) => u.id !== userId);

      let updatedPasskeys = get().activePasskeys;
      if (targetUser) {
        updatedPasskeys = updatedPasskeys.filter(
          (p) =>
            p.id !== targetUser.passkeyId &&
            p.key.toLowerCase() !== targetUser.passkey.toLowerCase(),
        );
      }

      try {
        localStorage.setItem("bigsta_registered_users", JSON.stringify(updatedUsers));
        localStorage.removeItem("bigsta_passkeys");
      } catch (e) {}

      if (targetUser) {
        import("../services/supabase")
          .then(({ deletePasskeySupabase }) => {
            deletePasskeySupabase(targetUser.passkeyId, targetUser.passkey);
          })
          .catch(() => {});
      }

      set({ registeredUsers: updatedUsers, activePasskeys: updatedPasskeys });
    },

    refreshUserStatus: () => {
      try {
        const rawReqs = localStorage.getItem("bigsta_payment_requests");
        const rawUsers = localStorage.getItem("bigsta_registered_users");

        let updatedReqs = get().paymentRequests;
        let updatedUsers = get().registeredUsers;

        if (rawReqs) updatedReqs = JSON.parse(rawReqs);
        if (rawUsers) updatedUsers = JSON.parse(rawUsers);

        // Ensure passkeys are never cached in phone storage
        localStorage.removeItem("bigsta_passkeys");

        set({
          paymentRequests: updatedReqs,
          registeredUsers: updatedUsers,
        });
      } catch (e) {}
    },

    unsubscribePaymentRequestsFromSupabase: () => {
      unsubscribePaymentRequestsListener();
    },

    fetchPaymentRequestsFromSupabase: async () => {
      try {
        const { fetchPaymentRequestsSupabase, subscribePaymentRequestsRealtime } =
          await import("../services/supabase");
        const dbReqs = await fetchPaymentRequestsSupabase();
        if (dbReqs && Array.isArray(dbReqs)) {
          const remoteIds = new Set(dbReqs.map((r: PaymentRequest) => r.id));
          const localOnly = get().paymentRequests.filter((r) => !remoteIds.has(r.id));
          const combined = [...dbReqs, ...localOnly];
          set({ paymentRequests: combined });
          try {
            localStorage.setItem("bigsta_payment_requests", JSON.stringify(combined));
          } catch (e) {}
        }
        if (!isPaymentRequestsSubscribed) {
          isPaymentRequestsSubscribed = true;
          unsubscribePaymentRequests = subscribePaymentRequestsRealtime((fresh) => {
            if (fresh && Array.isArray(fresh)) {
              const remoteIds = new Set(fresh.map((r: PaymentRequest) => r.id));
              const localOnly = get().paymentRequests.filter((r) => !remoteIds.has(r.id));
              const merged = [...fresh, ...localOnly];
              set({ paymentRequests: merged });
              try {
                localStorage.setItem("bigsta_payment_requests", JSON.stringify(merged));
              } catch (e) {}
            }
          });
        }
      } catch (e) {
        console.warn("Failed to fetch payment requests from Supabase:", e);
      }
    },

    fetchPasskeysFromSupabase: async () => {
      get().fetchPaymentRequestsFromSupabase();
      set({ loadingPasskeys: true });
      try {
        const {
          supabase,
          fetchPasskeysSupabase,
          fetchAllProfilesSupabase,
          fetchPaymentMethodsSupabase,
          fetchAdminSettingsSupabase,
        } = await import("../services/supabase");
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          set({ activePasskeys: [], registeredUsers: [] });
          return;
        }

        // Parallel fetch for speed
        const [supabasePasskeys, supabaseProfiles, dbPaymentMethods, dbAdminSettings] =
          await Promise.all([
            fetchPasskeysSupabase().catch(() => []),
            fetchAllProfilesSupabase().catch(() => []),
            fetchPaymentMethodsSupabase().catch(() => []),
            fetchAdminSettingsSupabase().catch(() => null),
          ]);

        // RLS returns only this account's rows unless the session is an admin.
        set({ activePasskeys: supabasePasskeys || [] });

        const mappedUsers: RegisteredUser[] = (supabaseProfiles || []).map((profile) => ({
          id: profile.id,
          fullName: profile.name || profile.fullName || "Account",
          phone: profile.phone || "",
          passkey: profile.auth_user_id || profile.passkey || profile.id,
          passkeyId: profile.id,
          role: "user",
          tokens: typeof profile.tokens === "number" ? profile.tokens : 0,
          status: (profile.status || "ACTIVE") as "ACTIVE" | "DISABLED" | "PENDING",
          registeredDate: profile.created_at
            ? new Date(profile.created_at).toISOString().replace("T", " ").substring(0, 16)
            : new Date().toISOString().replace("T", " ").substring(0, 16),
          createdAtTimestamp: profile.created_at ? new Date(profile.created_at).getTime() : Date.now(),
          lastActive: "Recent activity",
          lastActiveTimestamp: Date.now(),
          isOnline: false,
          currentService: "None",
          currentActivity: "Active",
          servicesUsed: [],
        }));

        const currentUser = get().registeredUsers.find(
          (user) => user.passkey === get().currentAuthKey,
        );
        set({ registeredUsers: mappedUsers.length ? mappedUsers : currentUser ? [currentUser] : [] });

        // 3. Fetch Payment Methods
        if (dbPaymentMethods && dbPaymentMethods.length > 0) {
          set({ paymentMethods: dbPaymentMethods });
          try {
            localStorage.setItem("bigsta_payment_methods", JSON.stringify(dbPaymentMethods));
          } catch (e) {}
        }

        // 4. Fetch Admin Settings
        if (dbAdminSettings) {
          const currentSettings = get().adminSettings;
          set({ adminSettings: { ...currentSettings, ...dbAdminSettings } });
          try {
            localStorage.setItem(
              "bigsta_admin_system_settings",
              JSON.stringify({ ...currentSettings, ...dbAdminSettings }),
            );
          } catch (e) {}
        }

        if (typeof window !== "undefined") {
          localStorage.removeItem("bigsta_passkeys");
        }
      } catch (e) {
        console.warn("Failed to fetch passkeys and profiles from Supabase:", e);
      } finally {
        set({ loadingPasskeys: false });
      }
    },

    loginWithEmailPassword: async (email, password) => {
      const { signInWithEmailPassword } = await import("../services/auth");
      return signInWithEmailPassword(email, password);
    },

    logoutPasskey: () => {
      unsubscribePaymentRequestsListener();
      import("../services/supabase")
        .then(({ supabase }) => supabase.auth.signOut())
        .catch(() => {});

      try {
        localStorage.removeItem("bigsta_auth_role");
        localStorage.removeItem("bigsta_auth_key");
        localStorage.removeItem("bigsta_user_profile");
        localStorage.removeItem("bigsta_passkeys");
      } catch {}

      set({
        authLoading: false,
        authRole: null,
        currentAuthKey: null,
        activePasskeys: [],
        registeredUsers: [],
        paymentRequests: [],
        manualRequests: [],
        activeScreen: "home",
        userProfile: { name: "", phone: "", email: "", region: "" },
      });
    },

    addPasskey: (item) => {
      const now = new Date();
      const role = item.role || "user";
      const totalUsages =
        item.totalUsages !== undefined ? item.totalUsages : role === "admin" ? 99999 : 1;
      const usedUsages = item.usedUsages || 0;
      const remainingUsages = Math.max(0, totalUsages - usedUsages);
      const paymentStatus: PaymentStatus =
        item.paymentStatus || (role === "admin" ? "ACTIVE" : "PENDING");

      const newItem: PasskeyItem = {
        id: `pk_${Date.now()}`,
        key: item.key,
        role,
        active: paymentStatus !== "DISABLED",
        createdDate: now.toISOString().replace("T", " ").substring(0, 16),
        createdAtTimestamp: now.getTime(),
        createdBy: item.createdBy || "Admin",
        description:
          item.description || (role === "admin" ? "Admin Passkey" : "Custom User Passkey"),
        totalUsages,
        usedUsages,
        remainingUsages,
        paymentStatus,
        packageName:
          item.packageName ||
          (role === "admin" ? "Unlimited Admin" : `${totalUsages} Usages Package`),
        packagePrice: item.packagePrice || (role === "admin" ? "Free" : "Custom"),
        usageHistory: [],
      };
      const updated = [newItem, ...get().activePasskeys];
      try {
        localStorage.removeItem("bigsta_passkeys");
      } catch (e) {}
      set({ activePasskeys: updated });

      try {
        import("../services/supabase").then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(newItem);
        });
      } catch (e) {}

      return newItem;
    },

    generateUserPasskey: (description, usages = 1, options) => {
      const numUsages = typeof usages === "number" ? usages : 1;
      const isAutoActive = options?.paymentStatus === "ACTIVE";
      const packageName = options?.packageName || `${numUsages} Usages Package`;
      const priceStr = options?.packagePrice
        ? String(options.packagePrice)
        : numUsages === 1
          ? "Free"
          : numUsages === 2
            ? "TSh 15,000"
            : "TSh 25,000";

      return get().generateUserPasskeyWithPackage(
        packageName,
        numUsages,
        priceStr,
        isAutoActive,
        description,
      );
    },

    generateUserPasskeyWithPackage: (
      packageName,
      usages,
      price,
      isAutoActive = false,
      description,
    ) => {
      const randNum = Math.floor(10000 + Math.random() * 90000);
      const generatedKey = `BIGSTA-USR-${randNum}`;
      const now = new Date();
      const paymentStatus: PaymentStatus = isAutoActive ? "ACTIVE" : "PENDING";

      const newItem: PasskeyItem = {
        id: `pk_${Date.now()}`,
        key: generatedKey,
        role: "user",
        active: true,
        createdDate: now.toISOString().replace("T", " ").substring(0, 16),
        createdAtTimestamp: now.getTime(),
        createdBy: "Admin",
        description: description || `User Passkey (${packageName})`,
        totalUsages: usages,
        usedUsages: 0,
        remainingUsages: usages,
        paymentStatus,
        packageName,
        packagePrice: price,
        usageHistory: [],
      };
      get().addTokenHistoryItem(
        usages,
        `Passkey Issued: ${packageName} (${generatedKey})`,
        newItem.id,
      );
      const updated = [newItem, ...get().activePasskeys];
      try {
        localStorage.removeItem("bigsta_passkeys");
      } catch (e) {}
      set({ activePasskeys: updated });

      try {
        import("../services/supabase").then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(newItem);
        });
      } catch (e) {}

      return newItem;
    },

    generateAdminPasskey: (description) => {
      const randNum = Math.floor(10000 + Math.random() * 90000);
      const generatedKey = `BIGSTA-ADM-${randNum}`;
      const now = new Date();
      const newItem: PasskeyItem = {
        id: `pk_${Date.now()}`,
        key: generatedKey,
        role: "admin",
        active: true,
        createdDate: now.toISOString().replace("T", " ").substring(0, 16),
        createdAtTimestamp: now.getTime(),
        createdBy: "Admin",
        description: description || "Generated Admin Passkey",
        totalUsages: 99999,
        usedUsages: 0,
        remainingUsages: 99999,
        paymentStatus: "ACTIVE",
        packageName: "Unlimited Admin",
        packagePrice: "Free",
        usageHistory: [],
      };
      const updated = [newItem, ...get().activePasskeys];
      try {
        localStorage.removeItem("bigsta_passkeys");
      } catch (e) {}
      set({ activePasskeys: updated });

      try {
        import("../services/supabase").then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(newItem);
        });
      } catch (e) {}

      return newItem;
    },

    consumeUsage: (serviceName = "NIDA Service Completion", details, tokenCost) => {
      const authKey =
        get().currentAuthKey ||
        (typeof window !== "undefined" ? localStorage.getItem("bigsta_auth_key") : null);
      const role = get().authRole;

      if (role === "admin") {
        return { success: true, remainingUsages: 99999 };
      }

      const list = get().activePasskeys;
      const match = list.find((p) => p.key.toLowerCase() === (authKey || "").toLowerCase());

      if (!match) {
        return { success: false, remainingUsages: 0, message: "No valid active passkey session." };
      }

      if (!match.active || match.paymentStatus === "DISABLED") {
        return { success: false, remainingUsages: 0, message: "Passkey has been disabled." };
      }

      let cost = typeof tokenCost === "number" ? tokenCost : 1;
      if (typeof tokenCost !== "number" && get().currentTemplate) {
        const activeTpl = get().currentTemplate;
        const name = (activeTpl?.templateName || "").toLowerCase();
        const cardType = (activeTpl?.cardType || "").toLowerCase();

        if (
          cardType === "driving license" ||
          name.includes("driving") ||
          name.includes("driver") ||
          name.includes("license") ||
          name.includes("licence") ||
          name.includes("permit")
        ) {
          const service = get().services.find((s) => s.id === "driving_license");
          cost = service ? (service.tokenCost ?? 1) : 1;
        } else {
          const service = get().services.find((s) => s.id === "nida");
          cost = service ? (service.tokenCost ?? 1) : 1;
        }
      }

      const currentRemaining = match.remainingUsages ?? 0;

      // Only block pending payments if the user does NOT have enough remaining usages
      if (match.paymentStatus === "PENDING" && currentRemaining < cost) {
        return {
          success: false,
          remainingUsages: currentRemaining,
          message: "Payment pending confirmation by Administrator.",
        };
      }

      if (currentRemaining < cost || match.paymentStatus === "EXHAUSTED") {
        return {
          success: false,
          remainingUsages: currentRemaining,
          message: `Insufficient tokens. This service requires ${cost} tokens, but you only have ${currentRemaining} tokens.`,
        };
      }

      const newUsed = (match.usedUsages ?? 0) + cost;
      const newRemaining = Math.max(0, (match.totalUsages ?? 1) - newUsed);
      // Keep PENDING status if it was already pending and they still have remaining usages
      const newPaymentStatus: PaymentStatus =
        newRemaining === 0 ? "EXHAUSTED" : match.paymentStatus === "PENDING" ? "PENDING" : "ACTIVE";

      const historyItem: PasskeyUsageHistoryItem = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
        serviceName,
        details,
      };

      const updatedItem: PasskeyItem = {
        ...match,
        usedUsages: newUsed,
        remainingUsages: newRemaining,
        paymentStatus: newPaymentStatus,
        usageHistory: [historyItem, ...(match.usageHistory || [])],
      };

      const updatedList = list.map((p) => (p.id === match.id ? updatedItem : p));

      try {
        localStorage.removeItem("bigsta_passkeys");
      } catch (e) {}

      set({ activePasskeys: updatedList });

      try {
        import("../services/supabase").then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(updatedItem);
        });
      } catch (e) {}

      get().addTokenHistoryItem(
        -cost,
        details ? `${serviceName} (${details})` : serviceName,
        match.id,
      );

      return { success: true, remainingUsages: newRemaining };
    },

    confirmPaymentAndActivatePasskey: (id: string) => {
      const list = get().activePasskeys;
      let targetPk: PasskeyItem | null = null;
      const updated = list.map((p) => {
        if (p.id === id) {
          const remaining = Math.max(0, (p.totalUsages ?? 1) - (p.usedUsages ?? 0));
          targetPk = {
            ...p,
            active: true,
            paymentStatus:
              remaining > 0 ? ("ACTIVE" as PaymentStatus) : ("EXHAUSTED" as PaymentStatus),
          };
          return targetPk;
        }
        return p;
      });
      try {
        localStorage.removeItem("bigsta_passkeys");
      } catch (e) {}
      set({ activePasskeys: updated });

      if (targetPk) {
        import("../services/supabase").then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(targetPk!);
        });
      }
    },

    addUsagesToPasskey: (
      id: string,
      additionalUsages: number,
      newPackageName?: string,
      historyReason?: string,
    ) => {
      const list = get().activePasskeys;
      const resolvedId = list.find((p) => p.id === id)?.id ?? list.find((p) => p.key === id)?.id;
      let targetPk: PasskeyItem | null = null;
      const updated = list.map((p) => {
        if (p.id === resolvedId) {
          const newTotal = (p.totalUsages ?? 0) + additionalUsages;
          const newRemaining = Math.max(0, newTotal - (p.usedUsages ?? 0));
          const newPaymentStatus: PaymentStatus = newRemaining > 0 ? "ACTIVE" : "EXHAUSTED";
          targetPk = {
            ...p,
            totalUsages: newTotal,
            remainingUsages: newRemaining,
            packageName: newPackageName || p.packageName || `${newTotal} Usages Package`,
            paymentStatus: newPaymentStatus,
            active: true,
          };
          return targetPk;
        }
        return p;
      });
      try {
        localStorage.removeItem("bigsta_passkeys");
      } catch (e) {}
      set({ activePasskeys: updated });

      if (targetPk) {
        const pk: PasskeyItem = targetPk;
        import("../services/supabase").then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(pk);
        });

        const fallbackReason =
          additionalUsages > 0
            ? `Tokens Added to Passkey (${pk.key})`
            : `Tokens Removed from Passkey (${pk.key})`;
        get().addTokenHistoryItem(
          additionalUsages,
          historyReason || newPackageName || fallbackReason,
          pk.id,
        );
      }
    },

    // =========================================================================
    // CENTRAL AUTHORIZATION & VALIDATION GATE
    // =========================================================================

    validateServiceAccess: (serviceId?: string): ServiceValidationResult => {
      const { authRole, currentAuthKey, activePasskeys, services, activeServiceId } = get();
      const targetServiceId = serviceId || activeServiceId || "nida";

      console.log("[SERVICE VALIDATION DEBUG] Validating service access:", {
        targetServiceId,
        authRole,
        currentAuthKey,
      });

      // 1. Admin Override: Admins always bypass payment/usage checks
      if (authRole === "admin") {
        return { allowed: true, remainingUsages: 99999, cost: 0 };
      }

      // 2. User Logged In Check
      if (!authRole || !currentAuthKey) {
        return {
          allowed: false,
          reason: "NOT_LOGGED_IN",
          message: "Please log in with a valid Passkey first.",
        };
      }

      // 3. Passkey Check
      const currentPasskey = activePasskeys.find(
        (p) => p.key.toLowerCase() === currentAuthKey.toLowerCase(),
      );

      if (
        !currentPasskey ||
        !currentPasskey.active ||
        currentPasskey.paymentStatus === "DISABLED"
      ) {
        const msg = "Passkey is disabled or invalid. Please contact Administrator.";
        get().setRechargeModalOpen(true, msg);
        return {
          allowed: false,
          reason: "DISABLED",
          message: msg,
        };
      }

      const service = services.find((s) => s.id === targetServiceId);
      const cost = service ? (service.tokenCost ?? 1) : 1;
      const remaining = currentPasskey.remainingUsages ?? 0;
      const pStatus = currentPasskey.paymentStatus;

      console.log("[SERVICE VALIDATION DEBUG] Passkey status:", {
        key: currentPasskey.key,
        paymentStatus: pStatus,
        remainingUsages: remaining,
        cost,
      });

      // 3b. 1-Week Offer Token Expiry Verification
      const isTrialOfferPackage =
        !currentPasskey.packageName ||
        currentPasskey.packageName.toLowerCase().includes("welcome") ||
        currentPasskey.packageName.toLowerCase().includes("offer") ||
        currentPasskey.packageName.toLowerCase().includes("trial");

      const passkeyCreationTime =
        currentPasskey.createdAtTimestamp ||
        (currentPasskey.createdDate ? new Date(currentPasskey.createdDate).getTime() : 0);
      const isOfferWeekOver =
        passkeyCreationTime > 0 && Date.now() - passkeyCreationTime > 7 * 24 * 60 * 60 * 1000;

      if (isTrialOfferPackage && isOfferWeekOver) {
        const msg =
          "Offer Concluded: Your 1-week offer token period has concluded. To continue using services, please select an active Basic or Premium package from the Super Admin panel.";
        get().setRechargeModalOpen(true, msg);
        return {
          allowed: false,
          reason: "PAYMENT_REQUIRED",
          message: msg,
          paymentStatus: pStatus,
          remainingUsages: remaining,
          cost,
        };
      }

      // 4. Payment Approval Check
      if (pStatus === "PENDING" && remaining < cost) {
        const msg = "Access Required: This service requires an approved token package.";
        get().setRechargeModalOpen(true, msg);
        return {
          allowed: false,
          reason: "PAYMENT_REQUIRED",
          message: msg,
          paymentStatus: pStatus,
          remainingUsages: remaining,
          cost,
        };
      }

      if ((pStatus as string) === "REJECTED") {
        const msg =
          "Payment Rejected: Your previous payment request was rejected. Please submit a new package order.";
        get().setRechargeModalOpen(true, msg);
        return {
          allowed: false,
          reason: "PAYMENT_REQUIRED",
          message: msg,
          paymentStatus: pStatus,
          remainingUsages: remaining,
          cost,
        };
      }

      // 5. Available Tokens / Usages Check
      if (remaining < cost || (pStatus === "EXHAUSTED" && remaining <= 0) || remaining <= 0) {
        const msg = `Out Of Tokens: You have ${remaining} remaining usages (required: ${cost}). Please recharge now.`;
        get().setRechargeModalOpen(true, msg);
        return {
          allowed: false,
          reason: "OUT_OF_TOKENS",
          message: msg,
          paymentStatus: pStatus,
          remainingUsages: remaining,
          cost,
        };
      }

      return {
        allowed: true,
        remainingUsages: remaining,
        cost,
        paymentStatus: pStatus,
      };
    },

    validateExportAccess: (actionType = "export"): ServiceValidationResult => {
      const {
        authRole,
        currentTemplate,
        frontPopulatedTemplate,
        backPopulatedTemplate,
        activeServiceId,
      } = get();

      console.log("[EXPORT DEBUG] Payment Check:", {
        authRole,
        currentAuthKey: get().currentAuthKey,
        activeServiceId,
      });

      // 1. Run service validation
      const serviceVal = get().validateServiceAccess(activeServiceId || undefined);
      console.log("[EXPORT DEBUG] Token Check & Usage Check:", serviceVal);

      if (!serviceVal.allowed) {
        return serviceVal;
      }

      // 2. Check Card Data Exists
      const hasCardData = Boolean(
        currentTemplate || frontPopulatedTemplate || backPopulatedTemplate,
      );
      console.log("[EXPORT DEBUG] Export Creation:", {
        actionType,
        hasCardData,
        currentTemplateId: currentTemplate?.id,
      });

      if (!hasCardData) {
        return {
          allowed: false,
          reason: "NO_CARD_DATA",
          message: "No generated card or template data found to export.",
        };
      }

      return {
        allowed: true,
        cost: serviceVal.cost,
        remainingUsages: serviceVal.remainingUsages,
      };
    },

    checkAuthorization: () => {
      const res = get().validateExportAccess("check_auth");
      return res.allowed;
    },

    executeProtectedAction: (actionCallback: () => void) => {
      const val = get().validateExportAccess("execute_protected_action");
      if (val.allowed) {
        actionCallback();
      }
    },

    resetAdminPasskey: (currentKey, newKey) => {
      const list = get().activePasskeys;
      const trimmedCurrent = currentKey.trim();
      const trimmedNew = newKey.trim();

      if (!trimmedNew) {
        return { success: false, message: "New passkey cannot be empty" };
      }

      // Verify current admin key match
      const currentAdminMatch = list.find(
        (p) =>
          p.role === "admin" && p.key.toLowerCase() === trimmedCurrent.toLowerCase() && p.active,
      );

      // Check stored key in localStorage or logged-in state
      const storedKey =
        typeof window !== "undefined" ? localStorage.getItem("bigsta_auth_key") : null;
      const isValidCurrent =
        currentAdminMatch ||
        (storedKey && storedKey.toLowerCase() === trimmedCurrent.toLowerCase());

      if (!isValidCurrent) {
        return { success: false, message: "Current Admin Passkey is incorrect" };
      }

      // Check if new passkey already exists
      if (list.some((p) => p.key.toLowerCase() === trimmedNew.toLowerCase())) {
        return { success: false, message: "This passkey already exists" };
      }

      const now = new Date();
      // Replace existing match or update admin passkey
      let updated: PasskeyItem[];
      if (currentAdminMatch) {
        updated = list.map((p) =>
          p.id === currentAdminMatch.id
            ? {
                ...p,
                key: trimmedNew,
                createdDate: now.toISOString().replace("T", " ").substring(0, 16),
                createdAtTimestamp: now.getTime(),
              }
            : p,
        );
      } else {
        const newAdminItem: PasskeyItem = {
          id: `pk_${Date.now()}`,
          key: trimmedNew,
          role: "admin",
          active: true,
          createdDate: now.toISOString().replace("T", " ").substring(0, 16),
          createdAtTimestamp: now.getTime(),
          createdBy: "Admin",
          description: "Updated Admin Passkey",
          totalUsages: 99999,
          usedUsages: 0,
          remainingUsages: 99999,
          paymentStatus: "ACTIVE",
          packageName: "Unlimited Admin",
          packagePrice: "Free",
          usageHistory: [],
        };
        updated = [newAdminItem, ...list];
      }

      try {
        localStorage.removeItem("bigsta_passkeys");
        localStorage.setItem("bigsta_auth_key", trimmedNew);
      } catch (e) {}

      const adminPk = updated.find((p) => p.key === trimmedNew);
      if (adminPk) {
        import("../services/supabase")
          .then(({ syncPasskeySupabase }) => {
            syncPasskeySupabase(adminPk);
          })
          .catch(() => {});
      }

      set({ activePasskeys: updated });
      return { success: true, message: "Admin Passkey Updated Successfully" };
    },

    togglePasskeyStatus: (id) => {
      let toggledPk: PasskeyItem | null = null;
      const updated = get().activePasskeys.map((p) => {
        if (p.id === id) {
          toggledPk = {
            ...p,
            active: !p.active,
            paymentStatus: !p.active ? ("ACTIVE" as PaymentStatus) : ("DISABLED" as PaymentStatus),
          };
          return toggledPk;
        }
        return p;
      });
      try {
        localStorage.removeItem("bigsta_passkeys");
      } catch (e) {}
      set({ activePasskeys: updated });

      if (toggledPk) {
        import("../services/supabase").then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(toggledPk!);
        });
      }
    },

    deletePasskey: (id) => {
      const targetPk = get().activePasskeys.find((p) => p.id === id);
      const updated = get().activePasskeys.filter((p) => p.id !== id);
      try {
        localStorage.removeItem("bigsta_passkeys");
      } catch (e) {}
      set({ activePasskeys: updated });

      if (targetPk) {
        import("../services/supabase").then(({ deletePasskeySupabase }) => {
          deletePasskeySupabase(targetPk.id, targetPk.key);
        });
      }
    },

    // NIDA Template Selections & Universal Defaults
    selectedFrontTemplateId: savedSelectedFrontId,
    selectedBackTemplateId: savedSelectedBackId,
    defaultNidaFrontTemplateId: savedDefaultFrontId,
    defaultNidaBackTemplateId: savedDefaultBackId,

    activeUnit: "mm",
    selectedLayerIds: [],
    zoom: 1.0,
    panOffset: { x: 0, y: 0 },

    gridSettings: {
      enabled: false,
      sizeMm: 5,
      color: "#cbd5e1",
      opacity: 0.5,
    },

    snapSettings: {
      snapToGrid: true,
      snapToGuides: true,
      snapToObjects: true,
      snapToCenter: true,
      snapToEqualSpacing: true,
      thresholdMm: 1.5,
    },

    showRulers: true,
    showGuides: true,
    showSafeZones: false,

    cursorPosMm: { x: 0, y: 0 },
    activeSmartGuides: [],

    uploadedBackgrounds: [],

    isTemplateLibraryOpen: false,
    isCardGeneratorOpen: false,
    isExportModalOpen: false,
    isMergeModalOpen: false,
    isSaveModalOpen: false,
    activeMobileSheet: null,

    lastEditingContext: null,
    setLastEditingContext: (context) => set({ lastEditingContext: context }),
    returnToEditingContext: () => {
      const ctx = get().lastEditingContext;
      if (!ctx) {
        get().navigateSafely("preview");
        return;
      }

      if (ctx.serviceId) {
        get().setActiveServiceId(ctx.serviceId);
      }

      const curr = get().currentTemplate;
      const isBack =
        ctx.side === "back" ||
        ctx.side === "Back Side" ||
        ctx.activeSide === "back" ||
        isBackSideTemplate(curr);

      let updatedFront = get().frontPopulatedTemplate;
      let updatedBack = get().backPopulatedTemplate;

      if (isBack) {
        const existing = get().backPopulatedTemplate;
        updatedBack = existing
          ? {
              ...existing,
              ...curr,
              layers: curr.layers || existing.layers,
              background: curr.background || existing.background,
            }
          : { ...curr, side: "Back Side" };
      } else {
        const existing = get().frontPopulatedTemplate;
        updatedFront = existing
          ? {
              ...existing,
              ...curr,
              layers: curr.layers || existing.layers,
              background: curr.background || existing.background,
            }
          : { ...curr, side: "Front Side" };
      }

      const updates: Partial<TemplateStore> = {
        frontPopulatedTemplate: updatedFront,
        backPopulatedTemplate: updatedBack,
        currentTemplate: isBack ? updatedBack : updatedFront,
        activeScreen: "preview",
        studioMode: false,
        hasUnsavedChanges: false,
        isUnsavedModalOpen: false,
        isSaveModalOpen: false,
        pendingNavigation: null,
      };

      if (ctx.lastNidaFormData && !get().lastNidaFormData) {
        updates.lastNidaFormData = ctx.lastNidaFormData;
      }
      if (ctx.lastDrivingLicenseFormData && !get().lastDrivingLicenseFormData) {
        updates.lastDrivingLicenseFormData = ctx.lastDrivingLicenseFormData;
      }
      if (ctx.lastNhifFormData && !get().lastNhifFormData) {
        updates.lastNhifFormData = ctx.lastNhifFormData;
      }
      if (ctx.lastNrcFormData && !get().lastNrcFormData) {
        updates.lastNrcFormData = ctx.lastNrcFormData;
      }

      set(updates);
    },

    nidaSuccessNotification: null,
    setNidaSuccessNotification: (notification) => set({ nidaSuccessNotification: notification }),

    history: [DEFAULT_TEMPLATE],
    historyIndex: 0,

    setActiveScreen: (
      screen:
        | "home"
        | "upload"
        | "editor"
        | "templates"
        | "nida"
        | "nida_request"
        | "preview"
        | "downloads"
        | "driving_license"
        | "nhif"
        | "nrc_zambia"
        | "admin-payments",
      serviceId?: string,
    ) => {
      get().navigateSafely(screen, serviceId);
    },

    setPopulatedCardPair: (front, back, formData) => {
      const activeService = get().activeServiceId;
      const isDL =
        activeService === "driving_license" ||
        front?.cardType === "Driving License" ||
        (formData && ("licenceNumber" in formData || "pinNumber" in formData));
      const isNHIF =
        activeService === "nhif" ||
        (front?.cardType as string) === "NHIF Card" ||
        front?.cardType === "NHIF Membership Card" ||
        front?.serviceId === "nhif" ||
        (formData &&
          ("cardNumber" in formData || "cardStatus" in formData || "card_no" in formData));
      const isNRC =
        activeService === "nrc_zambia" ||
        front?.cardType === "National Registration Card (NRC)" ||
        front?.serviceId === "nrc_zambia" ||
        (formData && ("nrcNumber" in formData || "village" in formData || "chief" in formData));

      if (isDL) {
        set({
          frontPopulatedTemplate: front,
          backPopulatedTemplate: back,
          lastDrivingLicenseFormData:
            formData !== undefined ? formData : get().lastDrivingLicenseFormData,
        });
      } else if (isNHIF) {
        set({
          frontPopulatedTemplate: front,
          backPopulatedTemplate: back,
          lastNhifFormData: formData !== undefined ? formData : get().lastNhifFormData,
        });
      } else if (isNRC) {
        set({
          frontPopulatedTemplate: front,
          backPopulatedTemplate: back,
          lastNrcFormData: formData !== undefined ? formData : get().lastNrcFormData,
        });
      } else {
        set({
          frontPopulatedTemplate: front,
          backPopulatedTemplate: back,
          lastNidaFormData: formData !== undefined ? formData : get().lastNidaFormData,
        });
      }
    },

    createNewTemplate: (
      background: BackgroundConfig,
      name?: string,
      serviceId: string = "nida",
      side: "front" | "back" = "front",
      templateId?: string,
    ) => {
      let cardWidth = CR80_WIDTH_MM;
      let cardHeight = CR80_HEIGHT_MM;
      let orientation: "landscape" | "portrait" = "landscape";

      if (
        background.type === "image" &&
        background.originalWidthPx &&
        background.originalHeightPx
      ) {
        if (background.originalHeightPx > background.originalWidthPx) {
          orientation = "portrait";
          cardWidth = CR80_HEIGHT_MM;
          cardHeight = CR80_WIDTH_MM;
        }
      }

      const canonicalSide = normalizeSide(side);
      const isBack = canonicalSide === "back";
      const resolvedDocType = resolveDocumentTypeId(serviceId, false) || serviceId || "nida";

      const newTpl: CardTemplate = {
        id: templateId || ("template_" + Date.now()),
        templateName: name || `${resolvedDocType.toUpperCase()} ${isBack ? "Back" : "Front"} Template`,
        serviceId: resolvedDocType,
        cardWidth,
        cardHeight,
        unit: "mm",
        dpi: 300,
        orientation,
        background,
        side: isBack ? "Back Side" : "Front Side",
        isBackSide: isBack,
        ...(isBack
          ? { back_background: background, back_status: "configured" as const }
          : { front_background: background, front_status: "configured" as const }),
        layers: [],
        guides: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set({
        currentTemplate: newTpl,
        activeServiceId: resolvedDocType,
        activeEditorSide: canonicalSide,
        activeStudioLeftTab: "backgrounds",
        ...(isBack
          ? { backPopulatedTemplate: newTpl }
          : { frontPopulatedTemplate: newTpl }),
        selectedLayerIds: [],
        activeScreen: "editor",
        studioMode: true,
        zoom: 1.0,
        history: [newTpl],
        historyIndex: 0,
      });
      get().loadUploadedBackgrounds(resolvedDocType, newTpl.id, canonicalSide);
    },

    loadTemplate: (template: CardTemplate) => {
      if (!template) {
        console.error("[Template Diagnostics Error] Attempted to load null or undefined template");
        return;
      }

      const resolvedDocType = resolveDocumentTypeId(template, false) || template.serviceId || "nida";
      const prepared = ensureTemplateFieldIds({ ...template, serviceId: resolvedDocType });
      const serviceId = resolvedDocType;
      const currentSide = normalizeSide(prepared);

      // Diagnostic logging for template load
      const elementCount = prepared.layers?.length || 0;
      const variableLayers = (prepared.layers || []).filter((l) => {
        if (l.bindingKey) return true;
        if (l.type === "text" && (l as any).text?.includes("{{")) return true;
        return false;
      });

      const bgType = prepared.background?.type || "color";
      const bgInfo =
        bgType === "image"
          ? prepared.background?.src
            ? `Image (${prepared.background.src.substring(0, 40)}...)`
            : "Image (Missing URL!)"
          : `Color (${prepared.background?.color || "#ffffff"})`;

      console.log(`[Template Diagnostics] Loaded Template:`, {
        id: prepared.id,
        name: prepared.templateName,
        serviceId: serviceId,
        side: currentSide,
        background: bgInfo,
        elementCount: elementCount,
        variableCount: variableLayers.length,
      });

      if (bgType === "image" && !prepared.background?.src) {
        console.warn(
          `[Template Diagnostics Warning] Template '${prepared.templateName}' (${prepared.id}) background is type 'image' but background image src URL is missing.`,
        );
      }

      const completion = checkTemplateCompletion(
        prepared,
        get().uploadedBackgrounds,
        currentSide === "front" ? prepared : get().frontPopulatedTemplate,
        currentSide === "back" ? prepared : get().backPopulatedTemplate,
      );

      set({
        currentTemplate: prepared,
        activeServiceId: serviceId,
        activeEditorSide: currentSide,
        completionBannerMessage: completion.statusMessage,
        selectedLayerIds: [],
        activeScreen: "editor",
        studioMode: true,
        history: [prepared],
        historyIndex: 0,
        zoom: 1.0,
        hasUnsavedChanges: false,
        ...(currentSide === "front" ? { frontPopulatedTemplate: prepared } : { backPopulatedTemplate: prepared }),
      });

      // Save as studio draft for this active service
      if (typeof window !== "undefined") {
        saveStudioDraftDB(serviceId, prepared);
        safeLocalStorageSetItem(`bigsta_studio_draft_${serviceId}`, JSON.stringify(prepared));
        safeLocalStorageSetItem("bigsta_active_service", serviceId);
      }

      get().loadUploadedBackgrounds(serviceId, prepared.id, currentSide);
    },

    setCurrentTemplate: (template) => {
      set({ currentTemplate: template });
    },

    updateTemplateMeta: (meta) => {
      const current = get().currentTemplate;
      const updated = {
        ...current,
        ...meta,
        updatedAt: new Date().toISOString(),
      };
      
      const isBackSide = isBackSideTemplate(updated);
      
      const newState: Partial<TemplateState> = { currentTemplate: updated };
      
      if (isBackSide) {
        newState.backPopulatedTemplate = updated;
      } else {
        newState.frontPopulatedTemplate = updated;
      }
      
      set(newState);
      get().pushHistoryState(updated);
    },

    setActiveUnit: (unit) => set({ activeUnit: unit }),

    setZoom: (zoomOrFn) =>
      set((state) => {
        const newZoom = typeof zoomOrFn === "function" ? zoomOrFn(state.zoom) : zoomOrFn;
        // Clamp zoom between 0.25 (25%) and 5.0 (500%) as per PROMPT 47
        return { zoom: Math.min(5.0, Math.max(0.25, Number(newZoom.toFixed(2)))) };
      }),

    setPanOffset: (offsetOrFn) =>
      set((state) => ({
        panOffset: typeof offsetOrFn === "function" ? offsetOrFn(state.panOffset) : offsetOrFn,
      })),

    recenterWorkspace: () => set({ panOffset: { x: 0, y: 0 } }),

    resetView: () => set({ zoom: 1.0, panOffset: { x: 0, y: 0 } }),

    setSelectedLayerIds: (ids) => set({ selectedLayerIds: ids }),

    selectLayer: (id, multiSelect = false) => {
      const { selectedLayerIds } = get();
      if (multiSelect) {
        if (selectedLayerIds.includes(id)) {
          set({ selectedLayerIds: selectedLayerIds.filter((item) => item !== id) });
        } else {
          set({ selectedLayerIds: [...selectedLayerIds, id] });
        }
      } else {
        set({ selectedLayerIds: [id] });
      }
    },

    addLayer: (layer) => {
      const template = get().currentTemplate;
      const updated = {
        ...template,
        layers: [...template.layers, layer],
        updatedAt: new Date().toISOString(),
      };
      set({
        currentTemplate: updated,
        selectedLayerIds: [layer.id],
        hasUnsavedChanges: true,
      });
      get().pushHistoryState(updated);
      get().saveStudioDraft();
    },

    updateLayer: (id, patch) => {
      const template = get().currentTemplate;
      const updatedLayers = template.layers.map((l) =>
        l.id === id ? ({ ...l, ...patch } as Layer) : l,
      );
      const updated = {
        ...template,
        layers: updatedLayers,
        updatedAt: new Date().toISOString(),
      };
      set({ currentTemplate: updated, hasUnsavedChanges: true });
      get().pushHistoryState(updated);
      get().saveStudioDraft();
    },

    updateAllLicenceCategoryStyle: (stylePatch) => {
      const template = get().currentTemplate;
      const updatedLayers = template.layers.map((l) => {
        if (l.type === "licence_category") {
          return { ...l, ...stylePatch } as Layer;
        }
        return l;
      });
      const updated = {
        ...template,
        layers: updatedLayers,
        updatedAt: new Date().toISOString(),
      };
      set({ currentTemplate: updated, hasUnsavedChanges: true });
      get().pushHistoryState(updated);
      get().saveStudioDraft();
    },

    updateLayerLive: (id, patch) => {
      const template = get().currentTemplate;
      const updatedLayers = template.layers.map((l) =>
        l.id === id ? ({ ...l, ...patch } as Layer) : l,
      );
      set({
        currentTemplate: {
          ...template,
          layers: updatedLayers,
          updatedAt: new Date().toISOString(),
        },
        hasUnsavedChanges: true,
      });
    },

    applyFontToLayers: (fontFamily, scope, targetLayerId) => {
      const { currentTemplate, selectedLayerIds } = get();
      let targetIds: string[] = [];
      if (scope === "selected") {
        if (targetLayerId) {
          targetIds = [targetLayerId];
        } else if (selectedLayerIds.length > 0) {
          targetIds = selectedLayerIds;
        }
      } else {
        targetIds = currentTemplate.layers.filter((l) => l.type === "text").map((l) => l.id);
      }

      if (targetIds.length === 0) return;

      const updatedLayers = currentTemplate.layers.map((l) => {
        if (targetIds.includes(l.id) && l.type === "text") {
          const textLayer = l as any;
          const currentWeight =
            textLayer.fontWeight ?? (textLayer.fontStyle?.includes("bold") ? 700 : 400);
          const validWeight = getClosestValidWeight(fontFamily, currentWeight);
          const isItalic = textLayer.fontStyle?.includes("italic");
          const isBold = validWeight >= 600;

          let fontStyle = "normal";
          if (isBold && isItalic) fontStyle = "bold italic";
          else if (isBold) fontStyle = "bold";
          else if (isItalic) fontStyle = "italic";

          return {
            ...l,
            fontFamily,
            fontWeight: validWeight,
            fontStyle,
          };
        }
        return l;
      });

      const updated = {
        ...currentTemplate,
        layers: updatedLayers,
        updatedAt: new Date().toISOString(),
      };

      set({ currentTemplate: updated });
      get().pushHistoryState(updated);
    },

    applyWeightToLayers: (targetWeight, scope, targetLayerId) => {
      const { currentTemplate, selectedLayerIds } = get();
      let targetIds: string[] = [];
      if (scope === "selected") {
        if (targetLayerId) {
          targetIds = [targetLayerId];
        } else if (selectedLayerIds.length > 0) {
          targetIds = selectedLayerIds;
        }
      } else {
        targetIds = currentTemplate.layers.filter((l) => l.type === "text").map((l) => l.id);
      }

      if (targetIds.length === 0) return;

      const updatedLayers = currentTemplate.layers.map((l) => {
        if (targetIds.includes(l.id) && l.type === "text") {
          const textLayer = l as any;
          const validWeight = getClosestValidWeight(
            textLayer.fontFamily || "Helvetica",
            targetWeight,
          );
          const isItalic = textLayer.fontStyle?.includes("italic");
          const isBold = validWeight >= 600;

          let fontStyle = "normal";
          if (isBold && isItalic) fontStyle = "bold italic";
          else if (isBold) fontStyle = "bold";
          else if (isItalic) fontStyle = "italic";

          return {
            ...l,
            fontWeight: validWeight,
            fontStyle,
          };
        }
        return l;
      });

      const updated = {
        ...currentTemplate,
        layers: updatedLayers,
        updatedAt: new Date().toISOString(),
      };

      set({ currentTemplate: updated });
      get().pushHistoryState(updated);
    },

    deleteSelectedLayers: () => {
      const { currentTemplate, selectedLayerIds } = get();
      if (selectedLayerIds.length === 0) return;
      const remaining = currentTemplate.layers.filter((l) => !selectedLayerIds.includes(l.id));
      const updated = {
        ...currentTemplate,
        layers: remaining,
        updatedAt: new Date().toISOString(),
      };
      set({
        currentTemplate: updated,
        selectedLayerIds: [],
      });
      get().pushHistoryState(updated);
    },

    duplicateSelectedLayers: () => {
      const { currentTemplate, selectedLayerIds } = get();
      if (selectedLayerIds.length === 0) return;

      const duplicates: Layer[] = [];
      currentTemplate.layers.forEach((l) => {
        if (selectedLayerIds.includes(l.id)) {
          const newId = "layer_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
          const copy: Layer = {
            ...JSON.parse(JSON.stringify(l)),
            id: newId,
            name: `${l.name} Copy`,
            x: l.x + 3.0, // Offset 3mm
            y: l.y + 3.0,
          };

          // Ensure category element has independent identity and does NOT inherit previous linked bindings
          if (copy.type === "text") {
            const textCopy = copy as TextLayer;
            if (
              textCopy.isCategoryElement ||
              textCopy.categoryCode ||
              textCopy.licenseCategoryGroup
            ) {
              textCopy.linkedIssueDateElementId = undefined;
              textCopy.linkedExpiryDateElementId = undefined;
              textCopy.linkedElementIds = [];
              textCopy.bindingKey = undefined;
              textCopy.fieldName = undefined;
              textCopy.fieldId = undefined;
            }
          }

          duplicates.push(copy);
        }
      });

      const updated = {
        ...currentTemplate,
        layers: [...currentTemplate.layers, ...duplicates],
        updatedAt: new Date().toISOString(),
      };

      set({
        currentTemplate: updated,
        selectedLayerIds: duplicates.map((d) => d.id),
      });
      get().pushHistoryState(updated);
    },

    reorderLayer: (id, direction) => {
      const template = get().currentTemplate;
      const idx = template.layers.findIndex((l) => l.id === id);
      if (idx === -1) return;

      const layers = [...template.layers];
      const target = layers.splice(idx, 1)[0];

      if (direction === "up" && idx < layers.length) {
        layers.splice(idx + 1, 0, target);
      } else if (direction === "down" && idx > 0) {
        layers.splice(idx - 1, 0, target);
      } else if (direction === "top") {
        layers.push(target);
      } else if (direction === "bottom") {
        layers.unshift(target);
      }

      const updated = {
        ...template,
        layers,
        updatedAt: new Date().toISOString(),
      };
      set({ currentTemplate: updated });
      get().pushHistoryState(updated);
    },

    toggleLayerVisibility: (id) => {
      const template = get().currentTemplate;
      const updatedLayers = template.layers.map((l) =>
        l.id === id ? ({ ...l, hidden: !l.hidden } as Layer) : l,
      );
      const updated = {
        ...template,
        layers: updatedLayers,
        updatedAt: new Date().toISOString(),
      };
      set({ currentTemplate: updated });
    },

    toggleLayerLock: (id) => {
      const template = get().currentTemplate;
      const updatedLayers = template.layers.map((l) =>
        l.id === id ? ({ ...l, locked: !l.locked } as Layer) : l,
      );
      const updated = {
        ...template,
        layers: updatedLayers,
        updatedAt: new Date().toISOString(),
      };
      set({ currentTemplate: updated });
    },

    nudgeSelectedLayers: (dxMm, dyMm) => {
      const { currentTemplate, selectedLayerIds } = get();
      if (selectedLayerIds.length === 0) return;

      const updatedLayers = currentTemplate.layers.map((l) => {
        if (selectedLayerIds.includes(l.id) && !l.locked) {
          return {
            ...l,
            x: Number((l.x + dxMm).toFixed(2)),
            y: Number((l.y + dyMm).toFixed(2)),
          };
        }
        return l;
      });

      const updated = {
        ...currentTemplate,
        layers: updatedLayers,
        updatedAt: new Date().toISOString(),
      };
      set({ currentTemplate: updated });
      get().pushHistoryState(updated);
    },

    alignSelectedLayers: (type) => {
      const { currentTemplate, selectedLayerIds } = get();
      if (selectedLayerIds.length === 0) return;

      const selected = currentTemplate.layers.filter(
        (l) => selectedLayerIds.includes(l.id) && !l.locked,
      );
      if (selected.length === 0) return;

      const updatedLayers = [...currentTemplate.layers];

      if (selected.length === 1) {
        const layer = selected[0];
        let newX = layer.x;
        let newY = layer.y;

        if (type === "left") newX = 0;
        if (type === "center") newX = (currentTemplate.cardWidth - layer.width) / 2;
        if (type === "right") newX = currentTemplate.cardWidth - layer.width;
        if (type === "top") newY = 0;
        if (type === "middle") newY = (currentTemplate.cardHeight - layer.height) / 2;
        if (type === "bottom") newY = currentTemplate.cardHeight - layer.height;

        const idx = updatedLayers.findIndex((l) => l.id === layer.id);
        if (idx !== -1) {
          updatedLayers[idx] = { ...layer, x: Number(newX.toFixed(2)), y: Number(newY.toFixed(2)) };
        }
      } else {
        const minX = Math.min(...selected.map((l) => l.x));
        const maxX = Math.max(...selected.map((l) => l.x + l.width));
        const minY = Math.min(...selected.map((l) => l.y));
        const maxY = Math.max(...selected.map((l) => l.y + l.height));

        const avgCenterX = (minX + maxX) / 2;
        const avgCenterY = (minY + maxY) / 2;

        selected.forEach((layer) => {
          let newX = layer.x;
          let newY = layer.y;

          if (type === "left") newX = minX;
          if (type === "center") newX = avgCenterX - layer.width / 2;
          if (type === "right") newX = maxX - layer.width;
          if (type === "top") newY = minY;
          if (type === "middle") newY = avgCenterY - layer.height / 2;
          if (type === "bottom") newY = maxY - layer.height;

          const idx = updatedLayers.findIndex((l) => l.id === layer.id);
          if (idx !== -1) {
            updatedLayers[idx] = {
              ...layer,
              x: Number(newX.toFixed(2)),
              y: Number(newY.toFixed(2)),
            };
          }
        });
      }

      const updated = {
        ...currentTemplate,
        layers: updatedLayers,
        updatedAt: new Date().toISOString(),
      };
      set({ currentTemplate: updated });
      get().pushHistoryState(updated);
    },

    distributeSelectedLayers: (direction) => {
      const { currentTemplate, selectedLayerIds } = get();
      const selected = currentTemplate.layers.filter(
        (l) => selectedLayerIds.includes(l.id) && !l.locked,
      );
      if (selected.length < 3) return;

      const updatedLayers = [...currentTemplate.layers];

      if (direction === "horizontal") {
        const sorted = [...selected].sort((a, b) => a.x - b.x);
        const minX = sorted[0].x;
        const last = sorted[sorted.length - 1];
        const maxX = last.x + last.width;
        const totalWidthOfItems = sorted.reduce((sum, item) => sum + item.width, 0);
        const totalGapSpace = maxX - minX - totalWidthOfItems;
        const gap = totalGapSpace / (sorted.length - 1);

        let currentPos = minX;
        sorted.forEach((layer) => {
          const idx = updatedLayers.findIndex((l) => l.id === layer.id);
          if (idx !== -1) {
            updatedLayers[idx] = { ...layer, x: Number(currentPos.toFixed(2)) };
          }
          currentPos += layer.width + gap;
        });
      } else {
        const sorted = [...selected].sort((a, b) => a.y - b.y);
        const minY = sorted[0].y;
        const last = sorted[sorted.length - 1];
        const maxY = last.y + last.height;
        const totalHeightOfItems = sorted.reduce((sum, item) => sum + item.height, 0);
        const totalGapSpace = maxY - minY - totalHeightOfItems;
        const gap = totalGapSpace / (sorted.length - 1);

        let currentPos = minY;
        sorted.forEach((layer) => {
          const idx = updatedLayers.findIndex((l) => l.id === layer.id);
          if (idx !== -1) {
            updatedLayers[idx] = { ...layer, y: Number(currentPos.toFixed(2)) };
          }
          currentPos += layer.height + gap;
        });
      }

      const updated = {
        ...currentTemplate,
        layers: updatedLayers,
        updatedAt: new Date().toISOString(),
      };
      set({ currentTemplate: updated });
      get().pushHistoryState(updated);
    },

  loadUploadedBackgrounds: async (docTypeId?: string, templateId?: string, side?: "front" | "back") => {
    const currentTpl = get().currentTemplate;
    const category = docTypeId || resolveDocumentTypeId(currentTpl, false) || get().activeServiceId || "nida";
    const localBgs = await getAllBackgroundsDB();

    // Map and normalize local backgrounds with the three independent identifiers
    const scopedLocal = localBgs
      .map((bg: any) => {
        const itemDocType = bg.documentTypeId || bg.document_type_id || bg.serviceType || category;
        const itemSide = normalizeSide(bg.side || (bg.name?.toLowerCase().includes("back") ? "back" : "front"));
        const itemTemplateId = bg.templateId || bg.template_id || (currentTpl ? currentTpl.id : "");
        const isActive = bg.isActive !== undefined ? bg.isActive : (currentTpl?.background?.src === bg.src && itemSide === normalizeSide(currentTpl));
        return {
          ...bg,
          documentTypeId: itemDocType,
          document_type_id: itemDocType,
          side: itemSide,
          templateId: itemTemplateId,
          template_id: itemTemplateId,
          isActive,
          is_active: isActive,
        };
      })
      .filter((bg: any) => bg.documentTypeId === category);

    let cloudBgs: any[] = [];
    try {
      const { fetchBackgroundAssetsSupabase } = await import("../services/supabase");
      const rows = await fetchBackgroundAssetsSupabase(category);
      cloudBgs = (rows || []).map((row: any) => {
        const itemSide = normalizeSide(row.name?.toLowerCase().includes("back") ? "back" : "front");
        const isActive = currentTpl?.background?.src === row.url && itemSide === normalizeSide(currentTpl);
        return {
          id: row.id,
          name: row.name || "Background",
          src: row.url,
          serviceType: row.service_type || category,
          documentTypeId: category,
          document_type_id: category,
          templateId: currentTpl?.id || "",
          template_id: currentTpl?.id || "",
          side: itemSide,
          isActive,
          is_active: isActive,
          createdAt: row.created_at || new Date().toISOString(),
          originalWidthPx: 0,
          originalHeightPx: 0,
          orientation: "landscape",
        };
      });
    } catch (error) {
      console.warn("Category background fetch skipped:", error);
    }

    const merged = [...cloudBgs, ...scopedLocal.filter((local: any) => !cloudBgs.some((cloud) => cloud.id === local.id))];
    set({ uploadedBackgrounds: merged });
  },

  addUploadedBackground: async (bgData) => {
    let finalSrc = bgData.src;
    const currentTpl = get().currentTemplate;
    const documentTypeId =
      bgData.documentTypeId ||
      bgData.document_type_id ||
      resolveDocumentTypeId(currentTpl, false) ||
      get().activeServiceId ||
      "nida";
    const side = normalizeSide(bgData.side || (isBackSideTemplate(currentTpl) ? "back" : "front"));
    const templateId = bgData.templateId || bgData.template_id || (currentTpl ? currentTpl.id : `tpl_${documentTypeId}`);
    const isActive = bgData.isActive ?? true;

    try {
      if (bgData.src && bgData.src.startsWith("data:")) {
        const { uploadBackgroundToSupabase, registerBackgroundAssetSupabase, supabase } = await import("../services/supabase");
        if (supabase) {
          const res = await fetch(bgData.src);
          const blob = await res.blob();
          const id = "bg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
          const cloudUrl = await uploadBackgroundToSupabase(blob, `${bgData.name}.png`, documentTypeId);
          if (cloudUrl) {
            finalSrc = cloudUrl;
            await registerBackgroundAssetSupabase({ id, name: bgData.name, url: cloudUrl, serviceType: documentTypeId });
          }
        }
      }
    } catch (e) {
      console.warn("Cloud category background upload skipped, using local data URL", e);
    }

    const newBg: UploadedBackground = {
      ...bgData,
      src: finalSrc,
      serviceType: documentTypeId,
      documentTypeId,
      document_type_id: documentTypeId,
      templateId,
      template_id: templateId,
      side,
      isActive,
      is_active: isActive,
      id: "bg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
    };

    await saveBackgroundDB(newBg);

    // If active, run scoped activation immediately
    if (isActive) {
      await get().activateBackground(newBg.id, documentTypeId, templateId, side);
    } else {
      await get().loadUploadedBackgrounds(documentTypeId, templateId, side);
    }

    return newBg;
  },

  activateBackground: async (bgId: string, docTypeId: string, templateId: string, side: "front" | "back") => {
    const canonicalCategory = docTypeId || resolveDocumentTypeId(get().currentTemplate, false) || get().activeServiceId || "nida";
    const canonicalSide = normalizeSide(side);
    const targetBg = get().uploadedBackgrounds.find((b) => b.id === bgId);
    if (!targetBg) return { success: false, message: "Background not found in store" };

    // 1. STRICT SCOPED DEACTIVATION: Only deactivate same (docTypeId, templateId, side)
    // NEVER touch backgrounds where side !== canonicalSide or documentTypeId !== canonicalCategory!
    const updatedBackgrounds = get().uploadedBackgrounds.map((b) => {
      if (b.documentTypeId === canonicalCategory && b.side === canonicalSide) {
        return {
          ...b,
          isActive: b.id === bgId,
          is_active: b.id === bgId,
        };
      }
      return b;
    });

    set({ uploadedBackgrounds: updatedBackgrounds });

    // Persist all updated backgrounds in IndexedDB
    for (const b of updatedBackgrounds) {
      if (b.documentTypeId === canonicalCategory && b.side === canonicalSide) {
        await saveBackgroundDB(b);
      }
    }

    // 2. Build side background config
    const bgConfig: BackgroundConfig = {
      type: "image",
      src: targetBg.src,
      originalWidthPx: targetBg.originalWidthPx,
      originalHeightPx: targetBg.originalHeightPx,
      opacity: get().currentTemplate?.background?.opacity ?? 1,
    };

    // 3. Update currentTemplate with independent Front and Back status
    const current = get().currentTemplate;
    const isEditingThisSide = get().activeEditorSide === canonicalSide || normalizeSide(current) === canonicalSide;

    const updatedTpl: CardTemplate = {
      ...current,
      serviceId: canonicalCategory,
      ...(isEditingThisSide ? { background: bgConfig, side: canonicalSide === "front" ? "Front Side" : "Back Side" } : {}),
      ...(canonicalSide === "front"
        ? {
            front_background: bgConfig,
            active_front_bg_id: bgId,
            front_status: "configured" as const,
          }
        : {
            back_background: bgConfig,
            active_back_bg_id: bgId,
            back_status: "configured" as const,
          }),
      updatedAt: new Date().toISOString(),
    };

    // Ensure opposite side status is properly preserved
    if (canonicalSide === "front") {
      const existingBackBg = get().backPopulatedTemplate?.background?.src || updatedTpl.back_background?.src;
      updatedTpl.back_status = existingBackBg ? "configured" : (updatedTpl.back_status || "missing");
      updatedTpl.is_complete = updatedTpl.front_status === "configured" && updatedTpl.back_status === "configured";

      const frontInstance = { ...updatedTpl, background: bgConfig, side: "Front Side" as const };
      set({ frontPopulatedTemplate: frontInstance });

      if (updatedTpl.isUniversal) {
        try {
          await get().saveUniversalFrontTemplate(canonicalCategory, frontInstance);
        } catch (e) {
          console.warn("Universal front template sync skipped:", e);
        }
      }
    } else {
      const existingFrontBg = get().frontPopulatedTemplate?.background?.src || updatedTpl.front_background?.src;
      updatedTpl.front_status = existingFrontBg ? "configured" : (updatedTpl.front_status || "missing");
      updatedTpl.is_complete = updatedTpl.front_status === "configured" && updatedTpl.back_status === "configured";

      const backInstance = { ...updatedTpl, background: bgConfig, side: "Back Side" as const };
      set({ backPopulatedTemplate: backInstance });

      if (updatedTpl.isUniversal) {
        try {
          await get().saveUniversalBackTemplate(canonicalCategory, backInstance);
        } catch (e) {
          console.warn("Universal back template sync skipped:", e);
        }
      }
    }

    // Persist template
    await saveTemplateDB(sanitizeTemplateForSaving(updatedTpl));
    get().saveStudioDraft();

    // 4. Run Intelligent Front/Back Completion Check
    const completion = checkTemplateCompletion(
      updatedTpl,
      updatedBackgrounds,
      get().frontPopulatedTemplate,
      get().backPopulatedTemplate,
    );

    set({
      currentTemplate: updatedTpl,
      completionBannerMessage: completion.statusMessage,
    });

    return { success: true, completionStatus: completion };
  },

  switchEditorSide: async (targetSide: "front" | "back") => {
    const canonicalTarget = normalizeSide(targetSide);
    if (get().activeEditorSide === canonicalTarget) return;

    const current = get().currentTemplate;
    const currentSide = normalizeSide(current);
    const serviceId = current.serviceId || get().activeServiceId || "nida";

    // 1. Preserve current side template
    if (currentSide === "front") {
      const frontSnapshot = { ...current, side: "Front Side" as const };
      set({ frontPopulatedTemplate: frontSnapshot });
      await saveTemplateDB(sanitizeTemplateForSaving(frontSnapshot));
    } else {
      const backSnapshot = { ...current, side: "Back Side" as const };
      set({ backPopulatedTemplate: backSnapshot });
      await saveTemplateDB(sanitizeTemplateForSaving(backSnapshot));
    }

    // 2. Load or construct opposite side template
    let targetTemplate: CardTemplate | null = null;
    if (canonicalTarget === "front") {
      targetTemplate = get().frontPopulatedTemplate;
      if (!targetTemplate && current.isUniversal) {
        targetTemplate = get().getUniversalFrontTemplate(serviceId);
      }
      if (!targetTemplate) {
        targetTemplate = {
          ...current,
          id: current.id.endsWith("_back") ? current.id.replace(/_back$/, "_front") : `${current.id}_front`,
          side: "Front Side",
          templateName: current.templateName.replace(/back/i, "Front"),
          background: current.front_background || { type: "color", color: "#ffffff" },
          layers: [],
        };
      }
    } else {
      targetTemplate = get().backPopulatedTemplate;
      if (!targetTemplate && current.isUniversal) {
        targetTemplate = get().getUniversalBackTemplate(serviceId);
      }
      if (!targetTemplate) {
        targetTemplate = {
          ...current,
          id: current.id.endsWith("_front") ? current.id.replace(/_front$/, "_back") : `${current.id}_back`,
          side: "Back Side",
          templateName: current.templateName.replace(/front/i, "Back"),
          background: current.back_background || { type: "color", color: "#ffffff" },
          layers: [],
        };
      }
    }

    const sanitizedTarget = ensureTemplateFieldIds(targetTemplate);

    set({
      currentTemplate: sanitizedTarget,
      activeEditorSide: canonicalTarget,
      selectedLayerIds: [],
    });

    get().saveStudioDraft();
    await get().loadUploadedBackgrounds(serviceId, sanitizedTarget.id, canonicalTarget);
  },

  updateUploadedBackground: async (id, patch) => {
    const { uploadedBackgrounds } = get();
    const existing = uploadedBackgrounds.find((b) => b.id === id);
    if (!existing) return;
    const updated = { ...existing, ...patch };
    await saveBackgroundDB(updated);
    await get().loadUploadedBackgrounds();
  },

  deleteUploadedBackground: async (id) => {
    await deleteBackgroundDB(id);
    await get().loadUploadedBackgrounds();
  },

    toggleSafeZones: () => set((state) => ({ showSafeZones: !state.showSafeZones })),

    addGuide: (guideData) => {
      const template = get().currentTemplate;
      const newGuide: Guide = {
        ...guideData,
        id: "guide_" + Date.now(),
      };
      const updated = {
        ...template,
        guides: [...template.guides, newGuide],
      };
      set({ currentTemplate: updated });
    },

    updateGuide: (id, patch) => {
      const template = get().currentTemplate;
      const updatedGuides = template.guides.map((g) => (g.id === id ? { ...g, ...patch } : g));
      set({ currentTemplate: { ...template, guides: updatedGuides } });
    },

    deleteGuide: (id) => {
      const template = get().currentTemplate;
      const updatedGuides = template.guides.filter((g) => g.id !== id);
      set({ currentTemplate: { ...template, guides: updatedGuides } });
    },

    toggleRulers: () => set((state) => ({ showRulers: !state.showRulers })),
    toggleGuides: () => set((state) => ({ showGuides: !state.showGuides })),

    setGridSettings: (settings) =>
      set((state) => ({ gridSettings: { ...state.gridSettings, ...settings } })),
    setSnapSettings: (settings) =>
      set((state) => ({ snapSettings: { ...state.snapSettings, ...settings } })),

    setCursorPosMm: (pos) => set({ cursorPosMm: pos }),
    setActiveSmartGuides: (guides) => set({ activeSmartGuides: guides }),

    setTemplateLibraryOpen: (open) => set({ isTemplateLibraryOpen: open }),
    setCardGeneratorOpen: (open) => set({ isCardGeneratorOpen: open }),
    setExportModalOpen: (open) => set({ isExportModalOpen: open }),
    setMergeModalOpen: (open) => set({ isMergeModalOpen: open }),
    setSaveModalOpen: (open) => set({ isSaveModalOpen: open }),
    setActiveMobileSheet: (sheet) => set({ activeMobileSheet: sheet }),

    saveCurrentTemplate: async () => {
      set({ isSaving: true });
      try {
        const template = {
          ...get().currentTemplate,
          visibility: "private" as const,
          status: "draft" as const,
          updatedAt: new Date().toISOString(),
        };
        let sanitized = sanitizeTemplateForSaving(template);
        try {
          const { sanitizeAndUploadTemplateBackground } = await import("../services/supabase");
          sanitized =
            (await withSaveTimeout(
              sanitizeAndUploadTemplateBackground(sanitized),
              "Background asset upload",
            )) || sanitized;
        } catch (e: any) {
          console.warn("Background upload error during saveCurrentTemplate:", e);
        }
        await saveTemplateDB(sanitized);

        // Sync to Supabase
        try {
          const { saveTemplateSupabase } = await import("../services/supabase");
          const ok = await withSaveTimeout(
            saveTemplateSupabase(sanitized),
            "Draft template cloud save",
          );
          if (!ok) {
            notifySaveIssue(
              "Template saved locally, but cloud sync did not complete. Check your connection.",
            );
          }
        } catch (e: any) {
          console.warn("Failed to sync current draft template to Supabase:", e);
          notifySaveIssue("Cloud save encountered a network issue. Local draft preserved.");
        }

        set({ currentTemplate: sanitized, hasUnsavedChanges: false });
        get().saveStudioDraft();
        await get().loadSavedTemplates();
      } catch (err: any) {
        console.error("saveCurrentTemplate error:", err);
        notifySaveIssue(err?.message || "Failed to save template. Please try again.");
      } finally {
        set({ isSaving: false });
      }
    },

    saveAsNewTemplate: async (newName: string, cardType?: any, side?: any) => {
      set({ isSaving: true });
      try {
        const current = get().currentTemplate;
        const sanitizedCurrent = sanitizeTemplateForSaving(current);
        let newTpl: CardTemplate = {
          ...JSON.parse(JSON.stringify(sanitizedCurrent)),
          id: "template_" + Date.now(),
          templateName: newName,
          cardType: cardType || current.cardType || "National ID",
          side: side || current.side || "Front Side",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          const { sanitizeAndUploadTemplateBackground } = await import("../services/supabase");
          newTpl =
            (await withSaveTimeout(
              sanitizeAndUploadTemplateBackground(newTpl),
              "New template background asset upload",
            )) || newTpl;
        } catch (e: any) {
          console.warn("Background upload error during saveAsNewTemplate:", e);
        }
        await saveTemplateDB(newTpl);

        // Sync to Supabase
        try {
          const { saveTemplateSupabase } = await import("../services/supabase");
          const ok = await withSaveTimeout(
            saveTemplateSupabase(newTpl),
            "New template cloud save",
          );
          if (!ok) {
            notifySaveIssue(
              "Template saved locally, but cloud sync did not complete. Check your connection.",
            );
          }
        } catch (e: any) {
          console.warn("Failed to sync new template to Supabase:", e);
          notifySaveIssue("Cloud save encountered a network issue. Local copy preserved.");
        }

        set({ currentTemplate: newTpl, hasUnsavedChanges: false });
        get().saveStudioDraft();
        await get().loadSavedTemplates();
        return newTpl;
      } catch (err: any) {
        console.error("saveAsNewTemplate error:", err);
        notifySaveIssue(err?.message || "Failed to save template copy. Please try again.");
      } finally {
        set({ isSaving: false });
      }
    },

    loadSavedTemplates: async (force = false) => {
      set({ loadingTemplates: true });
      try {
        // 1. Fetch locally saved templates from IndexedDB
        const dbTemplates = await getAllTemplatesDB();
        const map = new Map<string, CardTemplate>();
        dbTemplates.forEach((t) => map.set(t.id, ensureTemplateFieldIds(t)));

        // 2. Fetch manual requests
        try {
          const { fetchManualRequestsSupabase } = await import("../services/supabase");
          const supabaseManuals = await fetchManualRequestsSupabase();
          const localManuals = get().manualRequests || [];
          const manualMap = new Map<string, ManualRequestItem>();
          localManuals.forEach((m) => manualMap.set(m.id, m));
          supabaseManuals.forEach((m) => {
            manualMap.set(m.id, { ...manualMap.get(m.id), ...m });
          });
          const mergedManuals = Array.from(manualMap.values()).sort(
            (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          );
          localStorage.setItem("bigsta_manual_requests", JSON.stringify(mergedManuals));
          set({ manualRequests: mergedManuals });
        } catch (e) {
          console.warn("Manual requests sync skipped:", e);
        }

        // 3. Detect custom templates
        const servicesWithCustomFront = new Set<string>();
        const servicesWithCustomBack = new Set<string>();
        map.forEach((t) => {
          if (t.serviceId && !t.id.startsWith("sample_")) {
            if (isBackSideTemplate(t)) servicesWithCustomBack.add(t.serviceId);
            else servicesWithCustomFront.add(t.serviceId);
          }
        });

        // 4. Ensure SAMPLE_TEMPLATES
        for (const sample of SAMPLE_TEMPLATES) {
          const serviceId = sample.serviceId || "";
          const isBack = isBackSideTemplate(sample);
          const hasCustomForSide = isBack ? servicesWithCustomBack.has(serviceId) : servicesWithCustomFront.has(serviceId);

          if (!hasCustomForSide) {
            if (!map.has(sample.id)) {
              const sanitized = ensureTemplateFieldIds(sample);
              map.set(sanitized.id, sanitized);
              await saveTemplateDB(sanitized);
            }
          } else if (map.has(sample.id)) {
            map.delete(sample.id);
            await deleteTemplateDB(sample.id);
          }
        }

        const sorted = Array.from(map.values()).sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime() || 0;
          return timeB - timeA;
        });

        set({ customTemplates: sorted, lastTemplateSync: Date.now() });
        return sorted;
      } finally {
        set({ loadingTemplates: false });
      }
    },

    loadServiceTemplates: async (serviceType: string) => {
      set({ loadingTemplates: true });
      try {
        const { fetchActiveTemplatesForService } = await import("../services/supabase");
        const { front, back } = await fetchActiveTemplatesForService(serviceType);

        if (front) await saveTemplateDB(front);
        if (back) await saveTemplateDB(back);
        
        await get().loadSavedTemplates();
        return { front, back };
      } catch (e) {
        console.error("Failed to load service templates:", e);
        return { front: null, back: null };
      } finally {
        set({ loadingTemplates: false });
      }
    },

    deleteSavedTemplate: async (id) => {
      await deleteTemplateDB(id);
      try {
        const { deleteTemplateSupabase } = await import("../services/supabase");
        await deleteTemplateSupabase(id);
      } catch (e) {
        console.warn("Failed to delete template on Supabase:", e);
      }
    },

    setSelectedFrontTemplateId: (id) => {
      if (typeof window !== "undefined" && id) {
        safeLocalStorageSetItem("nida_selected_front_template_id", id);
      }
      set({ selectedFrontTemplateId: id });
    },

    setSelectedBackTemplateId: (id) => {
      if (typeof window !== "undefined" && id) {
        safeLocalStorageSetItem("nida_selected_back_template_id", id);
      }
      set({ selectedBackTemplateId: id });
    },

    setUniversalDefaultNidaTemplates: (frontId, backId) => {
      if (typeof window !== "undefined") {
        safeLocalStorageSetItem("nida_default_front_template_id", frontId);
        safeLocalStorageSetItem("nida_default_back_template_id", backId);
        safeLocalStorageSetItem("nida_selected_front_template_id", frontId);
        safeLocalStorageSetItem("nida_selected_back_template_id", backId);
      }
      set({
        defaultNidaFrontTemplateId: frontId,
        defaultNidaBackTemplateId: backId,
        selectedFrontTemplateId: frontId,
        selectedBackTemplateId: backId,
      });
    },

    saveNidaSubmissionRecord: async (record) => {
      if (typeof window !== "undefined") {
        try {
          safeLocalStorageSetItem("nida_last_submission", JSON.stringify(record));
          const historyStr = localStorage.getItem("nida_submission_history") || "[]";
          const history: NidaSubmissionRecord[] = JSON.parse(historyStr);
          history.unshift(record);
          // Keep last 50 submissions
          if (history.length > 50) history.pop();
          safeLocalStorageSetItem("nida_submission_history", JSON.stringify(history));
        } catch (err) {
          console.warn("Failed to persist submission record to localStorage:", err);
        }
      }
    },

    pushHistoryState: (template) => {
      const { history, historyIndex } = get();
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(template)));
      // Limit history stack size to 30
      if (newHistory.length > 30) newHistory.shift();

      set({
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    },

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex > 0) {
        const prev = history[historyIndex - 1];
        set({
          currentTemplate: JSON.parse(JSON.stringify(prev)),
          historyIndex: historyIndex - 1,
        });
      }
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < history.length - 1) {
        const next = history[historyIndex + 1];
        set({
          currentTemplate: JSON.parse(JSON.stringify(next)),
          historyIndex: historyIndex + 1,
        });
      }
    },
  };
});
