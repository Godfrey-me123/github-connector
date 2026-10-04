import { useTemplateStore } from '../store/useTemplateStore';

const DEFAULT_CHIME_URL = '/sounds/notification-chime.mp3';

let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;

const loadBuffer = async (url: string) => {
  if (!audioContext) audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
};

export const initNotificationAudio = async () => {
  const { userPreferences } = useTemplateStore.getState();
  if (!userPreferences.notificationSoundEnabled) return;

  const url = userPreferences.notificationSoundType === 'custom' && userPreferences.customNotificationSoundUrl 
    ? userPreferences.customNotificationSoundUrl 
    : DEFAULT_CHIME_URL;

  try {
    audioBuffer = await loadBuffer(url);
  } catch (err) {
    console.warn('Could not load notification sound:', err);
  }
};

const triggerHapticFeedback = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([200]);
  }
};

export const playNotificationSound = async () => {
  const { userPreferences } = useTemplateStore.getState();
  if (!userPreferences.notificationSoundEnabled) return;
  
  triggerHapticFeedback();

  if (!audioContext) await initNotificationAudio();
  if (!audioBuffer) return;
  
  try {
    if (audioContext!.state === 'suspended') {
      await audioContext!.resume();
    }
    const source = audioContext!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext!.destination);
    source.start(0);
  } catch (err) {
    console.warn('Failed to play notification sound:', err);
  }
};
