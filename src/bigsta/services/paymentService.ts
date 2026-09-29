import { paymentDb } from './paymentDb';
import { parseSms } from '../utils/smsParser';
import { SmsClaimResult, claimSmsPaymentByReference, releaseSmsClaim } from './smsReceiver';
import { PaymentRecord, VerificationLog, TokenTransaction, ServiceUnlock, PaymentStatus, VerificationType } from '../types';
import { useTemplateStore } from '../store/useTemplateStore';

export class PaymentService {
  async receiveSms(payload: { raw_sms: string; sender: string; received_at: string; device_name: string }): Promise<PaymentRecord> {
    const { raw_sms, sender, received_at, device_name } = payload;
    
    const store = useTemplateStore.getState();
    const matchWords = store.adminSettings?.matchWords;
    const parsed = parseSms(raw_sms, matchWords);
    
    // Check for duplicate reference
    if (parsed?.transactionReference) {
      const isDup = await this.isReferenceDuplicate(parsed.transactionReference);
      if (isDup) {
        throw new Error('Duplicate transaction reference detected.');
      }
    }

    const payment: PaymentRecord = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rawSms: raw_sms,
      sender: sender,
      receivedAt: received_at,
      deviceName: device_name,
      status: 'pending',
      used: false,
      ...parsed,
    };

    // Calculate previous balance
    if (payment.newBalance !== undefined && payment.amount !== undefined) {
      payment.previousBalance = payment.newBalance - payment.amount;
    }

    await paymentDb.addPayment(payment);
    await this.logAction(payment.id, 'received', `SMS received from ${sender} via ${device_name}`);
    
    // Sync to Cloud!
    try {
      const { syncPaymentRecordSupabase } = await import('./supabase');
      await syncPaymentRecordSupabase(payment);
    } catch (e) {
      console.warn('Failed to sync incoming SMS payment to Cloud:', e);
    }

