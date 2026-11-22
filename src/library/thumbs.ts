// Lazy thumbnails: requested when a card scrolls into view, generated in a worker, cached as blob URLs.
const cache = new Map<string, string>();
const waiting = new Map<string, ((url: string) => void)[]>();
let worker: Worker | null = null;
function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./thumbs.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<{ id: string; svg?: string }>) => {
    const { id, svg } = e.data;
    const url = svg ? URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })) : "";
    cache.set(id, url);
    for (const cb of waiting.get(id) ?? []) cb(url);
    waiting.delete(id);
  };
  return worker;
}
export function thumbnail(id: string, cb: (url: string) => void) {
  const hit = cache.get(id);
  if (hit !== undefined) { cb(hit); return; }
  if (waiting.has(id)) { waiting.get(id)!.push(cb); return; }
  waiting.set(id, [cb]);
  getWorker().postMessage({ id });
}
