import "pathseg";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initTheme } from "./ui/theme";
import "@fontsource/vazirmatn/arabic-400.css";
import "@fontsource/vazirmatn/arabic-700.css";
import "@fontsource/noto-naskh-arabic/arabic-400.css";
import "@fontsource/noto-naskh-arabic/arabic-700.css";
import "./ui/family.css";
import "./ui/kashi.css";

initTheme();
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
