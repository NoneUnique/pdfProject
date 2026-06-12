import { create } from 'zustand';

export type ViewMode = 'single' | 'double' | 'continuous';

interface ViewerState {
  currentPage: number;
  zoomLevel: number;
  viewMode: ViewMode;
  setCurrentPage: (page: number) => void;
  setZoomLevel: (zoom: number) => void;
  setViewMode: (mode: ViewMode) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  nextPage: (total: number) => void;
  prevPage: () => void;
}

export const useViewerStore = create<ViewerState>((set, get) => ({
  currentPage: 1,
  zoomLevel: 100,
  viewMode: 'continuous',
  setCurrentPage: (page) => set({ currentPage: page }),
  setZoomLevel: (zoom) => set({ zoomLevel: zoom }),
  setViewMode: (mode) => set({ viewMode: mode }),
  zoomIn: () => set((state) => ({ zoomLevel: Math.min(state.zoomLevel + 25, 400) })),
  zoomOut: () => set((state) => ({ zoomLevel: Math.max(state.zoomLevel - 25, 50) })),
  nextPage: (total) => set((state) => ({
    currentPage: Math.min(state.currentPage + 1, total)
  })),
  prevPage: () => set((state) => ({
    currentPage: Math.max(state.currentPage - 1, 1)
  })),
}));