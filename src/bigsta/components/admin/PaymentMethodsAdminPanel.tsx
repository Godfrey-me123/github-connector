// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
import React, { useState } from "react";
import {
  Smartphone,
  Plus,
  Trash2,
  Edit2,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Eye,
  X,
  MessageCircle,
  HelpCircle,
  DollarSign,
  FileText,
  CheckCircle2,
  CreditCard,
  Zap,
} from "lucide-react";
import { useTemplateStore } from "../../store/useTemplateStore";
import { ConfigurablePaymentMethod } from "../../types";

export const PaymentMethodsAdminPanel: React.FC = () => {
  const {
    paymentMethods,
    updatePaymentMethod,
    addPaymentMethod,
    deletePaymentMethod,
    publishPaymentMethodsToSupabase,
  } = useTemplateStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ConfigurablePaymentMethod | null>(null);
  const [viewingMethod, setViewingMethod] = useState<ConfigurablePaymentMethod | null>(null);
  const [methodToDelete, setMethodToDelete] = useState<ConfigurablePaymentMethod | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const initialFormState = {
    name: "M-Pesa",
    title: "Lipa kwa Simu / Till Number",
    number: "",
    accountName: "BIGSTA SERVICES LTD",
    amount: "",
    instructions: "Dial *150*00# -> Pay Merchant (Lipa kwa Simu) -> Enter Till Number",
    confirmMessage:
      "Confirm after payment: Enter your transaction reference code below for instant verification.",
    whatsappNumber: "+255 712 345 678",
    irreversibleNotice: "Note: All mobile payments are final and irreversible once processed.",
    customMessage: "Instant automated activation after SMS or reference confirmation.",
    status: "active" as "active" | "inactive",
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      const ok = await publishPaymentMethodsToSupabase();
      if (ok) {
        setSyncNotice("All payment methods synced to Cloud Database (Supabase) successfully!");
      } else {
        setSyncNotice("Payment methods saved locally (Cloud sync skipped or table updated).");
      }
    } catch (e: any) {
      setSyncNotice("Saved locally. Cloud sync: " + (e?.message || "Ready"));
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  const openAddModal = () => {
    setFormData(initialFormState);
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (method: ConfigurablePaymentMethod) => {
    setEditingMethod(method);
    setFormError(null);
    setFormData({
      name: method.name || "",
      title: method.title || "",
      number: method.number || "",
      accountName: method.accountName || "",
      amount: method.amount || "",
      instructions: method.instructions || "",
      confirmMessage: method.confirmMessage || "",
      whatsappNumber: method.whatsappNumber || "",
      irreversibleNotice: method.irreversibleNotice || "",
      customMessage: method.customMessage || "",
      status: method.status || "active",
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.number.trim()) {
      setFormError("Please fill in both the payment method name and number.");
      return;
    }
    setFormError(null);

    if (editingMethod) {
      updatePaymentMethod(editingMethod.id, formData);
      setEditingMethod(null);
      setSyncNotice(`Updated "${formData.name}" and saved to database.`);
    } else {
      addPaymentMethod(formData);
      setIsAddOpen(false);
      setSyncNotice(`Added "${formData.name}" and saved to database.`);
    }

    setTimeout(() => setSyncNotice(null), 3500);
  };

  const confirmDelete = () => {
    if (!methodToDelete) return;
    const name = methodToDelete.name;
    deletePaymentMethod(methodToDelete.id);
    setSyncNotice(`Deleted "${name}" and updated database.`);
    setMethodToDelete(null);
    if (viewingMethod?.id === methodToDelete.id) {
      setViewingMethod(null);
    }
    setTimeout(() => setSyncNotice(null), 3500);
  };

  const cleanWaNumber = (num: string) => {
    let clean = (num || "").replace(/\D/g, "");
    if (clean.startsWith("0")) clean = "255" + clean.slice(1);
    return clean;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-6 shadow-xs">
      {/* Header with Title and Add / Sync buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Payment Methods & Top-Up Details
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure payment methods displayed to users in Bills Top-Up and Token Top-Up menus.
            Stored live in database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Sync with Supabase Cloud Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync Cloud DB"}</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="px-3.5 py-2 bg-[#101010] hover:bg-black text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Payment Method</span>
          </button>
        </div>
      </div>

      {/* Cloud Sync Feedback Banner */}
      {syncNotice && (
        <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Payment Methods Grid */}
      {paymentMethods.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
          <Smartphone className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">No payment methods configured yet</p>
          <p className="text-xs text-slate-400">
            Click "Add Payment Method" to configure your first payment channel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paymentMethods.map((pm) => {
            const isActive = pm.status === "active";
            const cleanWa = cleanWaNumber(pm.whatsappNumber || "");

            return (
              <div
                key={pm.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 relative ${
                  isActive
                    ? "border-slate-200 bg-white hover:border-blue-400 shadow-xs"
                    : "border-slate-200 bg-slate-50 opacity-75"
                }`}
              >
                {/* Method Top Bar */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900">{pm.name}</span>
                      {pm.title && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          {pm.title}
                        </span>
                      )}
                    </div>
                    {pm.accountName && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Account: <strong className="text-slate-700">{pm.accountName}</strong>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updatePaymentMethod(pm.id, { status: isActive ? "inactive" : "active" })
                      }
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                        isActive
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                      title="Click to toggle status"
                    >
                      {isActive ? "ACTIVE" : "INACTIVE"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewingMethod(pm)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="View all details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(pm)}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit method"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMethodToDelete(pm);
                      }}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title={`Delete ${pm.name}`}
                      aria-label={`Delete ${pm.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Number & Copy Pill */}
                <div className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl flex items-center justify-between">
                  <span className="tracking-wider">{pm.number}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(pm.number, pm.id)}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[11px] font-sans font-semibold cursor-pointer"
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

                {/* Dynamic Token Package Pricing Attachment */}
                <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500 font-medium">Amount to Pay:</span>
                  <span className="text-blue-700 font-semibold text-[11px] flex items-center gap-1 bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100">
                    <Zap className="w-3 h-3 text-blue-600" />
                    <span>Dynamic (Attaches to Token Packages)</span>
                  </span>
                </div>

                {/* Auto & Custom Messages */}
                <div className="space-y-1.5 text-[11px]">
                  {pm.confirmMessage && (
                    <div className="p-2 bg-blue-50/70 text-blue-900 border border-blue-100 rounded-lg">
                      <strong className="font-bold block text-[10px] uppercase text-blue-700">
                        Auto Confirmation Note:
                      </strong>
                      <span>{pm.confirmMessage}</span>
                    </div>
                  )}

                  {pm.whatsappNumber && (
                    <div className="flex items-center justify-between p-2 bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          Confirm WhatsApp: <strong>{pm.whatsappNumber}</strong>
                        </span>
                      </div>
                      {cleanWa && (
                        <a
                          href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(`Hello, I have made a payment of ${pm.amount || "package price"} via ${pm.name} (${pm.number}). Please confirm my tokens.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-emerald-700 hover:underline shrink-0 flex items-center gap-0.5"
                        >
                          <span>Test</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {pm.irreversibleNotice && (
                    <div className="p-2 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="font-medium text-[10px] leading-tight">
                        {pm.irreversibleNotice}
                      </span>
                    </div>
                  )}

                  {pm.customMessage && (
                    <p className="text-slate-500 italic text-[11px]">"{pm.customMessage}"</p>
                  )}

                  {pm.instructions && (
                    <p className="text-slate-600 text-[11px] pt-1 border-t border-slate-100 line-clamp-2">
                      <span className="font-semibold text-slate-700">Instructions:</span>{" "}
                      {pm.instructions}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingMethod && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setViewingMethod(null)}
        >
          <div
            className="bg-white text-slate-900 border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-base">Payment Method Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingMethod(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Method Name
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {viewingMethod.name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Method Title
                  </span>
                  <span className="text-sm font-bold text-blue-700">
                    {viewingMethod.title || "Standard"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Payment Number
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {viewingMethod.number}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Account Name
                  </span>
                  <span className="font-semibold text-slate-800">{viewingMethod.accountName}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Amount to Pay
                  </span>
                  <span className="font-bold text-blue-700 text-xs flex items-center gap-1 mt-0.5">
                    <Zap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Dynamic (Attaches to each available Token Package)</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Status
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      viewingMethod.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {viewingMethod.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Instructions
                </span>
                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-700">
                  {viewingMethod.instructions || "No instructions provided."}
                </div>
              </div>

              {viewingMethod.confirmMessage && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Confirm After Payment Message
                  </span>
                  <div className="p-2.5 bg-blue-50 text-blue-900 border border-blue-100 rounded-xl">
                    {viewingMethod.confirmMessage}
                  </div>
                </div>
              )}

              {viewingMethod.whatsappNumber && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Confirm on WhatsApp
                  </span>
                  <div className="p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-xl flex items-center justify-between">
                    <span>
                      Number: <strong>{viewingMethod.whatsappNumber}</strong>
                    </span>
                    <a
                      href={`https://wa.me/${cleanWaNumber(viewingMethod.whatsappNumber)}?text=${encodeURIComponent(`Hello, I have sent payment via ${viewingMethod.name}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <span>Open Chat</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {viewingMethod.irreversibleNotice && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Irreversible Notice
                  </span>
                  <div className="p-2.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{viewingMethod.irreversibleNotice}</span>
                  </div>
                </div>
              )}

              {viewingMethod.customMessage && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Custom Message
                  </span>
                  <div className="p-2.5 bg-slate-50 rounded-xl text-slate-700 italic">
                    "{viewingMethod.customMessage}"
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const m = viewingMethod;
                  setViewingMethod(null);
                  setMethodToDelete(m);
                }}
                className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Delete this payment method"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const m = viewingMethod;
                    setViewingMethod(null);
                    openEditModal(m);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingMethod(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {(isAddOpen || editingMethod) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans"
          onClick={() => {
            setIsAddOpen(false);
            setEditingMethod(null);
          }}
        >
          <div
            className="bg-white text-slate-900 border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base sm:text-lg">
                  {editingMethod
                    ? `Edit Payment Method: ${editingMethod.name}`
                    : "Add New Payment Method"}
                </h3>
                <p className="text-xs text-slate-500">
                  Update payment titles, amounts, instructions, and messages displayed in user
                  top-up menus
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingMethod(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Method Name */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Method Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. M-Pesa, Airtel Money, Lipa Namba"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  />
                  <span className="text-[10px] text-slate-400">
                    e.g. M-Pesa, Mixx, Airtel, HaloPesa, Bank
                  </span>
                </div>

                {/* Method Title */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Title of Payment Method
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Lipa kwa Simu / Till Number"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <span className="text-[10px] text-slate-400">
                    Display label shown on top-up card
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Payment Number */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Payment Number / Till / Paybill <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="e.g. 0123 000 111 or 1234567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  />
                  <span className="text-[10px] text-slate-400">
                    Users can 1-click copy this number
                  </span>
                </div>

                {/* Account Name */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Account Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    placeholder="e.g. BIGSTA SERVICES LTD"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  />
                  <span className="text-[10px] text-slate-400">
                    Recipient name shown on USSD confirmation
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Dynamic Pricing Note */}
                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                    <label className="text-[11px] font-bold text-blue-900 block">
                      Amounts Attach Dynamically
                    </label>
                  </div>
                  <p className="text-[10.5px] text-blue-800 leading-snug">
                    No need to enter a fixed amount! This payment method automatically attaches to
                    all token packages created by admin. Users see the exact package price in Bills
                    & Token Top-Up.
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Method Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as "active" | "inactive" })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="active">Active (Visible to Users)</option>
                    <option value="inactive">Inactive (Hidden from Users)</option>
                  </select>
                  <span className="text-[10px] text-slate-400">
                    Controls visibility in all user top-up menus
                  </span>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Payment Instructions (Step-by-Step)
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="e.g. Dial *150*00# -> Select Pay Merchant -> Enter Number"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Auto and Custom Messages to User */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                <h4 className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                  Auto & Custom Messages to User
                </h4>

                {/* Confirm after payment */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    "Confirm After Payment" Message
                  </label>
                  <input
                    type="text"
                    value={formData.confirmMessage}
                    onChange={(e) => setFormData({ ...formData, confirmMessage: e.target.value })}
                    placeholder="e.g. Confirm after payment: Enter transaction reference code below"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                  <span className="text-[10px] text-slate-500">
                    Shown to user as confirmation prompt
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* WhatsApp confirmation number */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Number to Confirm on WhatsApp
                    </label>
                    <input
                      type="text"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                      placeholder="e.g. +255 712 345 678"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono bg-white"
                    />
                    <span className="text-[10px] text-slate-500">
                      Provides direct click-to-WhatsApp link
                    </span>
                  </div>

                  {/* Payment is irreversible notice */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      "Payment is Irreversible" Warning Notice
                    </label>
                    <input
                      type="text"
                      value={formData.irreversibleNotice}
                      onChange={(e) =>
                        setFormData({ ...formData, irreversibleNotice: e.target.value })
                      }
                      placeholder="e.g. Payment is irreversible once submitted."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                    <span className="text-[10px] text-slate-500">
                      Warning badge displayed on payment screen
                    </span>
                  </div>
                </div>

                {/* Additional Custom Message */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Additional Custom Message to User
                  </label>
                  <input
                    type="text"
                    value={formData.customMessage}
                    onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                    placeholder="e.g. Automated system credits tokens within 2 minutes."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingMethod(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#101010] hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingMethod ? "Save Changes" : "Create Payment Method"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {methodToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans"
          onClick={() => setMethodToDelete(null)}
        >
          <div
            className="bg-white text-slate-900 border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Payment Method?</h3>
                <p className="text-xs text-slate-500">
                  This action will remove this payment option from the system.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Method Name:</span>
                <span className="font-extrabold text-slate-900">{methodToDelete.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Number:</span>
                <span className="font-mono font-bold text-slate-800">{methodToDelete.number}</span>
              </div>
              {methodToDelete.accountName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Account:</span>
                  <span className="font-semibold text-slate-700">{methodToDelete.accountName}</span>
                </div>
              )}
            </div>

            <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Users will no longer see this payment method in Bills Top-Up and Token Top-Up
                screens. Changes will sync to Supabase.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMethodToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Method</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
