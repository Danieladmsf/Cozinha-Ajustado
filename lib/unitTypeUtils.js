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
  if (!recipe) return "kg";

  let containerType = null;
  
  // Buscar container_type na estrutura das preparações
  if (recipe.preparations && recipe.preparations.length > 0) {
    const lastPrep = recipe.preparations[recipe.preparations.length - 1];
    if (lastPrep.assembly_config?.container_type) {
      containerType = lastPrep.assembly_config.container_type.toLowerCase();
    }
  }
  
  // Se não encontrou, verificar se tem direto na receita
  if (!containerType) {
    if (recipe.container_type) {
      containerType = recipe.container_type.toLowerCase();
    }
  }
  
  // Default final se nada for encontrado
  if (!containerType) {
    containerType = "kg";
  }
  
  return containerType;
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