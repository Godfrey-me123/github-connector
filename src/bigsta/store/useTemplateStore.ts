import { create } from 'zustand';
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
} from '../types';
import { CR80_WIDTH_MM, CR80_HEIGHT_MM } from '../utils/units';
import { SAMPLE_TEMPLATES } from '../utils/sampleTemplates';
import { ensureTemplateFieldIds, sanitizeTemplateForSaving, SupportedBinding, isBackSideTemplate } from '../utils/templateMappingEngine';
import { getClosestValidWeight } from '../utils/fonts';
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
} from '../utils/idb';

export interface DynamicElementRegistration {
  id: string;
  name: string;
  type: 'text';
  defaultText: string;
  bindingKey: SupportedBinding;
  getterKey: 'displayNameLine1' | string;
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
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'COMPLETED';
  userPasskey?: string;
}

export interface ServiceValidationResult {
  allowed: boolean;
  reason?: 'NOT_LOGGED_IN' | 'DISABLED' | 'PAYMENT_REQUIRED' | 'OUT_OF_TOKENS' | 'NO_CARD_DATA';
  message?: string;
  cost?: number;
  remainingUsages?: number;
  paymentStatus?: PaymentStatus;
}

export function computeDisplayNameLine1(formData: Record<string, any>): string {
  const f = (formData?.firstName || '').trim();
  const m = (formData?.middleName || '').trim();
  return m ? `${f} ${m}` : f;
}

export const DYNAMIC_ELEMENT_REGISTRY: Record<string, DynamicElementRegistration> = {
  FULL_NAME: {
    id: 'full_name',
    name: 'Full Name',
    type: 'text',
    defaultText: '{{first_middle_name}}',
    bindingKey: 'FIRST_MIDDLE_NAME',
    getterKey: 'displayNameLine1',
    computeValue: (formData) => computeDisplayNameLine1(formData),
    defaultWidth: 50,
    defaultHeight: 6,
  },
  FIRST_MIDDLE_NAME: {
    id: 'first_middle_name',
    name: 'First Name + Middle Name',
    type: 'text',
    defaultText: '{{first_middle_name}}',
    bindingKey: 'FIRST_MIDDLE_NAME',
    getterKey: 'displayNameLine1',
    computeValue: (formData) => computeDisplayNameLine1(formData),
    defaultWidth: 50,
    defaultHeight: 6,
  },
  FIRST_NAME: {
    id: 'first_name',
    name: 'First Name',
    type: 'text',
    defaultText: '{{first_name}}',
    bindingKey: 'FIRST_NAME',
    getterKey: 'firstName',
    computeValue: (formData) => (formData?.firstName || '').trim(),
    defaultWidth: 35,
    defaultHeight: 6,
  },
  MIDDLE_NAME: {
    id: 'middle_name',
    name: 'Middle Name',
    type: 'text',
    defaultText: '{{middle_name}}',
    bindingKey: 'MIDDLE_NAME',
    getterKey: 'middleName',
    computeValue: (formData) => (formData?.middleName || '').trim(),
    defaultWidth: 35,
    defaultHeight: 6,
  },
  LAST_NAME: {
    id: 'last_name',
    name: 'Last Name',
    type: 'text',
    defaultText: '{{last_name}}',
    bindingKey: 'LAST_NAME',
    getterKey: 'lastName',
    computeValue: (formData) => (formData?.lastName || '').trim(),
    defaultWidth: 35,
    defaultHeight: 6,
  },
  NIDA_NUMBER: {
    id: 'nida_number',
    name: 'NIDA Number',
    type: 'text',
    defaultText: '{{nida_number}}',
    bindingKey: 'NIDA_NUMBER',
    getterKey: 'nidaNumber',
    computeValue: (formData) => (formData?.nidaNumber || '').trim(),
    defaultWidth: 45,
    defaultHeight: 6,
  },
};

export type AuthRole = 'admin' | 'user' | null;

export type PaymentStatus = 'PENDING' | 'ACTIVE' | 'EXHAUSTED' | 'DISABLED';

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
  visibility?: 'public' | 'hidden';
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
  processingMode?: 'auto' | 'manual';
}

export const NIDA_USAGE_PACKAGES: UsagePackage[] = [
  { id: 'pkg_basic', name: 'Basic Package', usages: 3, price: 'TSh 10,000', description: 'Affordable starter tokens for document generation', active: true },
  { id: 'pkg_standard', name: 'Standard Package', usages: 7, price: 'TSh 20,000', description: 'Popular bundle for active card creators', active: true },
  { id: 'pkg_premium', name: 'Premium Package', usages: 18, price: 'TSh 45,000', description: 'High volume card processing with priority generation', active: true },
];

export const INITIAL_SERVICES: ServiceData[] = [
  {
    id: 'nida',
    name: 'NIDA Services',
    authority: 'National Identification Authority',
    description: 'Instant auto-fill, verification & CR80 card generation for Front & Back National IDs.',
    category: 'identity',
    iconName: 'UserCheck',
    active: true,
    tokenCost: 1,
    features: ['20-Digit ID Verification', 'Biometric Photo Cropping', 'Digital Signature Pad', 'Barcode Sync'],
    processingMode: 'auto',
  },
  {
    id: 'driving_license',
    name: 'Driving License Services',
    authority: 'Traffic & Vehicle Inspection',
    description: 'Driver permit issuance, class endorsements & digital driver identification cards.',
    category: 'civil',
    iconName: 'Car',
    active: true,
    tokenCost: 1,
    features: ['Class Endorsements (A, B, C, D, E)', 'Penalty Point Tracking', 'Digital QR Validation'],
    processingMode: 'auto',
  },
  {
    id: 'birth_certificate',
    name: 'Birth Certificate Services',
    authority: 'RITA Civil Registration',
    description: 'Unofficial birth certificate issuance, verification & digital civil registry documentation.',
    category: 'civil',
    iconName: 'ScrollText',
    active: false,
    tokenCost: 1,
    features: ['Birth Certificate Archiving', 'Legal Certification', 'Unofficial Watermark Validation'],
    processingMode: 'auto',
  },
  {
    id: 'passport',
    name: 'Passport Services',
    authority: 'Immigration Services Department',
    description: 'East African e-Passport booklet formatting, bio-data pages & travel credentials.',
    category: 'identity',
    iconName: 'Globe',
    active: false,
    tokenCost: 1,
    features: ['ICAO 9303 Compliant MRZ', 'Biometric Chip Layout', 'Diplomatic & Ordinary Profiles'],
    processingMode: 'auto',
  },
  {
    id: 'tin',
    name: 'TIN Services',
    authority: 'Tanzania Revenue Authority',
    description: 'Taxpayer Identification Number cards, tax compliance credentials & PIN certificates.',
    category: 'finance',
    iconName: 'Receipt',
    active: false,
    tokenCost: 1,
    features: ['Taxpayer PIN Sync', 'QR Compliance Stamp', 'Corporate & Individual Formats'],
    processingMode: 'auto',
  },
  {
    id: 'business_license',
    name: 'Business License Services',
    authority: 'BRELA & Municipal Authorities',
    description: 'Commercial enterprise registration certificates, municipal trade permits & corporate IDs.',
    category: 'finance',
    iconName: 'Building2',
    active: false,
    tokenCost: 1,
    features: ['BRELA Certificate Layout', 'Annual Renewal Badges', 'Sector Trade Validation'],
    processingMode: 'auto',
  },
  {
    id: 'heslb',
    name: 'HESLB Student Loans Services',
    authority: 'Higher Education Students’ Loans Board',
    description: 'Student beneficiary loan allocation cards, academic verification & repayment IDs.',
    category: 'education',
    iconName: 'GraduationCap',
    active: false,
    tokenCost: 1,
    features: ['Index Number Verification', 'Institution Allocation Status', 'Beneficiary Smart Badges'],
    processingMode: 'auto',
  },
  {
    id: 'nhif',
    name: 'NHIF Membership Card',
    authority: 'National Health Insurance Fund',
    description: 'Healthcare membership smart cards, dependent coverage validation & biometric health passes.',
    category: 'health',
    iconName: 'HeartPulse',
    active: true,
    tokenCost: 1,
    features: ['Principal & Dependent Mapping', 'Hospital Tier Endorsements', 'Smart Card Chip Specs'],
    processingMode: 'auto',
  },
  {
    id: 'ajira',
    name: 'Ajira Portal Services',
    authority: 'Public Service Recruitment Secretariat',
    description: 'Government job application portfolios, civil service recruitment IDs & applicant profiles.',
    category: 'education',
    iconName: 'Briefcase',
    active: false,
    tokenCost: 1,
    features: ['Civil Service Application Sync', 'Cadre Certificate Validation', 'Interview Pass Generation'],
    processingMode: 'auto',
  },
];

export interface PasskeyItem {
  id: string;
  key: string;
  role: 'admin' | 'user';
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
    type: 'welcome_bonus' | 'purchase' | 'admin_grant' | 'consumption';
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
  role: 'user';
  tokens: number;
  status: 'ACTIVE' | 'DISABLED' | 'PENDING';
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
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
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  adminNotes?: string;
  submittedAt?: number;
}

export const DEFAULT_MANUAL_REQUESTS: ManualRequestItem[] = [];

export const DEFAULT_REGISTERED_USERS: RegisteredUser[] = [];

export const DEFAULT_PAYMENT_REQUESTS: PaymentRequest[] = [];

