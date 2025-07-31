/**
 * SISTEMA UNIFICADO DE CÁLCULOS DE RECEITAS
 * 
 * Nova arquitetura limpa e organizada para todos os cálculos da ficha técnica.
 * Elimina duplicação de código e padroniza nomenclatura de campos.
 * 
 * @version 2.0.0
 * @author Sistema Cozinha Afeto
 */

// ========================================
// UTILITÁRIOS BÁSICOS
// ========================================

/**
 * Parsing seguro e padronizado de valores numéricos
 * Aceita strings com vírgula, pontos, valores undefined/null
 */
export const parseNumber = (value) => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * Formatação padronizada de valores
 */
export const formatters = {
  weight: (value, decimals = 3) => {
    const num = parseNumber(value);
    return num.toFixed(decimals).replace('.', ',');
  },
  
  currency: (value) => {
    const num = parseNumber(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  },
  
  percentage: (value, decimals = 1) => {
    const num = parseNumber(value);
    return `${num.toFixed(decimals).replace('.', ',')}%`;
  }
};

// ========================================
// DEFINIÇÕES DE ESTRUTURA DE DADOS
// ========================================

/**
 * Campos padronizados de peso por processo
 * ÚNICA FONTE DA VERDADE para nomes de campos
 */
export const WEIGHT_FIELDS = {
  // Entrada/Bruto
  frozen: 'weight_frozen',        // Peso congelado
  raw: 'weight_raw',             // Peso bruto/cru
  thawed: 'weight_thawed',       // Peso descongelado
  
  // Processamento
  clean: 'weight_clean',         // Peso após limpeza
  preCooking: 'weight_pre_cooking', // Peso pré-cocção
  cooked: 'weight_cooked',       // Peso após cocção
  portioned: 'weight_portioned', // Peso porcionado
  
  // Assembly/Montagem
  assembly: 'assembly_weight_kg' // Peso na montagem
};

/**
 * Campos de preços padronizados
 */
export const PRICE_FIELDS = {
  current: 'current_price',      // Preço atual
  raw: 'raw_price_kg',          // Preço por kg bruto
  liquid: 'liquid_price_kg'     // Preço por kg líquido
};

/**
 * Sequência lógica de processamento
 * Define a ordem natural dos processos
 */
export const PROCESS_SEQUENCE = [
  'defrosting',  // Descongelamento
  'cleaning',    // Limpeza
  'cooking',     // Cocção
  'portioning',  // Porcionamento
  'assembly'     // Montagem
];

// ========================================
// CLASSE PRINCIPAL DE CÁLCULOS
// ========================================

export class RecipeCalculator {
  
  /**
   * Extrai o peso inicial de um ingrediente
   * Segue prioridade lógica inteligente baseada nos campos preenchidos
   */
  static getInitialWeight(ingredient) {
    // Prioridade inteligente: usar o primeiro campo preenchido na ordem lógica
    const weights = [
      parseNumber(ingredient[WEIGHT_FIELDS.frozen]),      // Peso congelado
      parseNumber(ingredient[WEIGHT_FIELDS.raw]),         // Peso bruto
      parseNumber(ingredient[WEIGHT_FIELDS.preCooking]),  // Peso pré-cocção
      parseNumber(ingredient[WEIGHT_FIELDS.thawed]),      // Peso descongelado
      parseNumber(ingredient.quantity)                    // Quantidade geral
    ];
    
    // Retornar o primeiro peso válido (> 0)
    for (const weight of weights) {
      if (weight > 0) {
        return weight;
      }
    }
    
    return 0;
  }
  
  /**
   * Obtém o peso inicial baseado nos processos ativos
   * Usado para cálculos mais inteligentes na UI
   */
  static getInitialWeightByProcesses(ingredient, processes = []) {
    const hasProcess = (processName) => processes.includes(processName);
    
    if (hasProcess('defrosting')) {
      return parseNumber(ingredient[WEIGHT_FIELDS.frozen]);
    }
    
    if (hasProcess('cleaning') && !hasProcess('defrosting')) {
      return parseNumber(ingredient[WEIGHT_FIELDS.raw]);
    }
    
    if (hasProcess('cooking')) {
      return parseNumber(ingredient[WEIGHT_FIELDS.preCooking]) ||
             parseNumber(ingredient[WEIGHT_FIELDS.clean]) ||
             parseNumber(ingredient[WEIGHT_FIELDS.thawed]) ||
             parseNumber(ingredient[WEIGHT_FIELDS.raw]);
    }
    
    // Fallback para o método padrão
    return this.getInitialWeight(ingredient);
  }
  
  /**
   * Extrai o peso final de um ingrediente
   * Segue prioridade lógica: porcionado > cozido > limpo > descongelado > bruto
   */
  static getFinalWeight(ingredient) {
    return parseNumber(ingredient[WEIGHT_FIELDS.portioned]) ||
           parseNumber(ingredient[WEIGHT_FIELDS.cooked]) ||
           parseNumber(ingredient[WEIGHT_FIELDS.clean]) ||
           parseNumber(ingredient[WEIGHT_FIELDS.thawed]) ||
           parseNumber(ingredient[WEIGHT_FIELDS.raw]) ||
           parseNumber(ingredient.quantity) || 0;
  }
  
  /**
   * Obtém o preço unitário de um ingrediente
   * Prioriza current_price, depois outros campos
   */
  static getUnitPrice(ingredient) {
    return parseNumber(ingredient[PRICE_FIELDS.current]) ||
           parseNumber(ingredient[PRICE_FIELDS.raw]) ||
           parseNumber(ingredient[PRICE_FIELDS.liquid]) || 0;
  }
  
  /**
   * Calcula perda percentual entre dois pesos
   */
  static calculateLoss(initialWeight, finalWeight) {
    const initial = parseNumber(initialWeight);
    const final = parseNumber(finalWeight);
    
    if (initial === 0) return 0;
    
    const lossPercent = ((initial - final) / initial) * 100;
    return Math.max(0, lossPercent); // Nunca negativo
  }
  
  /**
   * Calcula rendimento percentual de um ingrediente
   */
  static calculateYield(ingredient) {
    const initialWeight = this.getInitialWeight(ingredient);
    const finalWeight = this.getFinalWeight(ingredient);
    
    if (initialWeight === 0) return 0;
    
    return (finalWeight / initialWeight) * 100;
  }
  
  /**
   * Calcula o custo total de um ingrediente
   * Custo = peso inicial × preço unitário
   */
  static calculateIngredientCost(ingredient) {
    const initialWeight = this.getInitialWeight(ingredient);
    const unitPrice = this.getUnitPrice(ingredient);
    
    // CORREÇÃO: Se não há peso inicial, tentar usar o peso final como base
    // Isso pode acontecer quando só o peso final (pós-cocção) está preenchido
    let actualWeight = initialWeight;
    if (actualWeight === 0) {
      actualWeight = this.getFinalWeight(ingredient);
    }
    
    return actualWeight * unitPrice;
  }
  
  // ========================================
  // CÁLCULOS DE PREPARAÇÃO
  // ========================================
  
  /**
   * Calcula métricas de uma preparação individual
   */
  static calculatePreparationMetrics(preparation) {
    if (!preparation) {
      return {
        totalRawWeight: 0,
        totalYieldWeight: 0,
        totalCost: 0,
        yieldPercentage: 0,
        averageYield: 0
      };
    }
    
    let totalRawWeight = 0;
    let totalYieldWeight = 0;
    let totalCost = 0;
    let totalYieldSum = 0;
    let ingredientCount = 0;
    
    // Verificar se é preparação de Porcionamento ou Montagem pura
    const isPortioningOnly = preparation.processes?.includes('portioning') && 
      !preparation.processes?.includes('defrosting') && 
      !preparation.processes?.includes('cleaning') && 
      !preparation.processes?.includes('cooking');
      
    const isAssemblyOnly = preparation.processes?.includes('assembly') && 
      !preparation.processes?.includes('defrosting') && 
      !preparation.processes?.includes('cleaning') && 
      !preparation.processes?.includes('cooking');
    
    const isFinalProcessOnly = isPortioningOnly || isAssemblyOnly;
    
    // Processar ingredientes normais
    if (preparation.ingredients && Array.isArray(preparation.ingredients)) {
      preparation.ingredients.forEach((ingredient, index) => {
        let initialWeight, finalWeight, cost, yieldPercent;
        
        if (isFinalProcessOnly) {
          // INGREDIENTES EM PORCIONAMENTO/MONTAGEM: peso bruto = peso rendimento
          // São apenas finalização, não há perda de processo
          const weight = this.getInitialWeight(ingredient) || this.getFinalWeight(ingredient);
          initialWeight = weight;
          finalWeight = weight;  // Mesmo peso para bruto e rendimento
          cost = this.calculateIngredientCost(ingredient);
          yieldPercent = 100; // 100% de rendimento (sem perdas de processo)
          
        } else {
          // INGREDIENTES NORMAIS: usar lógica padrão
          initialWeight = this.getInitialWeight(ingredient);
          finalWeight = this.getFinalWeight(ingredient);
          cost = this.calculateIngredientCost(ingredient);
          yieldPercent = this.calculateYield(ingredient);
          
        }
        
        totalRawWeight += initialWeight;
        totalYieldWeight += finalWeight;
        totalCost += cost;
        totalYieldSum += yieldPercent;
        ingredientCount++;
      });
    }
    
    // Processar sub-componentes (montagem/porcionamento)
    if (preparation.sub_components && Array.isArray(preparation.sub_components)) {
      preparation.sub_components.forEach((subComp, index) => {
        const weight = parseNumber(subComp[WEIGHT_FIELDS.assembly]);
        const cost = parseNumber(subComp.total_cost);
        
        // Sub-componentes: sempre peso inicial = peso final (já processados ou preparações anteriores)
        totalRawWeight += weight;
        totalYieldWeight += weight;
        totalCost += cost;
        
      });
    }
    
    const averageYield = ingredientCount > 0 ? totalYieldSum / ingredientCount : 0;
    const yieldPercentage = totalRawWeight > 0 ? (totalYieldWeight / totalRawWeight) * 100 : 0;
    
    const result = {
      totalRawWeight,
      totalYieldWeight,
      totalCost,
      yieldPercentage,
      averageYield
    };
    
    
    return result;
  }
  
  // ========================================
  // CÁLCULOS DE RECEITA COMPLETA
  // ========================================
  
  /**
   * Calcula todas as métricas de uma receita
   */
  static calculateRecipeMetrics(preparations, recipeData = {}) {
    if (!preparations || !Array.isArray(preparations) || preparations.length === 0) {
      return this.getEmptyMetrics();
    }
    
    let totalRawWeight = 0;
    let totalYieldWeight = 0;
    let totalCost = 0;
    let preparationMetrics = [];
    
    // Processar cada preparação
    preparations.forEach((prep, index) => {
      const prepMetrics = this.calculatePreparationMetrics(prep);
      
      // Só somar preparações com ingredientes (não sub-componentes)
      const hasIngredients = prep.ingredients && prep.ingredients.length > 0;
      
      if (hasIngredients) {
        totalRawWeight += prepMetrics.totalRawWeight;
        totalYieldWeight += prepMetrics.totalYieldWeight;
        totalCost += prepMetrics.totalCost;
      }
      
      preparationMetrics.push({
        ...prepMetrics,
        preparationIndex: index,
        preparationTitle: prep.title,
        includedInTotal: hasIngredients
      });
    });
    
    // Calcular métricas derivadas
    const costPerKgRaw = totalRawWeight > 0 ? totalCost / totalRawWeight : 0;
    const costPerKgYield = totalYieldWeight > 0 ? totalCost / totalYieldWeight : 0;
    const overallYieldPercentage = totalRawWeight > 0 ? (totalYieldWeight / totalRawWeight) * 100 : 0;
    
    // SEMPRE usar peso de rendimento calculado (correção do bug)
    const finalYieldWeight = totalYieldWeight;
    
    // Calcular peso da porção/cuba
    const cubaWeight = this.calculatePortionWeight(preparations);
    
    // Calcular custo da cuba baseado no peso e custo por kg de rendimento
    const cubaCost = cubaWeight * costPerKgYield;
    
    const result = {
      // Pesos
      total_weight: totalRawWeight,
      yield_weight: finalYieldWeight,
      cuba_weight: cubaWeight,
      portion_weight_calculated: cubaWeight, // Valor calculado automaticamente
      
      // Custos
      total_cost: totalCost,
      cost_per_kg_raw: costPerKgRaw,
      cost_per_kg_yield: costPerKgYield,
      cuba_cost: cubaCost,
      portion_cost: cubaCost, // NOVO: Custo da porção para salvar no banco
      
      // Rendimentos
      yield_percentage: overallYieldPercentage,
      
      // Metadados
      container_type: this.getContainerType(preparations),
      weight_field_name: this.getWeightFieldName(preparations),
      cost_field_name: this.getCostFieldName(preparations),
      last_calculated: new Date().toISOString(),
      
      // Métricas das preparações individuais
      preparation_metrics: preparationMetrics
    };
    
    
    return result;
  }
  
  // ========================================
  // MÉTODOS AUXILIARES
  // ========================================
  
  /**
   * Retorna métricas vazias/zero
   */
  static getEmptyMetrics() {
    return {
      total_weight: 0,
      yield_weight: 0,
      cuba_weight: 0,
      total_cost: 0,
      cost_per_kg_raw: 0,
      cost_per_kg_yield: 0,
      cuba_cost: 0,
      portion_cost: 0, // NOVO: Campo para salvar no banco
      yield_percentage: 0,
      container_type: 'cuba',
      weight_field_name: 'Peso da Cuba',
      cost_field_name: 'Custo da Cuba',
      last_calculated: new Date().toISOString(),
      preparation_metrics: []
    };
  }
  
  /**
   * Determina o tipo de container baseado nas preparações
   */
  static getContainerType(preparations) {
    // Buscar por preparações com assembly ou portioning
    const assemblyPrep = preparations.find(prep => 
      prep.processes?.includes('assembly') || 
      prep.processes?.includes('portioning')
    );
    
    return assemblyPrep?.assembly_config?.container_type || 'cuba';
  }
  
  /**
   * Calcula o peso total apenas das etapas de Porcionamento/Montagem
   * Para ser usado como peso da porção/cuba
   */
  static calculatePortionWeight(preparations) {
    if (!preparations || !Array.isArray(preparations)) return 0;
    
    let portionWeight = 0;
    
    preparations.forEach(prep => {
      // Verificar se é etapa de finalização (porcionamento ou montagem pura)
      const isPortioningOnly = prep.processes?.includes('portioning') && 
        !prep.processes?.includes('defrosting') && 
        !prep.processes?.includes('cleaning') && 
        !prep.processes?.includes('cooking');
        
      const isAssemblyOnly = prep.processes?.includes('assembly') && 
        !prep.processes?.includes('defrosting') && 
        !prep.processes?.includes('cleaning') && 
        !prep.processes?.includes('cooking');
      
      if (isPortioningOnly || isAssemblyOnly) {
        // Somar ingredientes de finalização
        if (prep.ingredients && Array.isArray(prep.ingredients)) {
          prep.ingredients.forEach(ingredient => {
            const weight = this.getInitialWeight(ingredient);
            portionWeight += weight;
          });
        }
        
        // Somar sub-componentes
        if (prep.sub_components && Array.isArray(prep.sub_components)) {
          prep.sub_components.forEach(subComp => {
            const weight = parseNumber(subComp[WEIGHT_FIELDS.assembly]);
            portionWeight += weight;
          });
        }
      }
    });
    
    return portionWeight;
  }
  
  /**
   * Gera nome do campo de peso baseado no tipo de container
   */
  static getWeightFieldName(preparations) {
    const containerType = this.getContainerType(preparations);
    
    const fieldNames = {
      cuba: 'Peso da Cuba',
      descartavel: 'Peso da Embalagem',
      individual: 'Peso da Porção',
      kg: 'Peso por Kg',
      outros: 'Peso da Unidade'
    };
    
    return fieldNames[containerType] || 'Peso da Cuba';
  }
  
  /**
   * Gera nome do campo de custo baseado no tipo de container
   */
  static getCostFieldName(preparations) {
    const containerType = this.getContainerType(preparations);
    
    const fieldNames = {
      cuba: 'Custo da Cuba',
      descartavel: 'Custo da Embalagem',
      individual: 'Custo da Porção',
      kg: 'Custo por Kg',
      outros: 'Custo da Unidade'
    };
    
    return fieldNames[containerType] || 'Custo da Cuba';
  }
  
  // ========================================
  // VALIDAÇÕES E VERIFICAÇÕES
  // ========================================
  
  /**
   * Valida a estrutura de dados de uma receita
   */
  static validateRecipeData(preparations) {
    const errors = [];
    const warnings = [];
    
    if (!preparations || !Array.isArray(preparations)) {
      errors.push('Dados de preparações inválidos');
      return { isValid: false, errors, warnings };
    }
    
    preparations.forEach((prep, prepIndex) => {
      if (!prep.title) {
        warnings.push(`Preparação ${prepIndex + 1} sem título`);
      }
      
      if (prep.ingredients && Array.isArray(prep.ingredients)) {
        prep.ingredients.forEach((ing, ingIndex) => {
          if (!ing.name) {
            warnings.push(`Ingrediente ${ingIndex + 1} da preparação ${prepIndex + 1} sem nome`);
          }
          
          if (this.getInitialWeight(ing) === 0) {
            warnings.push(`Ingrediente "${ing.name}" sem peso inicial`);
          }
          
          if (this.getUnitPrice(ing) === 0) {
            warnings.push(`Ingrediente "${ing.name}" sem preço`);
          }
        });
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Gera relatório de debug da receita
   */
  static generateDebugReport(preparations, recipeData = {}) {
    const validation = this.validateRecipeData(preparations);
    const metrics = this.calculateRecipeMetrics(preparations, recipeData);
    
    return {
      timestamp: new Date().toISOString(),
      validation,
      metrics,
      rawData: {
        preparationsCount: preparations?.length || 0,
        totalIngredients: preparations?.reduce((total, prep) => 
          total + (prep.ingredients?.length || 0), 0) || 0,
        totalSubComponents: preparations?.reduce((total, prep) => 
          total + (prep.sub_components?.length || 0), 0) || 0
      }
    };
  }
}

// ========================================
// COMPATIBILIDADE E EXPORTS
// ========================================

// Manter compatibilidade com código existente
export const parseNumericValue = parseNumber;
export const calculateRecipeMetrics = (recipeData, preparations) => 
  RecipeCalculator.calculateRecipeMetrics(preparations, recipeData);

// Disponibilizar no window para debug (apenas em desenvolvimento)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.RecipeCalculator = RecipeCalculator;
  window.parseNumber = parseNumber;
  window.formatters = formatters;
  console.log('🧮 [DEV] RecipeCalculator disponível globalmente para debug');
}

export default RecipeCalculator;