import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}

export const ACENTOS = [
  { id: 'blue', nome: 'Azul', cor: '#2563eb' },
  { id: 'red', nome: 'Vermelho', cor: '#dc2626' },
  { id: 'green', nome: 'Verde', cor: '#16a34a' },
  { id: 'violet', nome: 'Roxo', cor: '#7c3aed' },
  { id: 'orange', nome: 'Laranja', cor: '#ea580c' },
  { id: 'pink', nome: 'Rosa', cor: '#db2777' },
];

function getAcentoInicial() {
  const salvo = localStorage.getItem('gymflow_accent');
  return ACENTOS.some(a => a.id === salvo) ? salvo : 'blue';
}

function getTemaInicial() {
  const salvo = localStorage.getItem('theme');
  if (salvo === 'light' || salvo === 'dark') return salvo;
  // Sem preferência salva: segue a preferência do sistema operacional
  const prefereClaro = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  return prefereClaro ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getTemaInicial);
  const [accent, setAccent] = useState(getAcentoInicial);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
    localStorage.setItem('gymflow_accent', accent);
  }, [accent]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}
