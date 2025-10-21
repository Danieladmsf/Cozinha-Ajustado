/**
 * RECIPE ENGINE - INDEX
 * 
 * Ponto de entrada principal do sistema unificado de cálculos de receitas.
 * Exporta todas as funcionalidades de forma organizada.
 * 
 * @version 3.0.0
 * @author Sistema Cozinha Afeto
 */

// ========================================
// IMPORTS PRINCIPAIS
// ========================================

import RecipeEngine from './RecipeEngine.js';
import DataNormalizer from './DataNormalizer.js';
import ValidationEngine from './ValidationEngine.js';
import ProcessCalculator from './ProcessCalculator.js';
import AssemblyCalculator from './AssemblyCalculator.js';
import FormatUtils from './FormatUtils.js';

// ========================================
// EXPORT PRINCIPAL
// ========================================

export {
  // Classes principais
  RecipeEngine,
  DataNormalizer,
  ValidationEngine,
  ProcessCalculator,
  AssemblyCalculator,
  FormatUtils
};

// ========================================
// EXPORTS DE CONVENIÊNCIA
// ========================================

// Funções mais usadas do RecipeEngine
export const {
  parseValue,
  calculateRecipeMetrics,
  calculatePreparationMetrics,
  generateDebugReport
} = RecipeEngine;

// Funções mais usadas do DataNormalizer
export const {
  parseNumeric,
  cleanString
} = DataNormalizer;

// Funções mais usadas do FormatUtils
export const {
  formatCurrency,
  formatWeight,
  formatPercentage,
  formatNumber,
  formatDate,
  formatPrepTime
} = FormatUtils;

// ========================================
// EXPORT DEFAULT UNIFICADO
// ========================================

/**
 * API unificada para uso fácil
 */
const RecipeEngineAPI = {
  // Classes completas
  Engine: RecipeEngine,
  Normalizer: DataNormalizer,
  Validator: ValidationEngine,
  Processor: ProcessCalculator,
  Assembly: AssemblyCalculator,
  Format: FormatUtils,
  
  // Funções diretas mais usadas
  calculate: RecipeEngine.calculateRecipeMetrics,
  validate: ValidationEngine.validateRecipeInput,
  normalize: DataNormalizer.normalizeCompleteRecipe,
  format: FormatUtils.smartFormat,
  parse: DataNormalizer.parseNumeric,
  
  // Utilitários
  debug: RecipeEngine.generateDebugReport,
  version: '3.0.0'
};

export default RecipeEngineAPI;