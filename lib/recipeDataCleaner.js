/**
 * LIMPADOR DE DADOS DE RECEITA - VERSÃO 2.0
 * 
 * Sistema robusto para limpar e sanitizar dados de receitas antes do salvamento.
 * Remove valores vazios, undefined, null e strings perdidas que podem causar problemas.
 * 
 * @version 2.0.0
 * @author Sistema Cozinha Afeto
 */

/**
 * Converte valores para números, tratando vírgulas e strings vazias
 */
export function parseNumericValue(value) {
  // Se já é número válido, retornar
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  
  // Se é string, tentar converter
  if (typeof value === 'string') {
    // Remover espaços e substituir vírgula por ponto
    const cleaned = value.trim().replace(',', '.');
    
    // Se string vazia após limpeza, retornar 0
    if (cleaned === '' || cleaned === '0' || cleaned === '0.0') {
      return 0;
    }
    
    // Tentar converter para número
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  }
  
  // Para qualquer outro tipo (null, undefined, etc), retornar 0
  return 0;
}

/**
 * Limpa strings, removendo valores vazios e normalizando
 */
export function cleanString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return String(value);
  
  const cleaned = value.trim();
  return cleaned === 'undefined' || cleaned === 'null' ? '' : cleaned;
}

/**
 * Remove propriedades vazias, undefined ou null de um objeto
 */
export function removeEmptyProperties(obj) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    // Para arrays, filtrar itens vazios e recursivamente limpar cada item
    return obj
      .filter(item => item !== null && item !== undefined && item !== '')
      .map(item => removeEmptyProperties(item))
      .filter(item => {
        // Remover objetos completamente vazios
        if (typeof item === 'object' && item !== null) {
          return Object.keys(item).length > 0;
        }
        return true;
      });
  }
  
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    // Pular valores undefined, null ou strings vazias
    if (value === undefined || value === null || value === '') continue;
    
    // Para strings, normalizar
    if (typeof value === 'string') {
      const cleanedString = cleanString(value);
      if (cleanedString !== '') {
        cleaned[key] = cleanedString;
      }
    }
    // Para números, garantir que são válidos
    else if (typeof value === 'number') {
      if (isFinite(value) && !isNaN(value)) {
        cleaned[key] = value;
      }
    }
    // Para objetos/arrays, recursivamente limpar
    else if (typeof value === 'object') {
      const cleanedValue = removeEmptyProperties(value);
      if (cleanedValue !== null && 
          (Array.isArray(cleanedValue) ? cleanedValue.length > 0 : Object.keys(cleanedValue).length > 0)) {
        cleaned[key] = cleanedValue;
      }
    }
    // Para outros tipos (boolean), manter
    else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Limpa dados de um ingrediente
 */
export function cleanIngredientData(ingredient) {
  if (!ingredient) return null;
  
  const cleaned = {
    id: ingredient.id || String(Date.now()),
    name: cleanString(ingredient.name),
    
    // Pesos - converter para números
    weight_frozen: parseNumericValue(ingredient.weight_frozen),
    weight_raw: parseNumericValue(ingredient.weight_raw),
    weight_thawed: parseNumericValue(ingredient.weight_thawed),
    weight_clean: parseNumericValue(ingredient.weight_clean),
    weight_pre_cooking: parseNumericValue(ingredient.weight_pre_cooking),
    weight_cooked: parseNumericValue(ingredient.weight_cooked),
    weight_portioned: parseNumericValue(ingredient.weight_portioned),
    
    // Preços
    current_price: parseNumericValue(ingredient.current_price),
    raw_price_kg: parseNumericValue(ingredient.raw_price_kg),
    liquid_price_kg: parseNumericValue(ingredient.liquid_price_kg),
    
    // Outros campos opcionais
    unit: cleanString(ingredient.unit) || 'kg',
    brand: cleanString(ingredient.brand),
    category: cleanString(ingredient.category),
    notes: cleanString(ingredient.notes)
  };
  
  // Remover propriedades com valores 0 ou strings vazias desnecessárias
  return removeEmptyProperties(cleaned);
}

/**
 * Limpa dados de um sub-componente
 */
export function cleanSubComponentData(subComponent) {
  if (!subComponent) return null;
  
  const cleaned = {
    id: subComponent.id || String(Date.now()),
    name: cleanString(subComponent.name),
    type: cleanString(subComponent.type) || 'preparation',
    source_id: cleanString(subComponent.source_id),
    
    // Pesos e custos
    assembly_weight_kg: parseNumericValue(subComponent.assembly_weight_kg),
    yield_weight: parseNumericValue(subComponent.yield_weight),
    total_cost: parseNumericValue(subComponent.total_cost),
    input_yield_weight: parseNumericValue(subComponent.input_yield_weight),
    input_total_cost: parseNumericValue(subComponent.input_total_cost),
    
    // Campos opcionais
    notes: cleanString(subComponent.notes)
  };
  
  return removeEmptyProperties(cleaned);
}

/**
 * Limpa configuração de montagem/assembly
 */
export function cleanAssemblyConfig(assemblyConfig) {
  if (!assemblyConfig) return null;
  
  const cleaned = {
    container_type: cleanString(assemblyConfig.container_type) || 'cuba',
    total_weight: parseNumericValue(assemblyConfig.total_weight),
    units_quantity: parseNumericValue(assemblyConfig.units_quantity) || 1,
    notes: cleanString(assemblyConfig.notes)
  };
  
  return removeEmptyProperties(cleaned);
}

