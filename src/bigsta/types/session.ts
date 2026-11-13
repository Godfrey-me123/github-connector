export type ServiceId = 'nida' | 'licence' | 'nhic' | 'nrc' | 'nec' | 'passport';

export interface GenerationSession<T = Record<string, unknown>> {
  sessionId: string;
  serviceId: ServiceId;
  templateId: string;
  formData: T;
  photoUrl: string | null;
  createdAt: number;
}
