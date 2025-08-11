/**
 * DATA NORMALIZER - NORMALIZAÇÃO E LIMPEZA DE DADOS
 * 
 * Responsável por normalizar, limpar e padronizar dados de entrada
 * antes de serem processados pelo RecipeEngine.
 * 
 * @version 3.0.0
 * @author Sistema Cozinha Afeto
 */

// ========================================
// UTILITÁRIOS DE PARSING
// ========================================

/**
 * Parsing único, robusto e consistente de valores numéricos
 */
export function parseNumeric(value) {
  // Se já é número válido
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  
  // Se é string, processar
  if (typeof value === 'string') {
    // Remover espaços e caracteres não numéricos (exceto vírgula e ponto)
    let cleaned = value.trim().replace(/[^\d.,-]/g, '');
    
    // Se string vazia após limpeza
    if (cleaned === '' || cleaned === 'undefined' || cleaned === 'null') {
      return 0;
    }
    
    // Substituir vírgula por ponto (formato brasileiro → americano)
    cleaned = cleaned.replace(',', '.');
    
    // Converter para número
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  }
  
  // Para qualquer outro tipo (null, undefined, boolean, etc.)
  return 0;
}

/**
 * Limpeza de strings, removendo valores inválidos
 */
export function cleanString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return String(value);
  
  const cleaned = value.trim();
  
  // Valores que devem ser considerados strings vazias
  const emptyValues = ['', 'undefined', 'null', 'NaN'];
  return emptyValues.includes(cleaned) ? '' : cleaned;
}

/**
 * Limpeza de arrays, removendo valores inválidos
 */
export function cleanArray(arr, itemValidator = null) {
  if (!Array.isArray(arr)) return [];
  
  return arr
    .filter(item => item !== null && item !== undefined && item !== '')
    .map(item => itemValidator ? itemValidator(item) : item)
    .filter(item => item !== null && item !== undefined);
}

// ========================================
// CLASSE PRINCIPAL DATA NORMALIZER
// ========================================

export class DataNormalizer {
  
  /**
   * Parsing de valores numéricos (wrapper estático)
   */
  static parseNumeric(value) {
    return parseNumeric(value);
  }
  
  /**
   * Limpeza de strings (wrapper estático)
   */
  static cleanString(value) {
    return cleanString(value);
  }
  
  // ========================================
  // NORMALIZAÇÃO DE INGREDIENTES
  // ========================================
  
  /**
   * Normaliza dados de um ingrediente
   */
  static normalizeIngredient(ingredient) {
    if (!ingredient) return null;
    
    // Garantir que tem ID
    const id = ingredient.id || String(Date.now() + Math.random());
    
    // Normalizar nome (obrigatório)
    const name = this.cleanString(ingredient.name);
    if (!name) return null; // Ingrediente sem nome é inválido
    
    return {
      id,
      name,
      
      // Pesos normalizados
      weight_frozen: this.parseNumeric(ingredient.weight_frozen),
      weight_raw: this.parseNumeric(ingredient.weight_raw),
      weight_thawed: this.parseNumeric(ingredient.weight_thawed),
      weight_clean: this.parseNumeric(ingredient.weight_clean),
      weight_pre_cooking: this.parseNumeric(ingredient.weight_pre_cooking),
      weight_cooked: this.parseNumeric(ingredient.weight_cooked),
      weight_portioned: this.parseNumeric(ingredient.weight_portioned),
      
      // Fallback para compatibilidade
      quantity: this.parseNumeric(ingredient.quantity),
      
      // Preços normalizados
      current_price: this.parseNumeric(ingredient.current_price),
      unit_price: this.parseNumeric(ingredient.unit_price),
      raw_price_kg: this.parseNumeric(ingredient.raw_price_kg),
      liquid_price_kg: this.parseNumeric(ingredient.liquid_price_kg),
      
      // Campos opcionais limpos
      unit: this.cleanString(ingredient.unit) || 'kg',
      brand: this.cleanString(ingredient.brand),
      category: this.cleanString(ingredient.category),
      notes: this.cleanString(ingredient.notes)
    };
  }
  
  /**
   * Normaliza array de ingredientes
   */
  static normalizeIngredients(ingredients) {
    return cleanArray(ingredients, this.normalizeIngredient.bind(this));
  }
  
  // ========================================
  // NORMALIZAÇÃO DE SUB-COMPONENTES
  // ========================================
  
  /**
   * Normaliza dados de um sub-componente
   */
  static normalizeSubComponent(subComponent) {
    if (!subComponent) return null;
    
    // Garantir que tem ID
    const id = subComponent.id || String(Date.now() + Math.random());
    
    // Normalizar nome (obrigatório)
    const name = this.cleanString(subComponent.name);
    if (!name) return null; // Sub-componente sem nome é inválido
    
    return {
      id,
      name,
      
      // Tipo normalizado
      type: this.cleanString(subComponent.type) || 'preparation',
      
      // IDs de referência
      source_id: this.cleanString(subComponent.source_id),
      
      // Pesos e custos normalizados
      assembly_weight_kg: this.parseNumeric(subComponent.assembly_weight_kg),
      yield_weight: this.parseNumeric(subComponent.yield_weight),
      total_cost: this.parseNumeric(subComponent.total_cost),
      
      // Dados de entrada para cálculos
      input_yield_weight: this.parseNumeric(subComponent.input_yield_weight),
      input_total_cost: this.parseNumeric(subComponent.input_total_cost),
      
      // Campos opcionais
      notes: this.cleanString(subComponent.notes)
    };
  }
  
  /**
   * Normaliza array de sub-componentes
   */
  static normalizeSubComponents(subComponents) {
    return cleanArray(subComponents, this.normalizeSubComponent.bind(this));
  }
  
