/**
 * Utilitários de formatação de nomes e textos
 */

/**
 * Formata o nome de uma receita para exibição, adicionando espaços e corrigindo casos específicos
 * @param {string} name - Nome original da receita
 * @returns {string} Nome formatado
 */
export function formatRecipeName(name) {
  if (!name) return '';

  // Adiciona espaço antes de letras maiúsculas (camelCase)
  let formatted = name.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Adiciona espaço antes de palavras específicas que ficam concatenadas
  formatted = formatted.replace(/([a-zà-ú])(Assada|Assado|Acebolada|Frita|Cremosa|Ralada|Cozidos)/gi, '$1 $2');

  // Corrige casos específicos conhecidos de receitas
  formatted = formatted.replace(/Molhobarbecue/gi, 'Molho barbecue');
  formatted = formatted.replace(/Panquecade/gi, 'Panqueca de');
  formatted = formatted.replace(/Macarrãomacand/gi, 'Macarrão mac and');
  formatted = formatted.replace(/macand\s*cheese/gi, 'mac and cheese');
  formatted = formatted.replace(/Batatabolinha/gi, 'Batata bolinha');
  formatted = formatted.replace(/bolinha\s*em\s*conserva/gi, 'bolinha em conserva');
  formatted = formatted.replace(/Farofade/gi, 'Farofa de');

  // Corrige nomes de pratos específicos
  formatted = formatted.replace(/Costelinha\s*Assada/gi, 'Costelinha Assada');
  formatted = formatted.replace(/Drumet\s*Assado/gi, 'Drumet Assado');
  formatted = formatted.replace(/Calabresa\s*Acebolada/gi, 'Calabresa Acebolada');
  formatted = formatted.replace(/Polenta\s*Frita/gi, 'Polenta Frita');
  formatted = formatted.replace(/Polenta\s*Cremosa/gi, 'Polenta Cremosa');
  formatted = formatted.replace(/Ovos\s*cozidos/gi, 'Ovos cozidos');

  // Corrige títulos de seções
  formatted = formatted.replace(/Porcionament\s*[oC]arnes/gi, 'Porcionamento Carnes');
  formatted = formatted.replace(/Cenoura\s*Ralada/gi, 'Cenoura Ralada');
  formatted = formatted.replace(/Mixde/gi, 'Mix de');

  return formatted;
}

/**
 * Normaliza nome de cliente para uso em chaves
 * @param {string} clientName - Nome do cliente
 * @returns {string} Nome normalizado
 */
export function normalizeClientName(clientName) {
  return clientName || 'sem_cliente';
}
