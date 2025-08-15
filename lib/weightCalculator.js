/**
 * Calculadora centralizada de peso total
 * Mesma lógica usada em todas as partes do sistema
 */

/**
 * Calcula peso total de uma lista de itens excluindo unidades
 * @param {Array} items - Lista de itens do pedido
 * @returns {number} Peso total em kg
 */
export function calculateTotalWeight(items) {
  if (!items || !Array.isArray(items)) {
    return 0;
  }

  let totalWeight = 0;
  const includedItems = [];
  const excludedItems = [];
  
  items.forEach(item => {
    const unitType = (item.unit_type || '').toLowerCase();
    
    // NÃO incluir itens em unidade na soma do peso total
    if (unitType === 'unid' || unitType === 'unid.' || unitType === 'unidade') {
      excludedItems.push({
        name: item.recipe_name || 'Item',
        unit_type: unitType,
        reason: 'unidade'
      });
      return;
    }
    
    const quantity = item.quantity || item.base_quantity || 0;
    
    // PRIORIDADE DE PESO: total_weight > calculated_total_weight > cuba_weight * quantity > yield_weight * quantity > fallback
    let pesoFinal = 0;
    
    if (item.total_weight && item.total_weight > 0) {
      pesoFinal = item.total_weight;
    } else if (item.calculated_total_weight && item.calculated_total_weight > 0) {
      pesoFinal = item.calculated_total_weight;
    } else {
      // Tentar usar cuba_weight
      const cubaWeight = item.cuba_weight || item.recipe_cuba_weight || 0;
      if (cubaWeight > 0 && quantity > 0) {
        pesoFinal = cubaWeight * quantity;
      } else {
        // Fallback: usar yield_weight se disponível
        const yieldWeight = item.yield_weight || item.recipe_yield_weight || 0;
        if (yieldWeight > 0 && quantity > 0) {
          pesoFinal = yieldWeight * quantity;
        } else if (unitType === 'kg' && quantity > 0) {
          // Se unidade é kg, usar a quantidade diretamente
          pesoFinal = quantity;
        }
      }
    }
    
    // Determinar fonte do peso para debug
    let weightSource = 'zero';
    if (item.total_weight && item.total_weight > 0) weightSource = 'total_weight';
    else if (item.calculated_total_weight && item.calculated_total_weight > 0) weightSource = 'calculated_total_weight';
    else if ((item.cuba_weight || item.recipe_cuba_weight || 0) > 0) weightSource = 'cuba_weight';
    else if ((item.yield_weight || item.recipe_yield_weight || 0) > 0) weightSource = 'yield_weight';
    else if (unitType === 'kg') weightSource = 'quantity_as_kg';
    
    includedItems.push({
      name: item.recipe_name || 'Item',
      quantity,
      cuba_weight: item.cuba_weight || item.recipe_cuba_weight || 0,
      yield_weight: item.yield_weight || item.recipe_yield_weight || 0,
      total_weight: pesoFinal,
      unit_type: unitType,
      weight_source: weightSource
    });
    
    totalWeight += pesoFinal;
  });
  
  // Debug apenas se houver peso significativo ou problemas
  if (process.env.NODE_ENV === 'development' && totalWeight > 50) {
    console.log('⚖️ [Peso Total]:', totalWeight.toFixed(2), 'kg -', includedItems.length, 'itens');
  }
  
  return totalWeight;
}

/**
 * Formata peso em kg com 2 casas decimais
 * @param {number} weightInKg - Peso em kg
 * @returns {string} Peso formatado em kg
 */
export function formatWeightDisplay(weightInKg) {
  return `${weightInKg.toFixed(2)} kg`;
}