    return payment;
  }

  /**
   * User provides a reference and amount to auto-verify their payment or submit a claim.
   *
   * Lookup order:
   *   1. `sms_logs`  - every SMS captured by the phone app or the server webhook.
   *                    This is the real auto-confirmation path.
   *   2. `user_payments` - transactions already promoted by the webhook.
   *   3. Manual claim for admin review.
   */
  async autoConfirmWithReference(reference: string, amountInput: number, passkeyId: string): Promise<{ success: boolean; message: string; status: 'verified' | 'submitted' }> {
    const cleanRef = reference.trim().toUpperCase();
    const store = useTemplateStore.getState();
    const tokenPrice = store.adminSettings?.tokenPriceTsh || 2000;
    const computedTokens = Math.max(1, Math.floor(amountInput / tokenPrice));

    if (!passkeyId) {
      return { success: false, message: 'No active passkey. Please sign in again before verifying a payment.', status: 'submitted' };
    }

    // --- 1. AUTO-CONFIRM FROM STORED PAYMENT SMS ---------------------------
    let smsClaim: SmsClaimResult | null = null;
    try {
      smsClaim = await claimSmsPaymentByReference(cleanRef, amountInput);
    } catch (e: any) {
      console.warn('SMS lookup failed, falling back to payment records:', e);
    }

    if (smsClaim?.outcome === 'ALREADY_USED') {
      return { success: false, message: `Transaction code ${cleanRef} has already been used to recharge an account.`, status: 'submitted' };
    }
    if (smsClaim?.outcome === 'AMOUNT_MISMATCH') {
      return { success: false, message: smsClaim.message + ' Please enter the exact amount shown in your payment message.', status: 'submitted' };
    }

    if (smsClaim?.outcome === 'CLAIMED' && smsClaim.row) {
      const smsRow = smsClaim.row;
      const confirmedAmount = Number(smsClaim.amount ?? amountInput);
      const tokens = Math.max(1, Math.floor(confirmedAmount / tokenPrice));

      try {
        store.addUsagesToPasskey(passkeyId, tokens, `${tokens} Tokens Recharged (Ref: ${cleanRef})`);
      } catch (e: any) {
        // Granting failed - give the code back so the user can retry.
        await releaseSmsClaim(smsRow.id).catch(() => {});
        return { success: false, message: 'Could not add tokens to your account. Please try again.', status: 'submitted' };
      }

      const record: PaymentRecord = {
        id: `sms_${smsRow.id}`,
        rawSms: smsRow.raw_sms,
        sender: smsRow.sender,
        receivedAt: smsRow.received_at,
        deviceName: smsRow.device_id || 'BIGsta SMS Receiver',
        status: 'verified',
        used: true,
        transactionReference: cleanRef,
        senderName: smsRow.payer_name || 'Mobile Money User',
        senderPhone: smsRow.payer_phone || '',
        amount: confirmedAmount,
        newBalance: smsRow.balance ?? undefined,
        tokensGranted: tokens,
        passkeyId,
        verificationType: 'auto',
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'auto',
      };

      try {
        const existingLocal = await paymentDb.getPayment(record.id);
        if (existingLocal) await paymentDb.updatePayment(record);
        else await paymentDb.addPayment(record);
      } catch (e) {}

      try {
        const { syncPaymentRecordSupabase } = await import('./supabase');
        await syncPaymentRecordSupabase(record);
      } catch (e) {
        console.warn('Failed to sync auto-confirmed payment to Cloud:', e);
      }

      await this.logAction(record.id, 'auto_confirm', `Auto-confirmed from sms_logs row ${smsRow.id} for passkey ${passkeyId}. Granted ${tokens} tokens.`);

      return { success: true, message: `Successfully verified! ${tokens} tokens have been added to your account.`, status: 'verified' };
    }

    // --- 2. FALL BACK TO ALREADY-PROMOTED PAYMENT RECORDS ------------------
    let all: PaymentRecord[] = [];
    try {
      const { fetchAllPaymentsSupabase } = await import('./supabase');
      all = await fetchAllPaymentsSupabase();
    } catch (e) {
      console.warn('Failed to fetch payments from Cloud, falling back to local DB:', e);
      try {
        all = await paymentDb.getAllPayments();
      } catch (err) {}
    }

    const match = all.find(p =>
      p.transactionReference?.trim().toUpperCase() === cleanRef &&
      !p.used
    );

    if (match) {
      const finalAmount = match.amount || amountInput;
      if (match.amount && Math.abs(Number(match.amount) - Number(amountInput)) > 1) {
        return {
          success: false,
          message: `The amount you entered (TSh ${amountInput.toLocaleString()}) does not match the recorded payment for code ${cleanRef}.`,
          status: 'submitted',
        };
      }
      const tokens = Math.max(1, Math.floor(finalAmount / tokenPrice));

      store.addUsagesToPasskey(passkeyId, tokens, `${tokens} Tokens Recharged (Ref: ${cleanRef})`);

      match.status = 'verified';
      match.used = true;
      match.verificationType = 'auto';
      match.verifiedAt = new Date().toISOString();
      match.verifiedBy = 'auto';
      match.tokensGranted = tokens;
      match.passkeyId = passkeyId;

      try {
        const existingLocal = await paymentDb.getPayment(match.id);
        if (existingLocal) await paymentDb.updatePayment(match);
        else await paymentDb.addPayment(match);
      } catch (e) {}

      await this.logAction(match.id, 'auto_confirm', `Auto-confirmed via reference matching for passkey ${passkeyId}. Granted ${tokens} tokens.`);

      try {
        const { syncPaymentRecordSupabase } = await import('./supabase');
        await syncPaymentRecordSupabase(match);
      } catch (e) {}

      return { success: true, message: `Successfully verified! ${tokens} tokens have been added to your account.`, status: 'verified' };
    }

    // --- 3. NOTHING MATCHED: SUBMIT A CLAIM FOR ADMIN REVIEW ---------------
    const alreadyClaimed = all.find(p => p.transactionReference?.trim().toUpperCase() === cleanRef);
    if (alreadyClaimed?.used) {
      return { success: false, message: `Transaction code ${cleanRef} has already been used to recharge an account.`, status: 'submitted' };
    }

    const newClaimId = 'claim_' + Math.random().toString(36).substring(2, 11).toUpperCase();
    const activeUser = store.activePasskeys.find(p => p.id === passkeyId);

    const newClaim: PaymentRecord = {
      id: newClaimId,
      rawSms: smsClaim?.row?.raw_sms || '',
      sender: activeUser?.key || 'User Claim',
      receivedAt: new Date().toISOString(),
      deviceName: 'BIGsta Manual Entry',
      status: 'pending',
      used: false,
      transactionReference: cleanRef,
      senderName: activeUser?.description || activeUser?.key || 'User Claim',
      senderPhone: activeUser?.key || '',
      amount: amountInput,
      tokensGranted: computedTokens,
      passkeyId: passkeyId,
    };

    try {
      await paymentDb.addPayment(newClaim);
    } catch (e) {}

    try {
      const { syncPaymentRecordSupabase } = await import('./supabase');
      await syncPaymentRecordSupabase(newClaim);
    } catch (e) {
      console.warn('Failed to publish manual claim to Cloud:', e);
    }

    await this.logAction(newClaimId, 'claim_submitted', `User submitted payment claim for Ref: ${cleanRef}, Amount: Tsh ${amountInput}. Awaiting Admin confirmation.`);

    const reason = smsClaim?.outcome === 'UNPARSED'
      ? `We found your SMS for code ${cleanRef} but could not read the amount automatically.`
      : `No payment SMS matching code ${cleanRef} has reached us yet.`;

    return {
      success: true,
      message: `${reason} We have submitted your payment details (TSh ${amountInput.toLocaleString()}) to our Admin Panel. The admin will verify and grant your tokens shortly!`,
      status: 'submitted'
    };
  }

  async verifyPaymentManually(paymentId: string, adminId: string, tokens?: number, passkeyId?: string): Promise<void> {
    const payment = await paymentDb.getPayment(paymentId);
    if (!payment) throw new Error('Payment not found');
    if (payment.used) throw new Error('Payment already used');

    payment.status = 'verified';
    payment.verificationType = 'manual';
    payment.verifiedAt = new Date().toISOString();
    payment.verifiedBy = adminId;
    
    // Grant tokens if passkeyId is linked
    const targetPasskeyId = passkeyId || payment.passkeyId;
    if (targetPasskeyId && tokens && tokens > 0) {
      payment.tokensGranted = tokens;
      const store = useTemplateStore.getState();
      store.addUsagesToPasskey(targetPasskeyId, tokens, `Manual Admin Activation: ${tokens} tokens`);
    }

    await paymentDb.updatePayment(payment);
    await this.logAction(paymentId, 'verified_manual', `Payment verified manually by ${adminId}${targetPasskeyId ? ` for passkey ${targetPasskeyId}` : ''}`, adminId);

    // Sync manually verified status to Cloud
    try {
      const { syncPaymentRecordSupabase } = await import('./supabase');
      await syncPaymentRecordSupabase(payment);
    } catch (e) {}
  }

  async rejectPayment(paymentId: string, adminId: string, reason: string): Promise<void> {
    const payment = await paymentDb.getPayment(paymentId);
    if (!payment) throw new Error('Payment not found');

    payment.status = 'rejected';
    payment.verificationType = 'manual';
    await paymentDb.updatePayment(payment);
    await this.logAction(paymentId, 'rejected', `Payment rejected by ${adminId}: ${reason}`, adminId);

    // Sync rejected status to Cloud
    try {
      const { syncPaymentRecordSupabase } = await import('./supabase');
      await syncPaymentRecordSupabase(payment);
    } catch (e) {}
  }

  async suspendPayment(paymentId: string, adminId: string): Promise<void> {
    const payment = await paymentDb.getPayment(paymentId);
    if (!payment) throw new Error('Payment not found');

    payment.status = 'suspended';
    await paymentDb.updatePayment(payment);
    await this.logAction(paymentId, 'suspended', `Payment suspended by ${adminId}`, adminId);
  }

  async resetPaymentStatus(paymentId: string, adminId: string): Promise<void> {
    const payment = await paymentDb.getPayment(paymentId);
    if (!payment) throw new Error('Payment not found');

    payment.status = 'pending';
    payment.used = false;
    payment.verificationType = undefined;
    await paymentDb.updatePayment(payment);
    await this.logAction(paymentId, 'reset', `Payment status reset to pending by ${adminId}`, adminId);
  }

  async updatePaymentRecord(paymentId: string, updates: Partial<PaymentRecord>, adminId: string): Promise<void> {
    const payment = await paymentDb.getPayment(paymentId);
    if (!payment) throw new Error('Payment not found');

    const updatedPayment = { ...payment, ...updates };
    await paymentDb.updatePayment(updatedPayment);
    await this.logAction(paymentId, 'admin_edit', `Payment record edited by ${adminId}. Changes: ${Object.keys(updates).join(', ')}`, adminId);
  }

  async reactivatePayment(paymentId: string, adminId: string): Promise<void> {
    const payment = await paymentDb.getPayment(paymentId);
    if (!payment) throw new Error('Payment not found');

    payment.status = 'verified';
    payment.used = false; // Allow it to be used again if it was exhausted or restricted
    await paymentDb.updatePayment(payment);
    await this.logAction(paymentId, 'reactivated', `Payment reactivated by ${adminId}`, adminId);
  }

  async logAction(paymentId: string, action: string, details: string, adminId?: string): Promise<void> {
    const log: VerificationLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentId,
      timestamp: new Date().toISOString(),
      action,
      details,
      adminId,
    };
    await paymentDb.addLog(log);
  }

  async getAllPayments(): Promise<PaymentRecord[]> {
    return paymentDb.getAllPayments();
  }

  async getPaymentRecords(): Promise<PaymentRecord[]> {
    return this.getAllPayments();
  }

  async getWebhookLogs(): Promise<any[]> {
    return paymentDb.getAllWebhookLogs();
  }

  async getPaymentsByStatus(status: PaymentStatus): Promise<PaymentRecord[]> {
    return paymentDb.getPaymentsByStatus(status);
  }

  async getLogs(paymentId: string): Promise<VerificationLog[]> {
    return paymentDb.getLogs(paymentId);
  }

  async getVerificationLogs(): Promise<VerificationLog[]> {
    return paymentDb.getAllLogs();
  }

  async isReferenceDuplicate(reference: string): Promise<boolean> {
    const all = await paymentDb.getAllPayments();
    return all.some(p => p.transactionReference?.toUpperCase() === reference.toUpperCase());
  }

  async getStats() {
    const all = await this.getAllPayments();
    const stats = {
      total: all.length,
      pending: all.filter(p => p.status === 'pending').length,
      verified: all.filter(p => p.status === 'verified').length,
      rejected: all.filter(p => p.status === 'rejected').length,
      used: all.filter(p => p.used).length,
      totalAmount: all.filter(p => p.status === 'verified').reduce((sum, p) => sum + (p.amount || 0), 0),
      networkBreakdown: {} as Record<string, number>,
    };

    all.forEach(p => {
      if (p.network) {
        stats.networkBreakdown[p.network] = (stats.networkBreakdown[p.network] || 0) + 1;
      }
    });

    return stats;
  }

  async getPaymentSettings(): Promise<any> {
    const saved = localStorage.getItem('payment_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Fetch current status from server or local state
      try {
        const response = await fetch('/api/admin/webhook-debug');
        const debugData = await response.json();
        return {
          ...parsed,
          connectionStatus: debugData.status || 'OFFLINE',
          lastSmsReceived: debugData.lastSmsReceived || '',
          lastSmsTime: debugData.lastSmsTime || '',
        };
      } catch (e) {
        return parsed;
      }
    }
    
    const defaultSettings = {
      webhookSecret: '',
      autoVerification: true,
      connectionStatus: 'OFFLINE',
      lastSmsReceived: '',
      lastSmsTime: '',
      webhookUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/payment-sms` : ''
    };
    return defaultSettings;
  }

  async saveWebhookSettings(settings: any): Promise<void> {
    localStorage.setItem('payment_settings', JSON.stringify(settings));
    // Also sync to server if needed
    try {
      await fetch('/api/admin/webhook-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    } catch (e) {
      console.error('Failed to sync settings to server');
    }
  }

  async updatePaymentSettings(settings: any): Promise<void> {
    localStorage.setItem('payment_settings', JSON.stringify(settings));
  }
}

export const paymentService = new PaymentService();
