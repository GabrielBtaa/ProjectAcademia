import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../lib/api';

const ViewModeContext = createContext();

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) throw new Error('useViewMode deve ser usado dentro de um ViewModeProvider');
  return context;
}

// O modo (administrador/recepcionista) vem de dentro do token de login, que o servidor assina.
// Assim não adianta editar o navegador: o servidor também recusa as ações restritas.
function modoDoToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return 'admin';
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload.modo === 'recepcionista' ? 'recepcionista' : 'admin';
  } catch {
    return 'admin';
  }
}

export function ViewModeProvider({ children }) {
  const [viewMode, setViewMode] = useState(modoDoToken);

  // Login/logout e troca de modo avisam por este evento
  useEffect(() => {
    const atualizar = () => setViewMode(modoDoToken());
    window.addEventListener('gymflow:token-changed', atualizar);
    window.addEventListener('storage', atualizar);
    return () => {
      window.removeEventListener('gymflow:token-changed', atualizar);
      window.removeEventListener('storage', atualizar);
    };
  }, []);

  const trocarModo = useCallback(async (caminho, corpo) => {
    const token = localStorage.getItem('token');
    const res = await fetch(apiUrl(caminho), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(corpo || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Não foi possível trocar de modo');
    localStorage.setItem('token', data.token);
    setViewMode(data.modo);
    window.dispatchEvent(new Event('gymflow:token-changed'));
  }, []);

  const entrarModoRecepcionista = useCallback(() => trocarModo('/api/modo/recepcionista'), [trocarModo]);
  const voltarModoAdmin = useCallback((senha) => trocarModo('/api/modo/admin', { pin: senha }), [trocarModo]);

  return (
    <ViewModeContext.Provider value={{ viewMode, entrarModoRecepcionista, voltarModoAdmin, isRecepcionista: viewMode === 'recepcionista' }}>
      {children}
    </ViewModeContext.Provider>
  );
}
