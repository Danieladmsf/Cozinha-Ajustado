/**
 * Funções centralizadas para cálculo de peso.
 */

function parseQuantity(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const cleanedValue = value.trim().replace(',', '.');
  const parsed = parseFloat(cleanedValue);
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
}

export function calculateItemWeight(item) {
  if (!item) return 0;

  const quantity = parseQuantity(item.quantity) || parseQuantity(item.base_quantity) || 0;
  if (quantity === 0) return 0;

  const unitType = (item.unit_type || '').toLowerCase();

  if (unitType === 'kg') {
    return quantity;
  }

  // Handle 'unid' types using recipe's portion_weight_kg or cuba_weight
  if (unitType === 'unid' || unitType === 'unid.' || unitType === 'unidade') {
    const portionWeight = parseQuantity(item.recipe?.portion_weight_kg) || 0;
    const cubaWeightFromRecipe = parseQuantity(item.recipe?.cuba_weight) || 0;

    if (portionWeight > 0) {
      return portionWeight * quantity;
    }
    if (cubaWeightFromRecipe > 0) {
      return cubaWeightFromRecipe * quantity;
    }
    // If no specific unit weight is found, return 0 for 'unid' items
    console.warn(`[WeightCalculator] Item ${item.recipe_name} (${item.recipe_id}) has unit 'unid' but no portion_weight_kg or cuba_weight defined in recipe.`);
    return 0;
  }

  const cubaWeight = parseQuantity(item.recipe_cuba_weight) || parseQuantity(item.cuba_weight) || 0;
  if (cubaWeight > 0) {
    if (unitType === 'cuba-g') {
      return cubaWeight * quantity; // Assume que o peso da cuba já está na unidade correta (kg)
    }
    return cubaWeight * quantity; // Assume que 'cuba' está em KG
  }

  const yieldWeight = parseQuantity(item.recipe_yield_weight) || parseQuantity(item.yield_weight) || 0;
  if (yieldWeight > 0) {
    // Assume que yield_weight está sempre em gramas
    return (yieldWeight * quantity) / 1000;
  }

  return 0; // Retorna 0 se nenhuma regra de peso se aplicar
}

export function calculateTotalWeight(items) {
  if (!items || !Array.isArray(items)) {
    return 0;
  }

  let totalWeight = 0;

  items.forEach(item => {
    const itemWeight = calculateItemWeight(item);
    
    if (itemWeight === 0) {
      return; // Skip items that result in 0 weight
    }

    totalWeight += itemWeight;
  });

  return totalWeight;
}

export function formatWeightDisplay(weightInKg) {
  const weight = parseQuantity(weightInKg);
  if (weight === 0) return "0 g";
  
  if (weight >= 1) {
    return `${weight.toFixed(2).replace('.', ',')} kg`;
  } else {
    return `${Math.round(weight * 1000)} g`;
  }
}