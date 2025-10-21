/**
 * VALIDATION ENGINE - SISTEMA DE VALIDAÇÃO
 * 
 * Responsável por todas as validações de dados de receitas,
 * garantindo integridade e consistência antes dos cálculos.
 * 
 * @version 3.0.0
 * @author Sistema Cozinha Afeto
 */

import { DataNormalizer } from './DataNormalizer.js';

// ========================================
// REGRAS DE VALIDAÇÃO
// ========================================

export const VALIDATION_RULES = {
  RECIPE: {
    name: { required: true, minLength: 1, maxLength: 200 },
    category: { required: false, maxLength: 100 },
    prep_time: { min: 0, max: 1440 }, // máximo 24 horas
    total_weight: { min: 0, max: 1000 }, // máximo 1000kg
    total_cost: { min: 0, max: 100000 } // máximo R$ 100.000
  },
  
  INGREDIENT: {
    name: { required: true, minLength: 1, maxLength: 200 },
    current_price: { min: 0, max: 10000 }, // máximo R$ 10.000/kg
    weights: { min: 0, max: 1000 } // máximo 1000kg
  },
  
  PREPARATION: {
    title: { required: true, minLength: 1, maxLength: 200 },
    processes: { required: true, minLength: 1 }
  },
  
  SUB_COMPONENT: {
    name: { required: true, minLength: 1, maxLength: 200 },
    assembly_weight_kg: { required: true, min: 0.001, max: 1000 }
  }
};

// ========================================
// CLASSE VALIDATION ENGINE
// ========================================

export class ValidationEngine {
  
  // ========================================
  // VALIDAÇÕES BÁSICAS
  // ========================================
  
