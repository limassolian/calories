// Voice input disabled - expo-av is deprecated in SDK 54
// TODO: Implement with expo-audio when available

interface UseVoiceInputReturn {
  isRecording: boolean;
  isProcessing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
}

export const useVoiceInput = (): UseVoiceInputReturn => {
  return {
    isRecording: false,
    isProcessing: false,
    startRecording: async () => {},
    stopRecording: async () => null,
    cancelRecording: async () => {},
  };
};

export default useVoiceInput;
