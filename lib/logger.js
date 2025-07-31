import { ENV_CONFIG } from './constants.js';

/**
 * Logger condicional que só executa em desenvolvimento
 * Em produção, os logs são silenciados automaticamente
 */
export const logger = {
  log: (...args) => {
    if (ENV_CONFIG.IS_DEVELOPMENT) {
      console.log(...args);
    }
  },
  
  info: (...args) => {
    if (ENV_CONFIG.IS_DEVELOPMENT) {
      console.info(...args);
    }
  },
  
  warn: (...args) => {
    if (ENV_CONFIG.IS_DEVELOPMENT) {
      console.warn(...args);
    }
  },
  
  error: (...args) => {
    // Erros sempre devem ser mostrados, mesmo em produção
    console.error(...args);
  },
  
  debug: (...args) => {
    if (ENV_CONFIG.IS_DEVELOPMENT) {
      console.debug('[DEBUG]', ...args);
    }
  }
};

// Função para debug específico de componentes
export const componentLogger = (componentName) => ({
  log: (...args) => logger.debug(`[${componentName}]`, ...args),
  info: (...args) => logger.info(`[${componentName}]`, ...args),
  warn: (...args) => logger.warn(`[${componentName}]`, ...args),
  error: (...args) => logger.error(`[${componentName}]`, ...args)
});