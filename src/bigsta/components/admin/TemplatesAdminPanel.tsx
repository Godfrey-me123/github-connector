import { bigstaConfirm } from "../common/BigstaConfirmModal";
// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  Trash2,
  Eye,
  Layers,
  CheckCircle2,
  XCircle,
  FolderInput,
} from "lucide-react";
import { supabase, TEMPLATE_CATEGORY_CONFIG, normalizeTemplateCategory } from "../../services/supabase";

const CATEGORY_OPTIONS = Object.keys(TEMPLATE_CATEGORY_CONFIG);

function parseJson(value: any): any {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function rowSide(row: any): "Front Side" | "Back Side" {
  const parsed = parseJson(row.template_json);
  const side = parsed?.side || (parsed?.isBackSide ? "Back Side" : "Front Side");
  return String(side).toLowerCase().includes("back") ? "Back Side" : "Front Side";
}

export const TemplatesAdminPanel: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [preview, setPreview] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("templates")
      .select("id, service_type, template_name, background_url, is_universal, is_active, version, updated_at, template_json")
      .order("updated_at", { ascending: false });
    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (categoryFilter !== "all") {
      list = list.filter((r) => normalizeTemplateCategory(r.service_type) === categoryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          String(r.template_name || "").toLowerCase().includes(q) ||
          String(r.service_type || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, search, categoryFilter]);

  const updateRow = async (id: string, patch: Record<string, any>) => {
    setBusyId(id);
    const { error: err } = await supabase
      .from("templates")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (err) setError(err.message);
    await load();
    setBusyId(null);
  };

  const reassignCategory = async (row: any, newCategory: string) => {
    const parsed = parseJson(row.template_json) || {};
    parsed.serviceId = newCategory;
    parsed.cardType = newCategory;
    await updateRow(row.id, { service_type: newCategory, template_json: parsed });
  };

  const removeRow = async (row: any) => {
    if (!(await bigstaConfirm(`Delete template "${row.template_name}"? This cannot be undone.`))) return;
    setBusyId(row.id);
    const { error: err } = await supabase.from("templates").delete().eq("id", row.id);
    if (err) setError(err.message);
    await load();
    setBusyId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="flex-1 text-sm outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold"
        >
          <option value="all">All categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-black"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-black text-gray-900">
            {filtered.length} template{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400 font-bold">Loading templates...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400 font-bold">No templates found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((row) => {
              const side = rowSide(row);
              const category = normalizeTemplateCategory(row.service_type);
              return (
                <div key={row.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
                  {row.background_url ? (
                    <img
                      src={row.background_url}
                      alt=""
                      className="w-16 h-10 object-cover rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-10 rounded-lg bg-gray-100 border border-gray-200" />
                  )}
                  <div className="flex-1 min-w-[160px]">
                    <div className="text-sm font-black text-gray-900">{row.template_name}</div>
                    <div className="text-[11px] text-gray-500 font-bold flex flex-wrap gap-2 mt-0.5">
                      <span className="bg-gray-100 rounded px-1.5 py-0.5">{category}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 ${
                          side === "Back Side" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {side}
                      </span>
                      {row.is_universal && (
                        <span className="bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">universal</span>
                      )}
                      <span
                        className={`rounded px-1.5 py-0.5 flex items-center gap-1 ${
                          row.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {row.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {row.is_active ? "active" : "inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={category}
                      disabled={busyId === row.id}
                      onChange={(e) => reassignCategory(row, e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                      title="Reassign category"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => updateRow(row.id, { is_active: !row.is_active })}
                      disabled={busyId === row.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black ${
                        row.is_active
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {row.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => setPreview(row)}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => removeRow(row)}
                      disabled={busyId === row.id}
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">{preview.template_name}</h3>
              <button
                onClick={() => setPreview(null)}
                className="p-2 hover:bg-gray-100 rounded-xl"
              >
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            {preview.background_url && (
              <img
                src={preview.background_url}
                alt=""
                className="w-full rounded-xl border border-gray-200"
              />
            )}
            <div className="text-xs text-gray-500 font-bold space-y-1">
              <div>
                <FolderInput className="w-3 h-3 inline mr-1" />
                Category: {normalizeTemplateCategory(preview.service_type)} · Side: {rowSide(preview)}
              </div>
              <div>Version: {preview.version} · Updated: {new Date(preview.updated_at).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
