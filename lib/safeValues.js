/**
 * Funções utilitárias para conversão segura de valores
 */

/**
 * Converte um valor para string de forma segura
 * @param {*} value - Valor a ser convertido
 * @returns {string} String vazia se inválido, ou o valor convertido
 */
export function safeString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'null' || lower === 'undefined') return '';
  }
  return String(value).trim();
}

/**
 * Converte um valor para número de forma segura
 * @param {*} value - Valor a ser convertido
 * @returns {string} String vazia se inválido, ou o número como string
 */
export function safeNumber(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'null' || lower === 'undefined' || value.trim() === '') return '';
  }
  const num = parseFloat(value);
  return isNaN(num) ? '' : num.toString();
}

/**
 * Converte um valor para número float de forma segura
 * @param {*} value - Valor a ser convertido
 * @param {number} defaultValue - Valor padrão se conversão falhar
 * @returns {number} Número convertido ou valor padrão
 */
export function safeFloat(value, defaultValue = 0) {
  const num = parseFloat(value);
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
}

/**
 * Converte um valor para número inteiro de forma segura
 * @param {*} value - Valor a ser convertido
 * @param {number} defaultValue - Valor padrão se conversão falhar
 * @returns {number} Número convertido ou valor padrão
 */
export function safeInt(value, defaultValue = 0) {
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Converte um valor para booleano de forma segura
 * @param {*} value - Valor a ser convertido
 * @param {boolean} defaultValue - Valor padrão se conversão falhar
 * @returns {boolean} Booleano convertido ou valor padrão
 */
export function safeBool(value, defaultValue = false) {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return defaultValue;
}

/**
 * Converte um valor para array de forma segura
 * @param {*} value - Valor a ser convertido
 * @returns {Array} Array vazio se inválido, ou o valor convertido
 */
export function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

/**
 * Converte um valor para objeto de forma segura
 * @param {*} value - Valor a ser convertido
 * @returns {Object} Objeto vazio se inválido, ou o valor convertido
 */
export function safeObject(value) {
  if (value === null || value === undefined) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  return {};
}
