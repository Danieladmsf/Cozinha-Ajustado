/**
 * Sistema unificado de sincronização de dados para o Portal
 * Previne conflitos de hidratação e garante consistência
 */

import { parseQuantity } from '@/components/utils/orderUtils';
import { getRecipeUnitType } from '@/lib/unitTypeUtils';

export class PortalDataSync {
  
  /**
   * Preserva dados originais da receita durante sincronização
   * @param {Object} item - Item sendo sincronizado
   * @param {Object} recipe - Receita de referência
   * @returns {Object} Item com dados preservados
   */
  static preserveRecipeData(item, recipe) {
    if (!recipe) {
      return item;
    }
    
    const preservedData = {
      // Dados de peso da receita (nunca devem ser perdidos)
      recipe_cuba_weight: parseQuantity(recipe.cuba_weight) || 0,
      recipe_yield_weight: parseQuantity(recipe.yield_weight) || 0,
      recipe_total_weight: parseQuantity(recipe.total_weight) || 0,
      
      // Dados de custo da receita
      recipe_cuba_cost: parseQuantity(recipe.cuba_cost) || 0,
      recipe_portion_cost: parseQuantity(recipe.portion_cost) || 0,
      recipe_cost_per_kg_yield: parseQuantity(recipe.cost_per_kg_yield) || 0,
    };
    
    return {
      ...item,
      ...preservedData
    };
  }
  
  /**
   * Calcula peso total sem perder dados originais
   * @param {Object} item - Item com dados preservados
   * @returns {number} Peso total calculado
   */
  static calculateSafeWeight(item) {
    if (!item) {
      return 0;
    }
    
    const quantity = parseQuantity(item.quantity) || parseQuantity(item.base_quantity) || 0;
    const unitType = (item.unit_type || '').toLowerCase();
    
    // Usar dados preservados da receita
    let cubaWeight = item.recipe_cuba_weight || 0;
    const yieldWeight = item.recipe_yield_weight || 0;
    
    // Fallback para yield_weight se cuba_weight for zero
    if (cubaWeight === 0) {
      cubaWeight = yieldWeight;
    }
    
    let totalWeight = 0;
    
    if (unitType === 'cuba' || unitType === 'cuba-g') {
      totalWeight = cubaWeight * quantity;
    } else if (unitType === 'kg') {
      totalWeight = quantity; // Quantidade já é o peso
    } else if (unitType === 'unid' || unitType === 'unid.' || unitType === 'unidade') {
      totalWeight = cubaWeight * quantity;
    }
    

    
    return totalWeight;
  }
  
  /**
   * Calcula preço unitário sem perder dados originais
   * @param {Object} item - Item com dados preservados
   * @returns {number} Preço unitário
   */
  static calculateSafePrice(item) {
    if (!item) {
      return 0;
    }
    
    const unitType = (item.unit_type || '').toLowerCase();
    let basePrice = 0;
    
    if (unitType === 'cuba') {
      basePrice = item.recipe_cuba_cost || item.recipe_portion_cost || item.recipe_cost_per_kg_yield || 0;
    } else if (unitType === 'kg') {
      basePrice = item.recipe_cost_per_kg_yield || item.recipe_portion_cost || item.recipe_cuba_cost || 0;
    } else {
      basePrice = item.recipe_portion_cost || item.recipe_cuba_cost || item.recipe_cost_per_kg_yield || 0;
    }
    

    
    return basePrice;
  }
  
  /**
   * Sincronização completa e segura de um item
   * @param {Object} item - Item original
   * @param {Object} recipe - Receita de referência
   * @returns {Object} Item totalmente sincronizado
   */
  static syncItemSafely(item, recipe) {
    if (!recipe || !item) {
      return item;
    }
    
    // 1. Preservar dados da receita
    let syncedItem = this.preserveRecipeData(item, recipe);
    
    // 2. Atualizar unit_type se necessário
    const currentUnitType = getRecipeUnitType(recipe);
    syncedItem.unit_type = currentUnitType;
    
    // 3. PRESERVAR o unit_price original se já estiver definido, caso contrário, calcular o preço base
    // A lógica de cálculo de preço com custo operacional e margem de lucro deve vir do PortalPricingSystem
    syncedItem.unit_price = item.unit_price !== undefined && item.unit_price !== null
      ? item.unit_price // Usar o unit_price que já vem no item (assumindo que já foi calculado pelo PortalPricingSystem)
      : this.calculateSafePrice(syncedItem); // Fallback para o cálculo de preço base se não houver unit_price
    
    // 4. Calcular preço total
    const quantity = parseQuantity(syncedItem.quantity) || parseQuantity(syncedItem.ordered_quantity) || 0;
    syncedItem.total_price = quantity * syncedItem.unit_price;
    

    
    // 5. Calcular peso total (usando dados preservados)
    syncedItem.calculated_total_weight = this.calculateSafeWeight(syncedItem);
    
    // 6. Manter campos de exibição para compatibilidade
    syncedItem.cuba_weight = syncedItem.recipe_cuba_weight;
    syncedItem.yield_weight = syncedItem.recipe_yield_weight;
    syncedItem.total_weight = syncedItem.calculated_total_weight;
    
    return syncedItem;
  }
  
  /**
   * Sincronização em lote para melhor performance
   * @param {Array} items - Lista de itens
   * @param {Array} recipes - Lista de receitas
   * @returns {Array} Lista sincronizada
   */
  static syncItemsBatch(items, recipes) {
    if (!Array.isArray(items) || !Array.isArray(recipes)) return items || [];
    
    return items.map(item => {
      const recipe = recipes.find(r => r.id === item.recipe_id);
      return this.syncItemSafely(item, recipe);
    });
  }
}