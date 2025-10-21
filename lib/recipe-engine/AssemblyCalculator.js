/**
 * ASSEMBLY CALCULATOR - CÁLCULOS DE MONTAGEM E SUB-COMPONENTES
 * 
 * Responsável por todos os cálculos relacionados a montagem, porcionamento
 * e sub-componentes das receitas. Resolve o problema dos custos proporcionais
 * que estavam zerados.
 * 
 * @version 3.0.0
 * @author Sistema Cozinha Afeto
 */

import { DataNormalizer } from './DataNormalizer.js';

// ========================================
// CLASSE ASSEMBLY CALCULATOR
// ========================================

export class AssemblyCalculator {
  
  // ========================================
  // CÁLCULOS DE SUB-COMPONENTES
  // ========================================
  
  /**
   * Calcula métricas de um sub-componente individual
   */
  static calculateSubComponent(subComponent, sourcePreparations = []) {
    if (!subComponent) return null;
    
    const normalizedSC = DataNormalizer.normalizeSubComponent(subComponent);
    if (!normalizedSC) return null;
    
    // Peso na montagem (sempre obrigatório)
    const assemblyWeight = normalizedSC.assembly_weight_kg;
    if (assemblyWeight <= 0) {
      return {
        ...normalizedSC,
        proportionalCost: 0,
        percentage: 0,
        isValid: false
      };
    }
    
    // Buscar dados de origem (preparação fonte ou receita externa)
    let sourceYieldWeight = 0;
    let sourceTotalCost = 0;
    
    if (normalizedSC.source_id && sourcePreparations.length > 0) {
      // Buscar preparação fonte
      const sourcePrep = sourcePreparations.find(prep => prep.id === normalizedSC.source_id);
      
      if (sourcePrep) {
        sourceYieldWeight = DataNormalizer.parseNumeric(sourcePrep.total_yield_weight_prep);
        sourceTotalCost = DataNormalizer.parseNumeric(sourcePrep.total_cost_prep);
      }
    }
    
    // Se não encontrou fonte, usar dados próprios do sub-componente
    if (sourceYieldWeight === 0) {
      sourceYieldWeight = normalizedSC.input_yield_weight;
    }
    if (sourceTotalCost === 0) {
      sourceTotalCost = normalizedSC.input_total_cost;
    }
    
    // Calcular custo proporcional
    let proportionalCost = 0;
    
    if (sourceYieldWeight > 0 && sourceTotalCost > 0) {
      // FÓRMULA CORRETA: (peso_montagem / peso_rendimento_fonte) × custo_total_fonte
      const scaleFactor = assemblyWeight / sourceYieldWeight;
      proportionalCost = scaleFactor * sourceTotalCost;
      
    }
    
    return {
      ...normalizedSC,
      proportionalCost,
      isValid: proportionalCost > 0
    };
  }
  
  /**
   * Calcula métricas de todos os sub-componentes
   */
  static calculateSubComponents(subComponents, preparation = null, sourcePreparations = []) {
    if (!subComponents || !Array.isArray(subComponents)) {
      return {
        components: [],
        totalWeight: 0,
        totalCost: 0,
        validComponents: 0
      };
    }
    
    let totalWeight = 0;
    let totalCost = 0;
    let validComponents = 0;
    
    const calculatedComponents = subComponents.map(sc => {
      const calculated = this.calculateSubComponent(sc, sourcePreparations);
      
      if (calculated && calculated.isValid) {
        totalWeight += calculated.assembly_weight_kg;
        totalCost += calculated.proportionalCost;
        validComponents++;
      }
      
      return calculated;
    }).filter(sc => sc !== null);
    
    return {
      components: calculatedComponents,
      totalWeight,
      totalCost,
      validComponents
    };
  }
  
  // ========================================
  // CÁLCULOS DE PESO DA PORÇÃO/CUBA
  // ========================================
  
  /**
   * Calcula peso total da porção/cuba baseado nas etapas de finalização
   */
  static calculatePortionWeight(preparations) {
    if (!preparations || !Array.isArray(preparations)) {
      return 0;
    }
    
    let portionWeight = 0;
    
    preparations.forEach(prep => {
      // Verificar se é etapa de finalização (porcionamento/montagem)
      const isFinalizationStage = this.isFinalizationStage(prep);
      
      if (isFinalizationStage) {
        // Somar peso dos ingredientes
        if (prep.ingredients && Array.isArray(prep.ingredients)) {
          prep.ingredients.forEach(ingredient => {
            // Para finalização, usar peso inicial (já processado nas etapas anteriores)
            const weight = this.getIngredientInitialWeight(ingredient);
            portionWeight += weight;
          });
        }
        
        // Somar peso dos sub-componentes
        if (prep.sub_components && Array.isArray(prep.sub_components)) {
          prep.sub_components.forEach(sc => {
            const weight = DataNormalizer.parseNumeric(sc.assembly_weight_kg);
            portionWeight += weight;
          });
        }
      }
    });
    
    return portionWeight;
  }
  
