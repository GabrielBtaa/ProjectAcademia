/** Base da API: vazio em dev (usa proxy /api do Vite). Em produção defina VITE_API_URL. */
export function apiUrl(path) {
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