  // ========================================
  // NORMALIZAÇÃO DE CONFIGURAÇÃO DE ASSEMBLY
  // ========================================
  
  /**
   * Normaliza configuração de assembly/montagem
   */
  static normalizeAssemblyConfig(config) {
    if (!config) return null;
    
    return {
      container_type: this.cleanString(config.container_type) || 'cuba',
      total_weight: this.parseNumeric(config.total_weight),
      units_quantity: this.parseNumeric(config.units_quantity) || 1,
      notes: this.cleanString(config.notes)
    };
  }
  
  // ========================================
  // NORMALIZAÇÃO DE PREPARAÇÕES
  // ========================================
  
  /**
   * Normaliza dados de uma preparação
   */
  static normalizePreparation(preparation) {
    if (!preparation) return null;
    
    // Garantir que tem ID
    const id = preparation.id || String(Date.now() + Math.random());
    
    // Normalizar título (obrigatório)
    const title = this.cleanString(preparation.title);
    if (!title) return null; // Preparação sem título é inválida
    
    return {
      id,
      title,
      
      // Processos normalizados (array limpo)
      processes: cleanArray(preparation.processes).filter(p => 
        typeof p === 'string' && p.trim() !== ''
      ),
      
      // Ingredientes e sub-componentes normalizados
      ingredients: this.normalizeIngredients(preparation.ingredients || []),
      sub_components: this.normalizeSubComponents(preparation.sub_components || []),
      
      // Configuração de assembly normalizada
      assembly_config: preparation.assembly_config ? 
        this.normalizeAssemblyConfig(preparation.assembly_config) : null,
      
      // Instruções limpas
      instructions: this.cleanString(preparation.instructions),
      
      // Métricas calculadas normalizadas
      total_yield_weight_prep: this.parseNumeric(preparation.total_yield_weight_prep),
      total_cost_prep: this.parseNumeric(preparation.total_cost_prep),
      total_raw_weight_prep: this.parseNumeric(preparation.total_raw_weight_prep),
      yield_percentage_prep: this.parseNumeric(preparation.yield_percentage_prep)
    };
  }
  
  /**
   * Normaliza array de preparações
   */
  static normalizePreparations(preparations) {
    return cleanArray(preparations, this.normalizePreparation.bind(this));
  }
  
  // ========================================
  // NORMALIZAÇÃO DE RECEITA
  // ========================================
  
  /**
   * Normaliza dados da receita principal
   */
  static normalizeRecipe(recipeData) {
    if (!recipeData) return {};
    
    return {
      // ID (manter se existir)
      ...(recipeData.id && { id: recipeData.id }),
      
      // Informações básicas normalizadas
      name: this.cleanString(recipeData.name),
      name_complement: this.cleanString(recipeData.name_complement),
      category: this.cleanString(recipeData.category),
      instructions: this.cleanString(recipeData.instructions),
      
      // Tempo normalizado
      prep_time: this.parseNumeric(recipeData.prep_time),
      
      // Métricas de peso normalizadas
      total_weight: this.parseNumeric(recipeData.total_weight),
      yield_weight: this.parseNumeric(recipeData.yield_weight),
      cuba_weight: this.parseNumeric(recipeData.cuba_weight),
      portion_weight_calculated: this.parseNumeric(recipeData.portion_weight_calculated),
      
      // Métricas de custo normalizadas
      total_cost: this.parseNumeric(recipeData.total_cost),
      cost_per_kg_raw: this.parseNumeric(recipeData.cost_per_kg_raw),
      cost_per_kg_yield: this.parseNumeric(recipeData.cost_per_kg_yield),
      cuba_cost: this.parseNumeric(recipeData.cuba_cost),
      portion_cost: this.parseNumeric(recipeData.portion_cost),
      
      // Rendimento normalizado
      yield_percentage: this.parseNumeric(recipeData.yield_percentage),
      
      // Estado normalizado
      active: recipeData.active !== undefined ? Boolean(recipeData.active) : true,
      
      // Metadados opcionais
      container_type: this.cleanString(recipeData.container_type),
      weight_field_name: this.cleanString(recipeData.weight_field_name),
      cost_field_name: this.cleanString(recipeData.cost_field_name),
      last_calculated: recipeData.last_calculated || new Date().toISOString()
    };
  }
  
  // ========================================
  // NORMALIZAÇÃO COMPLETA
  // ========================================
  
  /**
   * Normaliza dados completos de uma receita (receita + preparações)
   */
  static normalizeCompleteRecipe(recipeData, preparationsData) {
    const normalizedRecipe = this.normalizeRecipe(recipeData);
    const normalizedPreparations = this.normalizePreparations(preparationsData);
    
    return {
      recipe: normalizedRecipe,
      preparations: normalizedPreparations
    };
  }
  
  // ========================================
  // MÉTODOS DE VALIDAÇÃO BÁSICA
  // ========================================
  
  /**
   * Verifica se dados normalizados são válidos
   */
  static validateNormalized(normalizedData) {
    const errors = [];
    const warnings = [];
    
    // Validar receita
    if (!normalizedData.recipe?.name) {
      errors.push('Nome da receita é obrigatório');
    }
    
    // Validar preparações
    if (!normalizedData.preparations || normalizedData.preparations.length === 0) {
      warnings.push('Receita sem preparações');
    }
    
    // Validar ingredientes
    const hasIngredients = normalizedData.preparations?.some(prep => 
      prep.ingredients && prep.ingredients.length > 0
    );
    
    if (!hasIngredients) {
      warnings.push('Receita sem ingredientes');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// ========================================
// EXPORTS
// ========================================

export default DataNormalizer;