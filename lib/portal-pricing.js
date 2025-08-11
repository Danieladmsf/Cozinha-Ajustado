/**
 * Sistema centralizado de preços temporário para o Portal do Cliente
 * 
 * APLICAÇÃO TEMPORÁRIA: 40% custo operacional + 50% lucro (1.9x o preço original)
 * 
 * Esta biblioteca centraliza a aplicação da nova fórmula de preços em todo o portal,
 * garantindo consistência entre todas as abas e componentes.
 */

export class PortalPricingSystem {
  /**
   * Multiplicador temporário: 40% custo operacional + 50% lucro
   * @constant {number}
   */
  static TEMP_MULTIPLIER = 1.9;

  /**
   * Aplica a fórmula temporária de preços a um preço base
   * @param {number} basePrice - Preço base original
   * @returns {number} Preço ajustado com a nova fórmula
   */
  static applyTempPricing(basePrice) {
    const price = parseFloat(basePrice) || 0;
    return price * this.TEMP_MULTIPLIER;
  }

  /**
   * Recalcula o unit_price de um item usando a receita atual
   * @param {Object} item - Item que precisa do preço recalculado
   * @param {Object} recipe - Receita correspondente
   * @param {string} containerType - Tipo de container (cuba, kg, etc)
   * @returns {number} Novo unit_price com fórmula aplicada
   */
  static recalculateItemUnitPrice(item, recipe, containerType = null) {
    if (!recipe) return 0;

    // Determinar tipo de container se não fornecido
    if (!containerType) {
      containerType = this.getRecipeUnitType(recipe);
    }

    // Obter preço base da receita
    let basePrice = 0;
    if (containerType === "cuba") {
      basePrice = this.parseQuantity(recipe.cuba_cost) || this.parseQuantity(recipe.portion_cost) || this.parseQuantity(recipe.cost_per_kg_yield) || 0;
    } else if (containerType === "kg") {
      basePrice = this.parseQuantity(recipe.cost_per_kg_yield) || this.parseQuantity(recipe.portion_cost) || this.parseQuantity(recipe.cuba_cost) || 0;
    } else {
      // Para outros tipos (unid, etc)
      const specificField = `${containerType}_cost`;
      if (recipe[specificField] && typeof recipe[specificField] === 'number') {
        basePrice = this.parseQuantity(recipe[specificField]);
      } else {
        basePrice = this.parseQuantity(recipe.portion_cost) || this.parseQuantity(recipe.cuba_cost) || this.parseQuantity(recipe.cost_per_kg_yield) || 0;
      }
    }

    // Aplicar fórmula temporária
    return this.applyTempPricing(basePrice);
  }

  /**
   * Sincroniza preços de um item com base na receita atual
   * @param {Object} item - Item a ser sincronizado
   * @param {Object} recipe - Receita correspondente
   * @returns {Object} Item com preços atualizados
   */
  static syncItemPricing(item, recipe) {
    if (!recipe || !item) return item;

    const containerType = item.unit_type || item.ordered_unit_type || this.getRecipeUnitType(recipe);
    const newUnitPrice = this.recalculateItemUnitPrice(item, recipe, containerType);
    
    // Manter quantities existentes, apenas atualizar preços
    const quantity = this.parseQuantity(item.quantity) || this.parseQuantity(item.ordered_quantity) || 0;
    
    console.log(`🔄 [PORTAL PRICING SYNC] ${recipe.name}:`, {
      originalUnitPrice: item.unit_price,
      newUnitPrice: newUnitPrice,
      quantity: quantity,
      containerType: containerType
    });

    return {
      ...item,
      unit_price: newUnitPrice,
      total_price: quantity * newUnitPrice
    };
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
    
    // Lógica similar à existente no portal
    if (recipe.cuba_weight && parseFloat(recipe.cuba_weight) > 0) {
      return 'cuba';
    }
    
    // Se não tem cuba_weight, verificar outros campos
    if (recipe.unit_type) {
      return recipe.unit_type;
    }
    
    // Default
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