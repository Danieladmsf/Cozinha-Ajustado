/**
 * Utilitários para lógica de organização e cálculo de receitas
 */

/**
 * Valida e converte valores para número
 * @param {any} value - Valor a ser validado
 * @param {number} defaultValue - Valor padrão caso inválido
 * @returns {number} - Número validado ou valor padrão
 */
export const validateNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null) return defaultValue;
  const num = parseFloat(String(value).replace(',', '.'));
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
};

/**
 * Formata peso com unidade
 * @param {number|string} weight - Peso para formatar
 * @param {string} unit - Unidade de medida
 * @returns {string} - String formatada
 */
export const formatWeight = (weight, unit = "kg") => {
  const numWeight = validateNumber(weight);
  return `${numWeight.toFixed(3).replace('.', ',')} ${unit}`;
};

/**
 * Formata moeda em reais
 * @param {number|string} value - Valor para formatar
 * @returns {string} - String formatada
 */
export const formatCurrency = (value) => {
  const numValue = validateNumber(value);
  return `R$ ${numValue.toFixed(2).replace('.', ',')}`;
};

/**
 * Formata porcentagem
 * @param {number|string} percent - Percentual para formatar
 * @returns {string} - String formatada
 */
export const formatPercent = (percent) => {
  const numPercent = validateNumber(percent);
  return `${numPercent.toFixed(1).replace('.', ',')}%`;
};

/**
 * Organiza as etapas da receita seguindo a lógica solicitada
 * @param {Array} preparations - Lista de etapas da receita
 * @returns {Array} - Etapas organizadas
 */
export const organizePreparations = (preparations) => {
  if (!preparations || preparations.length === 0) return [];
  
  // Filtrar apenas etapas com título
  const validPreps = preparations.filter(prep => prep.title);
  
  // Marcar etapas que têm ingredientes
  const prepsWithSteps = validPreps.map(prep => ({
    ...prep,
    hasIngredients: prep.ingredients && prep.ingredients.length > 0
  }));
  
  // Numerar apenas as etapas com ingredientes
  let stepCounter = 1;
  return prepsWithSteps.map(prep => {
    if (prep.hasIngredients) {
      return {
        ...prep,
        numericalStep: stepCounter++
      };
    }
    return {
      ...prep,
      numericalStep: null
    };
  });
};

/**
 * Calcula o rendimento de um ingrediente em uma etapa
 * @param {Object} preparation - Etapa de preparação
 * @param {Object} ingredient - Ingrediente
 * @returns {number} - Percentual de rendimento
 */
export const calculateYieldPercent = (preparation, ingredient) => {
  if (!ingredient) return 100;
  
  const initialWeight = validateNumber(
    ingredient.weight_frozen || ingredient.weight_raw || ingredient.quantity
  );
  const finalWeight = validateNumber(
    ingredient.weight_portioned || 
    ingredient.weight_cooked || 
    ingredient.weight_clean || 
    ingredient.weight_thawed || 
    ingredient.quantity
  );
  
  if (initialWeight === 0) return 100;
  return (finalWeight / initialWeight) * 100;
};

/**
 * Calcula valores totais para a receita
 * @param {Array} preparations - Lista de etapas da receita
 * @param {number} adjustmentFactor - Fator de ajuste para as quantidades
 * @returns {Object} - Objeto com valores calculados
 */
export const calculateRecipeTotals = (preparations, adjustmentFactor = 1) => {
  let totalBrutoWeight = 0;
  let totalRendimentoWeight = 0;
  let totalCost = 0;
  
  preparations.forEach(prep => {
    if (prep.ingredients && prep.ingredients.length > 0) {
      prep.ingredients.forEach(ing => {
        const initialWeight = validateNumber(ing.weight_frozen || ing.weight_raw || ing.quantity);
        totalBrutoWeight += initialWeight * adjustmentFactor;
        
        const finalWeight = validateNumber(
          ing.weight_portioned || 
          ing.weight_cooked || 
          ing.weight_clean || 
          ing.weight_thawed || 
          ing.quantity
        );
        totalRendimentoWeight += finalWeight * adjustmentFactor;
        
        // Calcular custo
        const unitPrice = validateNumber(ing.unit_price);
        const quantity = validateNumber(ing.quantity);
        totalCost += unitPrice * quantity * adjustmentFactor;
      });
    }
  });
  
  // Calcular custo por kg de rendimento
  const costPerKgRendimento = totalRendimentoWeight > 0 
    ? totalCost / totalRendimentoWeight 
    : 0;
    
  return {
    totalBrutoWeight,
    totalRendimentoWeight,
    totalCost,
    costPerKgRendimento
  };
};

/**
 * Ajusta quantidades da receita baseado em fator de ajuste
 * @param {Object} recipe - Receita original
 * @param {number} adjustmentFactor - Fator de ajuste
 * @returns {Object} - Receita com quantidades ajustadas
 */
export const adjustRecipeQuantities = (recipe, adjustmentFactor) => {
  if (!recipe) return null;
  if (adjustmentFactor === 1) return recipe;
  
  // Clone profundo da receita
  const adjustedRecipe = JSON.parse(JSON.stringify(recipe));
  
  // Ajustar etapas de preparo
  if (adjustedRecipe.preparations) {
    adjustedRecipe.preparations = adjustedRecipe.preparations.map(prep => {
      if (prep.ingredients) {
        prep.ingredients = prep.ingredients.map(ing => ({
          ...ing,
          quantity: validateNumber(ing.quantity) * adjustmentFactor,
          weight_frozen: ing.weight_frozen ? validateNumber(ing.weight_frozen) * adjustmentFactor : undefined,
          weight_raw: ing.weight_raw ? validateNumber(ing.weight_raw) * adjustmentFactor : undefined,
          weight_thawed: ing.weight_thawed ? validateNumber(ing.weight_thawed) * adjustmentFactor : undefined,
          weight_clean: ing.weight_clean ? validateNumber(ing.weight_clean) * adjustmentFactor : undefined,
          weight_cooked: ing.weight_cooked ? validateNumber(ing.weight_cooked) * adjustmentFactor : undefined,
          weight_portioned: ing.weight_portioned ? validateNumber(ing.weight_portioned) * adjustmentFactor : undefined,
        }));
      }
      return prep;
    });
  }
  
  // Ajustar valores gerais
  adjustedRecipe.yield_weight = validateNumber(adjustedRecipe.yield_weight) * adjustmentFactor;
  adjustedRecipe.total_weight = validateNumber(adjustedRecipe.total_weight) * adjustmentFactor;
  adjustedRecipe.total_cost = validateNumber(adjustedRecipe.total_cost) * adjustmentFactor;
  
  // Rendimento, custo por kg, etc. não mudam com o ajuste de quantidade
  
  return adjustedRecipe;
};

export default {
  validateNumber,
  formatWeight,
  formatCurrency,
  formatPercent,
  organizePreparations,
  calculateYieldPercent,
  calculateRecipeTotals,
  adjustRecipeQuantities
};