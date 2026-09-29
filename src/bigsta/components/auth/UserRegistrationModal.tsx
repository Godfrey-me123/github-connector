import React, { useState, useEffect } from 'react';
import { User, Phone, Key, Eye, EyeOff, CheckCircle2, AlertCircle, X, Shield, ArrowRight } from 'lucide-react';
import { useTemplateStore } from '../../store/useTemplateStore';

interface UserRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (registeredPasskey: string) => void;
}

export const UserRegistrationModal: React.FC<UserRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  console.log('[Auth Debug] UserRegistrationModal Render:', { isOpen });
  const { registerUserAccount } = useTemplateStore();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [passkey, setPasskey] = useState('');
  const [confirmPasskey, setConfirmPasskey] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [showPasskey, setShowPasskey] = useState(false);
  const [showConfirmPasskey, setShowConfirmPasskey] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Escape key listener
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

    if (!fullName.trim()) {
      setErrorMessage('Please enter your Full Name');
      return;
    }

    if (!phone.trim()) {
      setErrorMessage('Please enter your Phone Number');
      return;
    }

    if (!validateTzPhone(phone)) {
      setErrorMessage('Invalid phone number format (e.g., 0712345678 or +255712345678)');
      return;
    }

    if (!passkey.trim()) {
      setErrorMessage('Please create your User Passkey');
      return;
    }

    if (passkey.length < 4) {
      setErrorMessage('Passkey must be at least 4 characters long');
      return;
    }

    if (passkey !== confirmPasskey) {
      setErrorMessage('Passkeys do not match');
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage('Please accept the Terms and Conditions to continue');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await registerUserAccount({
        fullName: fullName.trim(),
        phone: phone.trim(),
        passkey: passkey.trim(),
      });

      setIsSubmitting(false);

      if (!res.success) {
        setErrorMessage(res.message);
        return;
      }

      onSuccess(passkey.trim());
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Registration failed');
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#1C2541] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 to-[#1C2541] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#47A5FF]/20 border border-[#47A5FF]/40 text-[#47A5FF]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">
                New User Registration
              </h2>
              <p className="text-xs text-slate-300">
                Register your account to access BIGsta Services
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

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto font-sans">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              Full Name <span className="text-red-400">*</span>
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="e.g. Juma Ally Rashidi"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0B132B] border border-white/15 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#47A5FF] focus:ring-1 focus:ring-[#47A5FF]"
                required
              />
            </div>
          </div>

          {/* Tanzanian Phone Number */}
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
                placeholder="e.g. 0712345678 or +255712345678"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0B132B] border border-white/15 rounded-xl text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-[#47A5FF] focus:ring-1 focus:ring-[#47A5FF]"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400">Format: 07XXXXXXXX or +2557XXXXXXXX</p>
          </div>

          {/* Create User Passkey */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                Create User Passkey <span className="text-red-400">*</span>
              </label>
              <div className="relative flex items-center">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type={showPasskey ? 'text' : 'password'}
                  value={passkey}
                  onChange={(e) => {
                    setPasskey(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Enter Passkey"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0B132B] border border-white/15 rounded-xl text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-[#47A5FF]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-3 text-slate-400 hover:text-white"
                >
                  {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                Confirm Passkey <span className="text-red-400">*</span>
              </label>
              <div className="relative flex items-center">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type={showConfirmPasskey ? 'text' : 'password'}
                  value={confirmPasskey}
                  onChange={(e) => {
                    setConfirmPasskey(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Confirm Passkey"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0B132B] border border-white/15 rounded-xl text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-[#47A5FF]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPasskey(!showConfirmPasskey)}
                  className="absolute right-3 text-slate-400 hover:text-white"
                >
                  {showConfirmPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Terms and Conditions Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  if (errorMessage) setErrorMessage('');
                }}
                className="mt-0.5 rounded border-white/20 bg-[#0B132B] text-blue-600 focus:ring-[#47A5FF]"
              />
              <span>
                I accept the BIGsta Terms & Conditions. All accounts are registered with the <strong>USER</strong> role.
              </span>
            </label>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Registering Account...
                </span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Register Now</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
