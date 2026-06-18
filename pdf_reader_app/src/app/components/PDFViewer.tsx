import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePdfStore } from '../../stores/pdfStore';
import { useQtBridge } from '../../hooks/useQtBridge';

const pdfjsLib = (window as any).pdfjsLib;

export type ViewMode = 'single' | 'double' | 'continuous';

interface PDFViewerProps {
  isDark: boolean;
  currentPage: number;
  totalPages: number;
  zoomLevel: number;
  viewMode: ViewMode;
  rotation: number;
  activeTool: string | null;
  searchQuery: string;
  fileUrl: string;
  onPageChange: (page: number) => void;
  onSearchResults?: (results: { page: number; text: string }[]) => void;
}

interface Annotation {
  id: string;
  type: 'highlight' | 'text' | 'line' | 'draw';
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color: string;
  points?: { x: number; y: number }[];
}

export function PDFViewer({ 
  isDark, 
  currentPage, 
  totalPages, 
  zoomLevel, 
  viewMode, 
  rotation,
  activeTool,
  searchQuery,
  fileUrl, 
  onPageChange,
  onSearchResults
}: PDFViewerProps) {
  const { setPdfInfo } = usePdfStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPanMode, setIsPanMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const renderGenerationRef = useRef(0);
  const renderTaskMapRef = useRef<Map<number, any>>(new Map());

  const { bridge, isReady } = useQtBridge();

  useEffect(() => {
    if (!fileUrl) {
      setPdfDoc(null);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const loadingTask = pdfjsLib.getDocument({
      url: fileUrl,
      useSystemFonts: true,
    });
    
    loadingTask.promise.then((pdf: any) => {
      setPdfDoc(pdf);
      setPdfInfo({ name: '', url: fileUrl, size: '', totalPages: pdf.numPages, pdfDoc: pdf });
      setIsLoading(false);
      if (totalPages !== pdf.numPages) {
        onPageChange(1);
      }
    }).catch((err: any) => {
      console.error('PDF 加载失败', err);
      setIsLoading(false);
    });
    
    return () => {
      loadingTask.destroy?.();
    };
  }, [fileUrl]);

  const openFileFromDialog = async () => {
    if (!bridge || !isReady) return;
    try {
      const path = await bridge.openFileDialog();
      if (!path) return;
      const infoStr = await bridge.loadPdf(path);
      if (infoStr && infoStr !== '{}') {
        const info = JSON.parse(infoStr);
        setPdfInfo(info);
      }
    } catch (e) {
      console.error('打开文件失败', e);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim() || !pdfDoc) return;

    const searchText = async () => {
      const results: { page: number; text: string }[] = [];
      const maxPages = Math.min(pdfDoc.numPages, 50);
      for (let i = 1; i <= maxPages; i++) {
        try {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          const text = textContent.items.map((item: any) => item.str || '').join(' ');
          if (text.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({ page: i, text: text.substring(0, 100) });
          }
        } catch (e) {
          console.log(`Page ${i} search failed`, e);
        }
      }
      onSearchResults?.(results);
    };
    searchText();
  }, [searchQuery, pdfDoc]);

  const renderTextLayer = useCallback((textContent: any, container: HTMLElement, viewport: any, scale: number) => {
    const textLayerItems = textContent.items;
    
    for (const item of textLayerItems) {
      if (typeof item.str !== 'string' || !item.str.trim()) continue;
      
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const x = tx[4];
      const y = tx[5];
      const w = item.width || (tx[0] * item.str.length);
      const h = item.height || Math.abs(tx[3]);
      
      const span = document.createElement('span');
      span.textContent = item.str;
      span.style.position = 'absolute';
      span.style.left = x + 'px';
      span.style.top = (y - h * 0.85) + 'px';
      span.style.width = w + 'px';
      span.style.height = h + 'px';
      span.style.fontSize = h * 0.9 + 'px';
      span.style.lineHeight = '1.2em';
      span.style.color = 'transparent';
      span.style.background = 'rgba(64, 158, 255, 0.02)';
      span.style.userSelect = 'text';
      span.style.cursor = isPanMode ? 'grab' : 'text';
      span.style.whiteSpace = 'pre';
      span.style.overflow = 'visible';
      
      if (searchQuery.trim() && item.str.toLowerCase().includes(searchQuery.toLowerCase())) {
        span.style.backgroundColor = 'rgba(255, 230, 0, 0.3)';
      }
      
      container.appendChild(span);
    }
  }, [isPanMode, searchQuery]);

  useEffect(() => {
    if (!pdfDoc || !canvasContainerRef.current) return;
    
    renderGenerationRef.current += 1;
    const currentGeneration = renderGenerationRef.current;
    
    const container = canvasContainerRef.current;
    const scrollContainer = containerRef.current;
    const prevScrollTop = scrollContainer?.scrollTop || 0;
    
    container.innerHTML = '';
    renderTaskMapRef.current.forEach((task) => task.cancel?.());
    renderTaskMapRef.current.clear();

    const scale = zoomLevel / 100;
    const rotate = (rotation % 360 + 360) % 360;

    const renderPages = async () => {
      const pagesToRender: number[] = [];
      
      if (viewMode === 'single') {
        pagesToRender.push(currentPage);
      } else if (viewMode === 'double') {
        const startPage = currentPage % 2 === 0 ? currentPage - 1 : currentPage;
        if (startPage >= 1) pagesToRender.push(startPage);
        if (startPage + 1 <= pdfDoc.numPages) pagesToRender.push(startPage + 1);
      } else {
        const pageHeight = 800 * scale;
        const visiblePages = Math.ceil(window.innerHeight / pageHeight) + 2;
        const startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
        const endPage = Math.min(pdfDoc.numPages, startPage + visiblePages);
        for (let i = startPage; i <= endPage; i++) {
          pagesToRender.push(i);
        }
      }

      const promises = pagesToRender.map(async (pageNum) => {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale, rotation: rotate });
          
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.dataset.page = String(pageNum);
          
          const ctx = canvas.getContext('2d')!;
          if (isDark) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, viewport.width, viewport.height);
          }
          
          const renderTask = page.render({ canvasContext: ctx, viewport });
          renderTaskMapRef.current.set(pageNum, renderTask);
          
          await renderTask.promise;
          renderTaskMapRef.current.delete(pageNum);
          
          if (renderGenerationRef.current !== currentGeneration) return null;
          
          const pageContainer = document.createElement('div');
          pageContainer.style.position = 'relative';
          pageContainer.style.display = viewMode === 'double' ? 'inline-flex' : 'block';
          if (viewMode === 'double') {
            pageContainer.style.flex = '1';
            pageContainer.style.maxWidth = '50%';
          }
          pageContainer.style.marginBottom = viewMode === 'continuous' ? '8px' : '0';
          pageContainer.style.width = viewport.width + 'px';
          pageContainer.style.height = viewport.height + 'px';
          
          canvas.style.position = 'absolute';
          canvas.style.top = '0';
          canvas.style.left = '0';
          canvas.style.borderRadius = '4px';
          canvas.style.boxShadow = isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)';
          
          const textLayerDiv = document.createElement('div');
          textLayerDiv.className = 'textLayer';
          textLayerDiv.style.position = 'absolute';
          textLayerDiv.style.top = '0';
          textLayerDiv.style.left = '0';
          textLayerDiv.style.width = viewport.width + 'px';
          textLayerDiv.style.height = viewport.height + 'px';
          textLayerDiv.style.userSelect = 'text';
          textLayerDiv.style.cursor = isPanMode ? 'grab' : 'text';
          
          try {
            const textContent = await page.getTextContent();
            renderTextLayer(textContent, textLayerDiv, viewport, scale);
          } catch (e) {
            console.log('文本层渲染失败', e);
          }
          
          pageContainer.appendChild(canvas);
          pageContainer.appendChild(textLayerDiv);
          
          return pageContainer;
        } catch (e) {
          console.log(`页面 ${pageNum} 处理失败`, e);
          return null;
        }
      });
      
      const pageContainers = await Promise.all(promises);
      
      if (renderGenerationRef.current !== currentGeneration) return;
      
      const fragment = document.createDocumentFragment();
      pageContainers.forEach((pc) => {
        if (pc) fragment.appendChild(pc);
      });
      container.appendChild(fragment);
      
      if (scrollContainer) {
        scrollContainer.scrollTop = prevScrollTop * scale;
      }
    };

    renderPages();
    
    return () => {
      renderGenerationRef.current += 1;
      renderTaskMapRef.current.forEach((task) => task.cancel?.());
      renderTaskMapRef.current.clear();
    };
  }, [pdfDoc, currentPage, zoomLevel, viewMode, rotation, isDark, isPanMode, renderTextLayer]);

  useEffect(() => {
    setIsPanMode(activeTool === 'hand');
  }, [activeTool]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -25 : 25;
        const newZoom = Math.max(50, Math.min(400, zoomLevel + delta));
        window.dispatchEvent(new CustomEvent('pdf-zoom-change', { detail: newZoom }));
        return;
      }
      
      if (viewMode === 'continuous') {
        return;
      }
      
      if (e.deltaY > 0 && currentPage < totalPages) {
        onPageChange(currentPage + 1);
      } else if (e.deltaY < 0 && currentPage > 1) {
        onPageChange(currentPage - 1);
      }
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [zoomLevel, viewMode, currentPage, totalPages, onPageChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPanMode) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanMode && isDragging) {
      const container = containerRef.current;
      if (container) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        container.scrollLeft -= dx;
        container.scrollTop -= dy;
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!fileUrl) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark ? '#1e2229' : '#f5f7fa',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <button onClick={openFileFromDialog} style={{
            width: 120,
            height: 120,
            borderRadius: 12,
            border: `2px dashed ${isDark ? '#3a3f47' : '#dfe6ee'}`,
            background: isDark ? '#16181c' : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 48,
            color: isDark ? '#9fbffb' : '#409EFF',
            cursor: 'pointer'
          }}>+</button>
          <div style={{ textAlign: 'center', color: isDark ? '#9aa6b2' : '#4b5563' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>打开文件</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>或将文件拖放到此处</div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark ? '#1e2229' : '#f5f7fa',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            border: `3px solid ${isDark ? '#409EFF' : '#dbeafe'}`,
            borderTopColor: '#409EFF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <span style={{ color: isDark ? '#888' : '#666', fontSize: 14 }}>加载中...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        background: isDark ? '#1e2229' : '#ffffff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: viewMode === 'continuous' ? 'flex-start' : 'center',
        padding: 16,
        boxSizing: 'border-box',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        ref={canvasContainerRef}
        style={{
          display: viewMode === 'double' ? 'flex' : 'block',
          gap: viewMode === 'double' ? '8px' : '0',
          paddingBottom: viewMode === 'continuous' ? 32 : 0,
        }}
      />
    </div>
  );
}