  /**
   * Valida string obrigatória
   */
  static validateRequiredString(value, fieldName, rules = {}) {
    const errors = [];
    const cleaned = DataNormalizer.cleanString(value);
    
    if (rules.required && !cleaned) {
      errors.push(`${fieldName} é obrigatório`);
      return { isValid: false, errors };
    }
    
    if (cleaned && rules.minLength && cleaned.length < rules.minLength) {
      errors.push(`${fieldName} deve ter pelo menos ${rules.minLength} caracteres`);
    }
    
    if (cleaned && rules.maxLength && cleaned.length > rules.maxLength) {
      errors.push(`${fieldName} deve ter no máximo ${rules.maxLength} caracteres`);
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * Valida valor numérico
   */
  static validateNumericValue(value, fieldName, rules = {}) {
    const errors = [];
    const parsed = DataNormalizer.parseNumeric(value);
    
    if (rules.required && parsed === 0) {
      errors.push(`${fieldName} é obrigatório`);
      return { isValid: false, errors };
    }
    
    if (rules.min !== undefined && parsed < rules.min) {
      errors.push(`${fieldName} deve ser maior ou igual a ${rules.min}`);
    }
    
    if (rules.max !== undefined && parsed > rules.max) {
      errors.push(`${fieldName} deve ser menor ou igual a ${rules.max}`);
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * Valida array obrigatório
   */
  static validateRequiredArray(value, fieldName, rules = {}) {
    const errors = [];
    
    if (!Array.isArray(value)) {
      errors.push(`${fieldName} deve ser um array`);
      return { isValid: false, errors };
    }
    
    if (rules.required && value.length === 0) {
      errors.push(`${fieldName} não pode estar vazio`);
    }
    
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${fieldName} deve ter pelo menos ${rules.minLength} itens`);
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  // ========================================
  // VALIDAÇÕES DE INGREDIENTES
  // ========================================
  
  /**
   * Valida dados de um ingrediente
   */
  static validateIngredient(ingredient, index = 0) {
    const errors = [];
    const warnings = [];
    
    if (!ingredient) {
      errors.push(`Ingrediente ${index + 1} está vazio`);
      return { isValid: false, errors, warnings };
    }
    
    // Validar nome
    const nameValidation = this.validateRequiredString(
      ingredient.name, 
      `Nome do ingrediente ${index + 1}`, 
      VALIDATION_RULES.INGREDIENT.name
    );
    errors.push(...nameValidation.errors);
    
    // Validar preço
    const priceValidation = this.validateNumericValue(
      ingredient.current_price,
      `Preço do ingrediente "${ingredient.name}"`,
      VALIDATION_RULES.INGREDIENT.current_price
    );
    errors.push(...priceValidation.errors);
    
    // Validar pesos
    const weightFields = ['weight_frozen', 'weight_raw', 'weight_thawed', 'weight_clean', 
                         'weight_pre_cooking', 'weight_cooked', 'weight_portioned', 'quantity'];
    
    let hasValidWeight = false;
    weightFields.forEach(field => {
      const weightValidation = this.validateNumericValue(
        ingredient[field],
        `${field} do ingrediente "${ingredient.name}"`,
        VALIDATION_RULES.INGREDIENT.weights
      );
      errors.push(...weightValidation.errors);
      
      if (DataNormalizer.parseNumeric(ingredient[field]) > 0) {
        hasValidWeight = true;
      }
    });
    
    if (!hasValidWeight) {
      warnings.push(`Ingrediente "${ingredient.name}" não tem peso válido em nenhum campo`);
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }
  
  /**
   * Valida array de ingredientes
   */
  static validateIngredients(ingredients) {
    const errors = [];
    const warnings = [];
    
    if (!Array.isArray(ingredients)) {
      errors.push('Lista de ingredientes deve ser um array');
      return { isValid: false, errors, warnings };
    }
    
    if (ingredients.length === 0) {
      warnings.push('Nenhum ingrediente encontrado');
    }
    
    ingredients.forEach((ingredient, index) => {
      const validation = this.validateIngredient(ingredient, index);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    });
    
    return { isValid: errors.length === 0, errors, warnings };
  }
  
  // ========================================
  // VALIDAÇÕES DE SUB-COMPONENTES
  // ========================================
  
  /**
   * Valida dados de um sub-componente
   */
  static validateSubComponent(subComponent, index = 0) {
    const errors = [];
    const warnings = [];
    
    if (!subComponent) {
      errors.push(`Sub-componente ${index + 1} está vazio`);
      return { isValid: false, errors, warnings };
    }
    
    // Validar nome
    const nameValidation = this.validateRequiredString(
      subComponent.name,
      `Nome do sub-componente ${index + 1}`,
      VALIDATION_RULES.SUB_COMPONENT.name
    );
    errors.push(...nameValidation.errors);
    
    // Validar peso na montagem
    const weightValidation = this.validateNumericValue(
      subComponent.assembly_weight_kg,
      `Peso na montagem do sub-componente "${subComponent.name}"`,
      VALIDATION_RULES.SUB_COMPONENT.assembly_weight_kg
    );
    errors.push(...weightValidation.errors);
    
    // Validar dados de origem (para cálculo de custo)
    const hasSourceId = DataNormalizer.cleanString(subComponent.source_id) !== '';
    const hasInputData = DataNormalizer.parseNumeric(subComponent.input_yield_weight) > 0 &&
                        DataNormalizer.parseNumeric(subComponent.input_total_cost) > 0;
    
    if (!hasSourceId && !hasInputData) {
      warnings.push(`Sub-componente "${subComponent.name}" sem dados suficientes para cálculo de custo`);
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }
  
  /**
   * Valida array de sub-componentes
   */
  static validateSubComponents(subComponents) {
    const errors = [];
    const warnings = [];
    
    if (!Array.isArray(subComponents)) {
      errors.push('Lista de sub-componentes deve ser um array');
      return { isValid: false, errors, warnings };
    }
    
    subComponents.forEach((subComponent, index) => {
      const validation = this.validateSubComponent(subComponent, index);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    });
    
    return { isValid: errors.length === 0, errors, warnings };
  }
  
  // ========================================
  // VALIDAÇÕES DE PREPARAÇÃO
  // ========================================
  
  /**
   * Valida dados de uma preparação
   */
  static validatePreparation(preparation, index = 0) {
    const errors = [];
    const warnings = [];
    
    if (!preparation) {
      errors.push(`Preparação ${index + 1} está vazia`);
      return { isValid: false, errors, warnings };
    }
    
    // Validar título
    const titleValidation = this.validateRequiredString(
      preparation.title,
      `Título da preparação ${index + 1}`,
      VALIDATION_RULES.PREPARATION.title
    );
    errors.push(...titleValidation.errors);
    
    // Validar processos
    const processesValidation = this.validateRequiredArray(
      preparation.processes,
      `Processos da preparação "${preparation.title}"`,
      VALIDATION_RULES.PREPARATION.processes
    );
    errors.push(...processesValidation.errors);
    
    // Validar ingredientes (se houver)
    if (preparation.ingredients && preparation.ingredients.length > 0) {
      const ingredientsValidation = this.validateIngredients(preparation.ingredients);
      errors.push(...ingredientsValidation.errors);
      warnings.push(...ingredientsValidation.warnings);
    }
    
    // Validar sub-componentes (se houver)
    if (preparation.sub_components && preparation.sub_components.length > 0) {
      const subComponentsValidation = this.validateSubComponents(preparation.sub_components);
      errors.push(...subComponentsValidation.errors);
      warnings.push(...subComponentsValidation.warnings);
    }
    
    // Verificar se tem pelo menos ingredientes ou sub-componentes
    const hasIngredients = preparation.ingredients && preparation.ingredients.length > 0;
    const hasSubComponents = preparation.sub_components && preparation.sub_components.length > 0;
    
    if (!hasIngredients && !hasSubComponents) {
      warnings.push(`Preparação "${preparation.title}" não tem ingredientes nem sub-componentes`);
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }
  
  /**
   * Valida array de preparações
   */
  static validatePreparations(preparations) {
    const errors = [];
    const warnings = [];
    
    if (!Array.isArray(preparations)) {
      errors.push('Lista de preparações deve ser um array');
      return { isValid: false, errors, warnings };
    }
    
    if (preparations.length === 0) {
      warnings.push('Receita sem preparações definidas');
    }
    
    preparations.forEach((preparation, index) => {
      const validation = this.validatePreparation(preparation, index);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    });
    
    return { isValid: errors.length === 0, errors, warnings };
  }
  
  // ========================================
  // VALIDAÇÕES DE RECEITA
  // ========================================
  
  /**
   * Valida dados da receita principal
   */
  static validateRecipe(recipeData) {
    const errors = [];
    const warnings = [];
    
    if (!recipeData) {
      errors.push('Dados da receita não fornecidos');
      return { isValid: false, errors, warnings };
    }
    
    // Validar nome
    const nameValidation = this.validateRequiredString(
      recipeData.name,
      'Nome da receita',
      VALIDATION_RULES.RECIPE.name
    );
    errors.push(...nameValidation.errors);
    
    // Validar categoria (opcional)
    if (recipeData.category) {
      const categoryValidation = this.validateRequiredString(
        recipeData.category,
        'Categoria da receita',
        VALIDATION_RULES.RECIPE.category
      );
      errors.push(...categoryValidation.errors);
    }
    
    // Validar tempo de preparo
    const prepTimeValidation = this.validateNumericValue(
      recipeData.prep_time,
      'Tempo de preparo',
      VALIDATION_RULES.RECIPE.prep_time
    );
    errors.push(...prepTimeValidation.errors);
    
    // Validar métricas (se fornecidas)
    if (recipeData.total_weight !== undefined) {
      const weightValidation = this.validateNumericValue(
        recipeData.total_weight,
        'Peso total',
        VALIDATION_RULES.RECIPE.total_weight
      );
      errors.push(...weightValidation.errors);
    }
    
    if (recipeData.total_cost !== undefined) {
      const costValidation = this.validateNumericValue(
        recipeData.total_cost,
        'Custo total',
        VALIDATION_RULES.RECIPE.total_cost
      );
      errors.push(...costValidation.errors);
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }
  
  // ========================================
  // VALIDAÇÃO COMPLETA
  // ========================================
  
  /**
   * Valida entrada completa para cálculos (receita + preparações)
   */
  static validateRecipeInput(recipeData, preparationsData) {
    const errors = [];
    const warnings = [];
    
    // Validar receita
    const recipeValidation = this.validateRecipe(recipeData);
    errors.push(...recipeValidation.errors);
    warnings.push(...recipeValidation.warnings);
    
    // Validar preparações
    const preparationsValidation = this.validatePreparations(preparationsData);
    errors.push(...preparationsValidation.errors);
    warnings.push(...preparationsValidation.warnings);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        recipeValid: recipeValidation.isValid,
        preparationsValid: preparationsValidation.isValid,
        totalErrors: errors.length,
        totalWarnings: warnings.length
      }
    };
  }
  
  // ========================================
  // VALIDAÇÕES PÓS-CÁLCULO
  // ========================================
  
  /**
   * Valida resultados dos cálculos
   */
  static validateCalculationResults(calculatedMetrics) {
    const errors = [];
    const warnings = [];
    
    if (!calculatedMetrics) {
      errors.push('Resultados dos cálculos não fornecidos');
      return { isValid: false, errors, warnings };
    }
    
    // Validar consistência de pesos
    if (calculatedMetrics.yield_weight > calculatedMetrics.total_weight) {
      errors.push('Peso de rendimento não pode ser maior que peso total bruto');
    }
    
    // Validar custos
    if (calculatedMetrics.total_cost < 0) {
      errors.push('Custo total não pode ser negativo');
    }
    
    if (calculatedMetrics.cost_per_kg_yield < 0) {
      errors.push('Custo por kg de rendimento não pode ser negativo');
    }
    
    // Validar rendimento
    if (calculatedMetrics.yield_percentage > 100) {
      warnings.push('Rendimento maior que 100% pode indicar erro nos cálculos');
    }
    
    if (calculatedMetrics.yield_percentage < 10) {
      warnings.push('Rendimento muito baixo (< 10%) pode indicar erro nos dados');
    }
    
    // Validar cuba/porção
    if (calculatedMetrics.cuba_weight === 0 && calculatedMetrics.has_assembly) {
      warnings.push('Receita com montagem mas peso da cuba zerado');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default ValidationEngine;