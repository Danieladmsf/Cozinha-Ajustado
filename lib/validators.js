/**
 * Funções de validação centralizadas
 */

/**
 * Valida se um ID é válido
 * @param {string} id - ID a ser validado
 * @returns {boolean} True se o ID for válido
 */
export function isValidId(id) {
  return (
    id &&
    typeof id === 'string' &&
    id.trim() !== '' &&
    id !== 'undefined' &&
    id !== 'null' &&
    !id.startsWith('temp-')
  );
}

/**
 * Valida se um preço é válido
 * @param {number|string} price - Preço a ser validado
 * @returns {boolean} True se o preço for válido
 */
export function isValidPrice(price) {
  const num = parseFloat(price);
  return !isNaN(num) && isFinite(num) && num >= 0;
}

/**
 * Valida se um email é válido
 * @param {string} email - Email a ser validado
 * @returns {boolean} True se o email for válido
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida se um objeto ingrediente tem os campos mínimos necessários
 * @param {object} ingredient - Ingrediente a ser validado
 * @returns {object} {valid: boolean, errors: string[]}
 */
export function validateIngredient(ingredient) {
  const errors = [];

  if (!ingredient) {
    errors.push('Ingrediente não pode ser nulo');
    return { valid: false, errors };
  }

  if (!ingredient.name || ingredient.name.trim() === '') {
    errors.push('Nome é obrigatório');
  }

  if (!ingredient.unit || ingredient.unit.trim() === '') {
    errors.push('Unidade é obrigatória');
  }

  if (ingredient.current_price !== undefined && !isValidPrice(ingredient.current_price)) {
    errors.push('Preço atual deve ser um número válido e não negativo');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