interface TemplateState {
  activeScreen: 'home' | 'upload' | 'editor' | 'templates' | 'nida' | 'nida_request' | 'preview' | 'downloads' | 'driving_license' | 'nhif' | 'admin-payments' | 'billing' | 'settings';
  currentTemplate: CardTemplate;
  frontPopulatedTemplate: CardTemplate | null;
  backPopulatedTemplate: CardTemplate | null;
  lastNidaFormData: any | null;
  lastDrivingLicenseFormData: any | null;
  lastNhifFormData: any | null;
  setLastNidaFormData: (data: any) => void;
  setLastDrivingLicenseFormData: (data: any) => void;
  setLastNhifFormData: (data: any) => void;
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
  addPaymentMethod: (method: Omit<ConfigurablePaymentMethod, 'id'>) => void;
  deletePaymentMethod: (id: string) => void;
  publishPaymentMethodsToSupabase: () => Promise<boolean>;
  publishAdminSettingsToSupabase: () => Promise<boolean>;
  updateUserProfile: (updates: Partial<UserProfileSettings>) => void;
  updateUserPreferences: (updates: Partial<UserPreferences>) => void;
  updateAdminSettings: (updates: Partial<AdminSystemSettings>) => void;
  submitUserPayment: (data: { amount: number; sender: string; receiver: string; reference: string; date: string }) => { success: boolean; message: string; submission?: UserPaymentSubmission };
  approveUserPayment: (submissionId: string, tokensToGrant?: number) => { success: boolean; message: string };
  rejectUserPayment: (submissionId: string, reason?: string) => { success: boolean; message: string };
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
  navigationHistory: Array<{
    screen: 'home' | 'upload' | 'editor' | 'templates' | 'nida' | 'nida_request' | 'preview' | 'downloads' | 'driving_license' | 'nhif' | 'admin-payments' | 'billing' | 'settings';
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
  importTemplateJSON: (json: string, asNew?: boolean) => Promise<{ success: boolean; message: string }>;

  navigateSafely: (
    targetScreen: 'home' | 'upload' | 'editor' | 'templates' | 'nida' | 'nida_request' | 'preview' | 'downloads' | 'driving_license' | 'nhif' | 'admin-payments' | 'billing' | 'settings',
    serviceId?: string,
    bypassDraftRestore?: boolean
  ) => void;
  goBack: () => void;
  confirmPendingNavigation: (saveFirst?: boolean) => Promise<void>;
  cancelPendingNavigation: () => void;

  // Dynamic Token Packages state & actions
  tokenPackages: UsagePackage[];
  addTokenPackage: (pkg: Omit<UsagePackage, 'id'>) => void;
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

  // Passkey Gateway Auth System
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

  loginWithPasskey: (inputKey: string) => Promise<{ success: boolean; role?: AuthRole; message?: string }>;
  fetchPasskeysFromSupabase: () => Promise<void>;
  logoutPasskey: () => void;
  setPasskeyManagerOpen: (open: boolean) => void;
  setRechargeModalOpen: (open: boolean, notice?: string | null) => void;
  registerUserAccount: (data: { fullName: string; phone: string; passkey: string }) => Promise<{ success: boolean; message: string; user?: RegisteredUser }>;
  recoverPasskey: (phone: string, newPasskey: string) => Promise<{ success: boolean; message: string }>;
  updateUserActivity: (currentService?: string, currentActivity?: string) => void;
  submitPaymentRequest: (packageId: string, packageName: string, amount: string, requestedUsages: number) => { success: boolean; message: string; request?: PaymentRequest };
  cancelPaymentRequest: (requestId?: string) => { success: boolean; message: string };
  updateUserPaymentRequest: (requestId: string, packageId: string, packageName: string, amount: string, requestedUsages: number) => { success: boolean; message: string };
  approvePaymentRequest: (requestId: string) => { success: boolean; message: string };
  rejectPaymentRequest: (requestId: string) => { success: boolean; message: string };
  updatePaymentRequest: (requestId: string, updates: Partial<PaymentRequest>) => { success: boolean; message: string };
  reactivatePaymentRequest: (requestId: string) => { success: boolean; message: string };
  submitManualRequest: (data: { serviceId: string; serviceName: string; fullName: string; whatsappNumber: string; normalNumber?: string; normalCallNumber?: string }) => { success: boolean; message: string; request?: ManualRequestItem };
  updateManualRequestStatus: (requestId: string, status: ManualRequestItem['status'], adminNotes?: string) => { success: boolean; message: string };
  deleteManualRequest: (requestId: string) => { success: boolean; message: string };
  toggleUserStatus: (userId: string) => void;
  deleteRegisteredUser: (userId: string) => void;
  refreshUserStatus: () => void;

  addPasskey: (item: Partial<PasskeyItem> & { key: string; role: 'admin' | 'user' }) => PasskeyItem;
  generateUserPasskey: (
    description?: string,
    usages?: number,
    options?: { paymentStatus?: PaymentStatus; packageName?: string; packagePrice?: number | string }
  ) => PasskeyItem;
  generateUserPasskeyWithPackage: (
    packageName: string,
    usages: number,
    price: string,
    isAutoActive?: boolean,
    description?: string
  ) => PasskeyItem;
  generateAdminPasskey: (description?: string) => PasskeyItem;
  resetAdminPasskey: (currentKey: string, newKey: string) => { success: boolean; message: string };
  togglePasskeyStatus: (id: string) => void;
  deletePasskey: (id: string) => void;

  // Usage Manager Actions
  consumeUsage: (serviceName?: string, details?: string, tokenCost?: number) => { success: boolean; remainingUsages: number; message?: string };
  confirmPaymentAndActivatePasskey: (id: string) => void;
  addUsagesToPasskey: (id: string, additionalUsages: number, newPackageName?: string, historyReason?: string) => void;

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

  // Modals
  isTemplateLibraryOpen: boolean;
  isCardGeneratorOpen: boolean;
  isExportModalOpen: boolean;
  isMergeModalOpen: boolean;
  isSaveModalOpen: boolean;
  activeMobileSheet: 'elements' | 'layers' | 'backgrounds' | 'properties' | 'settings' | null;

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
    } | null
  ) => void;

  // History stack for Undo/Redo
  history: CardTemplate[];
  historyIndex: number;

  // Actions
  setActiveScreen: (screen: 'home' | 'upload' | 'editor' | 'templates' | 'nida' | 'nida_request' | 'preview' | 'downloads' | 'driving_license' | 'admin-payments' | 'billing' | 'settings') => void;
  setPopulatedCardPair: (front: CardTemplate | null, back: CardTemplate | null, formData?: any) => void;
  createNewTemplate: (background: BackgroundConfig, name?: string) => void;
  loadTemplate: (template: CardTemplate) => void;
  setCurrentTemplate: (template: CardTemplate) => void;
  updateTemplateMeta: (meta: Partial<CardTemplate>) => void;
  setActiveUnit: (unit: Unit) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPanOffset: (offset: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  recenterWorkspace: () => void;
  resetView: () => void;

  // Layer Management
  setSelectedLayerIds: (ids: string[]) => void;
  selectLayer: (id: string, multiSelect?: boolean) => void;
  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  updateLayerLive: (id: string, patch: Partial<Layer>) => void;
  applyFontToLayers: (fontFamily: string, scope: 'selected' | 'all', targetLayerId?: string) => void;
  applyWeightToLayers: (fontWeight: number, scope: 'selected' | 'all', targetLayerId?: string) => void;
  deleteSelectedLayers: () => void;
  duplicateSelectedLayers: () => void;
  reorderLayer: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;

  // Precision Movement & Alignment
  nudgeSelectedLayers: (dxMm: number, dyMm: number) => void;
  alignSelectedLayers: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeSelectedLayers: (direction: 'horizontal' | 'vertical') => void;

  // Background Library
  loadUploadedBackgrounds: () => Promise<void>;
  addUploadedBackground: (
    bg: Omit<UploadedBackground, 'id' | 'createdAt'>
  ) => Promise<UploadedBackground>;
  updateUploadedBackground: (id: string, patch: Partial<UploadedBackground>) => Promise<void>;
  deleteUploadedBackground: (id: string) => Promise<void>;

  // Guides & Rulers & Safe Zones
  addGuide: (guide: Omit<Guide, 'id'>) => void;
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
  setActiveMobileSheet: (sheet: 'elements' | 'layers' | 'backgrounds' | 'properties' | 'settings' | null) => void;

  // Storage / Persistence
  saveCurrentTemplate: () => Promise<void>;
  saveAsNewTemplate: (newName: string, cardType?: any, side?: any) => Promise<CardTemplate>;
  loadSavedTemplates: (force?: boolean) => Promise<CardTemplate[]>;
  deleteSavedTemplate: (id: string) => Promise<void>;

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
  id: 'template_' + Date.now(),
  templateName: 'Untitled Card Template',
  cardWidth: CR80_WIDTH_MM,
  cardHeight: CR80_HEIGHT_MM,
  unit: 'mm',
  dpi: 300,
  orientation: 'landscape',
  background: {
    type: 'color',
    color: '#ffffff',
  },
  layers: [],
  guides: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const normalizePasskeyItem = (raw: any): PasskeyItem => {
  const role: 'admin' | 'user' = raw.role === 'admin' ? 'admin' : 'user';
  const totalUsages = typeof raw.totalUsages === 'number' ? raw.totalUsages : (role === 'admin' ? 99999 : 5);
  const usedUsages = typeof raw.usedUsages === 'number' ? raw.usedUsages : 0;
  const remainingUsages = typeof raw.remainingUsages === 'number' ? raw.remainingUsages : Math.max(0, totalUsages - usedUsages);

  let paymentStatus: PaymentStatus = raw.paymentStatus;
  if (remainingUsages <= 0) {
    paymentStatus = 'EXHAUSTED';
  } else if (paymentStatus === 'EXHAUSTED' && remainingUsages > 0) {
    paymentStatus = 'ACTIVE';
  } else if (!paymentStatus) {
    if (raw.active === false) paymentStatus = 'DISABLED';
    else if (remainingUsages <= 0) paymentStatus = 'EXHAUSTED';
    else paymentStatus = 'ACTIVE';
  }

  return {
    id: raw.id || `pk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    key: raw.key,
    role,
    active: paymentStatus !== 'DISABLED' && raw.active !== false,
    createdDate: raw.createdDate || new Date().toISOString().replace('T', ' ').substring(0, 16),
    createdAtTimestamp: raw.createdAtTimestamp || Date.now(),
    createdBy: raw.createdBy || 'System',
    description: raw.description || '',
    lastUsed: raw.lastUsed,
    totalUsages,
    usedUsages,
    remainingUsages,
    paymentStatus,
    packageName: raw.packageName || (role === 'admin' ? 'Unlimited Admin' : `${totalUsages} Usages Package`),
    packagePrice: raw.packagePrice || (role === 'admin' ? 'Free' : totalUsages === 1 ? 'TSh 10,000' : totalUsages === 2 ? 'TSh 15,000' : 'TSh 25,000'),
    usageHistory: Array.isArray(raw.usageHistory) ? raw.usageHistory : [],
  };
};

export function safeLocalStorageSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    if (
      err?.name === 'QuotaExceededError' ||
      err?.code === 22 ||
      err?.number === -2147024882 ||
      err?.message?.includes('exceeded the quota')
    ) {
      console.warn(`[Storage System] LocalStorage quota limit reached for key '${key}'. Cleaning stale drafts...`);
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('bigsta_studio_draft_') && k !== key) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        localStorage.setItem(key, value);
        return true;
      } catch {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object') {
            const stripped = { ...parsed };
            if (stripped.background?.type === 'image' && stripped.background?.src?.length > 10000) {
              stripped.background = { ...stripped.background, src: '' };
            }
            if (Array.isArray(stripped.layers)) {
              stripped.layers = stripped.layers.map((l: any) => {
                if (l.type === 'image' && l.src?.length > 10000) {
                  return { ...l, src: '' };
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
        console.warn(`[Storage System] LocalStorage quota reached for '${key}'. Full template draft stored in IndexedDB.`);
        return false;
      }
    } else {
      console.warn(`[Storage System] LocalStorage setItem error for '${key}':`, err);
      return false;
    }
  }
}

export const useTemplateStore = create<TemplateState>((set, get) => {
  const savedDefaultFrontId =
    typeof window !== 'undefined'
      ? localStorage.getItem('nida_default_front_template_id')
      : null;
  const savedDefaultBackId =
    typeof window !== 'undefined'
      ? localStorage.getItem('nida_default_back_template_id')
      : null;

  const savedSelectedFrontId =
    typeof window !== 'undefined'
      ? localStorage.getItem('nida_selected_front_template_id') || savedDefaultFrontId || 'sample_tanzania_nida'
      : savedDefaultFrontId || 'sample_tanzania_nida';
  const savedSelectedBackId =
    typeof window !== 'undefined'
      ? localStorage.getItem('nida_selected_back_template_id') || savedDefaultBackId || 'sample_tanzania_nida_back'
      : savedDefaultBackId || 'sample_tanzania_nida_back';

  const initialAuthRole: AuthRole = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('bigsta_auth_role');
      if (stored === 'admin' || stored === 'user') return stored;
    } catch (e) {}
    return null;
  })();

  const initialAuthKey: string | null = (() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('bigsta_auth_key');
    } catch (e) {}
    return null;
  })();

  const initialPasskeys: PasskeyItem[] = (() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('bigsta_passkeys');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          import('../services/supabase').then(({ syncPasskeySupabase }) => {
            parsed.forEach((p) => {
              if (p && p.key) {
                syncPasskeySupabase(normalizePasskeyItem(p));
              }
            });
          }).catch(() => {});
        }
        localStorage.removeItem('bigsta_passkeys');
      }
    } catch (e) {
      try {
        localStorage.removeItem('bigsta_passkeys');
      } catch (err) {}
    }
    return [];
  })();

  const initialRegisteredUsers: RegisteredUser[] = (() => {
    if (typeof window === 'undefined') return DEFAULT_REGISTERED_USERS;
    try {
      const raw = localStorage.getItem('bigsta_registered_users');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_REGISTERED_USERS;
  })();

  const initialPaymentRequests: PaymentRequest[] = (() => {
    if (typeof window === 'undefined') return DEFAULT_PAYMENT_REQUESTS;
    try {
      const raw = localStorage.getItem('bigsta_payment_requests');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_PAYMENT_REQUESTS;
  })();

  const initialManualRequests: ManualRequestItem[] = (() => {
    if (typeof window === 'undefined') return DEFAULT_MANUAL_REQUESTS;
    try {
      const raw = localStorage.getItem('bigsta_manual_requests');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_MANUAL_REQUESTS;
  })();

  const initialTokenPackages: UsagePackage[] = (() => {
    if (typeof window === 'undefined') return NIDA_USAGE_PACKAGES;
    try {
      const raw = localStorage.getItem('bigsta_token_packages');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return NIDA_USAGE_PACKAGES;
  })();

  const initialServicesList: ServiceData[] = (() => {
    if (typeof window === 'undefined') return INITIAL_SERVICES;
    try {
      const raw = localStorage.getItem('bigsta_services');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_SERVICES;
  })();

  const initialPaymentMethods: ConfigurablePaymentMethod[] = (() => {
    const DEFAULT_METHODS: ConfigurablePaymentMethod[] = [
      { id: 'pm_mpesa', name: 'M-Pesa', number: '0123 000 111', accountName: 'BIGSTA SERVICES LTD', instructions: 'Dial *150*00# -> Pay Merchant or Send Money to 0123 000 111', status: 'active' },
      { id: 'pm_mixx', name: 'Mixx by Yas', number: '0123 000 222', accountName: 'BIGSTA SERVICES LTD', instructions: 'Dial *150*01# -> Pay Merchant or Send Money to 0123 000 222', status: 'active' },
      { id: 'pm_airtel', name: 'Airtel Money', number: '0123 000 333', accountName: 'BIGSTA SERVICES LTD', instructions: 'Dial *150*60# -> Pay Merchant or Send Money to 0123 000 333', status: 'active' },
      { id: 'pm_halopesa', name: 'HaloPesa', number: '0123 000 444', accountName: 'BIGSTA SERVICES LTD', instructions: 'Dial *150*88# -> Send Money to 0123 000 444', status: 'active' },
      { id: 'pm_lipanamba', name: 'Lipa Namba', number: '1234567', accountName: 'BIGSTA SERVICES LTD', instructions: 'Pay via Lipa Namba merchant payment to number 1234567', status: 'active' }
    ];
    if (typeof window === 'undefined') return DEFAULT_METHODS;
    try {
      const raw = localStorage.getItem('bigsta_payment_methods');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_METHODS;
  })();

    const initialUserProfile: UserProfileSettings = (() => {
    if (typeof window === 'undefined') return { name: 'John Sample', phone: '+255 123 456 789', email: 'sample@bigsta.tz', region: 'Dar es Salaam' };
    try {
      const raw = localStorage.getItem('bigsta_user_profile');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { name: 'John Sample', phone: '+255 123 456 789', email: 'sample@bigsta.tz', region: 'Dar es Salaam' };
  })();

  const initialUserPreferences: UserPreferences = (() => {
    if (typeof window === 'undefined') return {
      theme: 'light',
      language: 'en',
      fontSize: 'standard',
      paymentAlerts: true,
      downloadAlerts: true,
      systemAlerts: true,
      downloadFolder: 'Downloads/BIGsta',
      autoSave: true,
      openAfterDownload: false,
      keepHistoryDays: 30
    };
    try {
      const raw = localStorage.getItem('bigsta_user_preferences');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      theme: 'light',
      language: 'en',
      fontSize: 'standard',
      paymentAlerts: true,
      downloadAlerts: true,
      systemAlerts: true,
      downloadFolder: 'Downloads/BIGsta',
      autoSave: true,
      openAfterDownload: false,
      keepHistoryDays: 30
    };
  })();

  const initialAdminSettings: AdminSystemSettings = (() => {
    if (typeof window === 'undefined') return {
      ocrProvider: 'Local AI / Tesseract Engine',
      ocrConfidenceThreshold: 85,
      autoApprovalEnabled: true,
      tokenPriceTsh: 2000,
      tokenRewardBonus: 10,
      maxDailyTokenLimit: 1000,
      autoApprovalRules: 'Auto approve reference matches with confidence > 85%'
    };
    try {
      const raw = localStorage.getItem('bigsta_admin_settings');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      ocrProvider: 'Local AI / Tesseract Engine',
      ocrConfidenceThreshold: 85,
      autoApprovalEnabled: true,
      tokenPriceTsh: 2000,
      tokenRewardBonus: 10,
      maxDailyTokenLimit: 1000,
      autoApprovalRules: 'Auto approve reference matches with confidence > 85%'
    };
  })();

  const initialUserPayments: UserPaymentSubmission[] = (() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('bigsta_user_payment_submissions');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      {
        id: 'sub_sample_1',
        userId: 'pk_user_1',
        amount: 6000,
        sender: 'John Sample (0123456789)',
        receiver: 'BIGsta Services',
        reference: 'ABC1234567',
        date: '2026-09-17',
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
        status: 'verified',
        extractedData: {
          amount: 6000,
          sender: 'John Sample',
          receiver: 'BIGsta',
          reference: 'ABC1234567',
          date: '2026-09-17'
        },
        tokensGranted: 3
      }
    ];
  })();

  const initialTokenHistory: TokenTransaction[] = (() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('bigsta_token_history');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      { id: 'th_1', userId: 'pk_user_1', amount: 5, reason: 'Welcome Token Package Granted', timestamp: new Date(Date.now() - 172800000).toISOString() },
      { id: 'th_2', userId: 'pk_user_1', amount: 3, reason: 'Payment Top-Up Verified (Ref: ABC1234567)', timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: 'th_3', userId: 'pk_user_1', amount: -1, reason: 'Generated ID Card Export', timestamp: new Date(Date.now() - 36000000).toISOString() }
    ];
  })();

  return {
    activeScreen: 'home',
    currentTemplate: DEFAULT_TEMPLATE,
    frontPopulatedTemplate: null,
    backPopulatedTemplate: null,
    lastNidaFormData: null,
    lastDrivingLicenseFormData: null,
    lastNhifFormData: null,
    setLastNidaFormData: (data: any) => set({ lastNidaFormData: data }),
    setLastDrivingLicenseFormData: (data: any) => set({ lastDrivingLicenseFormData: data }),
    setLastNhifFormData: (data: any) => set({ lastNhifFormData: data }),
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
        const { fetchTokenPackagesSupabase } = await import('../services/supabase');
        const pkgs = await fetchTokenPackagesSupabase();
        if (Array.isArray(pkgs)) {
          const mapped: UsagePackage[] = pkgs.map(p => ({
            id: p.id,
            name: p.name,
            usages: p.usages,
            price: p.price,
            description: p.description || '',
            visibility: (p.visibility || 'public') as 'public' | 'hidden',
            active: p.is_active !== false,
            sortOrder: p.sort_order ?? 0,
            bonus: p.bonus ?? 0,
            promotion: p.promotion || '',
          }));
          set({ tokenPackages: mapped });
        }
      } catch (e) {
        console.error('Error loading token packages from Supabase:', e);
      }
    },

    loadWeeklyOffers: async () => {
      try {
        const { fetchWeeklyOffersSupabase } = await import('../services/supabase');
        const offers = await fetchWeeklyOffersSupabase();
        if (offers) {
          const mapped = offers.map(o => ({
            id: o.id,
            title: o.title,
            description: o.description,
            tokens: o.tokens,
            price: o.price,
            services: o.services,
            startDate: o.start_date,
            endDate: o.end_date,
            active: o.is_active
          }));
          set({ weeklyOffers: mapped });
        }
      } catch (e) {
        console.error('Error loading weekly offers from Supabase:', e);
      }
    },

    updatePaymentMethod: (id, updates) => {
      const updated = get().paymentMethods.map(pm => pm.id === id ? { ...pm, ...updates } : pm);
      safeLocalStorageSetItem('bigsta_payment_methods', JSON.stringify(updated));
      set({ paymentMethods: updated });
    },

    addPaymentMethod: (method) => {
      const newMethod: ConfigurablePaymentMethod = { ...method, id: `pm_${Date.now()}` };
      const updated = [...get().paymentMethods, newMethod];
      safeLocalStorageSetItem('bigsta_payment_methods', JSON.stringify(updated));
      set({ paymentMethods: updated });
    },

    deletePaymentMethod: (id) => {
      const updated = get().paymentMethods.filter(pm => pm.id !== id);
      safeLocalStorageSetItem('bigsta_payment_methods', JSON.stringify(updated));
      set({ paymentMethods: updated });
    },

    publishPaymentMethodsToSupabase: async () => {
      try {
        const { savePaymentMethodsSupabase } = await import('../services/supabase');
        const success = await savePaymentMethodsSupabase(get().paymentMethods);
        return success;
      } catch (e) {
        console.error('Failed to publish payment methods to Supabase:', e);
        return false;
      }
    },

    publishAdminSettingsToSupabase: async () => {
      try {
        const { saveAdminSettingsSupabase } = await import('../services/supabase');
        const success = await saveAdminSettingsSupabase(get().adminSettings);
        return success;
      } catch (e) {
        console.error('Failed to publish admin settings to Supabase:', e);
        return false;
      }
    },

    updateUserProfile: (updates) => {
      const updated = { ...get().userProfile, ...updates };
      safeLocalStorageSetItem('bigsta_user_profile', JSON.stringify(updated));
      set({ userProfile: updated });
    },

    updateUserPreferences: (updates) => {
      const updated = { ...get().userPreferences, ...updates };
      safeLocalStorageSetItem('bigsta_user_preferences', JSON.stringify(updated));
      if (typeof document !== 'undefined') {
        if (updated.theme === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'dark');
          document.body.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.setAttribute('data-theme', 'light');
          document.body.classList.remove('dark');
        }
      }
      set({ userPreferences: updated });
    },

    updateAdminSettings: (updates) => {
      const updated = { ...get().adminSettings, ...updates };
      safeLocalStorageSetItem('bigsta_admin_settings', JSON.stringify(updated));
      set({ adminSettings: updated });
    },

    submitUserPayment: (data) => {
      const tokensCalculated = Math.max(1, Math.floor(data.amount / (get().adminSettings.tokenPriceTsh || 2000)));
      const newSub: UserPaymentSubmission = {
        id: `sub_${Date.now()}`,
        userId: get().currentAuthKey || 'user_default',
        passkeyId: get().currentAuthKey || 'user_default',
        amount: data.amount,
        sender: data.sender,
        receiver: data.receiver || 'BIGsta',
        reference: data.reference,
        date: data.date,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        extractedData: {
          amount: data.amount,
          sender: data.sender,
          receiver: data.receiver || 'BIGsta',
          reference: data.reference,
          date: data.date
        }
      };
      const updated = [newSub, ...get().userPaymentSubmissions];
      safeLocalStorageSetItem('bigsta_user_payment_submissions', JSON.stringify(updated));
      set({ userPaymentSubmissions: updated });
      return { success: true, message: 'Payment screenshot & extracted data submitted for verification', submission: newSub };
    },

    approveUserPayment: (submissionId, tokensToGrant) => {
      const sub = get().userPaymentSubmissions.find(s => s.id === submissionId);
      if (!sub) return { success: false, message: 'Submission not found' };

      const granted = tokensToGrant || Math.max(1, Math.floor(sub.amount / (get().adminSettings.tokenPriceTsh || 2000)));
      const updatedSubs = get().userPaymentSubmissions.map(s =>
        s.id === submissionId ? { ...s, status: 'verified' as const, tokensGranted: granted } : s
      );
      safeLocalStorageSetItem('bigsta_user_payment_submissions', JSON.stringify(updatedSubs));

      // Grant usages to user
      const targetPasskey = sub.passkeyId || get().currentAuthKey || 'pk_user_1';
      get().addUsagesToPasskey(
        targetPasskey,
        granted,
        `Approved Payment: Ref ${sub.reference}`,
        `Top-Up Approved (Ref: ${sub.reference})`
      );

      get().showSuccessActivation(`Your top-up of ${granted} tokens has been activated successfully.`);

      set({ userPaymentSubmissions: updatedSubs });
      return { success: true, message: `Payment approved! Granted ${granted} tokens.` };
    },

    rejectUserPayment: (submissionId, reason) => {
      const updatedSubs = get().userPaymentSubmissions.map(s =>
        s.id === submissionId ? { ...s, status: 'rejected' as const, rejectionReason: reason || 'Invalid payment receipt details' } : s
      );
      safeLocalStorageSetItem('bigsta_user_payment_submissions', JSON.stringify(updatedSubs));
      set({ userPaymentSubmissions: updatedSubs });
      return { success: true, message: 'Payment submission rejected.' };
    },

    addTokenHistoryItem: (amount, reason, ownerId) => {
      if (!Number.isFinite(amount) || amount === 0) return;
      const newItem: TokenTransaction = {
        id: `th_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        userId: ownerId || get().currentAuthKey || 'user_default',
        amount,
        reason,
        timestamp: new Date().toISOString()
      };
      const updated = [newItem, ...get().tokenHistory].slice(0, 500);
      safeLocalStorageSetItem('bigsta_token_history', JSON.stringify(updated));
      set({ tokenHistory: updated });

      import('../services/supabase')
        .then(({ insertTokenHistorySupabase }) =>
          insertTokenHistorySupabase({
            id: newItem.id,
            ownerId: newItem.userId,
            amount: newItem.amount,
            reason: newItem.reason,
            timestamp: newItem.timestamp,
          })
        )
        .catch((e) => console.warn('Token history sync skipped:', e));
    },

    loadTokenHistory: async () => {
      try {
        const { fetchTokenHistorySupabase } = await import('../services/supabase');
        const { authRole, currentAuthKey, activePasskeys } = get();
        let ownerIds: string[] | undefined;
        if (authRole !== 'admin') {
          const own = activePasskeys.find(
            (p) => p.key.toLowerCase() === (currentAuthKey || '').toLowerCase()
          );
          if (!own) return;
          ownerIds = [own.id];
        }
        const remote = await fetchTokenHistorySupabase(ownerIds);
        if (!remote) return;

        const merged = new Map<string, TokenTransaction>();
        for (const r of remote) {
          merged.set(r.id, { id: r.id, userId: r.ownerId, amount: r.amount, reason: r.reason, timestamp: r.timestamp });
        }
        for (const local of get().tokenHistory) {
          const isRealLocalEntry = /^th_\d{10,}/.test(local.id);
          if (isRealLocalEntry && !merged.has(local.id)) merged.set(local.id, local);
        }
        const updated = Array.from(merged.values())
          .filter((t) => !ownerIds || ownerIds.includes(t.userId))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 500);
        safeLocalStorageSetItem('bigsta_token_history', JSON.stringify(updated));
        set({ tokenHistory: updated });
      } catch (e) {
        console.warn('Token history load skipped:', e);
      }
    },

    activeServiceId: typeof window !== 'undefined' ? (localStorage.getItem('bigsta_active_service') || 'nida') : 'nida',
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
      if (typeof window !== 'undefined' && currentTemplate) {
        saveStudioDraftDB(activeServiceId, currentTemplate).catch(() => {});
        safeLocalStorageSetItem(`bigsta_studio_draft_${activeServiceId}`, JSON.stringify(currentTemplate));
        safeLocalStorageSetItem('bigsta_active_service', activeServiceId);
      }
    },

    restoreStudioDraft: (serviceId?: string) => {
      const targetService = serviceId || get().activeServiceId;
      if (typeof window !== 'undefined') {
        const draft = localStorage.getItem(`bigsta_studio_draft_${targetService}`);
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            if (parsed && parsed.layers) {
              set({ currentTemplate: ensureTemplateFieldIds(parsed) });
            }
          } catch (e) {
            console.warn('Failed to restore studio draft from localStorage:', e);
          }
        }
        getStudioDraftDB(targetService).then((dbDraft) => {
          if (dbDraft && dbDraft.layers) {
            set({ currentTemplate: ensureTemplateFieldIds(dbDraft) });
          }
        }).catch(() => {});
      }
    },

    clearStudioDraft: (serviceId?: string) => {
      const targetService = serviceId || get().activeServiceId;
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`bigsta_studio_draft_${targetService}`);
        deleteStudioDraftDB(targetService).catch(() => {});
      }
    },

    importTemplateJSON: async (jsonString, asNew = false) => {
      try {
        const data = JSON.parse(jsonString);
        if (!data.layers) throw new Error('Invalid template data');
        
        const template: CardTemplate = {
          ...data,
          id: asNew ? `tpl_${Date.now()}` : (data.id || `tpl_${Date.now()}`),
          updatedAt: new Date().toISOString()
        };

        if (asNew) {
          await saveTemplateDB(template);
          const all = await getAllTemplatesDB();
          set({ customTemplates: all });
        } else {
          set({ currentTemplate: template });
        }
        return { success: true, message: 'Template imported successfully' };
      } catch (e: any) {
        return { success: false, message: e.message || 'Import failed' };
      }
    },

    setActiveServiceId: (serviceId: string) => {
      get().saveStudioDraft();
      const savedDraft = typeof window !== 'undefined' ? localStorage.getItem(`bigsta_studio_draft_${serviceId}`) : null;
      let targetTemplate: CardTemplate | null = null;
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed && parsed.layers) {
            targetTemplate = ensureTemplateFieldIds(parsed);
          }
        } catch (e) {
          console.warn('Error parsing draft:', e);
        }
      }
      if (!targetTemplate) {
        targetTemplate = get().getUniversalFrontTemplate(serviceId);
      }
      if (typeof window !== 'undefined') {
        safeLocalStorageSetItem('bigsta_active_service', serviceId);
      }
      set({
        activeServiceId: serviceId,
        currentTemplate: targetTemplate,
      });

      getStudioDraftDB(serviceId).then((dbDraft) => {
        if (dbDraft && dbDraft.layers) {
          set({ currentTemplate: ensureTemplateFieldIds(dbDraft) });
        }
      }).catch(() => {});
    },

    navigateSafely: (targetScreen, serviceId, bypassDraftRestore) => {
      const role = get().authRole;
      let finalTarget = targetScreen;

      if (role === 'user' && (targetScreen === 'upload' || targetScreen === 'editor' || targetScreen === 'templates')) {
        finalTarget = 'home';
      }

      const performNav = () => {
        const current = get().activeScreen;
        const history = get().navigationHistory;
        if (current !== finalTarget) {
          set({
            navigationHistory: [
              ...history,
              { screen: current, serviceId: get().activeServiceId, templateId: get().currentTemplate.id },
            ].slice(-25),
          });
        }

        if (serviceId) {
          get().setActiveServiceId(serviceId);
        }

        set({
          activeScreen: finalTarget as any,
          studioMode: finalTarget === 'editor',
          hasUnsavedChanges: false,
          isUnsavedModalOpen: false,
          pendingNavigation: null,
        });

        if (finalTarget === 'editor' && !bypassDraftRestore) {
          get().restoreStudioDraft(serviceId || get().activeServiceId);
        }
      };

      if (get().hasUnsavedChanges && get().activeScreen === 'editor' && finalTarget !== 'editor') {
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

      // 1. Any service form (nida, driving_license, nhif) must ALWAYS navigate directly to 'home' when back is pressed!
      if (current === 'nida' || current === 'driving_license' || current === 'nhif') {
        const cleanedHistory = get().navigationHistory.filter(
          (h) => h.screen !== 'preview' && h.screen !== 'downloads' && h.screen !== current
        );
        set({
          navigationHistory: cleanedHistory,
          activeScreen: 'home',
          hasUnsavedChanges: false,
          isUnsavedModalOpen: false,
          pendingNavigation: null,
        });
        return;
      }

      // 2. From 'downloads', back must navigate safely to 'home'
      if (current === 'downloads') {
        set({
          navigationHistory: get().navigationHistory.filter(
            (h) => h.screen !== 'preview' && h.screen !== 'downloads'
          ),
          activeScreen: 'home',
          hasUnsavedChanges: false,
          isUnsavedModalOpen: false,
          pendingNavigation: null,
        });
        return;
      }

      // 3. From 'preview', going back returns to the corresponding form, AND strips 'preview' & 'downloads' from history
      // so pressing Back on the form will never loop back to 'preview'
      if (current === 'preview') {
        const targetForm = get().activeServiceId === 'driving_license'
          ? 'driving_license'
          : get().activeServiceId === 'nhif'
          ? 'nhif'
          : 'nida';

        const cleanedHistory = get().navigationHistory.filter(
          (h) => h.screen !== 'preview' && h.screen !== 'downloads'
        );
        set({
          navigationHistory: cleanedHistory,
          activeScreen: targetForm as any,
          hasUnsavedChanges: false,
          isUnsavedModalOpen: false,
          pendingNavigation: null,
        });
        return;
      }

      let history = [...get().navigationHistory];
      while (
        history.length > 0 &&
        (history[history.length - 1].screen === current ||
          history[history.length - 1].screen === 'preview' ||
          history[history.length - 1].screen === 'downloads')
      ) {
        history.pop();
      }

      if (history.length === 0) {
        set({
          navigationHistory: [],
          activeScreen: 'home',
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
          activeScreen: (last?.screen as any) || 'home',
          studioMode: last?.screen === 'editor',
          hasUnsavedChanges: false,
          isUnsavedModalOpen: false,
          pendingNavigation: null,
        });
        if (last?.serviceId) {
          get().setActiveServiceId(last.serviceId);
        }
        if (last?.screen === 'editor') {
          get().restoreStudioDraft(last.serviceId || get().activeServiceId);
        }
      };

      if (get().hasUnsavedChanges && get().activeScreen === 'editor') {
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
      const sId = (serviceId || '').toLowerCase().trim();
      
      const isServiceMatch = (t: CardTemplate) => {
        const tServ = (t.serviceId || '').toLowerCase().trim();
        const tId = (t.id || '').toLowerCase().trim();
        const tType = (t.cardType || '').toLowerCase().trim();

        if (sId === 'driving_license' || sId === 'driving_licence') {
          return tServ === 'driving_license' || tServ === 'driving_licence' || tId.includes('driving') || tType.includes('driving') || tType.includes('license') || tType.includes('licence');
        }
        if (sId === 'nida') {
          return tServ === 'nida' || tId.includes('nida') || tType.includes('nida') || tType.includes('national');
        }
        if (sId === 'nhif') {
          return tServ === 'nhif' || tId.includes('nhif') || tType.includes('nhif') || tType.includes('health');
        }
        if (sId === 'birth_certificate') {
          return tServ === 'birth_certificate' || tId.includes('birth') || tType.includes('birth');
        }
        return tServ === sId || tId.includes(sId) || tType.includes(sId.replace('_', ' '));
      };

      // 1. PRIMARY RULE: Fetch cloud/custom template matching service and side
      const frontCandidates = customTemplates.filter((t) =>
        isServiceMatch(t) &&
        t.isActive !== false &&
        !isBackSideTemplate(t)
      );
      const activeCustom = frontCandidates.find((t) => t.isUniversal) || frontCandidates[0];
      if (activeCustom) {
        console.log('Template resolution: Found cloud template', activeCustom.id);
        return ensureTemplateFieldIds(activeCustom);
      }
      
      console.log('Template resolution: No cloud template found, falling back for service', serviceId);

      // 2. Fallback to localStorage for explicit JSON object override (Legacy support)
      if (typeof window !== 'undefined') {
        const rawObj = localStorage.getItem(`universal_front_obj_${serviceId}`);
        if (rawObj) {
          try {
            const parsed = JSON.parse(rawObj);
            if (parsed && parsed.layers && !isBackSideTemplate(parsed)) {
              return ensureTemplateFieldIds(parsed);
            }
          } catch (e) {
            console.warn('Error parsing universal front object from localStorage:', e);
          }
        }
      }

      // 3. Fallback to saved ID in localStorage (Legacy support)
      const savedId = typeof window !== 'undefined' ? localStorage.getItem(`universal_front_${serviceId}`) : null;
      if (savedId) {
        const foundCustom = customTemplates.find((t) => t.id === savedId && !isBackSideTemplate(t));
        if (foundCustom) return ensureTemplateFieldIds(foundCustom);
        const foundSample = SAMPLE_TEMPLATES.find((t) => t.id === savedId && !isBackSideTemplate(t));
        if (foundSample) return ensureTemplateFieldIds(foundSample);
      }

      // 4. Fallback to sample templates specifically matching serviceId
      const sampleMatch = SAMPLE_TEMPLATES.find((t) => 
        isServiceMatch(t) && 
        !isBackSideTemplate(t)
      );
      if (sampleMatch) return ensureTemplateFieldIds(sampleMatch);

      // 5. Final Fallback ONLY to default front template if serviceId match is not found
      const fallbackSample = SAMPLE_TEMPLATES.find((t) => isServiceMatch(t) && !isBackSideTemplate(t));
      if (fallbackSample) return ensureTemplateFieldIds(fallbackSample);
      
      return ensureTemplateFieldIds(SAMPLE_TEMPLATES[0]);
    },

    getUniversalBackTemplate: (serviceId: string) => {
      const customTemplates = get().customTemplates;
      const sId = (serviceId || '').toLowerCase().trim();
      
      const isServiceMatch = (t: CardTemplate) => {
        const tServ = (t.serviceId || '').toLowerCase().trim();
        const tId = (t.id || '').toLowerCase().trim();
        const tType = (t.cardType || '').toLowerCase().trim();

        if (sId === 'driving_license' || sId === 'driving_licence') {
          return tServ === 'driving_license' || tServ === 'driving_licence' || tId.includes('driving') || tType.includes('driving') || tType.includes('license') || tType.includes('licence');
        }
        if (sId === 'nida') {
          return tServ === 'nida' || tId.includes('nida') || tType.includes('nida') || tType.includes('national');
        }
        if (sId === 'nhif') {
          return tServ === 'nhif' || tId.includes('nhif') || tType.includes('nhif') || tType.includes('health');
        }
        if (sId === 'birth_certificate') {
          return tServ === 'birth_certificate' || tId.includes('birth') || tType.includes('birth');
        }
        return tServ === sId || tId.includes(sId) || tType.includes(sId.replace('_', ' '));
      };

      // 1. PRIMARY RULE: Fetch cloud/custom template matching service and side
      const backCandidates = customTemplates.filter((t) =>
        isServiceMatch(t) &&
        t.isActive !== false &&
        isBackSideTemplate(t)
      );
      const activeCustom = backCandidates.find((t) => t.isUniversal) || backCandidates[0];
      if (activeCustom) return ensureTemplateFieldIds(activeCustom);

      // 2. Fallback to localStorage for explicit JSON object override (Legacy support)
      if (typeof window !== 'undefined') {
        const rawObj = localStorage.getItem(`universal_back_obj_${serviceId}`);
        if (rawObj) {
          try {
            const parsed = JSON.parse(rawObj);
            if (parsed && parsed.layers && isBackSideTemplate(parsed)) {
              return ensureTemplateFieldIds(parsed);
            }
          } catch (e) {
            console.warn('Error parsing universal back object from localStorage:', e);
          }
        }
      }

      // 3. Fallback to saved ID in localStorage (Legacy support)
      const savedId = typeof window !== 'undefined' ? localStorage.getItem(`universal_back_${serviceId}`) : null;
      if (savedId) {
        const foundCustom = customTemplates.find((t) => t.id === savedId && isBackSideTemplate(t));
        if (foundCustom) return ensureTemplateFieldIds(foundCustom);
        const foundSample = SAMPLE_TEMPLATES.find((t) => t.id === savedId && isBackSideTemplate(t));
        if (foundSample) return ensureTemplateFieldIds(foundSample);
      }

      // 4. Fallback to sample templates specifically matching serviceId
      const sampleMatch = SAMPLE_TEMPLATES.find((t) => 
        isServiceMatch(t) && 
        isBackSideTemplate(t)
      );
      if (sampleMatch) return ensureTemplateFieldIds(sampleMatch);

      const fallbackSample = SAMPLE_TEMPLATES.find((t) => isServiceMatch(t) && isBackSideTemplate(t));
      if (fallbackSample) return ensureTemplateFieldIds(fallbackSample);

      return ensureTemplateFieldIds(SAMPLE_TEMPLATES[1]);
    },


    saveUniversalFrontTemplate: async (serviceId: string, template: CardTemplate) => {
      set({ isSaving: true });
      try {
        // Pre-save integrity check
        if (!template || !template.background) {
          throw new Error('Pre-save validation error: Template background or layer state is missing.');
        }
        if (template.background.type === 'image' && !template.background.src) {
          throw new Error('Pre-save validation error: Background image source URL is missing or empty.');
        }

        const nowIso = new Date().toISOString();
        const uniqueFrontId = template.id.endsWith('_front')
          ? template.id
          : `${template.id.replace(/_back$/, '')}_front`;

        // Admin decides active status. By default when saving/publishing a new universal, we make it active.
        const updatedTpl: CardTemplate = {
          ...template,
          id: uniqueFrontId,
          serviceId,
          side: 'Front Side',
          isUniversal: true,
          isUniversalFront: true,
          isUniversalBack: false,
          isActive: true, // New requirement: Admin controlled, but new saves start as active
          visibility: 'universal',
          status: 'published',
          publishedAt: nowIso,
          publishedBy: 'Admin',
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
          const { sanitizeAndUploadTemplateBackground } = await import('../services/supabase');
          sanitized = await sanitizeAndUploadTemplateBackground(sanitized);
        } catch {}
        await saveTemplateDB(sanitized);

        if (typeof window !== 'undefined') {
          safeLocalStorageSetItem(`universal_front_${serviceId}`, sanitized.id);
          safeLocalStorageSetItem(`universal_front_obj_${serviceId}`, JSON.stringify(sanitized));
        }

        // Supabase Universal Template Sync (PROMPT 50.4)
        try {
          const { saveUniversalTemplateSupabase } = await import('../services/supabase');
          // Note: saveUniversalTemplateSupabase already handles server-side auto-deactivation
          await saveUniversalTemplateSupabase(serviceId, sanitized, true, false);
        } catch (e) {
          console.warn('Supabase sync for universal front template skipped:', e);
        }

        set({ 
          customTemplates: [...updatedCustoms.filter(t => t.id !== sanitized.id), sanitized],
          currentTemplate: sanitized, 
          hasUnsavedChanges: false 
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
          throw new Error('Pre-save validation error: Template background or layer state is missing.');
        }
        if (template.background.type === 'image' && !template.background.src) {
          throw new Error('Pre-save validation error: Background image source URL is missing or empty.');
        }

        const nowIsoBack = new Date().toISOString();
        const uniqueBackId = template.id.endsWith('_back')
          ? template.id
          : `${template.id.replace(/_front$/, '')}_back`;

        const updatedTpl: CardTemplate = {
          ...template,
          id: uniqueBackId,
          serviceId,
          side: 'Back Side',
          isUniversal: true,
          isUniversalFront: false,
          isUniversalBack: true,
          isActive: true, // New requirement: Admin controlled, but new saves start as active
          visibility: 'universal',
          status: 'published',
          publishedAt: nowIsoBack,
          publishedBy: 'Admin',
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
          const { sanitizeAndUploadTemplateBackground } = await import('../services/supabase');
          sanitized = await sanitizeAndUploadTemplateBackground(sanitized);
        } catch {}
        await saveTemplateDB(sanitized);

        if (typeof window !== 'undefined') {
          safeLocalStorageSetItem(`universal_back_${serviceId}`, sanitized.id);
          safeLocalStorageSetItem(`universal_back_obj_${serviceId}`, JSON.stringify(sanitized));
        }

        // Supabase Universal Template Sync (PROMPT 50.4)
        try {
          const { saveUniversalTemplateSupabase } = await import('../services/supabase');
          // Note: saveUniversalTemplateSupabase already handles server-side auto-deactivation
          await saveUniversalTemplateSupabase(serviceId, sanitized, false, true);
        } catch (e) {
          console.warn('Supabase sync for universal back template skipped:', e);
        }

        set({ 
          customTemplates: [...updatedCustoms.filter(t => t.id !== sanitized.id), sanitized],
          currentTemplate: sanitized, 
          hasUnsavedChanges: false 
        });

        await get().loadSavedTemplates();
        get().saveStudioDraft();
      } finally {
        set({ isSaving: false });
      }
    },

    toggleTemplateActive: async (templateId: string, isActive: boolean) => {
      const { customTemplates } = get();
      const target = customTemplates.find(t => t.id === templateId);
      if (!target) return;

      const serviceId = target.serviceId;
      const isBack = isBackSideTemplate(target);

      // Auto-Deactivate rule: only one can be active per service/side
      const updatedCustoms = customTemplates.map(t => {
        if (isActive && t.serviceId === serviceId && isBackSideTemplate(t) === isBack && t.id !== templateId) {
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

      // Persist to local DB
      const updatedTarget = updatedCustoms.find(t => t.id === templateId)!;
      await saveTemplateDB(sanitizeTemplateForSaving(updatedTarget));

      // Persist to Supabase
      try {
        const { saveTemplateSupabase, saveUniversalTemplateSupabase } = await import('../services/supabase');
        if (updatedTarget.isUniversal) {
          await saveUniversalTemplateSupabase(serviceId || 'custom', updatedTarget, !isBack, isBack);
        } else {
          await saveTemplateSupabase(updatedTarget);
        }
      } catch (e) {
        console.warn('Supabase sync for isActive toggle failed:', e);
      }
      
      await get().loadSavedTemplates();
    },

    tokenPackages: initialTokenPackages,
    addTokenPackage: (pkg) => {
      const id = `pkg_${Date.now()}`;
      const newPkg: UsagePackage = { ...pkg, id, active: pkg.active !== false };
      const updated = [...get().tokenPackages, newPkg];
      safeLocalStorageSetItem('bigsta_token_packages', JSON.stringify(updated));
      set({ tokenPackages: updated });
      import('../services/supabase').then(({ saveTokenPackageSupabase }) => {
        saveTokenPackageSupabase(newPkg);
      }).catch(() => {});
    },
    editTokenPackage: (id, updatedFields) => {
      const updated = get().tokenPackages.map((p) => p.id === id ? { ...p, ...updatedFields } : p);
      safeLocalStorageSetItem('bigsta_token_packages', JSON.stringify(updated));
      set({ tokenPackages: updated });
      const target = updated.find(p => p.id === id);
      if (target) {
        import('../services/supabase').then(({ saveTokenPackageSupabase }) => {
          saveTokenPackageSupabase(target);
        }).catch(() => {});
      }
    },
    deleteTokenPackage: (id) => {
      const updated = get().tokenPackages.filter((p) => p.id !== id);
      safeLocalStorageSetItem('bigsta_token_packages', JSON.stringify(updated));
      set({ tokenPackages: updated });
      import('../services/supabase').then(({ deleteTokenPackageSupabase }) => {
        deleteTokenPackageSupabase(id);
      }).catch(() => {});
    },
    toggleTokenPackage: (id) => {
      const updated = get().tokenPackages.map((p) => p.id === id ? { ...p, active: p.active === false ? true : false } : p);
      safeLocalStorageSetItem('bigsta_token_packages', JSON.stringify(updated));
      set({ tokenPackages: updated });
      const target = updated.find(p => p.id === id);
      if (target) {
        import('../services/supabase').then(({ saveTokenPackageSupabase }) => {
          saveTokenPackageSupabase(target);
        }).catch(() => {});
      }
    },

    addWeeklyOffer: async (offer) => {
      const id = offer.id || `offer_${Date.now()}`;
      const newOffer = { ...offer, id, active: offer.active !== false };
      const updated = [...get().weeklyOffers, newOffer];
      set({ weeklyOffers: updated });
      const { saveWeeklyOfferSupabase } = await import('../services/supabase');
      await saveWeeklyOfferSupabase(newOffer);
    },
    editWeeklyOffer: async (id, fields) => {
      const updated = get().weeklyOffers.map((o) => o.id === id ? { ...o, ...fields } : o);
      set({ weeklyOffers: updated });
      const target = updated.find(o => o.id === id);
      if (target) {
        const { saveWeeklyOfferSupabase } = await import('../services/supabase');
        await saveWeeklyOfferSupabase(target);
      }
    },
    deleteWeeklyOffer: async (id) => {
      const updated = get().weeklyOffers.filter((o) => o.id !== id);
      set({ weeklyOffers: updated });
      const { deleteWeeklyOfferSupabase } = await import('../services/supabase');
      await deleteWeeklyOfferSupabase(id);
    },

    services: initialServicesList,
    addService: (service) => {
      const id = service.id || `srv_${Date.now()}`;
      const newSrv = { ...service, id, active: service.active !== false };
      const updated = [...get().services, newSrv];
      safeLocalStorageSetItem('bigsta_services', JSON.stringify(updated));
      set({ services: updated });
    },
    editService: (id, updatedFields) => {
      const updated = get().services.map((s) => s.id === id ? { ...s, ...updatedFields } : s);
      safeLocalStorageSetItem('bigsta_services', JSON.stringify(updated));
      set({ services: updated });
    },
    deleteService: (id) => {
      const updated = get().services.filter((s) => s.id !== id);
      safeLocalStorageSetItem('bigsta_services', JSON.stringify(updated));
      set({ services: updated });
    },
    toggleService: (id) => {
      const updated = get().services.map((s) => s.id === id ? { ...s, active: !s.active } : s);
      safeLocalStorageSetItem('bigsta_services', JSON.stringify(updated));
      set({ services: updated });
    },

    // Passkey Gateway Auth System State
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
      const fullName = data.fullName.trim();
      const rawPhone = data.phone.trim().replace(/\s+/g, '');
      const passkey = data.passkey.trim();

      // 1. REGISTER & VERIFY ACCOUNT
      const isTz = /^(?:\+255|255|0)[67]\d{8}$/.test(rawPhone);
      if (!isTz) {
        return { success: false, message: 'Phone number does not match a valid Tanzanian format (e.g. 07XXXXXXXX or +2557XXXXXXXX).' };
      }

      const users = get().registeredUsers;
      const passkeys = get().activePasskeys;

      const phoneExists = users.some((u) => u.phone.replace(/\s+/g, '') === rawPhone);
      if (phoneExists) {
        return { success: false, message: 'This phone number is already registered.' };
      }

      const passkeyExists =
        passkeys.some((p) => p.key.toLowerCase() === passkey.toLowerCase()) ||
        users.some((u) => u.passkey.toLowerCase() === passkey.toLowerCase());
      if (passkeyExists) {
        return { success: false, message: 'This passkey is already in use by another account. Please choose a different passkey.' };
      }

      // 2. CHECK WELCOME-TOKEN ELIGIBILITY & DEVICE/IP RISK (SERVER-AUTHORITATIVE & 3-DAY DEVICE COOLDOWN)
      let claimedPhones: string[] = [];
      let recentSignups: number[] = [];
      let deviceId = '';
      let lastDeviceSignupTs = 0;
      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

      try {
        const rawClaimed = typeof window !== 'undefined' ? localStorage.getItem('bigsta_claimed_welcome_tokens') : null;
        if (rawClaimed) claimedPhones = JSON.parse(rawClaimed);

        const rawVelocity = typeof window !== 'undefined' ? localStorage.getItem('bigsta_signup_velocity') : null;
        if (rawVelocity) recentSignups = JSON.parse(rawVelocity);

        deviceId = typeof window !== 'undefined' ? localStorage.getItem('bigsta_device_id') || '' : '';
        if (!deviceId) {
          deviceId = `dev_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
          if (typeof window !== 'undefined') localStorage.setItem('bigsta_device_id', deviceId);
        }

        const rawLastDeviceTs = typeof window !== 'undefined' ? localStorage.getItem(`bigsta_device_last_signup_${deviceId}`) : null;
        if (rawLastDeviceTs) lastDeviceSignupTs = parseInt(rawLastDeviceTs, 10) || 0;
      } catch (e) {}

      // Anti-Abuse Signup Rate Limit (Max 3 signups per 60 seconds)
      const nowTs = Date.now();
      const sixtySecondsAgo = nowTs - 60000;
      recentSignups = recentSignups.filter(ts => ts > sixtySecondsAgo);
      const isVelocitySuspicious = recentSignups.length >= 3;
      recentSignups.push(nowTs);

      // 3-Day Device Cooldown Check
      const isDeviceInCooldown = lastDeviceSignupTs > 0 && (nowTs - lastDeviceSignupTs < THREE_DAYS_MS);

      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('bigsta_signup_velocity', JSON.stringify(recentSignups));
          localStorage.setItem(`bigsta_device_last_signup_${deviceId}`, nowTs.toString());
        }
      } catch (e) {}

      const phoneAlreadyClaimed = claimedPhones.includes(rawPhone);
      const isEligible = !phoneAlreadyClaimed && !isVelocitySuspicious && !isDeviceInCooldown;
      
      let suspiciousStatus = 'Normal / Verified';
      if (isVelocitySuspicious) {
        suspiciousStatus = 'Rate Limit Velocity Flagged (Suspicious Signup Speed)';
      } else if (isDeviceInCooldown) {
        suspiciousStatus = 'Device Cooldown Flagged (< 3 Days Since Last Device Signup)';
      } else if (phoneAlreadyClaimed) {
        suspiciousStatus = 'Phone Already Claimed Welcome Token';
      }

      // 3. IF ELIGIBLE: grant exactly 1 token and record permanently with immutable grant ID & transaction ledger
      const grantedTokens = isEligible ? 1 : 0;
      const grantId = isEligible ? `grant_${nowTs}_${Math.random().toString(36).substring(2, 10)}` : '';

      if (isEligible) {
        claimedPhones.push(rawPhone);
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('bigsta_claimed_welcome_tokens', JSON.stringify(claimedPhones));
          }
        } catch (e) {}
      }

      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);

      const immutableTransactions = isEligible ? [{
        id: `tx_${nowTs}`,
        userId: `usr_${nowTs}`,
        type: 'welcome_bonus' as const,
        amount: 1,
        timestamp: dateStr,
        timestampMs: nowTs,
        reason: 'Welcome Token Grant (Server Authorized)',
        grantId: grantId
      }] : [];

      const newPasskeyItem: PasskeyItem = {
        id: `pk_user_${nowTs}`,
        key: passkey,
        role: 'user',
        active: true,
        createdDate: dateStr,
        createdAtTimestamp: nowTs,
        createdBy: fullName,
        description: `Registered User: ${fullName} (${rawPhone}) [Welcome: ${isEligible ? 'Granted' : 'Denied'}]`,
        totalUsages: grantedTokens,
        usedUsages: 0,
        remainingUsages: grantedTokens,
        paymentStatus: grantedTokens > 0 ? 'ACTIVE' : 'EXHAUSTED',
        packageName: grantedTokens > 0 ? '1 Welcome Token Free Starter' : '0 Tokens (Already Claimed or Rate Limited)',
        packagePrice: 'Free',
        usageHistory: [],
        welcomeTokenGranted: isEligible,
        welcomeTokenGrantedAt: isEligible ? dateStr : undefined,
        grantId: grantId || undefined,
        tokenTransactions: immutableTransactions,
        suspiciousStatus: suspiciousStatus,
      };

      const newUser: RegisteredUser = {
        id: `usr_${nowTs}`,
        fullName,
        phone: rawPhone,
        passkey,
        passkeyId: newPasskeyItem.id,
        role: 'user',
        tokens: grantedTokens,
        status: 'ACTIVE',
        registeredDate: dateStr,
        createdAtTimestamp: nowTs,
        lastActive: 'Just registered',
        lastActiveTimestamp: nowTs,
        isOnline: false,
        currentService: 'None',
        currentActivity: isEligible ? 'Welcome Token Granted (1)' : 'No Welcome Token (Already Claimed)',
        servicesUsed: [],
      };

      const updatedPasskeys = [newPasskeyItem, ...passkeys];
      const updatedUsers = [newUser, ...users];

      try {
        localStorage.setItem('bigsta_registered_users', JSON.stringify(updatedUsers));
      } catch (e) {}

      try {
        const { syncProfileSupabase, syncPasskeySupabase } = await import('../services/supabase');
        await Promise.all([
          syncProfileSupabase({
            id: newUser.id,
            name: newUser.fullName,
            phone: newUser.phone,
            email: `${newUser.phone.replace(/[^0-9]/g, '')}@bigsta.tz`,
            role: newUser.role,
            tokens: grantedTokens,
            passkey: newUser.passkey,
          }),
          syncPasskeySupabase(newPasskeyItem)
        ]);
      } catch (e) {
        console.warn('Supabase immediate registration sync warning:', e);
      }

      if (grantedTokens > 0) {
        get().addTokenHistoryItem(grantedTokens, `Welcome Token Granted (${fullName})`, newPasskeyItem.id);
      }

      set({ 
        activePasskeys: updatedPasskeys, 
        registeredUsers: updatedUsers,
        rechargeNotice: isEligible ? null : (isDeviceInCooldown ? 'Registration detected on this device within the last 3 days. Admin needs to review this user. Please proceed with service tokens or recharge.' : 'Welcome token has already been claimed for this phone number/device. Please recharge to access services.')
      });

      let message = 'Registration complete! You have received 1 free welcome token.';
      if (!isEligible) {
        if (isDeviceInCooldown) {
          message = 'Registration complete. An administrator needs to review this account due to a recent signup on this device (within 3 days). Please top up service tokens to continue.';
        } else {
          message = 'Registration complete. This phone number has already received a free welcome token previously.';
        }
      }

      return { success: true, message, user: newUser };
    },

    recoverPasskey: async (phone, newPasskey) => {
      const rawPhone = phone.trim().replace(/\s+/g, '');
      const trimmedKey = newPasskey.trim();
      if (!rawPhone || !trimmedKey) {
        return { success: false, message: 'Please enter both your phone number and new passkey.' };
      }
      if (trimmedKey.length < 4) {
        return { success: false, message: 'New passkey must be at least 4 characters long.' };
      }

      try {
        const { recoverPasskeyByPhoneSupabase } = await import('../services/supabase');
        const res = await recoverPasskeyByPhoneSupabase(rawPhone, trimmedKey);
        if (!res.success) {
          return { success: false, message: res.message || 'Recovery failed in backend.' };
        }

        // Also update local store if user exists locally
        const users = get().registeredUsers;
        const passkeys = get().activePasskeys;

        const updatedUsers = users.map((u) =>
          u.phone.replace(/\s+/g, '') === rawPhone ? { ...u, passkey: trimmedKey } : u
        );
        const updatedPasskeys = passkeys.map((p) =>
          p.description?.includes(rawPhone) ? { ...p, key: trimmedKey } : p
        );

        try {
          localStorage.setItem('bigsta_registered_users', JSON.stringify(updatedUsers));
        } catch (e) {}

        set({ registeredUsers: updatedUsers, activePasskeys: updatedPasskeys });
        return { success: true, message: 'Passkey recovered successfully! You can now log in with your new passkey.' };
      } catch (e: any) {
        return { success: false, message: e.message || 'Failed to connect to backend for recovery.' };
      }
    },

    updateUserActivity: (currentService, currentActivity) => {
      const currentAuthKey = get().currentAuthKey;
      if (!currentAuthKey) return;
      const users = get().registeredUsers;
      const match = users.find((u) => u.passkey.toLowerCase() === currentAuthKey.toLowerCase());
      if (!match) return;

      const nowTs = Date.now();
      const srv = currentService || match.currentService || 'BIGsta Portal';
      const act = currentActivity || match.currentActivity || 'Active Session';
      
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
              lastActive: 'Just now',
              lastActiveTimestamp: nowTs,
              isOnline: true,
            }
          : u
      );

      try {
        localStorage.setItem('bigsta_registered_users', JSON.stringify(updatedUsers));
      } catch (e) {}

      set({ registeredUsers: updatedUsers });
    },

    submitPaymentRequest: (packageId, packageName, amount, requestedUsages) => {
      const currentAuthKey = get().currentAuthKey;
      const passkeys = get().activePasskeys;
      const users = get().registeredUsers;

      // Prevent multiple pending requests for the same user/passkey
      const existingPending = get().paymentRequests.find(
        (r) => r.status === 'PENDING' && r.userPasskey.toLowerCase() === (currentAuthKey || '').toLowerCase()
      );
      if (existingPending) {
        return {
          success: false,
          message: 'Your previous payment request is still awaiting Admin approval.',
        };
      }

      const userPasskeyItem = passkeys.find(
        (p) => p.role === 'user' && p.key.toLowerCase() === (currentAuthKey || '').toLowerCase()
      );
      const userRecord = users.find(
        (u) => u.passkey.toLowerCase() === (currentAuthKey || '').toLowerCase()
      );

      const now = new Date();
      const nowTs = now.getTime();
      const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);

      const newRequest: PaymentRequest = {
        id: `pay_${nowTs}`,
        userId: userRecord?.id,
        userName: userRecord?.fullName || userPasskeyItem?.createdBy || 'Registered User',
        userPhone: userRecord?.phone || 'N/A',
        passkeyId: userPasskeyItem?.id || '',
        userPasskey: userPasskeyItem?.key || currentAuthKey || '',
        packageId,
        packageName,
        amount,
        requestedUsages,
        lipaNumber: '1234678',
        date: dateStr,
        timestamp: nowTs,
        status: 'PENDING',
      };

      const updatedRequests = [...get().paymentRequests, newRequest];

      const updatedPasskeys = passkeys.map((p) =>
        p.id === userPasskeyItem?.id
          ? { ...p, paymentStatus: 'PENDING' as PaymentStatus, packageName, packagePrice: amount }
          : p
      );

      try {
        localStorage.setItem('bigsta_payment_requests', JSON.stringify(updatedRequests));
      } catch (e) {}

      // Sync passkey status to Supabase
      const updatedUserPk = updatedPasskeys.find((p) => p.id === userPasskeyItem?.id);
      if (updatedUserPk) {
        import('../services/supabase').then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(updatedUserPk);
        }).catch(() => {});
      }

      set({ paymentRequests: updatedRequests, activePasskeys: updatedPasskeys });

      return {
        success: true,
        message: 'Payment submitted. Please wait for Admin approval.',
        request: newRequest,
      };
    },

    approvePaymentRequest: (requestId) => {
      const requests = get().paymentRequests;
      const targetReq = requests.find((r) => r.id === requestId);
      if (!targetReq || targetReq.status !== 'PENDING') {
        return { success: false, message: 'Payment request not found or already processed.' };
      }

      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);

      const updatedRequests = requests.map((r) =>
        r.id === requestId ? { ...r, status: 'APPROVED' as const, reviewedDate: dateStr } : r
      );

      const passkeys = get().activePasskeys;
      const updatedPasskeys = passkeys.map((p) => {
        if (p.id === targetReq.passkeyId || p.key.toLowerCase() === targetReq.userPasskey.toLowerCase()) {
          const newTotal = (p.totalUsages ?? 0) + targetReq.requestedUsages;
          const newRem = (p.remainingUsages ?? 0) + targetReq.requestedUsages;
          return {
            ...p,
            totalUsages: newTotal,
            remainingUsages: newRem,
            paymentStatus: 'ACTIVE' as PaymentStatus,
            active: true,
            packageName: targetReq.packageName,
            packagePrice: targetReq.amount,
          };
        }
        return p;
      });

      const users = get().registeredUsers;
      const updatedUsers = users.map((u) => {
        if (u.passkey.toLowerCase() === targetReq.userPasskey.toLowerCase() || u.id === targetReq.userId) {
          return { ...u, status: 'ACTIVE' as const };
        }
        return u;
      });

      try {
        localStorage.setItem('bigsta_payment_requests', JSON.stringify(updatedRequests));
        localStorage.setItem('bigsta_registered_users', JSON.stringify(updatedUsers));
      } catch (e) {}

      // Sync approved passkey to Supabase
      const approvedPk = updatedPasskeys.find((p) => p.id === targetReq.passkeyId || p.key.toLowerCase() === targetReq.userPasskey.toLowerCase());
      if (approvedPk) {
        get().showSuccessActivation(`Congratulations! Your ${targetReq.packageName} has been activated successfully.`);
        import('../services/supabase').then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(approvedPk);
        }).catch(() => {});
      }

      set({
        paymentRequests: updatedRequests,
        activePasskeys: updatedPasskeys,
        registeredUsers: updatedUsers,
      });

      return { success: true, message: 'Payment request approved successfully. Usages activated!' };
    },

    rejectPaymentRequest: (requestId) => {
      const requests = get().paymentRequests;
      const targetReq = requests.find((r) => r.id === requestId);
      if (!targetReq) {
        return { success: false, message: 'Payment request not found.' };
      }

      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);

      const updatedRequests = requests.map((r) =>
        r.id === requestId ? { ...r, status: 'REJECTED' as const, reviewedDate: dateStr } : r
      );

      const passkeys = get().activePasskeys;
      const updatedPasskeys = passkeys.map((p) => {
        if (p.id === targetReq.passkeyId || p.key.toLowerCase() === targetReq.userPasskey.toLowerCase()) {
          const rem = p.remainingUsages ?? 0;
          return {
            ...p,
            paymentStatus: rem > 0 ? ('ACTIVE' as PaymentStatus) : ('EXHAUSTED' as PaymentStatus),
          };
        }
        return p;
      });

      try {
        localStorage.setItem('bigsta_payment_requests', JSON.stringify(updatedRequests));
      } catch (e) {}

      // Sync rejected passkey to Supabase
      const rejectedPk = updatedPasskeys.find((p) => p.id === targetReq.passkeyId || p.key.toLowerCase() === targetReq.userPasskey.toLowerCase());
      if (rejectedPk) {
        import('../services/supabase').then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(rejectedPk);
        }).catch(() => {});
      }

      set({ paymentRequests: updatedRequests, activePasskeys: updatedPasskeys });

      return { success: true, message: 'Payment request rejected.' };
    },

    cancelPaymentRequest: (requestId) => {
      const currentAuthKey = get().currentAuthKey;
      const requests = get().paymentRequests;
      
      const targetReq = requestId
        ? requests.find((r) => r.id === requestId)
        : requests.find((r) => r.status === 'PENDING' && r.userPasskey.toLowerCase() === (currentAuthKey || '').toLowerCase());

      if (!targetReq) {
        return { success: false, message: 'No active pending payment request found to cancel.' };
      }

      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);

      const updatedRequests = requests.map((r) =>
        r.id === targetReq.id ? { ...r, status: 'CANCELLED' as const, reviewedDate: dateStr, adminNotes: 'Cancelled by user' } : r
      );

      const passkeys = get().activePasskeys;
      const updatedPasskeys = passkeys.map((p) => {
        if (p.id === targetReq.passkeyId || p.key.toLowerCase() === targetReq.userPasskey.toLowerCase()) {
          const rem = p.remainingUsages ?? 0;
          return {
            ...p,
            paymentStatus: rem > 0 ? ('ACTIVE' as PaymentStatus) : ('EXHAUSTED' as PaymentStatus),
          };
        }
        return p;
      });

      try {
        localStorage.setItem('bigsta_payment_requests', JSON.stringify(updatedRequests));
        localStorage.setItem('bigsta_active_passkeys', JSON.stringify(updatedPasskeys));
      } catch (e) {}

      // Sync passkey status to Supabase
      const affectedPk = updatedPasskeys.find((p) => p.id === targetReq.passkeyId || p.key.toLowerCase() === targetReq.userPasskey.toLowerCase());
      if (affectedPk) {
        import('../services/supabase').then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(affectedPk);
        }).catch(() => {});
      }

      set({ paymentRequests: updatedRequests, activePasskeys: updatedPasskeys });
      return { success: true, message: 'Token request cancelled successfully.' };
    },

    updateUserPaymentRequest: (requestId, packageId, packageName, amount, requestedUsages) => {
      const requests = get().paymentRequests;
      const targetReq = requests.find((r) => r.id === requestId);
      if (!targetReq) {
        return { success: false, message: 'Payment request not found.' };
      }

      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);

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
          : r
      );

      const passkeys = get().activePasskeys;
      const updatedPasskeys = passkeys.map((p) => {
        if (p.id === targetReq.passkeyId || p.key.toLowerCase() === targetReq.userPasskey.toLowerCase()) {
          return {
            ...p,
            packageName: `${packageName} (${amount})`,
            packagePrice: amount,
            paymentStatus: 'PENDING' as PaymentStatus,
          };
        }
        return p;
      });

      try {
        localStorage.setItem('bigsta_payment_requests', JSON.stringify(updatedRequests));
        localStorage.setItem('bigsta_active_passkeys', JSON.stringify(updatedPasskeys));
      } catch (e) {}

      const affectedPk = updatedPasskeys.find((p) => p.id === targetReq.passkeyId || p.key.toLowerCase() === targetReq.userPasskey.toLowerCase());
      if (affectedPk) {
        import('../services/supabase').then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(affectedPk);
        }).catch(() => {});
      }

      set({ paymentRequests: updatedRequests, activePasskeys: updatedPasskeys });
      return { success: true, message: `Token request updated to ${packageName} (${amount}) successfully!` };
    },

    updatePaymentRequest: (requestId, updates) => {
      const { paymentRequests } = get();
      const updated = paymentRequests.map(r => 
        r.id === requestId ? { ...r, ...updates } : r
      );
      try {
        localStorage.setItem('bigsta_payment_requests', JSON.stringify(updated));
      } catch (e) {}
      set({ paymentRequests: updated });
      return { success: true, message: 'Payment record updated successfully' };
    },

    reactivatePaymentRequest: (requestId) => {
      const { paymentRequests } = get();
      const target = paymentRequests.find(r => r.id === requestId);
      if (!target) return { success: false, message: 'Request not found' };

      const updated = paymentRequests.map(r => 
        r.id === requestId ? { ...r, status: 'PENDING' as const } : r
      );
      try {
        localStorage.setItem('bigsta_payment_requests', JSON.stringify(updated));
      } catch (e) {}
      set({ paymentRequests: updated });
      return { success: true, message: 'Payment reactivated to PENDING' };
    },

    submitManualRequest: (data) => {
      const currentAuthKey = get().currentAuthKey;
      const passkeys = get().activePasskeys;
      const users = get().registeredUsers;

      const userPasskeyItem = passkeys.find(
        (p) => p.key.toLowerCase() === (currentAuthKey || '').toLowerCase()
      );
      const userRecord = users.find(
        (u) => u.passkey.toLowerCase() === (currentAuthKey || '').toLowerCase()
      );

      const now = new Date();
      const nowTs = now.getTime();
      const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);

      const normalNum = data.normalNumber || data.normalCallNumber || '';

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
        accountKey: userPasskeyItem?.key || currentAuthKey || 'Guest',
        accountUser: userRecord?.fullName || userPasskeyItem?.createdBy || 'System User',
        userPasskey: userPasskeyItem?.key || currentAuthKey || 'Guest',
        status: 'PENDING',
      };

      // Filter out any older request for the same service from this user/device
      const filteredOld = get().manualRequests.filter(
        (r) => !(r.serviceId === data.serviceId && (r.userPasskey === currentAuthKey || r.accountKey === currentAuthKey || !currentAuthKey))
      );
      const updatedRequests = [newRequest, ...filteredOld];
      try {
        localStorage.setItem('bigsta_manual_requests', JSON.stringify(updatedRequests));
      } catch (e) {}

      // Sync to Supabase in background
      import('../services/supabase').then(({ syncManualRequestSupabase }) => {
        syncManualRequestSupabase(newRequest);
      }).catch((e) => console.warn('Supabase manual request sync skipped:', e));

      set({ manualRequests: updatedRequests });
      return { success: true, message: 'Manual application request submitted successfully!', request: newRequest };
    },

    updateManualRequestStatus: (requestId, status, adminNotes) => {
      const updated = get().manualRequests.map((r) =>
        r.id === requestId ? { ...r, status, ...(adminNotes !== undefined ? { adminNotes } : {}) } : r
      );
      try {
        localStorage.setItem('bigsta_manual_requests', JSON.stringify(updated));
      } catch (e) {}

      const updatedItem = updated.find((r) => r.id === requestId);
      if (updatedItem) {
        import('../services/supabase').then(({ syncManualRequestSupabase }) => {
          syncManualRequestSupabase(updatedItem);
        }).catch((e) => console.warn('Supabase manual request status sync skipped:', e));
      }

      set({ manualRequests: updated });
      return { success: true, message: `Request status updated to ${status}` };
    },

    deleteManualRequest: (requestId) => {
      const updated = get().manualRequests.filter((r) => r.id !== requestId);
      try {
        localStorage.setItem('bigsta_manual_requests', JSON.stringify(updated));
      } catch (e) {}

      import('../services/supabase').then(({ supabase }) => {
        if (supabase) {
          supabase.from('manual_requests').delete().eq('id', requestId).then(() => {});
        }
      }).catch((e) => console.warn('Supabase manual request delete skipped:', e));

      set({ manualRequests: updated });
      return { success: true, message: 'Request deleted successfully' };
    },

    toggleUserStatus: (userId) => {
      const users = get().registeredUsers;
      const targetUser = users.find((u) => u.id === userId);
      if (!targetUser) return;

      const newStatus = targetUser.status === 'ACTIVE' ? ('DISABLED' as const) : ('ACTIVE' as const);
      const updatedUsers = users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u));

      const passkeys = get().activePasskeys;
      const updatedPasskeys = passkeys.map((p) => {
        if (p.id === targetUser.passkeyId || p.key.toLowerCase() === targetUser.passkey.toLowerCase()) {
          const newActive = newStatus === 'ACTIVE';
          return {
            ...p,
            active: newActive,
            paymentStatus: newActive ? ('ACTIVE' as PaymentStatus) : ('DISABLED' as PaymentStatus),
          };
        }
        return p;
      });

      try {
        localStorage.setItem('bigsta_registered_users', JSON.stringify(updatedUsers));
        localStorage.removeItem('bigsta_passkeys');
      } catch (e) {}

      const targetPk = updatedPasskeys.find((p) => p.id === targetUser.passkeyId || p.key.toLowerCase() === targetUser.passkey.toLowerCase());
      if (targetPk) {
        import('../services/supabase').then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(targetPk);
        }).catch(() => {});
      }

      set({ registeredUsers: updatedUsers, activePasskeys: updatedPasskeys });
    },

    deleteRegisteredUser: (userId) => {
      const targetUser = get().registeredUsers.find((u) => u.id === userId);
      const updatedUsers = get().registeredUsers.filter((u) => u.id !== userId);

      let updatedPasskeys = get().activePasskeys;
      if (targetUser) {
        updatedPasskeys = updatedPasskeys.filter(
          (p) => p.id !== targetUser.passkeyId && p.key.toLowerCase() !== targetUser.passkey.toLowerCase()
        );
      }

      try {
        localStorage.setItem('bigsta_registered_users', JSON.stringify(updatedUsers));
        localStorage.removeItem('bigsta_passkeys');
      } catch (e) {}

      if (targetUser) {
        import('../services/supabase').then(({ deletePasskeySupabase }) => {
          deletePasskeySupabase(targetUser.passkeyId, targetUser.passkey);
        }).catch(() => {});
      }

      set({ registeredUsers: updatedUsers, activePasskeys: updatedPasskeys });
    },

    refreshUserStatus: () => {
      try {
        const rawReqs = localStorage.getItem('bigsta_payment_requests');
        const rawUsers = localStorage.getItem('bigsta_registered_users');

        let updatedReqs = get().paymentRequests;
        let updatedUsers = get().registeredUsers;

        if (rawReqs) updatedReqs = JSON.parse(rawReqs);
        if (rawUsers) updatedUsers = JSON.parse(rawUsers);

        // Ensure passkeys are never cached in phone storage
        localStorage.removeItem('bigsta_passkeys');

        set({
          paymentRequests: updatedReqs,
          registeredUsers: updatedUsers,
        });
      } catch (e) {}
    },

    fetchPasskeysFromSupabase: async () => {
      set({ loadingPasskeys: true });
      try {
        const { 
          fetchPasskeysSupabase, 
          fetchAllProfilesSupabase, 
          fetchPaymentMethodsSupabase, 
          fetchAdminSettingsSupabase 
        } = await import('../services/supabase');

        // Parallel fetch for speed
        const [supabasePasskeys, supabaseProfiles, dbPaymentMethods, dbAdminSettings] = await Promise.all([
          fetchPasskeysSupabase().catch(() => []),
          fetchAllProfilesSupabase().catch(() => []),
          fetchPaymentMethodsSupabase().catch(() => []),
          fetchAdminSettingsSupabase().catch(() => null)
        ]);

        // 1. Fetch Passkeys
        if (supabasePasskeys && supabasePasskeys.length > 0) {
          const currentLocal = get().activePasskeys;
          const merged = [...currentLocal];
          supabasePasskeys.forEach((sp) => {
            const idx = merged.findIndex((m) => m.key.toLowerCase() === sp.key.toLowerCase());
            if (idx === -1) {
              merged.push(sp);
            } else {
              merged[idx] = { ...merged[idx], ...sp };
            }
          });
          set({ activePasskeys: merged });
        }

        // 2. Fetch Profiles (Registered Users)
        if (supabaseProfiles && supabaseProfiles.length > 0) {
          const currentLocalUsers = get().registeredUsers;
          const mergedUsers = [...currentLocalUsers];
          
          supabaseProfiles.forEach((p) => {
            const mappedUser: RegisteredUser = {
              id: p.id,
              fullName: p.name || p.fullName || 'Anonymous User',
              phone: p.phone || '',
              passkey: p.passkey || '',
              passkeyId: p.passkeyId || p.passkey_id || p.id,
              role: (p.role || 'user') as 'user',
              tokens: typeof p.tokens === 'number' ? p.tokens : 0,
              status: (p.status || 'ACTIVE') as 'ACTIVE' | 'DISABLED' | 'PENDING',
              registeredDate: p.created_at && !isNaN(new Date(p.created_at).getTime()) 
                ? new Date(p.created_at).toISOString().replace('T', ' ').substring(0, 16) 
                : new Date().toISOString().replace('T', ' ').substring(0, 16),
              createdAtTimestamp: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
              lastActive: p.last_active || 'Recent activity',
              lastActiveTimestamp: p.last_active_timestamp || Date.now(),
              isOnline: p.is_online || false,
              currentService: p.current_service || 'None',
              currentActivity: p.current_activity || 'Active',
              servicesUsed: p.services_used || [],
            };

            const idx = mergedUsers.findIndex((u) => u.id === p.id || u.phone === p.phone);
            if (idx === -1) {
              mergedUsers.push(mappedUser);
            } else {
              mergedUsers[idx] = { ...mergedUsers[idx], ...mappedUser };
            }
          });
          
          set({ registeredUsers: mergedUsers });
          try {
            localStorage.setItem('bigsta_registered_users', JSON.stringify(mergedUsers));
          } catch (e) {}
        }

        // 3. Fetch Payment Methods
        if (dbPaymentMethods && dbPaymentMethods.length > 0) {
          set({ paymentMethods: dbPaymentMethods });
          try {
            localStorage.setItem('bigsta_payment_methods', JSON.stringify(dbPaymentMethods));
          } catch (e) {}
        }

        // 4. Fetch Admin Settings
        if (dbAdminSettings) {
          const currentSettings = get().adminSettings;
          set({ adminSettings: { ...currentSettings, ...dbAdminSettings } });
          try {
            localStorage.setItem('bigsta_admin_system_settings', JSON.stringify({ ...currentSettings, ...dbAdminSettings }));
          } catch (e) {}
        }

        if (typeof window !== 'undefined') {
          localStorage.removeItem('bigsta_passkeys');
        }
      } catch (e) {
        console.warn('Failed to fetch passkeys and profiles from Supabase:', e);
      } finally {
        set({ loadingPasskeys: false });
      }
    },

    loginWithPasskey: async (inputKey) => {
      const trimmed = inputKey.trim();
      if (!trimmed) {
        return { success: false, message: 'Please enter a valid passkey.' };
      }

      let match: PasskeyItem | null = null;

      // 1. Query Supabase canonical passkeys table / profiles table
      try {
        const { fetchPasskeyByKeySupabase } = await import('../services/supabase');
        const supabaseMatch = await fetchPasskeyByKeySupabase(trimmed);
        if (supabaseMatch) {
          match = supabaseMatch;
        }
      } catch (e) {
        console.warn('Supabase passkey lookup error:', e);
      }

      // 2. Fallback to in-memory activePasskeys state if backend call returned null (e.g. freshly created admin/user passkey pending sync)
      if (!match) {
        const list = get().activePasskeys;
        const localMatch = list.find((p) => p.key.toLowerCase() === trimmed.toLowerCase());
        if (localMatch) {
          match = localMatch;
          // Auto-sync to Supabase in background
          import('../services/supabase').then(({ syncPasskeySupabase }) => {
            syncPasskeySupabase(localMatch);
          }).catch(() => {});
        }
      }

      // 3. Super Admin Root Passkey override guarantee (BIGSTA-ADM-ROOT or BIGSTA-ADM-*)
      if (!match && (trimmed.toUpperCase() === 'BIGSTA-ADM-ROOT' || trimmed.toUpperCase().startsWith('BIGSTA-ADM-'))) {
        match = {
          id: `pk_admin_root_${Date.now()}`,
          key: trimmed,
          role: 'admin',
          active: true,
          createdDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
          createdAtTimestamp: Date.now(),
          createdBy: 'Super Administrator',
          description: 'Master Super Admin Root Passkey',
          totalUsages: 99999,
          usedUsages: 0,
          remainingUsages: 99999,
          paymentStatus: 'ACTIVE',
          packageName: 'Unlimited Super Admin',
          packagePrice: 'Free',
          usageHistory: [],
        };
        // Auto-sync root admin to Supabase
        import('../services/supabase').then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(match!);
        }).catch(() => {});
      }

      if (!match) {
        return { success: false, message: 'Invalid Passkey or account does not exist.' };
      }

      if (!match.active || match.paymentStatus === 'DISABLED') {
        return { success: false, message: 'Passkey is Disabled or account deleted. Please contact Administrator.' };
      }

      const now = new Date();
      const lastUsedStr = now.toISOString().replace('T', ' ').substring(0, 16);

      // Store session role & key convenience only in localStorage (authentication authority is Supabase / activePasskeys)
      try {
        localStorage.removeItem('bigsta_passkeys');
        localStorage.setItem('bigsta_auth_role', match.role);
        localStorage.setItem('bigsta_auth_key', match.key);
      } catch (e) {}

      const currentList = get().activePasskeys;
      const exists = currentList.some((p) => p.id === match!.id || p.key.toLowerCase() === match!.key.toLowerCase());
      const updatedList = exists
        ? currentList.map((p) =>
            p.id === match!.id || p.key.toLowerCase() === match!.key.toLowerCase()
              ? { ...p, ...match, lastUsed: lastUsedStr }
              : p
          )
        : [{ ...match, lastUsed: lastUsedStr }, ...currentList];

      set({
        authRole: match.role,
        currentAuthKey: match.key,
        activeScreen: match.role === 'admin' ? 'home' : 'nida',
        activePasskeys: updatedList,
      });

      // Sync lastUsed to Supabase backend
      try {
        const { syncPasskeySupabase } = await import('../services/supabase');
        await syncPasskeySupabase({ ...match, lastUsed: lastUsedStr });
      } catch (e) {}

      return { success: true, role: match.role };
    },

    logoutPasskey: () => {
      try {
        localStorage.removeItem('bigsta_auth_role');
        localStorage.removeItem('bigsta_auth_key');
      } catch (e) {}
      set({ authRole: null, currentAuthKey: null, activeScreen: 'home' });
    },

    addPasskey: (item) => {
      const now = new Date();
      const role = item.role || 'user';
      const totalUsages = item.totalUsages !== undefined ? item.totalUsages : (role === 'admin' ? 99999 : 1);
      const usedUsages = item.usedUsages || 0;
      const remainingUsages = Math.max(0, totalUsages - usedUsages);
      const paymentStatus: PaymentStatus = item.paymentStatus || (role === 'admin' ? 'ACTIVE' : 'PENDING');

      const newItem: PasskeyItem = {
        id: `pk_${Date.now()}`,
        key: item.key,
        role,
        active: paymentStatus !== 'DISABLED',
        createdDate: now.toISOString().replace('T', ' ').substring(0, 16),
        createdAtTimestamp: now.getTime(),
        createdBy: item.createdBy || 'Admin',
        description: item.description || (role === 'admin' ? 'Admin Passkey' : 'Custom User Passkey'),
        totalUsages,
        usedUsages,
        remainingUsages,
        paymentStatus,
        packageName: item.packageName || (role === 'admin' ? 'Unlimited Admin' : `${totalUsages} Usages Package`),
        packagePrice: item.packagePrice || (role === 'admin' ? 'Free' : 'Custom'),
        usageHistory: [],
      };
      const updated = [newItem, ...get().activePasskeys];
      try {
        localStorage.removeItem('bigsta_passkeys');
      } catch (e) {}
      set({ activePasskeys: updated });

      try {
        import('../services/supabase').then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(newItem);
        });
      } catch (e) {}

      return newItem;
    },

    generateUserPasskey: (description, usages = 1, options) => {
      const numUsages = typeof usages === 'number' ? usages : 1;
      const isAutoActive = options?.paymentStatus === 'ACTIVE';
      const packageName = options?.packageName || `${numUsages} Usages Package`;
      const priceStr = options?.packagePrice ? String(options.packagePrice) : (numUsages === 1 ? 'Free' : numUsages === 2 ? 'TSh 15,000' : 'TSh 25,000');
      
      return get().generateUserPasskeyWithPackage(packageName, numUsages, priceStr, isAutoActive, description);
    },

    generateUserPasskeyWithPackage: (packageName, usages, price, isAutoActive = false, description) => {
      const randNum = Math.floor(10000 + Math.random() * 90000);
      const generatedKey = `BIGSTA-USR-${randNum}`;
      const now = new Date();
      const paymentStatus: PaymentStatus = isAutoActive ? 'ACTIVE' : 'PENDING';

      const newItem: PasskeyItem = {
        id: `pk_${Date.now()}`,
        key: generatedKey,
        role: 'user',
        active: true,
        createdDate: now.toISOString().replace('T', ' ').substring(0, 16),
        createdAtTimestamp: now.getTime(),
        createdBy: 'Admin',
        description: description || `User Passkey (${packageName})`,
        totalUsages: usages,
        usedUsages: 0,
        remainingUsages: usages,
        paymentStatus,
        packageName,
        packagePrice: price,
        usageHistory: [],
      };
      get().addTokenHistoryItem(usages, `Passkey Issued: ${packageName} (${generatedKey})`, newItem.id);
      const updated = [newItem, ...get().activePasskeys];
      try {
        localStorage.removeItem('bigsta_passkeys');
      } catch (e) {}
      set({ activePasskeys: updated });

      try {
        import('../services/supabase').then(({ syncPasskeySupabase }) => {
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
        role: 'admin',
        active: true,
        createdDate: now.toISOString().replace('T', ' ').substring(0, 16),
        createdAtTimestamp: now.getTime(),
        createdBy: 'Admin',
        description: description || 'Generated Admin Passkey',
        totalUsages: 99999,
        usedUsages: 0,
        remainingUsages: 99999,
        paymentStatus: 'ACTIVE',
        packageName: 'Unlimited Admin',
        packagePrice: 'Free',
        usageHistory: [],
      };
      const updated = [newItem, ...get().activePasskeys];
      try {
        localStorage.removeItem('bigsta_passkeys');
      } catch (e) {}
      set({ activePasskeys: updated });

      try {
        import('../services/supabase').then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(newItem);
        });
      } catch (e) {}

      return newItem;
    },

    consumeUsage: (serviceName = 'NIDA Service Completion', details, tokenCost) => {
      const authKey = get().currentAuthKey || (typeof window !== 'undefined' ? localStorage.getItem('bigsta_auth_key') : null);
      const role = get().authRole;

      if (role === 'admin') {
        return { success: true, remainingUsages: 99999 };
      }

      const list = get().activePasskeys;
      const match = list.find((p) => p.key.toLowerCase() === (authKey || '').toLowerCase());

      if (!match) {
        return { success: false, remainingUsages: 0, message: 'No valid active passkey session.' };
      }

      if (!match.active || match.paymentStatus === 'DISABLED') {
        return { success: false, remainingUsages: 0, message: 'Passkey has been disabled.' };
      }

      let cost = typeof tokenCost === 'number' ? tokenCost : 1;
      if (typeof tokenCost !== 'number' && get().currentTemplate) {
        const activeTpl = get().currentTemplate;
        const name = (activeTpl?.templateName || '').toLowerCase();
        const cardType = (activeTpl?.cardType || '').toLowerCase();

        if (
          cardType === 'driving license' ||
          name.includes('driving') ||
          name.includes('driver') ||
          name.includes('license') ||
          name.includes('licence') ||
          name.includes('permit')
        ) {
          const service = get().services.find((s) => s.id === 'driving_license');
          cost = service ? (service.tokenCost ?? 1) : 1;
        } else {
          const service = get().services.find((s) => s.id === 'nida');
          cost = service ? (service.tokenCost ?? 1) : 1;
        }
      }

      const currentRemaining = match.remainingUsages ?? 0;

      // Only block pending payments if the user does NOT have enough remaining usages
      if (match.paymentStatus === 'PENDING' && currentRemaining < cost) {
        return { success: false, remainingUsages: currentRemaining, message: 'Payment pending confirmation by Administrator.' };
      }

      if (currentRemaining < cost || match.paymentStatus === 'EXHAUSTED') {
        return {
          success: false,
          remainingUsages: currentRemaining,
          message: `Insufficient tokens. This service requires ${cost} tokens, but you only have ${currentRemaining} tokens.`,
        };
      }

      const newUsed = (match.usedUsages ?? 0) + cost;
      const newRemaining = Math.max(0, (match.totalUsages ?? 1) - newUsed);
      // Keep PENDING status if it was already pending and they still have remaining usages
      const newPaymentStatus: PaymentStatus = newRemaining === 0 ? 'EXHAUSTED' : (match.paymentStatus === 'PENDING' ? 'PENDING' : 'ACTIVE');

      const historyItem: PasskeyUsageHistoryItem = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
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
        localStorage.removeItem('bigsta_passkeys');
      } catch (e) {}

      set({ activePasskeys: updatedList });

      try {
        import('../services/supabase').then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(updatedItem);
        });
      } catch (e) {}

      get().addTokenHistoryItem(-cost, details ? `${serviceName} (${details})` : serviceName, match.id);

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
            paymentStatus: remaining > 0 ? ('ACTIVE' as PaymentStatus) : ('EXHAUSTED' as PaymentStatus),
          };
          return targetPk;
        }
        return p;
      });
      try {
        localStorage.removeItem('bigsta_passkeys');
      } catch (e) {}
      set({ activePasskeys: updated });

      if (targetPk) {
        import('../services/supabase').then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(targetPk!);
        });
      }
    },

    addUsagesToPasskey: (id: string, additionalUsages: number, newPackageName?: string, historyReason?: string) => {
      const list = get().activePasskeys;
      const resolvedId = list.find((p) => p.id === id)?.id ?? list.find((p) => p.key === id)?.id;
      let targetPk: PasskeyItem | null = null;
      const updated = list.map((p) => {
        if (p.id === resolvedId) {
          const newTotal = (p.totalUsages ?? 0) + additionalUsages;
          const newRemaining = Math.max(0, newTotal - (p.usedUsages ?? 0));
          const newPaymentStatus: PaymentStatus = newRemaining > 0 ? 'ACTIVE' : 'EXHAUSTED';
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
        localStorage.removeItem('bigsta_passkeys');
      } catch (e) {}
      set({ activePasskeys: updated });

      if (targetPk) {
        const pk: PasskeyItem = targetPk;
        import('../services/supabase').then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(pk);
        });

        const fallbackReason = additionalUsages > 0
          ? `Tokens Added to Passkey (${pk.key})`
          : `Tokens Removed from Passkey (${pk.key})`;
        get().addTokenHistoryItem(additionalUsages, historyReason || newPackageName || fallbackReason, pk.id);
      }
    },

    // =========================================================================
    // CENTRAL AUTHORIZATION & VALIDATION GATE
    // =========================================================================

    validateServiceAccess: (serviceId?: string): ServiceValidationResult => {
      const { authRole, currentAuthKey, activePasskeys, services, activeServiceId } = get();
      const targetServiceId = serviceId || activeServiceId || 'nida';

      console.log('[SERVICE VALIDATION DEBUG] Validating service access:', {
        targetServiceId,
        authRole,
        currentAuthKey,
      });

      // 1. Admin Override: Admins always bypass payment/usage checks
      if (authRole === 'admin') {
        return { allowed: true, remainingUsages: 99999, cost: 0 };
      }

      // 2. User Logged In Check
      if (!authRole || !currentAuthKey) {
        return {
          allowed: false,
          reason: 'NOT_LOGGED_IN',
          message: 'Please log in with a valid Passkey first.',
        };
      }

      // 3. Passkey Check
      const currentPasskey = activePasskeys.find(
        (p) => p.key.toLowerCase() === currentAuthKey.toLowerCase()
      );

      if (!currentPasskey || !currentPasskey.active || currentPasskey.paymentStatus === 'DISABLED') {
        const msg = 'Passkey is disabled or invalid. Please contact Administrator.';
        get().setRechargeModalOpen(true, msg);
        return {
          allowed: false,
          reason: 'DISABLED',
          message: msg,
        };
      }

      const service = services.find((s) => s.id === targetServiceId);
      const cost = service ? (service.tokenCost ?? 1) : 1;
      const remaining = currentPasskey.remainingUsages ?? 0;
      const pStatus = currentPasskey.paymentStatus;

      console.log('[SERVICE VALIDATION DEBUG] Passkey status:', {
        key: currentPasskey.key,
        paymentStatus: pStatus,
        remainingUsages: remaining,
        cost,
      });

      // 3b. 1-Week Offer Token Expiry Verification
      const isTrialOfferPackage = !currentPasskey.packageName ||
        currentPasskey.packageName.toLowerCase().includes('welcome') ||
        currentPasskey.packageName.toLowerCase().includes('offer') ||
        currentPasskey.packageName.toLowerCase().includes('trial');

      const passkeyCreationTime = currentPasskey.createdAtTimestamp ||
        (currentPasskey.createdDate ? new Date(currentPasskey.createdDate).getTime() : 0);
      const isOfferWeekOver = passkeyCreationTime > 0 && (Date.now() - passkeyCreationTime > 7 * 24 * 60 * 60 * 1000);

      if (isTrialOfferPackage && isOfferWeekOver) {
        const msg = 'Offer Concluded: Your 1-week offer token period has concluded. To continue using services, please select an active Basic or Premium package from the Super Admin panel.';
        get().setRechargeModalOpen(true, msg);
        return {
          allowed: false,
          reason: 'PAYMENT_REQUIRED',
          message: msg,
          paymentStatus: pStatus,
          remainingUsages: remaining,
          cost,
        };
      }

      // 4. Payment Approval Check
      if (pStatus === 'PENDING' && remaining < cost) {
        const msg = 'Access Required: This service requires an approved token package.';
        get().setRechargeModalOpen(true, msg);
        return {
          allowed: false,
          reason: 'PAYMENT_REQUIRED',
          message: msg,
          paymentStatus: pStatus,
          remainingUsages: remaining,
          cost,
        };
      }

      if ((pStatus as string) === 'REJECTED') {
        const msg = 'Payment Rejected: Your previous payment request was rejected. Please submit a new package order.';
        get().setRechargeModalOpen(true, msg);
        return {
          allowed: false,
          reason: 'PAYMENT_REQUIRED',
          message: msg,
          paymentStatus: pStatus,
          remainingUsages: remaining,
          cost,
        };
      }

      // 5. Available Tokens / Usages Check
      if (remaining < cost || (pStatus === 'EXHAUSTED' && remaining <= 0) || remaining <= 0) {
        const msg = `Out Of Tokens: You have ${remaining} remaining usages (required: ${cost}). Please recharge now.`;
        get().setRechargeModalOpen(true, msg);
        return {
          allowed: false,
          reason: 'OUT_OF_TOKENS',
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

    validateExportAccess: (actionType = 'export'): ServiceValidationResult => {
      const { authRole, currentTemplate, frontPopulatedTemplate, backPopulatedTemplate, activeServiceId } = get();

      console.log('[EXPORT DEBUG] Payment Check:', {
        authRole,
        currentAuthKey: get().currentAuthKey,
        activeServiceId,
      });

      // 1. Run service validation
      const serviceVal = get().validateServiceAccess(activeServiceId || undefined);
      console.log('[EXPORT DEBUG] Token Check & Usage Check:', serviceVal);

      if (!serviceVal.allowed) {
        return serviceVal;
      }

      // 2. Check Card Data Exists
      const hasCardData = Boolean(currentTemplate || frontPopulatedTemplate || backPopulatedTemplate);
      console.log('[EXPORT DEBUG] Export Creation:', {
        actionType,
        hasCardData,
        currentTemplateId: currentTemplate?.id,
      });

      if (!hasCardData) {
        return {
          allowed: false,
          reason: 'NO_CARD_DATA',
          message: 'No generated card or template data found to export.',
        };
      }

      return {
        allowed: true,
        cost: serviceVal.cost,
        remainingUsages: serviceVal.remainingUsages,
      };
    },

    checkAuthorization: () => {
      const res = get().validateExportAccess('check_auth');
      return res.allowed;
    },

    executeProtectedAction: (actionCallback: () => void) => {
      const val = get().validateExportAccess('execute_protected_action');
      if (val.allowed) {
        actionCallback();
      }
    },

    resetAdminPasskey: (currentKey, newKey) => {
      const list = get().activePasskeys;
      const trimmedCurrent = currentKey.trim();
      const trimmedNew = newKey.trim();

      if (!trimmedNew) {
        return { success: false, message: 'New passkey cannot be empty' };
      }

      // Verify current admin key match
      const currentAdminMatch = list.find(
        (p) => p.role === 'admin' && p.key.toLowerCase() === trimmedCurrent.toLowerCase() && p.active
      );

      // Check stored key in localStorage or logged-in state
      const storedKey = typeof window !== 'undefined' ? localStorage.getItem('bigsta_auth_key') : null;
      const isValidCurrent = currentAdminMatch || (storedKey && storedKey.toLowerCase() === trimmedCurrent.toLowerCase());

      if (!isValidCurrent) {
        return { success: false, message: 'Current Admin Passkey is incorrect' };
      }

      // Check if new passkey already exists
      if (list.some((p) => p.key.toLowerCase() === trimmedNew.toLowerCase())) {
        return { success: false, message: 'This passkey already exists' };
      }

      const now = new Date();
      // Replace existing match or update admin passkey
      let updated: PasskeyItem[];
      if (currentAdminMatch) {
        updated = list.map((p) =>
          p.id === currentAdminMatch.id
            ? { ...p, key: trimmedNew, createdDate: now.toISOString().replace('T', ' ').substring(0, 16), createdAtTimestamp: now.getTime() }
            : p
        );
      } else {
        const newAdminItem: PasskeyItem = {
          id: `pk_${Date.now()}`,
          key: trimmedNew,
          role: 'admin',
          active: true,
          createdDate: now.toISOString().replace('T', ' ').substring(0, 16),
          createdAtTimestamp: now.getTime(),
          createdBy: 'Admin',
          description: 'Updated Admin Passkey',
          totalUsages: 99999,
          usedUsages: 0,
          remainingUsages: 99999,
          paymentStatus: 'ACTIVE',
          packageName: 'Unlimited Admin',
          packagePrice: 'Free',
          usageHistory: [],
        };
        updated = [newAdminItem, ...list];
      }

      try {
        localStorage.removeItem('bigsta_passkeys');
        localStorage.setItem('bigsta_auth_key', trimmedNew);
      } catch (e) {}

      const adminPk = updated.find((p) => p.key === trimmedNew);
      if (adminPk) {
        import('../services/supabase').then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(adminPk);
        }).catch(() => {});
      }

      set({ activePasskeys: updated });
      return { success: true, message: 'Admin Passkey Updated Successfully' };
    },

    togglePasskeyStatus: (id) => {
      let toggledPk: PasskeyItem | null = null;
      const updated = get().activePasskeys.map((p) => {
        if (p.id === id) {
          toggledPk = { ...p, active: !p.active, paymentStatus: !p.active ? ('ACTIVE' as PaymentStatus) : ('DISABLED' as PaymentStatus) };
          return toggledPk;
        }
        return p;
      });
      try {
        localStorage.removeItem('bigsta_passkeys');
      } catch (e) {}
      set({ activePasskeys: updated });

      if (toggledPk) {
        import('../services/supabase').then(({ syncPasskeySupabase }) => {
          syncPasskeySupabase(toggledPk!);
        });
      }
    },

    deletePasskey: (id) => {
      const targetPk = get().activePasskeys.find((p) => p.id === id);
      const updated = get().activePasskeys.filter((p) => p.id !== id);
      try {
        localStorage.removeItem('bigsta_passkeys');
      } catch (e) {}
      set({ activePasskeys: updated });

      if (targetPk) {
        import('../services/supabase').then(({ deletePasskeySupabase }) => {
          deletePasskeySupabase(targetPk.id, targetPk.key);
        });
      }
    },

    // NIDA Template Selections & Universal Defaults
    selectedFrontTemplateId: savedSelectedFrontId,
    selectedBackTemplateId: savedSelectedBackId,
    defaultNidaFrontTemplateId: savedDefaultFrontId,
    defaultNidaBackTemplateId: savedDefaultBackId,

    activeUnit: 'mm',
    selectedLayerIds: [],
    zoom: 1.0,
    panOffset: { x: 0, y: 0 },

  gridSettings: {
    enabled: false,
    sizeMm: 5,
    color: '#cbd5e1',
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

  nidaSuccessNotification: null,
  setNidaSuccessNotification: (notification) => set({ nidaSuccessNotification: notification }),

  history: [DEFAULT_TEMPLATE],
  historyIndex: 0,

  setActiveScreen: (screen: 'home' | 'upload' | 'editor' | 'templates' | 'nida' | 'nida_request' | 'preview' | 'downloads' | 'driving_license' | 'admin-payments') => {
    get().navigateSafely(screen);
  },

  setPopulatedCardPair: (front, back, formData) => {
    const activeService = get().activeServiceId;
    const isDL = activeService === 'driving_license' || front?.cardType === 'Driving License' || (formData && ('licenceNumber' in formData || 'pinNumber' in formData));
    const isNHIF = activeService === 'nhif' || (front?.cardType as string) === 'NHIF Card' || front?.cardType === 'NHIF Membership Card' || front?.serviceId === 'nhif' || (formData && ('cardNumber' in formData || 'cardStatus' in formData || 'card_no' in formData));

    if (isDL) {
      set({
        frontPopulatedTemplate: front,
        backPopulatedTemplate: back,
        lastDrivingLicenseFormData: formData !== undefined ? formData : get().lastDrivingLicenseFormData,
      });
    } else if (isNHIF) {
      set({
        frontPopulatedTemplate: front,
        backPopulatedTemplate: back,
        lastNhifFormData: formData !== undefined ? formData : get().lastNhifFormData,
      });
    } else {
      set({
        frontPopulatedTemplate: front,
        backPopulatedTemplate: back,
        lastNidaFormData: formData !== undefined ? formData : get().lastNidaFormData,
      });
    }
  },

  createNewTemplate: (background, name) => {
    let cardWidth = CR80_WIDTH_MM;
    let cardHeight = CR80_HEIGHT_MM;
    let orientation: 'landscape' | 'portrait' = 'landscape';

    if (background.type === 'image' && background.originalWidthPx && background.originalHeightPx) {
      if (background.originalHeightPx > background.originalWidthPx) {
        orientation = 'portrait';
        cardWidth = CR80_HEIGHT_MM;
        cardHeight = CR80_WIDTH_MM;
      }
    }

    const newTpl: CardTemplate = {
      id: 'template_' + Date.now(),
      templateName: name || 'New Card Template',
      cardWidth,
      cardHeight,
      unit: 'mm',
      dpi: 300,
      orientation,
      background,
      layers: [],
      guides: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set({
      currentTemplate: newTpl,
      selectedLayerIds: [],
      activeScreen: 'editor',
      zoom: 1.0,
      history: [newTpl],
      historyIndex: 0,
    });
  },

  loadTemplate: (template: CardTemplate) => {
    if (!template) {
      console.error('[Template Diagnostics Error] Attempted to load null or undefined template');
      return;
    }

    const prepared = ensureTemplateFieldIds(template);
    const serviceId = prepared.serviceId || get().activeServiceId || 'nida';

    // Diagnostic logging for template load (PROMPT 26)
    const elementCount = prepared.layers?.length || 0;
    const variableLayers = (prepared.layers || []).filter((l) => {
      if (l.bindingKey) return true;
      if (l.type === 'text' && (l as any).text?.includes('{{')) return true;
      return false;
    });

    const bgType = prepared.background?.type || 'color';
    const bgInfo = bgType === 'image'
      ? (prepared.background?.src ? `Image (${prepared.background.src.substring(0, 40)}...)` : 'Image (Missing URL!)')
      : `Color (${prepared.background?.color || '#ffffff'})`;

    console.log(`[Template Diagnostics] Loaded Template:`, {
      id: prepared.id,
      name: prepared.templateName,
      serviceId: serviceId,
      side: prepared.side || 'Front',
      background: bgInfo,
      elementCount: elementCount,
      variableCount: variableLayers.length,
    });

    if (bgType === 'image' && !prepared.background?.src) {
      console.warn(`[Template Diagnostics Warning] Template '${prepared.templateName}' (${prepared.id}) background is type 'image' but background image src URL is missing.`);
    }

    set({
      currentTemplate: prepared,
      activeServiceId: serviceId,
      selectedLayerIds: [],
      activeScreen: 'editor',
      studioMode: true,
      history: [prepared],
      historyIndex: 0,
      zoom: 1.0,
      hasUnsavedChanges: false,
    });

    // Save as studio draft for this active service to ensure navigating to editor restores this exact template
    if (typeof window !== 'undefined') {
      saveStudioDraftDB(serviceId, prepared);
      safeLocalStorageSetItem(`bigsta_studio_draft_${serviceId}`, JSON.stringify(prepared));
      safeLocalStorageSetItem('bigsta_active_service', serviceId);
    }
  },

  setCurrentTemplate: (template) => {
    set({ currentTemplate: template });
  },

  updateTemplateMeta: (meta) => {
    const updated = {
      ...get().currentTemplate,
      ...meta,
      updatedAt: new Date().toISOString(),
    };
    set({ currentTemplate: updated });
    get().pushHistoryState(updated);
  },

  setActiveUnit: (unit) => set({ activeUnit: unit }),

  setZoom: (zoomOrFn) =>
    set((state) => {
      const newZoom = typeof zoomOrFn === 'function' ? zoomOrFn(state.zoom) : zoomOrFn;
      // Clamp zoom between 0.25 (25%) and 5.0 (500%) as per PROMPT 47
      return { zoom: Math.min(5.0, Math.max(0.25, Number(newZoom.toFixed(2)))) };
    }),

  setPanOffset: (offsetOrFn) =>
    set((state) => ({
      panOffset: typeof offsetOrFn === 'function' ? offsetOrFn(state.panOffset) : offsetOrFn,
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
      l.id === id ? ({ ...l, ...patch } as Layer) : l
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

  updateLayerLive: (id, patch) => {
    const template = get().currentTemplate;
    const updatedLayers = template.layers.map((l) =>
      l.id === id ? ({ ...l, ...patch } as Layer) : l
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
    if (scope === 'selected') {
      if (targetLayerId) {
        targetIds = [targetLayerId];
      } else if (selectedLayerIds.length > 0) {
        targetIds = selectedLayerIds;
      }
    } else {
      targetIds = currentTemplate.layers.filter((l) => l.type === 'text').map((l) => l.id);
    }

    if (targetIds.length === 0) return;

    const updatedLayers = currentTemplate.layers.map((l) => {
      if (targetIds.includes(l.id) && l.type === 'text') {
        const textLayer = l as any;
        const currentWeight = textLayer.fontWeight ?? (textLayer.fontStyle?.includes('bold') ? 700 : 400);
        const validWeight = getClosestValidWeight(fontFamily, currentWeight);
        const isItalic = textLayer.fontStyle?.includes('italic');
        const isBold = validWeight >= 600;

        let fontStyle = 'normal';
        if (isBold && isItalic) fontStyle = 'bold italic';
        else if (isBold) fontStyle = 'bold';
        else if (isItalic) fontStyle = 'italic';

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
    if (scope === 'selected') {
      if (targetLayerId) {
        targetIds = [targetLayerId];
      } else if (selectedLayerIds.length > 0) {
        targetIds = selectedLayerIds;
      }
    } else {
      targetIds = currentTemplate.layers.filter((l) => l.type === 'text').map((l) => l.id);
    }

    if (targetIds.length === 0) return;

    const updatedLayers = currentTemplate.layers.map((l) => {
      if (targetIds.includes(l.id) && l.type === 'text') {
        const textLayer = l as any;
        const validWeight = getClosestValidWeight(textLayer.fontFamily || 'Helvetica', targetWeight);
        const isItalic = textLayer.fontStyle?.includes('italic');
        const isBold = validWeight >= 600;

        let fontStyle = 'normal';
        if (isBold && isItalic) fontStyle = 'bold italic';
        else if (isBold) fontStyle = 'bold';
        else if (isItalic) fontStyle = 'italic';

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
        const newId = 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        const copy: Layer = {
          ...JSON.parse(JSON.stringify(l)),
          id: newId,
          name: `${l.name} Copy`,
          x: l.x + 3.0, // Offset 3mm
          y: l.y + 3.0,
        };

        // Ensure category binding is unique if it's a category element
        if (copy.type === 'text' && (copy as TextLayer).licenseCategoryGroup) {
          // If it had a specific group, treat it as a fresh element
          // The critical requirement: No inherited category identity/mapping.
          // By regenerating the ID and not sharing the mapping record, we satisfy this.
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

    if (direction === 'up' && idx < layers.length) {
      layers.splice(idx + 1, 0, target);
    } else if (direction === 'down' && idx > 0) {
      layers.splice(idx - 1, 0, target);
    } else if (direction === 'top') {
      layers.push(target);
    } else if (direction === 'bottom') {
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
      l.id === id ? ({ ...l, hidden: !l.hidden } as Layer) : l
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
      l.id === id ? ({ ...l, locked: !l.locked } as Layer) : l
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
      (l) => selectedLayerIds.includes(l.id) && !l.locked
    );
    if (selected.length === 0) return;

    const updatedLayers = [...currentTemplate.layers];

    if (selected.length === 1) {
      const layer = selected[0];
      let newX = layer.x;
      let newY = layer.y;

      if (type === 'left') newX = 0;
      if (type === 'center') newX = (currentTemplate.cardWidth - layer.width) / 2;
      if (type === 'right') newX = currentTemplate.cardWidth - layer.width;
      if (type === 'top') newY = 0;
      if (type === 'middle') newY = (currentTemplate.cardHeight - layer.height) / 2;
      if (type === 'bottom') newY = currentTemplate.cardHeight - layer.height;

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

        if (type === 'left') newX = minX;
        if (type === 'center') newX = avgCenterX - layer.width / 2;
        if (type === 'right') newX = maxX - layer.width;
        if (type === 'top') newY = minY;
        if (type === 'middle') newY = avgCenterY - layer.height / 2;
        if (type === 'bottom') newY = maxY - layer.height;

        const idx = updatedLayers.findIndex((l) => l.id === layer.id);
        if (idx !== -1) {
          updatedLayers[idx] = { ...layer, x: Number(newX.toFixed(2)), y: Number(newY.toFixed(2)) };
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
      (l) => selectedLayerIds.includes(l.id) && !l.locked
    );
    if (selected.length < 3) return;

    const updatedLayers = [...currentTemplate.layers];

    if (direction === 'horizontal') {
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

  loadUploadedBackgrounds: async () => {
    const bgs = await getAllBackgroundsDB();
    set({ uploadedBackgrounds: bgs });
  },

  addUploadedBackground: async (bgData) => {
    let finalSrc = bgData.src;

    // Supabase Storage Background Asset Sync (PROMPT 50.5)
    try {
      if (bgData.src && bgData.src.startsWith('data:')) {
        const { uploadBackgroundToSupabase, supabase } = await import('../services/supabase');
        if (supabase) {
          // Convert base64 data URL to blob and upload
          const res = await fetch(bgData.src);
          const blob = await res.blob();
          const filename = bgData.name ? `${bgData.name}.png` : 'background.png';
          const supabaseUrl = await uploadBackgroundToSupabase(blob, filename);
          if (supabaseUrl) {
            finalSrc = supabaseUrl;
            // Also store asset reference in background_assets table
            await supabase.from('background_assets').upsert({
              id: 'bg_' + Date.now(),
              name: bgData.name || 'Background Asset',
              url: supabaseUrl,
              service_type: (bgData as any).category || 'general',
              created_at: new Date().toISOString()
            });
          }
        }
      }
    } catch (e) {
      console.warn('Supabase storage background upload skipped:', e);
    }

    const newBg: UploadedBackground = {
      ...bgData,
      src: finalSrc,
      id: 'bg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
    };
    await saveBackgroundDB(newBg);
    await get().loadUploadedBackgrounds();
    return newBg;
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
      id: 'guide_' + Date.now(),
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
        visibility: 'private' as const,
        status: 'draft' as const,
        updatedAt: new Date().toISOString(),
      };
      let sanitized = sanitizeTemplateForSaving(template);
      try {
        const { sanitizeAndUploadTemplateBackground } = await import('../services/supabase');
        sanitized = await sanitizeAndUploadTemplateBackground(sanitized);
      } catch {}
      await saveTemplateDB(sanitized);

      // Sync to Supabase
      try {
        const { saveTemplateSupabase } = await import('../services/supabase');
        await saveTemplateSupabase(sanitized);
      } catch (e) {
        console.warn('Failed to sync current draft template to Supabase:', e);
      }

      set({ currentTemplate: sanitized, hasUnsavedChanges: false });
      get().saveStudioDraft();
      await get().loadSavedTemplates();
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
        id: 'template_' + Date.now(),
        templateName: newName,
        cardType: cardType || current.cardType || 'National ID',
        side: side || current.side || 'Front Side',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      try {
        const { sanitizeAndUploadTemplateBackground } = await import('../services/supabase');
        newTpl = await sanitizeAndUploadTemplateBackground(newTpl);
      } catch {}
      await saveTemplateDB(newTpl);

      // Sync to Supabase
      try {
        const { saveTemplateSupabase } = await import('../services/supabase');
        await saveTemplateSupabase(newTpl);
      } catch (e) {
        console.warn('Failed to sync new template to Supabase:', e);
      }

      set({ currentTemplate: newTpl, hasUnsavedChanges: false });
      get().saveStudioDraft();
      await get().loadSavedTemplates();
      return newTpl;
    } finally {
      set({ isSaving: false });
    }
  },

  loadSavedTemplates: async (force = false) => {
    const nowSync = Date.now();
    const lastSync = get().lastTemplateSync || 0;
    const CACHE_TTL = 60 * 1000; // 60-second cache TTL for template syncing to prevent redundant network requests during repeated form submissions
    
    // Only skip remote fetch if we already have data and it's fresh (< 60 seconds)
    if (!force && get().customTemplates.length > 0 && (nowSync - lastSync < CACHE_TTL)) {
      return get().customTemplates;
    }

    set({ loadingTemplates: true });
    try {
      // 1. Fetch locally saved templates from IndexedDB
      const dbTemplates = await getAllTemplatesDB();
      const map = new Map<string, CardTemplate>();

      dbTemplates.forEach((t) => {
        map.set(t.id, ensureTemplateFieldIds(t));
      });

      // 2. Fetch active universal templates and sync
      try {
        const { fetchAllActiveTemplatesSupabase, isSupabaseConfigured, fetchManualRequestsSupabase } = await import('../services/supabase');
        if (isSupabaseConfigured) {
          // Fetch active templates
          const supabaseTemplates = await fetchAllActiveTemplatesSupabase();
          if (supabaseTemplates) {
            // Supabase is the source of truth: drop cached universal/cloud copies the admin deleted.
            const cloudIds = new Set(supabaseTemplates.map((t: any) => t.id));
            for (const [id, t] of Array.from(map.entries())) {
              const isCloudCopy = t.isUniversal || id.startsWith('tpl_') || id.startsWith('template_');
              if (isCloudCopy && !cloudIds.has(id)) {
                map.delete(id);
                await deleteTemplateDB(id);
              }
            }
          }
          for (const t of supabaseTemplates || []) {
            if (t && t.id) {
              const sanitized = ensureTemplateFieldIds(t);
              map.set(sanitized.id, sanitized);
              await saveTemplateDB(sanitized);
            }
          }

          // Fetch manual requests and sync/merge
          const supabaseManuals = await fetchManualRequestsSupabase();
          const localManuals = get().manualRequests || [];
          const manualMap = new Map<string, ManualRequestItem>();
          localManuals.forEach((m) => manualMap.set(m.id, m));
          supabaseManuals.forEach((m) => {
            manualMap.set(m.id, {
              ...manualMap.get(m.id),
              ...m
            });
          });
          const mergedManuals = Array.from(manualMap.values()).sort((a, b) => b.submittedAt - a.submittedAt);
          localStorage.setItem('bigsta_manual_requests', JSON.stringify(mergedManuals));
          set({ manualRequests: mergedManuals });
        }
      } catch (e) {
        console.warn('Sync skipped:', e);
      }

    // 3. Detect which serviceIds have custom/admin made templates for front and back separately
    const servicesWithCustomFront = new Set<string>();
    const servicesWithCustomBack = new Set<string>();
    map.forEach((t) => {
      if (t.serviceId && !t.id.startsWith('sample_')) {
        if (isBackSideTemplate(t)) {
          servicesWithCustomBack.add(t.serviceId);
        } else {
          servicesWithCustomFront.add(t.serviceId);
        }
      }
    });

    // 4. Ensure SAMPLE_TEMPLATES are kept for whichever side lacks custom templates
    for (const sample of SAMPLE_TEMPLATES) {
      const serviceId = sample.serviceId || '';
      const isBack = isBackSideTemplate(sample);
      const hasCustomForSide = isBack ? servicesWithCustomBack.has(serviceId) : servicesWithCustomFront.has(serviceId);

      if (!hasCustomForSide) {
        if (!map.has(sample.id)) {
          const sanitized = ensureTemplateFieldIds(sample);
          map.set(sanitized.id, sanitized);
          await saveTemplateDB(sanitized);
        }
      } else {
        // Only remove sample if custom for that side exists
        if (map.has(sample.id)) {
          map.delete(sample.id);
        }
      }
    }

    const all = Array.from(map.values());
    const sorted = all.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime() || 0;
      return timeB - timeA;
    });
    set({ customTemplates: sorted, lastTemplateSync: nowSync });
    return sorted;
    } finally {
      set({ loadingTemplates: false });
    }
  },

  deleteSavedTemplate: async (id) => {
    await deleteTemplateDB(id);
    try {
      const { deleteTemplateSupabase } = await import('../services/supabase');
      await deleteTemplateSupabase(id);
    } catch (e) {
      console.warn('Failed to delete template on Supabase:', e);
    }
  },

  setSelectedFrontTemplateId: (id) => {
    if (typeof window !== 'undefined' && id) {
      safeLocalStorageSetItem('nida_selected_front_template_id', id);
    }
    set({ selectedFrontTemplateId: id });
  },

  setSelectedBackTemplateId: (id) => {
    if (typeof window !== 'undefined' && id) {
      safeLocalStorageSetItem('nida_selected_back_template_id', id);
    }
    set({ selectedBackTemplateId: id });
  },

  setUniversalDefaultNidaTemplates: (frontId, backId) => {
    if (typeof window !== 'undefined') {
      safeLocalStorageSetItem('nida_default_front_template_id', frontId);
      safeLocalStorageSetItem('nida_default_back_template_id', backId);
      safeLocalStorageSetItem('nida_selected_front_template_id', frontId);
      safeLocalStorageSetItem('nida_selected_back_template_id', backId);
    }
    set({
      defaultNidaFrontTemplateId: frontId,
      defaultNidaBackTemplateId: backId,
      selectedFrontTemplateId: frontId,
      selectedBackTemplateId: backId,
    });
  },

  saveNidaSubmissionRecord: async (record) => {
    if (typeof window !== 'undefined') {
      try {
        safeLocalStorageSetItem('nida_last_submission', JSON.stringify(record));
        const historyStr = localStorage.getItem('nida_submission_history') || '[]';
        const history: NidaSubmissionRecord[] = JSON.parse(historyStr);
        history.unshift(record);
        // Keep last 50 submissions
        if (history.length > 50) history.pop();
        safeLocalStorageSetItem('nida_submission_history', JSON.stringify(history));
      } catch (err) {
        console.warn('Failed to persist submission record to localStorage:', err);
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
