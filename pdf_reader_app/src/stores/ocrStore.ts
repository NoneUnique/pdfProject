import { create } from 'zustand';

export type OcrStatus = 'idle' | 'running' | 'done' | 'error';

interface OcrState {
  status: OcrStatus;
  progress: number;
  result: string;
  setStatus: (s: OcrStatus) => void;
  setProgress: (p: number) => void;
  setResult: (r: string) => void;
  reset: () => void;
}

export const useOcrStore = create<OcrState>((set) => ({
  status: 'idle',
  progress: 0,
  result: '',
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setResult: (result) => set({ result }),
  reset: () => set({ status: 'idle', progress: 0, result: '' }),
}));