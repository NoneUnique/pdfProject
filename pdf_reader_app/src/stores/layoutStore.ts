import { create } from 'zustand';

type LeftTab = 'thumbnails' | 'bookmarks' | 'layers';

interface LayoutState {
  leftOpen: boolean;
  rightOpen: boolean;
  leftTab: LeftTab;
  setLeftTab: (tab: LeftTab) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  leftOpen: true,
  rightOpen: false,
  leftTab: 'thumbnails',
  setLeftTab: (tab) => set({ leftTab: tab }),
  toggleLeft: () => set((state) => ({ leftOpen: !state.leftOpen })),
  toggleRight: () => set((state) => ({ rightOpen: !state.rightOpen })),
}));