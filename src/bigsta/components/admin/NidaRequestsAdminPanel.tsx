// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
import { RequestFilterBar, filterRequestRows } from "../common/RequestFilterBar";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import React, { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import { Eye, Download, Send, RotateCcw, RefreshCw, X, MessageCircle } from "lucide-react";
import { triggerUniversalDownload } from "../../utils/downloadHelper";

const BUCKET = "nida_responses";

const FIELDS: [string, string][] = [
  ["nida_no", "NIDA No."],
  ["whatsapp_number", "WhatsApp"],
  ["requester_name", "Requester"],
  ["requester_key", "Requester passkey"],
  ["mother_name", "Mother's name"],
  ["ward_of_residence", "Ward of residence"],
  ["district_of_birth", "District of birth"],
  ["street_village", "Street/Village"],
  ["request_type", "Needs"],
  ["status", "Status"],
  ["admin_message", "Admin message"],
  ["created_at", "Submitted"],
];

const fmt = (k: string, v: any) =>
  k.endsWith("_at") && v ? new Date(v).toLocaleString() : (v ?? "—");

const statusColor = (s: string) =>
  s === "DELIVERED"
    ? "bg-emerald-100 text-emerald-700"
    : s === "RESPONDED"
      ? "bg-blue-100 text-blue-700"
      : s === "INFO_REQUESTED"
        ? "bg-amber-100 text-amber-700"
        : "bg-gray-100 text-gray-700";

const waLink = (num: string, text: string) => {
  let n = (num || "").replace(/\D/g, "");
  if (n.startsWith("0")) n = "255" + n.slice(1);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
};

export const NidaRequestsAdminPanel: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [respondTo, setRespondTo] = useState<any | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("nida_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRequests(data || []);
    setLoading(false);
  };

  useAutoRefresh(() => fetchRequests());

  useEffect(() => {
    fetchRequests();
  }, []);

  const download = async (r: any) => {
    const text = FIELDS.map(([k, l]) => `${l}: ${fmt(k, r[k])}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    await triggerUniversalDownload({
      fileName: `nida-request-${r.nida_no || r.id}.txt`,
      content: blob,
      mimeType: "text/plain",
    });
  };

  const requestInfoAgain = async (r: any) => {
    const note = window.prompt(
      "What should the user correct?",
      r.admin_message || "Please check your details and submit again.",
    );
    if (note === null) return;
    setBusy(true);
    const { error } = await supabase
      .from("nida_requests")
      .update({
        status: "INFO_REQUESTED",
        admin_message: note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    setBusy(false);
    if (error) return alert("Failed: " + error.message);
    if (r.whatsapp_number && window.confirm("Also send this message on WhatsApp?")) {
      window.open(
        waLink(r.whatsapp_number, `BIGsta NIDA request (${r.nida_no}): ${note}`),
        "_blank",
      );
    }
    fetchRequests();
  };

  const sendResponse = async () => {
    if (!respondTo || (!file && !file2)) return alert("Choose at least one picture or PDF file.");
    const primaryFile = file || file2;
    if (primaryFile && !/^image\/|application\/pdf/.test(primaryFile.type))
      return alert("Only pictures or PDFs are allowed.");
    if (file2 && !/^image\/|application\/pdf/.test(file2.type))
      return alert("Only pictures or PDFs are allowed.");
    setBusy(true);
    try {
      if (respondTo.response_file_path) {
        try {
          await supabase.storage.from(BUCKET).remove([respondTo.response_file_path]);
        } catch {}
      }
      if (respondTo.response_file_path_2) {
        try {
          await supabase.storage.from(BUCKET).remove([respondTo.response_file_path_2]);
        } catch {}
      }

      const path1 = `${respondTo.id}/${Date.now()}-1-${primaryFile.name.replace(/[^\w.-]/g, "_")}`;
      const up1 = await supabase.storage
        .from(BUCKET)
        .upload(path1, primaryFile, { contentType: primaryFile.type, upsert: true });
      if (up1.error) throw up1.error;

      let path2 = null;
      let name2 = null;
      if (file && file2 && file !== file2 && file.name !== file2.name) {
        path2 = `${respondTo.id}/${Date.now()}-2-${file2.name.replace(/[^\w.-]/g, "_")}`;
        const up2 = await supabase.storage
          .from(BUCKET)
          .upload(path2, file2, { contentType: file2.type, upsert: true });
        if (up2.error) throw up2.error;
        name2 = file2.name;
      }

      const updateData: any = {
        status: "RESPONDED",
        response_file_path: path1,
        response_file_name: primaryFile.name,
        admin_message: message || null,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (path2) {
        updateData.response_file_path_2 = path2;
        updateData.response_file_name_2 = name2;
      }

      let { error } = await supabase
        .from("nida_requests")
        .update(updateData)
        .eq("id", respondTo.id);

      // Fallback in case schema update is still processing on remote database
      if (
        error &&
        (error.message?.includes("response_file_path_2") || error.message?.includes("column"))
      ) {
        delete updateData.response_file_path_2;
        delete updateData.response_file_name_2;
        const retry = await supabase
          .from("nida_requests")
          .update(updateData)
          .eq("id", respondTo.id);
        error = retry.error;
      }

      if (error) throw error;

      setRespondTo(null);
      setFile(null);
      setFile2(null);
      setMessage("");
      fetchRequests();
      alert("Response with file(s) sent successfully!");
    } catch (e: any) {
      alert("Failed to send response: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black">NIDA Requests ({requests.length})</h2>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-1 text-xs font-bold text-gray-600"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {!loading && !error && requests.length > 0 && (
        <RequestFilterBar
          rows={requests}
          query={query}
          onQuery={setQuery}
          status={statusFilter}
          onStatus={setStatusFilter}
          placeholder="Search name, NIDA no, passkey, WhatsApp…"
        />
      )}
      {loading ? (
        <p className="text-sm text-gray-500">Loading requests…</p>
      ) : error ? (
        <p className="text-sm text-rose-600">Could not load requests: {error}</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-gray-500">No requests yet.</p>
      ) : (
        <div className="space-y-3">
          {filterRequestRows(requests, query, statusFilter, [
            "requester_name",
            "nida_no",
            "requester_key",
            "whatsapp_number",
            "request_type",
            "id",
          ]).length === 0 && <p className="text-sm text-gray-500">No requests match.</p>}
          {filterRequestRows(requests, query, statusFilter, [
            "requester_name",
            "nida_no",
            "requester_key",
            "whatsapp_number",
            "request_type",
            "id",
          ]).map((r) => (
            <div key={r.id} className="border border-gray-200 rounded-xl p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-black text-sm">NIDA {r.nida_no || "—"}</p>
                  <p className="text-xs text-gray-600">
                    {r.requester_name || "Unknown user"}
                    {r.requester_key ? ` · ${r.requester_key}` : ""}
                  </p>
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> {r.whatsapp_number || "No WhatsApp"} ·{" "}
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                  <p className="text-xs font-semibold text-gray-700">
                    Needs:{" "}
                    <span className="font-bold text-blue-700">
                      {r.request_type === "soft_copy"
                        ? "NIDA Card Soft Copy (PDF / Photo)"
                        : r.request_type}
                    </span>
                  </p>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-1 rounded-full ${statusColor(r.status)}`}
                >
                  {r.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => setPreview(r)}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <button
                  onClick={() => download(r)}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button
                  onClick={() => {
                    setRespondTo(r);
                    setMessage("");
                    setFile(null);
                  }}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white"
                >
                  <Send className="w-3.5 h-3.5" /> Respond
                </button>
                <button
                  disabled={busy}
                  onClick={() => requestInfoAgain(r)}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Request Info Again
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between mb-3">
              <h3 className="font-black">Request details</h3>
              <button onClick={() => setPreview(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              {FIELDS.map(([k, l]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-gray-100 pb-1">
                  <dt className="text-gray-500">{l}</dt>
                  <dd className="font-semibold text-right break-all">
                    {String(fmt(k, preview[k]))}
                  </dd>
                </div>
              ))}
            </dl>
            <button
              onClick={() => download(preview)}
              className="mt-4 w-full bg-gray-900 text-white rounded-lg p-2 text-sm font-bold"
            >
              Download
            </button>
          </div>
        </div>
      )}

      {respondTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md">
            <div className="flex justify-between mb-3">
              <h3 className="font-black">Respond to NIDA {respondTo.nida_no}</h3>
              <button onClick={() => setRespondTo(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Upload picture(s) or PDF(s). You can upload up to 2 files if the user requested two
              items.
            </p>
            <div className="space-y-2 mb-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                  Primary File 1
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="text-xs w-full"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                  Second File 2 (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile2(e.target.files?.[0] || null)}
                  className="text-xs w-full"
                />
              </div>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional message to the user"
              className="w-full border rounded-lg p-2 text-sm mb-3"
              rows={2}
            />
            <button
              disabled={busy || (!file && !file2)}
              onClick={sendResponse}
              className="w-full bg-blue-600 text-white rounded-lg p-2.5 text-sm font-bold disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send to user"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
