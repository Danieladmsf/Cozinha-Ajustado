/**
 * CALCULADORA DE MÉTRICAS DE RECEITA - VERSÃO 2.0
 * 
 * Sistema simplificado que usa o RecipeCalculator unificado.
 * Remove duplicação de código e garante consistência.
 * 
 * @version 2.0.0
 * @author Sistema Cozinha Afeto
 */

import RecipeCalculator, { parseNumber, formatters } from './recipeCalculator';

// ========================================
// FUNÇÕES PRINCIPAIS SIMPLIFICADAS
// ========================================

/**
 * Calcula todas as métricas da receita usando o sistema unificado
 * 
 * @param {Array} preparationsData - Array de preparações da receita
 * @param {Object} recipeData - Dados atuais da receita
 * @returns {Object} Objeto com todas as métricas calculadas
 */
export function calculateRecipeMetrics(preparationsData, recipeData = {}) {
  // Usar o sistema unificado
  const result = RecipeCalculator.calculateRecipeMetrics(preparationsData, recipeData);
  
  return result;
}

/**
 * Calcula métricas individuais para uma preparação específica
 * 
 * @param {Object} preparation - Dados da preparação
 * @returns {Object} Métricas da preparação
 */
export function calculatePreparationMetrics(preparation) {
  const metrics = RecipeCalculator.calculatePreparationMetrics(preparation);
  
  // Converter para formato esperado pelo código legado
  return {
    total_yield_weight_prep: metrics.totalYieldWeight,
    total_cost_prep: metrics.totalCost,
    total_raw_weight_prep: metrics.totalRawWeight,
    yield_percentage_prep: metrics.yieldPercentage,
    average_yield_prep: metrics.averageYield
  };
}

/**
 * Atualiza as métricas individuais de cada preparação
 * 
 * @param {Array} preparationsData - Array de preparações
 * @returns {Array} Array de preparações com métricas atualizadas
 */
export function updatePreparationsMetrics(preparationsData) {
  if (!preparationsData || !Array.isArray(preparationsData)) {
    return preparationsData;
  }
  
  return preparationsData.map((prep, index) => {
    const metrics = calculatePreparationMetrics(prep);
    
    return {
      ...prep,
      ...metrics
    };
  });
}

/**
 * Função principal para recalcular métricas quando os dados mudam
 * 
 * @param {Array} preparationsData - Array de preparações
 * @param {Object} currentMetrics - Métricas atuais (ignorado na v2)
 * @param {Object} recipeData - Dados da receita
 * @returns {Object} Métricas atualizadas
 */
export function updateRecipeMetrics(preparationsData, currentMetrics = {}, recipeData = {}) {
  // Atualizar métricas das preparações individuais
  const updatedPreparations = updatePreparationsMetrics(preparationsData);
  
  // Calcular métricas totais da receita
  const newMetrics = calculateRecipeMetrics(updatedPreparations, recipeData);
  
  return {
    ...newMetrics,
    updatedPreparations // Incluir preparações atualizadas
  };
}

// ========================================
// FUNÇÕES DE COMPATIBILIDADE (DEPRECATED)
// ========================================

/**
 * @deprecated Use RecipeCalculator.getInitialWeight() 
 */
export function calculateTotalWeight(preparationsData) {
  // DEPRECATED: Use RecipeCalculator.calculateRecipeMetrics()
  
  if (!preparationsData?.length) return 0;
  
  const result = RecipeCalculator.calculateRecipeMetrics(preparationsData);
  return result.total_weight;
}

/**
 * @deprecated Use RecipeCalculator.calculateRecipeMetrics()
 */
export function calculateYieldWeight(preparationsData, recipeYieldWeight = null) {
  // DEPRECATED: Use RecipeCalculator.calculateRecipeMetrics()
  
  if (!preparationsData?.length) return 0;
  
  const result = RecipeCalculator.calculateRecipeMetrics(preparationsData, { 
    yield_weight: recipeYieldWeight 
  });
  return result.yield_weight;
}

