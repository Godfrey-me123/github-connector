import React, { useState } from "react";
import { X, UserPlus, Eye, EyeOff, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { adminApiFetch } from "../../services/adminApi";
import { useTemplateStore } from "../../store/useTemplateStore";

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { fetchPasskeysFromSupabase } = useTemplateStore();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [initialTokens, setInitialTokens] = useState<number>(5);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    let gen = "";
    for (let i = 0; i < 10; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(gen);
    setShowPassword(true);
  };

  const handleRoleChange = (newRole: "user" | "admin") => {
    setRole(newRole);
    if (newRole === "admin") {
      setInitialTokens(99999);
    } else if (initialTokens === 99999) {
      setInitialTokens(5);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (cleanName.length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setError("Please provide a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await adminApiFetch("/api/admin/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
          password,
          phone: cleanPhone,
          role,
          initialTokens: Number(initialTokens) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create account.");
      }

      setSuccessMsg(`Account created successfully for ${cleanEmail} with ${role.toUpperCase()} role.`);
      await fetchPasskeysFromSupabase?.();
      onSuccess?.();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "An error occurred while creating the account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={(event) => event.stopPropagation()} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Create Account</h3>
              <p className="text-[11px] text-gray-500 font-medium">Add User or Admin with email & password</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Juma Rashid"
              className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                Password *
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Auto-generate
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full pl-3.5 pr-10 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                Account Role
              </label>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as "user" | "admin")}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-bold bg-white"
              >
                <option value="user">Standard User</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
              Initial Tokens
            </label>
            <input
              type="number"
              min="0"
              value={initialTokens}
              onChange={(e) => setInitialTokens(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              {role === "admin" ? "Admins receive unlimited/99999 tokens by default." : "Default for new regular users is 5 tokens."}
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
