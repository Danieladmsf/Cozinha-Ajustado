/**
 * Sistema centralizado de preços para o Portal do Cliente
 * 
 * Esta biblioteca centraliza a aplicação de preços em todo o portal,
 * garantindo consistência entre todas as abas e componentes.
 */

import { PortalDataSync } from './portal-data-sync';

const getAvailableUnits = () => {
  return [
    { value: "kg", label: "Kg" },
    { value: "cuba", label: "Cuba" },
    { value: "unid.", label: "Unid." },
    { value: "litro", label: "Litro" },
    { value: "ml", label: "ml" }
  ];
};

const isValidUnitType = (unitType) => {
  const availableUnits = getAvailableUnits();
  return availableUnits.some(unit => unit.value === unitType);
};

export class PortalPricingSystem {
  static appSettings = { operational_cost_per_kg: 0, profit_margin: 0 };
  static isInitialized = false;

  static async init(settings) {
    PortalPricingSystem.appSettings = settings;
    this.isInitialized = true;
  }

  /**
   * Aplica política de preços configurada
   * @param {number} basePrice - Preço base original
   * @returns {number} Preço com política aplicada
   */
  static applyPricingPolicy(basePrice) {
    const price = parseFloat(basePrice) || 0;
    // Aqui pode ser implementada lógica de desconto/acréscimo no futuro
    return price;
  }

  /**
   * Recalcula o unit_price de um item usando a receita atual
   * @param {Object} item - Item que precisa do preço recalculado
   * @param {Object} recipe - Receita correspondente
   * @param {string} containerType - Tipo de container (cuba, kg, etc)
   * @returns {number} Novo unit_price com fórmula aplicada
   */
  static recalculateItemUnitPrice(item, recipe, containerType = null) {
    if (!this.isInitialized) {
      return item.unit_price || 0;
    }
    if (!recipe) {
      return 0;
    }

    const operationalCost = PortalPricingSystem.appSettings.operational_cost_per_kg || 0;
    const profitMargin = PortalPricingSystem.appSettings.profit_margin || 0;

    const unitType = (containerType || this.getRecipeUnitType(recipe)).toLowerCase();

    let basePrice = 0;
    let recipeWeightInKg = 0;

    if (unitType.startsWith('cuba')) {
      basePrice = this.parseQuantity(recipe.cuba_cost) || this.parseQuantity(recipe.portion_cost) || 0;
      recipeWeightInKg = this.parseQuantity(recipe.cuba_weight) || 0;
    } else if (unitType === 'kg') {
      basePrice = this.parseQuantity(recipe.cost_per_kg_yield) || 0;
      recipeWeightInKg = 1; // Para kg, o peso é sempre 1
    } else if (unitType.startsWith('unid')) {
      basePrice = this.parseQuantity(recipe.unit_cost) || this.parseQuantity(recipe.portion_cost) || 0;
      // Para unidade, o peso deve ser o peso da unidade, ou da porção, ou da cuba se for unitário.
      recipeWeightInKg = this.parseQuantity(recipe.unit_weight) || this.parseQuantity(recipe.cuba_weight) || 0;
    } else {
      // Fallback para outros tipos. Tenta usar o custo e peso da porção.
      basePrice = this.parseQuantity(recipe.portion_cost) || this.parseQuantity(recipe.cuba_cost) || 0;
      recipeWeightInKg = this.parseQuantity(recipe.portion_weight_calculated) || this.parseQuantity(recipe.cuba_weight) || 0;
    }

    // Se o preço base ainda for zero, tenta o custo por kg como último recurso.
    if (basePrice === 0) {
        basePrice = this.parseQuantity(recipe.cost_per_kg_yield) || 0;
        // Se o peso não foi definido, não podemos aplicar um custo por kg.
        if (recipeWeightInKg === 0 && basePrice > 0) recipeWeightInKg = 1; 
    }

    let finalPrice = basePrice + (operationalCost * recipeWeightInKg);
    
    finalPrice = finalPrice * (1 + (profitMargin / 100));

    const finalPriceWithPolicy = this.applyPricingPolicy(finalPrice);

    return finalPriceWithPolicy;
  }

  /**
   * Sincroniza preços de um item com base na receita atual
   * ATUALIZADO: Usa PortalDataSync para evitar conflitos
   * @param {Object} item - Item a ser sincronizado
   * @param {Object} recipe - Receita correspondente
   * @returns {Object} Item com preços atualizados
   */
  static syncItemPricing(item, recipe) {
    if (!recipe || !item) return item;

    // Usar sistema unificado de sincronização
    return PortalDataSync.syncItemSafely(item, recipe);
  }

  /**
   * Sincroniza preços de uma lista de itens
   * @param {Array} items - Lista de itens
   * @param {Array} recipes - Lista de receitas para referência
   * @returns {Array} Lista com preços sincronizados
   */
  static syncItemsListPricing(items, recipes) {
    if (!Array.isArray(items) || !Array.isArray(recipes)) return items;

    return items.map(item => {
      const recipe = recipes.find(r => r.id === item.recipe_id);
      return this.syncItemPricing(item, recipe);
    });
  }

  /**
   * Determina o tipo de unidade padrão para uma receita
   * @param {Object} recipe - Receita
   * @returns {string} Tipo de unidade (cuba, kg, unid, etc)
   */
  static getRecipeUnitType(recipe) {
    if (!recipe) return 'cuba';

    // 1. Prioritize unit_type if it's valid
    if (recipe.unit_type && isValidUnitType(recipe.unit_type)) {
      return recipe.unit_type;
    }

    // 2. Check for container_type in preparations
    if (recipe.preparations && Array.isArray(recipe.preparations)) {
      for (const prep of recipe.preparations) {
        if (prep.assembly_config && prep.assembly_config.container_type) {
          return prep.assembly_config.container_type;
        }
      }
    }

    // 3. Fallback to cuba_weight
    if (recipe.cuba_weight && parseFloat(recipe.cuba_weight) > 0) {
      return 'cuba';
    }

    // 4. Default
    return 'kg';
  }

  /**
   * Utilitário para parsing de quantidades (similar ao usado no portal)
   * @param {*} value - Valor a ser parseado
   * @returns {number} Valor numérico
   */
  static parseQuantity(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    if (typeof value === 'string') {
      const cleanedValue = value.replace(/[^\d,.-]/g, '').replace(',', '.');
      const num = parseFloat(cleanedValue);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }
}

export default PortalPricingSystem;