import { useEffect, useState, useCallback } from 'react';

export interface Bridge {
  getFileInfo: () => Promise<string>;
  openFileDialog: () => Promise<string>;
  loadPdf: (path: string) => Promise<string>;
  saveFile: (annotations?: string) => Promise<string>;
  saveFileAs: () => Promise<string>;
  getRecentFiles: () => Promise<string>;
  
  setCurrentPage: (page: number) => void;
  getCurrentPage: () => Promise<number>;
  
  searchPdf: (keyword: string) => void;
  getPageText: (page: number) => Promise<string>;
  
  startOcr: (page: number) => void;
  startFullOcr: (startPage?: number) => Promise<string>;
  cancelOcr: () => void;
  
  convertToWord: (fmt?: string) => Promise<string>;
  convertToImages: (fmt?: string) => Promise<string>;
  convertToMarkdown: () => Promise<string>;
  convertMarkdownToPdf: (mdPath: string) => Promise<string>;
  convertImagesToPdf: (imagePaths: string) => Promise<string>;
  extractImages: () => Promise<string>;
  
  getBookmarks: () => Promise<string>;
  addBookmark: (page: number, title: string) => void;
  
  getAnnotations: () => Promise<string>;
  saveAnnotations: (annotations: string) => void;
  addAnnotation: (annotation: string) => void;
  deleteAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  
  addTextWatermark: (text: string, opacity?: number, angle?: number, fontSize?: number) => Promise<string>;
  addImageWatermark: (imagePath: string, opacity?: number) => Promise<string>;
  
  mergePdfs: () => Promise<string>;
  splitPdf: (startPage: number, endPage: number) => Promise<string>;
  extractPages: (pages: number[]) => Promise<string>;
  deletePage: (pageNum: number) => Promise<string>;
  rotatePage: (pageNum: number, degrees: number) => Promise<string>;
  
  setSetting: (key: string, value: string) => void;
  getSetting: (key: string) => Promise<string>;
  getAllSettings: () => Promise<string>;
  
  printPdf: () => void;
}

interface Signal<T extends any[]> {
  connect: (cb: (...args: T) => void) => void;
  disconnect: (cb: (...args: T) => void) => void;
}

export interface BridgeSignals {
  searchResultsReady: Signal<[string]>;
  ocrProgress: Signal<[number, string]>;
  ocrResult: Signal<[number, string]>;
  ocrError: Signal<[string]>;
  pageUpdated: Signal<[number]>;
  fileLoaded: Signal<[string]>;
}

function createMockSignals(): BridgeSignals {
  const createSignal = <T extends any[]>() => ({
    connect: () => {},
    disconnect: () => {},
  });
  
  return {
    searchResultsReady: createSignal<[string]>(),
    ocrProgress: createSignal<[number, string]>(),
    ocrResult: createSignal<[number, string]>(),
    ocrError: createSignal<[string]>(),
    pageUpdated: createSignal<[number]>(),
    fileLoaded: createSignal<[string]>(),
  };
}

function createMockBridge(): { bridge: Bridge; signals: BridgeSignals } {
  const signals = createMockSignals();
  
  return {
    bridge: {
      getFileInfo: async () => JSON.stringify({ name: '示例.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', size: '2.3 MB', totalPages: 1 }),
      openFileDialog: async () => '/fake/path.pdf',
      loadPdf: async () => JSON.stringify({ name: '示例.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', size: '2.3 MB', totalPages: 1 }),
      saveFile: async () => '/fake/saved.pdf',
      saveFileAs: async () => '/fake/saved.pdf',
      getRecentFiles: async () => '[]',
      setCurrentPage: () => {},
      getCurrentPage: async () => 1,
      searchPdf: () => {},
      getPageText: async () => '',
      startOcr: () => {},
      startFullOcr: async () => '',
      cancelOcr: () => {},
      convertToWord: async () => '',
      convertToImages: async () => '[]',
      convertToMarkdown: async () => '',
      convertMarkdownToPdf: async () => '',
      convertImagesToPdf: async () => '',
      extractImages: async () => '[]',
      getBookmarks: async () => '[]',
      addBookmark: () => {},
      getAnnotations: async () => '[]',
      saveAnnotations: () => {},
      addAnnotation: () => {},
      deleteAnnotation: () => {},
      clearAnnotations: () => {},
      addTextWatermark: async () => '',
      addImageWatermark: async () => '',
      mergePdfs: async () => '',
      splitPdf: async () => '',
      extractPages: async () => '',
      deletePage: async () => '',
      rotatePage: async () => '',
      setSetting: () => {},
      getSetting: async () => '',
      getAllSettings: async () => '{}',
      printPdf: () => {},
    },
    signals,
  };
}

