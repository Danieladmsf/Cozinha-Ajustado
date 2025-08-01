// CONTEÚDO DO ARQUIVO utils/orderUtils.js (criado anteriormente)
// Funções utilitárias para manipulação de dados de pedidos

/**
 * Converte um valor para número, tratando strings com vírgula.
 * @param {string|number} value - O valor a ser convertido.
 * @returns {number} O valor numérico, ou 0 se a conversão falhar.
 */
export function parseQuantity(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const cleanedValue = value.trim().replace(',', '.');
  const parsed = parseFloat(cleanedValue);
  const result = isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  return result;
}

/**
 * Formata uma quantidade numérica para exibição, usando vírgula para decimal.
 * @param {string|number} quantity - A quantidade a ser formatada.
 * @returns {string} A quantidade formatada, ou string vazia se inválido.
 */
export function formattedQuantity(quantity) {
  if (quantity === null || quantity === undefined || quantity === "") return "";
  const numValue = parseQuantity(String(quantity)); // Usa parseQuantity para garantir que é um número
  if (Number.isInteger(numValue)) return String(numValue);
  if (isNaN(numValue)) return "";
  return numValue.toFixed(1).replace('.', ',');
}

/**
 * Normaliza a estrutura do array de itens de um pedido.
 * Pode lidar com itens que são strings JSON.
 * @param {Array|string} items - O array de itens ou string JSON.
 * @returns {Array} O array de itens normalizado, ou um array vazio em caso de erro.
 */
export function normalizeOrderItems(items) {
  if (!items) return [];
  
  try {
    if (Array.isArray(items)) return items;
    
    if (typeof items === 'string') {
      // Tenta limpar JSONs que podem estar mal formatados (ex: aspas triplas)
      const cleanJson = items
        .replace(/"{3,}/g, '"') // Remove aspas triplas ou mais
        .replace(/\\"/g, '"')  // Escapa aspas internas se necessário
        .replace(/^"/, '')     // Remove aspa no início se for string JSON encapsulada
        .replace(/"$/, '');    // Remove aspa no final
      
      return JSON.parse(cleanJson);
    }
    
    return []; // Retorna array vazio se não for nem array nem string
  } catch (error) {return []; // Retorna array vazio em caso de erro de parsing
  }
}

/**
 * Formata um valor numérico como moeda BRL.
 * @param {number} value - O valor a ser formatado.
 * @returns {string} O valor formatado como moeda.
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(parseQuantity(value)); // Garante que o valor é numérico
}

/**
 * Formata um peso em kg para exibição (g ou kg).
 * @param {number} weightInKg - O peso em quilogramas.
 * @returns {string} O peso formatado.
 */
export function formatWeight(weightInKg) {
  const weight = parseQuantity(weightInKg);
  if (weight === 0) return "0 g";
  
  if (weight >= 1) { // Se for 1kg ou mais, mostrar em kg
    return `${weight.toFixed(2).replace('.', ',')} kg`;
  } else { // Menos de 1kg, mostrar em gramas
    return `${Math.round(weight * 1000)} g`;
  }
}

/**
 * Calcula o peso total de um item de pedido (ex: receita) com base na quantidade e tipo de unidade.
 * @param {object} item - O item do pedido (precisa de quantity, unit_type).
 * @param {object} recipe - A receita correspondente (precisa de cuba_weight se unit_type for 'cuba').
 * @returns {number} O peso total em kg.
 */
export function calculateItemTotalWeight(item, recipe) {
  if (!item || !recipe) return 0;
  
  const quantity = parseQuantity(item.quantity);
  
  if (item.unit_type === 'cuba') {
    const cubaWeightKg = parseQuantity(recipe.cuba_weight); // Assume que cuba_weight já está em kg na receita
    return cubaWeightKg * quantity;
  } else if (item.unit_type === 'kg') {
    return quantity; // Quantidade já está em kg
  }
  return 0; // Caso tipo de unidade não reconhecido
}