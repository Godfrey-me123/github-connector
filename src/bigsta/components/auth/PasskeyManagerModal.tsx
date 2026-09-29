import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Key,
  Shield,
  UserCheck,
  Plus,
  Trash2,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Info,
  ShieldCheck,
  Search,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  Users,
  UserX,
  Eye,
  EyeOff,
  Ticket,
  CreditCard,
  PlusCircle,
  Receipt,
  Activity,
  Phone,
  Clock,
  Wallet,
  CheckSquare,
  XSquare,
  ScrollText,
  Smartphone,
} from 'lucide-react';
import { useTemplateStore, PasskeyItem, PaymentStatus, RegisteredUser, PaymentRequest, ManualRequestItem } from '../../store/useTemplateStore';
import { ManualRequestsAdminTab } from './ManualRequestsAdminTab';

const USAGE_PACKAGES = [
  { id: 'pkg_starter', name: 'Starter Package', usages: 5, priceTzs: 10000 },
  { id: 'pkg_std', name: 'Standard Package', usages: 20, priceTzs: 35000 },
  { id: 'pkg_unlimited', name: 'Pro Package', usages: 100, priceTzs: 150000 },
  { id: 'pkg_custom', name: 'Custom Allowance', usages: 10, priceTzs: 0 },
];

export const PasskeyManagerModal: React.FC = () => {
  const {
    authRole,
    isPasskeyManagerOpen,
    setPasskeyManagerOpen,
    activePasskeys,
    registeredUsers,
    paymentRequests,
    addPasskey,
    generateUserPasskey,
    generateAdminPasskey,
    resetAdminPasskey,
    togglePasskeyStatus,
    deletePasskey,
    confirmPaymentAndActivatePasskey,
    addUsagesToPasskey,
    approvePaymentRequest,
    rejectPaymentRequest,
    toggleUserStatus,
    deleteRegisteredUser,
    tokenPackages,
    addTokenPackage,
    editTokenPackage,
    deleteTokenPackage,
    toggleTokenPackage,
    services,
    addService,
    editService,
    deleteService,
    toggleService,
    manualRequests,
  } = useTemplateStore();

  // Admin Top Navigation Tab State
  const [activeAdminTab, setActiveAdminTab] = useState<'passkeys' | 'users' | 'payments' | 'packages' | 'services' | 'manual_requests'>('passkeys');

  // Search & Filter State for Passkeys Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'user' | 'admin'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'disabled' | 'pending'>('all');

  // Search & Filter State for Registered Users Tab
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'ACTIVE' | 'DISABLED'>('all');

  // Filter State for Payment Requests Tab
  const [paymentFilterStatus, setPaymentFilterStatus] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');

  // New Passkey Modal / Section Toggle
  const [isResetAdminOpen, setIsResetAdminOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [topUpPasskeyId, setTopUpPasskeyId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(10);

  // Newly Generated Passkey Notification
  const [generatedSuccessItem, setGeneratedSuccessItem] = useState<PasskeyItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Manual Add Form State
  const [manualKey, setManualKey] = useState('');
  const [manualRole, setManualRole] = useState<'admin' | 'user'>('user');
  const [manualStatus, setManualStatus] = useState<boolean>(true);
  const [manualDesc, setManualDesc] = useState('');
  const [manualError, setManualError] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('pkg_std');
  const [manualPaymentStatus, setManualPaymentStatus] = useState<PaymentStatus>('ACTIVE');
  const [customUsagesCount, setCustomUsagesCount] = useState<number>(10);

  // Token Package Manager Form State
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [pkgName, setPkgName] = useState('');
  const [pkgUsages, setPkgUsages] = useState<number>(5);
  const [pkgPrice, setPkgPrice] = useState('TSh 15,000');
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [editPkgName, setEditPkgName] = useState('');
  const [editPkgUsages, setEditPkgUsages] = useState<number>(5);
  const [editPkgPrice, setEditPkgPrice] = useState('');

  // Service Manager Form State
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [srvName, setSrvName] = useState('');
  const [srvAuthority, setSrvAuthority] = useState('');
  const [srvDescription, setSrvDescription] = useState('');
  const [srvCategory, setSrvCategory] = useState('Identity');
  const [srvIconName, setSrvIconName] = useState('Nida');
  const [srvTokenCost, setSrvTokenCost] = useState<number>(1);
  const [srvFeaturesInput, setSrvFeaturesInput] = useState('');
  const [editingSrvId, setEditingSrvId] = useState<string | null>(null);
  const [editSrvName, setEditSrvName] = useState('');
  const [editSrvAuthority, setEditSrvAuthority] = useState('');
  const [editSrvDescription, setEditSrvDescription] = useState('');
  const [editSrvCategory, setEditSrvCategory] = useState('');
  const [editSrvIconName, setEditSrvIconName] = useState('');
  const [editSrvTokenCost, setEditSrvTokenCost] = useState<number>(1);
  const [editSrvFeaturesInput, setEditSrvFeaturesInput] = useState('');

  // Reset Admin Passkey Form State
  const [currentAdminKeyInput, setCurrentAdminKeyInput] = useState('');
  const [newAdminKeyInput, setNewAdminKeyInput] = useState('');
  const [confirmAdminKeyInput, setConfirmAdminKeyInput] = useState('');
  const [showCurrentAdminKey, setShowCurrentAdminKey] = useState(false);
  const [showNewAdminKey, setShowNewAdminKey] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  // Action feedback message
  const [adminActionNotice, setAdminActionNotice] = useState<string | null>(null);

  // Copy handler
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Search and Sort Logic for Passkeys
  const sortedAndFilteredPasskeys = useMemo(() => {
    let list = [...activePasskeys];

    list.sort((a, b) => {
      const timeA = a.createdAtTimestamp || new Date(a.createdDate).getTime() || 0;
      const timeB = b.createdAtTimestamp || new Date(b.createdDate).getTime() || 0;
      return timeB - timeA;
    });

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.key.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query)) ||
          p.role.toLowerCase().includes(query) ||
          (p.active ? 'active' : 'disabled').includes(query) ||
          (p.paymentStatus || '').toLowerCase().includes(query) ||
          (p.packageName || '').toLowerCase().includes(query)
      );
    }

    if (filterRole !== 'all') {
      list = list.filter((p) => p.role === filterRole);
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        list = list.filter((p) => p.paymentStatus === 'PENDING');
      } else {
        list = list.filter((p) => (filterStatus === 'active' ? p.active : !p.active));
      }
    }

    return list;
  }, [activePasskeys, searchQuery, filterRole, filterStatus]);

  const pendingManualCount = useMemo(() => {
    return (manualRequests || []).filter((r) => r.status === 'PENDING').length;
  }, [manualRequests]);

  const renderManualRequestsTab = () => {
    return <ManualRequestsAdminTab />;
  };

  // Filtered Registered Users
  const filteredRegisteredUsers = useMemo(() => {
    let list = [...registeredUsers];

    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.phone.includes(q) ||
          u.passkey.toLowerCase().includes(q) ||
          (u.currentService || '').toLowerCase().includes(q)
      );
    }

    if (userStatusFilter !== 'all') {
      list = list.filter((u) => u.status === userStatusFilter);
    }

    return list;
  }, [registeredUsers, userSearchQuery, userStatusFilter]);

  // Filtered Payment Requests
  const filteredPaymentRequests = useMemo(() => {
    let list = [...paymentRequests];

    if (paymentFilterStatus !== 'all') {
      list = list.filter((r) => r.status === paymentFilterStatus);
    }

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [paymentRequests, paymentFilterStatus]);

  // Overview Metrics Calculations
  const totalUserPasskeys = activePasskeys.filter((p) => p.role === 'user').length;
  const activeUserPasskeys = activePasskeys.filter((p) => p.role === 'user' && p.active).length;
  const disabledUserPasskeys = activePasskeys.filter((p) => p.role === 'user' && !p.active).length;
  const pendingUserPayments = activePasskeys.filter((p) => p.role === 'user' && p.paymentStatus === 'PENDING').length;

  const totalAdminPasskeys = activePasskeys.filter((p) => p.role === 'admin').length;
  const activeAdminPasskeys = activePasskeys.filter((p) => p.role === 'admin' && p.active).length;
  const disabledAdminPasskeys = activePasskeys.filter((p) => p.role === 'admin' && !p.active).length;

  const totalUsagesAllocated = activePasskeys
    .filter((p) => p.role === 'user')
    .reduce((acc, p) => acc + (p.totalUsages ?? 0), 0);
  const totalUsagesConsumed = activePasskeys
    .filter((p) => p.role === 'user')
    .reduce((acc, p) => acc + (p.usedUsages ?? 0), 0);
  const totalUsagesRemaining = activePasskeys
    .filter((p) => p.role === 'user')
    .reduce((acc, p) => acc + (p.remainingUsages ?? 0), 0);

  const pendingPaymentCount = paymentRequests.filter((r) => r.status === 'PENDING').length;
  const onlineUserCount = registeredUsers.filter((u) => u.isOnline).length;

  // Handlers for Passkey generation
  const handleGenerateUser = (usagesCount: number = 20) => {
    const pkg = USAGE_PACKAGES.find((p) => p.usages === usagesCount) || USAGE_PACKAGES[1];
    const newPasskey = generateUserPasskey('Admin Generated Passkey', usagesCount, {
      paymentStatus: 'ACTIVE',
      packageName: pkg.name,
      packagePrice: pkg.priceTzs ? `TSh ${pkg.priceTzs.toLocaleString()}` : 'Custom',
    });
    setGeneratedSuccessItem(newPasskey);
  };

  const handleGenerateAdmin = () => {
    const newPasskey = generateAdminPasskey('Admin Gateway Credential');
    setGeneratedSuccessItem(newPasskey);
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');

    if (!manualKey.trim()) {
      setManualError('Passkey key cannot be empty');
      return;
    }

    const keyExists = activePasskeys.some(
      (p) => p.key.toLowerCase() === manualKey.trim().toLowerCase()
    );

    if (keyExists) {
      setManualError('This Passkey already exists in the system!');
      return;
    }

    const pkg = USAGE_PACKAGES.find((p) => p.id === selectedPackageId) || USAGE_PACKAGES[0];
    const usages = manualRole === 'admin' ? 99999 : (selectedPackageId === 'pkg_custom' ? customUsagesCount : pkg.usages);

    addPasskey({
      key: manualKey.trim(),
      role: manualRole,
      active: manualStatus,
      description: manualDesc.trim() || `${manualRole.toUpperCase()} Passkey`,
      createdBy: 'Admin',
      totalUsages: usages,
      usedUsages: 0,
      remainingUsages: usages,
      paymentStatus: manualPaymentStatus,
      packageName: pkg.name,
      packagePrice: pkg.priceTzs ? `TSh ${pkg.priceTzs.toLocaleString()}` : 'Custom',
    });

    setManualKey('');
    setManualDesc('');
    setManualError('');
    setIsManualAddOpen(false);
  };

  const handleTopUpSubmit = (passkeyId: string) => {
    if (topUpAmount <= 0) return;
    addUsagesToPasskey(passkeyId, topUpAmount);
    setTopUpPasskeyId(null);
  };

  const handleResetAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccessMessage('');

    if (!currentAdminKeyInput.trim()) {
      setResetError('Please enter your Current Admin Passkey');
      return;
    }

    if (!newAdminKeyInput.trim()) {
      setResetError('Please enter your New Admin Passkey');
      return;
    }

    if (newAdminKeyInput.trim() !== confirmAdminKeyInput.trim()) {
      setResetError('New Passkey and Confirm Passkey do not match!');
      return;
    }

    const result = resetAdminPasskey(currentAdminKeyInput, newAdminKeyInput);
    if (result.success) {
      setResetSuccessMessage('Admin Passkey Updated Successfully');
      setCurrentAdminKeyInput('');
      setNewAdminKeyInput('');
      setConfirmAdminKeyInput('');
      setIsResetAdminOpen(false);
    } else {
      setResetError(result.message);
    }
  };

  const handleApprovePayment = (reqId: string) => {
    const res = approvePaymentRequest(reqId);
    if (res.success) {
      setAdminActionNotice('Payment approved successfully! Usages activated.');
      setTimeout(() => setAdminActionNotice(null), 3500);
    }
  };

  const handleRejectPayment = (reqId: string) => {
    const res = rejectPaymentRequest(reqId);
    if (res.success) {
      setAdminActionNotice('Payment request rejected.');
      setTimeout(() => setAdminActionNotice(null), 3500);
    }
  };

  // Escape key listener
  useEffect(() => {
    const handleOpenTab = (e: any) => {
      if (e.detail) {
        setActiveAdminTab(e.detail);
      }
    };
    window.addEventListener('open-admin-tab', handleOpenTab);
    return () => window.removeEventListener('open-admin-tab', handleOpenTab);
  }, []);

  useEffect(() => {
    if (!isPasskeyManagerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPasskeyManagerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPasskeyManagerOpen, setPasskeyManagerOpen]);

  if (!isPasskeyManagerOpen || authRole !== 'admin') return null;

  return (
    <div
      onClick={() => setPasskeyManagerOpen(false)}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-sans cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FFFFFF] text-[#000000] border border-[#dadcdc] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] cursor-default"
      >
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 bg-[#F8F9FA] border-b border-[#E7E9EB] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-[#47A5FF] to-blue-600 rounded-xl text-white shadow-md">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-[#000000]">
                  Admin Control & Usage Management System
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-[#555555]">
                Manage passkeys, usage balances, registered accounts, and payment approvals.
              </p>
            </div>
          </div>

          <button
            onClick={() => setPasskeyManagerOpen(false)}
            className="p-2 rounded-xl hover:bg-[#E7E9EB] text-[#555555] hover:text-[#000000] transition-colors cursor-pointer"
            title="Close Passkey Manager"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Notice Alert */}
        {adminActionNotice && (
          <div className="px-6 py-2 bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs shrink-0 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{adminActionNotice}</span>
          </div>
        )}



        {/* Admin Navigation Tabs */}
        <div className="px-4 sm:px-6 bg-[#F8F9FA] border-b border-[#E7E9EB] flex items-center gap-2 overflow-x-auto shrink-0 py-2.5">
          <button
            type="button"
            onClick={() => setActiveAdminTab('passkeys')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeAdminTab === 'passkeys'
                ? 'bg-[#101010] text-white shadow-sm'
                : 'bg-white text-[#555555] hover:text-[#000000] border border-[#dadcdc]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Passkeys & Usages</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
              {activePasskeys.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('manual_requests')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeAdminTab === 'manual_requests'
                ? 'bg-[#101010] text-white shadow-sm'
                : 'bg-white text-[#555555] hover:text-[#000000] border border-[#dadcdc]'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>Manual Requests</span>
            {pendingManualCount > 0 ? (
              <span className="px-2 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-extrabold animate-pulse">
                {pendingManualCount} PENDING
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 text-gray-700 font-bold">
                {manualRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeAdminTab === 'users'
                ? 'bg-[#101010] text-white shadow-sm'
                : 'bg-white text-[#555555] hover:text-[#000000] border border-[#dadcdc]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Registered Users & Live Activity</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
              {registeredUsers.length}
            </span>
            {onlineUserCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('payments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeAdminTab === 'payments'
                ? 'bg-[#101010] text-white shadow-sm'
                : 'bg-white text-[#555555] hover:text-[#000000] border border-[#dadcdc]'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Payment Requests</span>
            {pendingPaymentCount > 0 ? (
              <span className="px-2 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-extrabold animate-bounce">
                {pendingPaymentCount} PENDING
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 text-gray-700 font-bold">
                {paymentRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('packages')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeAdminTab === 'packages'
                ? 'bg-[#101010] text-white shadow-sm'
                : 'bg-white text-[#555555] hover:text-[#000000] border border-[#dadcdc]'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Token Packages</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800 font-bold">
              {(tokenPackages || []).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('services')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeAdminTab === 'services'
                ? 'bg-[#101010] text-white shadow-sm'
                : 'bg-white text-[#555555] hover:text-[#000000] border border-[#dadcdc]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Services</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              {(services || []).length}
            </span>
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">

          {/* TAB: MANUAL REQUESTS */}
          {activeAdminTab === 'manual_requests' && renderManualRequestsTab()}

          {/* TAB 1: PASSKEYS & USAGES */}
          {activeAdminTab === 'passkeys' && (
            <div className="space-y-5 divide-y divide-[#E7E9EB]">
              {/* Overview Metrics Cards */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-2.5">
                  <div className="p-2.5 sm:p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-purple-900 text-[11px] font-bold">
                      <span>Total Admin</span>
                      <Shield className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-black text-purple-950 mt-1 font-mono">
                      {totalAdminPasskeys}
                    </div>
                    <span className="text-[9px] text-purple-600 font-semibold">Admin Passkeys</span>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-emerald-900 text-[11px] font-bold">
                      <span>Active Admin</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-black text-emerald-950 mt-1 font-mono">
                      {activeAdminPasskeys}
                    </div>
                    <span className="text-[9px] text-emerald-600 font-semibold">Active Keys</span>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-red-50/70 border border-red-200/80 rounded-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-red-900 text-[11px] font-bold">
                      <span>Disabled Admin</span>
                      <UserX className="w-3.5 h-3.5 text-red-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-black text-red-950 mt-1 font-mono">
                      {disabledAdminPasskeys}
                    </div>
                    <span className="text-[9px] text-red-600 font-semibold">Blocked Keys</span>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-blue-900 text-[11px] font-bold">
                      <span>Total Users</span>
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-black text-blue-950 mt-1 font-mono">
                      {totalUserPasskeys}
                    </div>
                    <span className="text-[9px] text-blue-600 font-semibold">User Passkeys</span>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-teal-900 text-[11px] font-bold">
                      <span>Active Users</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-black text-teal-950 mt-1 font-mono">
                      {activeUserPasskeys}
                    </div>
                    <span className="text-[9px] text-teal-600 font-semibold">Active Keys</span>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-amber-900 text-[11px] font-bold">
                      <span>Pending Pay</span>
                      <Ticket className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-black text-amber-950 mt-1 font-mono">
                      {pendingUserPayments}
                    </div>
                    <span className="text-[9px] text-amber-600 font-semibold">Awaiting Approval</span>
                  </div>
                </div>

                {/* Usages Allowance System Metrics */}
                <div className="p-3 bg-emerald-900 text-white rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-800 rounded-lg">
                      <Ticket className="w-5 h-5 text-emerald-300" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                        System Usage Balance Allowance Tracker
                      </h4>
                      <p className="text-[11px] text-emerald-100/80">
                        Real-time usages allocated, consumed, and remaining for user passkeys.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono font-bold">
                    <div className="text-center">
                      <span className="block text-[10px] text-emerald-300 uppercase font-sans font-semibold">Allocated</span>
                      <span className="text-emerald-100 text-sm">{totalUsagesAllocated}</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[10px] text-amber-300 uppercase font-sans font-semibold">Used</span>
                      <span className="text-amber-200 text-sm">{totalUsagesConsumed}</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[10px] text-emerald-400 uppercase font-sans font-semibold">Remaining</span>
                      <span className="text-white text-base font-extrabold">{totalUsagesRemaining}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Passkey Generators */}
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-[#000000] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Passkey Generators & Quick Operations
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => handleGenerateUser(1)}
                    className="p-3 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-blue-900 font-bold text-xs">
                      <span className="flex items-center gap-1.5">
                        <PlusCircle className="w-4 h-4 text-blue-600" />
                        Generate User Passkey
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-blue-700/80 mt-1">
                      Instantly generates a random user passkey with 1 usage assigned.
                    </p>
                  </button>

                  <button
                    onClick={handleGenerateAdmin}
                    className="p-3 bg-purple-50/80 hover:bg-purple-100/80 border border-purple-200 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-purple-900 font-bold text-xs">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-purple-600" />
                        Generate Admin Passkey
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-purple-700/80 mt-1">
                      Generates a secure administrative gateway passkey with full rights.
                    </p>
                  </button>

                  <button
                    onClick={() => setIsManualAddOpen(!isManualAddOpen)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-slate-900 font-bold text-xs">
                      <span className="flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-slate-700" />
                        Custom Passkey Entry
                      </span>
                      <Key className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Manually type a custom passkey string and assign package usages.
                    </p>
                  </button>
                </div>

                {/* Newly Generated Passkey Success Banner */}
                {generatedSuccessItem && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-xs font-extrabold text-emerald-900 block">
                          New {generatedSuccessItem.role.toUpperCase()} Passkey Created!
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-sm font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-950">
                            {generatedSuccessItem.key}
                          </code>
                          <span className="text-[11px] text-emerald-700 font-semibold">
                            ({generatedSuccessItem.remainingUsages} Usages)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleCopyKey(generatedSuccessItem.key)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {copiedKey === generatedSuccessItem.key ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Key</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setGeneratedSuccessItem(null)}
                        className="p-1.5 text-emerald-700 hover:text-emerald-950 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Passkeys Table & Filter List */}
              <div className="pt-4 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search passkey, role, status..."
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#dadcdc] rounded-xl text-xs text-[#000000] focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={filterRole}
                      onChange={(e: any) => setFilterRole(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-[#dadcdc] rounded-xl text-xs font-semibold text-[#000000]"
                    >
                      <option value="all">All Roles</option>
                      <option value="user">User Role Only</option>
                      <option value="admin">Admin Role Only</option>
                    </select>

                    <select
                      value={filterStatus}
                      onChange={(e: any) => setFilterStatus(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-[#dadcdc] rounded-xl text-xs font-semibold text-[#000000]"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active Only</option>
                      <option value="disabled">Disabled Only</option>
                      <option value="pending">Pending Payment Only</option>
                    </select>
                  </div>
                </div>

                {/* Passkey Cards List */}
                <div className="space-y-2">
                  {sortedAndFilteredPasskeys.map((p) => {
                    const isUser = p.role === 'user';
                    const isPending = p.paymentStatus === 'PENDING';

                    return (
                      <div
                        key={p.id}
                        className={`p-3 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          !p.active
                            ? 'bg-red-50/30 border-red-200/60'
                            : isPending
                            ? 'bg-amber-50/40 border-amber-200/80'
                            : isUser
                            ? 'bg-blue-50/30 border-blue-100'
                            : 'bg-purple-50/30 border-purple-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-xl text-white shrink-0 mt-0.5 ${
                              p.role === 'admin'
                                ? 'bg-purple-600'
                                : isPending
                                ? 'bg-amber-500'
                                : p.active
                                ? 'bg-emerald-600'
                                : 'bg-red-500'
                            }`}
                          >
                            {p.role === 'admin' ? (
                              <Shield className="w-4 h-4" />
                            ) : (
                              <Key className="w-4 h-4" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-sm text-[#000000] tracking-wider bg-white px-2 py-0.5 rounded border border-[#dadcdc]">
                                {p.key}
                              </span>

                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  p.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}
                              >
                                {p.role}
                              </span>

                              {isUser && (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                    isPending
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : p.active
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-red-100 text-red-800 border border-red-300'
                                  }`}
                                >
                                  {isPending ? 'Pending Pay' : p.active ? 'Active' : 'Disabled'}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-[#555555] mt-1 font-medium">
                              {p.description || 'Passkey Credential'} • Created: {p.createdDate}
                            </p>

                            {/* Usages Bar for Users */}
                            {isUser && (
                              <div className="mt-2 flex items-center gap-3 text-xs font-sans">
                                <div className="flex items-center gap-1.5">
                                  <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="font-semibold text-gray-700">
                                    Usages: <strong className="font-mono text-gray-950">{p.remainingUsages}</strong> / {p.totalUsages} remaining
                                  </span>
                                </div>
                                <span className="text-gray-400">•</span>
                                <span className="text-[#555555] font-medium">
                                  {p.packageName || 'Package'} ({p.packagePrice || 'Standard'})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleCopyKey(p.key)}
                            className="p-1.5 rounded-lg border border-[#dadcdc] hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
                            title="Copy Passkey"
                          >
                            {copiedKey === p.key ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>

                          {isUser && (
                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 border border-gray-200">
                              <button
                                onClick={() => addUsagesToPasskey(p.id, -1)}
                                className="w-6 h-6 flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-200 rounded text-gray-700 transition-colors"
                                title="Deduct 1 usage"
                              >
                                -
                              </button>
                              <span className="text-[10px] font-bold text-gray-600 px-1 uppercase font-mono">Tokens</span>
                              <button
                                onClick={() => addUsagesToPasskey(p.id, 1)}
                                className="w-6 h-6 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded text-emerald-700 transition-colors"
                                title="Add 1 usage"
                              >
                                +
                              </button>
                              <button
                                onClick={() => {
                                  const valStr = prompt("Weka idadi ya kuongeza (mfano 5) au kupunguza (mfano -5):\nEnter amount to add (e.g. 5) or deduct (e.g. -5):", "5");
                                  if (valStr !== null) {
                                    const parsed = parseInt(valStr);
                                    if (!isNaN(parsed)) {
                                      addUsagesToPasskey(p.id, parsed);
                                    }
                                  }
                                }}
                                className="px-2 py-1 bg-blue-600 text-white font-extrabold text-[9px] rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                                title="Adjust custom usages"
                              >
                                Adjust
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => togglePasskeyStatus(p.id)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              p.active
                                ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                                : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={p.active ? 'Disable Passkey' : 'Activate Passkey'}
                          >
                            {p.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>

                          <button
                            onClick={() => deletePasskey(p.id)}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                            title="Delete Passkey"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTERED USERS & LIVE ACTIVITY (PROMPT 22 & 23) */}
          {activeAdminTab === 'users' && (
            <div className="space-y-4">
              {/* Header metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <span className="text-[11px] font-bold text-blue-900 block">Total Registered</span>
                  <span className="text-xl font-black text-blue-950 font-mono mt-0.5 block">{registeredUsers.length}</span>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <span className="text-[11px] font-bold text-emerald-900 block flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Online Now
                  </span>
                  <span className="text-xl font-black text-emerald-950 font-mono mt-0.5 block">{onlineUserCount}</span>
                </div>
                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl">
                  <span className="text-[11px] font-bold text-teal-900 block">Active Status</span>
                  <span className="text-xl font-black text-teal-950 font-mono mt-0.5 block">
                    {registeredUsers.filter((u) => u.status === 'ACTIVE').length}
                  </span>
                </div>
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                  <span className="text-[11px] font-bold text-purple-900 block">Total Usages Remaining</span>
                  <span className="text-xl font-black text-purple-950 font-mono mt-0.5 block">{totalUsagesRemaining}</span>
                </div>
              </div>

              {/* Search & Status Filter */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search name, phone, passkey..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#dadcdc] rounded-xl text-xs text-[#000000] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-semibold">Filter Status:</span>
                  <select
                    value={userStatusFilter}
                    onChange={(e: any) => setUserStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-[#dadcdc] rounded-xl text-xs font-semibold text-[#000000]"
                  >
                    <option value="all">All Accounts</option>
                    <option value="ACTIVE">ACTIVE Only</option>
                    <option value="DISABLED">DISABLED Only</option>
                  </select>
                </div>
              </div>

              {/* Registered Users Table / Cards List */}
              <div className="space-y-3 pt-2">
                {filteredRegisteredUsers.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-600 font-medium">No users found.</p>
                  </div>
                ) : (
                  filteredRegisteredUsers.map((u) => {
                    const passkeyItem = activePasskeys.find(
                      (p) => p.id === u.passkeyId || p.key.toLowerCase() === u.passkey.toLowerCase()
                    );
                    const remaining = passkeyItem ? passkeyItem.remainingUsages : 0;
                    const total = passkeyItem ? passkeyItem.totalUsages : 0;

                    return (
                      <div
                        key={u.id}
                        className={`p-4 rounded-xl border transition-all space-y-3 ${
                          u.status === 'ACTIVE'
                            ? 'bg-white border-[#dadcdc] shadow-xs'
                            : 'bg-red-50/40 border-red-200'
                        }`}
                      >
                        {/* Top row: Name, Phone, Status, Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                              {u.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-extrabold text-gray-950">{u.fullName}</h4>
                                <span
                                  className={`px-2 py-0.2 rounded text-[10px] font-extrabold uppercase ${
                                    u.status === 'ACTIVE'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-red-100 text-red-800 border border-red-300'
                                  }`}
                                >
                                  {u.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 font-medium mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-gray-400" /> {u.phone}
                                </span>
                                <span>•</span>
                                <span>Passkey: <code className="font-mono font-bold text-gray-900 bg-gray-100 px-1.5 py-0.2 rounded">{u.passkey}</code></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => toggleUserStatus(u.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                                u.status === 'ACTIVE'
                                  ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                                  : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                              }`}
                            >
                              {u.status === 'ACTIVE' ? 'Disable Account' : 'Activate Account'}
                            </button>
                            <button
                              onClick={() => deleteRegisteredUser(u.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Middle row: Live Activity Tracker (PROMPT 23) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                          {/* Live Online/Offline Status */}
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                u.isOnline ? 'bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500/50' : 'bg-slate-400'
                              }`}
                            />
                            <div>
                              <span className="text-[10px] text-slate-500 font-bold uppercase block">Activity Status</span>
                              <span className={`font-bold ${u.isOnline ? 'text-emerald-700' : 'text-slate-600'}`}>
                                {u.isOnline ? 'ONLINE NOW' : 'OFFLINE'}
                              </span>
                            </div>
                          </div>

                          {/* Current Service */}
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">Current Service</span>
                            <span className="font-bold text-slate-900">{u.currentService || 'NIDA Services'}</span>
                          </div>

                          {/* Current Activity / Last Active */}
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">Current Activity / Last Active</span>
                            <span className="font-semibold text-slate-700">{u.currentActivity || 'Browsing Services'} ({u.lastActive})</span>
                          </div>
                        </div>

                        {/* Bottom row: Usage balance & Services used */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs pt-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-gray-500 font-bold">Services Used:</span>
                            {u.servicesUsed && u.servicesUsed.length > 0 ? (
                              u.servicesUsed.map((s, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200 text-[11px]">
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 italic">None yet</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 font-mono text-xs font-bold text-gray-800">
                            <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Remaining Usages: <strong className="text-emerald-600 text-sm font-extrabold">{remaining}</strong> / {total}</span>
                          </div>
                        </div>

                        {/* Welcome Token & Anti-Abuse Status Badge */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs pt-2 border-t border-gray-100 font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              passkeyItem?.welcomeTokenGranted ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {passkeyItem?.welcomeTokenGranted ? '✓ Welcome Token Granted (1)' : '✗ Welcome Token Denied / Already Claimed'}
                            </span>
                            {passkeyItem?.welcomeTokenGrantedAt && (
                              <span className="text-gray-500 font-mono text-[11px]">
                                Granted: {passkeyItem.welcomeTokenGrantedAt} (ID: <code className="text-gray-900 font-bold">{passkeyItem.grantId}</code>)
                              </span>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            passkeyItem?.suspiciousStatus?.includes('Flagged') ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}>
                            Security: {passkeyItem?.suspiciousStatus || 'Normal / Verified'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENT REQUESTS (PROMPT 26) */}
          {activeAdminTab === 'payments' && (
            <div className="space-y-4">
              {/* Header metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl">
                  <span className="text-xs font-bold text-amber-900 block">Pending Confirmations</span>
                  <span className="text-2xl font-black text-amber-950 font-mono mt-0.5 block">{pendingPaymentCount}</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl">
                  <span className="text-xs font-bold text-emerald-900 block">Approved Payments</span>
                  <span className="text-2xl font-black text-emerald-950 font-mono mt-0.5 block">
                    {paymentRequests.filter((r) => r.status === 'APPROVED').length}
                  </span>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-300 rounded-xl">
                  <span className="text-xs font-bold text-purple-900 block">System Lipa Number</span>
                  <span className="text-2xl font-black text-purple-950 font-mono mt-0.5 block">1234678</span>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                {(['all', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setPaymentFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      paymentFilterStatus === st
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {st === 'all' ? 'All Payments' : st}
                  </button>
                ))}
              </div>

              {/* Payment Requests List */}
              <div className="space-y-3">
                {filteredPaymentRequests.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <Receipt className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-600 font-medium">No payment requests at this time.</p>
                  </div>
                ) : (
                  filteredPaymentRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        req.status === 'PENDING'
                          ? 'bg-amber-50/50 border-amber-300 shadow-xs'
                          : req.status === 'APPROVED'
                          ? 'bg-emerald-50/40 border-emerald-300'
                          : 'bg-red-50/40 border-red-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-extrabold text-gray-950">{req.userName}</h4>
                          <span className="text-xs text-gray-500 font-mono">({req.userPhone})</span>
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              req.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                : req.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-red-100 text-red-900 border border-red-300'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>

                        <div className="text-xs text-gray-700 font-medium flex items-center gap-3 flex-wrap">
                          <span>Package: <strong className="text-gray-950">{req.packageName}</strong></span>
                          <span>•</span>
                          <span>Amount: <strong className="text-emerald-700 font-mono">{req.amount}</strong></span>
                          <span>•</span>
                          <span>Usages: <strong className="text-blue-700 font-mono">+{req.requestedUsages}</strong></span>
                        </div>

                        <div className="text-[11px] text-gray-500 flex items-center gap-3">
                          <span>Requested Date: {req.date}</span>
                          <span>•</span>
                          <span>Lipa No: <code className="font-mono font-bold text-gray-800">{req.lipaNumber}</code></span>
                        </div>
                      </div>

                      {/* Admin Decision Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {req.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleApprovePayment(req.id)}
                              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckSquare className="w-4 h-4" />
                              <span>Thibitisha Malipo (Approve)</span>
                            </button>
                            <button
                              onClick={() => handleRejectPayment(req.id)}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <XSquare className="w-4 h-4" />
                              <span>Kataa (Reject)</span>
                            </button>
                          </>
                        ) : (
                          <div className="text-xs text-gray-500 font-semibold italic">
                            Reviewed: {req.reviewedDate || 'Completed'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TOKEN PACKAGE MANAGER */}
          {activeAdminTab === 'packages' && (
            <div className="space-y-5">
              {/* Header Actions */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-gray-950">Token Package Manager</h3>
                  <p className="text-xs text-gray-500">Add, edit, or disable token purchase options for users</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddPackageOpen(!isAddPackageOpen);
                    setEditingPkgId(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#101010] hover:bg-[#252525] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{isAddPackageOpen ? 'Hide Form' : 'Add Package'}</span>
                </button>
              </div>

              {/* Add / Edit Package Panel */}
              {(isAddPackageOpen || editingPkgId !== null) && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4 shadow-inner animate-in slide-in-from-top-3 duration-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    {editingPkgId ? 'Edit Token Package' : 'Create New Token Package'}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Package Name</label>
                      <input
                        type="text"
                        value={editingPkgId ? editPkgName : pkgName}
                        onChange={(e) => editingPkgId ? setEditPkgName(e.target.value) : setPkgName(e.target.value)}
                        placeholder="e.g. 10 Usages Premium"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Number of Tokens</label>
                      <input
                        type="number"
                        value={editingPkgId ? editPkgUsages : pkgUsages}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          editingPkgId ? setEditPkgUsages(val) : setPkgUsages(val);
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Price Representation</label>
                      <input
                        type="text"
                        value={editingPkgId ? editPkgPrice : pkgPrice}
                        onChange={(e) => editingPkgId ? setEditPkgPrice(e.target.value) : setPkgPrice(e.target.value)}
                        placeholder="e.g. TSh 50,000"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddPackageOpen(false);
                        setEditingPkgId(null);
                      }}
                      className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (editingPkgId) {
                          editTokenPackage(editingPkgId, {
                            name: editPkgName,
                            usages: editPkgUsages,
                            price: editPkgPrice,
                          });
                          setEditingPkgId(null);
                          setAdminActionNotice('Token package updated successfully!');
                        } else {
                          addTokenPackage({
                            name: pkgName || `${pkgUsages} Usages Package`,
                            usages: pkgUsages,
                            price: pkgPrice || 'TSh 15,000',
                            active: true,
                          });
                          setPkgName('');
                          setIsAddPackageOpen(false);
                          setAdminActionNotice('New token package created!');
                        }
                        setTimeout(() => setAdminActionNotice(null), 3000);
                      }}
                      className="px-4 py-2 bg-[#101010] text-white text-xs font-bold rounded-xl hover:bg-black transition-colors"
                    >
                      Save Package
                    </button>
                  </div>
                </div>
              )}

              {/* Package List */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700 uppercase">Available Packages</span>
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-700 font-mono text-[10px] rounded font-bold">
                    {(tokenPackages || []).length} Total
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {(tokenPackages || []).length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-xs">
                      No purchase packages found. Please add a package using the form above.
                    </div>
                  ) : (
                    tokenPackages.map((pkg) => (
                      <div key={pkg.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-gray-950">{pkg.name}</h4>
                            <span
                              className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase ${
                                pkg.active !== false
                                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                                  : 'bg-red-100 text-red-950 border border-red-200'
                              }`}
                            >
                              {pkg.active !== false ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 font-mono mt-1 flex items-center gap-3">
                            <span>Tokens: <strong className="text-blue-700">{pkg.usages}</strong></span>
                            <span>•</span>
                            <span>Display Price: <strong className="text-emerald-700">{pkg.price}</strong></span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPkgId(pkg.id);
                              setEditPkgName(pkg.name);
                              setEditPkgUsages(pkg.usages);
                              setEditPkgPrice(pkg.price);
                              setIsAddPackageOpen(false);
                            }}
                            className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              toggleTokenPackage(pkg.id);
                              setAdminActionNotice(`Token package status changed!`);
                              setTimeout(() => setAdminActionNotice(null), 3000);
                            }}
                            className={`p-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                              pkg.active !== false
                                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {pkg.active !== false ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete token package "${pkg.name}"?`)) {
                                deleteTokenPackage(pkg.id);
                                setAdminActionNotice('Token package deleted.');
                                setTimeout(() => setAdminActionNotice(null), 3000);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SERVICE MANAGER */}
          {activeAdminTab === 'services' && (
            <div className="space-y-5">
              {/* Header Actions */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-gray-950">Service Manager</h3>
                  <p className="text-xs text-gray-500">Configure layout endpoints, access permissions, and token costs</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddServiceOpen(!isAddServiceOpen);
                    setEditingSrvId(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#101010] hover:bg-[#252525] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{isAddServiceOpen ? 'Hide Form' : 'Add Service'}</span>
                </button>
              </div>

              {/* Add / Edit Service Panel */}
              {(isAddServiceOpen || editingSrvId !== null) && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4 shadow-inner animate-in slide-in-from-top-3 duration-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    {editingSrvId ? 'Edit Active Service' : 'Configure New Portal Service'}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Service ID (Unique)</label>
                      <input
                        type="text"
                        value={editingSrvId || srvName.toLowerCase().replace(/\s+/g, '_')}
                        disabled={!!editingSrvId}
                        placeholder="e.g. driving_license"
                        className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-xs text-gray-600 font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Service Display Name</label>
                      <input
                        type="text"
                        value={editingSrvId ? editSrvName : srvName}
                        onChange={(e) => editingSrvId ? setEditSrvName(e.target.value) : setSrvName(e.target.value)}
                        placeholder="e.g. Driving Licence"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Authority Body</label>
                      <input
                        type="text"
                        value={editingSrvId ? editSrvAuthority : srvAuthority}
                        onChange={(e) => editingSrvId ? setEditSrvAuthority(e.target.value) : setSrvAuthority(e.target.value)}
                        placeholder="e.g. SUMATRA / NIDA"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Category Group</label>
                      <input
                        type="text"
                        value={editingSrvId ? editSrvCategory : srvCategory}
                        onChange={(e) => editingSrvId ? setEditSrvCategory(e.target.value) : setSrvCategory(e.target.value)}
                        placeholder="e.g. Identity"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Token Cost (Deduction)</label>
                      <input
                        type="number"
                        value={editingSrvId ? editSrvTokenCost : srvTokenCost}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          editingSrvId ? setEditSrvTokenCost(val) : setSrvTokenCost(val);
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Description (User Facing)</label>
                    <input
                      type="text"
                      value={editingSrvId ? editSrvDescription : srvDescription}
                      onChange={(e) => editingSrvId ? setEditSrvDescription(e.target.value) : setSrvDescription(e.target.value)}
                      placeholder="Summary details shown on dashboard cards"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Service Features (Comma-separated list)</label>
                    <input
                      type="text"
                      value={editingSrvId ? editSrvFeaturesInput : srvFeaturesInput}
                      onChange={(e) => editingSrvId ? setEditSrvFeaturesInput(e.target.value) : setSrvFeaturesInput(e.target.value)}
                      placeholder="Feature 1, Feature 2, Feature 3"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddServiceOpen(false);
                        setEditingSrvId(null);
                      }}
                      className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const parsedFeatures = (editingSrvId ? editSrvFeaturesInput : srvFeaturesInput)
                          .split(',')
                          .map((f) => f.trim())
                          .filter((f) => f.length > 0);

                        if (editingSrvId) {
                          editService(editingSrvId, {
                            name: editSrvName,
                            authority: editSrvAuthority,
                            description: editSrvDescription,
                            category: editSrvCategory,
                            iconName: editSrvIconName || 'Nida',
                            tokenCost: editSrvTokenCost,
                            features: parsedFeatures,
                          });
                          setEditingSrvId(null);
                          setAdminActionNotice('Service configuration updated!');
                        } else {
                          const customId = srvName.toLowerCase().trim().replace(/\s+/g, '_');
                          addService({
                            id: customId || 'service_' + Date.now(),
                            name: srvName,
                            authority: srvAuthority,
                            description: srvDescription,
                            category: srvCategory,
                            iconName: srvIconName,
                            tokenCost: srvTokenCost,
                            active: true,
                            features: parsedFeatures,
                          });
                          setSrvName('');
                          setSrvAuthority('');
                          setSrvDescription('');
                          setSrvFeaturesInput('');
                          setIsAddServiceOpen(false);
                          setAdminActionNotice('New portal service added!');
                        }
                        setTimeout(() => setAdminActionNotice(null), 3000);
                      }}
                      className="px-4 py-2 bg-[#101010] text-white text-xs font-bold rounded-xl hover:bg-black transition-colors"
                    >
                      Save Service
                    </button>
                  </div>
                </div>
              )}

              {/* Service List */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700 uppercase">Registered Services</span>
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-700 font-mono text-[10px] rounded font-bold">
                    {(services || []).length} Total
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {(services || []).length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-xs">
                      No active services found. Create one using the form above.
                    </div>
                  ) : (
                    services.map((srv) => (
                      <div key={srv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-gray-950">{srv.name}</h4>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-gray-100 text-gray-700 border border-gray-200">
                              ID: {srv.id}
                            </span>
                            <span
                              className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase ${
                                srv.active !== false
                                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                                  : 'bg-red-100 text-red-950 border border-red-200'
                              }`}
                            >
                              {srv.active !== false ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{srv.description}</p>
                          <div className="text-[11px] text-gray-500 font-medium mt-1 flex items-center gap-3 flex-wrap">
                            <span>Authority: <strong className="text-gray-950">{srv.authority}</strong></span>
                            <span>•</span>
                            <span>Cost: <strong className="text-rose-600 font-mono">{srv.tokenCost} Token{srv.tokenCost === 1 ? '' : 's'}</strong></span>
                            {srv.features && srv.features.length > 0 && (
                              <>
                                <span>•</span>
                                <span>Features: <code className="font-mono text-gray-700">{srv.features.join(', ')}</code></span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSrvId(srv.id);
                              setEditSrvName(srv.name);
                              setEditSrvAuthority(srv.authority);
                              setEditSrvDescription(srv.description);
                              setEditSrvCategory(srv.category);
                              setEditSrvIconName(srv.iconName);
                              setEditSrvTokenCost(srv.tokenCost);
                              setEditSrvFeaturesInput((srv.features || []).join(', '));
                              setIsAddServiceOpen(false);
                            }}
                            className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              toggleService(srv.id);
                              setAdminActionNotice(`Service status toggled.`);
                              setTimeout(() => setAdminActionNotice(null), 3000);
                            }}
                            className={`p-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                              srv.active !== false
                                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {srv.active !== false ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (srv.id === 'nida' || srv.id === 'driving_license') {
                                alert('Core system services ("nida", "driving_license") are protected and cannot be deleted.');
                                return;
                              }
                              if (confirm(`Are you sure you want to delete service "${srv.name}"?`)) {
                                deleteService(srv.id);
                                setAdminActionNotice('Service deleted.');
                                setTimeout(() => setAdminActionNotice(null), 3000);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-[#F8F9FA] border-t border-[#E7E9EB] flex items-center justify-between text-xs text-[#555555]">
          <span className="font-semibold">BIGsta Admin Gateway • System Operational</span>
          <button
            onClick={() => setPasskeyManagerOpen(false)}
            className="px-4 py-1.5 bg-[#101010] hover:bg-[#222222] text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Funga / Close
          </button>
        </div>
      </div>
    </div>
  );
};
