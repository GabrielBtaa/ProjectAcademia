/** Base da API: vazio em dev (usa proxy /api do Vite). Em produção defina VITE_API_URL. */
export function apiUrl(path) {
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * fetch() que já injeta o token de autenticação (Bearer) automaticamente
 * e o header Content-Type quando há corpo JSON. Use para toda chamada à
 * API que não seja login/registro (essas continuam sem token, óbvio).
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(apiUrl(path), { ...options, headers });

  // Token ausente/expirado/inválido: desloga e manda para a tela de login
  if (response.status === 401 || response.status === 403) {
    const clonedBody = await response.clone().json().catch(() => ({}));
    const pareceProblemaDeToken = /token/i.test(clonedBody.error || '');
    if (pareceProblemaDeToken) {
      localStorage.removeItem('token');
      window.location.reload();
    }
  }

  return response;
}
