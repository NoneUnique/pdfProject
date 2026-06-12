import { useEffect, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useQtBridge, safeConnectSignal } from '../hooks/useQtBridge';
import { useViewerStore } from '../stores/viewerStore';
import { usePdfStore } from '../stores/pdfStore';
import { useLayoutStore } from '../stores/layoutStore';
import { useOcrStore } from '../stores/ocrStore';
import { Toolbar } from './components/Toolbar';
import { PDFViewer } from './components/PDFViewer';
import { MenuBar } from './components/MenuBar';
import { LeftSidebar } from './components/LeftSidebar';
import { RightPanel, type AnnotationTool, type OcrStatus } from './components/RightPanel';
import { StatusBar } from './components/StatusBar';
import { SearchModal } from './components/SearchModal';

export default function App() {
  const { bridge, signals, isReady } = useQtBridge();
  const {
    currentPage, zoomLevel, viewMode,
    setCurrentPage, setViewMode, zoomIn, zoomOut, setZoomLevel, nextPage, prevPage
  } = useViewerStore();
  const { fileName, fileUrl, fileSize, totalPages, isLoaded, setPdfInfo } = usePdfStore();
  const { leftOpen, rightOpen, leftTab, setLeftTab, toggleLeft, toggleRight } = useLayoutStore();
  const { status: ocrStatus, progress: ocrProgress, result: ocrResult,
    setStatus: setOcrStatus, setProgress: setOcrProgress, setResult: setOcrResult, reset: resetOcr } = useOcrStore();

  const [isDark, setIsDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ page: number; text: string }[]>([]);
  const [activeTool, setActiveTool] = useState<AnnotationTool>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!bridge || !isReady) return;
    bridge.getFileInfo().then((json) => {
      if (json && json !== '{}') {
        const info = JSON.parse(json);
        setPdfInfo(info);
      }
    }).catch(() => {});
  }, [bridge, isReady]);

  useEffect(() => {
    const handleZoomChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'number') {
        setZoomLevel(detail);
      }
    };
    
    window.addEventListener('pdf-zoom-change', handleZoomChange);
    return () => window.removeEventListener('pdf-zoom-change', handleZoomChange);
  }, [setZoomLevel]);

  useEffect(() => {
    if (!bridge || !isReady || !isLoaded) return;
    bridge.setCurrentPage?.(currentPage);
  }, [currentPage, bridge, isReady, isLoaded]);

  useEffect(() => {
    if (!signals) return;
    
    const disconnectOcrProgress = safeConnectSignal(signals.ocrProgress, (p: number, msg: string) => {
      setOcrProgress(p);
    });
    
    const disconnectOcrResult = safeConnectSignal(signals.ocrResult, (page: number, text: string) => {
      setOcrResult(text);
      setOcrStatus('done');
    });
    
    const disconnectOcrError = safeConnectSignal(signals.ocrError, (msg: string) => {
      setOcrStatus('error');
      console.error(msg);
    });
    
    const disconnectSearchResults = safeConnectSignal(signals.searchResultsReady, (results: string) => {
      try {
        setSearchResults(JSON.parse(results));
      } catch (e) {
        console.error('解析搜索结果失败:', e);
      }
    });
    
    const disconnectFileLoaded = safeConnectSignal(signals.fileLoaded, (path: string) => {
      console.log('文件加载:', path);
    });

    return () => {
      disconnectOcrProgress();
      disconnectOcrResult();
      disconnectOcrError();
      disconnectSearchResults();
      disconnectFileLoaded();
    };
  }, [signals]);

  const startOcr = async () => {
    if (!bridge || ocrStatus === 'running') return;
    setOcrStatus('running');
    setOcrProgress(0);
    bridge.startOcr(currentPage);
  };

  const bg = isDark ? '#1a1d24' : '#F5F7FA';
  const fg = isDark ? '#e0e0e8' : '#333333';
  const resizeBg = isDark ? '#2a2d35' : '#d0d7e3';

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: bg, color: fg, fontFamily: 'system-ui, sans-serif', userSelect: 'none' }}>
      <MenuBar isDark={isDark} leftOpen={leftOpen} rightOpen={rightOpen} viewMode={viewMode}
        onToggleDark={() => setIsDark(!isDark)} onViewMode={setViewMode} onOpenSearch={() => setSearchOpen(true)}
        onToggleLeft={toggleLeft} onToggleRight={toggleRight} />

      <Toolbar
        isDark={isDark}
        currentPage={currentPage}
        totalPages={totalPages}
        zoomLevel={zoomLevel}
        viewMode={viewMode}
        rotation={rotation}
        bridge={bridge}
        isReady={isReady}
        isDarkMode={isDark}
        activeTool={activeTool}
        onPageChange={setCurrentPage}
        onZoomSet={setZoomLevel}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onPrev={prevPage}
        onNext={() => nextPage(totalPages)}
        onRotate={() => setRotation((r) => (r + 90) % 360)}
        onToggleDark={() => setIsDark(!isDark)}
        onOpenSearch={() => setSearchOpen(true)}
        onViewMode={setViewMode}
        onToolSelect={setActiveTool}
        onFileLoaded={(info) => {
          setPdfInfo(info);
          setCurrentPage(1);
          resetOcr();
        }}
      />

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {leftOpen && (
            <>
              <Panel defaultSize={20} minSize={12} maxSize={35}>
                <LeftSidebar isDark={isDark} currentPage={currentPage} totalPages={totalPages}
                  leftTab={leftTab} onTabChange={setLeftTab} onPageClick={setCurrentPage} />
              </Panel>
              <PanelResizeHandle style={{ width: 4, background: resizeBg, cursor: 'col-resize' }} />
            </>
          )}

          <Panel>
            <PDFViewer
              isDark={isDark}
              currentPage={currentPage}
              totalPages={totalPages}
              zoomLevel={zoomLevel}
              viewMode={viewMode}
              rotation={rotation}
              activeTool={activeTool}
              searchQuery={searchQuery}
              fileUrl={fileUrl}
              onPageChange={setCurrentPage}
              onSearchResults={setSearchResults}
            />
          </Panel>

          {rightOpen && (
            <>
              <PanelResizeHandle style={{ width: 4, background: resizeBg, cursor: 'col-resize' }} />
              <Panel defaultSize={22} minSize={16} maxSize={36}>
                <RightPanel isDark={isDark} activeTool={activeTool} onToolSelect={setActiveTool}
                  ocrStatus={ocrStatus} ocrProgress={ocrProgress} onStartOcr={startOcr} onStopOcr={() => bridge?.cancelOcr()} />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      <StatusBar isDark={isDark} currentPage={currentPage} totalPages={totalPages}
        zoomLevel={zoomLevel} fileSize={fileSize} fileName={fileName}
        ocrStatus={ocrStatus} ocrProgress={ocrProgress} />

      {searchOpen && (
      <SearchModal 
        isDark={isDark} 
        query={searchQuery} 
        onQueryChange={setSearchQuery}
        onClose={() => setSearchOpen(false)}
        onGoToPage={setCurrentPage}
        searchResults={searchResults}
      />
    )}
    </div>
  );
}