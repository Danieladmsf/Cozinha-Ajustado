import { Order } from "@/app/api/entities";
import { 
  parseQuantity as utilParseQuantity, 
  normalizeOrderItems as utilNormalizeOrderItems 
} from "@/components/utils/orderUtils";

/**
 * Utilitários para sincronização de pedidos entre portal do cliente e sistema da cozinha
 */

/**
 * Converte pedido do portal do cliente para o formato da cozinha
 */
export const convertClientOrderToKitchenFormat = (clientOrder, customer, recipes, menu) => {
  if (!clientOrder || !customer) return null;

  const normalizedItems = clientOrder.items?.map(item => {
    const recipe = recipes.find(r => r.id === item.recipe_id);
    if (!recipe) return null;

    return {
      recipe_id: item.recipe_id,
      recipe_name: item.recipe_name || recipe.name,
      category: item.category || recipe.category,
      unit_type: item.unit_type || (recipe.cuba_weight > 0 ? "cuba" : "kg"),
      quantity: utilParseQuantity(item.quantity),
      unit_price: item.unit_price || 0,
      total_price: utilParseQuantity(item.quantity) * (item.unit_price || 0),
      notes: item.notes || "",
      suggested_quantity: 0, // Cliente não tem sugestões
      cuba_weight: utilParseQuantity(recipe.cuba_weight) || 0,
      // Campos de porcionamento para compatibilidade com a cozinha
      base_quantity_for_portioning: utilParseQuantity(item.quantity),
      portioning_percentage: 0
    };
  }).filter(Boolean) || [];

  return {
    id: clientOrder.id,
    customer_id: customer.id,
    customer_name: customer.name,
    week_number: clientOrder.week_number,
    year: clientOrder.year,
    day_of_week: clientOrder.day_of_week,
    date: clientOrder.date,
    status: clientOrder.status || "pending",
    items: normalizedItems,
    total_items: normalizedItems.reduce((sum, item) => sum + item.quantity, 0),
    total_amount: normalizedItems.reduce((sum, item) => sum + item.total_price, 0),
    total_meals_expected: parseInt(clientOrder.total_meals_expected) || 0,
    general_notes: clientOrder.general_notes || "",
    menu_id: menu?.id || clientOrder.menu_id,
    // Campos adicionais para rastreamento
    source: "client_portal",
    created_date: clientOrder.createdAt,
    updated_date: clientOrder.updatedAt
  };
};

/**
 * Valida se o cliente tem acesso ao pedido
 */
export const validateClientAccess = (customerId, order) => {
  if (!customerId || !order) return false;
  return order.customer_id === customerId;
};

/**
 * Aplica regras de negócio específicas do portal do cliente
 */
export const applyClientPortalRules = (orderData, customer) => {
  // Status automático baseado no tipo de cliente
  let status = "pending";
  
  if (customer.auto_approve_orders) {
    status = "approved";
  } else if (customer.category === "vip") {
    status = "priority";
  }

  // Limites de pedido por cliente
  const maxItems = customer.max_items_per_order || 999;
  const limitedItems = orderData.items?.slice(0, maxItems) || [];

  return {
    ...orderData,
    status,
    items: limitedItems,
    total_items: limitedItems.reduce((sum, item) => sum + utilParseQuantity(item.quantity), 0),
    total_amount: limitedItems.reduce((sum, item) => sum + item.total_price, 0),
    client_notes: `Pedido via portal do cliente - ${new Date().toLocaleString()}`,
    compliance: {
      max_items_enforced: orderData.items?.length > maxItems,
      auto_approved: customer.auto_approve_orders,
      priority_customer: customer.category === "vip"
    }
  };
};

/**
 * Formata notificação para a cozinha sobre novo pedido do cliente
 */
export const createKitchenNotification = (order, customer) => {
  const itemCount = order.items?.length || 0;
  const totalItems = order.total_items || 0;
  const totalAmount = order.total_amount || 0;

  return {
    type: "new_client_order",
    title: `Novo pedido - ${customer.name}`,
    message: `${itemCount} tipos de itens, total: ${totalItems} unidades`,
    amount: totalAmount,
    customer_id: customer.id,
    order_id: order.id,
    day_of_week: order.day_of_week,
    week_number: order.week_number,
    year: order.year,
    priority: customer.category === "vip" ? "high" : "normal",
    timestamp: new Date().toISOString()
  };
};

/**
 * Sincroniza pedido do cliente com o sistema da cozinha
 */
export const syncClientOrderToKitchen = async (clientOrderData, customer, recipes, menu) => {
  try {
    // Converter para formato da cozinha
    const kitchenFormatOrder = convertClientOrderToKitchenFormat(
      clientOrderData, 
      customer, 
      recipes, 
      menu
    );

    if (!kitchenFormatOrder) {
      throw new Error("Erro na conversão do pedido");
    }

    // Aplicar regras de negócio
    const finalOrderData = applyClientPortalRules(kitchenFormatOrder, customer);

    // Salvar ou atualizar no banco
    let savedOrder;
    if (finalOrderData.id) {
      savedOrder = await Order.update(finalOrderData.id, finalOrderData);
    } else {
      savedOrder = await Order.create(finalOrderData);
    }

    // Criar notificação para a cozinha (pode ser implementado depois)
    const notification = createKitchenNotification(savedOrder, customer);
    

    return {
      success: true,
      order: savedOrder,
      notification
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Busca pedidos do cliente com formatação para o portal
 */
export const getClientOrders = async (customerId, filters = {}) => {
  try {
    const queryFilters = [
      { field: 'customer_id', operator: '==', value: customerId }
    ];

    // Adicionar filtros opcionais
    if (filters.weekNumber) {
      queryFilters.push({ field: 'week_number', operator: '==', value: filters.weekNumber });
    }
    if (filters.year) {
      queryFilters.push({ field: 'year', operator: '==', value: filters.year });
    }
    if (filters.dayOfWeek) {
      queryFilters.push({ field: 'day_of_week', operator: '==', value: filters.dayOfWeek });
    }

    const orders = await Order.query(queryFilters);
    
    // Formatar para o portal do cliente (remover dados sensíveis da cozinha)
    return orders.map(order => ({
      id: order.id,
      date: order.date,
      day_of_week: order.day_of_week,
      week_number: order.week_number,
      year: order.year,
      status: order.status,
      items: order.items?.map(item => ({
        recipe_id: item.recipe_id,
        recipe_name: item.recipe_name,
        category: item.category,
        quantity: item.quantity,
        unit_type: item.unit_type,
        total_price: item.total_price,
        notes: item.notes
      })) || [],
      total_items: order.total_items,
      total_amount: order.total_amount,
      total_meals_expected: order.total_meals_expected,
      general_notes: order.general_notes,
      created_date: order.createdAt,
      updated_date: order.updatedAt
    }));

  } catch (error) {
    throw error;
  }
};