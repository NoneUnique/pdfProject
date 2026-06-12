import { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, LayoutGrid, ChevronDown, ChevronRight } from 'lucide-react';
import { usePdfStore } from '../../stores/pdfStore';
import { useQtBridge } from '../../hooks/useQtBridge';

interface TOCItem {
  id: string;
  title: string;
  page: number;
  children?: TOCItem[];
}

const TOC_DATA: TOCItem[] = [
  {
    id: '1',
    title: '第一章：引言',
    page: 1,
    children: [
      { id: '1.1', title: '1.1 研究背景', page: 2 },
      { id: '1.2', title: '1.2 研究目标', page: 3 },
      { id: '1.3', title: '1.3 研究范围', page: 4 },
    ],
  },
  {
    id: '2',
    title: '第二章：文献综述',
    page: 5,
    children: [
      { id: '2.1', title: '2.1 相关研究', page: 6 },
      { id: '2.2', title: '2.2 理论框架', page: 8 },
    ],
  },
  {
    id: '3',
    title: '第三章：研究方法',
    page: 10,
    children: [
      { id: '3.1', title: '3.1 研究设计', page: 11 },
      { id: '3.2', title: '3.2 数据收集', page: 13 },
      { id: '3.3', title: '3.3 分析方法', page: 15 },
    ],
  },
  {
    id: '4',
    title: '第四章：研究结果',
    page: 17,
    children: [
      { id: '4.1', title: '4.1 定量分析', page: 18 },
      { id: '4.2', title: '4.2 定性分析', page: 21 },
    ],
  },
  { id: '5', title: '第五章：讨论', page: 23 },
  { id: '6', title: '第六章：结论', page: 25 },
  { id: 'ref', title: '参考文献', page: 27 },
  { id: 'app', title: '附录', page: 28 },
];

function findItemByPage(items: TOCItem[], page: number): TOCItem | null {
  for (const item of items) {
    if (item.page === page) return item;
    if (item.children) {
      const found = findItemByPage(item.children, page);
      if (found) return found;
    }
  }
  return null;
}

function isItemAncestor(item: TOCItem, targetPage: number): boolean {
  if (item.page <= targetPage) {
    if (!item.children || item.children.length === 0) {
      const nextSibling = null;
      return !nextSibling || nextSibling.page > targetPage;
    }
    const lastChild = item.children[item.children.length - 1];
    return lastChild.page >= targetPage;
  }
  return false;
}

