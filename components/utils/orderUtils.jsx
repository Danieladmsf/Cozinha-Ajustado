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
  if (isNaN(numValue)) return "";

  // Se for um inteiro, retorna como string de inteiro
  if (Number.isInteger(numValue)) return String(numValue);

  // Verifica o número de casas decimais
  const decimalPlaces = (numValue.toString().split('.')[1] || '').length;

  if (decimalPlaces === 1) {
    return numValue.toFixed(1).replace('.', ',');
  } else if (decimalPlaces >= 2) { // Para 2 ou mais casas, arredonda para 2
    return numValue.toFixed(2).replace('.', ',');
  } else { // Caso padrão, talvez para números como 0.0, 0.1, etc.
    return numValue.toFixed(1).replace('.', ',');
  }
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
  const numericValue = parseQuantity(value);
  // Arredondar para 2 casas decimais para evitar problemas de precisão
  const roundedValue = Math.round(numericValue * 100) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(roundedValue);
}

/**
 * Soma valores monetários com precisão, evitando erros de ponto flutuante
 * @param {Array<number>} values - Array de valores para somar
 * @returns {number} Soma precisa arredondada para 2 casas decimais
 */
export function sumCurrency(values) {
  const sum = values.reduce((acc, val) => {
    const numericVal = parseQuantity(val);
    return acc + numericVal;
  }, 0);
  // Arredondar para 2 casas decimais para evitar problemas de precisão
  const rounded = Math.round(sum * 100) / 100;
  
  // Debug desabilitado para evitar spam nos logs
  
  return rounded;
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
    return `${weight.toFixed(3).replace('.', ',')} kg`;
  } else { // Menos de 1kg, mostrar em gramas
    return `${(weight * 1000).toFixed(0).replace('.', ',')} g`;
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
  
  if (item.unit_type === 'cuba' || item.unit_type === 'cuba-g') {
    // Prioriza cuba_weight, mas usa total_weight como fallback
    const cubaWeightKg = parseQuantity(recipe.cuba_weight || recipe.total_weight);
    const result = cubaWeightKg * quantity;
    
    return result;
  } else if (item.unit_type === 'kg') {
    return quantity;
  } else if (item.unit_type === 'unid') {
    const unitWeightKg = parseQuantity(recipe.unit_weight || 0);
    return unitWeightKg * quantity;
  }
  
  return 0;
}