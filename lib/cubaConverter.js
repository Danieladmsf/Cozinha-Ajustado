/**
 * Conversor Universal de Cubas
 * 
 * Sistema centralizado para conversão de unidades de cuba no sistema de consolidação.
 * Suporta conversões entre cuba-g, cuba-p, potes e cuba normal.
 * 
 * @author Sistema de Consolidação
 * @version 2.0
 */

import { parseQuantity } from '@/components/utils/orderUtils';

// ====================================================================
// CONSTANTES E CONFIGURAÇÕES
// ====================================================================

/**
 * Configurações de conversão
 */
const CONVERSION_CONFIG = {
  // Tolerância para comparação de números decimais
  TOLERANCE: 0.001,
  
  // Regras de conversão para cuba-g
  CUBA_G_RULES: {
    POTE_EXACT: 0.1,        // 0,1 cuba-g = 1 Pote
    MIN_HALF_CUBAP: 0.25,   // 0,25+ = ½ Cuba-p
    MIN_ONE_CUBAP: 0.50,    // 0,50+ = 1 Cuba-p  
    MIN_ONEHALF_CUBAP: 0.75 // 0,75+ = 1½ Cuba-p
  },
  
  // Valores válidos para conversão cuba → potes
  CUBA_TO_POTES: [0.1, 0.2, 0.3, 0.4]
};

/**
 * Tipos de conversão suportados
 */
const CONVERSION_TYPES = {
  CUBA_G: 'cuba-g',
  CUBA: 'cuba',
  UNID: 'unid.',
  KG: 'kg'
};

// ====================================================================
// UTILITÁRIOS INTERNOS
// ====================================================================

/**
 * Verifica se um número é aproximadamente igual a outro
 */
const isApproximatelyEqual = (a, b, tolerance = CONVERSION_CONFIG.TOLERANCE) => {
  return Math.abs(a - b) < tolerance;
};

/**
 * Formata número com vírgula decimal brasileira
 */
const formatBrazilianNumber = (num) => {
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(1).replace('.', ',');
};

// ====================================================================
// CONVERSORES ESPECÍFICOS
// ====================================================================

/**
 * Converte cuba-g para Cuba-g + Cuba-p ou Potes
 */
class CubaGConverter {
  static convert(quantity) {
    const numQuantity = parseQuantity(quantity);
    
    if (numQuantity === 0) {
      return this.createEmptyResult(numQuantity);
    }

    // Caso especial: 0,1 cuba-g → 1 Pote
    if (isApproximatelyEqual(numQuantity, CONVERSION_CONFIG.CUBA_G_RULES.POTE_EXACT)) {
      return this.createPoteResult(numQuantity);
    }

    // Conversão padrão para Cuba-g + Cuba-p
    return this.convertToSeGP(numQuantity);
  }

  static createEmptyResult(original) {
    return {
      original,
      type: 'empty',
      display: '',
      shouldHide: true
    };
  }

  static createPoteResult(original) {
    return {
      original,
      type: 'pote',
      display: '1 Pote',
      shouldHide: false
    };
  }

  static convertToSeGP(numQuantity) {
    const integerPart = Math.floor(numQuantity);
    const decimalPart = numQuantity - integerPart;
    
    const result = {
      original: numQuantity,
      type: 'cuba-gp',
      cubaG: integerPart,
      cubaP: 0,
      cubaPFraction: null,
      shouldHide: false
    };

    // Aplicar regras de conversão decimal
    const rules = CONVERSION_CONFIG.CUBA_G_RULES;
    
    if (decimalPart >= rules.MIN_ONEHALF_CUBAP) {
      result.cubaP = 1;
      result.cubaPFraction = 0.5;
    } else if (decimalPart >= rules.MIN_ONE_CUBAP) {
      result.cubaP = 1;
    } else if (decimalPart >= rules.MIN_HALF_CUBAP) {
      result.cubaPFraction = 0.5;
    }

    result.display = this.formatCubaGPDisplay(result);
    return result;
  }

  static formatCubaGPDisplay({ cubaG, cubaP, cubaPFraction }) {
    const parts = [];
    
    if (cubaG > 0) {
      parts.push(`${cubaG} Cuba-g`);
    }
    
    // Combinar cuba-p inteira + fração
    if (cubaP > 0 && cubaPFraction) {
      const total = cubaP + cubaPFraction;
      parts.push(total === 1.5 ? "1½ Cuba-p" : `${formatBrazilianNumber(total)} Cuba-p`);
    } else if (cubaP > 0) {
      parts.push(`${cubaP} Cuba-p`);
    } else if (cubaPFraction) {
      parts.push(cubaPFraction === 0.5 ? "½ Cuba-p" : `${formatBrazilianNumber(cubaPFraction)} Cuba-p`);
    }
    
    return parts.length > 0 ? parts.join(" + ") : "";
  }
}