function TOCNode({ item, isDark, currentPage, onPageClick, depth = 0, shouldExpand }: { 
  item: TOCItem; 
  isDark: boolean; 
  currentPage: number; 
  onPageClick: (page: number) => void; 
  depth?: number;
  shouldExpand: boolean;
}) {
  const [expanded, setExpanded] = useState(depth === 0 || shouldExpand);
  const nodeRef = useRef<HTMLDivElement>(null);
  const hasChildren = !!item.children?.length;
  
  const isActive = currentPage === item.page;
  const isAncestor = hasChildren && isItemAncestor(item, currentPage);
  
  useEffect(() => {
    if (isActive && nodeRef.current) {
      nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentPage, isActive]);

  useEffect(() => {
    if (shouldExpand) {
      setExpanded(true);
    }
  }, [shouldExpand]);

  const activeBg = isDark ? '#1a3050' : '#dbeafe';
  const hoverBg = isDark ? '#252830' : '#f0f5ff';
  const activeColor = '#409EFF';
  const normalColor = isDark ? '#c0c0d0' : '#333333';
  const secondaryColor = isDark ? '#6a6a8a' : '#888888';

  return (
    <div>
      <div
        ref={nodeRef}
        className="flex items-center cursor-pointer rounded transition-colors"
        style={{
          paddingLeft: 8 + depth * 14,
          paddingRight: 8,
          paddingTop: 5,
          paddingBottom: 5,
          background: isActive ? activeBg : (isAncestor ? (isDark ? '#1e2530' : '#e8f0fe') : 'transparent'),
          color: isActive ? activeColor : normalColor,
        }}
        onMouseEnter={(e) => {
          if (!isActive) (e.currentTarget as HTMLDivElement).style.background = hoverBg;
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLDivElement).style.background = isAncestor ? (isDark ? '#1e2530' : '#e8f0fe') : 'transparent';
          }
        }}
        onClick={() => {
          if (hasChildren) setExpanded((e) => !e);
          onPageClick(item.page);
        }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown size={11} className="mr-1 shrink-0" />
          ) : (
            <ChevronRight size={11} className="mr-1 shrink-0" />
          )
        ) : (
          <span className="w-3 mr-1 shrink-0" />
        )}
        <span
          className="flex-1 truncate"
          style={{
            fontSize: depth === 0 ? '0.78rem' : '0.73rem',
            fontWeight: isActive || depth === 0 ? 500 : 400,
          }}
        >
          {item.title}
        </span>
        <span style={{ fontSize: '0.65rem', color: isActive ? activeColor : secondaryColor, marginLeft: 4, flexShrink: 0 }}>
          {item.page}
        </span>
      </div>
      {hasChildren && expanded && (
        <div>
          {item.children!.map((child) => (
            <TOCNode
              key={child.id}
              item={child}
              isDark={isDark}
              currentPage={currentPage}
              onPageClick={onPageClick}
              depth={depth + 1}
              shouldExpand={isItemAncestor(child, currentPage) || currentPage === child.page}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Thumbnail({ page, pdfDoc, isActive, isDark, onClick }: { 
  page: number; 
  pdfDoc: any; 
  isActive: boolean; 
  isDark: boolean; 
  onClick: () => void; 
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;

    pdfDoc.getPage(page).then((pdfPage: any) => {
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale: 0.3 });
      const canvas = canvasRef.current!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      if (isDark) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, viewport.width, viewport.height);
      }
      pdfPage.render({ canvasContext: ctx, viewport }).promise.finally(() => {
        if (!cancelled) setLoading(false);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, page, isDark]);

  useEffect(() => {
    if (isActive && thumbnailRef.current) {
      thumbnailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

  const activeBorder = '#409EFF';
  const normalBorder = isDark ? '#3a3d4a' : '#d0d7e3';
  const thumbBg = isDark ? '#252830' : '#ffffff';

  return (
    <div
      ref={thumbnailRef}
      className="flex flex-col items-center cursor-pointer"
      onClick={onClick}
      style={{ marginBottom: 12 }}
    >
      <div
        style={{
          width: 100,
          height: 141,
          background: thumbBg,
          border: `2px solid ${isActive ? activeBorder : normalBorder}`,
          borderRadius: 4,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isActive ? '0 2px 8px rgba(64,158,255,0.3)' : undefined,
          transform: isActive ? 'scale(1.03)' : 'scale(1)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {loading && <div style={{ fontSize: 10, color: '#aaa' }}>...</div>}
        <canvas
          ref={canvasRef}
          style={{ display: loading ? 'none' : 'block', width: '100%', height: '100%' }}
        />
      </div>
      <span
        style={{
          fontSize: 10,
          marginTop: 4,
          color: isActive ? '#409EFF' : isDark ? '#6a6a8a' : '#999',
          fontWeight: isActive ? 600 : 400,
        }}
      >
        第 {page} 页
      </span>
    </div>
  );
}

interface LeftSidebarProps {
  isDark: boolean;
  currentPage: number;
  totalPages: number;
  leftTab: 'toc' | 'thumbnails';
  onTabChange: (tab: 'toc' | 'thumbnails') => void;
  onPageClick: (page: number) => void;
}

export function LeftSidebar({
  isDark,
  currentPage,
  totalPages,
  leftTab,
  onTabChange,
  onPageClick,
}: LeftSidebarProps) {
  const { pdfDoc } = usePdfStore();
  const { bridge, isReady } = useQtBridge();
  const [bookmarks, setBookmarks] = useState<TOCItem[]>([]);
  const [hasLoadedBookmarks, setHasLoadedBookmarks] = useState(false);

  useEffect(() => {
    if (!bridge || !isReady || hasLoadedBookmarks) return;
    
    bridge.getBookmarks().then((json) => {
      try {
        const data = JSON.parse(json);
        if (data && data.length > 0) {
          const tocItems: TOCItem[] = data.map((item: any, index: number) => ({
            id: String(index + 1),
            title: item.title || 'Untitled',
            page: item.page || 1,
            children: item.children ? item.children.map((child: any, ci: number) => ({
              id: `${index + 1}.${ci + 1}`,
              title: child.title || 'Untitled',
              page: child.page || 1,
            })) : undefined,
          }));
          setBookmarks(tocItems);
        }
      } catch (e) {
        console.log('Failed to parse bookmarks:', e);
      }
      setHasLoadedBookmarks(true);
    }).catch(() => {
      setHasLoadedBookmarks(true);
    });
  }, [bridge, isReady, hasLoadedBookmarks]);

  const currentTocData = bookmarks.length > 0 ? bookmarks : TOC_DATA;

  const bg = isDark ? '#1e2229' : '#E8EEF6';
  const border = isDark ? '#2a2d35' : '#d0d7e3';
  const tabBg = isDark ? '#252830' : '#ffffff';
  const tabActiveColor = '#409EFF';
  const tabInactiveColor = isDark ? '#6a6a8a' : '#777777';

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: bg }}>
      <div style={{ borderBottom: `1px solid ${border}`, paddingTop: 8 }}>
        <div className="flex px-2 gap-1">
          {(['toc', 'thumbnails'] as const).map((tab) => (
            <button
              key={tab}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-t transition-colors"
              style={{
                background: leftTab === tab ? tabBg : 'transparent',
                color: leftTab === tab ? tabActiveColor : tabInactiveColor,
                fontWeight: leftTab === tab ? 500 : 400,
                fontSize: '0.75rem',
                borderBottom: leftTab === tab ? `2px solid ${tabActiveColor}` : '2px solid transparent',
              }}
              onClick={() => onTabChange(tab)}
            >
              {tab === 'toc' ? <BookOpen size={12} /> : <LayoutGrid size={12} />}
              {tab === 'toc' ? '文档目录' : '页面预览'}
            </button>
          ))}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: isDark ? '#3a3d4a #1e2229' : '#c0cad8 #E8EEF6',
        }}
      >
        {leftTab === 'toc' ? (
          <div className="py-2 px-1">
            {currentTocData.map((item) => (
              <TOCNode
                key={item.id}
                item={item}
                isDark={isDark}
                currentPage={currentPage}
                onPageClick={onPageClick}
                shouldExpand={isItemAncestor(item, currentPage) || currentPage === item.page}
              />
            ))}
          </div>
        ) : (
          <div className="py-3 flex flex-col items-center">
            {totalPages > 0 && Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Thumbnail
                key={page}
                page={page}
                pdfDoc={pdfDoc}
                isActive={page === currentPage}
                isDark={isDark}
                onClick={() => onPageClick(page)}
              />
            ))}
            {totalPages === 0 && (
              <div style={{ color: isDark ? '#6a6a8a' : '#999', fontSize: 12, marginTop: 20 }}>
                请先打开PDF文件
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}