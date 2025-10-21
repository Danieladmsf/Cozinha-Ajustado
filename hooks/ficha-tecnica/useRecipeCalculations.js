/**
 * HOOK DE CÁLCULOS DE RECEITA - VERSÃO 2.0
 * 
 * Hook React simplificado que usa o sistema unificado de cálculos.
 * Remove duplicação e fornece interface consistente para componentes.
 * 
 * @version 2.0.0
 * @author Sistema Cozinha Afeto
 */

import { useCallback, useMemo } from 'react';
import RecipeCalculator, { parseNumber, formatters } from '@/lib/recipeCalculator';
import { updateRecipeMetrics } from '@/lib/recipeMetricsCalculator';

/**
 * Hook principal para todos os cálculos relacionados à receita
 */
export function useRecipeCalculations() {
  
  // ========================================
  // FUNÇÕES PRINCIPAIS DE CÁLCULO
  // ========================================
  
  /**
   * Calcula todas as métricas de uma receita
   * Interface simplificada para componentes React
   */
  const calculateRecipeMetrics = useCallback((preparationsData, recipeData = {}) => {
    
    if (!preparationsData || preparationsData.length === 0) {
      return RecipeCalculator.getEmptyMetrics();
    }
    
    try {
      const result = RecipeCalculator.calculateRecipeMetrics(preparationsData, recipeData);
      return result;
    } catch (error) {
      return RecipeCalculator.getEmptyMetrics();
    }
  }, []);
  
  /**
   * Atualiza métricas quando dados mudam (versão otimizada)
   */
  const updateRecipeMetricsOptimized = useCallback((preparationsData, currentMetrics = {}, recipeData = {}) => {
    
    try {
      return updateRecipeMetrics(preparationsData, currentMetrics, recipeData);
    } catch (error) {
      return RecipeCalculator.getEmptyMetrics();
    }
  }, []);
  
  // ========================================
  // FUNÇÕES DE CÁLCULOS ESPECÍFICOS
  // ========================================
  
  /**
   * Calcula peso total da montagem (assembly)
   */
  const calculateAssemblyTotalWeight = useCallback((subComponents) => {
    if (!subComponents || subComponents.length === 0) return 0;
    
    return subComponents.reduce((total, sc) => {
      const weight = parseNumber(sc.assembly_weight_kg) || 0;
      return total + weight;
    }, 0);
  }, []);
  
  /**
   * Calcula custo da cuba baseado no peso e custo por kg
   */
  const calculateCubaCost = useCallback((cubaWeight, costPerKgYield) => {
    const weight = parseNumber(cubaWeight);
    const costPerKg = parseNumber(costPerKgYield);
    return weight * costPerKg;
  }, []);
  
  /**
   * Calcula perda percentual entre dois valores
   */
  const calculateProcessLoss = useCallback((initialValue, finalValue) => {
    return RecipeCalculator.calculateLoss(initialValue, finalValue);
  }, []);
  
  // ========================================
  // FUNÇÕES DE CÁLCULOS POR PROCESSO
  // ========================================
  
  /**
   * Calcula perda no descongelamento
   */
  const calculateThawingLoss = useCallback((ingredient) => {
    const initialWeight = parseNumber(ingredient.weight_frozen);
    const finalWeight = parseNumber(ingredient.weight_thawed);
    return RecipeCalculator.calculateLoss(initialWeight, finalWeight);
  }, []);
  
  /**
   * Calcula perda na limpeza
   */
  const calculateCleaningLoss = useCallback((ingredient) => {
    const initialWeight = parseNumber(ingredient.weight_thawed) || 
                          parseNumber(ingredient.weight_raw);
    const finalWeight = parseNumber(ingredient.weight_clean);
    return RecipeCalculator.calculateLoss(initialWeight, finalWeight);
  }, []);
  
  /**
   * Calcula perda na cocção
   */
  const calculateCookingLoss = useCallback((ingredient) => {
    const initialWeight = parseNumber(ingredient.weight_pre_cooking) ||
                          parseNumber(ingredient.weight_clean) ||
                          parseNumber(ingredient.weight_thawed) ||
                          parseNumber(ingredient.weight_raw);
    const finalWeight = parseNumber(ingredient.weight_cooked);
    return RecipeCalculator.calculateLoss(initialWeight, finalWeight);
  }, []);
  
  /**
   * Calcula perda no porcionamento
   */
  const calculatePortioningLoss = useCallback((ingredient) => {
    const initialWeight = parseNumber(ingredient.weight_cooked) ||
                          parseNumber(ingredient.weight_clean) ||
                          parseNumber(ingredient.weight_thawed) ||
                          parseNumber(ingredient.weight_raw);
    const finalWeight = parseNumber(ingredient.weight_portioned);
    return RecipeCalculator.calculateLoss(initialWeight, finalWeight);
  }, []);
  
  // ========================================
  // FUNÇÕES DE INGREDIENTES
  // ========================================
  
  /**
   * Obtém peso final de um ingrediente
   */
  const calculateIngredientFinalWeight = useCallback((ingredient) => {
    return RecipeCalculator.getFinalWeight(ingredient);
  }, []);
  
  /**
   * Calcula rendimento de um ingrediente
   */
  const calculateIngredientYield = useCallback((ingredient) => {
    const yieldPercent = RecipeCalculator.calculateYield(ingredient);
    const initialWeight = RecipeCalculator.getInitialWeight(ingredient);
    const finalWeight = RecipeCalculator.getFinalWeight(ingredient);
    
    return {
      percentage: Number(yieldPercent.toFixed(2)),
      finalWeight,
      initialWeight
    };
  }, []);
  
  // ========================================
  // FUNÇÕES DE PREPARAÇÃO
  // ========================================
  
  /**
   * Calcula métricas de uma preparação específica
   */
  const calculatePreparationMetrics = useCallback((preparation) => {
    try {
      const metrics = RecipeCalculator.calculatePreparationMetrics(preparation);
      
      return {
        totalWeight: metrics.totalRawWeight,
        yieldWeight: metrics.totalYieldWeight,
        totalCost: metrics.totalCost,
        yieldPercentage: metrics.yieldPercentage,
        averageYield: metrics.averageYield
      };
    } catch (error) {
      return {
        totalWeight: 0,
        yieldWeight: 0,
        totalCost: 0,
        yieldPercentage: 0,
        averageYield: 0
      };
    }
  }, []);
  
  // ========================================
  // FUNÇÕES DE VALIDAÇÃO
  // ========================================
  
  /**
   * Valida pesos de um ingrediente
   */
  const validateIngredientWeights = useCallback((ingredient) => {
    const errors = [];
    
    // Obter todos os pesos em ordem de processamento
    const weights = [
      { name: 'Congelado', value: parseNumber(ingredient.weight_frozen) },
      { name: 'Bruto', value: parseNumber(ingredient.weight_raw) },
      { name: 'Descongelado', value: parseNumber(ingredient.weight_thawed) },
      { name: 'Limpo', value: parseNumber(ingredient.weight_clean) },
      { name: 'Cozido', value: parseNumber(ingredient.weight_cooked) },
      { name: 'Porcionado', value: parseNumber(ingredient.weight_portioned) }
    ].filter(w => w.value > 0);
    
    // Verificar se pesos são decrescentes (lógica de perda)
    for (let i = 1; i < weights.length; i++) {
      if (weights[i].value > weights[i-1].value) {
        errors.push(`${weights[i].name} (${weights[i].value}kg) não pode ser maior que ${weights[i-1].name} (${weights[i-1].value}kg)`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);
  
  // ========================================
  // FUNÇÕES AUXILIARES DE CÁLCULO
  // ========================================
  
  /**
   * Calcula custo total de todas as preparações
   */
  const calculateTotalRecipeCost = useCallback((preparations) => {
    if (!preparations || preparations.length === 0) return 0;
    
    const result = RecipeCalculator.calculateRecipeMetrics(preparations);
    return result.total_cost;
  }, []);
  
  /**
   * Calcula peso total da receita
   */
  const calculateTotalRecipeWeight = useCallback((preparations, type = 'yield') => {
    if (!preparations || preparations.length === 0) return 0;
    
    const result = RecipeCalculator.calculateRecipeMetrics(preparations);
    return type === 'yield' ? result.yield_weight : result.total_weight;
  }, []);
  
  // ========================================
  // FORMATADORES MEMOIZADOS
  // ========================================
  
  /**
   * Formatadores para exibição de valores
   */
  const memoizedFormatters = useMemo(() => ({
    currency: (value) => formatters.currency(value),
    weight: (value, unit = 'kg') => formatters.weight(value) + unit,
    percentage: (value) => formatters.percentage(value),
    
    // Formatadores específicos para tabelas
    tableWeight: (value) => {
      const num = parseNumber(value);
      return num.toFixed(3).replace('.', ',');
    },
    
    tableCurrency: (value) => {
      const num = parseNumber(value);
      return num.toFixed(2).replace('.', ',');
    },
    
    tablePercentage: (value) => {
      const num = parseNumber(value);
      return num.toFixed(1).replace('.', ',') + '%';
    }
  }), []);
  
  // ========================================
  // FUNÇÃO DE DEBUG
  // ========================================
  
  /**
   * Gera relatório de debug para troubleshooting
   */
  const generateDebugReport = useCallback((preparations, recipeData = {}) => {
    try {
      return RecipeCalculator.generateDebugReport(preparations, recipeData);
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
        validation: { isValid: false, errors: [error.message], warnings: [] },
        metrics: RecipeCalculator.getEmptyMetrics()
      };
    }
  }, []);
  
  // ========================================
  // RETURN DO HOOK
  // ========================================
  
  return {
    // Parsing e utilitários
    parseNumericValue: parseNumber,
    
    // Cálculos principais
    calculateRecipeMetrics,
    updateRecipeMetrics: updateRecipeMetricsOptimized,
    
    // Cálculos básicos
    calculateAssemblyTotalWeight,
    calculateCubaCost,
    calculateProcessLoss,
    
    // Cálculos por processo
    calculateThawingLoss,
    calculateCleaningLoss,
    calculateCookingLoss,
    calculatePortioningLoss,
    
    // Cálculos de ingrediente
    calculateIngredientFinalWeight,
    calculateIngredientYield,
    
    // Cálculos de preparação
    calculatePreparationMetrics,
    
    // Cálculos auxiliares
    calculateTotalRecipeCost,
    calculateTotalRecipeWeight,
    
    // Validação
    validateIngredientWeights,
    
    // Formatação
    formatters: memoizedFormatters,
    
    // Debug
    generateDebugReport
  };
}