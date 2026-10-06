// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
import React, { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import {
  MessageSquare,
  Download,
  CheckCircle,
  Clock,
  Trash2,
  RefreshCw,
  Paperclip,
  Star,
  Eye,
  X,
  Filter,
  Send,
} from "lucide-react";

/*
 * SUPABASE DATABASE & STORAGE SETUP FOR USER FEEDBACK:
 * 1. Create table 'user_feedback' in Supabase SQL editor:
 *    CREATE TABLE IF NOT EXISTS public.user_feedback (
 *      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *      user_name TEXT,
 *      user_contact TEXT,
 *      feedback_type TEXT DEFAULT 'App Maintenance',
 *      rating INT DEFAULT 5,
 *      comment TEXT NOT NULL,
 *      attachment_path TEXT,
 *      attachment_name TEXT,
 *      attachment_data TEXT, -- Base64 fallback if bucket missing
 *      status TEXT DEFAULT 'PENDING',
 *      created_at TIMESTAMPTZ DEFAULT NOW(),
 *      updated_at TIMESTAMPTZ DEFAULT NOW()
 *    );
 * 2. Storage Bucket: Create bucket 'feedback_attachments' in Supabase Storage.
 */

const BUCKET = "feedback_attachments";

export const UserFeedbackAdminPanel: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchFeedbacks = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from("user_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (sbError) {
        // Fallback to local storage if Supabase table is not provisioned
        const local = localStorage.getItem("bigsta_user_feedbacks");
        if (local) {
          setFeedbacks(JSON.parse(local));
        } else {
          setFeedbacks([]);
        }
        setError(
          "Supabase table not found or connected. Showing local records. Note for developer: please run user_feedback SQL migration.",
        );
      } else {
        setFeedbacks(data || []);
      }
    } catch (e: any) {
      setError(e?.message || "Error fetching feedbacks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setBusyId(id);
    try {
      const { error: err } = await supabase
        .from("user_feedback")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (err) {
        // Fallback local update
        const updated = feedbacks.map((f) => (f.id === id ? { ...f, status: newStatus } : f));
        setFeedbacks(updated);
        localStorage.setItem("bigsta_user_feedbacks", JSON.stringify(updated));
      } else {
        fetchFeedbacks();
      }
    } catch {
      const updated = feedbacks.map((f) => (f.id === id ? { ...f, status: newStatus } : f));
      setFeedbacks(updated);
      localStorage.setItem("bigsta_user_feedbacks", JSON.stringify(updated));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this feedback entry?")) return;
    setBusyId(id);
    try {
      await supabase.from("user_feedback").delete().eq("id", id);
      const updated = feedbacks.filter((f) => f.id !== id);
      setFeedbacks(updated);
      localStorage.setItem("bigsta_user_feedbacks", JSON.stringify(updated));
    } catch {
      const updated = feedbacks.filter((f) => f.id !== id);
      setFeedbacks(updated);
      localStorage.setItem("bigsta_user_feedbacks", JSON.stringify(updated));
    } finally {
      setBusyId(null);
    }
  };

  const handleDownloadAttachment = async (item: any) => {
    if (item.attachment_data) {
      // Download Base64 data
      const a = document.createElement("a");
      a.href = item.attachment_data;
      a.download = item.attachment_name || "feedback-attachment";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    if (item.attachment_path) {
      try {
        const { data, error: downloadErr } = await supabase.storage
          .from(BUCKET)
          .download(item.attachment_path);

        if (downloadErr || !data) {
          alert(
            "Could not download file from storage bucket: " +
              (downloadErr?.message || "File missing"),
          );
          return;
        }

        const a = document.createElement("a");
        a.href = URL.createObjectURL(data);
        a.download = item.attachment_name || "feedback-attachment";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      } catch (e: any) {
        alert("Download error: " + (e?.message || e));
      }
    }
  };

  const filteredFeedbacks = feedbacks.filter((f) => {
    const matchesFilter =
      filterType === "all" || f.status === filterType || f.feedback_type === filterType;
    const matchesSearch =
      !searchQuery ||
      (f.user_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.user_contact || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.comment || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" /> User Feedback ({feedbacks.length})
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Reviews, maintenance comments, and uploaded attachments
          </p>
        </div>
        <button
          onClick={fetchFeedbacks}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
          {["all", "PENDING", "REVIEWED", "RESOLVED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterType(st)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                filterType === st
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {st === "all" ? "All Status" : st}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search comments or users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-gray-900"
        />
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="py-8 text-center text-xs text-gray-500">Loading user feedbacks...</div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          No feedback entries found.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeedbacks.map((f) => (
            <div
              key={f.id}
              className="border border-gray-200 rounded-2xl p-4 space-y-3 hover:border-gray-300 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">
                      {f.user_name || "Anonymous User"}
                    </span>
                    {f.user_contact && (
                      <span className="text-xs text-gray-500">({f.user_contact})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {f.feedback_type || "General"}
                    </span>
                    {f.rating && (
                      <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {f.rating}/5
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400">
                      {new Date(f.created_at || Date.now()).toLocaleString()}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                    f.status === "RESOLVED"
                      ? "bg-emerald-100 text-emerald-800"
                      : f.status === "REVIEWED"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {f.status || "PENDING"}
                </span>
              </div>

              {/* Comment Content */}
              <p className="text-xs text-gray-800 bg-gray-50 p-3 rounded-xl whitespace-pre-wrap leading-relaxed">
                {f.comment}
              </p>

              {/* Attachment Button */}
              {(f.attachment_name || f.attachment_path || f.attachment_data) && (
                <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100 p-2.5 rounded-xl">
                  <span className="text-xs font-semibold text-blue-900 flex items-center gap-1.5 truncate">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    {f.attachment_name || "Attached File"}
                  </span>
                  <button
                    onClick={() => handleDownloadAttachment(f)}
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              )}

              {/* Status Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={busyId === f.id}
                    onClick={() => handleUpdateStatus(f.id, "REVIEWED")}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <Clock className="w-3 h-3 text-blue-600" /> Review
                  </button>
                  <button
                    disabled={busyId === f.id}
                    onClick={() => handleUpdateStatus(f.id, "RESOLVED")}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle className="w-3 h-3" /> Resolve
                  </button>
                </div>

                <button
                  disabled={busyId === f.id}
                  onClick={() => handleDelete(f.id)}
                  className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-auto space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-gray-900">Feedback Details</h3>
              <button onClick={() => setSelectedItem(null)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-600">{selectedItem.comment}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserFeedbackAdminPanel;
