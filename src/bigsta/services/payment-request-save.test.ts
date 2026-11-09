import { expect, it, vi } from 'vitest';
import { confirmPaymentRequestSave } from './payment-request-save';
it('awaits the Supabase result before publishing success', async () => {
  let resolve: ((saved: boolean) => void) | undefined;
  const publish = vi.fn();
  const pending = confirmPaymentRequestSave(() => new Promise(done => { resolve = done; }), publish);
  expect(publish).not.toHaveBeenCalled();
  if (resolve) resolve(true);
  expect((await pending).success).toBe(true);
  expect(publish).toHaveBeenCalledTimes(1);
});
it('reports a rejected Supabase write without publishing success', async () => {
  const publish = vi.fn();
  expect((await confirmPaymentRequestSave(async () => false, publish)).success).toBe(false);
  expect(publish).not.toHaveBeenCalled();
});
it('reports a failed connection without publishing success', async () => {
  const publish = vi.fn();
  expect((await confirmPaymentRequestSave(async () => { throw new Error('unavailable'); }, publish)).success).toBe(false);
  expect(publish).not.toHaveBeenCalled();
});