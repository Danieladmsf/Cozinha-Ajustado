import { useMemo } from 'react';
import { parseQuantity, formatCurrency } from '@/components/utils/orderUtils';
import { useCategoryDisplay } from '@/hooks/shared/useCategoryDisplay';

/**
 * Hook para consolidação de pedidos e itens
 * Separa a lógica complexa de consolidação do componente principal
 */
export const useOrderConsolidation = (orders, recipes) => {
  const { groupItemsByCategory, getOrderedCategories } = useCategoryDisplay();
  // Validação de valores monetários
  const validateAmount = (amount) => {
    const numAmount = parseQuantity(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return 0;
    }
    return numAmount;
  };

  // Agrupar pedidos por cliente com validação rigorosa
  const ordersByCustomer = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];

    const grouped = {};
    
    orders.forEach(order => {
      if (!order.customer_id || !order.customer_name) {
        return;
      }

      if (!grouped[order.customer_id]) {
        grouped[order.customer_id] = {
          customer_id: order.customer_id,
          customer_name: order.customer_name,
          orders: [],
          total_meals: 0,
          total_amount: 0,
          total_items: 0
        };
      }
      
      const customerGroup = grouped[order.customer_id];
      customerGroup.orders.push(order);
      customerGroup.total_meals += parseQuantity(order.total_meals_expected);
      
      // Validação rigorosa de valores monetários
      const originalAmount = validateAmount(order.original_amount);
      const totalAmount = validateAmount(order.total_amount);
      const finalAmount = originalAmount > 0 ? originalAmount : totalAmount;
      
      customerGroup.total_amount += finalAmount;
      customerGroup.total_items += parseQuantity(order.total_items);
    });
    
    return Object.values(grouped);
  }, [orders]);

  /**
   * Para consolidação, sincroniza com a ficha técnica atual
   * Isso garante consistência com o portal do cliente
   */
  const getCorrectUnitType = (item, recipe) => {
    // 1. PRIORIDADE: Usar unidade da ficha técnica atual (como no portal)
    if (recipe?.unit_type) {
      return recipe.unit_type;
    }
    
    // 2. FALLBACK: Usar unidade do pedido original (dados históricos)
    if (item.unit_type) {
      return item.unit_type;
    }
    
    // 3. FALLBACK FINAL: Padrão do sistema
    return 'cuba-g';
  };

  // Consolidar itens por categoria para um cliente específico
  const consolidateCustomerItems = useMemo(() => {
    return (customerOrders) => {
      if (!customerOrders || !Array.isArray(customerOrders)) return {};

      // Se há apenas 1 pedido, não precisa consolidar - apenas agrupa por categoria
      if (customerOrders.length === 1) {
        const order = customerOrders[0];
        
        if (!order.items || order.items.length === 0) {
          return {};
        }
        
        // Adicionar informações de categoria aos itens
        const itemsWithCategory = order.items.map(item => {
          const recipe = recipes?.find(r => r.id === item.recipe_id);
          const correctUnitType = getCorrectUnitType(item, recipe);
          
          return {
            ...item,
            category: recipe?.category || item.category || 'Outros',
            unit_type: correctUnitType
          };
        });
        
        const groupedByCategory = groupItemsByCategory(itemsWithCategory);
        const orderedCategories = getOrderedCategories(groupedByCategory);
        
        const consolidatedItems = {};
        orderedCategories.forEach(({ name, data }) => {
          consolidatedItems[name] = data.items;
        });
        
        return consolidatedItems;
      }

      // Múltiplos pedidos - precisa consolidar
      const itemsMap = new Map();
      
      customerOrders.forEach((order) => {
        if (!order.items || !Array.isArray(order.items)) return;
        
        order.items.forEach((item) => {
          if (!item.recipe_id && !item.recipe_name) return;
          
          const key = item.unique_id || `${item.recipe_id}_${item.recipe_name}`;
          
          if (itemsMap.has(key)) {
            const existing = itemsMap.get(key);
            const recipe = recipes?.find(r => r.id === item.recipe_id);
            const correctUnitType = getCorrectUnitType(item, recipe);
            const addQuantity = parseQuantity(item.quantity);
            
            // Verificar se unidades são compatíveis após sincronização
            if (existing.unit_type !== correctUnitType) {
              existing.unit_type = correctUnitType;
            }
            
            existing.quantity += addQuantity;
            existing.total_price += validateAmount(item.total_price);
          } else {
            const recipe = recipes?.find(r => r.id === item.recipe_id);
            
            // Para consolidação: sincronizar com ficha técnica atual
            const correctUnitType = getCorrectUnitType(item, recipe);
            
            const consolidatedItem = {
              ...item,
              category: recipe?.category || item.category || 'Outros',
              quantity: parseQuantity(item.quantity),
              total_price: validateAmount(item.total_price),
              unit_type: correctUnitType // Usar unidade sincronizada
            };
            
            itemsMap.set(key, consolidatedItem);
          }
        });
      });
      
      // Converter para array e usar o hook para agrupar por categoria
      const itemsArray = Array.from(itemsMap.values());
      const groupedByCategory = groupItemsByCategory(itemsArray);
      const orderedCategories = getOrderedCategories(groupedByCategory);
      
      // Converter de volta para o formato esperado pelo template
      const consolidatedItems = {};
      orderedCategories.forEach(({ name, data }) => {
        consolidatedItems[name] = data.items;
      });
      
      return consolidatedItems;
    };
  }, [recipes, groupItemsByCategory, getOrderedCategories]);

  // Estatísticas gerais
  const statistics = useMemo(() => {
    const totalCustomers = ordersByCustomer.length;
    const totalOrders = orders?.length || 0;
    const totalAmount = ordersByCustomer.reduce((sum, customer) => sum + customer.total_amount, 0);
    const totalMeals = ordersByCustomer.reduce((sum, customer) => sum + customer.total_meals, 0);

    return {
      totalCustomers,
      totalOrders,
      totalAmount,
      totalMeals,
      averageOrderValue: totalCustomers > 0 ? totalAmount / totalCustomers : 0
    };
  }, [ordersByCustomer, orders]);

  return {
    ordersByCustomer,
    consolidateCustomerItems,
    statistics,
    validateAmount
  };
};