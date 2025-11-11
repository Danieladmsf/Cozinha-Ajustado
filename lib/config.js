/**
 * Configurações centralizadas da aplicação
 */

// Configurações de API
export const API_CONFIG = {
  TIMEOUT: 10000, // 10 segundos
  RETRY_ATTEMPTS: 3,
  RETRY_BASE_DELAY: 1000, // 1 segundo
};

// Configurações de Cache
export const CACHE_CONFIG = {
  INGREDIENTS_CACHE_KEY: 'ingredients_cache',
  INGREDIENTS_CACHE_TIMESTAMP_KEY: 'ingredients_cache_timestamp',
  CACHE_EXPIRY_TIME: 24 * 60 * 60 * 1000, // 24 horas
};

// Configurações de Ingredientes
export const INGREDIENT_CONFIG = {
  VALID_UNITS: ['kg', 'g', 'l', 'ml', 'unidade'],
  VALID_TYPES: ['traditional', 'commercial', 'both'],
  DEFAULT_UNIT: 'kg',
  DEFAULT_TYPE: 'both',
};

// Configurações de UI
export const UI_CONFIG = {
  ITEMS_PER_PAGE: 50,
  DEBOUNCE_DELAY: 300, // ms
  TOAST_DURATION: 3000, // ms
};

export default {
  API_CONFIG,
  CACHE_CONFIG,
  INGREDIENT_CONFIG,
  UI_CONFIG,
};
