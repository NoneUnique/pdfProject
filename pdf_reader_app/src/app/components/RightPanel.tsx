import { useState, useEffect } from "react";
import {
  ScanText, Download, Trash2, Highlighter, MessageSquare,
  Minus, Pen, Eraser, Layers, StopCircle, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useQtBridge } from "../../hooks/useQtBridge";
import { useOcrStore } from "../../stores/ocrStore";

export type AnnotationTool = 'highlight' | 'text' | 'line' | 'draw' | 'eraser' | null;
export type OcrStatus = 'idle' | 'running' | 'done' | 'error';

interface RightPanelProps {
  isDark: boolean;
  activeTool: AnnotationTool;
  onToolSelect: (tool: AnnotationTool) => void;
  ocrStatus: OcrStatus;
  ocrProgress: number;
  onStartOcr: () => void;
  onStopOcr: () => void;
}

interface Annotation {
  id: string;
  page: number;
  type: string;
  content: string;
  color: string;
}

function SectionLabel({ text, isDark }: { text: string; isDark: boolean }) {
  return (
    <div
      style={{
        fontSize: "11px",
        color: isDark ? "#5a5a7a" : "#9a9aaa",
        textTransform: "uppercase",
        letterSpacing: "0.09em",
        padding: "8px 0 4px",
        fontWeight: 600,
      }}
    >
      {text}
    </div>
  );
}

interface AnnotBtnProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  isDark: boolean;
  color?: string;
  danger?: boolean;
}

function AnnotBtn({ icon: Icon, label, active, onClick, isDark, color, danger }: AnnotBtnProps) {
  const [isHovered, setIsHovered] = useState(false);

  const activeBg = color || "#409EFF";
  const hoverBg = isDark ? "#252830" : "#eef3ff";
  const normalBorder = isDark ? "#2a2d35" : "#e0e7f0";
  const normalColor = danger ? "#ff4d4f" : (color && !active ? color : (isDark ? "#b0b0c0" : "#555555"));

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "8px",
        transition: "all 0.15s ease",
        gap: "6px",
        width: "100%",
        padding: "10px 4px",
        background: active ? activeBg : (isHovered ? hoverBg : "transparent"),
        color: active ? "#ffffff" : normalColor,
        border: `1px solid ${active ? activeBg : normalBorder}`,
        cursor: "pointer",
      }}
    >
      <Icon size={16} strokeWidth={1.8} />
      <span style={{ fontSize: "12px", lineHeight: 1 }}>{label}</span>
    </button>
  );
}