export function useQtBridge() {
  const [bridge, setBridge] = useState<Bridge | null>(null);
  const [signals, setSignals] = useState<BridgeSignals | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const qt = (window as any).qt;
    if (!qt?.webChannelTransport) {
      console.warn('非 Qt 环境，使用模拟桥接');
      const { bridge: mockBridge, signals: mockSignals } = createMockBridge();
      setBridge(mockBridge);
      setSignals(mockSignals);
      setIsReady(true);
      return;
    }

    const timer = setInterval(() => {
      if ((window as any).QWebChannel) {
        clearInterval(timer);
        try {
          new (window as any).QWebChannel(qt.webChannelTransport, (ch: any) => {
            const qtBridge = ch.objects.bridge;
            if (!qtBridge) {
              console.warn('Qt bridge 对象未找到');
              const { bridge: mockBridge, signals: mockSignals } = createMockBridge();
              setBridge(mockBridge);
              setSignals(mockSignals);
              setIsReady(true);
              return;
            }

            setBridge(qtBridge);
            setSignals({
              searchResultsReady: createSafeSignal(qtBridge.searchResultsReady),
              ocrProgress: createSafeSignal(qtBridge.ocrProgress),
              ocrResult: createSafeSignal(qtBridge.ocrResult),
              ocrError: createSafeSignal(qtBridge.ocrError),
              pageUpdated: createSafeSignal(qtBridge.pageUpdated),
              fileLoaded: createSafeSignal(qtBridge.fileLoaded),
            });
            setIsReady(true);
          });
        } catch (e) {
          console.error('WebChannel 初始化失败:', e);
          const { bridge: mockBridge, signals: mockSignals } = createMockBridge();
          setBridge(mockBridge);
          setSignals(mockSignals);
          setIsReady(true);
        }
      }
    }, 50);

    return () => clearInterval(timer);
  }, []);

  return { bridge, signals, isReady };
}

function createSafeSignal<T extends any[]>(qtSignal: any): Signal<T> {
  const safeConnect = (cb: (...args: T) => void) => {
    if (qtSignal && typeof qtSignal.connect === 'function') {
      try {
        qtSignal.connect(cb);
      } catch (e) {
        console.warn('信号连接失败:', e);
      }
    }
  };

  const safeDisconnect = (cb: (...args: T) => void) => {
    if (qtSignal && typeof qtSignal.disconnect === 'function') {
      try {
        qtSignal.disconnect(cb);
      } catch (e) {
        console.warn('信号断开失败:', e);
      }
    }
  };

  return { connect: safeConnect, disconnect: safeDisconnect };
}

export function exportToText(text: string, filename: string = 'export.txt') {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadFile(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function safeConnectSignal<T extends any[]>(
  signal: Signal<T> | null | undefined,
  callback: (...args: T) => void
): () => void {
  if (signal && typeof signal.connect === 'function') {
    try {
      signal.connect(callback);
      return () => signal.disconnect(callback);
    } catch (e) {
      console.warn('安全连接信号失败:', e);
      return () => {};
    }
  }
  return () => {};
}