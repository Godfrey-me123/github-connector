import React, { useState, useEffect } from 'react';
import { X, Phone, MessageSquare, User, Send, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useTemplateStore } from '../../store/useTemplateStore';

export const ManualApplicationModal: React.FC = () => {
  const {
    isManualAppModalOpen,
    setManualAppModalOpen,
    selectedManualService,
    submitManualRequest,
    manualRequests,
  } = useTemplateStore();

  const [fullName, setFullName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [showConfirmCommunication, setShowConfirmCommunication] = useState(false);
  const [submittedState, setSubmittedState] = useState<'IDLE' | 'CONFIRMED'>('IDLE');
  const [isEditingNew, setIsEditingNew] = useState(false);

  // Check if there is an existing request for this service
  const existingRequest = React.useMemo(() => {
    if (!selectedManualService?.id) return null;
    return manualRequests.find((r) => r.serviceId === selectedManualService.id) || null;
  }, [manualRequests, selectedManualService?.id]);

  // Reset local state when modal opens
  useEffect(() => {
    if (isManualAppModalOpen) {
      setShowConfirmCommunication(false);
      setSubmittedState('IDLE');
      setIsEditingNew(false);
      if (existingRequest) {
        setFullName(existingRequest.fullName || '');
        setWhatsappNumber(existingRequest.whatsappNumber || '');
      } else {
        setFullName('');
        setWhatsappNumber('');
      }
    }
  }, [isManualAppModalOpen, existingRequest]);

  if (!isManualAppModalOpen) return null;

  const handleInitialFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !whatsappNumber.trim()) {
      alert('Please provide your real full names and your WhatsApp or active contact number.');
      return;
    }
    // Prompt if user is ready for communication
    setShowConfirmCommunication(true);
  };

  const handleConfirmCommunication = () => {
    submitManualRequest({
      serviceId: selectedManualService?.id || 'manual_service',
      serviceName: selectedManualService?.name || 'Manual Document Application',
      fullName: fullName.trim(),
      whatsappNumber: whatsappNumber.trim(),
      normalNumber: whatsappNumber.trim(),
    });

    setShowConfirmCommunication(false);
    setSubmittedState('CONFIRMED');
    setIsEditingNew(false);
  };

  // Status badge styling helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-800 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            <span>Under Admin Review</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/15 text-blue-800 border border-blue-500/30">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>On Progress</span>
          </span>
        );
      case 'APPROVED':
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Accepted</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/15 text-rose-800 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#101010]/10 text-[#101010]">
            <Clock className="w-3.5 h-3.5" />
            <span>Under Admin Review</span>
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => setManualAppModalOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#E7E2DE] border-none rounded-[28px] max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-left text-[#101010] cursor-default"
      >
        <button
          type="button"
          onClick={() => setManualAppModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#101010]/10 text-[#101010] hover:bg-[#101010] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. CONFIRMATION PROMPT STEP */}
        {showConfirmCommunication ? (
          <div className="py-4 space-y-5 animate-in fade-in">
            <div className="w-14 h-14 bg-amber-500/20 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-amber-500/30">
              <Phone className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-[#101010]">
                Communication Confirmation
              </h3>
              <p className="text-sm font-semibold text-[#101010]/80 max-w-xs mx-auto">
                Are you ready for communication via WhatsApp or phone call on{' '}
                <strong className="text-[#101010]">{whatsappNumber}</strong>?
              </p>
              <p className="text-xs text-[#101010]/60 max-w-xs mx-auto">
                Once confirmed, your application state will change directly to{' '}
                <strong className="text-[#101010]">Admin Review</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmCommunication}
                className="flex-1 py-3 px-5 bg-[#101010] hover:bg-[#222222] text-white rounded-2xl text-xs font-extrabold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Yes, I am Ready</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmCommunication(false)}
                className="py-3 px-5 bg-[#D8D2CE] hover:bg-[#dad5d0] text-[#101010] rounded-2xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : submittedState === 'CONFIRMED' || (existingRequest && !isEditingNew) ? (
          /* 2. EXISTING APPLICATION STATE DISPLAY */
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#101010] text-white shadow-xs">
                <Phone className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#101010]/10 text-[#101010]">
                  Application Status
                </span>
                <h3 className="text-lg font-bold text-[#101010] mt-0.5">
                  {selectedManualService?.name || 'Manual Document Application'}
                </h3>
              </div>
            </div>

            <div className="p-4 bg-white/70 border border-[#C8C2BE] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#101010]/70 uppercase tracking-wider">
                  Current State
                </span>
                {renderStatusBadge(existingRequest?.status || 'PENDING')}
              </div>

              {/* State Explanatory Text */}
              <div className="p-3 bg-[#E7E2DE] rounded-xl text-xs text-[#101010]">
                {(!existingRequest || existingRequest.status === 'PENDING') && (
                  <p className="font-semibold text-amber-900 leading-relaxed">
                    <strong>Admin Review</strong>. We have received your manual application. Our administrators are currently reviewing your request. Please keep your phone reachable.
                  </p>
                )}
                {existingRequest?.status === 'PROCESSING' && (
                  <p className="font-semibold text-blue-900 leading-relaxed">
                    <strong>On Progress</strong>. Your manual application is actively being processed by our operations desk.
                  </p>
                )}
                {(existingRequest?.status === 'APPROVED' || existingRequest?.status === 'COMPLETED') && (
                  <p className="font-semibold text-emerald-900 leading-relaxed">
                    <strong>Accepted</strong>. Your manual request was approved! Get ready for an admin call or WhatsApp message on your provided number.
                  </p>
                )}
                {existingRequest?.status === 'REJECTED' && (
                  <p className="font-semibold text-rose-900 leading-relaxed">
                    <strong>Rejected</strong>. Your request could not be processed at this time. You can submit a new application below.
                  </p>
                )}
              </div>

              {/* Submitted Details */}
              <div className="space-y-1.5 pt-1 text-xs text-[#101010]">
                <div className="flex items-center justify-between">
                  <span className="text-[#101010]/60 font-medium">Applicant Name:</span>
                  <span className="font-bold text-[#101010]">{existingRequest?.fullName || fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#101010]/60 font-medium">WhatsApp / Active Number:</span>
                  <span className="font-bold text-[#101010]">{existingRequest?.whatsappNumber || whatsappNumber}</span>
                </div>
                {existingRequest?.date && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#101010]/60 font-medium">Submitted At:</span>
                    <span className="font-medium text-[#101010]/80">{existingRequest.date}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {existingRequest?.status === 'REJECTED' ? (
                <button
                  type="button"
                  onClick={() => setIsEditingNew(true)}
                  className="flex-1 py-3 px-5 bg-[#101010] hover:bg-[#222222] text-white rounded-2xl text-xs font-extrabold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Submit New Application</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingNew(true)}
                  className="flex-1 py-3 px-5 bg-[#E7E2DE] hover:bg-[#dad5d0] border border-[#C8C2BE] text-[#101010] rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Update Contact Details</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setManualAppModalOpen(false)}
                className="py-3 px-5 bg-[#101010] text-white rounded-2xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* 3. NEW APPLICATION FORM (ONLY REAL FULL NAMES & WHATSAPP/ACTIVE NUMBER) */
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#101010] text-white shadow-xs">
                <Phone className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#101010]/10 text-[#101010]">
                  Request Manual Application
                </span>
                <h3 className="text-lg font-bold text-[#101010] mt-0.5">
                  {selectedManualService?.name || 'Manual Document Application'}
                </h3>
              </div>
            </div>

            <p className="text-xs text-[#101010]/80 leading-relaxed mb-5 font-medium">
              Fill in your contact details below. Our administrative team will review your application and reach out via WhatsApp or phone call.
            </p>

            <form onSubmit={handleInitialFormSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#101010] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#101010]" />
                  Real Full Names *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Juma Ally Mohamed"
                  className="w-full px-4 py-3 bg-white border border-[#C8C2BE] rounded-xl text-xs font-semibold text-[#101010] focus:outline-none focus:border-[#101010] shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#101010] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  WhatsApp or Active Number *
                </label>
                <input
                  type="text"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. +255 712 345 678"
                  className="w-full px-4 py-3 bg-white border border-[#C8C2BE] rounded-xl text-xs font-semibold text-[#101010] focus:outline-none focus:border-[#101010] shadow-xs"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 px-5 bg-[#101010] hover:bg-[#222222] text-white rounded-2xl text-xs font-extrabold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Application</span>
                </button>

                <button
                  type="button"
                  onClick={() => setManualAppModalOpen(false)}
                  className="py-3 px-5 bg-[#D8D2CE] hover:bg-[#dad5d0] text-[#101010] rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
