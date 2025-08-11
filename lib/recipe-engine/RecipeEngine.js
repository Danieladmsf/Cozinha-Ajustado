/**
 * RECIPE ENGINE - SISTEMA UNIFICADO DE CÁLCULOS DE RECEITAS
 * 
 * Sistema principal, limpo e sem gambiarras para todos os cálculos relacionados 
 * a receitas, preparações, ingredientes e montagem.
 * 
 * ÚNICA FONTE DA VERDADE para todos os cálculos do sistema.
 * 
 * @version 3.0.0
 * @author Sistema Cozinha Afeto
 */

// Imports serão feitos dinamicamente para evitar problemas circulares

// ========================================
// DEFINIÇÕES DE CAMPOS PADRONIZADOS
// ========================================

export const WEIGHT_FIELDS = {
  // Ordem de prioridade para peso inicial
  INITIAL_PRIORITY: ['weight_frozen', 'weight_raw', 'weight_thawed', 'quantity'],
  
  // Ordem de prioridade para peso final
  FINAL_PRIORITY: ['weight_portioned', 'weight_cooked', 'weight_clean', 'weight_thawed', 'weight_raw', 'quantity'],
  
  // Mapeamento de processos para campos de peso
  PROCESS_MAPPING: {
    defrosting: { from: 'weight_frozen', to: 'weight_thawed' },
    cleaning: { from: ['weight_thawed', 'weight_raw'], to: 'weight_clean' },
    cooking: { from: ['weight_pre_cooking', 'weight_clean', 'weight_thawed', 'weight_raw'], to: 'weight_cooked' },
    portioning: { from: ['weight_cooked', 'weight_clean', 'weight_thawed', 'weight_raw'], to: 'weight_portioned' },
    assembly: { from: '*', to: 'assembly_weight_kg' }
  }
};

export const PRICE_FIELDS = {
  PRIORITY: ['current_price', 'unit_price', 'raw_price_kg', 'liquid_price_kg']
};

export const PROCESS_TYPES = {
  PREPARATION: ['defrosting', 'cleaning', 'cooking'],
  FINALIZATION: ['portioning', 'assembly']
};

// ========================================
// CLASSE PRINCIPAL DO RECIPE ENGINE
// ========================================

export class RecipeEngine {
  
  // ========================================
  // MÉTODOS BÁSICOS DE DADOS
  // ========================================
  
