import { APP_CONSTANTS } from './constants.js';

/**
 * Obtém o nome do dia da semana pelo índice
 * @param {number} dayIndex - Índice do dia (1-5)
 * @returns {string} Nome do dia da semana
 */
export const getDayName = (dayIndex) => {
  return APP_CONSTANTS.DAY_NAMES[dayIndex] || "";
};

/**
 * Formata data para exibição
 * @param {Date} date - Data a ser formatada
 * @returns {string} Data formatada
 */
export const formatDisplayDate = (date) => {
  if (!date) return "";
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
