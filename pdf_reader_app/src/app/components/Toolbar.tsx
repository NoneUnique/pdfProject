import { useState } from 'react';
import {
  FolderOpen, Save, Printer, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, RotateCw, Maximize2, Search, Sun, Moon,
  FileText, Columns2, AlignJustify, Hand
} from 'lucide-react';
import type { ViewMode } from '../stores/viewerStore';
import type { Bridge } from '../hooks/useQtBridge';

interface Props {
  isDark: boolean;
  currentPage: number;
  totalPages: number;
  zoomLevel: number;
  viewMode: ViewMode;
  rotation: number;
  bridge: Bridge | null;
  isReady: boolean;
  isDarkMode: boolean;
  activeTool: string | null;
  onPageChange: (p: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomSet: (z: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onRotate: () => void;
  onToggleDark: () => void;
  onOpenSearch: () => void;
  onViewMode: (m: ViewMode) => void;
  onToolSelect: (tool: string | null) => void;
  onFileLoaded: (info: { name: string; url: string; size: string; totalPages: number }) => void;
}

const ZOOM_OPTIONS = [50, 75, 100, 125, 150, 175, 200, 300, 400];

export function Toolbar(props: Props) {
  const { isDark, currentPage, totalPages, zoomLevel, viewMode, rotation, bridge, isReady,
    activeTool, onPageChange, onZoomIn, onZoomOut, onZoomSet, onPrev, onNext, onRotate, onToggleDark,
    onOpenSearch, onViewMode, onToolSelect, isDarkMode, onFileLoaded } = props;
  const [pageInput, setPageInput] = useState('');

  const handleOpen = async () => {
    if (!bridge || !isReady) return;
    const path = await bridge.openFileDialog();
    if (path) {
      const infoStr = await bridge.loadPdf(path);
      if (infoStr && infoStr !== '{}') {
        const info = JSON.parse(infoStr);
        onFileLoaded({ name: info.name, url: info.url, size: info.size, totalPages: info.totalPages });
      }
    }
  };

  const handleSave = () => bridge?.saveFile();

  // Compatibility handlers (no-op wrappers) to avoid runtime ReferenceError
  const handleMerge = async () => {
    if (!bridge || !isReady) return;
    try {
      const out = await bridge.mergePdfs();
      if (out) alert(`合并完成: ${out}`);
    } catch (e) {
      console.error(e);
      alert('合并失败');
    }
  };

  const handleSplit = async () => {
    if (!bridge || !isReady) return;
    const range = window.prompt('输入拆分页范围 (例如 1-3)：');
    if (!range) return;
    const m = range.split('-').map(s => parseInt(s.trim(), 10));
    if (m.length !== 2 || m.some(isNaN)) return alert('范围格式错误');
    try {
      const out = await bridge.splitPdf(m[0], m[1]);
      if (out) alert(`拆分完成: ${out}`);
    } catch (e) {
      console.error(e);
      alert('拆分失败');
    }
  };

  const handleExtractPages = async () => {
    if (!bridge || !isReady) return;
    const input = window.prompt('输入要提取的页码 (逗号分隔，例如 1,3,5)：');
    if (!input) return;
    const pages = input.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    if (pages.length === 0) return alert('无效页码');
    try {
      const out = await bridge.extractPages(pages);
      if (out) alert(`提取完成: ${out}`);
    } catch (e) {
      console.error(e);
      alert('提取失败');
    }
  };

  const handleDeletePage = async () => {
    if (!bridge || !isReady) return;
    const p = parseInt(window.prompt('输入要删除的页码：') || '', 10);
    if (isNaN(p)) return alert('无效页码');
    try {
      const out = await bridge.deletePage(p);
      if (out) alert(`删除并保存为: ${out}`);
    } catch (e) {
      console.error(e);
      alert('删除失败');
    }
  };

  const handleAddTextWatermark = async () => {
    if (!bridge || !isReady) return;
    const text = window.prompt('输入水印文本：');
    if (!text) return;
    try {
      const out = await bridge.addTextWatermark(text, 30, 45, 48);
      if (out) alert(`已生成: ${out}`);
    } catch (e) {
      console.error(e);
      alert('文字水印失败');
    }
  };

  const handleAddImageWatermark = async () => {
    if (!bridge || !isReady) return;
    const imgPath = window.prompt('输入图片路径：');
    if (!imgPath) return;
    try {
      const out = await bridge.addImageWatermark(imgPath, 30);
      if (out) alert(`已生成: ${out}`);
    } catch (e) {
      console.error(e);
      alert('图片水印失败');
    }
  };

  const bg = isDark ? '#1e2229' : '#f5f6f7';
  const border = isDark ? '#2a2d35' : '#e6e6e6';
  const inputBg = isDark ? '#252830' : '#ffffff';
  const inputBorder = isDark ? '#3a3d4a' : '#d7dbe0';
  const textColor = isDark ? '#f1f5f9' : '#1e293b';

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: 4, background: bg, borderBottom: `1px solid ${border}`, height: 46, fontFamily: 'system-ui' }}>
      <IconBtn icon={FolderOpen} label="打开" onClick={handleOpen} isDark={isDark} />
      <IconBtn icon={Save} label="保存" onClick={handleSave} isDark={isDark} />
      <IconBtn icon={Printer} label="打印" isDark={isDark} onClick={() => window.print()} />
      <Sep isDark={isDark} />

