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

  // 1. Prioritize unit_type if it's valid
  if (recipe.unit_type && isValidUnitType(recipe.unit_type)) {
    return recipe.unit_type;
  }

  // 2. Check for container_type in preparations
  if (recipe.preparations && Array.isArray(recipe.preparations)) {
    for (const prep of recipe.preparations) {
      if (prep.assembly_config && prep.assembly_config.container_type) {
        return prep.assembly_config.container_type;
      }
    }
  }

  // 3. Fallback to cuba_weight
  if (recipe.cuba_weight && parseFloat(recipe.cuba_weight) > 0) {
    return 'cuba';
  }

  // 4. Default
  return null;
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