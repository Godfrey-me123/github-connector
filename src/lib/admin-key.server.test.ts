import { describe, expect, it } from 'vitest';
import { checkAdminSession } from './admin-key.server';

const request = () =>
  new Request('https://bigsta.test/api/admin/sms-monitor', {
    headers: { authorization: 'Bearer test-session' },
  });

describe('checkAdminSession', () => {
  it('requires a session', async () => {
    const unauthenticated = new Request('https://bigsta.test/api/admin/sms-monitor');
    const res = await checkAdminSession(unauthenticated);
    expect(res?.status).toBe(401);
  });

  it('rejects invalid sessions', async () => {
    const verify = async () => null;
    const res = await checkAdminSession(request(), verify);
    expect(res?.status).toBe(401);
  });

  it('rejects normal accounts', async () => {
    const verify = async () => ({ isAdmin: false });
    const res = await checkAdminSession(request(), verify);
    expect(res?.status).toBe(403);
  });

  it('allows verified administrators', async () => {
    const verify = async () => ({ isAdmin: true });
    const res = await checkAdminSession(request(), verify);
    expect(res).toBeNull();
  });

  it('fails closed when role verification is unavailable', async () => {
    const verify = async () => {
      throw new Error('unavailable');
    };
    const res = await checkAdminSession(request(), verify);
    expect(res?.status).toBe(503);
  });
});
