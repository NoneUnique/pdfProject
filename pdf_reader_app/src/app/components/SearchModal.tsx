import { useEffect, useRef, useState } from "react";
import { Search, X, ChevronUp, ChevronDown, CaseSensitive, Regex, ArrowRight } from "lucide-react";
import { useQtBridge } from "../../hooks/useQtBridge";

interface SearchModalProps {
  isDark: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  onGoToPage: (page: number) => void;
  searchResults: { page: number; text: string }[];
}

export function SearchModal({ isDark, query, onQueryChange, onClose, onGoToPage, searchResults }: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentResult, setCurrentResult] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const { bridge, isReady } = useQtBridge();

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setCurrentResult(0); }, [query]);

  useEffect(() => {
    if (!bridge || !isReady || !query.trim()) return;
    
    const debounce = setTimeout(() => {
      bridge.searchPdf(query);
    }, 300);
    
    return () => clearTimeout(debounce);
  }, [query, bridge, isReady]);

  const resultCount = searchResults.length;
  const hasResults = query.length > 0 && resultCount > 0;
  const noResults = query.length > 0 && resultCount === 0;

  const bg = isDark ? "#252830" : "#ffffff";
  const border = isDark ? "#3a3d4a" : "#d0d7e3";
  const text = isDark ? "#e0e0e8" : "#333333";
  const secondary = isDark ? "#8888a0" : "#888888";
  const shadow = isDark ? "0 8px 32px rgba(0,0,0,0.6)" : "0 8px 32px rgba(0,0,0,0.16)";
  const toggleActive = "#409EFF";
  const toggleInactive = isDark ? "#3a3d4a" : "#e0e7f0";
  const toggleActiveBg = isDark ? "#1a3050" : "#e0efff";
  const hoverBg = isDark ? "#2a2d35" : "#f0f5ff";

  const handlePrev = () => {
    if (currentResult > 0) {
      setCurrentResult(currentResult - 1);
      onGoToPage(searchResults[currentResult - 1].page);
    }
  };

  const handleNext = () => {
    if (currentResult < resultCount - 1) {
      setCurrentResult(currentResult + 1);
      onGoToPage(searchResults[currentResult + 1].page);
    }
  };

  return (
    <div
      className="fixed top-20 right-6 z-50 rounded-xl overflow-hidden"
      style={{ background: bg, border: `1px solid ${border}`, boxShadow: shadow, width: 380, maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Search size={14} style={{ color: secondary, flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="在文档中搜索..."
            className="flex-1 outline-none"
            style={{
              background: "transparent",
              color: text,
              fontSize: "0.85rem",
              userSelect: "text",
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && hasResults) {
                handleNext();
              }
            }}
          />
          {hasResults && (
            <span
              style={{
                fontSize: "0.68rem",
                color: "#409EFF",
                flexShrink: 0,
              }}
            >
              {currentResult + 1} / {resultCount}
            </span>
          )}
          <button
            onClick={onClose}
            className="rounded p-1 transition-colors flex-shrink-0"
            style={{ color: secondary }}
            onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={13} />
          </button>
        </div>

        <div
          className="flex items-center gap-2 mt-2 pt-2"
          style={{ borderTop: `1px solid ${isDark ? "#2a2d35" : "#f0f0f0"}` }}
        >
          <div className="flex gap-1">
            <button
              onClick={() => setCaseSensitive((v) => !v)}
              className="rounded px-2 py-0.5 flex items-center gap-1 transition-colors"
              style={{
                background: caseSensitive ? toggleActiveBg : "transparent",
                color: caseSensitive ? toggleActive : secondary,
                border: `1px solid ${caseSensitive ? toggleActive : toggleInactive}`,
                fontSize: "0.65rem",
              }}
              title="区分大小写"
            >
              <CaseSensitive size={12} />Aa
            </button>
            <button
              onClick={() => setUseRegex((v) => !v)}
              className="rounded px-2 py-0.5 flex items-center gap-1 transition-colors"
              style={{
                background: useRegex ? toggleActiveBg : "transparent",
                color: useRegex ? toggleActive : secondary,
                border: `1px solid ${useRegex ? toggleActive : toggleInactive}`,
                fontSize: "0.65rem",
              }}
              title="正则表达式"
            >
              <Regex size={12} />.*
            </button>
          </div>

          <div className="flex-1" />

          {hasResults && (
            <div className="flex gap-1">
              <button
                onClick={handlePrev}
                className="rounded p-1 transition-colors"
                style={{ color: secondary, border: `1px solid ${toggleInactive}` }}
                onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                disabled={currentResult <= 0}
              >
                <ChevronUp size={13} />
              </button>
              <button
                onClick={handleNext}
                className="rounded p-1 transition-colors"
                style={{ color: secondary, border: `1px solid ${toggleInactive}` }}
                onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                disabled={currentResult >= resultCount - 1}
              >
                <ChevronDown size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {hasResults && (
        <div className="border-t" style={{ borderTopColor: isDark ? "#2a2d35" : "#f0f0f0" }}>
          <div className="max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {searchResults.slice(0, 20).map((result, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentResult(index);
                  onGoToPage(result.page);
                }}
                className="w-full p-3 text-left transition-colors flex items-center gap-3"
                style={{
                  background: currentResult === index ? (isDark ? "#1a3050" : "#e0efff") : "transparent",
                  borderBottom: `1px solid ${isDark ? "#2a2d35" : "#f0f0f0"}`,
                }}
                onMouseEnter={(e) => {
                  if (currentResult !== index) {
                    (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentResult !== index) {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 4,
                    background: currentResult === index ? "#409EFF" : (isDark ? "#2a2d35" : "#e0e7f0"),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 11, color: currentResult === index ? "#fff" : secondary }}>
                    {result.page}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 11, color: secondary, marginBottom: 2 }}>第 {result.page} 页</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: text,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {result.text || "..."}
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: currentResult === index ? "#409EFF" : "transparent", flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {noResults && (
        <div
          className="border-t p-4 text-center"
          style={{ borderTopColor: isDark ? "#2a2d35" : "#f0f0f0" }}
        >
          <span style={{ fontSize: "0.75rem", color: "#ff4d4f" }}>
            未找到 "{query}" 的匹配结果
          </span>
        </div>
      )}

      {!query && (
        <div
          className="border-t p-4"
          style={{ borderTopColor: isDark ? "#2a2d35" : "#f0f0f0" }}
        >
          <div style={{ fontSize: 12, color: secondary, lineHeight: 1.6 }}>
            <div className="font-medium text" style={{ marginBottom: 4 }}>搜索提示</div>
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              <li>按 Enter 键跳转到第一个匹配</li>
              <li>使用上下箭头导航结果</li>
              <li>匹配内容将以橙黄色高亮显示</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}