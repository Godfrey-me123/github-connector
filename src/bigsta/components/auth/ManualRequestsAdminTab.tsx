import React, { useState } from 'react';
import { Phone, MessageSquare, User, Calendar, CheckCircle2, Clock, Trash2, Check, AlertCircle, ExternalLink, Shield } from 'lucide-react';
import { useTemplateStore, ManualRequestItem } from '../../store/useTemplateStore';

export const ManualRequestsAdminTab: React.FC = () => {
  const { manualRequests, updateManualRequestStatus, deleteManualRequest, currentAuthKey } = useTemplateStore();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRequests = manualRequests.filter((req) => {
    const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
    const callNum = req.normalCallNumber || req.normalNumber || '';
    const matchesSearch =
      req.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.whatsappNumber.includes(searchQuery) ||
      callNum.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: ManualRequestItem['status']) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">PENDING</span>;
      case 'PROCESSING':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300">PROCESSING</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-300">APPROVED</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">COMPLETED</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-900 border border-rose-300">REJECTED</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-[#000000] uppercase tracking-wider flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-600" />
            Manual Application Requests ({manualRequests.length})
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage incoming manual service applications submitted by users for offline or assisted processing.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, service..."
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-[#000000] focus:outline-none focus:border-blue-500 w-full sm:w-60"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-[#000000]"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="APPROVED">Approved</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-2xl space-y-3">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-800">No Manual Requests Found</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            When users submit manual application requests from service info modals, they will appear here with contact details and timestamps.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-gray-300 transition-all"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold uppercase px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md border border-gray-200">
                    {req.serviceName}
                  </span>
                  {getStatusBadge(req.status)}
                </div>

                <div className="flex items-center gap-2 text-sm font-bold text-[#000000]">
                  <User className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{req.fullName}</span>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-gray-600 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp: <strong className="text-gray-900">{req.whatsappNumber || 'N/A'}</strong></span>
                    {req.whatsappNumber && (
                      <a
                        href={`https://wa.me/${req.whatsappNumber.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(req.fullName)},%20regarding%20your%20manual%20application%20for%20${encodeURIComponent(req.serviceName)}:`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-600 hover:underline inline-flex items-center gap-0.5 ml-1 font-bold"
                      >
                        <ExternalLink className="w-3 h-3" /> Chat
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Call: <strong className="text-gray-900">{req.normalCallNumber || req.normalNumber || 'N/A'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-gray-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(req.submittedAt || req.timestamp || Date.now()).toLocaleString()}
                  </span>
                  {(req.userPasskey || req.accountKey) && (
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-semibold">
                      Account Key: {req.userPasskey || req.accountKey}
                    </span>
                  )}
                </div>
              </div>

              {/* Admin Control Actions */}
              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                <select
                  value={req.status}
                  onChange={(e: any) => updateManualRequestStatus(req.id, e.target.value)}
                  className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none"
                >
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="APPROVED">Approved</option>
                  <option value="COMPLETED">Completed</option>
                </select>

                <button
                  type="button"
                  onClick={() => deleteManualRequest(req.id)}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition-colors cursor-pointer"
                  title="Delete Request"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
