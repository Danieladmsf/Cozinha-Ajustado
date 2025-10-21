import { APP_CONSTANTS } from './constants.js';

/**
 * Trunca texto se exceder o comprimento máximo
 * @param {string} text - Texto a ser truncado
 * @param {number} maxLength - Comprimento máximo (padrão: 30)
 * @returns {string} Texto truncado
 */
export const truncateText = (text, maxLength = APP_CONSTANTS.DEFAULT_TEXT_TRUNCATE_LENGTH) => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

/**
 * Formata nome de receita de forma consistente
 * @param {string} recipeName - Nome da receita
 * @param {number} maxLength - Comprimento máximo
 * @returns {string} Nome formatado
 */
export const formatRecipeName = (recipeName, maxLength = APP_CONSTANTS.DEFAULT_TEXT_TRUNCATE_LENGTH) => {
  if (!recipeName) return "";
  return truncateText(recipeName.trim(), maxLength);
};

/**
 * Renderiza nome de receita formatado para JSX (manter compatibilidade)
 * @param {string} name - Nome da receita
 * @returns {JSX.Element} Elemento JSX formatado
 */
export const renderFormattedRecipeName = (name) => {
  if (!name) return "";
  return truncateText(name, 35);
};