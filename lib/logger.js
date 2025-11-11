/**
 * Logger condicional que só executa em desenvolvimento
 * Em produção, os logs são silenciados automaticamente
 */

const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log('[LOG]', ...args);
    }
  },

  info: (...args) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },

  error: (...args) => {
    // Erros sempre devem ser mostrados, mesmo em produção
    console.error('[ERROR]', ...args);
  },

  debug: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  time: (label) => {
    if (isDevelopment) {
      console.time(label);
    }
  },

  timeEnd: (label) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  },

  group: (label, fn) => {
    if (isDevelopment) {
      console.group(label);
      fn();
      console.groupEnd();
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