      <IconBtn icon={ChevronLeft} label="上一页" onClick={onPrev} disabled={currentPage <= 1} isDark={isDark} />
      <input
        type="text"
        value={pageInput !== '' ? pageInput : String(currentPage)}
        onChange={e => setPageInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            const n = parseInt(pageInput);
            if (!isNaN(n) && n >= 1 && n <= totalPages) onPageChange(n);
            setPageInput('');
          }
        }}
        style={{ width: 42, textAlign: 'center', background: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: 4, height: 26 }}
      />
      <span style={{ color: textColor, fontSize: 12 }}>/ {totalPages}</span>
      <IconBtn icon={ChevronRight} label="下一页" onClick={onNext} disabled={currentPage >= totalPages} isDark={isDark} />
      <Sep isDark={isDark} />

      <IconBtn icon={ZoomOut} label="" onClick={onZoomOut} disabled={zoomLevel <= 50} isDark={isDark} />
      <select value={zoomLevel} onChange={e => onZoomSet(Number(e.target.value))}
        style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: 4, padding: '2px 20px 2px 6px', fontSize: 12, height: 26 }}>
        {ZOOM_OPTIONS.map(z => <option key={z} value={z}>{z}%</option>)}
      </select>
      <IconBtn icon={ZoomIn} label="" onClick={onZoomIn} disabled={zoomLevel >= 400} isDark={isDark} />
      <Sep isDark={isDark} />

      <IconBtn icon={RotateCw} label={`旋转 ${rotation}°`} onClick={onRotate} isDark={isDark} />
      <Sep isDark={isDark} />

      <IconBtn icon={Hand} label="手抓" active={activeTool === 'hand'} onClick={() => onToolSelect(activeTool === 'hand' ? null : 'hand')} isDark={isDark} />
      <Sep isDark={isDark} />

      <IconBtn icon={FileText} label="单页" active={viewMode === 'single'} onClick={() => onViewMode('single')} isDark={isDark} />
      <IconBtn icon={Columns2} label="双页" active={viewMode === 'double'} onClick={() => onViewMode('double')} isDark={isDark} />
      <IconBtn icon={AlignJustify} label="连续" active={viewMode === 'continuous'} onClick={() => onViewMode('continuous')} isDark={isDark} />
      <Sep isDark={isDark} />

      <IconBtn icon={Maximize2} label="全屏" isDark={isDark} />
      <Sep isDark={isDark} />

      <IconBtn icon={Search} label="搜索" onClick={onOpenSearch} isDark={isDark} />
      <IconBtn icon={isDarkMode ? Sun : Moon} label={isDarkMode ? "浅色" : "深色"} onClick={onToggleDark} isDark={isDark} />
    </div>
  );
}

function IconBtn({ icon: Icon, label, onClick, active, isDark, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, border: 'none', padding: '4px 10px', gap: 8, minWidth: 56, height: 34,
        background: active ? '#409EFF' : 'transparent',
        color: disabled ? (isDark ? '#4b5563' : '#9aa3ad') : (active ? '#fff' : (isDark ? '#ccd2db' : '#334155')),
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      }}
      title={label}
    >
      <Icon size={16} strokeWidth={2} />
      <span style={{ fontSize: 12, marginLeft: 6 }}>{label}</span>
    </button>
  );
}

function Sep({ isDark }: { isDark: boolean }) {
  return <div style={{ width: 1, height: 28, background: isDark ? '#2e323d' : '#e6e6e6', margin: '0 8px' }} />;
}