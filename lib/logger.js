import { ENV_CONFIG } from './constants.js';

/**
 * Logger condicional que só executa em desenvolvimento
 * Em produção, os logs são silenciados automaticamente
 */
export const logger = {
  log: (...args) => {
    // Removed console.log for production cleanup
  },
  
  info: (...args) => {
    // Removed console.info for production cleanup
  },
  
  warn: (...args) => {
    // Removed console.warn for production cleanup
  },
  
  error: (...args) => {
    // Erros sempre devem ser mostrados, mesmo em produção
    console.error(...args);
  },
  
  debug: (...args) => {
    // Removed console.debug for production cleanup
  }
};

// Função para debug específico de componentes
export const componentLogger = (componentName) => ({
  log: (...args) => logger.debug(`[${componentName}]`, ...args),
  info: (...args) => logger.info(`[${componentName}]`, ...args),
  warn: (...args) => logger.warn(`[${componentName}]`, ...args),
  error: (...args) => logger.error(`[${componentName}]`, ...args)
});