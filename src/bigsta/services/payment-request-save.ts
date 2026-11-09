/** Never publish local success until the existing Supabase writer confirms persistence. */
export async function confirmPaymentRequestSave(write: () => Promise<boolean>, publish: () => void): Promise<{ success: boolean; message: string }> {
  try {
    if (!(await write())) return { success: false, message: 'Payment request was not saved. Check your connection and try again.' };
    publish();
    return { success: true, message: 'Payment request saved. Awaiting admin verification.' };
  } catch {
    return { success: false, message: 'Payment request could not be saved. Your selection has been kept.' };
  }
}