/**
 * Converte cuba para Potes ou mantém formato original
 */
class CubaConverter {
  static convert(quantity) {
    const numQuantity = parseQuantity(quantity);
    
    // Tentar conversão para potes
    const potesResult = this.tryConvertToPotes(numQuantity);
    if (potesResult.shouldConvert) {
      return potesResult;
    }
    
    // Manter formato original
    return this.createOriginalFormat(numQuantity);
  }

  static tryConvertToPotes(numQuantity) {
    const validValue = CONVERSION_CONFIG.CUBA_TO_POTES.find(val => 
      isApproximatelyEqual(numQuantity, val)
    );
    
    if (validValue) {
      const potes = Math.round(numQuantity / 0.1);
      return {
        original: numQuantity,
        type: 'pote',
        display: `${potes} ${potes === 1 ? 'Pote' : 'Potes'}`,
        shouldConvert: true,
        shouldHide: false
      };
    }
    
    return { shouldConvert: false };
  }

  static createOriginalFormat(numQuantity) {
    const formatted = numQuantity % 1 === 0 
      ? String(numQuantity) 
      : numQuantity.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
    
    return {
      original: numQuantity,
      type: 'cuba-original',
      display: formatted,
      unitType: 'Cuba',
      shouldHide: false
    };
  }
}

// ====================================================================
// CONVERSOR PRINCIPAL
// ====================================================================

/**
 * Conversor Universal - Ponto de entrada único
 */
export class CubaUniversalConverter {
  /**
   * Converte quantidade baseada no tipo de unidade
   * @param {number|string} quantity - Quantidade a converter
   * @param {string} unitType - Tipo de unidade (cuba-g, cuba, etc.)
   * @returns {Object} Resultado da conversão
   */
  static convert(quantity, unitType) {
    const normalizedUnitType = this.normalizeUnitType(unitType);
    
    switch (normalizedUnitType) {
      case CONVERSION_TYPES.CUBA_G:
        return CubaGConverter.convert(quantity);
        
      case CONVERSION_TYPES.CUBA:
        return CubaConverter.convert(quantity);
        
      default:
        return this.createDefaultFormat(quantity, unitType);
    }
  }

  /**
   * Normaliza tipo de unidade removendo aspas e espaços
   */
  static normalizeUnitType(unitType) {
    if (!unitType) return '';
    return unitType.replace(/['"]/g, '').trim().toLowerCase();
  }

  /**
   * Formato padrão para unidades não especiais
   */
  static createDefaultFormat(quantity, unitType) {
    const numQuantity = parseQuantity(quantity);
    const formatted = Number.isInteger(numQuantity) 
      ? String(numQuantity)
      : formatBrazilianNumber(numQuantity);
    
    return {
      original: numQuantity,
      type: 'default',
      display: formatted,
      unitType: this.formatUnitTypeDisplay(unitType),
      shouldHide: false
    };
  }

  /**
   * Formata tipo de unidade para exibição
   */
  static formatUnitTypeDisplay(unitType) {
    if (!unitType) return '';
    const normalized = this.normalizeUnitType(unitType);
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  /**
   * Verifica se item deve ser ocultado
   */
  static shouldHideItem(conversionResult) {
    return conversionResult.shouldHide || 
           (conversionResult.display === '' && !conversionResult.unitType);
  }

  /**
   * Obtém texto final para exibição
   */
  static getDisplayText(conversionResult) {
    const { display, unitType } = conversionResult;
    
    // Se já tem formato completo (ex: "1 Pote", "½ Cuba-p"), usar direto
    if (display.includes('Pote') || display.includes('Cuba-')) {
      return display;
    }
    
    // Combinar quantidade + unidade
    return unitType ? `${display} ${unitType}` : display;
  }
}

// ====================================================================
// FUNÇÕES DE CONVENIÊNCIA (COMPATIBILIDADE)
// ====================================================================

/**
 * Função de conveniência para conversão cuba-g (compatibilidade)
 * @deprecated Use CubaUniversalConverter.convert() 
 */
export const convertCubaQuantity = (quantity) => {
  return CubaUniversalConverter.convert(quantity, 'cuba-g');
};

/**
 * Função de conveniência para conversão cuba→potes (compatibilidade)
 * @deprecated Use CubaUniversalConverter.convert()
 */
export const convertCubaToPotes = (quantity) => {
  const result = CubaUniversalConverter.convert(quantity, 'cuba');
  return {
    ...result,
    shouldConvert: result.type === 'pote'
  };
};

// ====================================================================
// EXPORTAÇÕES PRINCIPAIS
// ====================================================================

export default CubaUniversalConverter;
export { CONVERSION_CONFIG, CONVERSION_TYPES };