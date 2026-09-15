import { createContext, useContext, useState, useEffect } from 'react';

const ViewModeContext = createContext();

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) throw new Error('useViewMode deve ser usado dentro de um ViewModeProvider');
  return context;
}

export function ViewModeProvider({ children }) {
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('viewMode') || 'admin');

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  const toggleViewMode = () => setViewMode(prev => (prev === 'admin' ? 'recepcionista' : 'admin'));

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, toggleViewMode, isRecepcionista: viewMode === 'recepcionista' }}>
      {children}
    </ViewModeContext.Provider>
  );
}
