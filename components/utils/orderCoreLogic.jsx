
import { format, addDays } from "date-fns";
import { parseQuantity, normalizeOrderItems } from "./orderUtils"; // Caminho ajustado se estiver na mesma pasta
import { parseQuantity as utilParseQuantity } from "./orderUtils"; // Adicionar se ainda não estiver

/**
 * Gera o objeto de pedido para exibição na UI, seja um existente ou um novo.
 */
export function generateDisplayOrder({
  selectedCustomer,
  currentDay,
  orders, // Pedidos da semana já carregados
  recipes, // Todas as receitas
  weeklyMenus, // Cardápios da semana
  currentDate, // Data atual (para determinar a data exata do pedido)
  weekNumber,
  year,
  weekStart,
  // Funções que antes eram do componente Orders, agora passadas como dependência
  getMenuForDay, // (day, weeklyMenus) => menu | null
  getMenuItemsForDay, // (day, customer, menu, recipes, calculateSuggestion) => items[]
  calculateSuggestion, // (recipeId, recipeName, mealsExpected, allOrdersHistory, selectedCustomer, currentDay, currentDate) => number | null
  allOrdersHistory, // Necessário para calculateSuggestion
  debugLog = () => {} // Função de log opcional
}) {
  debugLog('[generateDisplayOrder] INÍCIO', { selectedCustomerId: selectedCustomer?.id, currentDay });

  if (!selectedCustomer || !currentDate) {
    debugLog('[generateDisplayOrder] Sem cliente ou data, retornando nulo.');
    return null;
  }

  const existingOrder = orders.find(order => 
    order.customer_id === selectedCustomer.id && 
    order.day_of_week === currentDay &&
    order.week_number === weekNumber && // Adicionar verificação de semana e ano
    order.year === year
  );

  debugLog('[generateDisplayOrder] Pedido existente?', { found: !!existingOrder, id: existingOrder?.id });

  const menuForDay = getMenuForDay(currentDay, weeklyMenus);
  
  // Passar allOrdersHistory para calculateSuggestion, que é usado por getMenuItemsForDay
  const itemsFromMenuInCorrectOrder = getMenuItemsForDay(
    currentDay, 
    selectedCustomer, 
    menuForDay, 
    recipes, 
    (recipeId, recipeName, mealsExpected) => calculateSuggestion(recipeId, recipeName, mealsExpected, allOrdersHistory, selectedCustomer, currentDay, currentDate)
  );
  
  let orderToSet;

  if (existingOrder) {
    debugLog('[generateDisplayOrder] Pedido existente encontrado', { orderId: existingOrder.id });
    const normalizedExistingItems = normalizeOrderItems(existingOrder.items);

    const finalItems = itemsFromMenuInCorrectOrder.map(menuItemFromCard => {
      const existingItemData = normalizedExistingItems.find(
        ei => ei.recipe_id === menuItemFromCard.recipe_id
      );

      const mealsForSuggestion = parseInt(existingOrder.total_meals_expected) || 0;
      const suggestion = calculateSuggestion(menuItemFromCard.recipe_id, menuItemFromCard.recipe_name, mealsForSuggestion, allOrdersHistory, selectedCustomer, currentDay, currentDate);
      
      const recipeDetails = recipes.find(r => r.id === menuItemFromCard.recipe_id);
      let unitPriceForExisting;
      const currentUnitType = existingItemData?.unit_type || menuItemFromCard.unit_type || (recipeDetails?.cuba_weight > 0 ? "cuba" : "kg");

      if (recipeDetails) {
        if (currentUnitType === "cuba") {
          unitPriceForExisting = (recipeDetails.cost_per_kg_yield || 0) * (parseQuantity(recipeDetails.cuba_weight) || 0);
        } else { // kg
          unitPriceForExisting = recipeDetails.cost_per_kg_yield || 0;
        }
      } else {
        unitPriceForExisting = menuItemFromCard.unit_price || 0; // Fallback
      }

      let baseQtyPortioning, portionPercentage, currentQty;

      if (existingItemData) {
        portionPercentage = existingItemData.portioning_percentage === undefined ? 0 : utilParseQuantity(existingItemData.portioning_percentage);
        
        baseQtyPortioning = existingItemData.base_quantity_for_portioning === undefined 
            ? utilParseQuantity(existingItemData.quantity) 
            : utilParseQuantity(existingItemData.base_quantity_for_portioning);
        
        // NOVA FÓRMULA: (base * 2) * (percentage / 100)
        if (portionPercentage > 0) {
          currentQty = (baseQtyPortioning * 2) * (portionPercentage / 100);
        } else {
          currentQty = baseQtyPortioning; // Se porcentagem é 0, usa a base diretamente
        }

        return {
          ...menuItemFromCard, // Pega defaults como category, recipe_name daqui
          ...existingItemData, // Sobrescreve com dados salvos como notes, quantity original
          unit_type: currentUnitType,
          unit_price: unitPriceForExisting, // Preço unitário correto para a unidade salva
          quantity: currentQty, // Quantidade final calculada
          total_price: currentQty * unitPriceForExisting,
          suggested_quantity: suggestion,
          cuba_weight: parseQuantity(recipeDetails?.cuba_weight) || 0,
          base_quantity_for_portioning: baseQtyPortioning,
          portioning_percentage: portionPercentage
        };
      } else { // Item do cardápio que não estava no pedido existente
        baseQtyPortioning = suggestion !== null && suggestion > 0 ? suggestion : 0;
        portionPercentage = 0;
        currentQty = baseQtyPortioning;

        return {
          ...menuItemFromCard, // Já deve ter unit_price correto de getMenuItemsForDay
          quantity: currentQty,
          total_price: 0,
          suggested_quantity: suggestion,
          cuba_weight: parseQuantity(recipeDetails?.cuba_weight) || 0,
          base_quantity_for_portioning: baseQtyPortioning,
          portioning_percentage: portionPercentage,
        };
      }
    });
    
    orderToSet = {
      ...existingOrder,
      items: finalItems,
      total_items: finalItems.reduce((sum, item) => sum + parseQuantity(item.quantity), 0),
      total_amount: finalItems.reduce((sum, item) => sum + (item.total_price || 0), 0),
      total_meals_expected: parseInt(existingOrder.total_meals_expected) || 0,
      menu_id: menuForDay?.id || existingOrder.menu_id
    };

  } else {
    // Se não há itens no cardápio e o cliente não permite criação de pedido vazio
    if (itemsFromMenuInCorrectOrder.length === 0 && !selectedCustomer.allow_empty_order_creation) {
      debugLog('[generateDisplayOrder] Sem itens no cardápio e criação de pedido vazio não permitida.');
      return null;
    }
    
    const newItemsWithPortioningFields = itemsFromMenuInCorrectOrder.map(item => {
        const baseQty = item.suggested_quantity !== null && item.suggested_quantity > 0 ? item.suggested_quantity : 0;
        return {
            ...item,
            quantity: baseQty, // Inicialmente, quantidade é a base (sugestão)
            base_quantity_for_portioning: baseQty,
            portioning_percentage: 0,
        };
    });

    orderToSet = {
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      week_number: weekNumber,
      year: year,
      day_of_week: currentDay,
      date: format(addDays(weekStart, currentDay - 1), 'yyyy-MM-dd'),
      status: "draft",
      items: newItemsWithPortioningFields, // Já com sugestões iniciais baseadas em 0 refeições
      total_amount: 0,
      total_items: 0,
      total_meals_expected: 0, // Começa com 0
      general_notes: "",
      menu_id: menuForDay?.id
    };
  }
  debugLog('[generateDisplayOrder] Pedido a ser definido:', { orderIdSet: orderToSet.id, itemCount: orderToSet.items?.length });
  return orderToSet;
}

