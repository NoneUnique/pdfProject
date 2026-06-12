import { create } from 'zustand';

interface PdfInfo {
  name: string;
  url: string;
  size: string;
  totalPages: number;
  pdfDoc?: any; // pdf.js 文档对象
}

interface PdfState {
  fileName: string;
  fileUrl: string;
  fileSize: string;
  totalPages: number;
  pdfDoc: any;          // 存储 pdfjs 文档对象
  isLoaded: boolean;
  setPdfInfo: (info: PdfInfo) => void;
  reset: () => void;
}

export const usePdfStore = create<PdfState>((set) => ({
  fileName: '',
  fileUrl: '',
  fileSize: '',
  totalPages: 0,
  pdfDoc: null,
  isLoaded: false,
  setPdfInfo: (info) =>
    set({
      fileName: info.name,
      fileUrl: info.url,
      fileSize: info.size,
      totalPages: info.totalPages,
      pdfDoc: info.pdfDoc ?? null,
      isLoaded: true,
    }),
  reset: () =>
    set({
      fileName: '',
      fileUrl: '',
      fileSize: '',
      totalPages: 0,
      pdfDoc: null,
      isLoaded: false,
    }),
}));