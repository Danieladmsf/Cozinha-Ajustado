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
 * Configurações de conversão (SEM POTES)
 */
const CONVERSION_CONFIG = {
  // Tolerância para comparação de números decimais
  TOLERANCE: 0.15, // Aumentado para arredondamento mais agressivo

  // Valores padrão de cuba-p para arredondamento
  CUBAP_STANDARDS: [0.25, 0.5, 0.75, 1.0]
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
 * Arredonda valor para o padrão de cuba-p mais próximo
 */
const roundToNearestCubaP = (decimal) => {
  if (decimal === 0) return 0;

  // Encontrar o valor padrão mais próximo
  const standards = CONVERSION_CONFIG.CUBAP_STANDARDS;
  let nearest = standards[0];
  let minDiff = Math.abs(decimal - nearest);

  for (const standard of standards) {
    const diff = Math.abs(decimal - standard);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = standard;
    }
  }

  // Só arredondar se estiver dentro da tolerância
  if (minDiff < CONVERSION_CONFIG.TOLERANCE) {
    return nearest;
  }

  return decimal;
};

/**
 * Converte cuba-g para Cuba-g + Cuba-p (SEM POTES)
 */
class CubaGConverter {
  static convert(quantity) {
    const numQuantity = parseQuantity(quantity);

    if (numQuantity === 0) {
      return this.createEmptyResult(numQuantity);
    }

    // Conversão para Cuba-g + Cuba-p com arredondamento inteligente
    return this.convertToCubaGP(numQuantity);
  }

  static createEmptyResult(original) {
    return {
      original,
      type: 'empty',
      display: '',
      shouldHide: true
    };
  }

  static convertToCubaGP(numQuantity) {
    const integerPart = Math.floor(numQuantity);
    let decimalPart = numQuantity - integerPart;

    // Arredondamento inteligente da parte decimal
    decimalPart = roundToNearestCubaP(decimalPart);

    const result = {
      original: numQuantity,
      type: 'cuba-gp',
      cubaG: integerPart,
      cubaPValue: decimalPart, // Valor decimal em cubas-p
      shouldHide: false
    };

    result.display = this.formatCubaGPDisplay(result);
    return result;
  }

  static formatCubaGPDisplay({ cubaG, cubaPValue }) {
    const parts = [];

    // Parte inteira (cubas-g)
    if (cubaG > 0) {
      parts.push(`${cubaG} Cuba-g`);
    }

    // Parte decimal (em cuba-p)
    if (cubaPValue > 0) {
      // Converter decimal para cubas-p (1 cuba-g = 2 cubas-p)
      const cubasPValue = cubaPValue * 2;

      if (cubasPValue === 0.5) {
        parts.push("½ Cuba-p");
      } else if (cubasPValue === 1) {
        parts.push("1 Cuba-p");
      } else if (cubasPValue === 1.5) {
        parts.push("1½ Cuba-p");
      } else if (cubasPValue === 2) {
        parts.push("2 Cuba-p");
      } else {
        // Valor não padrão - mostrar com vírgula
        parts.push(`${formatBrazilianNumber(cubasPValue)} Cuba-p`);
      }
    }

    return parts.length > 0 ? parts.join(" + ") : "0";
  }
}

/**
 * Formatador para "cuba" (sem conversão para potes)
 */
class CubaConverter {
  static convert(quantity) {
    const numQuantity = parseQuantity(quantity);
    return this.createFormat(numQuantity);
  }

  static createFormat(numQuantity) {
    const formatted = numQuantity % 1 === 0
      ? String(numQuantity)
      : numQuantity.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');

    return {
      original: numQuantity,
      type: 'cuba',
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
 * Função de compatibilidade (sem conversão para potes)
 * @deprecated Use CubaUniversalConverter.convert()
 */
export const convertCubaToPotes = (quantity) => {
  return CubaUniversalConverter.convert(quantity, 'cuba');
};

// ====================================================================
// EXPORTAÇÕES PRINCIPAIS
// ====================================================================

export default CubaUniversalConverter;
export { CONVERSION_CONFIG, CONVERSION_TYPES };