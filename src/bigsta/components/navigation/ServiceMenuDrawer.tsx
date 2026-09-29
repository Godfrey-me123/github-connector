import React, { useEffect } from 'react';
import {
  Menu,
  X,
  Home,
  UserCheck,
  ScrollText,
  Car,
  Globe,
  Receipt,
  Building2,
  GraduationCap,
  HeartPulse,
  Briefcase,
  Layers,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Shield,
  CreditCard,
  Info,
  LogOut,
  Key,
  ShieldCheck,
  DownloadCloud,
  Settings,
} from 'lucide-react';
import { useTemplateStore } from '../../store/useTemplateStore';
import { useUnreviewedSmsCount } from '../../hooks/useUnreviewedSmsCount';

export interface ServiceMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInfoService?: (service: { id: string; name: string; authority: string; description: string; features: string[] }) => void;
}

interface NavItem {
  id: string;
  name: string;
  authority: string;
  category: 'core' | 'identity' | 'civil' | 'education' | 'finance' | 'health';
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  status: 'active' | 'coming_soon';
  badgeText?: string;
  action: () => void;
  description?: string;
  features?: string[];
}

export const ServiceMenuDrawer: React.FC<ServiceMenuDrawerProps> = ({
  isOpen,
  onClose,
  onSelectInfoService,
}) => {
  const { setActiveScreen, activeScreen, authRole, logoutPasskey, setPasskeyManagerOpen, manualRequests } = useTemplateStore();

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const unreviewedSms = useUnreviewedSmsCount(authRole === 'admin');
  const [readyCount, setReadyCount] = React.useState<number>(0);
  const [isServicesExpanded, setIsServicesExpanded] = React.useState<boolean>(true);
  React.useEffect(() => {
    if (isOpen) {
      import('../../utils/idb').then(async (m) => {
        const records = await m.getAllDownloadRecordsDB();
        const ready = records.filter(r => r.status === 'READY').length;
        setReadyCount(ready);
      });
    }
  }, [isOpen]);

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      authority: 'Portal Overview',
      category: 'core',
      icon: Home,
      iconColor: 'text-blue-500',
      status: 'active',
      action: () => {
        setActiveScreen('home');
        onClose();
      },
    },
    {
      id: 'services',
      name: 'Services',
      authority: 'ID & Verification Services',
      category: 'core',
      icon: UserCheck,
      iconColor: 'text-blue-500',
      status: 'active',
      action: () => {
        setActiveScreen('home');
        onClose();
      },
    },
    ...(authRole === 'admin'
      ? [
          {
            id: 'custom_studio',
            name: 'Custom Card Studio',
            authority: 'ID Template Designer',
            category: 'core' as const,
            icon: Layers,
            iconColor: 'text-blue-400',
            status: 'active' as const,
            badgeText: 'Admin',
            action: () => {
              setActiveScreen('upload');
              onClose();
            },
            description: 'Create custom employee badges, student cards, or upload background artwork.',
            features: ['CR80 Millimeter Layout', 'Custom Image Backgrounds', 'Smart Magnetic Snap', 'PDF & SVG Export'],
          },
          {
            id: 'templates_library',
            name: 'Saved Templates Library',
            authority: 'Template Storage',
            category: 'core' as const,
            icon: FolderOpen,
            iconColor: 'text-amber-400',
            status: 'active' as const,
            badgeText: 'Admin',
            action: () => {
              setActiveScreen('templates');
              onClose();
            },
            description: 'Manage, duplicate, search, and export saved card templates.',
            features: ['Local Storage Persistence', 'JSON Import & Export', 'Template Duplication'],
          },
          {
            id: 'passkey_manager',
            name: 'Passkey Manager',
            authority: 'Admin Access & Key Security',
            category: 'core' as const,
            icon: Key,
            iconColor: 'text-purple-600',
            status: 'active' as const,
            badgeText: 'Admin',
            action: () => {
              setPasskeyManagerOpen(true);
              onClose();
            },
            description: 'Manage admin & user passkeys, generate new keys & reset admin access.',
          },
          {
            id: 'sms_payments',
            name: unreviewedSms > 0 ? `Payments (${unreviewedSms})` : 'Payments & Transactions',
            authority: 'SMS Forwarder & Auto-Verification',
            category: 'core' as const,
            icon: Receipt,
            iconColor: 'text-emerald-600',
            status: 'active' as const,
            badgeText: 'Admin',
            action: () => {
              setActiveScreen('admin-payments');
              onClose();
            },
            description: 'Verify SMS transactions, manage payment settings, and monitor incoming payments.',
          },
        ]
      : [
          {
            id: 'user_payments',
            name: 'Token Billing & Top-Up',
            authority: 'Usage & Token Balance',
            category: 'core' as const,
            icon: CreditCard,
            iconColor: 'text-emerald-500',
            status: 'active' as const,
            badgeText: 'User',
            action: () => {
              setActiveScreen('billing');
              onClose();
            },
          },
        ]),
    {
      id: 'nida',
      name: 'NIDA Services',
      authority: 'National Identification Authority',
      category: 'identity',
      icon: UserCheck,
      iconColor: 'text-[#47A5FF]',
      status: 'active',
      badgeText: 'Active',
      action: () => {
        setActiveScreen('nida');
        onClose();
      },
      description: 'Instant auto-fill, verification & CR80 card generation for Front & Back National IDs.',
      features: ['20-Digit ID Verification', 'Biometric Photo Upload', 'Digital Signature Pad', 'Barcode Sync'],
    },
    {
      id: 'driving_license',
      name: 'Driving License Services',
      authority: 'Traffic & Vehicle Inspection',
      category: 'civil',
      icon: Car,
      iconColor: 'text-amber-400',
      status: 'active',
      badgeText: 'Active',
      action: () => {
        setActiveScreen('driving_license');
        onClose();
      },
      description: 'Driver permit issuance, class endorsements & digital driver identification cards.',
      features: ['Class Endorsements (A, B, C, D, E)', 'Penalty Point Tracking', 'Digital QR Validation'],
    },
    {
      id: 'nhif',
      name: 'NHIF Membership Card',
      authority: 'National Health Insurance Fund',
      category: 'health',
      icon: HeartPulse,
      iconColor: 'text-rose-400',
      status: 'active',
      badgeText: 'Active',
      action: () => {
        setActiveScreen('nhif' as any);
        onClose();
      },
      description: 'Healthcare membership smart cards, dependent coverage validation & biometric health passes.',
      features: ['Principal & Dependent Mapping', 'Hospital Tier Endorsements', 'Smart Card Chip Specs'],
    },
    {
      id: 'birth_certificate',
      name: 'Birth Certificate Services',
      authority: 'RITA Civil Registration',
      category: 'civil',
      icon: ScrollText,
      iconColor: 'text-emerald-400',
      status: 'coming_soon',
      badgeText: (() => {
        const req = manualRequests.find((r) => r.serviceId === 'birth_certificate');
        if (!req) return 'Request Manual';
        if (req.status === 'PENDING') return 'Admin Review';
        if (req.status === 'PROCESSING') return 'On Progress';
        if (req.status === 'APPROVED' || req.status === 'COMPLETED') return 'Accepted';
        if (req.status === 'REJECTED') return 'Rejected';
        return 'Request Manual';
      })(),
      action: () => {
        onSelectInfoService?.({
          id: 'birth_certificate',
          name: 'Birth Certificate Services',
          authority: 'RITA (Registration Insolvency and Trusteeship Agency)',
          description: 'Official birth certificate issuance, verification & digital civil registry documentation.',
          features: ['Civil Registration Archiving', 'Legal Certification Verification', 'Official Watermark Validation'],
        });
        onClose();
      },
    },
    {
      id: 'passport',
      name: 'Passport Services',
      authority: 'Immigration Services Department',
      category: 'identity',
      icon: Globe,
      iconColor: 'text-cyan-400',
      status: 'coming_soon',
      badgeText: (() => {
        const req = manualRequests.find((r) => r.serviceId === 'passport');
        if (!req) return 'Request Manual';
        if (req.status === 'PENDING') return 'Admin Review';
        if (req.status === 'PROCESSING') return 'On Progress';
        if (req.status === 'APPROVED' || req.status === 'COMPLETED') return 'Accepted';
        if (req.status === 'REJECTED') return 'Rejected';
        return 'Request Manual';
      })(),
      action: () => {
        onSelectInfoService?.({
          id: 'passport',
          name: 'Passport Services',
          authority: 'Immigration Services Department',
          description: 'East African e-Passport booklet formatting, bio-data pages & travel credentials.',
          features: ['ICAO 9303 Compliant MRZ', 'Biometric Chip Layout', 'Diplomatic & Ordinary Profiles'],
        });
        onClose();
      },
    },
    {
      id: 'tin',
      name: 'TIN Services',
      authority: 'Tanzania Revenue Authority',
      category: 'finance',
      icon: Receipt,
      iconColor: 'text-violet-400',
      status: 'coming_soon',
      badgeText: (() => {
        const req = manualRequests.find((r) => r.serviceId === 'tin');
        if (!req) return 'Request Manual';
        if (req.status === 'PENDING') return 'Admin Review';
        if (req.status === 'PROCESSING') return 'On Progress';
        if (req.status === 'APPROVED' || req.status === 'COMPLETED') return 'Accepted';
        if (req.status === 'REJECTED') return 'Rejected';
        return 'Request Manual';
      })(),
      action: () => {
        onSelectInfoService?.({
          id: 'tin',
          name: 'TIN Services',
          authority: 'Tanzania Revenue Authority (TRA)',
          description: 'Taxpayer Identification Number cards, tax compliance credentials & PIN certificates.',
          features: ['Taxpayer PIN Sync', 'QR Compliance Stamp', 'Corporate & Individual Formats'],
        });
        onClose();
      },
    },
    {
      id: 'business_license',
      name: 'Business License Services',
      authority: 'BRELA & Municipal Authorities',
      category: 'finance',
      icon: Building2,
      iconColor: 'text-orange-400',
      status: 'coming_soon',
      badgeText: (() => {
        const req = manualRequests.find((r) => r.serviceId === 'business_license');
        if (!req) return 'Request Manual';
        if (req.status === 'PENDING') return 'Admin Review';
        if (req.status === 'PROCESSING') return 'On Progress';
        if (req.status === 'APPROVED' || req.status === 'COMPLETED') return 'Accepted';
        if (req.status === 'REJECTED') return 'Rejected';
        return 'Request Manual';
      })(),
      action: () => {
        onSelectInfoService?.({
          id: 'business_license',
          name: 'Business License Services',
          authority: 'BRELA & Municipal Authorities',
          description: 'Commercial enterprise registration certificates, municipal trade permits & corporate IDs.',
          features: ['BRELA Certificate Layout', 'Annual Renewal Badges', 'Sector Trade Validation'],
        });
        onClose();
      },
    },
    {
      id: 'heslb',
      name: 'HESLB Student Loans Services',
      authority: 'Higher Education Students’ Loans Board',
      category: 'education',
      icon: GraduationCap,
      iconColor: 'text-indigo-400',
      status: 'coming_soon',
      badgeText: (() => {
        const req = manualRequests.find((r) => r.serviceId === 'heslb');
        if (!req) return 'Request Manual';
        if (req.status === 'PENDING') return 'Admin Review';
        if (req.status === 'PROCESSING') return 'On Progress';
        if (req.status === 'APPROVED' || req.status === 'COMPLETED') return 'Accepted';
        if (req.status === 'REJECTED') return 'Rejected';
        return 'Request Manual';
      })(),
      action: () => {
        onSelectInfoService?.({
          id: 'heslb',
          name: 'HESLB Student Loans Services',
          authority: 'Higher Education Students’ Loans Board (HESLB)',
          description: 'Student beneficiary loan allocation cards, academic verification & repayment IDs.',
          features: ['Index Number Verification', 'Institution Allocation Status', 'Beneficiary Smart Badges'],
        });
        onClose();
      },
    },
    {
      id: 'ajira',
      name: 'Ajira Portal Services',
      authority: 'Public Service Recruitment Secretariat',
      category: 'education',
      icon: Briefcase,
      iconColor: 'text-teal-400',
      status: 'coming_soon',
      badgeText: (() => {
        const req = manualRequests.find((r) => r.serviceId === 'ajira');
        if (!req) return 'Request Manual';
        if (req.status === 'PENDING') return 'Admin Review';
        if (req.status === 'PROCESSING') return 'On Progress';
        if (req.status === 'APPROVED' || req.status === 'COMPLETED') return 'Accepted';
        if (req.status === 'REJECTED') return 'Rejected';
        return 'Request Manual';
      })(),
      action: () => {
        onSelectInfoService?.({
          id: 'ajira',
          name: 'Ajira Portal Services',
          authority: 'Public Service Recruitment Secretariat (PSRS)',
          description: 'Government job application portfolios, civil service recruitment IDs & applicant profiles.',
          features: ['Civil Service Application Sync', 'Cadre Certificate Validation', 'Interview Pass Generation'],
        });
        onClose();
      },
    },
    {
      id: 'downloads',
      name: 'Downloads',
      authority: 'Generated Files & History',
      category: 'core',
      icon: DownloadCloud,
      iconColor: 'text-blue-600',
      status: 'active',
      badgeText: readyCount > 0 ? `${readyCount} Ready` : undefined,
      action: () => {
        setActiveScreen('downloads');
        onClose();
      },
      description: 'Manage generated files, track export status (Generating, Ready, Downloaded, Failed), and redownload anytime.',
      features: ['Server-Side Export Persistence', 'One-Click Re-download', 'Token Protection on Failure'],
    },
    {
      id: 'settings',
      name: 'Settings',
      authority: 'Account & Preferences',
      category: 'core',
      icon: Settings,
      iconColor: 'text-gray-600',
      status: 'active',
      action: () => {
        setActiveScreen('settings');
        onClose();
      },
    },
  ];

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex font-sans animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className="relative w-full max-w-xs sm:max-w-sm bg-[#FFFFFF] border-r border-[#E7E9EB] text-[#000000] shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-250"
        role="dialog"
        aria-modal="true"
        aria-label="Services Navigation"
      >
        {/* Drawer Header - Centered BIGsta Title with CEO / Welcome Back Tag */}
        <div className="relative flex flex-col items-center justify-center px-5 py-4 border-b border-[#E7E9EB] bg-[#FFFFFF] shrink-0">
          <div className="text-center">
            <h2 className="text-sm font-black text-[#000000] tracking-wider uppercase font-sans">
              BIGsta
            </h2>
          </div>

          {/* Current Role / Greeting Tag Badge */}
          <div className="mt-2">
            {authRole === 'admin' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                <Shield className="w-3.5 h-3.5 text-amber-700" />
                <span>CEO</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider px-3.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Welcome back</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-[#555555] hover:text-[#000000] hover:bg-[#E7E9EB] transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List - Vertically Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 py-3 px-3 space-y-2 divide-y divide-[#E7E9EB]">
          {/* Active Workspaces */}
          <div className="pb-2 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#777777]">
              Workspace Navigation
            </div>

            {/* Dashboard */}
            {(() => {
              const dashItem = navItems.find((i) => i.id === 'dashboard');
              if (!dashItem) return null;
              const isDashActive = activeScreen === 'home';
              return (
                <button
                  key={dashItem.id}
                  type="button"
                  onClick={dashItem.action}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isDashActive
                      ? 'bg-[#000000] text-[#FFFFFF]'
                      : 'hover:bg-[#E7E9EB] text-[#000000]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isDashActive ? 'bg-white/20 text-white' : 'bg-[#E7E9EB] text-[#000000]'}`}>
                      <Home className="w-4 h-4" />
                    </div>
                    <div className="truncate min-w-0">
                      <div className="text-xs font-bold truncate">{dashItem.name}</div>
                      <div className={`text-[10px] truncate hidden sm:block ${isDashActive ? 'text-slate-300' : 'text-slate-500'}`}>{dashItem.authority}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${isDashActive ? 'bg-white text-black' : 'bg-[#E7E9EB] text-[#000000]'}`}>
                    {isDashActive ? 'Active' : 'Open'}
                  </span>
                </button>
              );
            })()}

            {/* Services Dropdown Parent - Consolidated All Services */}
            <div className="space-y-1 pt-1">
              <button
                type="button"
                onClick={() => setIsServicesExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-[#E7E9EB] text-[#000000] transition-all cursor-pointer border border-[#E7E9EB] bg-[#F8F9FA]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded-lg shrink-0 bg-[#E7E9EB] text-[#000000]">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="truncate min-w-0">
                    <div className="text-xs font-bold truncate">Services</div>
                    <div className="text-[10px] text-slate-500 truncate hidden sm:block">Identity, Cards & Public Services</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#CEE9B9] text-[#000000]">
                    Active
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${isServicesExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Collapsible Dropdown Children nested under Services - Consolidated */}
              {isServicesExpanded && (
                <div className="pl-2 ml-2 border-l-2 border-[#E7E9EB] space-y-1 pt-1 pb-1 animate-in slide-in-from-top-1 duration-150">
                  {navItems
                    .filter((item) => item.id !== 'dashboard' && item.id !== 'services')
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        (item.id === 'nida' && activeScreen === 'nida') ||
                        (item.id === 'driving_license' && activeScreen === 'driving_license') ||
                        (item.id === 'nhif' && activeScreen === 'nhif') ||
                        ((item.id === 'templates' || item.id === 'templates_library') && (activeScreen === 'upload' || activeScreen === 'templates' || activeScreen === 'editor')) ||
                        ((item.id === 'payments' || item.id === 'sms_payments' || item.id === 'user_payments') && activeScreen === 'admin-payments') ||
                        (item.id === 'downloads' && activeScreen === 'downloads') ||
                        (item.id === 'custom_studio' && activeScreen === 'upload');

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.action}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#000000] text-[#FFFFFF]'
                              : 'hover:bg-[#E7E9EB] text-[#000000]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-[#E7E9EB] text-[#000000]'}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate min-w-0">
                              <div className="text-xs font-semibold truncate">{item.name}</div>
                              <div className={`text-[9px] truncate ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>{item.authority}</div>
                            </div>
                          </div>

                          {item.badgeText ? (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              item.status === 'coming_soon'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : isActive
                                ? 'bg-white text-black'
                                : 'bg-blue-600 text-white'
                            }`}>
                              {item.badgeText}
                            </span>
                          ) : item.status === 'active' ? (
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0 ${isActive ? 'bg-white text-black font-bold' : 'bg-[#CEE9B9] text-[#000000] font-bold'}`}>
                              {isActive ? 'Active' : 'Ready'}
                            </span>
                          ) : (
                            <span className="text-[9px] text-[#555555] px-1.5 py-0.5 rounded bg-[#E7E9EB] shrink-0 font-medium">
                              Info
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer with Role Status & Sticky Logout */}
        <div className="p-4 border-t border-[#E7E9EB] bg-[#F8F9FA] shrink-0 space-y-2.5 z-10">
          <div className="flex items-center justify-end">
            {authRole === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  setPasskeyManagerOpen(true);
                  onClose();
                }}
                className="text-[11px] text-[#47A5FF] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Passkeys</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              logoutPasskey();
              onClose();
            }}
            className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 border border-red-700 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout (Return to Gateway) ↩</span>
          </button>

          <div className="text-center pt-0.5">
            <p className="text-[10px] text-[#777777]">
              BIGsta Gateway System • CR80 Cards
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