export function RightPanel({ isDark, activeTool, onToolSelect, ocrStatus, ocrProgress, onStartOcr, onStopOcr }: RightPanelProps) {
  const { bridge, isReady } = useQtBridge();
  const { result: ocrResult, reset: resetOcr } = useOcrStore();
  
  const [activeTab, setActiveTab] = useState<"ocr" | "annotate">("ocr");
  const [watermarkOpen, setWatermarkOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#FFE600");
  const [opacity, setOpacity] = useState(80);
  
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [watermarkOpacity, setWatermarkOpacity] = useState(30);
  const [watermarkAngle, setWatermarkAngle] = useState(45);

  const [ocrLang, setOcrLang] = useState("zh+en");
  const [ocrMode, setOcrMode] = useState("high");
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([
    { id: "1", page: 2, type: "高亮", content: "transformer-based architectures", color: "#FFE600" },
    { id: "2", page: 2, type: "备注", content: "重点: 注意力机制的关键作用", color: "#409EFF" },
    { id: "3", page: 3, type: "高亮", content: "research objectives", color: "#FF6B6B" },
  ]);

  const handleExportOcrText = async () => {
    if (!bridge || !isReady) return;
    try {
      const text = ocrResult || "识别结果将显示在这里...";
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ocr_result.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("导出失败:", e);
    }
  };

  const handleClearOcr = () => {
    resetOcr();
    onStopOcr();
  };

  const bg = isDark ? "#1e2229" : "#E8EEF6";
  const border = isDark ? "#2a2d35" : "#d0d7e3";
  const text = isDark ? "#d0d0e0" : "#333333";
  const secondary = isDark ? "#6a6a8a" : "#888888";
  const cardBg = isDark ? "#252830" : "#ffffff";
  const tabActiveColor = "#409EFF";
  const tabInactiveColor = isDark ? "#6a6a8a" : "#777777";
  const tabActiveBg = isDark ? "#252830" : "#ffffff";
  const inputBg = isDark ? "#1e2229" : "#f5f7fa";
  const inputBorder = isDark ? "#3a3d4a" : "#d0d7e3";

  const ANNOTATION_COLORS = ["#FFE600", "#FF6B6B", "#4ECDC4", "#45B7D1", "#409EFF", "#FF9500", "#A855F7", "#34C759"];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: bg }}>
      <div style={{ borderBottom: `1px solid ${border}`, paddingTop: "8px", paddingLeft: "8px", paddingRight: "8px" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["ocr", "annotate"] as const).map((tab) => (
            <button
              key={tab}
              style={{
                flex: 1,
                paddingTop: "8px",
                paddingBottom: "8px",
                borderTopLeftRadius: "4px",
                borderTopRightRadius: "4px",
                transition: "color 0.2s ease, background-color 0.2s ease",
                background: activeTab === tab ? tabActiveBg : "transparent",
                color: activeTab === tab ? tabActiveColor : tabInactiveColor,
                fontWeight: activeTab === tab ? 600 : 400,
                fontSize: "14px",
                borderBottom: activeTab === tab ? `2px solid ${tabActiveColor}` : "2px solid transparent",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                cursor: "pointer",
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "ocr" ? "OCR 识别" : "批注工具箱"}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{ 
          flex: 1, 
          overflowY: "auto", 
          padding: "12px",
          scrollbarWidth: "thin", 
          scrollbarColor: isDark ? "#3a3d4a #1e2229" : "#c0cad8 #E8EEF6" 
        }}
      >
        {activeTab === "ocr" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{ 
                borderRadius: "12px", 
                padding: "12px", 
                background: cardBg, 
                border: `1px solid ${isDark ? "#2a3840" : "#d8eaf8"}` 
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <AlertCircle size={15} style={{ color: "#ff9500" }} />
                <span style={{ fontSize: "14px", fontWeight: 600, color: text }}>扫描图片 PDF 已检测</span>
              </div>
              <p style={{ fontSize: "12px", color: secondary, lineHeight: 1.65, margin: 0 }}>
                当前文档为扫描图片版 PDF，建议执行 OCR 文字识别以启用全文搜索和文字复制功能。
              </p>
            </div>

            <div style={{ borderRadius: "12px", padding: "12px", display: "flex", flexDirection: "column", gap: "12px", background: cardBg, border: `1px solid ${border}` }}>
              <SectionLabel text="识别操作" isDark={isDark} />

              <button
                disabled={ocrStatus === "running"}
                onClick={ocrStatus === "idle" || ocrStatus === "done" ? onStartOcr : undefined}
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  paddingTop: "12px",
                  paddingBottom: "12px",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: ocrStatus === "running" ? "#4CAF50" : "#409EFF",
                  color: "#ffffff",
                  opacity: ocrStatus === "done" ? 0.75 : 1,
                  cursor: ocrStatus === "running" ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  border: "none"
                }}
              >
                {ocrStatus === "idle" && <><ScanText size={15} />一键全文 OCR 识别</>}
                {ocrStatus === "running" && <><ScanText size={15} />正在识别中...</>}
                {ocrStatus === "done" && <><CheckCircle2 size={15} />识别完成 ✓</>}
                {ocrStatus === "error" && <><AlertCircle size={15} />识别失败，重试</>}
              </button>

              {ocrStatus === "running" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ height: "6px", borderRadius: "9999px", overflow: "hidden", background: isDark ? "#2a2d35" : "#e0e7f0" }}>
                    <div
                      style={{ 
                        height: "100%", 
                        borderRadius: "9999px", 
                        transition: "all 0.3s ease", 
                        width: `${ocrProgress}%`, 
                        background: "linear-gradient(90deg, #409EFF, #66b1ff)" 
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "12px", color: secondary }}>处理进度 {ocrProgress}%</span>
                    <button
                      onClick={onStopOcr}
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "4px", 
                        borderRadius: "4px", 
                        padding: "4px 10px", 
                        transition: "colors 0.2s ease", 
                        fontSize: "12px", 
                        color: "#ff4d4f", 
                        background: isDark ? "#3a2020" : "#fff5f5", 
                        border: "1px solid #ffccc7",
                        cursor: "pointer"
                      }}
                    >
                      <StopCircle size={12} />终止
                    </button>
                  </div>
                </div>
              )}

              {ocrStatus === "done" && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleExportOcrText}
                    style={{ 
                      flex: 1, 
                      borderRadius: "8px", 
                      paddingTop: "8px", 
                      paddingBottom: "8px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: "4px", 
                      transition: "all 0.2s ease",
                      background: hoveredBtn === "export" ? (isDark ? "#1e3a60" : "#d0e8ff") : (isDark ? "#1a3050" : "#e0efff"), 
                      color: "#409EFF", 
                      border: "1px solid #99ccff", 
                      fontSize: "14px",
                      cursor: "pointer"
                    }}
                    onMouseEnter={() => setHoveredBtn("export")}
                    onMouseLeave={() => setHoveredBtn(null)}
                  >
                    <Download size={14} />导出文本
                  </button>
                  <button
                    onClick={handleClearOcr}
                    style={{ 
                      flex: 1, 
                      borderRadius: "8px", 
                      paddingTop: "8px", 
                      paddingBottom: "8px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: "4px", 
                      transition: "all 0.2s ease",
                      background: hoveredBtn === "clear" ? (isDark ? "#481520" : "#ffe8e8") : (isDark ? "#3a1020" : "#fff5f5"), 
                      color: "#ff4d4f", 
                      border: "1px solid #ffccc7", 
                      fontSize: "14px",
                      cursor: "pointer"
                    }}
                    onMouseEnter={() => setHoveredBtn("clear")}
                    onMouseLeave={() => setHoveredBtn(null)}
                  >
                    <Trash2 size={14} />清空
                  </button>
                </div>
              )}
            </div>

            <div style={{ borderRadius: "12px", padding: "12px", display: "flex", flexDirection: "column", gap: "10px", background: cardBg, border: `1px solid ${border}` }}>
              <SectionLabel text="识别设置" isDark={isDark} />
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { label: "识别语言", value: ocrLang, onChange: setOcrLang, options: [{ v: "zh+en", l: "中文 + English" }, { v: "zh", l: "仅中文" }, { v: "en", l: "仅 English" }] },
                  { label: "识别模式", value: ocrMode, onChange: setOcrMode, options: [{ v: "high", l: "高精度模式" }, { v: "fast", l: "快速模式" }] },
                ].map(({ label, value, onChange, options }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: text, flexShrink: 0 }}>{label}</span>
                    <select
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      style={{ 
                        background: inputBg, 
                        border: `1px solid ${inputBorder}`, 
                        color: text, 
                        borderRadius: "6px", 
                        padding: "4px 8px", 
                        fontSize: "14px", 
                        minWidth: 0, 
                        flex: 1,
                        cursor: "pointer"
                      }}
                    >
                      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderRadius: "12px", padding: "12px", background: cardBg, border: `1px solid ${border}` }}>
              <SectionLabel text="多线程状态" isDark={isDark} />
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { label: "识别线程", value: "4 核心并行", color: "#34c759" },
                  { label: "当前队列", value: "28 页待处理", color: secondary },
                  { label: "预计耗时", value: "约 18 秒", color: secondary },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: secondary }}>{label}</span>
                    <span style={{ fontSize: "12px", color, fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "annotate" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ borderRadius: "12px", padding: "12px", display: "flex", flexDirection: "column", gap: "10px", background: cardBg, border: `1px solid ${border}` }}>
              <SectionLabel text="批注工具" isDark={isDark} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" }}>
                <AnnotBtn icon={Highlighter} label="高亮" active={activeTool === "highlight"} onClick={() => onToolSelect(activeTool === "highlight" ? null : "highlight")} isDark={isDark} color="#f5a623" />
                <AnnotBtn icon={MessageSquare} label="备注" active={activeTool === "text"} onClick={() => onToolSelect(activeTool === "text" ? null : "text")} isDark={isDark} />
                <AnnotBtn icon={Minus} label="划线" active={activeTool === "line"} onClick={() => onToolSelect(activeTool === "line" ? null : "line")} isDark={isDark} />
                <AnnotBtn icon={Pen} label="涂鸦" active={activeTool === "draw"} onClick={() => onToolSelect(activeTool === "draw" ? null : "draw")} isDark={isDark} />
                <AnnotBtn icon={Eraser} label="橡皮" active={activeTool === "eraser"} onClick={() => onToolSelect(activeTool === "eraser" ? null : "eraser")} isDark={isDark} />
                <AnnotBtn icon={Trash2} label="清除" active={false} onClick={() => onToolSelect(null)} isDark={isDark} danger />
              </div>

              {activeTool && (
                <div
                  style={{ borderRadius: "8px", padding: "10px", textAlign: "center", background: isDark ? "#1a3050" : "#e0efff", border: "1px solid #99ccff" }}
                >
                  <span style={{ fontSize: "14px", color: "#409EFF" }}>
                    ✏️ 当前工具: {
                      activeTool === "highlight" ? "文字高亮 — 拖动选区" :
                        activeTool === "text" ? "文字备注 — 点击插入" :
                          activeTool === "line" ? "直线标注 — 拖动绘制" :
                            activeTool === "draw" ? "手绘涂鸦 — 自由绘制" :
                              "橡皮擦 — 点击擦除"
                    }
                  </span>
                </div>
              )}
            </div>

            <div style={{ borderRadius: "12px", padding: "12px", background: cardBg, border: `1px solid ${border}` }}>
              <SectionLabel text="标注颜色" isDark={isDark} />
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", padding: "4px 0" }}>
                {ANNOTATION_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "9999px",
                      transition: "transform 0.1s ease",
                      background: color,
                      border: selectedColor === color ? "2px solid #409EFF" : "2px solid rgba(0,0,0,0.12)",
                      outline: selectedColor === color ? "2px solid rgba(64,158,255,0.3)" : "none",
                      cursor: "pointer"
                    }}
                    title={color}
                  />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
                <span style={{ fontSize: "14px", color: secondary }}>不透明度</span>
                <input
                  type="range" min="20" max="100" 
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  style={{ flex: 1, height: 4, accentColor: "#409EFF", cursor: "pointer" }}
                />
                <span style={{ fontSize: "14px", color: secondary, minWidth: "36px" }}>{opacity}%</span>
              </div>
            </div>

            <div style={{ borderRadius: "12px", padding: "12px", background: cardBg, border: `1px solid ${border}` }}>
              <SectionLabel text="水印" isDark={isDark} />
              <button
                onClick={() => setWatermarkOpen((o) => !o)}
                onMouseEnter={() => setHoveredBtn("watermarkTgl")}
                onMouseLeave={() => setHoveredBtn(null)}
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  paddingTop: "10px",
                  paddingBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s ease",
                  fontSize: "14px",
                  fontWeight: 500,
                  background: watermarkOpen ? "#409EFF" : (hoveredBtn === "watermarkTgl" ? (isDark ? "#252830" : "#e0efff") : (isDark ? "#1e2229" : "#f0f5ff")),
                  color: watermarkOpen ? "#ffffff" : "#409EFF",
                  border: `1px solid ${watermarkOpen ? "#409EFF" : "#99ccff"}`,
                  cursor: "pointer"
                }}
              >
                <Layers size={14} />
                {watermarkOpen ? "水印已启用" : "添加文字水印"}
              </button>

              {watermarkOpen && (
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="水印文字..."
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: inputBg,
                      border: `1px solid ${inputBorder}`,
                      color: text,
                      borderRadius: "6px",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
                    {[
                      { label: "透明度", min: 10, max: 100, value: watermarkOpacity, onChange: setWatermarkOpacity, unit: "%" },
                      { label: "角度", min: -90, max: 90, value: watermarkAngle, onChange: setWatermarkAngle, unit: "°" },
                    ].map(({ label, min, max, value, onChange, unit }) => (
                      <div key={label}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontSize: "12px", color: secondary }}>{label}</span>
                          <span style={{ fontSize: "12px", color: secondary }}>{value}{unit}</span>
                        </div>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          value={value}
                          onChange={(e) => onChange(Number(e.target.value))}
                          style={{ width: "100%", height: 4, accentColor: "#409EFF", cursor: "pointer" }}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onMouseEnter={() => setHoveredBtn("watermarkApply")}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{ 
                      width: "100%", 
                      borderRadius: "8px", 
                      paddingTop: "8px", 
                      paddingBottom: "8px", 
                      transition: "background-color 0.2s ease",
                      background: hoveredBtn === "watermarkApply" ? "#66b1ff" : "#409EFF", 
                      color: "#ffffff", 
                      fontSize: "14px",
                      fontWeight: 500,
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    应用水印到全文档
                  </button>
                </div>
              )}
            </div>

            <div style={{ borderRadius: "12px", padding: "12px", background: cardBg, border: `1px solid ${border}` }}>
              <SectionLabel text="批注记录" isDark={isDark} />
              {annotations.map((ann) => (
                <div
                  key={ann.id}
                  style={{ 
                    display: "flex", 
                    alignItems: "start", 
                    gap: "8px", 
                    paddingTop: "8px", 
                    paddingBottom: "8px", 
                    borderBottom: `1px solid ${isDark ? "#2a2d35" : "#f0f0f0"}` 
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: ann.color, flexShrink: 0, marginTop: "5px" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", color: secondary }}>第 {ann.page} 页 · {ann.type}</div>
                    <div 
                      style={{ 
                        fontSize: "14px", 
                        color: text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: "2px"
                      }}
                    >
                      {ann.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}