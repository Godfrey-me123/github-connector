import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Receipt, 
  Eye, 
  EyeOff,
  Smartphone, 
  Calendar, 
  MoreHorizontal,
  ChevronRight,
  Download,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Settings,
  Webhook,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Ban,
  Zap,
  Activity,
  ShieldCheck as ShieldCheckIcon,
  Bug,
  Edit,
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { PaymentRecord, PaymentStatus, VerificationLog } from '../../types';
import { useTemplateStore } from '../../store/useTemplateStore';
import { UniversalBackButton } from '../common/UniversalBackButton';
import { SmsTransactionsPanel } from './SmsTransactionsPanel';
import { SmsDiagnosticsPanel } from './SmsDiagnosticsPanel';
import { useUnreviewedSmsCount } from '../../hooks/useUnreviewedSmsCount';

export const PaymentDashboard: React.FC = () => {
  const { setActiveScreen } = useTemplateStore();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'verified' | 'rejected' | 'used' | 'manual' | 'settings' | 'debug' | 'monitor' | 'sms_logs' | 'sms_diagnostics'>('all');
  const unreviewedSms = useUnreviewedSmsCount();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Webhook Settings State
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testLogs, setTestLogs] = useState<any[]>([]);
  const [customAppUrl, setCustomAppUrl] = useState(
    'https://new-age-sand.vercel.app'
  );

  const handleSaveAndGenerate = async () => {
    try {
      const trimmedUrl = customAppUrl.trim().replace(/\/+$/, '');
      if (!trimmedUrl) {
        alert('Please enter a valid app deployment URL.');
        return;
      }
      const res = await fetch('/api/admin/webhook-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: `${trimmedUrl}/api/payment-sms`,
          customAppUrl: trimmedUrl
        }),
      });
      const secRes = await fetch('/api/admin/webhook-secret/regenerate', { method: 'POST' });
      const secData = await secRes.json();
      setWebhookSecret(secData.secret);

      alert(`App URL saved and connected successfully!\n\nWebhook Endpoint:\n${trimmedUrl}/api/payment-sms\n\nNew Secret Key generated and saved.`);
    } catch (err) {
      alert('Failed to save and generate webhook settings.');
    }
  };

  // TAB: DEBUG
  const [debugData, setDebugData] = useState<{ 
    count: number; 
    successful: number;
    failed: number;
    hasEverConnected: boolean;
    lastSuccessTimestamp: string | null;
    lastSuccessfulPayload: any;
    lastTestTimestamp: string | null;
    lastTestStatus: string | null;
    lastRequestTime: string | null; 
    lastPayload: any;
    requests: any[] 
  }>({
    count: 0,
    successful: 0,
    failed: 0,
    hasEverConnected: false,
    lastSuccessTimestamp: null,
    lastSuccessfulPayload: null,
    lastTestTimestamp: null,
    lastTestStatus: null,
    lastRequestTime: null,
    lastPayload: null,
    requests: []
  });

  // Match Words state from store
  const { adminSettings, updateAdminSettings, publishAdminSettingsToSupabase } = useTemplateStore();
  const [matchWords, setMatchWords] = useState<string[]>(adminSettings?.matchWords || ['Confirmed', 'Umepokea', 'Imethibitishwa', 'received']);
  const [newMatchWord, setNewMatchWord] = useState('');

  const handleAddMatchWord = () => {
    if (newMatchWord.trim() && !matchWords.includes(newMatchWord.trim())) {
      const updated = [...matchWords, newMatchWord.trim()];
      setMatchWords(updated);
      setNewMatchWord('');
    }
  };

  const handleRemoveMatchWord = (word: string) => {
    setMatchWords(matchWords.filter(w => w !== word));
  };

  const handleSaveMatchWords = async () => {
    updateAdminSettings({ matchWords });
    await publishAdminSettingsToSupabase();
    alert('SMS Match Words updated successfully!');
  };

  const [isVerifying, setIsVerifying] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PaymentRecord>>({});

  // SMS Monitor State
  const [monitorData, setMonitorData] = useState<{
    stats: { total: number; completed: number; failed: number; duplicates: number; pending: number };
    logs: any[];
  }>({
    stats: { total: 0, completed: 0, failed: 0, duplicates: 0, pending: 0 },
    logs: []
  });
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

  // Polling for Monitor Data
  useEffect(() => {
    let interval: any;
    if (activeTab === 'monitor') {
      const fetchMonitor = async () => {
        try {
          const response = await fetch('/api/admin/sms-monitor');
          const data = await response.json();
          setMonitorData(data);
        } catch (e) {
          console.error('Failed to fetch monitor data');
        }
      };
      fetchMonitor();
      interval = setInterval(fetchMonitor, 3000);
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  // Polling for Debug & Settings Stats
  useEffect(() => {
    let interval: any;
    if (activeTab === 'debug' || activeTab === 'settings') {
      const fetchDebug = async () => {
        try {
          const response = await fetch('/api/admin/webhook-debug');
          const data = await response.json();
          setDebugData(data);
        } catch (err) {
          console.error('Failed to fetch debug data:', err);
        }
      };
      fetchDebug();
      interval = setInterval(fetchDebug, activeTab === 'debug' ? 3000 : 10000); // Poll every 3s for debug, 10s for settings
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    loadData();
    fetchWebhookSecret();
  }, []);

  const fetchWebhookSecret = async () => {
    try {
      const response = await fetch('/api/admin/webhook-secret');
      const data = await response.json();
      setWebhookSecret(data.secret);
    } catch (err) {
      console.error('Failed to fetch webhook secret');
    }
  };

  const regenerateSecret = async () => {
    if (!confirm('Are you sure you want to regenerate the secret key? All existing connections will be broken immediately.')) return;
    try {
      const response = await fetch('/api/admin/webhook-secret/regenerate', { method: 'POST' });
      const data = await response.json();
      setWebhookSecret(data.secret);
      alert('Secret key regenerated successfully!');
    } catch (err) {
      alert('Failed to regenerate secret');
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allPayments = await paymentService.getAllPayments();
      setPayments(allPayments.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()));
      const allLogs = await paymentService.getVerificationLogs();
      setLogs(allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    let filtered = payments;
    if (activeTab !== 'all') {
      filtered = filtered.filter(p => p.status === activeTab);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.transactionReference?.toLowerCase().includes(q) || 
        p.senderName?.toLowerCase().includes(q) || 
        p.senderPhone?.includes(q)
      );
    }
    return filtered;
  }, [payments, activeTab, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: payments.length,
      pending: payments.filter(p => p.status === 'pending').length,
      verified: payments.filter(p => p.status === 'verified').length,
      rejected: payments.filter(p => p.status === 'rejected').length,
      totalAmount: payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + (p.amount || 0), 0)
    };
  }, [payments]);

  const copyWebhookUrl = () => {
    const url = `${window.location.origin}/api/payment-sms`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const runConnectionTest = async () => {
    setTestStatus('testing');
    const newLog = { id: Date.now(), type: 'Gateway Connectivity', status: 'PENDING', time: new Date().toLocaleTimeString() };
    setTestLogs(prev => [newLog, ...prev]);

    try {
      const response = await fetch('/api/payment-sms');
      const data = await response.json();
      if (data.status === 'online') {
        setTestStatus('success');
        setTestLogs(prev => prev.map(l => l.id === newLog.id ? { ...l, status: 'SUCCESS' } : l));
      } else {
        throw new Error('Offline');
      }
    } catch (err) {
      setTestStatus('failed');
      setTestLogs(prev => prev.map(l => l.id === newLog.id ? { ...l, status: 'FAILED' } : l));
    }
  };

  const sendTestPayload = async () => {
    setTestStatus('testing');
    const newLog = { id: Date.now(), type: 'Sample Payload', status: 'SENDING', time: new Date().toLocaleTimeString() };
    setTestLogs(prev => [newLog, ...prev]);

    try {
      const response = await fetch('/api/payment-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: webhookSecret,
          sender: "SMSTEST",
          raw_sms: "Tigo Pesa: Confirmed. You have received TSh 10,000 from TEST USER. Ref: TX123456789.",
          device_name: "Admin Web Test",
          isTest: true
        })
      });
      
      if (response.ok) {
        setTestStatus('success');
        setTestLogs(prev => prev.map(l => l.id === newLog.id ? { ...l, status: 'RECEIVED' } : l));
      } else {
        setTestStatus('failed');
        setTestLogs(prev => prev.map(l => l.id === newLog.id ? { ...l, status: 'UNAUTHORIZED' } : l));
      }
    } catch (err) {
      setTestStatus('failed');
      setTestLogs(prev => prev.map(l => l.id === newLog.id ? { ...l, status: 'ERROR' } : l));
    }
  };

  const handleApprove = async (paymentId: string) => {
    if (!confirm('Manually approve this payment?')) return;
    try {
      if (!selectedPayment) throw new Error('No payment selected');
      await paymentService.verifyPaymentManually(paymentId, 'admin', selectedPayment.tokensGranted || 0, selectedPayment.passkeyId);
      alert('Payment verified and tokens granted!');
      loadData();
    } catch (e) {
      alert('Failed to verify: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleReject = async (paymentId: string) => {
    if (!confirm('Reject this payment?')) return;
    try {
      await paymentService.rejectPayment(paymentId, 'admin', 'Rejected by admin');
      alert('Payment rejected');
      loadData();
    } catch (e) {
      alert('Failed to reject');
    }
  };

  const handleReactivate = async (paymentId: string) => {
    if (!confirm('Reactivate this payment to ACTIVE/VERIFIED status?')) return;
    try {
      await paymentService.reactivatePayment(paymentId, 'admin');
      alert('Payment reactivated!');
      loadData();
    } catch (e) {
      alert('Failed to reactivate');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    try {
      await paymentService.updatePaymentRecord(selectedPayment.id, editForm, 'admin');
      setIsEditModalOpen(false);
      setSelectedPayment(prev => prev ? { ...prev, ...editForm } : null);
      loadData();
    } catch (e) {
      alert('Update failed');
    }
  };

  const openEditModal = () => {
    if (!selectedPayment) return;
    setEditForm({
      transactionReference: selectedPayment.transactionReference,
      senderName: selectedPayment.senderName,
      senderPhone: selectedPayment.senderPhone,
      amount: selectedPayment.amount,
    });
    setIsEditModalOpen(true);
  };

  const renderPaymentList = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Volume', value: stats.total, icon: Receipt, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Verified', value: stats.verified, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Manual Review', value: stats.rejected, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} border border-gray-200 rounded-3xl p-6 shadow-sm`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl ${stat.bg} border border-gray-100`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color} tracking-tight`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search Reference, Sender or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-6 py-3 bg-gray-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-gray-900/20 active:scale-95 transition-all">
            Filter
          </button>
          <button onClick={loadData} className="p-3 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-all active:rotate-180 duration-500">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Payment Table */}
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sender</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Network</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Syncing records...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto">
                        <Receipt className="w-8 h-8 text-gray-200" />
                      </div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No payment records found matching your criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedPayment(payment)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                          <Receipt className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-xs font-black text-gray-900 font-mono">{payment.transactionReference || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-gray-900 uppercase tracking-tight truncate max-w-[120px]">{payment.senderName || 'Unknown'}</p>
                        <p className="text-[10px] font-bold text-gray-400">{payment.senderPhone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-lg">
                        {payment.network}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-blue-600">
                        {(payment.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${
                        payment.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                        payment.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        payment.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {payment.status === 'verified' && <CheckCircle2 className="w-3 h-3" />}
                        {payment.status === 'pending' && <Clock className="w-3 h-3" />}
                        {payment.status === 'rejected' && <XCircle className="w-3 h-3" />}
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-gray-600">{new Date(payment.receivedAt).toLocaleTimeString()}</p>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Date(payment.receivedAt).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-gray-100 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDetails = () => {
    if (!selectedPayment) return null;
    const verificationLog = logs.filter(l => l.paymentId === selectedPayment.id);

    return (
      <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6 pb-12">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => setSelectedPayment(null)}
            className="p-2 hover:bg-white rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Transaction Details</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8">
                <div className={`px-4 py-1.5 rounded-2xl text-xs font-black uppercase tracking-widest ${
                  selectedPayment.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {selectedPayment.status}
                </div>
              </div>

              <div className="space-y-10">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center">
                    <Receipt className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Transaction Amount</p>
                    <p className="text-4xl font-black text-gray-900 tracking-tight">TSh {(selectedPayment.amount || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <DetailItem label="Reference ID" value={selectedPayment.transactionReference || 'N/A'} />
                  <DetailItem label="Network" value={selectedPayment.network || 'N/A'} uppercase />
                  <DetailItem label="Sender Name" value={selectedPayment.senderName || 'Anonymous'} uppercase />
                  <DetailItem label="Sender Phone" value={selectedPayment.senderPhone || 'N/A'} />
                  <DetailItem label="Date Received" value={new Date(selectedPayment.receivedAt).toLocaleDateString()} />
                  <DetailItem label="Time Received" value={new Date(selectedPayment.receivedAt).toLocaleTimeString()} />
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Raw SMS Content</p>
                  <div className="bg-gray-50 p-6 rounded-3xl text-[11px] font-medium text-gray-600 leading-relaxed italic">
                    "{selectedPayment.rawSms}"
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Timeline */}
            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-8">Verification Audit Trail</h4>
              <div className="space-y-6">
                {verificationLog.length === 0 ? (
                  <div className="py-12 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest">No logs recorded for this transaction</div>
                ) : (
                  verificationLog.map((log, i) => (
                    <div key={log.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${log.action === 'verified' || log.action === 'received' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {i < verificationLog.length - 1 && <div className="w-0.5 h-full bg-gray-100 my-1" />}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{log.action}</p>
                          <span className="text-[10px] font-bold text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium leading-relaxed">{log.details}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action Sidebar */}
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-xl">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Admin Controls</h4>
              <div className="space-y-3">
                {selectedPayment.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => handleApprove(selectedPayment.id)}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                    >
                      Manual Verify
                    </button>
                    <button 
                      onClick={() => handleReject(selectedPayment.id)}
                      className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-95 cursor-pointer"
                    >
                      Reject Payment
                    </button>
                  </>
                )}
                {selectedPayment.status === 'rejected' && (
                  <button 
                    onClick={() => handleReactivate(selectedPayment.id)}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
                  >
                    Reactivate Payment
                  </button>
                )}
                <button 
                  onClick={openEditModal}
                  className="w-full py-4 bg-gray-700 hover:bg-gray-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                  Edit Details
                </button>
                <button className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer">
                  <Download className="w-4 h-4" />
                  Export Receipt
                </button>
              </div>
            </div>

            <div className="bg-blue-50 rounded-[2.5rem] p-8 border border-blue-100">
              <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-4">Service Access</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-blue-900">Tokens Granted</p>
                    <p className="text-[10px] font-bold text-blue-700">{selectedPayment.tokensGranted || 0} BIGsta Tokens</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMonitor = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total SMS', value: monitorData.stats.total, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Processed', value: monitorData.stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Failed', value: monitorData.stats.failed, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Duplicates', value: monitorData.stats.duplicates, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Pending', value: monitorData.stats.pending, color: 'text-slate-600', bg: 'bg-slate-50' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-4 rounded-2xl border border-white/50 shadow-sm`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Monitor Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Incoming SMS Pipeline Monitor</h3>
          </div>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-black uppercase tracking-wider">
            Real-time Tracking Active
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Sender</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Device</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Pipeline Trace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {monitorData.logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white">
                    Waiting for ingestion pipeline events...
                  </td>
                </tr>
              ) : (
                monitorData.logs.map((sms) => (
                  <React.Fragment key={sms.id}>
                    <tr className={`hover:bg-slate-50/50 transition-colors ${expandedTraceId === sms.id ? 'bg-blue-50/20' : ''}`}>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        {new Date(sms.received_at).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-900">{sms.sender}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{sms.source_ip}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                          sms.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          sms.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                          sms.status === 'DUPLICATE' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {sms.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[11px] font-medium text-slate-500">
                        {sms.device_name}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setExpandedTraceId(expandedTraceId === sms.id ? null : sms.id)}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center gap-2 ml-auto"
                        >
                          <Zap className="w-3 h-3" />
                          {expandedTraceId === sms.id ? 'Close Trace' : 'View Trace'}
                        </button>
                      </td>
                    </tr>
                    {expandedTraceId === sms.id && (
                      <tr>
                        <td colSpan={5} className="px-8 py-6 bg-slate-50/50 border-y border-slate-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Processing Pipeline Trace</p>
                                <div className="space-y-4">
                                  {sms.trace.map((step: any, i: number) => (
                                    <div key={i} className="flex items-center gap-4">
                                      <div className={`w-2 h-2 rounded-full ${
                                        step.status === 'FAILED' ? 'bg-red-500' : 
                                        step.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-blue-500'
                                      }`} />
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{step.status}</span>
                                          <span className="text-[9px] text-slate-400 font-medium">{new Date(step.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        {step.details && <span className="text-[10px] text-slate-500 font-medium italic">{step.details}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {sms.error_message && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Execution Error</p>
                                  <p className="text-[11px] text-red-900 font-medium">{sms.error_message}</p>
                                </div>
                              )}
                            </div>
                            <div className="space-y-6">
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Raw Payload Data</p>
                                <div className="bg-slate-900 rounded-2xl p-4 overflow-hidden">
                                  <pre className="text-[10px] text-blue-400 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                    {sms.raw_sms}
                                  </pre>
                                </div>
                              </div>
                              {sms.parse_result && (
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Extracted Payment Details</p>
                                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Amount</p>
                                      <p className="text-sm font-black text-emerald-900">TSh {sms.parse_result.amount.toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Reference</p>
                                      <p className="text-sm font-black text-emerald-900">{sms.parse_result.reference}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Sender Name</p>
                                      <p className="text-sm font-black text-emerald-900">{sms.parse_result.sender_name}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderWebhookDebug = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Debug Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Webhook Requests</p>
          <p className="text-3xl font-black text-blue-600 tracking-tight">{debugData.count}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Last Request Time</p>
          <p className="text-sm font-bold text-gray-900 truncate">
            {debugData.lastRequestTime ? new Date(debugData.lastRequestTime).toLocaleString() : 'Never'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Webhook Monitor</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-black text-emerald-600 uppercase tracking-widest">Live Monitoring</span>
          </div>
        </div>
      </div>

      {/* Recent Requests List */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Recent Webhook Requests (Latest 50)</h4>
          <span className="text-[10px] font-bold text-gray-400">Updates every 3s</span>
        </div>
        <div className="divide-y divide-gray-100">
          {debugData.requests.length === 0 ? (
            <div className="p-20 text-center space-y-3">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                <Webhook className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Waiting for incoming SMS data...</p>
            </div>
          ) : (
            debugData.requests.map((req) => (
              <div key={req.id} className="p-6 space-y-4 hover:bg-gray-50/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                      req.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 
                      req.status === 'unauthorized' ? 'bg-red-100 text-red-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {req.status}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500 font-mono">{new Date(req.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">IP: {req.ip}</span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Request Headers</p>
                    <pre className="p-3 bg-[#0B132B] text-blue-300 rounded-xl text-[10px] overflow-x-auto font-mono max-h-40 scrollbar-hide">
                      {JSON.stringify(req.headers, null, 2)}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Request Body (Raw JSON)</p>
                    <pre className="p-3 bg-gray-900 text-emerald-400 rounded-xl text-[10px] overflow-x-auto font-mono max-h-40 scrollbar-hide border border-slate-800">
                      {JSON.stringify(req.body, null, 2)}
                    </pre>
                  </div>
                </div>
                {req.error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-bold text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Error: {req.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

const renderSmsLogs = () => <SmsTransactionsPanel />;
const renderSmsDiagnostics = () => <SmsDiagnosticsPanel />;

const renderSettings = () => {
    // Connection Status Calculation
    const getSmsForwarderStatus = () => {
      if (!debugData.hasEverConnected) return { label: 'OFFLINE', color: 'bg-gray-100 text-gray-500', icon: Smartphone };
      
      // Timeout check: 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60000);
      if (debugData.lastSuccessTimestamp && new Date(debugData.lastSuccessTimestamp) < thirtyMinutesAgo) {
        return { label: 'DISCONNECTED', color: 'bg-red-100 text-red-700', icon: ShieldAlert };
      }
      
      return { label: 'CONNECTED', color: 'bg-emerald-100 text-emerald-700', icon: ShieldCheckIcon };
    };

    const smsStatus = getSmsForwarderStatus();
    const testStatusInfo = debugData.lastTestStatus === 'success' 
      ? { label: 'SUCCESS', color: 'text-emerald-500' } 
      : debugData.lastTestStatus === 'unauthorized' 
        ? { label: 'AUTH FAIL', color: 'text-red-500' }
        : { label: 'NO DATA', color: 'text-gray-400' };

    return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-8 shadow-sm space-y-10 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Payment Integration Settings</h3>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">Webhook & SMS Gateway Configuration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {/* Section 1: Webhook Settings */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Webhook className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Webhook Settings</h4>
          </div>
          <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
            {/* Custom App / Deployment Link Input & Save & Generate */}
            <div className="space-y-2 pb-4 border-b border-gray-200">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Paste Your App / Deployment Link
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={customAppUrl}
                  onChange={(e) => setCustomAppUrl(e.target.value)}
                  placeholder="https://your-app.run.app"
                  className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 font-mono text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
                />
                <button
                  type="button"
                  onClick={handleSaveAndGenerate}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  Save and Generate
                </button>
              </div>
              <p className="text-[11px] text-gray-600 font-medium">
                Active Webhook Endpoint: <code className="font-mono text-blue-600 font-bold">{customAppUrl.trim().replace(/\/+$/, '') || window.location.origin}/api/payment-sms</code>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Webhook Path
              </label>
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 font-mono text-[11px] text-blue-600 border-dashed">
                /api/payment-sms
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Full Webhook URL
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 font-mono text-[11px] text-gray-600 truncate">
                  {customAppUrl.trim().replace(/\/+$/, '') || window.location.origin}/api/payment-sms
                </div>
                <button
                  onClick={() => {
                    const fullUrl = `${customAppUrl.trim().replace(/\/+$/, '') || window.location.origin}/api/payment-sms`;
                    navigator.clipboard.writeText(fullUrl);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md flex items-center justify-center shrink-0 active:scale-95"
                >
                  {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Webhook Secret Key Section */}
            <div className="space-y-3 pt-4 mt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Webhook Secret Key
                </label>
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded uppercase tracking-wider">
                  Super Admin Only
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 font-mono text-[11px] text-gray-600 flex items-center justify-between">
                  <span className={showSecret ? 'break-all' : 'tracking-[0.3em] font-bold'}>
                    {showSecret ? webhookSecret : '••••••••••••••••••••••••••••'}
                  </span>
                  <button 
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400"
                  >
                    {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(webhookSecret);
                      alert('Secret key copied to clipboard!');
                    }}
                    className="p-3 bg-gray-900 hover:bg-black text-white rounded-xl transition-all shadow-md flex items-center justify-center shrink-0"
                    title="Copy Secret"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={regenerateSecret}
                    className="p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all shadow-md flex items-center justify-center shrink-0"
                    title="Regenerate Secret"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-amber-600 font-bold leading-relaxed bg-amber-50 p-3 rounded-xl border border-amber-100">
                ⚠️ IMPORTANT: Every request to the webhook must include this secret key in the JSON body. Regenerating this key will immediately block any service using the old key.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Connection Status Dashboard */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Connection Status Dashboard</h4>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#0B132B] rounded-2xl p-6 border border-slate-800 shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SMS Forwarder</span>
                  <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider ${smsStatus.color}`}>
                    {smsStatus.label}
                  </span>
                </div>
                
                <StatusRow label="Webhook Service" status="ONLINE" active />
                <StatusRow 
                  label="Handshake Echo Status" 
                  value={testStatusInfo.label} 
                  valueColor={testStatusInfo.color}
                />
                <StatusRow 
                  label="SMS Gateway Persistence" 
                  value={smsStatus.label} 
                  valueColor={smsStatus.label === 'CONNECTED' ? 'text-emerald-500' : 'text-gray-400'}
                />
                
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <StatusRow label="Last Real SMS" value={debugData.lastSuccessTimestamp ? new Date(debugData.lastSuccessTimestamp).toLocaleTimeString() : 'Never'} />
                  <StatusRow label="Last Test SMS" value={debugData.lastTestTimestamp ? new Date(debugData.lastTestTimestamp).toLocaleTimeString() : 'Never'} />
                  <StatusRow label="Connected Device" value={debugData.lastSuccessfulPayload?.device_name || 'None'} />
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col justify-center">
              <p className="text-xs font-black text-blue-900 uppercase tracking-widest mb-2">Verification Rules</p>
              <div className="space-y-2">
                {[
                  "Real webhook request received",
                  "Request source is not internal test",
                  "Valid SMS content detected",
                  "Successfully logged to activity"
                ].map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span className="text-[10px] text-blue-700 font-medium">{rule}</span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-blue-400 mt-4 leading-relaxed font-bold uppercase italic">
                * Internal tests do not affect SMS Forwarder status
              </p>
            </div>
          </div>
        </div>

        {/* Section: SMS Recognition Words */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">SMS Recognition & Match Words</h4>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
            <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
              Define specific keywords the system should look for in incoming SMS to identify a payment. 
              The system will extract the Transaction Code and Amount from messages containing these words.
            </p>
            
            <div className="flex flex-wrap gap-2">
              {matchWords.map((word) => (
                <div key={word} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl">
                  <span className="text-[11px] font-black text-blue-700 uppercase tracking-tight">{word}</span>
                  <button onClick={() => handleRemoveMatchWord(word)} className="p-0.5 hover:bg-blue-100 rounded text-blue-400">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMatchWord}
                onChange={(e) => setNewMatchWord(e.target.value)}
                placeholder="Enter new match word (e.g. Received)"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                onClick={handleAddMatchWord}
                className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
              >
                Add Word
              </button>
            </div>

            <button
              onClick={handleSaveMatchWords}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
            >
              Update Match Rules
            </button>
          </div>
        </div>

        {/* Section 3: Connection Testing */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Connection Testing</h4>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={runConnectionTest}
                disabled={testStatus === 'testing'}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                {testStatus === 'testing' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheckIcon className="w-3.5 h-3.5" />}
                Test Connection
              </button>
              <button
                onClick={sendTestPayload}
                disabled={testStatus === 'testing'}
                className="px-6 py-2.5 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                <Webhook className="w-3.5 h-3.5" />
                Send Test Payload
              </button>
            </div>

            {testStatus !== 'idle' && (
              <div className={`p-4 rounded-xl text-xs font-bold border ${
                testStatus === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                testStatus === 'failed' ? 'bg-red-50 border-red-200 text-red-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
                {testStatus === 'testing' ? 'System check in progress...' :
                 testStatus === 'success' ? 'Connection Verified: Webhook is receiving data correctly.' :
                 'Connection Error: System unable to reach gateway endpoint.'}
              </div>
            )}

            <div className="space-y-3">
              <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Test Activity Logs</h5>
              <div className="bg-gray-50 border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
                {testLogs.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">No recent tests</div>
                ) : (
                  testLogs.map(log => (
                    <div key={log.id} className="p-3 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-gray-600">{log.type}</span>
                      <div className="flex items-center gap-3">
                        <span className={`font-black text-[9px] px-2 py-0.5 rounded ${log.status === 'SUCCESS' || log.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {log.status}
                        </span>
                        <span className="text-gray-400 font-mono text-[10px]">{log.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Webhook Activity & Logs */}
        <div className="space-y-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Webhook Activity</h4>
            </div>
            <span className="text-[10px] font-bold text-gray-400">Auto-refresh: 10s</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
              <p className="text-xl font-black text-gray-900">{debugData.count}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Success</p>
              <p className="text-xl font-black text-emerald-700">{debugData.successful}</p>
            </div>
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
              <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">Failed</p>
              <p className="text-xl font-black text-red-700">{debugData.failed}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Last Request</p>
              <p className="text-[11px] font-bold text-blue-900">{debugData.lastRequestTime ? new Date(debugData.lastRequestTime).toLocaleTimeString() : 'N/A'}</p>
            </div>
          </div>

          {debugData.lastPayload && (
            <div className="space-y-2">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Last Request Payload</p>
              <pre className="p-4 bg-[#0B132B] text-blue-300 rounded-xl text-[10px] font-mono overflow-x-auto border border-slate-800">
                {JSON.stringify(debugData.lastPayload, null, 2)}
              </pre>
            </div>
          )}

          <div className="space-y-3">
            <h5 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Incoming SMS Log (Latest 50)</h5>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Time</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Validation Result</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">IP Address</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {debugData.requests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-white">
                        No webhook activity recorded yet
                      </td>
                    </tr>
                  ) : (
                    debugData.requests.map((req) => (
                      <React.Fragment key={req.id}>
                        <tr className={`hover:bg-gray-50/50 transition-colors ${expandedLogId === req.id ? 'bg-blue-50/30' : ''}`}>
                          <td className="px-4 py-3 text-[11px] font-bold text-gray-500 whitespace-nowrap">
                            {new Date(req.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider ${
                              req.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[11px] font-bold text-gray-600">
                            {req.error || 'OK'}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-gray-400 font-mono">
                            {req.ip}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => setExpandedLogId(expandedLogId === req.id ? null : req.id)}
                              className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                            >
                              {expandedLogId === req.id ? 'Hide Details' : 'View Details'}
                            </button>
                          </td>
                        </tr>
                        {expandedLogId === req.id && (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 bg-gray-50/50 border-y border-gray-100">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Headers</p>
                                  <pre className="p-3 bg-white border border-gray-200 rounded-xl text-[10px] font-mono overflow-x-auto max-h-40 overflow-y-auto shadow-inner">
                                    {JSON.stringify(req.headers, null, 2)}
                                  </pre>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Body</p>
                                  <pre className="p-3 bg-white border border-gray-200 rounded-xl text-[10px] font-mono overflow-x-auto max-h-40 overflow-y-auto shadow-inner">
                                    {JSON.stringify(req.body, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="fixed inset-0 bg-[#F9FAFB] z-[100] flex flex-col font-sans overflow-hidden">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <UniversalBackButton />
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">Payments Management</h1>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Transaction Records & Verification</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stats && (
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black text-emerald-800">TSh {stats.totalAmount.toLocaleString()} REVENUE</span>
            </div>
          )}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
            <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-gray-500 hover:text-gray-900 transition-all">Help</button>
            <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-white text-gray-900 shadow-sm">Portal</button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Navigation Tabs */}
          {!selectedPayment && (
            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-gray-200 w-full overflow-x-auto shadow-sm scrollbar-hide">
              <div className="flex items-center gap-1.5 min-w-max px-0.5">
                {[
                  { id: 'all', label: 'All', icon: History },
                  { id: 'pending', label: 'Pending', icon: Clock },
                  { id: 'verified', label: 'Verified', icon: CheckCircle2 },
                  { id: 'rejected', label: 'Rejected', icon: XCircle },
                  { id: 'used', label: 'Used', icon: Tag },
                  { id: 'manual', label: 'Manual', icon: AlertTriangle },
                  { id: 'monitor', label: 'Monitor', icon: Activity },
                  { id: 'sms_logs', label: unreviewedSms > 0 ? `SMS Transactions (${unreviewedSms})` : 'SMS Transactions', icon: Smartphone },
                  { id: 'sms_diagnostics', label: 'Diagnostics', icon: Activity },
                  { id: 'settings', label: 'Settings', icon: Settings },
                  { id: 'debug', label: 'Debug', icon: Bug },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 sm:px-5 py-2.5 rounded-xl text-[10px] sm:text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 ${
                      activeTab === tab.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedPayment ? renderDetails() : (
            activeTab === 'settings' ? renderSettings() : 
            activeTab === 'debug' ? renderWebhookDebug() :
            activeTab === 'monitor' ? renderMonitor() :
            activeTab === 'sms_logs' ? renderSmsLogs() :
            activeTab === 'sms_diagnostics' ? renderSmsDiagnostics() :
            renderPaymentList()
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Edit Transaction</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all cursor-pointer">
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference ID</label>
                  <input 
                    type="text" 
                    value={editForm.transactionReference || ''} 
                    onChange={e => setEditForm(prev => ({ ...prev, transactionReference: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sender Name</label>
                  <input 
                    type="text" 
                    value={editForm.senderName || ''} 
                    onChange={e => setEditForm(prev => ({ ...prev, senderName: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                  <input 
                    type="text" 
                    value={editForm.senderPhone || ''} 
                    onChange={e => setEditForm(prev => ({ ...prev, senderPhone: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount (TSh)</label>
                  <input 
                    type="number" 
                    value={editForm.amount || 0} 
                    onChange={e => setEditForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              
              <div className="pt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem: React.FC<{ label: string; value: string; uppercase?: boolean }> = ({ label, value, uppercase }) => (
  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors">
    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{label}</label>
    <span className={`text-xs font-bold text-gray-900 ${uppercase ? 'uppercase' : ''} block truncate`}>{value}</span>
  </div>
);

const ToggleSetting: React.FC<{ label: string; description: string; active: boolean }> = ({ label, description, active }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
    <div className="space-y-0.5">
      <p className="text-sm font-black text-gray-900 tracking-tight">{label}</p>
      <p className="text-[11px] text-gray-500 font-medium">{description}</p>
    </div>
    <div className={`w-11 h-6 rounded-full relative transition-colors ${active ? 'bg-blue-600' : 'bg-gray-200'}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${active ? 'left-6' : 'left-1'}`} />
    </div>
  </div>
);

const StatusRow: React.FC<{ label: string; status?: string; value?: string; active?: boolean; valueColor?: string }> = ({ label, status, value, active, valueColor }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
    <span className="text-[11px] text-slate-400 font-medium">{label}:</span>
    {status ? (
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
        {status}
      </span>
    ) : (
      <span className={`text-[11px] font-bold ${valueColor || 'text-slate-200'}`}>{value}</span>
    )}
  </div>
);

export default PaymentDashboard;
