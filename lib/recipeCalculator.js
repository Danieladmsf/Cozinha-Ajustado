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
  static calculatePreparationMetrics(preparation, allPreparations = []) {
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

    if (preparation.ingredients && Array.isArray(preparation.ingredients)) {
      preparation.ingredients.forEach(ingredient => {
        const initialWeight = this.getInitialWeight(ingredient);
        const finalWeight = this.getFinalWeight(ingredient);
        const cost = this.calculateIngredientCost(ingredient);
        totalRawWeight += initialWeight;
        totalYieldWeight += finalWeight;
        totalCost += cost;
      });
    }

    // Calcular receitas adicionadas (sub-receitas)
    if (preparation.recipes && Array.isArray(preparation.recipes)) {
      preparation.recipes.forEach(recipe => {
        // Apenas usar o peso que o usuário especificou (used_weight)
        // Se estiver vazio, não adicionar nada aos totais
        const usedWeight = parseNumber(recipe.used_weight);

        // Só processar se houver um peso usado válido
        if (usedWeight > 0) {
          const costPerKg = parseNumber(recipe.cost_per_kg_yield);

          // Custo = peso usado × custo por kg líquido da receita
          const recipeCost = usedWeight * costPerKg;

          // Para receitas, o peso bruto e líquido são iguais (receita já foi processada)
          // Rendimento da receita é sempre 100%
          totalRawWeight += usedWeight;
          totalYieldWeight += usedWeight;
          totalCost += recipeCost;
        }
      });
    }

    if (preparation.sub_components && Array.isArray(preparation.sub_components)) {
        preparation.sub_components.forEach(subComp => {
            const weight = parseNumber(subComp.weight_portioned || subComp.assembly_weight_kg); // This is the yield weight being used
            let cost = 0;
            let rawWeightContribution = weight; // Default for raw ingredients added directly to assembly

            const sourcePrep = allPreparations.find(p => p.id === subComp.source_id);

            if (sourcePrep && sourcePrep.id !== preparation.id) {
                const sourceMetrics = this.calculatePreparationMetrics(sourcePrep, allPreparations);

                if (sourceMetrics.totalYieldWeight > 0) {
                    const scaleFactor = weight / sourceMetrics.totalYieldWeight;
                    cost = scaleFactor * sourceMetrics.totalCost;
                    rawWeightContribution = scaleFactor * sourceMetrics.totalRawWeight;
                } else {
                    cost = 0;
                    rawWeightContribution = 0;
                }
            } else if (subComp.type === 'ingredient') {
                const unitPrice = this.getUnitPrice(subComp);
                cost = weight * unitPrice;
                rawWeightContribution = weight;
            } else {
                cost = parseNumber(subComp.total_cost);
                rawWeightContribution = weight;
            }

            totalRawWeight += rawWeightContribution;
            totalYieldWeight += weight;
            totalCost += cost;
        });
    }

    const yieldPercentage = totalRawWeight > 0 ? (totalYieldWeight / totalRawWeight) * 100 : 0;

    return {
      totalRawWeight,
      totalYieldWeight,
      totalCost,
      yieldPercentage,
      averageYield: 0
    };
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

    // Encontrar a última etapa que seja montagem ou porcionamento
    const finalAssemblyStepIndex = preparations.map(p => p.processes?.some(pr => ['assembly', 'portioning'].includes(pr))).lastIndexOf(true);
    const finalAssemblyStep = finalAssemblyStepIndex !== -1 ? preparations[finalAssemblyStepIndex] : null;

    let finalYieldWeight = 0;
    let finalCost = 0;
    let totalRawWeight = 0;
    let unitsQuantity = 1; // Default to 1

    if (finalAssemblyStep) {
      // Se uma etapa de montagem final existe, suas métricas definem os totais da receita.
      const finalStepMetrics = this.calculatePreparationMetrics(finalAssemblyStep, preparations);
      finalYieldWeight = finalStepMetrics.totalYieldWeight;
      finalCost = finalStepMetrics.totalCost;
      totalRawWeight = finalStepMetrics.totalRawWeight;
      
      // Obter units_quantity da finalAssemblyStep
      const assemblyConfig = finalAssemblyStep.assembly_config;
      if (assemblyConfig && assemblyConfig.units_quantity) {
        const parsedUnits = parseNumber(assemblyConfig.units_quantity);
        if (parsedUnits > 0) {
          unitsQuantity = parsedUnits;
        }
      }
    } else {
      // Fallback: Se não há etapa de montagem, somar tudo.
      preparations.forEach(prep => {
        const prepMetrics = this.calculatePreparationMetrics(prep, preparations);
        totalRawWeight += prepMetrics.totalRawWeight;
        finalYieldWeight += prepMetrics.totalYieldWeight;
        finalCost += prepMetrics.totalCost;
      });
    }

    // CORREÇÃO: Multiplicar por unitsQuantity ao invés de dividir
    // Quando há múltiplas unidades (ex: 3 porções), o peso/custo nos sub_components
    // representa uma ÚNICA unidade (23g, R$0,20)
    // O total da receita deve ser: peso_unitário × quantidade_unidades
    // Ex: 3 porções × 23g = 69g total
    if (unitsQuantity > 1) {
      finalYieldWeight = finalYieldWeight * unitsQuantity;
      finalCost = finalCost * unitsQuantity;
      totalRawWeight = totalRawWeight * unitsQuantity;
    }

    const costPerKgRaw = totalRawWeight > 0 ? finalCost / totalRawWeight : 0;
    const costPerKgYield = finalYieldWeight > 0 ? finalCost / finalYieldWeight : 0;
    const overallYieldPercentage = totalRawWeight > 0 ? (finalYieldWeight / totalRawWeight) * 100 : 0;

    const result = {
      total_weight: totalRawWeight,
      yield_weight: finalYieldWeight,
      cuba_weight: finalYieldWeight,
      portion_weight_calculated: finalYieldWeight,
      total_cost: finalCost, // Usar finalCost para tudo
      cost_per_kg_raw: costPerKgRaw,
      cost_per_kg_yield: costPerKgYield,
      cuba_cost: finalCost, // Usar finalCost para tudo
      portion_cost: finalCost, // Usar finalCost para tudo
      yield_percentage: overallYieldPercentage,
      container_type: this.getContainerType(preparations),
      weight_field_name: this.getWeightFieldName(preparations),
      cost_field_name: this.getCostFieldName(preparations),
      last_calculated: new Date().toISOString(),
      preparation_metrics: preparations.map((prep, index) => ({
        ...this.calculatePreparationMetrics(prep, preparations),
        preparationIndex: index,
        preparationTitle: prep.title,
      }))
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
   * Calcula o peso da cuba/porção
   * LÓGICA SIMPLES: usa o peso de rendimento total da receita
   */
  static calculatePortionWeight(preparations, totalYieldWeight = 0) {
    // LÓGICA SIMPLIFICADA: cuba weight = yield weight
    // Isso garante consistência e elimina bugs de detecção de processos
    return totalYieldWeight;
  }
  
  /**
   * Gera nome do campo de peso baseado no tipo de container
   */
  static getWeightFieldName(preparations) {
    const containerType = this.getContainerType(preparations);

    const fieldNames = {
      cuba: 'Peso da Cuba',
      'cuba-p': 'Peso da Cuba P',
      'cuba-g': 'Peso da Cuba G',
      descartavel: 'Peso da Embalagem',
      individual: 'Peso da Porção',
      'Porção': 'Peso da Porção',
      'Unid.': 'Peso da Unidade',
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
      'cuba-p': 'Custo da Cuba P',
      'cuba-g': 'Custo da Cuba G',
      descartavel: 'Custo da Embalagem',
      individual: 'Custo da Porção',
      'Porção': 'Custo da Porção',
      'Unid.': 'Custo da Unidade',
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


export default RecipeCalculator;