// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
import React, { useEffect, useState, useMemo } from 'react';
import {
  Wallet,
  Coins,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  Copy,
  Check,
  Smartphone,
  Plus,
  Settings,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  Search,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Edit2,
  Trash2,
  ChevronRight,
  Sparkles,
  Zap,
  TrendingUp,
  Receipt,
  MessageCircle,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { useTemplateStore } from '../../store/useTemplateStore';
import { UniversalBackButton } from '../common/UniversalBackButton';
import { ConfigurablePaymentMethod, UserPaymentSubmission } from '../../types';
import { PaymentMethodsAdminPanel } from '../admin/PaymentMethodsAdminPanel';

export const TokenBillingScreen: React.FC = () => {
  const {
    authRole,
    currentAuthKey,
    activePasskeys,
    paymentMethods,
    updatePaymentMethod,
    addPaymentMethod,
    deletePaymentMethod,
    userPaymentSubmissions,
    submitUserPayment,
    approveUserPayment,
    rejectUserPayment,
    tokenHistory,
    addUsagesToPasskey,
    loadTokenHistory,
    adminSettings,
    updateAdminSettings,
    tokenPackages,
    addTokenPackage,
    editTokenPackage,
    deleteTokenPackage,
    weeklyOffers,
    addWeeklyOffer,
    editWeeklyOffer,
    deleteWeeklyOffer,
    userProfile,
  } = useTemplateStore();

  const currentPasskeyObj = activePasskeys.find(p => p.key === currentAuthKey) || activePasskeys[0];
  const availableTokens = currentPasskeyObj ? currentPasskeyObj.remainingUsages : 0;

  // Active packages created by admin
  const activePackages = useMemo(() => {
    return (tokenPackages || []).filter(p => p.active !== false && p.visibility !== 'hidden');
  }, [tokenPackages]);

  // Active weekly offers created by admin
  const activeWeeklyOffers = useMemo(() => {
    const now = Date.now();
    return (weeklyOffers || []).filter((o) => o.active !== false && new Date(o.endDate).getTime() > now);
  }, [weeklyOffers]);

  // Selected Token Package
  const [selectedPkgId, setSelectedPkgId] = useState<string>('');

  useEffect(() => {
    if (activePackages.length > 0 && (!selectedPkgId || !activePackages.some(p => p.id === selectedPkgId))) {
      setSelectedPkgId(activePackages[0].id);
    }
  }, [activePackages, selectedPkgId]);

  const selectedPkg = useMemo(() => {
    const foundWeekly = activeWeeklyOffers.find(o => o.id === selectedPkgId);
    if (foundWeekly) {
      return {
        id: foundWeekly.id,
        name: foundWeekly.title || 'Weekly Offer',
        usages: foundWeekly.tokens || 10,
        price: foundWeekly.price || 'TSh 10,000',
        description: foundWeekly.description || 'Special limited time deal',
        isWeekly: true
      };
    }
    const found = activePackages.find(p => p.id === selectedPkgId);
    if (found) return found;
    return activePackages[0] || {
      id: 'pkg_default',
      name: 'Standard Package',
      usages: 10,
      price: 'TSh 10,000',
      description: 'Standard token top-up'
    };
  }, [activePackages, activeWeeklyOffers, selectedPkgId]);

  // Active Tab for Admin
  const [adminTab, setAdminTab] = useState<'queue' | 'methods' | 'packages' | 'offers' | 'adjust' | 'stats'>('queue');

  // Payment Upload Form State
  const [selectedMethod, setSelectedMethod] = useState<string>(paymentMethods[0]?.id || '');
  const [amountInput, setAmountInput] = useState<string>('10000');

  // Keep amountInput in sync with selected package price
  useEffect(() => {
    if (selectedPkg && selectedPkg.price) {
      const cleanNum = selectedPkg.price.replace(/\D/g, '');
      if (cleanNum) {
        setAmountInput(cleanNum);
      }
    }
  }, [selectedPkg]);
  const [senderInput, setSenderInput] = useState<string>('John Sample (0123 456 789)');
  const [referenceInput, setReferenceInput] = useState<string>('');
  const [uploadedImageName, setUploadedImageName] = useState<string | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState<boolean>(false);
  const [ocrExtractedData, setOcrExtractedData] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [submissionFeedback, setSubmissionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Admin Configurator State
  const [editingMethod, setEditingMethod] = useState<ConfigurablePaymentMethod | null>(null);
  const [isAddMethodOpen, setIsAddMethodOpen] = useState(false);
  const [newMethodForm, setNewMethodForm] = useState({
    name: 'M-Pesa',
    number: '',
    accountName: 'BIGSTA SERVICES LTD',
    instructions: 'Dial *150*00# -> Pay Merchant',
    status: 'active' as 'active' | 'inactive'
  });

  // Admin Package Form State
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [newPackageForm, setNewPackageForm] = useState({
    name: '',
    usages: 5,
    price: 'TSh 15,000',
    description: '',
    visibility: 'public' as 'public' | 'hidden',
    active: true,
    sortOrder: 1,
    bonus: 0,
    promotion: ''
  });

  // Admin Weekly Offer Form State
  const [isAddOfferOpen, setIsAddOfferOpen] = useState(false);
  const [newOfferForm, setNewOfferForm] = useState({
    title: 'Special Bundle Offer',
    description: 'Discounted token bundle valid for 7 days',
    tokens: 10,
    price: 'TSh 20,000',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    services: ['nida', 'driving_licence', 'nhif'],
    active: true
  });

  useEffect(() => {
    loadTokenHistory();
  }, [loadTokenHistory]);

  // Admin Token Adjust State
  const [targetPasskeyKey, setTargetPasskeyKey] = useState<string>(activePasskeys[0]?.key || '');
  const [adjustAmount, setAdjustAmount] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>('Administrative Token Adjustment');
  const [adjustFeedback, setAdjustFeedback] = useState<string | null>(null);

  // Filter Submissions Search
  const [searchQuery, setSearchQuery] = useState('');

  // Handle Copy to Clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Simulate OCR File Upload Processing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedImageName(file.name);
    setIsProcessingOCR(true);
    setOcrExtractedData(null);

    // Simulate OCR Extraction delay
    setTimeout(() => {
      // Generated reference code mock
      const mockRef = 'TZ' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const mockAmount = parseInt(amountInput) || 6000;
      
      const extracted = {
        amount: mockAmount,
        sender: senderInput || 'Mobile Money User',
        receiver: 'BIGSTA SERVICES LTD',
        reference: mockRef,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setReferenceInput(mockRef);
      setOcrExtractedData(extracted);
      setIsProcessingOCR(false);
    }, 1200);
  };

  // Handle User Payment Submission
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionFeedback(null);

    if (!amountInput || parseInt(amountInput) <= 0) {
      setSubmissionFeedback({ type: 'error', message: 'Please enter a valid amount' });
      return;
    }

    if (!referenceInput.trim()) {
      setSubmissionFeedback({ type: 'error', message: 'Please provide or extract a transaction reference code' });
      return;
    }

    const res = submitUserPayment({
      amount: parseInt(amountInput),
      sender: senderInput,
      receiver: 'BIGsta Services',
      reference: referenceInput.toUpperCase().trim(),
      date: new Date().toISOString().split('T')[0]
    });

    if (res.success) {
      setSubmissionFeedback({ type: 'success', message: 'Payment submitted successfully! Status set to Pending Verification.' });
      setReferenceInput('');
      setUploadedImageName(null);
      setOcrExtractedData(null);
    } else {
      setSubmissionFeedback({ type: 'error', message: res.message });
    }
  };

  // Handle Admin Manual Token Adjustment
  const handleAdminTokenAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPasskeyKey) return;

    addUsagesToPasskey(
      targetPasskeyKey,
      adjustAmount,
      adjustReason,
      `Admin Manual Adjustment (${targetPasskeyKey}): ${adjustReason}`
    );

    setAdjustFeedback(`Successfully granted ${adjustAmount} tokens to passkey ${targetPasskeyKey}`);
    setTimeout(() => setAdjustFeedback(null), 3000);
  };

  // Pending count & summary totals
  const pendingSubs = userPaymentSubmissions.filter(s => s.status === 'pending');
  const verifiedSubs = userPaymentSubmissions.filter(s => s.status === 'verified');
  const totalRevenue = verifiedSubs.reduce((acc, s) => acc + s.amount, 0);

  const filteredSubs = userPaymentSubmissions.filter(s =>
    s.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 text-[#111827]">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UniversalBackButton />
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#2563EB]" />
                Token Billing & Top-Up
              </h1>
              <p className="text-xs text-slate-500">
                {authRole === 'admin' ? 'CEO Admin Billing & Payment Gateway Control' : 'Manage your token wallet, submit payment receipts & track history'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              {availableTokens} Tokens Available
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">

        {/* USER ROLE VIEW */}
        {authRole === 'user' && (
          <>
            {/* Card 1: Balance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-md flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-100 uppercase tracking-wider">Available Balance</p>
                  <div className="text-3xl font-extrabold mt-1 flex items-baseline gap-2">
                    {availableTokens} <span className="text-sm font-normal text-blue-200">Tokens</span>
                  </div>
                  <p className="text-xs text-blue-100/80 mt-1">Ready for document generation</p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
                  <Zap className="w-8 h-8 text-amber-300" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Verification</p>
                  <div className="text-2xl font-bold text-amber-600 mt-1 flex items-baseline gap-1.5">
                    {pendingSubs.length} <span className="text-xs text-slate-400 font-normal">Requests</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Awaiting admin OCR confirmation</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verified Purchases</p>
                  <div className="text-2xl font-bold text-emerald-600 mt-1 flex items-baseline gap-1.5">
                    {verifiedSubs.length} <span className="text-xs text-slate-400 font-normal">Successful</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Total top-ups completed</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Top-Up Anytime Banner */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 bg-[#2563EB] text-white rounded-xl shadow-xs shrink-0 mt-0.5 sm:mt-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Add Tokens Anytime!
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Pick a package below. Payment instructions update automatically with the correct amount.
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 self-start sm:self-center">
                <span className="text-[11px] font-bold text-blue-700 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-xs">
                  {availableTokens} Tokens in Wallet
                </span>
              </div>
            </div>

            {/* Step 1: Available Token Packages */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white text-xs font-black flex items-center justify-center">1</span>
                    <h2 className="text-base font-bold text-slate-900">Select Token Package</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose the amount of tokens you need.
                  </p>
                </div>
                {selectedPkg && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 shrink-0">
                    {selectedPkg.name} ({selectedPkg.price})
                  </span>
                )}
              </div>

              {/* Weekly Special Offers (if active) */}
              {activeWeeklyOffers.length > 0 && (
                <div className="space-y-2 pb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    Special Limited-Time Weekly Offers
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeWeeklyOffers.map((offer) => {
                      const isSelected = selectedPkgId === offer.id;
                      return (
                        <div
                          key={offer.id}
                          onClick={() => setSelectedPkgId(offer.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                              : 'bg-gradient-to-r from-amber-50/40 to-orange-50/40 border-amber-200 hover:border-amber-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-amber-600 bg-amber-600 text-white' : 'border-amber-300'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-extrabold text-slate-900">{offer.title}</span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 font-black text-[9px] uppercase">
                                  Deal
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-600">
                                {offer.tokens} Tokens — {offer.description || 'Weekly bundle'}
                              </span>
                            </div>
                          </div>
                          <span className="text-sm font-black font-mono text-amber-700">
                            {offer.price}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Standard Token Packages Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {activePackages.map((pkg) => {
                  const isSelected = selectedPkgId === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPkgId(pkg.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative space-y-2.5 ${
                        isSelected
                          ? 'border-[#2563EB] bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-black text-slate-900">{pkg.name}</span>
                            {pkg.promotion && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                {pkg.promotion}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-blue-700 font-bold mt-0.5 flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" />
                            <span>{pkg.usages} Tokens</span>
                            {pkg.bonus ? <span className="text-emerald-600 font-extrabold ml-1">+{pkg.bonus} Bonus</span> : null}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      {pkg.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {pkg.description}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-medium">Price:</span>
                        <strong className="text-sm font-black font-mono text-blue-700">{pkg.price}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Payment Channels */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white text-xs font-black flex items-center justify-center">2</span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Select Payment Method
                    </h2>
                    <p className="text-xs text-slate-500">
                      Choose your preferred method to pay for {selectedPkg?.name || 'the selected package'}.
                    </p>
                  </div>
                </div>
                <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-extrabold self-start sm:self-auto">
                  Total: {selectedPkg?.price || 'TSh 10,000'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paymentMethods.filter(pm => pm.status === 'active').map((pm) => {
                  const isSelected = selectedMethod === pm.id;
                  const cleanWa = (pm.whatsappNumber || '').replace(/\D/g, '');
                  const waNumber = cleanWa.startsWith('0') ? '255' + cleanWa.slice(1) : cleanWa;

                  return (
                    <div
                      key={pm.id}
                      onClick={() => setSelectedMethod(pm.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative space-y-2.5 ${
                        isSelected
                          ? 'border-[#2563EB] bg-blue-50/40 ring-2 ring-blue-500/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-black text-slate-900">{pm.name}</span>
                            {pm.title && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                {pm.title}
                              </span>
                            )}
                          </div>
                          {pm.accountName && (
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Name: <strong className="text-slate-700">{pm.accountName}</strong>
                            </p>
                          )}
                        </div>
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${isSelected ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-emerald-500'}`} />
                      </div>

                      {/* Number Pill with Copy */}
                      <div className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl flex items-center justify-between">
                        <span className="tracking-wider">{pm.number}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleCopy(pm.number, pm.id); }}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[11px] font-sans font-semibold cursor-pointer"
                          title="Copy number"
                        >
                          {copiedId === pm.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Amount to pay dynamically attached to selected package */}
                      <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-emerald-50/80 rounded-xl border border-emerald-100">
                        <span className="text-slate-600 font-medium">Amount to Pay:</span>
                        <strong className="text-emerald-700 font-mono font-black text-sm">{selectedPkg?.price || pm.amount || `TSh ${parseInt(amountInput || '10000').toLocaleString()}`}</strong>
                      </div>

                      {/* Confirm Message */}
                      {pm.confirmMessage && (
                        <div className="p-2 bg-blue-50/60 border border-blue-100 rounded-lg text-[11px] text-blue-900 leading-snug">
                          <strong className="font-bold block text-[10px] uppercase text-blue-700">Confirmation:</strong>
                          <span>{pm.confirmMessage}</span>
                        </div>
                      )}

                      {/* WhatsApp Confirm Button */}
                      {pm.whatsappNumber && (
                        <a
                          href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello, I have paid ${selectedPkg?.price || amountInput} for ${selectedPkg?.name || 'Token Top-Up'} (${selectedPkg?.usages || ''} Tokens) via ${pm.name} (${pm.number}).\n\nRegistered as: ${userProfile?.name || 'N/A'}\nWith number: ${userProfile?.phone || 'N/A'}\n\nPlease confirm my token top-up.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center justify-between transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Confirm on WhatsApp: {pm.whatsappNumber}</span>
                          </span>
                          <ExternalLink className="w-3 h-3 text-emerald-600" />
                        </a>
                      )}

                      {/* Irreversible Notice */}
                      {pm.irreversibleNotice && (
                        <div className="p-2 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-[10px] font-medium flex items-start gap-1.5 leading-snug">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{pm.irreversibleNotice}</span>
                        </div>
                      )}

                      {/* Custom Message & Instructions */}
                      {pm.customMessage && (
                        <p className="text-[11px] text-slate-500 italic">
                          "{pm.customMessage}"
                        </p>
                      )}

                      {pm.instructions && (
                        <p className="text-[11px] text-slate-600 line-clamp-2 pt-0.5">
                          <strong className="text-slate-700">Guide:</strong> {pm.instructions}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

              {/* Step 3: Upload Payment Screenshot & Submit to WhatsApp */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white text-xs font-black flex items-center justify-center">3</span>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Submit Payment Receipt</h2>
                      <p className="text-xs text-slate-500">Crediting: <strong className="text-slate-700">{selectedPkg?.name}</strong> (+{selectedPkg?.usages} Tokens)</p>
                    </div>
                  </div>
                </div>

                {submissionFeedback && (
                  <div className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    submissionFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {submissionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    {submissionFeedback.message}
                  </div>
                )}

                <div className="space-y-4">
                  {/* File Upload Zone */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-700">Upload M-Pesa / Mobile Payment Screenshot</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setUploadedImageName(e.target.files?.[0]?.name || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="p-3 bg-blue-50 rounded-full text-[#2563EB]">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            {uploadedImageName ? `Selected: ${uploadedImageName}` : 'Click or drop payment screenshot'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Supports PNG, JPG, WEBP receipts</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit to WhatsApp Button */}
                  <a
                    href={`https://wa.me/${adminSettings.whatsappNumber?.replace(/\D/g, '') || '255712345678'}?text=${encodeURIComponent(`Hello, I have paid ${selectedPkg?.price || 'package price'} for ${selectedPkg?.name || 'Token Top-Up'} (${selectedPkg?.usages || ''} Tokens) via ${selectedMethod || 'Payment Method'}.\n\nRegistered as: ${userProfile?.name || 'N/A'}\nWith number: ${userProfile?.phone || 'N/A'}\n\nPlease confirm my token top-up. [Receipt attached]`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" /> Submit Receipt to Admin WhatsApp
                  </a>
                  <p className="text-[10px] text-center text-slate-400">After sending, wait for admin verification in the history table.</p>
                </div>
              </div>

            {/* Card 4: Submission History & Status */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#2563EB]" />
                  <h2 className="text-base font-bold text-slate-900">3. Payment Submissions & Status</h2>
                </div>
                <span className="text-xs text-slate-500">{userPaymentSubmissions.length} Submissions</span>
              </div>

              {userPaymentSubmissions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto opacity-50" />
                  <p className="text-xs">No payment requests submitted yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userPaymentSubmissions.map((sub) => (
                    <div key={sub.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 font-mono">{sub.reference}</span>
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                            sub.status === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                            sub.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {sub.status === 'verified' ? 'Approved & Granted' : sub.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Paid TSh {sub.amount.toLocaleString()} via {sub.sender} on {sub.date}
                        </p>
                        {sub.rejectionReason && (
                          <p className="text-xs text-red-600 font-medium">Reason: {sub.rejectionReason}</p>
                        )}
                      </div>

                      {sub.tokensGranted && (
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                            +{sub.tokensGranted} Tokens Added
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 5: Token Usage History */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#2563EB]" />
                  <h2 className="text-base font-bold text-slate-900">4. Token Activity Log</h2>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {tokenHistory.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{item.reason}</p>
                      <p className="text-[11px] text-slate-400">{new Date(item.timestamp).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs font-extrabold ${item.amount > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {item.amount > 0 ? `+${item.amount}` : item.amount} Tokens
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ADMIN ROLE VIEW */}
        {authRole === 'admin' && (
          <>
            {/* Admin Tabs Bar */}
            <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2">
              <button
                onClick={() => setAdminTab('queue')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  adminTab === 'queue' ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-4 h-4" /> Pending Queue ({pendingSubs.length})
              </button>
              <button
                onClick={() => setAdminTab('methods')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  adminTab === 'methods' ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Settings className="w-4 h-4" /> Payment Methods
              </button>
              <button
                onClick={() => setAdminTab('packages')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  adminTab === 'packages' ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Coins className="w-4 h-4" /> Packages (Supabase)
              </button>
              <button
                onClick={() => setAdminTab('offers')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  adminTab === 'offers' ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-4 h-4" /> Weekly Offers
              </button>
              <button
                onClick={() => setAdminTab('adjust')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  adminTab === 'adjust' ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <PlusCircle className="w-4 h-4" /> Token Adjustments
              </button>
              <button
                onClick={() => setAdminTab('stats')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  adminTab === 'stats' ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <TrendingUp className="w-4 h-4" /> Revenue & Stats
              </button>
            </div>

            {/* TAB: QUEUE */}
            {adminTab === 'queue' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">User Payment Verification Queue</h2>
                    <p className="text-xs text-slate-500">Inspect extracted OCR data and approve token grants or reject bad submissions</p>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search reference..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {filteredSubs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto opacity-40 mb-2" />
                    <p className="text-xs font-medium">No payment submissions in queue.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSubs.map((sub) => (
                      <div key={sub.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold font-mono text-slate-900">{sub.reference}</span>
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                              sub.status === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                              sub.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {sub.status.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">{new Date(sub.submittedAt).toLocaleString()}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <span className="text-slate-400 font-medium block text-[11px]">Amount</span>
                            <span className="text-sm font-extrabold text-emerald-600">TSh {sub.amount.toLocaleString()}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <span className="text-slate-400 font-medium block text-[11px]">Sender</span>
                            <span className="font-semibold text-slate-800">{sub.sender}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <span className="text-slate-400 font-medium block text-[11px]">Calculated Tokens</span>
                            <span className="font-bold text-blue-600">+{Math.max(1, Math.floor(sub.amount / adminSettings.tokenPriceTsh))} Tokens</span>
                          </div>
                        </div>

                        {sub.status === 'pending' && (
                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              onClick={() => rejectUserPayment(sub.id, 'Invalid Reference or Unmatched Deposit')}
                              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                              <XCircle className="w-4 h-4" /> Reject Payment
                            </button>
                            <button
                              onClick={() => approveUserPayment(sub.id)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Approve & Grant Tokens
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: METHODS CONFIGURATOR */}
            {adminTab === 'methods' && (
              <PaymentMethodsAdminPanel />
            )}

            {/* TAB: PACKAGES (SUPABASE) */}
            {adminTab === 'packages' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Token Packages (Supabase)</h2>
                    <p className="text-xs text-slate-500">
                      Changes propagate automatically to Web, Deployed Links, and APK users from Supabase
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddPackageOpen(!isAddPackageOpen)}
                    className="px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Package
                  </button>
                </div>

                {isAddPackageOpen && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newPackageForm.name || !newPackageForm.price) return;
                      addTokenPackage(newPackageForm);
                      setNewPackageForm({
                        name: '',
                        usages: 5,
                        price: 'TSh 15,000',
                        description: '',
                        visibility: 'public',
                        active: true,
                        sortOrder: 1,
                        bonus: 0,
                        promotion: ''
                      });
                      setIsAddPackageOpen(false);
                    }}
                    className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3"
                  >
                    <h3 className="text-xs font-bold text-slate-800">Create New Token Package</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Package Name</label>
                        <input
                          type="text"
                          value={newPackageForm.name}
                          onChange={(e) => setNewPackageForm({ ...newPackageForm, name: e.target.value })}
                          placeholder="e.g. Starter Pack"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Tokens / Usages</label>
                        <input
                          type="number"
                          value={newPackageForm.usages}
                          onChange={(e) => setNewPackageForm({ ...newPackageForm, usages: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Price String</label>
                        <input
                          type="text"
                          value={newPackageForm.price}
                          onChange={(e) => setNewPackageForm({ ...newPackageForm, price: e.target.value })}
                          placeholder="e.g. TSh 15,000"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-bold text-emerald-600"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Bonus Tokens</label>
                        <input
                          type="number"
                          value={newPackageForm.bonus}
                          onChange={(e) => setNewPackageForm({ ...newPackageForm, bonus: parseInt(e.target.value) || 0 })}
                          placeholder="e.g. 2"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-bold text-blue-600"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Promotion Tag</label>
                        <input
                          type="text"
                          value={newPackageForm.promotion}
                          onChange={(e) => setNewPackageForm({ ...newPackageForm, promotion: e.target.value })}
                          placeholder="e.g. 20% OFF"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-bold text-amber-600"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Visibility</label>
                        <select
                          value={newPackageForm.visibility}
                          onChange={(e) => setNewPackageForm({ ...newPackageForm, visibility: e.target.value as 'public' | 'hidden' })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                        >
                          <option value="public">Public (Visible to all users)</option>
                          <option value="hidden">Hidden (Admin only)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Status</label>
                        <select
                          value={newPackageForm.active ? 'true' : 'false'}
                          onChange={(e) => setNewPackageForm({ ...newPackageForm, active: e.target.value === 'true' })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-bold"
                        >
                          <option value="true">Active (Enabled)</option>
                          <option value="false">Inactive (Disabled)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Description</label>
                      <input
                        type="text"
                        value={newPackageForm.description}
                        onChange={(e) => setNewPackageForm({ ...newPackageForm, description: e.target.value })}
                        placeholder="Package description for users"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddPackageOpen(false)}
                        className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                      >
                        Save Package to Supabase
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {tokenPackages.map((pkg) => (
                    <div key={pkg.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={pkg.name}
                          onChange={(e) => editTokenPackage(pkg.id, { name: e.target.value })}
                          className="text-sm font-bold text-slate-900 bg-transparent border-b border-transparent focus:border-blue-500"
                        />
                        <button
                          onClick={() => deleteTokenPackage(pkg.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Delete Package"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500">Tokens</label>
                            <input
                              type="number"
                              value={pkg.usages}
                              onChange={(e) => editTokenPackage(pkg.id, { usages: parseInt(e.target.value) || 0 })}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-blue-600 bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500">Price</label>
                            <input
                              type="text"
                              value={pkg.price}
                              onChange={(e) => editTokenPackage(pkg.id, { price: e.target.value })}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-emerald-600 bg-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500">Bonus Tokens</label>
                            <input
                              type="number"
                              value={pkg.bonus || 0}
                              onChange={(e) => editTokenPackage(pkg.id, { bonus: parseInt(e.target.value) || 0 })}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-blue-600 bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500">Promotion Tag</label>
                            <input
                              type="text"
                              value={pkg.promotion || ''}
                              onChange={(e) => editTokenPackage(pkg.id, { promotion: e.target.value })}
                              placeholder="e.g. HOT"
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-amber-600 bg-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500">Visibility</label>
                            <select
                              value={pkg.visibility || 'public'}
                              onChange={(e) => editTokenPackage(pkg.id, { visibility: e.target.value as 'public' | 'hidden' })}
                              className="w-full px-2 py-1 rounded-lg border border-slate-300 text-slate-800 bg-white"
                            >
                              <option value="public">Public</option>
                              <option value="hidden">Hidden</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500">Status</label>
                            <select
                              value={pkg.active !== false ? 'true' : 'false'}
                              onChange={(e) => editTokenPackage(pkg.id, { active: e.target.value === 'true' })}
                              className="w-full px-2 py-1 rounded-lg border border-slate-300 text-slate-800 bg-white font-bold"
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-500">Description</label>
                          <input
                            type="text"
                            value={pkg.description || ''}
                            onChange={(e) => editTokenPackage(pkg.id, { description: e.target.value })}
                            className="w-full px-3 py-1 rounded-lg border border-slate-300 text-slate-700 bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: WEEKLY OFFERS (SUPABASE) */}
            {adminTab === 'offers' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Weekly Offers System</h2>
                    <p className="text-xs text-slate-500">
                      Offers automatically expire and disappear when their end date/time is reached
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddOfferOpen(!isAddOfferOpen)}
                    className="px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Create Weekly Offer
                  </button>
                </div>

                {isAddOfferOpen && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addWeeklyOffer(newOfferForm);
                      setNewOfferForm({
                        title: 'Special Bundle Offer',
                        description: 'Discounted token bundle valid for 7 days',
                        tokens: 10,
                        price: 'TSh 20,000',
                        startDate: new Date().toISOString().split('T')[0],
                        endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                        services: ['nida', 'driving_licence', 'nhif'],
                        active: true
                      });
                      setIsAddOfferOpen(false);
                    }}
                    className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3"
                  >
                    <h3 className="text-xs font-bold text-slate-800">Create New Weekly Offer</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Offer Title</label>
                        <input
                          type="text"
                          value={newOfferForm.title}
                          onChange={(e) => setNewOfferForm({ ...newOfferForm, title: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Tokens Included</label>
                        <input
                          type="number"
                          value={newOfferForm.tokens}
                          onChange={(e) => setNewOfferForm({ ...newOfferForm, tokens: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-bold text-blue-600"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Offer Price</label>
                        <input
                          type="text"
                          value={newOfferForm.price}
                          onChange={(e) => setNewOfferForm({ ...newOfferForm, price: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-bold text-emerald-600"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Start Date & Time</label>
                        <input
                          type="datetime-local"
                          value={newOfferForm.startDate.includes('T') ? newOfferForm.startDate : `${newOfferForm.startDate}T00:00`}
                          onChange={(e) => setNewOfferForm({ ...newOfferForm, startDate: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">End Date & Expiry Time</label>
                        <input
                          type="datetime-local"
                          value={newOfferForm.endDate.includes('T') ? newOfferForm.endDate : `${newOfferForm.endDate}T23:59`}
                          onChange={(e) => setNewOfferForm({ ...newOfferForm, endDate: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Applicable Services</label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          { id: 'nida', label: 'NIDA Card' },
                          { id: 'driving_licence', label: 'Driving Licence' },
                          { id: 'nhif', label: 'NHIF Card' },
                          { id: 'birth_certificate', label: 'Birth Certificate' },
                        ].map((srv) => {
                          const isChecked = newOfferForm.services.includes(srv.id);
                          return (
                            <label key={srv.id} className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                              isChecked ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'
                            }`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const updated = e.target.checked
                                    ? [...newOfferForm.services, srv.id]
                                    : newOfferForm.services.filter((s) => s !== srv.id);
                                  setNewOfferForm({ ...newOfferForm, services: updated });
                                }}
                                className="rounded text-blue-600"
                              />
                              <span>{srv.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Description</label>
                      <input
                        type="text"
                        value={newOfferForm.description}
                        onChange={(e) => setNewOfferForm({ ...newOfferForm, description: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddOfferOpen(false)}
                        className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-[#2563EB] text-white rounded-lg text-xs font-bold"
                      >
                        Publish Offer
                      </button>
                    </div>
                  </form>
                )}

                {weeklyOffers.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Sparkles className="w-8 h-8 mx-auto opacity-40 mb-2" />
                    <p className="text-xs">No active weekly offers configured. Click "Create Weekly Offer" to set up a new campaign.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {weeklyOffers.map((offer) => {
                      const isExpired = new Date(offer.endDate).getTime() < Date.now();
                      return (
                        <div key={offer.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900">{offer.title}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isExpired ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isExpired ? 'EXPIRED' : 'ACTIVE'}
                              </span>
                              <button
                                onClick={() => deleteWeeklyOffer(offer.id)}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="Delete Offer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="text-xs space-y-1">
                            <p className="text-slate-600">{offer.description}</p>
                            <div className="flex items-center justify-between pt-1">
                              <span className="font-bold text-blue-600">+{offer.tokens} Tokens</span>
                              <span className="font-bold text-emerald-600">{offer.price}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-200">
                              Expires: {new Date(offer.endDate).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: ADJUSTMENTS */}
            {adminTab === 'adjust' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900">Administrative Token Adjustments</h2>
                  <p className="text-xs text-slate-500">Manually grant or deduct token usages for any user passkey account</p>
                </div>

                {adjustFeedback && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {adjustFeedback}
                  </div>
                )}

                <form onSubmit={handleAdminTokenAdjust} className="max-w-lg space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Passkey Account</label>
                    <select
                      value={targetPasskeyKey}
                      onChange={(e) => setTargetPasskeyKey(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                    >
                      {activePasskeys.map(pk => (
                        <option key={pk.key} value={pk.key}>
                          {pk.role.toUpperCase()}: {pk.description} (Key: {pk.key}) - {pk.remainingUsages} tokens left
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tokens to Grant / Add</label>
                    <input
                      type="number"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reason Log</label>
                    <input
                      type="text"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs"
                  >
                    <PlusCircle className="w-4 h-4" /> Apply Token Adjustment
                  </button>
                </form>
              </div>
            )}

            {/* TAB: STATS */}
            {adminTab === 'stats' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Total Revenue Collected</span>
                  <p className="text-2xl font-extrabold text-emerald-600">TSh {totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Total Tokens Issued</span>
                  <p className="text-2xl font-extrabold text-blue-600">
                    {userPaymentSubmissions.filter(s => s.status === 'verified').reduce((acc, s) => acc + (s.tokensGranted || 0), 0)} Tokens
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase">OCR Confidence Rate</span>
                  <p className="text-2xl font-extrabold text-slate-800">{adminSettings.ocrConfidenceThreshold}%</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
