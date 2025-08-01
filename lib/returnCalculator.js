/**
 * Utilitário para cálculos de depreciação por devoluções
 * 
 * Quando um cliente devolve um item para a cozinha, há uma depreciação de 25%
 * sobre o valor original do item.
 */

const DEPRECIATION_RATE = 0.25; // 25% de depreciação
const NON_RECEIVED_DISCOUNT_RATE = 1.0; // 100% de desconto para itens não recebidos

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
 * Calcula o valor de desconto para um item não recebido
 * @param {number} originalPrice - Preço original do item
 * @param {number} nonReceivedQuantity - Quantidade não recebida
 * @param {string} unitType - Tipo de unidade (kg, cuba, etc.)
 * @returns {number} Valor do desconto (100%)
 */
export function calculateNonReceivedDiscount(originalPrice, nonReceivedQuantity, unitType) {
  if (!originalPrice || !nonReceivedQuantity || nonReceivedQuantity <= 0) {
    return 0;
  }
  
  const totalValue = originalPrice * nonReceivedQuantity;
  return totalValue * NON_RECEIVED_DISCOUNT_RATE; // 100% de desconto
}

/**
 * Calcula o total de descontos por itens não recebidos
 * @param {Array} receivingItems - Array de itens com dados de recebimento
 * @param {Array} orderItems - Array de itens do pedido para obter preços
 * @returns {Object} Objeto com detalhes dos descontos por não recebimento
 */
export function calculateNonReceivedDiscounts(receivingItems, orderItems) {
  if (!receivingItems || !orderItems || receivingItems.length === 0 || orderItems.length === 0) {
    return {
      totalNonReceivedDiscount: 0,
      nonReceivedItems: [],
      hasNonReceived: false
    };
  }

  const nonReceivedItems = [];
  let totalNonReceivedDiscount = 0;

  receivingItems.forEach(receivingItem => {
    const orderedQuantity = receivingItem.ordered_quantity || 0;
    const receivedQuantity = receivingItem.received_quantity || 0;
    const nonReceivedQuantity = Math.max(0, orderedQuantity - receivedQuantity);
    
    if (nonReceivedQuantity > 0) {
      // Encontrar o item correspondente no pedido para obter o preço
      const orderItem = orderItems.find(oi => 
        oi.unique_id === receivingItem.unique_id || 
        oi.recipe_id === receivingItem.recipe_id
      );

      if (orderItem && orderItem.unit_price) {
        const itemDiscount = calculateNonReceivedDiscount(
          orderItem.unit_price,
          nonReceivedQuantity,
          receivingItem.ordered_unit_type || 'kg'
        );

        if (itemDiscount > 0) {
          nonReceivedItems.push({
            recipe_name: receivingItem.recipe_name,
            ordered_quantity: orderedQuantity,
            received_quantity: receivedQuantity,
            non_received_quantity: nonReceivedQuantity,
            unit_type: receivingItem.ordered_unit_type || 'kg',
            original_unit_price: orderItem.unit_price,
            discount_value: itemDiscount,
            status: receivingItem.status || 'pending',
            notes: receivingItem.notes || ''
          });

          totalNonReceivedDiscount += itemDiscount;
        }
      }
    }
  });

  return {
    totalNonReceivedDiscount,
    nonReceivedItems,
    hasNonReceived: nonReceivedItems.length > 0,
    discountRate: NON_RECEIVED_DISCOUNT_RATE
  };
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
 * Calcula o valor final do pedido após depreciações e descontos por não recebimento
 * @param {number} originalTotal - Valor total original do pedido
 * @param {number} totalDepreciation - Total de depreciação por devoluções (25%)
 * @param {number} totalNonReceivedDiscount - Total de desconto por itens não recebidos (100%)
 * @returns {Object} Objeto com valores originais e finais
 */
export function calculateFinalOrderValue(originalTotal, totalDepreciation = 0, totalNonReceivedDiscount = 0) {
  const totalDiscounts = totalDepreciation + totalNonReceivedDiscount;
  const finalTotal = originalTotal - totalDiscounts;
  
  return {
    originalTotal,
    totalDepreciation,
    totalNonReceivedDiscount,
    totalDiscounts,
    finalTotal: Math.max(0, finalTotal), // Não pode ser negativo
    savingsAmount: totalDiscounts,
    discountPercentage: originalTotal > 0 ? (totalDiscounts / originalTotal) * 100 : 0
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