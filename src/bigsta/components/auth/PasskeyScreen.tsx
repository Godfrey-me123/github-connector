import React, { useState } from 'react';
import { Shield, Key, Eye, EyeOff, ArrowRight, AlertCircle, Sparkles, UserPlus, CheckCircle2, HelpCircle } from 'lucide-react';
import { useTemplateStore } from '../../store/useTemplateStore';
import { UserRegistrationModal } from './UserRegistrationModal';
import { ForgotPasskeyModal } from './ForgotPasskeyModal';

export const PasskeyScreen: React.FC = () => {
  const { loginWithPasskey, loadingPasskeys } = useTemplateStore();
  const [passkeyInput, setPasskeyInput] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  console.log('[Auth Debug] PasskeyScreen Render:', { authRole: useTemplateStore.getState().authRole, isRegisterOpen });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkeyInput.trim()) {
      setErrorMessage('Please enter your passkey to continue');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessNotice('');

    try {
      const res = await loginWithPasskey(passkeyInput);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.message || 'Invalid Passkey');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Error verifying passkey');
    }
  };

  const handleRegistrationSuccess = async (registeredPasskey: string) => {
    setPasskeyInput(registeredPasskey);
    setIsLoading(true);
    setErrorMessage('');
    
    // Auto-login after registration
    try {
      const res = await loginWithPasskey(registeredPasskey);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.message || 'Auto-login failed. Please enter your passkey manually.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage('Auto-login failed. Please enter your passkey manually.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B132B] text-white flex flex-col items-center justify-center p-4 py-8 sm:py-12 relative overflow-y-auto font-sans">
      {/* Loading Overlay for Background Sync */}
      {loadingPasskeys && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-[#1C2541] border border-white/10 px-3 py-1.5 rounded-full shadow-xl">
          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-bold text-blue-200">Syncing System Data...</span>
        </div>
      )}
      {/* Background Decorative Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#47A5FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-[#1C2541]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 flex flex-col items-center my-auto">
        
        {/* BIGsta Title Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            BIGsta
          </h1>
        </div>

        {/* Registration Success Banner */}
        {successNotice && (
          <div className="w-full mb-4 p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-emerald-200 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{successNotice}</span>
          </div>
        )}

        {/* Passkey Input Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Passkey / Security PIN
            </label>

            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-slate-400">
                <Key className="w-4 h-4" />
              </div>

              <input
                type={showPasskey ? 'text' : 'password'}
                value={passkeyInput}
                onChange={(e) => {
                  setPasskeyInput(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Enter Passkey"
                className="w-full pl-10 pr-11 py-3 bg-[#0B132B]/80 border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm font-mono tracking-wide focus:outline-none focus:border-[#47A5FF] focus:ring-2 focus:ring-[#47A5FF]/20 transition-all"
                autoFocus
              />

              <button
                type="button"
                onClick={() => setShowPasskey(!showPasskey)}
                className="absolute right-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                title={showPasskey ? 'Hide Passkey' : 'Show Passkey'}
              >
                {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message Notice */}
          {errorMessage && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-200 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="font-medium leading-tight">{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#47A5FF] to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying Passkey...
              </span>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Forgot Passkey Link */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setIsForgotOpen(true)}
              disabled={isLoading}
              className="text-xs text-[#47A5FF] hover:underline font-medium cursor-pointer inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Forgot Passkey?</span>
            </button>
          </div>
        </form>

        {/* Register Now Button (Prompt 21) */}
        <div className="pt-4 mt-2 flex flex-col items-center gap-2.5 border-t border-white/10 w-full">
          <p className="text-xs text-slate-300 font-medium">
            Don't have an account?
          </p>
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-[#47A5FF] font-bold text-xs sm:text-sm rounded-xl border border-[#47A5FF]/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4 text-[#47A5FF]" />
            <span>Register Now</span>
          </button>
        </div>
      </div>

      {/* User Registration Modal */}
      <UserRegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={handleRegistrationSuccess}
      />

      {/* Forgot Passkey Modal */}
      <ForgotPasskeyModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        onSuccess={(newPk) => {
          setPasskeyInput(newPk);
          setSuccessNotice('Passkey updated successfully! You can now continue with your new passkey.');
        }}
      />
    </div>
  );
};
