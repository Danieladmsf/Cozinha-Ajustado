/**
 * PROCESS CALCULATOR - CÁLCULOS POR PROCESSO
 * 
 * Responsável por cálculos específicos de cada processo de preparação
 * (descongelamento, limpeza, cocção, porcionamento).
 * 
 * @version 3.0.0
 * @author Sistema Cozinha Afeto
 */

import { DataNormalizer } from './DataNormalizer.js';
import { WEIGHT_FIELDS } from './RecipeEngine.js';

// ========================================
// DEFINIÇÕES DE PROCESSOS
// ========================================

export const PROCESS_DEFINITIONS = {
  defrosting: {
    name: 'Descongelamento',
    fromField: 'weight_frozen',
    toField: 'weight_thawed',
    expectedLoss: { min: 0, max: 15 } // 0-15% de perda esperada
  },
  
  cleaning: {
    name: 'Limpeza',
    fromFields: ['weight_thawed', 'weight_raw'],
    toField: 'weight_clean',
    expectedLoss: { min: 5, max: 40 } // 5-40% de perda esperada
  },
  
  cooking: {
    name: 'Cocção',
    fromFields: ['weight_pre_cooking', 'weight_clean', 'weight_thawed', 'weight_raw'],
    toField: 'weight_cooked',
    expectedLoss: { min: 0, max: 50 }, // 0-50% (pode ganhar peso com água)
    canGainWeight: true // Pode ganhar peso (ex: arroz, feijão)
  },
  
  portioning: {
    name: 'Porcionamento',
    fromFields: ['weight_cooked', 'weight_clean', 'weight_thawed', 'weight_raw'],
    toField: 'weight_portioned',
    expectedLoss: { min: 0, max: 10 } // 0-10% de perda esperada
  }
};

// ========================================
// CLASSE PROCESS CALCULATOR
// ========================================

export class ProcessCalculator {
  
  // ========================================
  // MÉTODOS DE PESO POR PROCESSO
  // ========================================
  
  /**
   * Obtém peso inicial baseado nos processos ativos
   */
  static getInitialWeightByProcess(ingredient, processes = []) {
    if (!ingredient || !processes.length) {
      return this.getDefaultInitialWeight(ingredient);
    }
    
    // Determinar o primeiro processo na sequência lógica
    const processSequence = ['defrosting', 'cleaning', 'cooking', 'portioning'];
    const firstProcess = processSequence.find(proc => processes.includes(proc));
    
    if (!firstProcess) {
      return this.getDefaultInitialWeight(ingredient);
    }
    
    // Obter peso inicial baseado no primeiro processo
    const processInfo = PROCESS_DEFINITIONS[firstProcess];
    
    if (processInfo.fromField) {
      // Processo com campo único de origem
      const weight = DataNormalizer.parseNumeric(ingredient[processInfo.fromField]);
      if (weight > 0) return weight;
    } else if (processInfo.fromFields) {
      // Processo com múltiplos campos possíveis de origem
      for (const field of processInfo.fromFields) {
        const weight = DataNormalizer.parseNumeric(ingredient[field]);
        if (weight > 0) return weight;
      }
    }
    
    // Fallback para peso padrão
    return this.getDefaultInitialWeight(ingredient);
  }
  
  /**
   * Obtém peso inicial padrão (sem considerar processos)
   */
  static getDefaultInitialWeight(ingredient) {
    if (!ingredient) return 0;
    
    for (const field of WEIGHT_FIELDS.INITIAL_PRIORITY) {
      const weight = DataNormalizer.parseNumeric(ingredient[field]);
      if (weight > 0) return weight;
    }
    
    return 0;
  }
  
  /**
   * Obtém peso de saída de um processo específico
   */
  static getProcessOutputWeight(ingredient, processName) {
    if (!ingredient || !processName) return 0;
    
    const processInfo = PROCESS_DEFINITIONS[processName];
    if (!processInfo) return 0;
    
    return DataNormalizer.parseNumeric(ingredient[processInfo.toField]);
  }
  
  // ========================================
  // CÁLCULOS DE PERDA POR PROCESSO
  // ========================================
  
  /**
   * Calcula perda de um processo específico
   */
  static calculateProcessLoss(ingredient, processName) {
    const processInfo = PROCESS_DEFINITIONS[processName];
    if (!processInfo) return 0;
    
    // Obter peso inicial
    let initialWeight = 0;
    if (processInfo.fromField) {
      initialWeight = DataNormalizer.parseNumeric(ingredient[processInfo.fromField]);
    } else if (processInfo.fromFields) {
      for (const field of processInfo.fromFields) {
        initialWeight = DataNormalizer.parseNumeric(ingredient[field]);
        if (initialWeight > 0) break;
      }
    }
    
    // Obter peso final
    const finalWeight = DataNormalizer.parseNumeric(ingredient[processInfo.toField]);
    
    // Calcular perda
    if (initialWeight === 0) return 0;
    
    const lossPercent = ((initialWeight - finalWeight) / initialWeight) * 100;
    
    // Para processos que podem ganhar peso, permitir valores negativos
    return processInfo.canGainWeight ? lossPercent : Math.max(0, lossPercent);
  }
  
  /**
   * Calcula perda no descongelamento
   */
  static calculateThawingLoss(ingredient) {
    return this.calculateProcessLoss(ingredient, 'defrosting');
  }
  
