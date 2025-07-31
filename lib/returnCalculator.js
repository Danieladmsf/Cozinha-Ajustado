/**
 * Utilitário para cálculos de depreciação por devoluções
 * 
 * Quando um cliente devolve um item para a cozinha, há uma depreciação de 25%
 * sobre o valor original do item.
 */

const DEPRECIATION_RATE = 0.25; // 25% de depreciação

/**
 * Calcula o valor de depreciação para um item devolvido
 * @param {number} originalPrice - Preço original do item
 * @param {number} returnedQuantity - Quantidade devolvida
 * @param {string} unitType - Tipo de unidade (kg, cuba, etc.)
 * @returns {number} Valor da depreciação
 */
export function calculateItemDepreciation(originalPrice, returnedQuantity, unitType) {
  if (!originalPrice || !returnedQuantity || returnedQuantity <= 0) {
    return 0;
  }
  
  const totalValue = originalPrice * returnedQuantity;
  return totalValue * DEPRECIATION_RATE;
}

/**
 * Calcula o total de depreciação baseado nos dados de devolução (waste)
 * @param {Array} wasteItems - Array de itens com dados de devolução
 * @param {Array} orderItems - Array de itens do pedido para obter preços
 * @returns {Object} Objeto com detalhes da depreciação
 */
export function calculateTotalDepreciation(wasteItems, orderItems) {
  if (!wasteItems || !orderItems || wasteItems.length === 0 || orderItems.length === 0) {
    return {
      totalDepreciation: 0,
      returnedItems: [],
      hasReturns: false
    };
  }

  const returnedItems = [];
  let totalDepreciation = 0;

  wasteItems.forEach(wasteItem => {
    const returnedQuantity = wasteItem.client_returned_quantity || 0;
    
    if (returnedQuantity > 0) {
      // Encontrar o item correspondente no pedido para obter o preço
      const orderItem = orderItems.find(oi => 
        oi.unique_id === wasteItem.unique_id || 
        oi.recipe_id === wasteItem.recipe_id
      );

      if (orderItem && orderItem.unit_price) {
        const itemDepreciation = calculateItemDepreciation(
          orderItem.unit_price,
          returnedQuantity,
          wasteItem.ordered_unit_type || 'kg'
        );

        if (itemDepreciation > 0) {
          returnedItems.push({
            recipe_name: wasteItem.recipe_name,
            returned_quantity: returnedQuantity,
            unit_type: wasteItem.ordered_unit_type || 'kg',
            original_unit_price: orderItem.unit_price,
            depreciation_value: itemDepreciation,
            notes: wasteItem.notes || ''
          });

          totalDepreciation += itemDepreciation;
        }
      }
    }
  });

  return {
    totalDepreciation,
    returnedItems,
    hasReturns: returnedItems.length > 0,
    depreciationRate: DEPRECIATION_RATE
  };
}

/**
 * Calcula o valor final do pedido após depreciações
 * @param {number} originalTotal - Valor total original do pedido
 * @param {number} totalDepreciation - Total de depreciação por devoluções
 * @returns {Object} Objeto com valores originais e finais
 */
export function calculateFinalOrderValue(originalTotal, totalDepreciation) {
  const finalTotal = originalTotal - totalDepreciation;
  
  return {
    originalTotal,
    totalDepreciation,
    finalTotal: Math.max(0, finalTotal), // Não pode ser negativo
    savingsAmount: totalDepreciation,
    discountPercentage: originalTotal > 0 ? (totalDepreciation / originalTotal) * 100 : 0
  };
}

/**
 * Formata o valor monetário para exibição
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado em reais
 */
export function formatCurrency(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'R$ 0,00';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formata quantidade para exibição
 * @param {number} quantity - Quantidade a ser formatada
 * @returns {string} Quantidade formatada
 */
export function formatQuantity(quantity) {
  if (typeof quantity !== 'number' || isNaN(quantity)) {
    return '0';
  }
  
  // Se for número inteiro, mostrar sem casas decimais
  if (quantity % 1 === 0) {
    return quantity.toString();
  }
  
  // Caso contrário, mostrar com até 2 casas decimais
  return quantity.toFixed(2).replace('.', ',');
}