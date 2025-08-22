/**
 * Utilitários centralizados para determinar unit_type de receitas
 */

/**
 * Extrai o unit_type (container_type) de uma receita
 * Segue a mesma lógica usada na aba pedidos
 * @param {Object} recipe - Objeto da receita
 * @returns {string} - O tipo de unidade (container_type)
 */
export const getRecipeUnitType = (recipe) => {
  if (!recipe) return 'cuba';
  
  // Lógica similar à existente no portal
  if (recipe.cuba_weight && parseFloat(recipe.cuba_weight) > 0) {
    if (recipe.name === 'S. Abobrinha') {
      console.log('DEBUG PREÇO: getRecipeUnitType - S. Abobrinha has cuba_weight:', recipe.cuba_weight, 'returning cuba');
    }
    return 'cuba';
  }
  
  // Se não tem cuba_weight, verificar outros campos
  if (recipe.unit_type) {
    if (recipe.name === 'S. Abobrinha') {
      console.log('DEBUG PREÇO: getRecipeUnitType - S. Abobrinha has unit_type:', recipe.unit_type, 'returning unit_type');
    }
    return recipe.unit_type;
  }
  
  // Default
  if (recipe.name === 'S. Abobrinha') {
    console.log('DEBUG PREÇO: getRecipeUnitType - S. Abobrinha defaulting to kg');
  }
  return 'kg';
};

/**
 * Formata o unit_type para exibição
 * @param {string} unitType - O tipo de unidade
 * @returns {string} - Unidade formatada para exibição
 */
export const formatUnitTypeForDisplay = (unitType) => {
  if (!unitType) return "Kg";
  
  const formatted = unitType.charAt(0).toUpperCase() + unitType.slice(1);
  return formatted;
};

/**
 * Obtém todas as unidades disponíveis no sistema
 * @returns {Array} - Array com as unidades disponíveis
 */
export const getAvailableUnits = () => {
  return [
    { value: "kg", label: "Kg" },
    { value: "cuba", label: "Cuba" },
    { value: "unid.", label: "Unid." },
    { value: "litro", label: "Litro" },
    { value: "ml", label: "ml" }
  ];
};

/**
 * Verifica se uma unidade é válida
 * @param {string} unitType - O tipo de unidade para validar
 * @returns {boolean} - Se a unidade é válida
 */
export const isValidUnitType = (unitType) => {
  const availableUnits = getAvailableUnits();
  return availableUnits.some(unit => unit.value === unitType);
};