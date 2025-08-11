/**
 * ARQUIVO TEMPORÁRIO - Calculadora de Preços para Receitas
 * Fórmula: 40% custo operacional + 50% lucro
 * 
 * Este arquivo aplica a seguinte lógica:
 * - Custo base da receita (100%)
 * - + 40% custo operacional
 * - + 50% lucro
 * - = Preço final (190% do custo base)
 */

export class TempPricingCalculator {
  constructor() {
    this.operationalCostPercentage = 0.40; // 40%
    this.profitMarginPercentage = 0.50;    // 50%
  }

  /**
   * Calcula o preço final de uma receita
   * @param {number} baseCost - Custo base da receita
   * @returns {number} Preço final com margem aplicada
   */
  calculateFinalPrice(baseCost) {
    if (!baseCost || baseCost <= 0) {
      throw new Error('Custo base deve ser maior que zero');
    }

    const operationalCost = baseCost * this.operationalCostPercentage;
    const profitMargin = baseCost * this.profitMarginPercentage;
    
    return baseCost + operationalCost + profitMargin;
  }

  /**
   * Aplica o cálculo a múltiplas receitas
   * @param {Array} recipes - Array de objetos com propriedade 'cost'
   * @returns {Array} Array com preços calculados
   */
  applyToRecipes(recipes) {
    return recipes.map(recipe => ({
      ...recipe,
      originalCost: recipe.cost,
      operationalCost: recipe.cost * this.operationalCostPercentage,
      profitMargin: recipe.cost * this.profitMarginPercentage,
      finalPrice: this.calculateFinalPrice(recipe.cost),
      markup: ((this.calculateFinalPrice(recipe.cost) - recipe.cost) / recipe.cost * 100).toFixed(1)
    }));
  }

  /**
   * Calcula detalhamento do preço
   * @param {number} baseCost - Custo base
   * @returns {Object} Objeto com detalhamento completo
   */
  getPriceBreakdown(baseCost) {
    const operationalCost = baseCost * this.operationalCostPercentage;
    const profitMargin = baseCost * this.profitMarginPercentage;
    const finalPrice = baseCost + operationalCost + profitMargin;

    return {
      baseCost: baseCost,
      operationalCost: operationalCost,
      profitMargin: profitMargin,
      finalPrice: finalPrice,
      totalMarkup: ((finalPrice - baseCost) / baseCost * 100).toFixed(1) + '%'
    };
  }
}

// Função utilitária para uso direto
export function calculateRecipePrice(baseCost) {
  const calculator = new TempPricingCalculator();
  return calculator.calculateFinalPrice(baseCost);
}

// Para debug/teste
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.TempPricingCalculator = TempPricingCalculator;
  window.calculateRecipePrice = calculateRecipePrice;
  
  console.log('🧮 Calculadora de preços temporária carregada');
  console.log('Exemplo de uso:');
  console.log('calculateRecipePrice(100) =', calculateRecipePrice(100));
}