  /**
   * Verifica se uma preparação é etapa de finalização
   */
  static isFinalizationStage(preparation) {
    if (!preparation || !preparation.processes) return false;
    
    const processes = preparation.processes;
    
    // É finalização se tem portioning ou assembly
    const hasFinalization = processes.includes('portioning') || processes.includes('assembly');
    
    // E não tem processos de preparação (descongelamento, limpeza, cocção)
    const hasPreparation = processes.includes('defrosting') || 
                          processes.includes('cleaning') || 
                          processes.includes('cooking');
    
    return hasFinalization && !hasPreparation;
  }
  
  /**
   * Obtém peso inicial de um ingrediente (com fallbacks)
   */
  static getIngredientInitialWeight(ingredient) {
    const weightFields = [
      'weight_frozen',
      'weight_raw', 
      'weight_thawed',
      'weight_clean',
      'weight_cooked',
      'quantity'
    ];
    
    for (const field of weightFields) {
      const value = DataNormalizer.parseNumeric(ingredient[field]);
      if (value > 0) return value;
    }
    
    return 0;
  }
  
  // ========================================
  // CÁLCULOS DE ASSEMBLY CONFIG
  // ========================================
  
  /**
   * Calcula e valida configuração de assembly
   */
  static calculateAssemblyConfig(preparation, calculatedWeight) {
    if (!preparation?.assembly_config) {
      return {
        container_type: 'cuba',
        total_weight: calculatedWeight,
        units_quantity: 1,
        notes: ''
      };
    }
    
    const config = DataNormalizer.normalizeAssemblyConfig(preparation.assembly_config);
    
    // Se peso total não foi definido manualmente, usar o calculado
    if (config.total_weight === 0) {
      config.total_weight = calculatedWeight;
    }
    
    return config;
  }
  
  // ========================================
  // CÁLCULOS DE PERCENTUAIS
  // ========================================
  
  /**
   * Calcula percentual de cada sub-componente no total
   */
  static calculateComponentPercentages(components, totalWeight) {
    return components.map(component => ({
      ...component,
      percentage: totalWeight > 0 ? (component.assembly_weight_kg / totalWeight) * 100 : 0
    }));
  }
  
  // ========================================
  // VALIDAÇÕES
  // ========================================
  
  /**
   * Valida dados de montagem/assembly
   */
  static validateAssemblyData(preparation) {
    const errors = [];
    const warnings = [];
    
    if (!preparation) {
      errors.push('Preparação não fornecida');
      return { isValid: false, errors, warnings };
    }
    
    // Validar sub-componentes
    if (preparation.sub_components && preparation.sub_components.length > 0) {
      preparation.sub_components.forEach((sc, index) => {
        if (!sc.name) {
          errors.push(`Sub-componente ${index + 1} sem nome`);
        }
        
        if (!sc.assembly_weight_kg || DataNormalizer.parseNumeric(sc.assembly_weight_kg) <= 0) {
          errors.push(`Sub-componente "${sc.name}" sem peso de montagem válido`);
        }
        
        if (!sc.source_id && (!sc.input_yield_weight || !sc.input_total_cost)) {
          warnings.push(`Sub-componente "${sc.name}" sem dados de origem para cálculo de custo`);
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  // ========================================
  // MÉTODOS DE DEBUG
  // ========================================
  
  /**
   * Gera relatório detalhado de montagem para debug
   */
  static generateAssemblyDebugReport(preparation, sourcePreparations = []) {
    if (!preparation) return null;
    
    const validation = this.validateAssemblyData(preparation);
    const subComponentsResult = this.calculateSubComponents(
      preparation.sub_components, 
      preparation, 
      sourcePreparations
    );
    const portionWeight = this.calculatePortionWeight([preparation]);
    const assemblyConfig = this.calculateAssemblyConfig(preparation, portionWeight);
    
    return {
      timestamp: new Date().toISOString(),
      preparation: {
        id: preparation.id,
        title: preparation.title,
        processes: preparation.processes
      },
      validation,
      subComponents: {
        count: subComponentsResult.components.length,
        validCount: subComponentsResult.validComponents,
        totalWeight: subComponentsResult.totalWeight,
        totalCost: subComponentsResult.totalCost,
        details: subComponentsResult.components.map(sc => ({
          name: sc.name,
          weight: sc.assembly_weight_kg,
          cost: sc.proportionalCost,
          isValid: sc.isValid
        }))
      },
      portionWeight,
      assemblyConfig,
      sourcePreparationsUsed: sourcePreparations.length
    };
  }
}

export default AssemblyCalculator;