import React, { useState, useEffect } from 'react';
import { Key, Phone, Shield, X, CheckCircle2, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { useTemplateStore } from '../../store/useTemplateStore';

interface ForgotPasskeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPasskey: string) => void;
}

export const ForgotPasskeyModal: React.FC<ForgotPasskeyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { recoverPasskey } = useTemplateStore();

  const [phone, setPhone] = useState('');
  const [newPasskey, setNewPasskey] = useState('');
  const [confirmPasskey, setConfirmPasskey] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const validateTzPhone = (p: string) => {
    const cleaned = p.trim().replace(/\s+/g, '');
    return /^(?:\+255|255|0)[67]\d{8}$/.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!phone.trim()) {
      setErrorMessage('Please enter your registered phone number');
      return;
    }

    if (!validateTzPhone(phone)) {
      setErrorMessage('Invalid phone number format (e.g., 0712345678 or +255712345678)');
      return;
    }

    if (!newPasskey.trim()) {
      setErrorMessage('Please enter a new passkey');
      return;
    }

    if (newPasskey.length < 4) {
      setErrorMessage('Passkey must be at least 4 characters long');
      return;
    }

    if (newPasskey !== confirmPasskey) {
      setErrorMessage('Passkeys do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await recoverPasskey(phone.trim(), newPasskey.trim());
      setIsSubmitting(false);

      if (!res.success) {
        setErrorMessage(res.message);
        return;
      }

      setSuccessMessage(res.message);
      setTimeout(() => {
        onSuccess(newPasskey.trim());
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Failed to recover passkey');
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#1C2541] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col cursor-default"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 to-[#1C2541] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#47A5FF]/20 border border-[#47A5FF]/40 text-[#47A5FF]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">
                Reset Passkey
              </h2>
              <p className="text-xs text-slate-300">
                Enter your registered phone number to set a new Passkey
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              Phone Number <span className="text-red-400">*</span>
            </label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="0712345678 or +255712345678"
                className="w-full pl-10 pr-4 py-3 bg-[#0B132B] border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-[#47A5FF] focus:ring-2 focus:ring-[#47A5FF]/20 transition-all"
                required
              />
            </div>
          </div>

          {/* New Passkey */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              New Passkey <span className="text-red-400">*</span>
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type={showPasskey ? 'text' : 'password'}
                value={newPasskey}
                onChange={(e) => {
                  setNewPasskey(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Enter new passkey (at least 4 characters)"
                className="w-full pl-10 pr-10 py-3 bg-[#0B132B] border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-[#47A5FF] focus:ring-2 focus:ring-[#47A5FF]/20 transition-all"
                required
              />
            </div>
          </div>

          {/* Confirm New Passkey */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              Confirm Passkey <span className="text-red-400">*</span>
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type={showPasskey ? 'text' : 'password'}
                value={confirmPasskey}
                onChange={(e) => {
                  setConfirmPasskey(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Re-enter new passkey"
                className="w-full pl-10 pr-10 py-3 bg-[#0B132B] border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-[#47A5FF] focus:ring-2 focus:ring-[#47A5FF]/20 transition-all"
                required
              />
            </div>
          </div>

          {/* Error / Success Notices */}
          {errorMessage && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="font-medium leading-tight">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-emerald-200 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="font-medium leading-tight">{successMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#47A5FF] to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Updating Passkey...
              </span>
            ) : (
              <>
                <span>Reset Passkey</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
