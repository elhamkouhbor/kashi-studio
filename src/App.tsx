// Tiny base-aware router: "/" is the workspace, "/about" the sources, method and licences page.
import { lazy, Suspense, useEffect, useState } from "react";
import { Workspace } from "./ui/Workspace";
import { TooltipLayer, HelpDialog } from "./ui/Help";

const AboutPage = lazy(() => import("./ui/AboutPage"));
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const route = () => (window.location.pathname.slice(BASE.length).replace(/\/$/, "") === "/about" ? "about" : "app");

export function navigate(path: "/" | "/about") {
  window.history.pushState(null, "", `${BASE}${path === "/" ? "/" : path}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function App() {
  const [page, setPage] = useState(route);
  useEffect(() => {
    const on = () => { setPage(route()); window.scrollTo(0, 0); };
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  return (
    <>
      {/* the workspace stays mounted under the about page so the document is never lost */}
      <div hidden={page === "about"} className="app-root"><Workspace /></div>
      {page === "about" && <Suspense fallback={null}><AboutPage /></Suspense>}
      <TooltipLayer />
      <HelpDialog />
    </>
  );
}