/**
 * Determina a ação de salvamento (criar, atualizar, deletar) e prepara os dados.
 */
export function determineSaveAction({
  orderDataToSave, // O estado atual do pedido que o usuário quer salvar
  // Não precisa de currentOrderFromState aqui se orderDataToSave já tem ID se for existente
  debugLog = () => {}
}) {
  if (!orderDataToSave || !orderDataToSave.customer_id) {
    debugLog('[determineSaveAction] ERRO: Dados do pedido inválidos.', { orderDataToSave });
    return { error: "Dados do pedido inválidos para salvar." };
  }

  const cleanItems = orderDataToSave.items?.map(item => ({
      recipe_id: item.recipe_id,
      recipe_name: item.recipe_name,
      category: item.category,
      unit_type: item.unit_type || "cuba",
      quantity: parseQuantity(item.quantity), // Usa o parseQuantity daqui
      unit_price: item.unit_price || 0,
      total_price: parseQuantity(item.quantity) * (item.unit_price || 0),
      suggested_quantity: item.suggested_quantity, // Mantém a sugestão
      notes: item.notes || "",
      base_quantity_for_portioning: parseQuantity(item.base_quantity_for_portioning),
      portioning_percentage: parseQuantity(item.portioning_percentage)
  })) || [];

  const finalOrderData = {
      ...orderDataToSave,
      items: cleanItems,
      total_items: cleanItems.reduce((sum, item) => sum + item.quantity, 0),
      total_amount: cleanItems.reduce((sum, item) => sum + item.total_price, 0),
      total_meals_expected: parseInt(orderDataToSave.total_meals_expected) || 0
  };
  
  debugLog('[determineSaveAction] Dados finais para ação:', { finalOrderDataId: finalOrderData.id, itemCount: finalOrderData.items?.length });

  const allQuantitiesZero = finalOrderData.items?.every(item => item.quantity === 0);
  const hasExpectedMeals = (finalOrderData.total_meals_expected || 0) > 0;
  const hasGeneralNotes = finalOrderData.general_notes && finalOrderData.general_notes.trim() !== "";
  const isEffectivelyEmpty = allQuantitiesZero && !hasExpectedMeals && !hasGeneralNotes;

  if (isEffectivelyEmpty) {
    if (finalOrderData.id) {
      debugLog('[determineSaveAction] Ação: Deletar pedido vazio existente.', { id: finalOrderData.id });
      return { action: 'delete', orderIdToDelete: finalOrderData.id, toastProps: { description: "Pedido zerado foi removido." } };
    } else {
      debugLog('[determineSaveAction] Ação: Ignorar novo pedido efetivamente vazio.');
      return { action: 'ignore_empty_new', toastProps: { description: "Novo pedido vazio não foi criado." } };
    }
  }
  
  if (finalOrderData.id) {
    debugLog('[determineSaveAction] Ação: Atualizar pedido existente.', { id: finalOrderData.id });
    return { action: 'update', payload: finalOrderData };
  } else {
    debugLog('[determineSaveAction] Ação: Criar novo pedido.');
    return { action: 'create', payload: finalOrderData };
  }
}