  /**
   * Calcula perda na limpeza
   */
  static calculateCleaningLoss(ingredient) {
    return this.calculateProcessLoss(ingredient, 'cleaning');
  }
  
  /**
   * Calcula perda na cocção
   */
  static calculateCookingLoss(ingredient) {
    return this.calculateProcessLoss(ingredient, 'cooking');
  }
  
  /**
   * Calcula perda no porcionamento
   */
  static calculatePortioningLoss(ingredient) {
    return this.calculateProcessLoss(ingredient, 'portioning');
  }
  
  // ========================================
  // VALIDAÇÕES DE PROCESSO
  // ========================================
  
  /**
   * Valida perdas de um ingrediente por processo
   */
  static validateProcessLosses(ingredient, processes = []) {
    const errors = [];
    const warnings = [];
    
    if (!ingredient) {
      errors.push('Ingrediente não fornecido para validação');
      return { isValid: false, errors, warnings };
    }
    
    processes.forEach(processName => {
      const processInfo = PROCESS_DEFINITIONS[processName];
      if (!processInfo) {
        warnings.push(`Processo "${processName}" não reconhecido`);
        return;
      }
      
      const loss = this.calculateProcessLoss(ingredient, processName);
      const expectedLoss = processInfo.expectedLoss;
      
      // Validar se a perda está dentro do esperado
      if (loss < expectedLoss.min) {
        if (!processInfo.canGainWeight) {
          warnings.push(`${processInfo.name} do ingrediente "${ingredient.name}": perda muito baixa (${loss.toFixed(1)}%, esperado: ${expectedLoss.min}-${expectedLoss.max}%)`);
        }
      }
      
      if (loss > expectedLoss.max) {
        warnings.push(`${processInfo.name} do ingrediente "${ingredient.name}": perda muito alta (${loss.toFixed(1)}%, esperado: ${expectedLoss.min}-${expectedLoss.max}%)`);
      }
      
      // Verificar se tem os pesos necessários
      let hasInitialWeight = false;
      if (processInfo.fromField) {
        hasInitialWeight = DataNormalizer.parseNumeric(ingredient[processInfo.fromField]) > 0;
      } else if (processInfo.fromFields) {
        hasInitialWeight = processInfo.fromFields.some(field => 
          DataNormalizer.parseNumeric(ingredient[field]) > 0
        );
      }
      
      const hasFinalWeight = DataNormalizer.parseNumeric(ingredient[processInfo.toField]) > 0;
      
      if (!hasInitialWeight) {
        errors.push(`${processInfo.name} do ingrediente "${ingredient.name}": peso inicial não encontrado`);
      }
      
      if (!hasFinalWeight) {
        errors.push(`${processInfo.name} do ingrediente "${ingredient.name}": peso final não encontrado`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  // ========================================
  // ANÁLISE DE SEQUÊNCIA DE PROCESSOS
  // ========================================
  
  /**
   * Analisa sequência de processos de um ingrediente
   */
  static analyzeProcessSequence(ingredient, processes = []) {
    if (!ingredient || !processes.length) {
      return {
        isValid: false,
        sequence: [],
        totalLoss: 0,
        errors: ['Ingrediente ou processos não fornecidos']
      };
    }
    
    const sequence = [];
    const errors = [];
    let totalLoss = 0;
    
    // Ordenar processos na sequência lógica
    const processOrder = ['defrosting', 'cleaning', 'cooking', 'portioning'];
    const orderedProcesses = processes.sort((a, b) => {
      return processOrder.indexOf(a) - processOrder.indexOf(b);
    });
    
    let currentWeight = this.getInitialWeightByProcess(ingredient, processes);
    
    orderedProcesses.forEach(processName => {
      const processInfo = PROCESS_DEFINITIONS[processName];
      if (!processInfo) return;
      
      const outputWeight = this.getProcessOutputWeight(ingredient, processName);
      const loss = this.calculateProcessLoss(ingredient, processName);
      
      sequence.push({
        process: processName,
        name: processInfo.name,
        inputWeight: currentWeight,
        outputWeight,
        loss: loss,
        lossPercent: loss
      });
      
      // Acumular perda total (considerando que são processos sequenciais)
      if (loss > 0) {
        totalLoss = ((100 - totalLoss) * loss / 100) + totalLoss;
      }
      
      currentWeight = outputWeight;
    });
    
    return {
      isValid: errors.length === 0,
      sequence,
      totalLoss,
      initialWeight: this.getInitialWeightByProcess(ingredient, processes),
      finalWeight: currentWeight,
      overallYield: currentWeight > 0 ? (currentWeight / this.getInitialWeightByProcess(ingredient, processes)) * 100 : 0,
      errors
    };
  }
  
  // ========================================
  // MÉTODOS DE CONVENIÊNCIA
  // ========================================
  
  /**
   * Obtém informações de um processo
   */
  static getProcessInfo(processName) {
    return PROCESS_DEFINITIONS[processName] || null;
  }
  
  /**
   * Lista todos os processos disponíveis
   */
  static getAvailableProcesses() {
    return Object.keys(PROCESS_DEFINITIONS).map(key => ({
      key,
      ...PROCESS_DEFINITIONS[key]
    }));
  }
  
  /**
   * Verifica se um processo pode ganhar peso
   */
  static canProcessGainWeight(processName) {
    const processInfo = PROCESS_DEFINITIONS[processName];
    return processInfo ? Boolean(processInfo.canGainWeight) : false;
  }
}

export default ProcessCalculator;