/**
 * @deprecated Use RecipeCalculator.calculateRecipeMetrics()
 */
export function calculateTotalCost(preparationsData) {
  // DEPRECATED: Use RecipeCalculator.calculateRecipeMetrics()
  
  if (!preparationsData?.length) return 0;
  
  const result = RecipeCalculator.calculateRecipeMetrics(preparationsData);
  return result.total_cost;
}

/**
 * @deprecated Use RecipeCalculator.calculateRecipeMetrics()
 */
export function calculateCostPerKgRaw(totalCost, totalWeight) {
  // DEPRECATED: Use RecipeCalculator.calculateRecipeMetrics()
  
  const cost = parseNumber(totalCost);
  const weight = parseNumber(totalWeight);
  
  return weight > 0 ? cost / weight : 0;
}

/**
 * @deprecated Use RecipeCalculator.calculateRecipeMetrics()
 */
export function calculateCostPerKgYield(totalCost, yieldWeight) {
  // DEPRECATED: Use RecipeCalculator.calculateRecipeMetrics()
  
  const cost = parseNumber(totalCost);
  const weight = parseNumber(yieldWeight);
  
  return weight > 0 ? cost / weight : 0;
}

/**
 * @deprecated Use RecipeCalculator.calculateRecipeMetrics()
 */
export function calculateCubaCost(cubaWeight, costPerKgYield) {
  // DEPRECATED: Use RecipeCalculator.calculateRecipeMetrics()
  
  const weight = parseNumber(cubaWeight);
  const costPerKg = parseNumber(costPerKgYield);
  
  return weight * costPerKg;
}

/**
 * @deprecated Use RecipeCalculator.getContainerType()
 */
export function getContainerTypeFromPreparations(preparationsData) {
  // DEPRECATED: Use RecipeCalculator.getContainerType()
  
  return RecipeCalculator.getContainerType(preparationsData || []);
}

/**
 * @deprecated Use RecipeCalculator.getWeightFieldName() e getCostFieldName()
 */
export function getContainerFieldNames(containerType) {
  // DEPRECATED: Use RecipeCalculator field methods
  
  const fieldNames = {
    cuba: {
      weightLabel: 'Peso da Cuba',
      costLabel: 'Custo da Cuba'
    },
    descartavel: {
      weightLabel: 'Peso da Embalagem',
      costLabel: 'Custo da Embalagem'
    },
    individual: {
      weightLabel: 'Peso da Porção',
      costLabel: 'Custo da Porção'
    },
    kg: {
      weightLabel: 'Peso por Kg',
      costLabel: 'Custo por Kg'
    },
    outros: {
      weightLabel: 'Peso da Unidade',
      costLabel: 'Custo da Unidade'
    }
  };
  
  return fieldNames[containerType] || fieldNames.cuba;
}

// ========================================
// UTILIDADES AUXILIARES
// ========================================

/**
 * Gera um relatório de debug das métricas
 */
export function generateMetricsReport(preparationsData, recipeData = {}) {
  const report = RecipeCalculator.generateDebugReport(preparationsData, recipeData);
  
  return {
    ...report,
    summary: {
      isValid: report.validation.isValid,
      errorsCount: report.validation.errors.length,
      warningsCount: report.validation.warnings.length,
      totalWeight: formatters.weight(report.metrics.total_weight) + 'kg',
      yieldWeight: formatters.weight(report.metrics.yield_weight) + 'kg',
      totalCost: formatters.currency(report.metrics.total_cost),
      yieldPercentage: formatters.percentage(report.metrics.yield_percentage)
    }
  };
}

/**
 * Valida dados antes dos cálculos
 */
export function validatePreparationsData(preparationsData) {
  return RecipeCalculator.validateRecipeData(preparationsData);
}

// ========================================
// EXPORTS PARA COMPATIBILIDADE
// ========================================

// Manter compatibilidade com importações existentes
export { parseNumber as parseNumericValue } from './recipeCalculator';
export { formatters } from './recipeCalculator';

// Disponibilizar no desenvolvimento para debug
