// components/utils/wasteLogic.js

import { parseQuantity as utilParseQuantity } from "./orderUtils";

/**
 * Valida e converte um valor para número, tratando strings com vírgula.
 * Se a conversão falhar, retorna o valor padrão.
 * @param {string|number} value - O valor a ser convertido.
 * @param {number} [defaultValue=0] - O valor padrão a ser retornado se a conversão falhar.
 * @returns {number} O valor numérico.
 */
function validateNumericInput(value, defaultValue = 0) {
    if (value === null || value === undefined) return defaultValue;
    const num = parseFloat(String(value).replace(',', '.'));
    return isNaN(num) || !isFinite(num) ? defaultValue : num;
}

/**
 * Prepara os itens para exibição no registro de sobras.
 * @param {object} customer - O cliente selecionado.
 * @param {number} dayIndex - O dia da semana (1-Seg, 5-Sex).
 * @param {object} menuDataForDay - Dados do cardápio para o dia específico.
 * @param {Array} recipes - Lista completa de receitas.
 * @param {object} existingWasteRecord - Registro de OrderWaste existente para este contexto.
 * @param {Array} ordersForWeek - Pedidos da semana do cliente.
 * @returns {Array} Lista de itens formatados para o WasteRegister.
 */
export function prepareWasteItemsForDisplay(
    customer,
    dayIndex,
    menuDataForDay,
    recipes,
    existingWasteRecord,
    ordersForWeek
) {
    if (!customer || !menuDataForDay) {
        return [];
    }

    const itemsForWaste = [];
    const orderForThisDay = ordersForWeek?.find(o =>
        o.customer_id === customer.id &&
        o.day_of_week === dayIndex
    );

    Object.entries(menuDataForDay).forEach(([categoryId, categoryItems]) => {
        if (!Array.isArray(categoryItems)) return;

        categoryItems.forEach(menuItem => {
            if (!menuItem.recipe_id) return;

            const appliesToCustomer = !menuItem.locations ||
                menuItem.locations.length === 0 ||
                menuItem.locations.includes(customer.id);

            if (appliesToCustomer) {
                const recipeDetails = recipes.find(r => r.id === menuItem.recipe_id);
                if (!recipeDetails) return;

                const orderItemDetails = orderForThisDay?.items?.find(i => i.recipe_id === menuItem.recipe_id);
                
                const existingWasteItemData = existingWasteRecord?.items?.find(
                    wi => wi.recipe_id === menuItem.recipe_id
                );

                const defaultUnitType = recipeDetails.cuba_weight && recipeDetails.cuba_weight > 0 ? "cuba" : "kg";

                itemsForWaste.push({
                    recipe_id: menuItem.recipe_id,
                    recipe_name: recipeDetails.name,
                    category: recipeDetails.category || categoryId,
                    
                    order_quantity: validateNumericInput(orderItemDetails?.quantity, 0),
                    order_unit_type: orderItemDetails?.unit_type || defaultUnitType,
                    
                    internal_waste_quantity: validateNumericInput(existingWasteItemData?.internal_waste_quantity, 0),
                    internal_waste_unit_type: existingWasteItemData?.internal_waste_unit_type || defaultUnitType,
                    
                    client_returned_quantity: validateNumericInput(existingWasteItemData?.client_returned_quantity, 0),
                    client_returned_unit_type: existingWasteItemData?.client_returned_unit_type || defaultUnitType,
                    
                    payment_percentage: validateNumericInput(existingWasteItemData?.payment_percentage, 100),
                    
                    notes: existingWasteItemData?.notes || "",
                    
                    // Dados da receita para cálculos
                    cuba_weight_kg: utilParseQuantity(recipeDetails.cuba_weight), // Assumindo que cuba_weight é em kg
                    cost_per_kg_yield: utilParseQuantity(recipeDetails.cost_per_kg_yield)
                });
            }
        });
    });
    return itemsForWaste;
}

/**
 * Calcula os totais de sobras, pesos e valores de desconto.
 * IMPORTANTE: O valor financeiro é calculado APENAS com base na sobra do cliente.
 * @param {Array} wasteItems - Lista de itens de sobra com entradas do usuário.
 * @returns {object} Objeto com os totais calculados e os itens com seus valores finais.
 */
