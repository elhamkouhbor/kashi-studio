// Local storage in IndexedDB (this browser only, no accounts, no network). Projects keep their SVG as a
// string in IndexedDB, never in localStorage. Falls back to memory when IndexedDB is unavailable.
//   kv:        "current" -> autosaved working copy, "prefs" -> view preferences
//   projects:  saved projects { id, name, svg, meta, thumb, createdAt, updatedAt }
import type { DocMeta } from "../editor/document";

const DB = "kashi-studio", VERSION = 1;
export interface Project { id: string; name: string; svg: string; meta: DocMeta; thumb?: string; createdAt: string; updatedAt: string; designId?: string }
export interface WorkingCopy { projectId: string | null; name: string; svg: string; meta: DocMeta; savedAt: string; dirty: boolean }

let dbp: Promise<IDBDatabase | null> | null = null;
const memory = { kv: new Map<string, unknown>(), projects: new Map<string, Project>() };

function open(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
        if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbp;
}
export async function storageMode(): Promise<"indexeddb" | "memory"> { return (await open()) ? "indexeddb" : "memory"; }

function run<T>(store: "kv" | "projects", mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return open().then((db) => new Promise<T | undefined>((resolve, reject) => {
    if (!db) return resolve(undefined);
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export async function getKv<T>(key: string): Promise<T | undefined> {
  if (!(await open())) return memory.kv.get(key) as T | undefined;
  return run<T>("kv", "readonly", (s) => s.get(key) as IDBRequest<T>);
}
export async function setKv(key: string, value: unknown): Promise<void> {
  if (!(await open())) { memory.kv.set(key, value); return; }
  await run("kv", "readwrite", (s) => { s.put(value, key); });
}

export async function listProjects(): Promise<Project[]> {
  const all = (await open()) ? ((await run<Project[]>("projects", "readonly", (s) => s.getAll() as IDBRequest<Project[]>)) ?? []) : [...memory.projects.values()];
  return all.filter(isProject).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function getProject(id: string): Promise<Project | undefined> {
  const p = (await open()) ? await run<Project>("projects", "readonly", (s) => s.get(id) as IDBRequest<Project>) : memory.projects.get(id);
  return p && isProject(p) ? p : undefined;
}
export async function putProject(p: Project): Promise<void> {
  if (!(await open())) { memory.projects.set(p.id, p); return; }
  await run("projects", "readwrite", (s) => { s.put(p); });
}
export async function deleteProject(id: string): Promise<void> {
  if (!(await open())) { memory.projects.delete(id); return; }
  await run("projects", "readwrite", (s) => { s.delete(id); });
}

export function isProject(p: unknown): p is Project {
  const x = p as Project;
  return !!x && typeof x.id === "string" && typeof x.name === "string" && typeof x.svg === "string" && !!x.meta && typeof x.meta.w === "number" && typeof x.updatedAt === "string";
}
export const newId = () => `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ---------- portable project file
export const PROJECT_FORMAT = "kashi-studio/project";
export function projectFile(p: Pick<Project, "name" | "svg" | "meta" | "designId">): string {
  return JSON.stringify({ format: PROJECT_FORMAT, version: 1, savedAt: new Date().toISOString(), name: p.name, meta: p.meta, designId: p.designId, svg: p.svg }, null, 1);
}
/** Read a project file. Throws English messages. The SVG is sanitised by the caller before use. */
export function readProjectFile(text: string): { name: string; meta: DocMeta; svg: string; designId?: string } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error("This file is not a valid project file (not JSON)."); }
  const r = raw as { format?: string; name?: unknown; meta?: DocMeta; svg?: unknown; designId?: unknown };
  if (!r || r.format !== PROJECT_FORMAT) throw new Error("This is not a Kashi Studio project file.");
  if (typeof r.svg !== "string" || !r.meta || typeof r.meta.w !== "number" || typeof r.meta.h !== "number") throw new Error("The project file is incomplete.");
  const meta: DocMeta = { w: r.meta.w, h: r.meta.h, tile: r.meta.tile && typeof r.meta.tile.w === "number" ? r.meta.tile : { w: r.meta.w, h: r.meta.h }, units: r.meta.units === "cm" ? "cm" : "mm", guides: { x: (r.meta.guides?.x ?? []).filter(Number.isFinite), y: (r.meta.guides?.y ?? []).filter(Number.isFinite) }, designId: typeof r.meta.designId === "string" ? r.meta.designId : undefined, referenceId: typeof r.meta.referenceId === "string" ? r.meta.referenceId : undefined };
  return { name: typeof r.name === "string" ? r.name.slice(0, 120) : "Imported project", meta, svg: r.svg, designId: typeof r.designId === "string" ? r.designId : undefined };
}
