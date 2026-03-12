const base = import.meta.env.VITE_BACKEND_URL;

/** Resolve a path (e.g. /uploads/xxx) to a full URL when backend is on another origin (e.g. Cloud Run). */
export function resolveBackendUrl(path: string): string {
  if (!path) return path;
  if (base && path.startsWith('/')) return `${base.replace(/\/$/, '')}${path}`;
  return path;
}
