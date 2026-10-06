// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
import React, { useEffect, useState } from 'react';
import {
  Menu,
  X,
  Home,
  BarChart3,
  UserCheck,
  FolderOpen,
  Camera,
  DownloadCloud,
  Settings,
  ChevronRight,
  ChevronDown,
  Layers,
  Key,
  Receipt,
  CreditCard,
  Shield,
  FileText,
  Car,
  Building2,
  GraduationCap,
  HeartPulse,
  Briefcase,
  AlertCircle,
  LogOut
} from 'lucide-react';
import { useTemplateStore } from '../../store/useTemplateStore';
import { useUnreviewedSmsCount } from '../../hooks/useUnreviewedSmsCount';

export interface ServiceMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInfoService?: (service: { id: string; name: string; authority: string; description: string; features: string[] }) => void;
}

export const ServiceMenuDrawer: React.FC<ServiceMenuDrawerProps> = ({
  isOpen,
  onClose,
  onSelectInfoService,
}) => {
  const { setActiveScreen, activeScreen, authRole, setPasskeyManagerOpen, setRechargeModalOpen, logoutPasskey, setManualRequestService } = useTemplateStore();
  const unreviewedSms = useUnreviewedSmsCount(authRole === 'admin');

  // Root dropdown state: 'none' | 'dashboard' | 'services' (collapsed by default)
  const [openRoot, setOpenRoot] = useState<'none' | 'dashboard' | 'services'>('none');
  
  // Subcategory open state (only one open at a time): null | 'template_mgmt' | 'security' | 'payments' | 'identity' | 'licence' | 'document' | 'education' | 'manual'
  const [openSub, setOpenSub] = useState<string | null>(null);

  // Close drawer on Escape key and Click Outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      const drawer = document.getElementById('service-menu-drawer');
      if (isOpen && drawer && !drawer.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
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

  // Reset dropdowns when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setOpenRoot('none');
      setOpenSub(null);
    }
  }, [isOpen]);

  const toggleRoot = (rootKey: 'dashboard' | 'services') => {
    if (openRoot === rootKey) {
      setOpenRoot('none');
      setOpenSub(null);
    } else {
      setOpenRoot(rootKey);
      setOpenSub(null);
    }
  };

  const toggleSub = (subKey: string) => {
    setOpenSub(openSub === subKey ? null : subKey);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex justify-start transition-opacity duration-200">
      <div
        id="service-menu-drawer"
        className="w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-sm">
              B
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 leading-tight">BIGsta Portal</h2>
              <p className="text-[10px] text-slate-500 font-semibold">
                {authRole === 'admin' ? 'Administrator Workspace' : 'User Portal'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Navigation Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-sans">
          {/* 1. Home */}
          <button
            onClick={() => {
              setActiveScreen('home');
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-blue-600" />
            <span>Home</span>
          </button>

          {/* 2. Dashboard (Accordion) */}
          <div>
            <button
              onClick={() => toggleRoot('dashboard')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Dashboard</span>
              </div>
              {openRoot === 'dashboard' ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Dashboard Submenu */}
            {openRoot === 'dashboard' && (
              <div className="ml-4 pl-3 border-l-2 border-indigo-100 my-1 space-y-1 transition-all duration-200">
                {authRole === 'admin' ? (
                  <>
                    {/* Template Management */}
                    <div>
                      <button
                        onClick={() => toggleSub('template_mgmt')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-blue-500" />
                          Template Management
                        </span>
                        {openSub === 'template_mgmt' ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                      {openSub === 'template_mgmt' && (
                        <div className="ml-4 pl-2 border-l border-slate-200 my-1 space-y-1">
                          <button
                            onClick={() => {
                              setActiveScreen('upload');
                              onClose();
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            Custom Card Studio
                          </button>
                          <button
                            onClick={() => {
                              setActiveScreen('templates');
                              onClose();
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            Saved Templates Library
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Security & Access */}
                    <div>
                      <button
                        onClick={() => toggleSub('security')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-purple-500" />
                          Security & Access
                        </span>
                        {openSub === 'security' ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                      {openSub === 'security' && (
                        <div className="ml-4 pl-2 border-l border-slate-200 my-1 space-y-1">
                          <button
                            onClick={() => {
                              setPasskeyManagerOpen(true);
                              onClose();
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            Passkey Manager
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Payments */}
                    <div>
                      <button
                        onClick={() => toggleSub('payments')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                          Payments {unreviewedSms > 0 ? `(${unreviewedSms})` : ''}
                        </span>
                        {openSub === 'payments' ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                      {openSub === 'payments' && (
                        <div className="ml-4 pl-2 border-l border-slate-200 my-1 space-y-1">
                          <button
                            onClick={() => {
                              setActiveScreen('admin-payments');
                              onClose();
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            Payments & Transactions
                          </button>
                          <button
                            onClick={() => {
                              setRechargeModalOpen(true);
                              onClose();
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            Bills & Payment Methods
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="px-3 py-2 text-[11px] text-slate-500 font-medium">
                    Welcome to your user dashboard. Access verification services via Services below.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Services (Accordion) */}
          <div>
            <button
              onClick={() => toggleRoot('services')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4 text-amber-600" />
                <span>Services</span>
              </div>
              {openRoot === 'services' ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Services Subcategories */}
            {openRoot === 'services' && (
              <div className="ml-4 pl-3 border-l-2 border-amber-100 my-1 space-y-1 transition-all duration-200">
                {/* Identity Services */}
                <div>
                  <button
                    onClick={() => toggleSub('identity')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-blue-500" />
                      Identity Services
                    </span>
                    {openSub === 'identity' ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {openSub === 'identity' && (
                    <div className="ml-4 pl-2 border-l border-slate-200 my-1 space-y-1">
                      <button
                        onClick={() => {
                          setManualRequestService('NIDA Services');
                          setActiveScreen('nida');
                          onClose();
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        NIDA Services
                      </button>
                      <button
                        onClick={() => {
                          setManualRequestService('NHIF Membership Card');
                          setActiveScreen('nhif');
                          onClose();
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        NHIF Membership Card
                      </button>
                    </div>
                  )}
                </div>

                {/* Licence & Transport */}
                <div>
                  <button
                    onClick={() => toggleSub('licence')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Car className="w-3.5 h-3.5 text-indigo-500" />
                      Licence & Transport
                    </span>
                    {openSub === 'licence' ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {openSub === 'licence' && (
                    <div className="ml-4 pl-2 border-l border-slate-200 my-1 space-y-1">
                      <button
                        onClick={() => {
                          setManualRequestService('Driving Licence Services');
                          setActiveScreen('driving_license');
                          onClose();
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        Driving Licence Services
                      </button>
                    </div>
                  )}
                </div>

                {/* Document Services */}
                <div>
                  <button
                    onClick={() => toggleSub('document')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-emerald-500" />
                      Document Services
                    </span>
                    {openSub === 'document' ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {openSub === 'document' && (
                    <div className="ml-4 pl-2 border-l border-slate-200 my-1 space-y-1">
                      {[
                        'Birth Certificate Services',
                        'Passport Services',
                        'TIN Services',
                        'Business License Services'
                      ].map((svc) => (
                        <button
                          key={svc}
                          onClick={() => {
                            setManualRequestService(svc);
                            setActiveScreen('nida_request');
                            onClose();
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          {svc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Education & Employment */}
                <div>
                  <button
                    onClick={() => toggleSub('education')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
                      Education & Employment
                    </span>
                    {openSub === 'education' ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {openSub === 'education' && (
                    <div className="ml-4 pl-2 border-l border-slate-200 my-1 space-y-1">
                      {[
                        'HESLB Student Loans',
                        'Ajira Portal Services',
                        'University Applications'
                      ].map((svc) => (
                        <button
                          key={svc}
                          onClick={() => {
                            setManualRequestService(svc);
                            setActiveScreen('nida_request');
                            onClose();
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          {svc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manual Requests */}
                <div>
                  <button
                    onClick={() => toggleSub('manual')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                      Manual Requests
                    </span>
                    {openSub === 'manual' ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {openSub === 'manual' && (
                    <div className="ml-4 pl-2 border-l border-slate-200 my-1 space-y-1">
                      {[
                        'Police Loss Report',
                        'Birth Certificate Services',
                        'Passport Services',
                        'TIN Services',
                        'Business License Services',
                        'HESLB Student Loans',
                        'Ajira Portal Services',
                        'University Applications'
                      ].map((svc) => (
                        <button
                          key={svc}
                          onClick={() => {
                            setManualRequestService(svc);
                            setActiveScreen('nida_request');
                            onClose();
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          {svc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. Passport Size Photo Studio */}
          <button
            onClick={() => {
              setActiveScreen('passport_studio');
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4 text-pink-600" />
            <span>Passport Size Photo Studio</span>
          </button>

          {/* 5. Downloads */}
          <button
            onClick={() => {
              setActiveScreen('downloads');
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <DownloadCloud className="w-4 h-4 text-emerald-600" />
            <span>Downloads</span>
          </button>

          {/* 6. Settings */}
          <button
            onClick={() => {
              setActiveScreen('settings');
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>Settings</span>
          </button>

          {/* Log Out */}
          <div className="pt-4 mt-4 border-t border-slate-200">
            <button
              onClick={() => {
                logoutPasskey();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
