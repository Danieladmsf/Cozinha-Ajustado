// Constantes centralizadas do projeto
export const APP_CONSTANTS = {
  // Usuário mock para desenvolvimento
  MOCK_USER_ID: 'mock-user-id',
  
  // Configurações de menu
  DEFAULT_AVAILABLE_DAYS: [1, 2, 3, 4, 5],
  
  // Configurações de texto
  DEFAULT_TEXT_TRUNCATE_LENGTH: 30,
  
  // Dias da semana
  DAY_NAMES: {
    1: "Segunda-feira",
    2: "Terça-feira", 
    3: "Quarta-feira",
    4: "Quinta-feira",
    5: "Sexta-feira"
  },
  
  // Paleta de cores para categorias
  COLOR_PALETTE: [
    "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5",
    "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50",
    "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800",
    "#ff5722", "#795548", "#9e9e9e", "#607d8b", "#000000"
  ]
};

// Configurações de ambiente
export const ENV_CONFIG = {
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production'
};

// Configurações de formatação
export const FORMAT_CONFIG = {
  CURRENCY: {
    LOCALE: 'pt-BR',
    CURRENCY: 'BRL'
  }
};