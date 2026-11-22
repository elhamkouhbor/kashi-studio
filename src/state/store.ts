// Application state outside React (useSyncExternalStore). The editor document lives in the KashiEditor;
// this store holds project identity, interface state and the autosave bookkeeping.
import { useSyncExternalStore } from "react";
import type { KashiEditor, SelectionInfo, LayerInfo } from "../editor/engine";

export type Pane = "library" | "stage" | "inspector";
export type View = "flat" | "ceramic" | "repeat";
export interface State {
  ready: boolean;
  projectId: string | null;
  name: string;
  dirty: boolean;
  savedAt: string | null;
  autosavedAt: string | null;
  designId?: string;
  referenceId?: string;
  pane: Pane;
  view: View;
  tab: "design" | "object" | "layers" | "tools" | "reference";
  selection: SelectionInfo;
  layers: LayerInfo[];
  tool: string;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  toast: string;
  confirm: { title: string; body: string; ok: string; resolve: (v: boolean) => void } | null;
  dialog: null | "export" | "projects" | "new" | "about-design";
  storage: "indexeddb" | "memory";
}

let state: State = {
  ready: false, projectId: null, name: "Untitled design", dirty: false, savedAt: null, autosavedAt: null, pane: "stage", view: "flat", tab: "design",
  selection: { count: 0, tags: [], isPath: false, isGroup: false }, layers: [], tool: "select", zoom: 1, canUndo: false, canRedo: false, toast: "", confirm: null, dialog: null, storage: "indexeddb",
};
const listeners = new Set<() => void>();
export const getState = () => state;
export function setState(patch: Partial<State>) { state = { ...state, ...patch }; for (const l of listeners) l(); }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function useStore<T>(sel: (s: State) => T): T { return useSyncExternalStore(subscribe, () => sel(state), () => sel(state)); }

let editor: KashiEditor | null = null;
export const getEditor = () => editor;
export const setEditor = (e: KashiEditor | null) => { editor = e; };

let toastTimer = 0;
export function toast(msg: string) {
  setState({ toast: msg });
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => setState({ toast: "" }), 2800);
}

/** A confirmation built into the page (window.confirm is not used). */
export function confirmAction(title: string, body: string, ok = "Continue"): Promise<boolean> {
  return new Promise((resolve) => setState({ confirm: { title, body, ok, resolve } }));
}
