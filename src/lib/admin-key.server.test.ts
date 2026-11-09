import { beforeEach, expect, it, vi } from 'vitest';
const { readAccountRole } = vi.hoisted(() => ({ readAccountRole: vi.fn() }));
vi.mock('./account-role.server', () => ({ readAccountRole }));
import { checkAdminSession } from './admin-key.server';
const request = () => new Request('https://bigsta.test/api/admin/sms-monitor', { headers: { authorization: 'Bearer test-session' } });
beforeEach(() => readAccountRole.mockReset());
it('requires a session', async () => {
  expect((await checkAdminSession(new Request('https://bigsta.test/api/admin/sms-monitor')))?.status).toBe(401);
  expect(readAccountRole).not.toHaveBeenCalled();
});
it('rejects invalid sessions', async () => {
  readAccountRole.mockResolvedValue(null);
  expect((await checkAdminSession(request()))?.status).toBe(401);
});
it('rejects normal accounts', async () => {
  readAccountRole.mockResolvedValue({ isAdmin: false });
  expect((await checkAdminSession(request()))?.status).toBe(403);
});
it('allows verified administrators', async () => {
  readAccountRole.mockResolvedValue({ isAdmin: true });
  expect(await checkAdminSession(request())).toBeNull();
});
it('fails closed when role verification is unavailable', async () => {
  expect((await checkAdminSession(request(), async () => { throw new Error('unavailable'); }))?.status).toBe(503);
});