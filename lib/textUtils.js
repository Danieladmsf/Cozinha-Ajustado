/**
 * Formata texto para capitalização correta
 * Converte tudo para minúscula e depois capitaliza cada palavra
 *
 * @param {string} text - Texto para formatar
 * @returns {string} - Texto formatado
 */
export function formatCapitalize(text) {
  if (!text) return text;

  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formata múltiplos textos para capitalização
 *
 * @param {string[]} texts - Array de textos
 * @returns {string[]} - Array de textos formatados
 */
export function formatCapitalizeMultiple(texts) {
  return texts.map(formatCapitalize);
}