/**
 * Aplica atualizações a um objeto de pedido, recalculando totais e sugestões.
 * @param {object} currentOrderState - O estado atual do pedido.
 * @param {object|function} updatesOrItemUpdater - Objeto com campos para atualizar ou função para atualizar itens.
 * @param {object} dependencies - Objeto contendo dependências necessárias.
 * @param {array} dependencies.recipes - Lista de todas as receitas.
 * @param {array} dependencies.allOrdersHistory - Histórico de todos os pedidos (para sugestões).
 * @param {object} dependencies.selectedCustomer - Cliente selecionado.
 * @param {number} dependencies.currentDay - Dia atual da semana.
 * @param {Date} dependencies.currentDate - Data atual.
 * @param {function} dependencies.calculateSuggestion - Função para calcular sugestões.
 * @param {function} [dependencies.debugLog] - Função opcional para logging.
 * @returns {object|null} O novo estado do pedido atualizado, ou null se o pedido inicial for nulo.
 */
export function applyOrderUpdates(
  currentOrderState,
  updatesOrItemUpdater,
  dependencies
) {
  const {
    recipes,
    allOrdersHistory,
    selectedCustomer,
    currentDay,
    currentDate,
    calculateSuggestion,
    debugLog = () => {},
  } = dependencies;

  if (!currentOrderState) {
    debugLog('[applyOrderUpdates] Pedido atual é nulo, retornando nulo.');
    return null;
  }

  let newOrderData;

  if (typeof updatesOrItemUpdater === 'function') {
    const itemUpdater = updatesOrItemUpdater;
    const newItems = currentOrderState.items.map((item, index) => {
      let updatedItem = itemUpdater(item, index); // This function MUST return the whole item object

      const recipe = recipes.find(r => r.id === updatedItem.recipe_id);
      if (recipe) {
        // Recalcular unit_price se unit_type mudou
        if (updatedItem.unit_type !== item.unit_type) {
          if (updatedItem.unit_type === "cuba") {
            updatedItem.unit_price = (recipe.cost_per_kg_yield || 0) * (utilParseQuantity(recipe.cuba_weight) || 0);
          } else { // kg
            updatedItem.unit_price = recipe.cost_per_kg_yield || 0;
          }
        }
      }
      
      // Ensure all necessary fields are present after update and parsed
      updatedItem.base_quantity_for_portioning = utilParseQuantity(updatedItem.base_quantity_for_portioning);
      updatedItem.portioning_percentage = utilParseQuantity(updatedItem.portioning_percentage);
      
      // Lógica de interação Quantity vs Porcionamento:
      // Se a quantity foi alterada diretamente, base_quantity_for_portioning se torna essa nova quantity, e portioning_percentage zera.
      // Se portioning_percentage foi alterado, quantity é recalculada.
      // A função itemUpdater é responsável por implementar essa lógica específica para o campo alterado.

      // APLICAR NOVA FÓRMULA: (base * 2) * (percentage / 100)
      if (updatedItem.portioning_percentage > 0) {
        updatedItem.quantity = (updatedItem.base_quantity_for_portioning * 2) * (updatedItem.portioning_percentage / 100);
      } else {
        updatedItem.quantity = updatedItem.base_quantity_for_portioning;
      }
      
      // Recalcular total_price SEMPRE
      updatedItem.total_price = (utilParseQuantity(updatedItem.quantity) || 0) * (updatedItem.unit_price || 0);
      
      return updatedItem;
    });
    newOrderData = { ...currentOrderState, items: newItems };
  } else { // General updates (e.g., general_notes, total_meals_expected)
    newOrderData = { ...currentOrderState, ...updatesOrItemUpdater };
  }

  // Recalcular totais do pedido
  if (newOrderData.items) {
    newOrderData.total_items = newOrderData.items.reduce((sum, item) => sum + (utilParseQuantity(item.quantity) || 0), 0);
    newOrderData.total_amount = newOrderData.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  }

  const generalUpdates = typeof updatesOrItemUpdater === 'object' ? updatesOrItemUpdater : {};
  if (generalUpdates.total_meals_expected !== undefined && newOrderData.items) {
    const newMealsExpected = parseInt(generalUpdates.total_meals_expected) || 0;
    // Guardar o estado ANTES do map para consultar a quantidade original
    const itemsBeforeMealChange = [...currentOrderState.items]; 

    debugLog('[applyOrderUpdates] Recalculando sugestões devido à mudança em total_meals_expected', { newMealsExpected });
    
    newOrderData.items = newOrderData.items.map((currentItemInLoop, loopIndex) => {
      // Encontrar o estado do item ANTES da mudança no número de refeições
      // Se não encontrar (ex: item novo no cardápio que não estava no currentOrderState.items), 
      // trata como se a quantidade original fosse 0.
      const originalItemState = itemsBeforeMealChange.find(pItem => pItem.recipe_id === currentItemInLoop.recipe_id) 
                                || { quantity: 0, portioning_percentage: 0, base_quantity_for_portioning: 0 };
                                
      const originalQuantity = utilParseQuantity(originalItemState.quantity);
      const originalPortioningPercentage = utilParseQuantity(originalItemState.portioning_percentage);
      const originalBaseQtyForPortioning = utilParseQuantity(originalItemState.base_quantity_for_portioning);
      
      // A base atual do item no loop, que pode ter sido inicializada por generateDisplayOrder
      // let currentBaseQty = utilParseQuantity(currentItemInLoop.base_quantity_for_portioning); // This line is no longer needed in the new logic

      const newSuggestion = calculateSuggestion(
        currentItemInLoop.recipe_id,
        currentItemInLoop.recipe_name,
        newMealsExpected,
        allOrdersHistory,
        selectedCustomer,
        currentDay,
        currentDate
      );
      
      let finalBaseQty;
      let finalQuantity;
      let finalPortioningPercentage;

      // REGRA PRINCIPAL: Se o item tinha quantidade > 0 OU porcionamento > 0 ANTES da mudança de refeições,
      // preservamos os valores de porcionamento e base. Caso contrário, permitimos atualização automática.
      
      if (originalQuantity > 0 || originalPortioningPercentage > 0) {
        // Item já tinha valores definidos - PRESERVAR porcionamento e base existentes
        finalBaseQty = originalBaseQtyForPortioning;
        finalPortioningPercentage = originalPortioningPercentage;
        
        // Recalcular quantity com os valores preservados
        if (finalPortioningPercentage > 0) {
          finalQuantity = (finalBaseQty * 2) * (finalPortioningPercentage / 100);
        } else {
          finalQuantity = finalBaseQty;
        }
      } else {
        // Item estava zerado e sem porcionamento - PERMITIR atualização automática apenas se a nova sugestão for válida
        finalPortioningPercentage = 0;
        if (newSuggestion !== null && newSuggestion > 0) {
          finalBaseQty = newSuggestion;
          finalQuantity = finalBaseQty; // Com porcionamento 0, Qtd Final = Base
        } else {
          finalBaseQty = 0;
          finalQuantity = 0;
        }
      }
      
      // Garante que os valores finais não sejam negativos
      finalQuantity = Math.max(0, finalQuantity);
      finalBaseQty = Math.max(0, finalBaseQty);
      finalPortioningPercentage = Math.max(0, finalPortioningPercentage);

      return {
        ...currentItemInLoop,
        suggested_quantity: newSuggestion, 
        base_quantity_for_portioning: finalBaseQty, 
        quantity: finalQuantity,
        portioning_percentage: finalPortioningPercentage,
      };
    });

    newOrderData.items = newOrderData.items.map(item => ({
        ...item,
        total_price: (utilParseQuantity(item.quantity) || 0) * (item.unit_price || 0)
     }));
    newOrderData.total_amount = newOrderData.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    newOrderData.total_items = newOrderData.items.reduce((sum, item) => sum + (utilParseQuantity(item.quantity) || 0), 0);
  }
  
  debugLog('[applyOrderUpdates] Novo estado do pedido calculado:', { prevOrderId: currentOrderState.id, newOrderId: newOrderData.id, itemsCount: newOrderData.items?.length });
  return newOrderData;
}
