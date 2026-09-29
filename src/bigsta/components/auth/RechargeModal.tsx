import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, CreditCard, Check, AlertCircle, RefreshCw, X, ShieldCheck, ArrowRight, Clock, Copy, Hash, Zap } from 'lucide-react';
import { useTemplateStore } from '../../store/useTemplateStore';
import { paymentService } from '../../services/paymentService';

export const RechargeModal: React.FC = () => {
  const {
    isRechargeModalOpen,
    setRechargeModalOpen,
    rechargeNotice,
    authRole,
    currentAuthKey,
    activePasskeys,
    paymentRequests,
    submitPaymentRequest,
    cancelPaymentRequest,
    updateUserPaymentRequest,
    refreshUserStatus,
    tokenPackages,
    weeklyOffers,
  } = useTemplateStore();

  const activeWeeklyOffers = useMemo(() => {
    const now = Date.now();
    return (weeklyOffers || []).filter((o) => o.active !== false && new Date(o.endDate).getTime() > now);
  }, [weeklyOffers]);

  const activePkgs = useMemo(() => {
    return (tokenPackages || []).filter((p) => p.active !== false && p.visibility !== 'hidden');
  }, [tokenPackages]);

  const [selectedPkgId, setSelectedPkgId] = useState<string>('');

  useEffect(() => {
    if (activePkgs.length > 0 && !selectedPkgId) {
      setSelectedPkgId(activePkgs[0].id);
    }
  }, [activePkgs, selectedPkgId]);

  const [copiedLipa, setCopiedLipa] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [reference, setReference] = useState('');
  const [verifyAmount, setVerifyAmount] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Swahili SMS simulation states
  const [simulatedSmsText, setSimulatedSmsText] = useState('DIFEQ2LX2R Imethibitishwa. Tsh3,000.00 imetumwa kwa LOCKWOOD TECHNOLOGY.');
  const [smsSimStatus, setSmsSimStatus] = useState<'idle' | 'sending' | 'success' | 'failed'>('idle');

  const handleSimulateSmsReceive = async (textToSimulate: string) => {
    setSmsSimStatus('sending');
    try {
      const response = await fetch('/api/payment-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'Vodacom',
          raw_sms: textToSimulate,
          device_name: 'BIGsta SMS Simulator Integration'
        })
      });
      if (response.ok) {
        setSmsSimStatus('success');
        
        // Extract 10-char alphanumeric code starting the message
        const refMatch = textToSimulate.trim().match(/^([A-Z0-9]{10})/i);
        if (refMatch) {
          setReference(refMatch[1].toUpperCase());
        }

        // Extract amount (e.g., Tsh3,000.00 or Tsh6,000.00)
        const amtMatch = textToSimulate.match(/Tsh\s*([\d,]+(?:\.\d{2})?)/i);
        if (amtMatch) {
          const rawAmt = amtMatch[1].split('.')[0].replace(/,/g, '');
          setVerifyAmount(rawAmt);
        }

        setTimeout(() => setSmsSimStatus('idle'), 4000);
      } else {
        setSmsSimStatus('failed');
      }
    } catch (e) {
      setSmsSimStatus('failed');
    }
  };

  // Escape key listener
  useEffect(() => {
    if (!isRechargeModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRechargeModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRechargeModalOpen, setRechargeModalOpen]);

  const currentPasskey = useMemo(() => activePasskeys.find(
    (p) => p.role === 'user' && p.key.toLowerCase() === (currentAuthKey || '').toLowerCase()
  ), [activePasskeys, currentAuthKey]);

  const remainingUsages = currentPasskey?.remainingUsages ?? 0;
  const paymentStatus = currentPasskey?.paymentStatus || 'ACTIVE';

  // Check if 1-week free offer token has ended
  const isOfferWeekOver = useMemo(() => {
    if (!currentPasskey?.welcomeTokenGranted) return false;
    const grantTime = currentPasskey.createdAtTimestamp || (currentPasskey.welcomeTokenGrantedAt ? new Date(currentPasskey.welcomeTokenGrantedAt).getTime() : 0);
    if (!grantTime) return false;
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    return (Date.now() - grantTime) >= ONE_WEEK_MS;
  }, [currentPasskey]);

  // Find latest user payment request if any
  const userRequests = useMemo(() => paymentRequests.filter(
    (r) => r.userPasskey.toLowerCase() === (currentAuthKey || '').toLowerCase()
  ), [paymentRequests, currentAuthKey]);

  const latestRequest = useMemo(() => {
    if (userRequests.length === 0) return null;
    return userRequests[userRequests.length - 1];
  }, [userRequests]);
  
  const pendingRequest = userRequests.find((r) => r.status === 'PENDING') || null;
  const hasPendingRequest = !!pendingRequest || paymentStatus === 'PENDING';

  const selectedPkg = useMemo(() => {
    const offerMatch = activeWeeklyOffers.find((o) => o.id === selectedPkgId);
    if (offerMatch) {
      return { id: offerMatch.id, name: offerMatch.title, price: offerMatch.price, usages: offerMatch.tokens };
    }
    return activePkgs.find((p) => p.id === selectedPkgId) || activePkgs[0] || { id: 'pkg_basic', name: 'Basic Package', price: 'TSh 10,000', usages: 3 };
  }, [activePkgs, activeWeeklyOffers, selectedPkgId]);

  const isPendingDifferentPackage = useMemo(() => {
    if (!pendingRequest) return false;
    return pendingRequest.packageId !== selectedPkg.id && pendingRequest.packageName !== selectedPkg.name;
  }, [pendingRequest, selectedPkg]);

  if (!isRechargeModalOpen) return null;

  const handleCopyLipa = () => {
    navigator.clipboard.writeText('1234678');
    setCopiedLipa(true);
    setTimeout(() => setCopiedLipa(false), 2000);
  };

  const handleAutoVerify = async () => {
    if (failedAttempts >= 3) {
      setVerificationError('You have reached the maximum limit of 3 pending verification attempts. Please wait for the Admin to verify your submitted claims or contact support.');
      return;
    }

    if (!reference.trim()) {
      setVerificationError('Please enter your transaction reference code.');
      return;
    }
    const amt = parseFloat(verifyAmount.replace(/,/g, ''));
    if (isNaN(amt) || amt <= 0) {
      setVerificationError('Please enter the transaction amount in TSh.');
      return;
    }

    setIsVerifying(true);
    setVerificationError('');
    
    try {
      const res = await paymentService.autoConfirmWithReference(reference.trim(), amt, currentPasskey?.id || '');
      if (res.success) {
        setSubmittedMessage(res.message);
        refreshUserStatus();
        setReference('');
        setVerifyAmount('');
        
        if (res.status === 'verified') {
          // Instantly matched and verified - reset attempts!
          setFailedAttempts(0);
        } else {
          // Manual claim submitted - increment attempts so user cannot spam guesses
          setFailedAttempts(prev => prev + 1);
        }
      } else {
        setVerificationError(res.message);
        setFailedAttempts(prev => prev + 1);
      }
    } catch (error) {
      setVerificationError('Verification failed. Please check your reference and try again.');
      setFailedAttempts(prev => prev + 1);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePaymentSubmit = () => {
    setIsSubmitting(true);
    setSubmittedMessage('');

    setTimeout(() => {
      const res = submitPaymentRequest(
        selectedPkg.id,
        selectedPkg.name,
        selectedPkg.price,
        selectedPkg.usages
      );

      setIsSubmitting(false);

      if (res.success) {
        setSubmittedMessage('Payment request submitted. You can wait for admin verification or enter your reference below for instant auto-verify.');
      }
    }, 300);
  };

  const handleCancelPendingRequest = () => {
    if (!pendingRequest) {
      const res = cancelPaymentRequest();
      if (res.success) {
        setActionNotice(res.message);
        refreshUserStatus();
      }
      return;
    }
    const res = cancelPaymentRequest(pendingRequest.id);
    if (res.success) {
      setActionNotice('Token request cancelled successfully. You can now select another package or request later.');
      refreshUserStatus();
      setTimeout(() => setActionNotice(''), 5000);
    }
  };

  const handleUpdatePendingRequest = () => {
    if (!pendingRequest) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const res = updateUserPaymentRequest(
        pendingRequest.id,
        selectedPkg.id,
        selectedPkg.name,
        selectedPkg.price,
        selectedPkg.usages
      );
      setIsSubmitting(false);
      if (res.success) {
        setActionNotice(`Token request updated to ${selectedPkg.name} (${selectedPkg.price})! Administrator notified.`);
        refreshUserStatus();
        setTimeout(() => setActionNotice(''), 5000);
      }
    }, 300);
  };

  const handleRefresh = () => {
    refreshUserStatus();
  };

  return (
    <div
      onClick={() => setRechargeModalOpen(false)}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in font-sans cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] cursor-default"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-[#0B132B] text-white flex flex-col items-center justify-between border-b border-slate-800 text-center">
          <div className="w-full flex items-center justify-end mb-1">
            <button
              type="button"
              onClick={() => setRechargeModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-3xl font-black text-white tracking-wider">BIGsta</h2>
            <p className="text-gray-100 text-base font-bold">Dear BIGsta User,</p>
            <p className="text-gray-300 text-sm font-medium">You need to recharge your account.</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-slate-900">
          {/* Current Usages & Status Header */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                Usages Available
              </span>
              <span className="text-xl font-black font-mono text-slate-900">
                {remainingUsages} {remainingUsages === 1 ? 'Usage' : 'Usages'}
              </span>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] text-slate-500 font-medium">Payment Status:</span>
              {paymentStatus === 'PENDING' ? (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 animate-spin text-amber-700" />
                  PENDING
                </span>
              ) : paymentStatus === 'ACTIVE' || (latestRequest && latestRequest.status === 'APPROVED') ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  {latestRequest?.status === 'APPROVED' ? 'APPROVED' : 'ACTIVE'}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-900 border border-red-300 text-xs font-bold">
                  {paymentStatus}
                </span>
              )}
            </div>
          </div>

          {/* 1-Week Offer Token Expiration Notification */}
          {isOfferWeekOver && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1 text-left">
              <div className="flex items-center gap-1.5 font-extrabold text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Free 1-Week Offer Token Has Ended</span>
              </div>
              <p className="text-amber-900 text-[11px] leading-relaxed">
                Your 1-week free trial offer is complete. Please select a <strong>Basic</strong> or <strong>Premium</strong> token package configured by the administrator to continue generating identity cards.
              </p>
            </div>
          )}

          {/* Action / Update Feedback Notice */}
          {actionNotice && (
            <div className="p-3 bg-blue-50 border border-blue-300 rounded-xl text-xs text-blue-900 flex items-center gap-2 font-bold animate-fadeIn">
              <Check className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* Pending Payment Notice if currently pending */}
          {hasPendingRequest && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-3 shadow-xs text-left">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-950 font-extrabold text-[13px]">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0 animate-spin" />
                  <span>Token Request Pending Admin Review</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold text-[10px] tracking-wide">
                  PENDING
                </span>
              </div>

              <div className="p-3 bg-white border border-amber-200 rounded-lg space-y-1.5 font-mono text-[11px] text-slate-800">
                {pendingRequest && (
                  <>
                    <div className="flex justify-between border-b border-amber-100 pb-1.5">
                      <span className="text-slate-500 font-sans">Current Request:</span>
                      <span className="font-bold text-amber-900">{pendingRequest.packageName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Tokens:</span>
                      <span className="font-bold">{pendingRequest.requestedUsages} Usages ({pendingRequest.amount})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Request Date:</span>
                      <span className="font-bold">{pendingRequest.date}</span>
                    </div>
                  </>
                )}
              </div>

              <p className="text-amber-900 leading-relaxed text-[11px]">
                You can cancel this request, or choose a different package below and click <strong>"Update Token Request"</strong> to update it in the system.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelPendingRequest}
                  className="flex-1 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-rose-300"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Request</span>
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Status</span>
                </button>
              </div>
            </div>
          )}

          {/* Submitted Message */}
          {submittedMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{submittedMessage}</span>
              </div>
            </div>
          )}

          {/* Auto-Verification Section */}
          <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Zap className="w-4 h-4 text-yellow-300" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Instant Auto-Verify</h4>
                <p className="text-[10px] text-blue-100">Enter transaction reference for instant tokens</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Hash className="w-4 h-4 text-blue-300 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value.toUpperCase())}
                  placeholder="Reference Code (E.g. DIFEQ2LX2R)"
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-white/30 uppercase"
                />
              </div>

              <div className="relative">
                <span className="text-sm font-extrabold text-blue-300 absolute left-3.5 top-1/2 -translate-y-1/2">TSh</span>
                <input
                  type="text"
                  value={verifyAmount}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^\d,]/g, '');
                    setVerifyAmount(clean);
                  }}
                  placeholder="Payment Amount (E.g. 3,000)"
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-3 py-2.5 text-sm font-bold placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-white/30 font-mono"
                />
              </div>
              
              {verificationError && (
                <p className="text-[10px] font-bold text-red-200 bg-red-900/30 px-2 py-1 rounded flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {verificationError}
                </p>
              )}

              {failedAttempts > 0 && (
                <p className="text-[10px] font-semibold text-amber-200 bg-amber-900/20 px-2 py-1 rounded text-center">
                  Claim/Verification Attempts: {failedAttempts}/3. After 3 attempts, you must wait for manual Admin approval.
                </p>
              )}

              <button
                type="button"
                onClick={handleAutoVerify}
                disabled={isVerifying || !reference.trim() || !verifyAmount.trim()}
                className="w-full py-2.5 bg-white text-blue-900 hover:bg-blue-50 font-black text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying and Confirming Claim...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                    <span>Auto-Confirm and Grant</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Weekly Offers */}
          {activeWeeklyOffers.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-amber-700 block flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                Active Weekly Offers
              </label>

              <div className="grid grid-cols-1 gap-2">
                {activeWeeklyOffers.map((offer) => {
                  const isSelected = selectedPkgId === offer.id;
                  return (
                    <button
                      key={offer.id}
                      type="button"
                      onClick={() => {
                        setSelectedPkgId(offer.id);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-gradient-to-r from-amber-50/50 to-orange-50/50 border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-amber-600 bg-amber-600 text-white' : 'border-amber-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{offer.title}</span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 font-extrabold text-[9px] uppercase">
                              Special Offer
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium block">
                            {offer.tokens} Tokens — {offer.description || 'Limited time weekly deal'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-extrabold font-mono text-amber-700">
                          {offer.price}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Package Selection */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
              Select Token Package
            </label>

            <div className="grid grid-cols-1 gap-2">
              {activePkgs.map((pkg) => {
                const isSelected = pkg.id === selectedPkgId;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPkgId(pkg.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-600/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900">{pkg.name}</span>
                          {pkg.promotion && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[9px] uppercase">
                              {pkg.promotion}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {pkg.usages} {pkg.usages === 1 ? 'Usage' : 'Usages'}
                          {pkg.bonus ? <span className="text-emerald-600 font-bold ml-1">+{pkg.bonus} Bonus</span> : null}
                          {pkg.description ? ` — ${pkg.description}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold font-mono text-blue-700">
                        {pkg.price}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lipa Number Payment Instruction Box */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                Payment Instructions
              </span>
              <span className="text-[10px] text-slate-400">Merchant Number</span>
            </div>

            <div className="flex items-center justify-between bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
              <div>
                <span className="text-[11px] text-slate-400 block">Merchant Lipa Number:</span>
                <span className="text-base font-black font-mono text-blue-400 tracking-wider">
                  1234678
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyLipa}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copiedLipa ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-[11px] text-slate-300 space-y-1 font-medium">
              <p>• Pay <strong>{selectedPkg.price}</strong> to Merchant Number: <strong>1234678</strong> (BIGSTA RECHARGE).</p>
              <p>• After completing your payment, click <strong>"Add Tokens"</strong> below.</p>
            </div>
          </div>

          {/* Selected Package Summary */}
          <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[11px] text-blue-900/80 block font-semibold">Selected Package:</span>
              <strong className="text-blue-950 font-bold">{selectedPkg.name} ({selectedPkg.usages} Usages)</strong>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-blue-900/80 block font-semibold">Total Price:</span>
              <strong className="text-blue-700 font-extrabold font-mono text-sm">{selectedPkg.price}</strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            {submittedMessage ? (
              <button
                type="button"
                onClick={() => {
                  setRechargeModalOpen(false);
                  setSubmittedMessage('');
                }}
                className="w-full py-3 bg-[#0B132B] hover:bg-[#1C2541] text-white font-bold text-sm rounded-xl transition-all cursor-pointer text-center"
              >
                OK
              </button>
            ) : hasPendingRequest ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelPendingRequest}
                  className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs sm:text-sm rounded-xl transition-all flex-1 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4 shrink-0" />
                  <span>Cancel Request</span>
                </button>
                <button
                  type="button"
                  onClick={handleUpdatePendingRequest}
                  disabled={isSubmitting || !isPendingDifferentPackage}
                  className="py-3 px-3 sm:px-4 flex-[2] bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="animate-spin h-4 w-4 text-white" />
                      <span>Updating...</span>
                    </span>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 shrink-0" />
                      <span className="truncate">{isPendingDifferentPackage ? `Update to ${selectedPkg.name}` : 'Select Package to Update'}</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setRechargeModalOpen(false)}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-all flex-1 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePaymentSubmit}
                  disabled={isSubmitting}
                  className="py-3 px-4 flex-[2] bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-sm rounded-xl shadow-md transition-all active:scale-95 active:shadow-inner flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:scale-100"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting Request...
                    </span>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Add Tokens</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          <p className="text-[11px] text-center text-slate-500">
            Refresh the page or click "Refresh Status" to check your payment status and available usages.
          </p>
        </div>
      </div>
    </div>
  );
};
