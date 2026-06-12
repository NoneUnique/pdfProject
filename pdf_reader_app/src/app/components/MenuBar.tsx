import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Eye,
  Edit3,
  Wrench,
  Settings,
  HelpCircle,
  ChevronRight,
  Check,
} from "lucide-react";

import type { ViewMode } from "../App";
import { useQtBridge, exportToText } from "../../hooks/useQtBridge";

interface MenuBarProps {
  isDark: boolean;
  onToggleDark: () => void;
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  onOpenSearch: () => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  leftOpen: boolean;
  rightOpen: boolean;
  onFileLoaded?: (path: string) => void;
}

interface MenuGroup {
  label: string;
  icon: React.ElementType;
  items: MenuItemData[];
}

interface MenuItemData {
  label: string;
  shortcut?: string;
  danger?: boolean;
  checked?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

const FONT_STYLE: React.CSSProperties = {
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
  textRendering: "optimizeLegibility",
};

function Divider({ isDark }: { isDark: boolean }) {
  return (
    <div
      style={{
        height: 1,
        margin: "6px 0",
        background: isDark ? "#343844" : "#e8edf5",
      }}
    />
  );
}

function MenuItem({
  item,
  isDark,
}: {
  item: MenuItemData;
  isDark: boolean;
}) {
  const text = isDark ? "#e2e8f0" : "#334155";
  const secondary = isDark ? "#8b98ad" : "#64748b";

  return (
    <button
      onClick={item.onClick}
      style={{
        width: "100%",
        height: "34px",
        border: "none",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 14px",
        cursor: "pointer",
        transition: "all .12s ease",
        borderRadius: "6px",
        color: item.danger ? "#ef4444" : text,
        ...FONT_STYLE,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isDark
          ? "#2d313c"
          : "#f1f5f9";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "13px",
          fontWeight: 500,
        }}
      >
        <div
          style={{
            width: 14,
            display: "flex",
            justifyContent: "center",
          }}
        >
          {item.checked && (
            <Check
              size={12}
              strokeWidth={3}
              color="#409EFF"
            />
          )}
        </div>

        <span>{item.label}</span>
      </div>

      {item.shortcut && (
        <span
          style={{
            fontSize: "11px",
            color: secondary,
            letterSpacing: ".02em",
          }}
        >
          {item.shortcut}
        </span>
      )}
    </button>
  );
}

function MenuDropdown({
  label,
  icon: Icon,
  items,
  isDark,
}: {
  label: string;
  icon: React.ElementType;
  items: MenuItemData[];
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const dropdownBg = isDark ? "#252a33" : "#ffffff";
  const dropdownBorder = isDark ? "#343844" : "#e2e8f0";

  const triggerText = isDark ? "#d5dbe7" : "#334155";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          height: "30px",
          border: "none",
          background: open
            ? isDark
              ? "#2b3442"
              : "#eaf3ff"
            : "transparent",
          color: open ? "#409EFF" : triggerText,
          padding: "0 12px",
          borderRadius: "7px",
          display: "flex",
          alignItems: "center",
          gap: "7px",
          cursor: "pointer",
          transition: "all .15s ease",
          fontSize: "13px",
          fontWeight: 550,
          letterSpacing: "-0.01em",
          ...FONT_STYLE,
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.background = isDark
              ? "#2a2d35"
              : "#f1f5f9";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = "transparent";
          }
        }}
      >
        <Icon size={14} strokeWidth={2.2} />
        {label}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: "240px",
            background: dropdownBg,
            border: `1px solid ${dropdownBorder}`,
            borderRadius: "12px",
            padding: "8px",
            zIndex: 999,
            backdropFilter: "blur(20px)",
            boxShadow: isDark
              ? "0 18px 50px rgba(0,0,0,.45)"
              : "0 18px 50px rgba(15,23,42,.08)",
          }}
        >
          {items.map((item, index) =>
            item.divider ? (
              <Divider
                key={index}
                isDark={isDark}
              />
            ) : (
              <MenuItem
                key={index}
                item={item}
                isDark={isDark}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

export function MenuBar({
  isDark,
  onToggleDark,
  viewMode,
  onViewMode,
  onOpenSearch,
  onToggleLeft,
  onToggleRight,
  leftOpen,
  rightOpen,
  onFileLoaded,
}: MenuBarProps) {
  const bg = isDark ? "#1d2128" : "#ffffff";
  const border = isDark ? "#2d313b" : "#e7edf5";
  const { bridge, isReady } = useQtBridge();

  const handleOpenFile = async () => {
    if (!bridge) return;
    const path = await bridge.openFileDialog();
    if (path) {
      onFileLoaded?.(path);
    }
  };

  const handleSave = async () => {
    if (!bridge) return;
    await bridge.saveFile();
  };

  const handleSaveAs = async () => {
    if (!bridge) return;
    await bridge.saveFileAs();
  };

  const handlePrint = () => {
    if (!bridge) return;
    bridge.printPdf();
  };

  const handleMergePdfs = async () => {
    if (!bridge) return;
    await bridge.mergePdfs();
  };

  const handleSplitPdf = async () => {
    if (!bridge) return;
    const pageStr = prompt("请输入页码范围（如 1-5）：");
    if (pageStr) {
      const [start, end] = pageStr.split("-").map((s) => parseInt(s.trim()));
      if (start && end) {
        await bridge.splitPdf(start, end);
      }
    }
  };

  const handleConvertToImages = async () => {
    if (!bridge) return;
    const paths = await bridge.convertToImages("png");
    if (paths) {
      const images = JSON.parse(paths);
      if (images.length > 0) {
        alert(`已转换 ${images.length} 张图片`);
      }
    }
  };

  const handleAddTextWatermark = async () => {
    if (!bridge) return;
    const text = prompt("请输入水印文字：");
    if (text) {
      await bridge.addTextWatermark(text, 30, 45, 48);
    }
  };

  const handleAddBookmark = async () => {
    if (!bridge) return;
    const title = prompt("请输入书签标题：");
    if (title) {
      const currentPage = await bridge.getCurrentPage();
      bridge.addBookmark(currentPage, title);
    }
  };

  const menus: MenuGroup[] = useMemo(
    () => [
      {
        label: "文件",
        icon: FileText,
        items: [
          {
            label: "打开文件...",
            shortcut: "Ctrl+O",
            onClick: handleOpenFile,
          },
          {
            label: "保存",
            shortcut: "Ctrl+S",
            onClick: handleSave,
          },
          {
            label: "另存为...",
            shortcut: "Ctrl+Shift+S",
            onClick: handleSaveAs,
          },
          {
            divider: true,
            label: "",
          },
          {
            label: "打印",
            shortcut: "Ctrl+P",
            onClick: handlePrint,
          },
          {
            divider: true,
            label: "",
          },
          {
            label: "退出",
            shortcut: "Alt+F4",
            danger: true,
            onClick: () => window.close(),
          },
        ],
      },

      {
        label: "视图",
        icon: Eye,
        items: [
          {
            label: "单页视图",
            checked: viewMode === "single",
            shortcut: "Ctrl+1",
            onClick: () => onViewMode("single"),
          },
          {
            label: "双页对开",
            checked: viewMode === "double",
            shortcut: "Ctrl+2",
            onClick: () => onViewMode("double"),
          },
          {
            label: "连续滚动",
            checked: viewMode === "continuous",
            shortcut: "Ctrl+3",
            onClick: () => onViewMode("continuous"),
          },
          {
            divider: true,
            label: "",
          },
          {
            label: "左侧栏",
            checked: leftOpen,
            onClick: onToggleLeft,
          },
          {
            label: "右侧面板",
            checked: rightOpen,
            onClick: onToggleRight,
          },
          {
            divider: true,
            label: "",
          },
          {
            label: isDark
              ? "切换浅色模式"
              : "切换深色模式",
            onClick: onToggleDark,
          },
        ],
      },

      {
        label: "编辑",
        icon: Edit3,
        items: [
          {
            label: "查找",
            shortcut: "Ctrl+F",
            onClick: onOpenSearch,
          },
          {
            label: "复制",
            shortcut: "Ctrl+C",
          },
          {
            label: "全选",
            shortcut: "Ctrl+A",
          },
          {
            divider: true,
            label: "",
          },
          {
            label: "添加书签",
            shortcut: "Ctrl+B",
            onClick: handleAddBookmark,
          },
          {
            label: "添加注释",
          },
        ],
      },

      {
        label: "工具",
        icon: Wrench,
        items: [
          {
            label: "PDF 合并",
            onClick: handleMergePdfs,
          },
          {
            label: "PDF 拆分",
            onClick: handleSplitPdf,
          },
          {
            label: "PDF 转图片",
            onClick: handleConvertToImages,
          },
          {
            label: "图片转 PDF",
          },
          {
            divider: true,
            label: "",
          },
          {
            label: "添加水印",
            onClick: handleAddTextWatermark,
          },
        ],
      },

      {
        label: "设置",
        icon: Settings,
        items: [
          {
            label: "界面主题",
          },
          {
            label: "默认阅读模式",
          },
          {
            label: "OCR 设置",
          },
          {
            label: "快捷键设置",
          },
        ],
      },

      {
        label: "帮助",
        icon: HelpCircle,
        items: [
          {
            label: "使用文档",
          },
          {
            label: "快捷键列表",
            shortcut: "F1",
          },
          {
            divider: true,
            label: "",
          },
          {
            label: "关于",
          },
        ],
      },
    ],
    [
      isDark,
      viewMode,
      leftOpen,
      rightOpen,
      onViewMode,
      onToggleLeft,
      onToggleRight,
      onToggleDark,
      onOpenSearch,
      bridge,
    ]
  );

  return (
    <div
      style={{
        width: "100%",
        height: "42px",
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        background: bg,
        borderBottom: `1px solid ${border}`,
        flexShrink: 0,
        boxSizing: "border-box",
        userSelect: "none",
        ...FONT_STYLE,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          paddingRight: "18px",
          marginRight: "14px",
          borderRight: `1px solid ${border}`,
        }}
      >
        <div
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "5px",
            background:
              "linear-gradient(135deg, #409EFF 0%, #66b1ff 100%)",
            boxShadow:
              "0 2px 8px rgba(64,158,255,.35)",
          }}
        />

        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#409EFF",
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
          }}
        >
          PDF Reader Pro
        </span>
      </div>

      {/* Menus */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          flex: 1,
        }}
      >
        {menus.map((menu) => (
          <MenuDropdown
            key={menu.label}
            label={menu.label}
            icon={menu.icon}
            items={menu.items}
            isDark={isDark}
          />
        ))}
      </div>

    </div>
  );
}