  /**
   * Parsing único e robusto de valores numéricos
   */
  static parseValue(value) {
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
   * Obtém peso inicial de um ingrediente seguindo prioridade lógica
   */
  static getInitialWeight(ingredient, processes = []) {
    if (!ingredient) return 0;
    
    // Se há processos específicos, usar lógica simples por processo
    if (processes.length > 0) {
      // Para cleaning, priorizar weight_raw ou weight_thawed
      if (processes.includes('cleaning')) {
        const rawWeight = this.parseValue(ingredient.weight_raw);
        if (rawWeight > 0) return rawWeight;
        const thawedWeight = this.parseValue(ingredient.weight_thawed);
        if (thawedWeight > 0) return thawedWeight;
      }
      
      // Para defrosting, usar weight_frozen
      if (processes.includes('defrosting')) {
        const frozenWeight = this.parseValue(ingredient.weight_frozen);
        if (frozenWeight > 0) return frozenWeight;
      }
    }
    
    // Lógica padrão: seguir ordem de prioridade
    for (const field of WEIGHT_FIELDS.INITIAL_PRIORITY) {
      const value = this.parseValue(ingredient[field]);
      if (value > 0) return value;
    }
    
    return 0;
  }
  
  /**
   * Obtém peso final de um ingrediente seguindo prioridade lógica
   */
  static getFinalWeight(ingredient) {
    if (!ingredient) return 0;
    
    for (const field of WEIGHT_FIELDS.FINAL_PRIORITY) {
      const value = this.parseValue(ingredient[field]);
      if (value > 0) return value;
    }
    
    return 0;
  }
  
  /**
   * Obtém preço unitário de um ingrediente
   */
  static getUnitPrice(ingredient) {
    if (!ingredient) return 0;
    
    for (const field of PRICE_FIELDS.PRIORITY) {
      const value = this.parseValue(ingredient[field]);
      if (value > 0) return value;
    }
    
    return 0;
  }
  
  // ========================================
  // CÁLCULOS DE INGREDIENTES
  // ========================================
  
  /**
   * Calcula custo total de um ingrediente
   */
  static calculateIngredientCost(ingredient, processes = []) {
    const weight = this.getInitialWeight(ingredient, processes);
    const price = this.getUnitPrice(ingredient);
    return weight * price;
  }
  
  /**
   * Calcula rendimento percentual de um ingrediente
   */
  static calculateIngredientYield(ingredient, processes = []) {
    const initialWeight = this.getInitialWeight(ingredient, processes);
    const finalWeight = this.getFinalWeight(ingredient);
    
    if (initialWeight === 0) return 0;
    return (finalWeight / initialWeight) * 100;
  }
  
  /**
   * Calcula perda percentual entre dois pesos
   */
  static calculateLoss(initialWeight, finalWeight) {
    const initial = this.parseValue(initialWeight);
    const final = this.parseValue(finalWeight);
    
    if (initial === 0) return 0;
    
    const lossPercent = ((initial - final) / initial) * 100;
    return Math.max(0, lossPercent);
  }
  
  // ========================================
  // CÁLCULOS DE PREPARAÇÃO
  // ========================================
  
  /**
   * Calcula métricas de uma preparação individual
   */
  static calculatePreparationMetrics(preparation) {
    if (!preparation) {
      return RecipeEngine.getEmptyPreparationMetrics();
    }
    
    // Normalizar dados de entrada (implementação básica aqui)
    const normalizedPrep = {
      ...preparation,
      ingredients: preparation.ingredients || [],
      sub_components: preparation.sub_components || [],
      processes: preparation.processes || []
    };
    
    // Determinar se é etapa de finalização
    const isFinalizationOnly = RecipeEngine.isFinalizationProcess(normalizedPrep.processes);
    
    let totalRawWeight = 0;
    let totalYieldWeight = 0;
    let totalCost = 0;
    let totalYieldSum = 0;
    let ingredientCount = 0;
    
    // Processar ingredientes
    if (normalizedPrep.ingredients && normalizedPrep.ingredients.length > 0) {
      normalizedPrep.ingredients.forEach(ingredient => {
        const initialWeight = RecipeEngine.getInitialWeight(ingredient, normalizedPrep.processes);
        const finalWeight = isFinalizationOnly ? initialWeight : RecipeEngine.getFinalWeight(ingredient);
        const cost = RecipeEngine.calculateIngredientCost(ingredient, normalizedPrep.processes);
        const yieldPercent = isFinalizationOnly ? 100 : RecipeEngine.calculateIngredientYield(ingredient, normalizedPrep.processes);
        
        totalRawWeight += initialWeight;
        totalYieldWeight += finalWeight;
        totalCost += cost;
        totalYieldSum += yieldPercent;
        ingredientCount++;
      });
    }
    
    // Processar sub-componentes (assembly/portioning) - implementação básica
    if (normalizedPrep.sub_components && normalizedPrep.sub_components.length > 0) {
      normalizedPrep.sub_components.forEach(sc => {
        const weight = RecipeEngine.parseValue(sc.assembly_weight_kg);
        const cost = RecipeEngine.parseValue(sc.input_total_cost) || 0;
        
        // Para sub-componentes, calcular custo proporcional
        const inputYieldWeight = RecipeEngine.parseValue(sc.input_yield_weight);
        let proportionalCost = cost;
        
        if (inputYieldWeight > 0 && weight > 0) {
          proportionalCost = (weight / inputYieldWeight) * cost;
        }
        
        totalRawWeight += weight;
        totalYieldWeight += weight; // Sub-componentes já processados
        totalCost += proportionalCost;
      });
    }
    
    const averageYield = ingredientCount > 0 ? totalYieldSum / ingredientCount : 0;
    const yieldPercentage = totalRawWeight > 0 ? (totalYieldWeight / totalRawWeight) * 100 : 0;
    
    return {
      totalRawWeight,
      totalYieldWeight,
      totalCost,
      yieldPercentage,
      averageYield,
      hasIngredients: ingredientCount > 0,
      hasSubComponents: normalizedPrep.sub_components?.length > 0 || false,
      isFinalizationOnly
    };
  }
  
  /**
   * Verifica se são apenas processos de finalização
   */
  static isFinalizationProcess(processes = []) {
    if (!processes.length) return false;
    
    const hasPreparation = processes.some(p => PROCESS_TYPES.PREPARATION.includes(p));
    const hasFinalization = processes.some(p => PROCESS_TYPES.FINALIZATION.includes(p));
    
    return hasFinalization && !hasPreparation;
  }
  
  // ========================================
  // CÁLCULOS DE RECEITA COMPLETA
  // ========================================
  
  /**
   * Calcula todas as métricas de uma receita completa
   */
  static calculateRecipeMetrics(recipeData, preparationsData = []) {
    if (!preparationsData || preparationsData.length === 0) {
      return RecipeEngine.getEmptyRecipeMetrics();
    }
    
    // Normalizar dados (implementação básica)
    const normalizedRecipe = { ...recipeData };
    const normalizedPreparations = preparationsData.map(prep => ({
      ...prep,
      ingredients: prep.ingredients || [],
      sub_components: prep.sub_components || [],
      processes: prep.processes || []
    }));
    
    let totalRawWeight = 0;
    let totalYieldWeight = 0;
    let totalCost = 0;
    let preparationMetrics = [];
    
    // Calcular métricas de cada preparação
    normalizedPreparations.forEach((prep, index) => {
      const metrics = RecipeEngine.calculatePreparationMetrics(prep);
      
      // Somar apenas preparações com ingredientes (não sub-componentes puros)
      if (metrics.hasIngredients) {
        totalRawWeight += metrics.totalRawWeight;
        totalYieldWeight += metrics.totalYieldWeight;
        totalCost += metrics.totalCost;
      }
      
      preparationMetrics.push({
        ...metrics,
        preparationIndex: index,
        preparationTitle: prep.title,
        includedInTotal: metrics.hasIngredients
      });
    });
    
    // Calcular métricas derivadas
    const costPerKgRaw = totalRawWeight > 0 ? totalCost / totalRawWeight : 0;
    const costPerKgYield = totalYieldWeight > 0 ? totalCost / totalYieldWeight : 0;
    const overallYieldPercentage = totalRawWeight > 0 ? (totalYieldWeight / totalRawWeight) * 100 : 0;
    
    // Calcular peso e custo da porção/cuba
    const portionMetrics = RecipeEngine.calculatePortionMetrics(normalizedPreparations, costPerKgYield);
    
    return {
      // Pesos
      total_weight: totalRawWeight,
      yield_weight: totalYieldWeight,
      cuba_weight: portionMetrics.weight,
      portion_weight_calculated: portionMetrics.weight,
      
      // Custos
      total_cost: totalCost,
      cost_per_kg_raw: costPerKgRaw,
      cost_per_kg_yield: costPerKgYield,
      cuba_cost: portionMetrics.cost,
      portion_cost: portionMetrics.cost,
      
      // Rendimentos
      yield_percentage: overallYieldPercentage,
      
      // Metadados
      container_type: portionMetrics.containerType,
      weight_field_name: portionMetrics.weightFieldName,
      cost_field_name: portionMetrics.costFieldName,
      last_calculated: new Date().toISOString(),
      
      // Métricas detalhadas
      preparation_metrics: preparationMetrics,
      
      // Flags de validação
      has_ingredients: preparationMetrics.some(m => m.hasIngredients),
      has_assembly: preparationMetrics.some(m => m.hasSubComponents),
      is_valid: preparationMetrics.length > 0
    };
  }
  
  // ========================================
  // CÁLCULOS DE PORÇÃO/CUBA
  // ========================================
  
  /**
   * Calcula métricas da porção/cuba final
   */
  static calculatePortionMetrics(preparations, costPerKgYield) {
    // Implementação básica inline para evitar dependências circulares
    let portionWeight = 0;
    
    // Encontrar preparação de assembly/portioning
    const assemblyPrep = preparations.find(prep => 
      prep.processes?.includes('assembly') || 
      prep.processes?.includes('portioning')
    );
    
    if (assemblyPrep && assemblyPrep.sub_components?.length > 0) {
      // Somar pesos dos sub-componentes
      portionWeight = assemblyPrep.sub_components.reduce((total, sc) => {
        const weight = RecipeEngine.parseValue(sc.assembly_weight_kg);
        return total + weight;
      }, 0);
    } else {
      // Usar peso configurado ou peso de rendimento total
      const configWeight = assemblyPrep?.assembly_config?.total_weight;
      if (configWeight) {
        portionWeight = RecipeEngine.parseValue(configWeight);
      }
    }
    
    const portionCost = portionWeight * costPerKgYield;
    
    // Determinar tipo de container
    const containerType = RecipeEngine.getContainerType(preparations);
    
    return {
      weight: portionWeight,
      cost: portionCost,
      containerType,
      weightFieldName: RecipeEngine.getWeightFieldName(containerType),
      costFieldName: RecipeEngine.getCostFieldName(containerType)
    };
  }
  
  /**
   * Determina tipo de container baseado nas preparações
   */
  static getContainerType(preparations) {
    const assemblyPrep = preparations.find(prep => 
      prep.processes?.includes('assembly') || 
      prep.processes?.includes('portioning')
    );
    
    return assemblyPrep?.assembly_config?.container_type || 'cuba';
  }
  
  /**
   * Gera nome do campo de peso baseado no container
   */
  static getWeightFieldName(containerType) {
    const fieldNames = {
      'cuba': 'Peso da Cuba',
      'cuba-g': 'Peso da Cuba G',
      'cuba-p': 'Peso da Cuba P', 
      'descartavel': 'Peso da Embalagem',
      'individual': 'Peso da Porção',
      'kg': 'Peso por Kg',
      'outros': 'Peso da Unidade'
    };
    
    return fieldNames[containerType] || 'Peso da Cuba';
  }
  
  /**
   * Gera nome do campo de custo baseado no container
   */
  static getCostFieldName(containerType) {
    const fieldNames = {
      'cuba': 'Custo da Cuba',
      'cuba-g': 'Custo da Cuba G',
      'cuba-p': 'Custo da Cuba P',
      'descartavel': 'Custo da Embalagem',
      'individual': 'Custo da Porção',
      'kg': 'Custo por Kg',
      'outros': 'Custo da Unidade'
    };
    
    return fieldNames[containerType] || 'Custo da Cuba';
  }
  
  // ========================================
  // MÉTODOS DE CONVENIÊNCIA
  // ========================================
  
  /**
   * Retorna métricas vazias para preparação
   */
  static getEmptyPreparationMetrics() {
    return {
      totalRawWeight: 0,
      totalYieldWeight: 0,
      totalCost: 0,
      yieldPercentage: 0,
      averageYield: 0,
      hasIngredients: false,
      hasSubComponents: false,
      isFinalizationOnly: false
    };
  }
  
  /**
   * Retorna métricas vazias para receita
   */
  static getEmptyRecipeMetrics() {
    return {
      total_weight: 0,
      yield_weight: 0,
      cuba_weight: 0,
      portion_weight_calculated: 0,
      total_cost: 0,
      cost_per_kg_raw: 0,
      cost_per_kg_yield: 0,
      cuba_cost: 0,
      portion_cost: 0,
      yield_percentage: 0,
      container_type: 'cuba',
      weight_field_name: 'Peso da Cuba',
      cost_field_name: 'Custo da Cuba',
      last_calculated: new Date().toISOString(),
      preparation_metrics: [],
      has_ingredients: false,
      has_assembly: false,
      is_valid: false
    };
  }
  
  // ========================================
  // MÉTODO DE DEBUG
  // ========================================
  
  /**
   * Gera relatório detalhado para debug
   */
  static generateDebugReport(recipeData, preparationsData) {
    // Validação básica inline
    const validation = {
      isValid: Array.isArray(preparationsData) && preparationsData.length > 0,
      errors: [],
      warnings: []
    };
    
    if (!Array.isArray(preparationsData) || preparationsData.length === 0) {
      validation.errors.push('Nenhuma preparação fornecida');
    }
    
    const metrics = RecipeEngine.calculateRecipeMetrics(recipeData, preparationsData);
    
    return {
      timestamp: new Date().toISOString(),
      version: '3.0.0',
      input: {
        recipe: recipeData,
        preparations: preparationsData
      },
      validation,
      metrics,
      summary: {
        ingredientsCount: preparationsData?.reduce((total, prep) => 
          total + (prep.ingredients?.length || 0), 0) || 0,
        subComponentsCount: preparationsData?.reduce((total, prep) => 
          total + (prep.sub_components?.length || 0), 0) || 0,
        preparationsCount: preparationsData?.length || 0
      }
    };
  }
}

// ========================================
// EXPORTS PARA COMPATIBILIDADE
// ========================================

// Funções de conveniência para uso direto
export const parseValue = RecipeEngine.parseValue;
export const calculateRecipeMetrics = RecipeEngine.calculateRecipeMetrics;
export const calculatePreparationMetrics = RecipeEngine.calculatePreparationMetrics;
export const generateDebugReport = RecipeEngine.generateDebugReport;

export default RecipeEngine;