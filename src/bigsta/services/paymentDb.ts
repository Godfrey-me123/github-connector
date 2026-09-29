import { openDB, IDBPDatabase } from 'idb';
import { PaymentRecord, VerificationLog, ServiceUnlock, TokenTransaction } from '../types';

const DB_NAME = 'PaymentVerificationDB';
const DB_VERSION = 1;

export class PaymentDb {
  private db: Promise<IDBPDatabase>;

  constructor() {
    this.db = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('payments')) {
          db.createObjectStore('payments', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('verification_logs')) {
          db.createObjectStore('verification_logs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('service_unlocks')) {
          db.createObjectStore('service_unlocks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('token_transactions')) {
          db.createObjectStore('token_transactions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('webhook_logs')) {
          db.createObjectStore('webhook_logs', { keyPath: 'id' });
        }
      },
    });
  }

  async addWebhookLog(log: any): Promise<void> {
    const db = await this.db;
    await db.add('webhook_logs', log);
  }

  async getAllWebhookLogs(): Promise<any[]> {
    const db = await this.db;
    return db.getAll('webhook_logs');
  }

  async addPayment(payment: PaymentRecord): Promise<void> {
    const db = await this.db;
    await db.add('payments', payment);
  }

  async updatePayment(payment: PaymentRecord): Promise<void> {
    const db = await this.db;
    await db.put('payments', payment);
  }

  async getPayment(id: string): Promise<PaymentRecord | undefined> {
    const db = await this.db;
    return db.get('payments', id);
  }

  async getAllPayments(): Promise<PaymentRecord[]> {
    const db = await this.db;
    return db.getAll('payments');
  }

  async getPaymentsByStatus(status: PaymentRecord['status']): Promise<PaymentRecord[]> {
    const all = await this.getAllPayments();
    return all.filter(p => p.status === status);
  }

  async addLog(log: VerificationLog): Promise<void> {
    const db = await this.db;
    await db.add('verification_logs', log);
  }

  async getLogs(paymentId: string): Promise<VerificationLog[]> {
    const db = await this.db;
    const all = await db.getAll('verification_logs');
    return all.filter(l => l.paymentId === paymentId);
  }

  async getAllLogs(): Promise<VerificationLog[]> {
    const db = await this.db;
    return db.getAll('verification_logs');
  }

  async addUnlock(unlock: ServiceUnlock): Promise<void> {
    const db = await this.db;
    await db.add('service_unlocks', unlock);
  }

  async getUnlocks(userId: string): Promise<ServiceUnlock[]> {
    const db = await this.db;
    const all = await db.getAll('service_unlocks');
    return all.filter(u => u.userId === userId);
  }

  async addTokenTransaction(tx: TokenTransaction): Promise<void> {
    const db = await this.db;
    await db.add('token_transactions', tx);
  }

  async getTokenTransactions(userId: string): Promise<TokenTransaction[]> {
    const db = await this.db;
    const all = await db.getAll('token_transactions');
    return all.filter(t => t.userId === userId);
  }
}

export const paymentDb = new PaymentDb();
