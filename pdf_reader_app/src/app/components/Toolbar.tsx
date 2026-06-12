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

  const bg = isDark ? '#1e2229' : '#ffffff';
  const border = isDark ? '#2a2d35' : '#e2e8f0';
  const inputBg = isDark ? '#252830' : '#f1f5f9';
  const inputBorder = isDark ? '#3a3d4a' : '#cbd5e1';
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
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        borderRadius: 4, border: 'none', padding: '3px 8px', gap: 3, minWidth: 44, height: 36,
        background: active ? '#409EFF' : 'transparent',
        color: disabled ? (isDark ? '#4b5563' : '#cbd5e1') : (active ? '#fff' : (isDark ? '#ccd2db' : '#4b5563')),
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
      }}
      title={label}
    >
      <Icon size={15} strokeWidth={2} />
      <span style={{ fontSize: 10 }}>{label}</span>
    </button>
  );
}

function Sep({ isDark }: { isDark: boolean }) {
  return <div style={{ width: 1, height: 22, background: isDark ? '#2e323d' : '#e2e8f0', margin: '0 6px' }} />;
}