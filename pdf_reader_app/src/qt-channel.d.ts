// src/types/qt-channel.d.ts

export interface IPythonBridge {
  // 文件操作
  getFileInfo(): Promise<string>;
  openFileDialog(): Promise<string>;
  loadPdf(filePath: string): Promise<string>;
  saveFile(): void;

  // 最近文件
  getRecentFiles(): Promise<string>;

  // 页面同步
  pageChanged(page: number): void;

  // OCR
  startOcr(page: number): void;
  cancelOcr(): void;
  ocrProgress: QtSignal<(percent: number, message: string) => void>;
  ocrResult: QtSignal<(page: number, text: string) => void>;
  ocrError: QtSignal<(error: string) => void>;

  // 书签
  getBookmarks(): Promise<string>;

  // 转换
  convertToWord(fmt?: string): Promise<string>;
  extractImages(): Promise<string>;
  convertToMarkdown(): Promise<string>;

  // 设置
  setSetting(key: string, value: string): void;
  getSetting(key: string): Promise<string>;

  // 文件加载信号
  fileLoaded: QtSignal<(filePath: string) => void>;
}

// QWebChannel 信号对象类型：包含 connect / disconnect
export interface QtSignal<T extends (...args: any[]) => void> {
  connect(callback: T): void;
  disconnect(callback: T): void;
}

// 扩展全局 window
declare global {
  interface Window {
    qt?: {
      webChannelTransport: any;
    };
    QWebChannel: any;
    bridge: IPythonBridge;   // 也可以不挂到 window，通过 Hook 导出
  }
}