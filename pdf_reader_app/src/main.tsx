import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "pdfjs-dist/web/pdf_viewer.css";
import "./styles/index.css";
// 仅在开发环境下加载 vConsole
if (process.env.NODE_ENV === "development") {
  import("vconsole").then(({ default: VConsole }) => {
    new VConsole();
    console.log("vConsole 已启动，手机端可见绿色按钮");
  });
}
createRoot(document.getElementById("root")!).render(<App />);
