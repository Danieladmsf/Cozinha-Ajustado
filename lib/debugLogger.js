/**
 * Logger para debug de cálculos de totais
 */

export class DebugLogger {
  static isEnabled = process.env.NODE_ENV === 'development';

  static logTotalCalculation(context, data) {
    if (!this.isEnabled) return;
    
    console.group(`🧮 [TOTAL CALC] ${context}`);
    console.log('📊 Dados:', data);
    
    if (data.items && Array.isArray(data.items)) {
      console.log('📝 Itens detalhados:');
      data.items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.recipe_name || 'Item'}:`, {
          quantity: item.quantity || item.base_quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          unit_type: item.unit_type
        });
      });
      
      // Cálculos
      const oldSum = data.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
      const newSum = data.items.map(item => item.total_price || 0).reduce((acc, val) => {
        const numericVal = typeof val === 'number' ? val : parseFloat(val) || 0;
        return acc + numericVal;
      }, 0);
      const roundedSum = Math.round(newSum * 100) / 100;
      
      console.log('💰 Cálculos:');
      console.log('  - Soma antiga (reduce):', oldSum);
      console.log('  - Soma nova (map+reduce):', newSum);
      console.log('  - Soma arredondada:', roundedSum);
      console.log('  - Diferença:', Math.abs(oldSum - roundedSum));
    }
    
    if (data.totalAmount !== undefined) {
      console.log('💵 Total final:', data.totalAmount);
    }
    
    console.groupEnd();
  }

  static logWeightCalculation(context, data) {
    if (!this.isEnabled) return;
    
    console.group(`⚖️ [WEIGHT CALC] ${context}`);
    console.log('📊 Dados:', data);
    
    if (data.items && Array.isArray(data.items)) {
      console.log('📝 Itens com peso:');
      let totalWeight = 0;
      
      data.items.forEach((item, index) => {
        const unitType = (item.unit_type || '').toLowerCase();
        const isUnidade = unitType === 'unid' || unitType === 'unid.' || unitType === 'unidade';
        
        if (!isUnidade) {
          const quantity = item.quantity || item.base_quantity || 0;
          const cubaWeight = item.cuba_weight || item.recipe_cuba_weight || 0;
          const itemWeight = item.total_weight || item.calculated_total_weight || (cubaWeight * quantity) || 0;
          
          totalWeight += itemWeight;
          
          console.log(`  ${index + 1}. ${item.recipe_name || 'Item'}:`, {
            quantity,
            unit_type: unitType,
            cuba_weight: cubaWeight,
            total_weight: itemWeight,
            included: !isUnidade
          });
        } else {
          console.log(`  ${index + 1}. ${item.recipe_name || 'Item'}: EXCLUÍDO (unidade)`);
        }
      });
      
      console.log('⚖️ Peso total calculado:', totalWeight, 'kg');
    }
    
    console.groupEnd();
  }

  static logOrderSync(context, originalOrder, syncedOrder) {
    if (!this.isEnabled) return;
    
    console.group(`🔄 [ORDER SYNC] ${context}`);
    console.log('📥 Pedido original:', {
      total_amount: originalOrder.total_amount,
      items_count: originalOrder.items?.length || 0
    });
    console.log('📤 Pedido sincronizado:', {
      total_amount: syncedOrder.total_amount,
      items_count: syncedOrder.items?.length || 0
    });
    
    if (originalOrder.total_amount !== syncedOrder.total_amount) {
      console.warn('⚠️ DIFERENÇA DETECTADA!', {
        original: originalOrder.total_amount,
        synced: syncedOrder.total_amount,
        difference: Math.abs(originalOrder.total_amount - syncedOrder.total_amount)
      });
    }
    
    console.groupEnd();
  }

  static logHistoryCalculation(context, orderData) {
    if (!this.isEnabled) return;
    
    console.group(`📚 [HISTORY CALC] ${context}`);
    console.log('📊 Dados do pedido:', {
      day: orderData.day_of_week,
      saved_total: orderData.total_amount,
      items_count: orderData.items?.length || 0
    });
    
    if (orderData.items) {
      const recalculatedTotal = orderData.items.map(item => item.total_price || 0)
        .reduce((acc, val) => {
          const numericVal = typeof val === 'number' ? val : parseFloat(val) || 0;
          return acc + numericVal;
        }, 0);
      const roundedTotal = Math.round(recalculatedTotal * 100) / 100;
      
      console.log('💰 Totais:', {
        saved: orderData.total_amount,
        recalculated: recalculatedTotal,
        rounded: roundedTotal,
        difference: Math.abs((orderData.total_amount || 0) - roundedTotal)
      });
      
      if (Math.abs((orderData.total_amount || 0) - roundedTotal) > 0.01) {
        console.warn('⚠️ DIFERENÇA SIGNIFICATIVA detectada!');
      }
    }
    
    console.groupEnd();
  }
}