export function calculateWasteTotalsAndDiscount(wasteItems) {
    let totalInternalWasteWeightKg = 0;
    let totalClientReturnedWeightKg = 0;
    let totalCombinedWasteWeightKg = 0;
    let totalOriginalValueOfWasteItems = 0; 
    let totalDiscountValueApplied = 0;
    let finalValueToChargeForWastedItems = 0;

    const itemsPayloadWithFinalValue = wasteItems.map(item => {
        // Validate inputs once at the beginning of the map iteration for this item
        const internalWasteQty = validateNumericInput(item.internal_waste_quantity);
        const clientReturnedQty = validateNumericInput(item.client_returned_quantity);
        const paymentPercentage = validateNumericInput(item.payment_percentage, 100); // Keep as percentage for storing
        const paymentPercentageDecimal = paymentPercentage / 100; // Use decimal for calculations

        // Calcular peso da sobra interna (apenas para controle)
        let itemInternalWasteKg = 0;
        if (item.internal_waste_unit_type === 'cuba') {
            itemInternalWasteKg = internalWasteQty * item.cuba_weight_kg;
        } else { // kg
            itemInternalWasteKg = internalWasteQty;
        }
        totalInternalWasteWeightKg += itemInternalWasteKg;

        // Calcular peso da sobra do cliente (apenas para controle)
        let itemClientReturnedKg = 0;
        if (item.client_returned_unit_type === 'cuba') {
           itemClientReturnedKg = clientReturnedQty * item.cuba_weight_kg;
        } else { // kg
           itemClientReturnedKg = clientReturnedQty;
        }
        totalClientReturnedWeightKg += itemClientReturnedKg;

        // CÁLCULO FINANCEIRO: Usar APENAS a sobra do cliente
        let originalValueThisItemWasted = 0;
        let valueToChargeThisItem = 0;

        if (clientReturnedQty > 0) {
            let pricePerUnitForDiscount;
            if (item.client_returned_unit_type === 'cuba') {
                pricePerUnitForDiscount = item.cost_per_kg_yield * item.cuba_weight_kg;
            } else { // kg
                pricePerUnitForDiscount = item.cost_per_kg_yield;
            }

            originalValueThisItemWasted = clientReturnedQty * pricePerUnitForDiscount;
            totalOriginalValueOfWasteItems += originalValueThisItemWasted;

            valueToChargeThisItem = originalValueThisItemWasted * paymentPercentageDecimal;
            finalValueToChargeForWastedItems += valueToChargeThisItem;
            
            totalDiscountValueApplied += (originalValueThisItemWasted - valueToChargeThisItem);
        }
        
        return {
            ...item, // Mantém os campos originais do item
            // Adiciona/atualiza os campos numéricos validados e o valor final do item
            internal_waste_quantity: internalWasteQty,
            client_returned_quantity: clientReturnedQty,
            payment_percentage: paymentPercentage, // Store the validated original percentage
            final_value_this_item: valueToChargeThisItem, // Novo campo (baseado APENAS na sobra do cliente)
        };
    });
    
    totalCombinedWasteWeightKg = totalInternalWasteWeightKg + totalClientReturnedWeightKg;

    // Formata o items_payload final para o backend
    const finalItemsPayloadForBackend = itemsPayloadWithFinalValue.map(item => ({
        recipe_id: item.recipe_id,
        recipe_name: item.recipe_name,
        category: item.category,
        order_quantity: validateNumericInput(item.order_quantity),
        order_unit_type: item.order_unit_type,
        internal_waste_quantity: item.internal_waste_quantity,
        internal_waste_unit_type: item.internal_waste_unit_type,
        client_returned_quantity: item.client_returned_quantity,
        client_returned_unit_type: item.client_returned_unit_type,
        payment_percentage: item.payment_percentage,
        notes: item.notes,
    }));

    return {
        total_internal_waste_weight_kg: totalInternalWasteWeightKg,
        total_client_returned_weight_kg: totalClientReturnedWeightKg,
        total_combined_waste_weight_kg: totalCombinedWasteWeightKg,
        total_original_value_of_waste: totalOriginalValueOfWasteItems,
        total_discount_value_applied: totalDiscountValueApplied,
        final_value_after_discount: finalValueToChargeForWastedItems,
        items_payload: finalItemsPayloadForBackend, // Itens formatados para o backend
        // Retorna os itens com o valor final para uso na UI antes do salvamento
        items_with_final_value_for_ui: itemsPayloadWithFinalValue 
    };
}