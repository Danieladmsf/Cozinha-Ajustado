// Utilitário para gerenciar logs do console em desenvolvimento
export const setupConsoleFilters = () => {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
    return;
  }

  // Salvar referências originais
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  // Lista de padrões de mensagens a serem filtradas
  const filteredPatterns = [
    /Failed to load resource.*googletagmanager/,
    /Failed to load resource.*vsda/,
    /Failed to load resource.*favicon\.ico/,
    /Potential permissions policy violation/,
    /Failed to fetch RSC payload/,
    /\[Violation\]/,
    /\[Vercel Speed Insights\]/,
    /content script loaded/i,
    /Creating a socket/,
    /Resolved connection token/,
    /\[Fast Refresh\]/,
    /Download the React DevTools/,
    /react-devtools/,
    /Missing.*Description.*aria-describedby.*DialogContent/
  ];

  // Função helper para verificar se deve filtrar
  const shouldFilter = (args) => {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : 
      typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : 
      String(arg)
    ).join(' ');
    
    return filteredPatterns.some(pattern => pattern.test(message));
  };

  // Interceptar console.error
  console.error = (...args) => {
    if (!shouldFilter(args)) {
      originalError.apply(console, args);
    }
  };

  // Interceptar console.warn
  console.warn = (...args) => {
    if (!shouldFilter(args)) {
      originalWarn.apply(console, args);
    }
  };

  // Interceptar console.log para filtrar logs específicos
  console.log = (...args) => {
    if (!shouldFilter(args)) {
      originalLog.apply(console, args);
    }
  };

  // Armazenar originais para possível restauração
  window.__originalConsole = {
    error: originalError,
    warn: originalWarn,
    log: originalLog
  };
};

// Função para restaurar console original (útil para debug)
export const restoreConsole = () => {
  if (typeof window !== 'undefined' && window.__originalConsole) {
    console.error = window.__originalConsole.error;
    console.warn = window.__originalConsole.warn;
    console.log = window.__originalConsole.log;
    delete window.__originalConsole;
  }
};