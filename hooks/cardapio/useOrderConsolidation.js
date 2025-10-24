import { useMemo } from 'react';
import { parseQuantity, formatCurrency } from '@/components/utils/orderUtils';
import { useCategoryDisplay } from '@/hooks/shared/useCategoryDisplay';

/**
 * Hook para consolidação de pedidos e itens
 * Separa a lógica complexa de consolidação do componente principal
 * @param {Array} orders - Lista de pedidos
 * @param {Array} recipes - Lista de receitas
 * @param {Array} excludeCategories - Lista de categorias a serem excluídas (opcional)
 */
export const useOrderConsolidation = (orders, recipes, excludeCategories = []) => {
  const { groupItemsByCategory, getOrderedCategories } = useCategoryDisplay();

  // Função para verificar se uma categoria deve ser excluída
  const shouldExcludeCategory = (category) => {
    if (!category || excludeCategories.length === 0) return false;

    const categoryLower = category.toLowerCase();
    return excludeCategories.some(excludeCat =>
      categoryLower.includes(excludeCat.toLowerCase())
    );
  };

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

    // De-duplicate orders for the same customer, keeping only the most recent one.
    // This handles cases where multiple orders exist for the same customer on the selected day.
    const latestOrdersMap = new Map();
    orders.forEach(order => {
      const key = order.customer_id;
      const existing = latestOrdersMap.get(key);

      const getOrderTimestamp = (o) => {
        const date = o.updatedAt || o.createdAt;
        if (!date) return 0;
        // Handle both Firestore Timestamp objects and ISO strings
        return date.toMillis ? date.toMillis() : new Date(date).getTime();
      };

      if (!existing || getOrderTimestamp(order) > getOrderTimestamp(existing)) {
        latestOrdersMap.set(key, order);
      }
    });
    const latestOrders = Array.from(latestOrdersMap.values());

    // Now, group the de-duplicated orders. Since there's only one order per customer,
    // the grouping is simpler.
    const grouped = {};
    latestOrders.forEach(order => {
      if (!order.customer_id || !order.customer_name) {
        return;
      }

      if (!grouped[order.customer_id]) {
        const originalAmount = validateAmount(order.original_amount);
        const totalAmount = validateAmount(order.total_amount);
        const finalAmount = originalAmount > 0 ? originalAmount : totalAmount;

        grouped[order.customer_id] = {
          customer_id: order.customer_id,
          customer_name: order.customer_name,
          orders: [order], // Array with the single latest order
          total_meals: parseQuantity(order.total_meals_expected),
          total_amount: finalAmount,
          total_items: parseQuantity(order.total_items)
        };
      }
    });
    
    return Object.values(grouped);
  }, [orders]);

  /**
   * Obtém o unit_type correto da receita (usa mesma lógica do portal)
   */
  const getRecipeUnitType = (recipe) => {
    if (!recipe) return null;

    // 1. Verificar se já tem unit_type direto na receita
    if (recipe.unit_type) {
      return recipe.unit_type;
    }

    // 2. Buscar container_type nas preparações
    if (recipe.preparations && recipe.preparations.length > 0) {
      const lastPrep = recipe.preparations[recipe.preparations.length - 1];
      if (lastPrep.assembly_config?.container_type) {
        return lastPrep.assembly_config.container_type;
      }
    }

    // 3. Verificar container_type direto na receita
    if (recipe.container_type) {
      return recipe.container_type;
    }

    // 4. Fallback baseado em peso da cuba
    if (recipe.cuba_weight && parseFloat(recipe.cuba_weight) > 0) {
      return 'cuba-g'; // Assumir cuba-g se tiver cuba_weight
    }

    return null;
  };

  /**
   * Para consolidação, sincroniza com a ficha técnica atual
   * Isso garante consistência com o portal do cliente
   */
  const getCorrectUnitType = (item, recipe) => {
    // 1. PRIORIDADE: Usar unidade da ficha técnica atual (como no portal)
    const recipeUnitType = getRecipeUnitType(recipe);
    if (recipeUnitType) {
      return recipeUnitType;
    }

    // 2. FALLBACK: Usar unidade do pedido original (dados históricos)
    if (item.unit_type) {
      return item.unit_type;
    }

    // 3. FALLBACK FINAL: Null (será tratado na formatação)
    return null;
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

        // Adicionar informações de categoria aos itens e normalizar quantidades
        const itemsWithCategory = order.items.map(item => {
          const recipe = recipes?.find(r => r.id === item.recipe_id);
          const correctUnitType = getCorrectUnitType(item, recipe);

          return {
            ...item,
            category: recipe?.category || item.category || 'Outros',
            unit_type: correctUnitType,
            quantity: parseQuantity(item.quantity), // CORRIGIDO: Normalizar quantidade
            recipe_name: recipe?.name || item.recipe_name // Garantir nome da receita
          };
        });

        // Filtrar categorias excluídas
        const filteredItems = itemsWithCategory.filter(item =>
          !shouldExcludeCategory(item.category)
        );

        const groupedByCategory = groupItemsByCategory(filteredItems);
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

          // Verificar se a categoria deve ser excluída
          const recipe = recipes?.find(r => r.id === item.recipe_id);
          const category = recipe?.category || item.category || 'Outros';
          if (shouldExcludeCategory(category)) return;

          // CORRIGIDO: Sempre usar recipe_id como chave para consolidação correta
          // unique_id é específico de cada pedido e causa duplicatas
          const key = item.recipe_id || item.recipe_name;

          if (itemsMap.has(key)) {
            const existing = itemsMap.get(key);
            const correctUnitType = getCorrectUnitType(item, recipe);
            const addQuantity = parseQuantity(item.quantity);

            // Verificar se unidades são compatíveis após sincronização
            if (existing.unit_type !== correctUnitType) {
              existing.unit_type = correctUnitType;
            }

            existing.quantity += addQuantity;
            existing.total_price += validateAmount(item.total_price);

            // Concatenar notas se existirem
            if (item.notes && item.notes.trim()) {
              if (existing.notes && existing.notes.trim()) {
                // Evitar duplicar a mesma nota
                if (!existing.notes.includes(item.notes.trim())) {
                  existing.notes = `${existing.notes}; ${item.notes.trim()}`;
                }
              } else {
                existing.notes = item.notes.trim();
              }
            }
          } else {
            // Para consolidação: sincronizar com ficha técnica atual
            const correctUnitType = getCorrectUnitType(item, recipe);

            const consolidatedItem = {
              ...item,
              category: recipe?.category || item.category || 'Outros',
              quantity: parseQuantity(item.quantity),
              total_price: validateAmount(item.total_price),
              unit_type: correctUnitType, // Usar unidade sincronizada
              recipe_name: recipe?.name || item.recipe_name, // Garantir nome da receita
              unique_id: key // Usar recipe_id como unique_id consolidado
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
  }, [recipes, groupItemsByCategory, getOrderedCategories, excludeCategories]);

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