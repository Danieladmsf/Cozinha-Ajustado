/**
 * HOOK DE VALIDAÇÃO DE RECEITAS
 * 
 * Hook React para validação completa de receitas com feedback em tempo real.
 * Inclui validação de campos obrigatórios, consistência de dados e regras de negócio.
 * 
 * @version 1.0.0
 * @author Sistema Cozinha Afeto
 */

import { useState, useCallback, useMemo } from 'react';
import { validateRecipe } from '@/lib/recipeValidator';

export function useRecipeValidation() {
  const [validationErrors, setValidationErrors] = useState({});
  const [validationWarnings, setValidationWarnings] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  
  // ========================================
  // VALIDAÇÃO EM TEMPO REAL
  // ========================================
  
  /**
   * Valida um campo específico em tempo real
   */
  const validateField = useCallback((fieldName, value, context = {}) => {
    const errors = { ...validationErrors };
    const warnings = { ...validationWarnings };
    
    // Limpar erro/warning anterior deste campo
    delete errors[fieldName];
    delete warnings[fieldName];
    
    try {
      switch (fieldName) {
        case 'name':
          if (!value || value.trim() === '') {
            errors[fieldName] = 'O nome da receita é obrigatório';
          } else if (value.length < 3) {
            warnings[fieldName] = 'Nome muito curto. Recomendamos pelo menos 3 caracteres';
          } else if (value.length > 100) {
            errors[fieldName] = 'Nome muito longo. Máximo de 100 caracteres';
          }
          break;
          
        case 'category':
          if (!value || value.trim() === '') {
            errors[fieldName] = 'A categoria é obrigatória';
          }
          break;
          
        case 'prep_time':
          const prepTime = parseInt(value);
          if (isNaN(prepTime) || prepTime < 0) {
            errors[fieldName] = 'Tempo de preparo deve ser um número positivo';
          } else if (prepTime > 1440) { // 24 horas
            warnings[fieldName] = 'Tempo de preparo muito longo. Verifique se está correto';
          }
          break;
          
        case 'ingredient_price':
          const price = parseFloat(String(value).replace(',', '.'));
          if (isNaN(price) || price < 0) {
            errors[fieldName] = 'Preço deve ser um valor positivo';
          } else if (price > 1000) {
            warnings[fieldName] = 'Preço muito alto. Verifique se está correto';
          }
          break;
          
        case 'ingredient_weight':
          const weight = parseFloat(String(value).replace(',', '.'));
          if (isNaN(weight) || weight < 0) {
            errors[fieldName] = 'Peso deve ser um valor positivo';
          } else if (weight > 100) {
            warnings[fieldName] = 'Peso muito alto. Verifique se está em kg';
          }
          break;
          
        default:
          // Validação genérica para campos de texto
          if (typeof value === 'string' && value.length > 500) {
            warnings[fieldName] = 'Texto muito longo';
          }
      }
      
    } catch (error) {
      errors[fieldName] = 'Erro na validação do campo';
    }
    
    setValidationErrors(errors);
    setValidationWarnings(warnings);
    
    return {
      hasError: Boolean(errors[fieldName]),
      error: errors[fieldName],
      warning: warnings[fieldName]
    };
  }, [validationErrors, validationWarnings]);
  
  // ========================================
  // VALIDAÇÃO COMPLETA
  // ========================================
  
  /**
   * Valida a receita completa
   */
  const validateRecipeComplete = useCallback(async (recipeData, preparationsData) => {
    setIsValidating(true);
    
    try {
      // Usar o validador existente
      const result = validateRecipe(recipeData, preparationsData);
      
      // Converter para formato do hook
      const fieldErrors = {};
      const fieldWarnings = {};
      
      result.errors.forEach(error => {
        // Tentar identificar o campo baseado na mensagem de erro
        if (error.includes('nome')) {
          fieldErrors.name = error;
        } else if (error.includes('categoria')) {
          fieldErrors.category = error;
        } else if (error.includes('tempo de preparo')) {
          fieldErrors.prep_time = error;
        } else if (error.includes('preço')) {
          fieldErrors.ingredient_price = error;
        } else if (error.includes('peso')) {
          fieldErrors.ingredient_weight = error;
        } else {
          // Erro genérico
          fieldErrors.general = fieldErrors.general 
            ? `${fieldErrors.general}; ${error}`
            : error;
        }
      });
      
      // Validações adicionais específicas
      if (preparationsData && preparationsData.length === 0) {
        fieldWarnings.preparations = 'Receita sem preparações. Adicione pelo menos uma etapa.';
      }
      
      setValidationErrors(fieldErrors);
      setValidationWarnings(fieldWarnings);
      
      return {
        isValid: result.isValid && Object.keys(fieldErrors).length === 0,
        errors: fieldErrors,
        warnings: fieldWarnings,
        errorCount: Object.keys(fieldErrors).length,
        warningCount: Object.keys(fieldWarnings).length
      };
      
    } catch (error) {
      setValidationErrors({ 
        general: 'Erro interno de validação. Tente novamente.' 
      });
      
      return {
        isValid: false,
        errors: { general: 'Erro interno de validação' },
        warnings: {},
        errorCount: 1,
        warningCount: 0
      };
    } finally {
      setIsValidating(false);
    }
  }, []);
  
  // ========================================
  // VALIDAÇÃO DE INGREDIENTES
  // ========================================
  
  /**
   * Valida pesos de um ingrediente em sequência lógica
   */
  const validateIngredientWeights = useCallback((ingredient) => {
    const errors = {};
    const warnings = {};
    
    const weights = [
      { key: 'weight_frozen', name: 'Peso Congelado', value: ingredient.weight_frozen },
      { key: 'weight_raw', name: 'Peso Bruto', value: ingredient.weight_raw },
      { key: 'weight_thawed', name: 'Peso Descongelado', value: ingredient.weight_thawed },
      { key: 'weight_clean', name: 'Peso Limpo', value: ingredient.weight_clean },
      { key: 'weight_pre_cooking', name: 'Peso Pré-cocção', value: ingredient.weight_pre_cooking },
      { key: 'weight_cooked', name: 'Peso Cozido', value: ingredient.weight_cooked },
      { key: 'weight_portioned', name: 'Peso Porcionado', value: ingredient.weight_portioned }
    ];
    
    // Filtrar apenas pesos preenchidos e convertê-los
    const filledWeights = weights
      .map(w => ({
        ...w,
        numValue: parseFloat(String(w.value || 0).replace(',', '.'))
      }))
      .filter(w => w.numValue > 0);
    
    // Verificar se pesos são decrescentes (lógica de perda natural)
    for (let i = 1; i < filledWeights.length; i++) {
      const current = filledWeights[i];
      const previous = filledWeights[i - 1];
      
      if (current.numValue > previous.numValue * 1.1) { // 10% de tolerância
        errors[current.key] = 
          `${current.name} (${current.numValue}kg) não deveria ser maior que ${previous.name} (${previous.numValue}kg)`;
      }
    }
    
    // Verificar perdas muito grandes (> 50%)
    if (filledWeights.length >= 2) {
      const first = filledWeights[0];
      const last = filledWeights[filledWeights.length - 1];
      const lossPercent = ((first.numValue - last.numValue) / first.numValue) * 100;
      
      if (lossPercent > 50) {
        warnings.weight_loss = 
          `Perda total muito alta (${lossPercent.toFixed(1)}%). Verifique os pesos.`;
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }, []);
  
  // ========================================
  // LIMPEZA E RESET
  // ========================================
  
  /**
   * Limpa todos os erros e warnings
   */
  const clearValidation = useCallback(() => {
    setValidationErrors({});
    setValidationWarnings({});
  }, []);
  
  /**
   * Limpa validação de um campo específico
   */
  const clearFieldValidation = useCallback((fieldName) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    
    setValidationWarnings(prev => {
      const newWarnings = { ...prev };
      delete newWarnings[fieldName];
      return newWarnings;
    });
  }, []);
  
  // ========================================
  // COMPUTED VALUES
  // ========================================
  
  const isFormValid = useMemo(() => {
    return Object.keys(validationErrors).length === 0;
  }, [validationErrors]);
  
  const hasWarnings = useMemo(() => {
    return Object.keys(validationWarnings).length > 0;
  }, [validationWarnings]);
  
  const validationSummary = useMemo(() => ({
    errorCount: Object.keys(validationErrors).length,
    warningCount: Object.keys(validationWarnings).length,
    isValid: isFormValid,
    hasWarnings
  }), [validationErrors, validationWarnings, isFormValid, hasWarnings]);
  
  // ========================================
  // RETURN DO HOOK
  // ========================================
  
  return {
    // Estados
    validationErrors,
    validationWarnings,
    isValidating,
    isFormValid,
    hasWarnings,
    validationSummary,
    
    // Ações
    validateField,
    validateRecipeComplete,
    validateIngredientWeights,
    clearValidation,
    clearFieldValidation
  };
}