/**
 * Limpa dados de uma preparação
 */
export function cleanPreparationData(preparation) {
  if (!preparation) return null;
  
  const cleaned = {
    id: preparation.id || String(Date.now()),
    title: cleanString(preparation.title),
    processes: Array.isArray(preparation.processes) ? preparation.processes.filter(p => p && p.trim() !== '') : [],
    instructions: cleanString(preparation.instructions),
    
    // Limpar ingredientes
    ingredients: Array.isArray(preparation.ingredients) 
      ? preparation.ingredients
          .map(ing => cleanIngredientData(ing))
          .filter(ing => ing && ing.name) // Só manter ingredientes com nome
      : [],
    
    // Limpar sub-componentes
    sub_components: Array.isArray(preparation.sub_components)
      ? preparation.sub_components
          .map(sc => cleanSubComponentData(sc))
          .filter(sc => sc && sc.name) // Só manter sub-componentes com nome
      : [],
    
    // Configuração de montagem
    assembly_config: preparation.assembly_config ? cleanAssemblyConfig(preparation.assembly_config) : null,
    
    // Métricas calculadas (números)
    total_yield_weight_prep: parseNumericValue(preparation.total_yield_weight_prep),
    total_cost_prep: parseNumericValue(preparation.total_cost_prep),
    yield_percentage_prep: parseNumericValue(preparation.yield_percentage_prep)
  };
  
  return removeEmptyProperties(cleaned);
}

/**
 * FUNÇÃO PRINCIPAL: Limpa dados completos de uma receita
 */
export function cleanRecipeData(recipeData, preparationsData = []) {
  const cleaned = {
    // ID (manter se existir)
    ...(recipeData.id && { id: recipeData.id }),
    
    // Informações básicas
    name: cleanString(recipeData.name),
    name_complement: cleanString(recipeData.name_complement),
    category: cleanString(recipeData.category),
    instructions: cleanString(recipeData.instructions),
    
    // Números
    prep_time: parseNumericValue(recipeData.prep_time),
    
    // Métricas de peso
    total_weight: parseNumericValue(recipeData.total_weight),
    yield_weight: parseNumericValue(recipeData.yield_weight),
    cuba_weight: parseNumericValue(recipeData.cuba_weight),
    portion_weight_calculated: parseNumericValue(recipeData.portion_weight_calculated),
    
    // Métricas de custo
    total_cost: parseNumericValue(recipeData.total_cost),
    cost_per_kg_raw: parseNumericValue(recipeData.cost_per_kg_raw),
    cost_per_kg_yield: parseNumericValue(recipeData.cost_per_kg_yield),
    cuba_cost: parseNumericValue(recipeData.cuba_cost),
    portion_cost: parseNumericValue(recipeData.portion_cost),
    
    // Percentual de rendimento
    yield_percentage: parseNumericValue(recipeData.yield_percentage),
    
    // Boolean
    active: recipeData.active !== undefined ? Boolean(recipeData.active) : true,
    
    // Metadados (campos opcionais calculados)
    container_type: cleanString(recipeData.container_type),
    weight_field_name: cleanString(recipeData.weight_field_name),
    cost_field_name: cleanString(recipeData.cost_field_name),
    last_calculated: recipeData.last_calculated || new Date().toISOString(),
    
    // Preparações limpas
    preparations: Array.isArray(preparationsData) 
      ? preparationsData
          .map(prep => cleanPreparationData(prep))
          .filter(prep => prep && prep.title) // Só manter preparações com título
      : []
  };
  
  // Remover propriedades completamente vazias
  const finalCleaned = removeEmptyProperties(cleaned);
  
  // Garantir que campos obrigatórios existam
  if (!finalCleaned.name) {
    throw new Error('Nome da receita é obrigatório');
  }
  
  // Se não há preparações, garantir que há ao menos array vazio
  if (!finalCleaned.preparations) {
    finalCleaned.preparations = [];
  }
  
  return finalCleaned;
}

/**
 * Valida dados limpos antes do salvamento
 */
export function validateCleanedRecipe(cleanedData) {
  const errors = [];
  const warnings = [];
  
  // Validações obrigatórias
  if (!cleanedData.name) {
    errors.push('Nome da receita é obrigatório');
  }
  
  // Validações de dados
  if (cleanedData.total_weight < 0) {
    errors.push('Peso total não pode ser negativo');
  }
  
  if (cleanedData.total_cost < 0) {
    errors.push('Custo total não pode ser negativo');
  }
  
  // Avisos
  if (cleanedData.preparations.length === 0) {
    warnings.push('Receita sem preparações definidas');
  }
  
  const hasIngredients = cleanedData.preparations.some(prep => 
    prep.ingredients && prep.ingredients.length > 0
  );
  
  if (!hasIngredients) {
    warnings.push('Nenhum ingrediente encontrado nas preparações');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Função de conveniência para log de limpeza (desenvolvimento)
 */
export function logCleaningResults(original, cleaned) {
  // Console logging removed for production
}

export default {
  cleanRecipeData,
  cleanPreparationData,
  cleanIngredientData,
  cleanSubComponentData,
  cleanAssemblyConfig,
  validateCleanedRecipe,
  parseNumericValue,
  cleanString,
  removeEmptyProperties,
  logCleaningResults
};