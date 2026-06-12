import type { OcrStatus } from "../App";

interface StatusBarProps {
  isDark: boolean;
  currentPage: number;
  totalPages: number;
  zoomLevel: number;
  fileSize: string;
  ocrStatus: OcrStatus;
  ocrProgress: number;
  fileName: string;
}

function Dot({ color }: { color: string }) {
  return <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />;
}

function Sep({ isDark }: { isDark: boolean }) {
  return <div style={{ width: 1, height: 12, background: isDark ? "#2a2d35" : "#d8e0ee" }} />;
}

export function StatusBar({ isDark, currentPage, totalPages, zoomLevel, fileSize, ocrStatus, ocrProgress, fileName }: StatusBarProps) {
  const bg = isDark ? "#1e2229" : "#ffffff";
  const border = isDark ? "#2a2d35" : "#e0e7f0";
  const dim = isDark ? "#6a6a8a" : "#888888";
  const highlight = isDark ? "#d0d0e0" : "#333333";

  return (
    <div
      className="flex items-center px-4 gap-3 shrink-0"
      style={{ background: bg, borderTop: `1px solid ${border}`, height: 26, fontSize: "0.67rem", color: dim }}
    >
      <div className="flex items-center gap-1.5">
        <Dot color={ocrStatus === "running" ? "#409EFF" : "#34c759"} />
        <span>{ocrStatus === "running" ? "OCR 识别运行中" : "已就绪"}</span>
      </div>

      <Sep isDark={isDark} />

      <span className="truncate" style={{ maxWidth: 180, color: highlight }}>
        {fileName}
      </span>

      <Sep isDark={isDark} />

      <span>
        页面&nbsp;
        <span style={{ color: "#409EFF", fontWeight: 600 }}>{currentPage}</span>
        &nbsp;/&nbsp;{totalPages}
      </span>

      <Sep isDark={isDark} />

      <span>
        缩放&nbsp;<span style={{ color: highlight, fontWeight: 500 }}>{zoomLevel}%</span>
      </span>

      <Sep isDark={isDark} />

      <span>大小&nbsp;<span style={{ color: highlight }}>{fileSize}</span></span>

      {ocrStatus !== "idle" && (
        <>
          <Sep isDark={isDark} />
          <div className="flex items-center gap-1.5">
            {ocrStatus === "running" && <Dot color="#409EFF" />}
            <span>
              OCR:&nbsp;
              {ocrStatus === "running"
                ? <span style={{ color: "#409EFF", fontWeight: 500 }}>识别中 {ocrProgress}%</span>
                : <span style={{ color: "#34c759", fontWeight: 500 }}>识别完成</span>
              }
            </span>
          </div>
        </>
      )}

      <div className="flex-1" />

      <span>内存&nbsp;<span style={{ color: highlight }}>128 MB</span></span>

      <Sep isDark={isDark} />

      <span style={{ color: "#409EFF", fontWeight: 500 }}>PDF Reader Pro v2.4</span>
    </div>
  );
}
