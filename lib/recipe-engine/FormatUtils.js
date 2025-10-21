/**
 * FORMAT UTILS - UTILITÁRIOS DE FORMATAÇÃO UNIFICADOS
 * 
 * ÚNICA fonte de verdade para toda formatação de valores no sistema.
 * Substitui todas as outras implementações espalhadas.
 * 
 * @version 3.0.0
 * @author Sistema Cozinha Afeto
 */

import { DataNormalizer } from './DataNormalizer.js';

// ========================================
// CONFIGURAÇÕES DE FORMATAÇÃO
// ========================================

export const FORMAT_CONFIG = {
  CURRENCY: {
    locale: 'pt-BR',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  },
  
  WEIGHT: {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
    unit: 'kg'
  },
  
  PERCENTAGE: {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    suffix: '%'
  },
  
  NUMBER: {
    locale: 'pt-BR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }
};

// ========================================
// CLASSE FORMAT UTILS
// ========================================

export class FormatUtils {
  
  // ========================================
  // FORMATAÇÃO DE MOEDA
  // ========================================
  
  /**
   * Formatar valor como moeda brasileira
   */
  static formatCurrency(value, options = {}) {
    const parsed = DataNormalizer.parseNumeric(value);
    
    const config = {
      ...FORMAT_CONFIG.CURRENCY,
      ...options
    };
    
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits: config.minimumFractionDigits,
      maximumFractionDigits: config.maximumFractionDigits
    }).format(parsed);
  }
  
  /**
   * Formatar valor como moeda sem símbolo
   */
  static formatCurrencyValue(value, options = {}) {
    const parsed = DataNormalizer.parseNumeric(value);
    
    const config = {
      ...FORMAT_CONFIG.CURRENCY,
      ...options
    };
    
    return parsed.toLocaleString('pt-BR', {
      minimumFractionDigits: config.minimumFractionDigits,
      maximumFractionDigits: config.maximumFractionDigits
    });
  }
  
  // ========================================
  // FORMATAÇÃO DE PESO
  // ========================================
  
  /**
   * Formatar peso em kg com precisão adequada
   */
  static formatWeight(value, options = {}) {
    const parsed = DataNormalizer.parseNumeric(value);
    
    const config = {
      ...FORMAT_CONFIG.WEIGHT,
      ...options
    };
    
    // Ajustar precisão baseado no valor
    let decimals = config.maximumFractionDigits;
    if (parsed >= 1) {
      decimals = Math.min(decimals, 3); // Até 3 casas para valores >= 1kg
    } else if (parsed >= 0.1) {
      decimals = 3; // 3 casas para valores entre 0.1 e 1kg
    } else {
      decimals = 4; // 4 casas para valores muito pequenos
    }
    
    const formatted = parsed.toFixed(decimals).replace('.', ',');
    
    // Remover zeros desnecessários à direita
    const cleaned = formatted.replace(/,?0+$/, '');
    
    return config.unit ? `${cleaned}${config.unit}` : cleaned;
  }
  
  /**
   * Formatar peso apenas com o valor numérico
   */
  static formatWeightValue(value, decimals = 3) {
    const parsed = DataNormalizer.parseNumeric(value);
    return parsed.toFixed(decimals).replace('.', ',');
  }
  
  /**
   * Formatar peso em gramas
   */
  static formatWeightInGrams(value) {
    const parsed = DataNormalizer.parseNumeric(value);
    const grams = parsed * 1000;
    
    if (grams >= 1000) {
      return this.formatWeight(parsed, { unit: 'kg' });
    }
    
    return `${Math.round(grams)}g`;
  }
  
  // ========================================
  // FORMATAÇÃO DE PERCENTUAL
  // ========================================
  
  /**
   * Formatar valor como percentual
   */
  static formatPercentage(value, options = {}) {
    const parsed = DataNormalizer.parseNumeric(value);
    
    const config = {
      ...FORMAT_CONFIG.PERCENTAGE,
      ...options
    };
    
    const formatted = parsed.toFixed(config.maximumFractionDigits).replace('.', ',');
    return `${formatted}${config.suffix}`;
  }
  
  /**
   * Formatar percentual apenas com o valor numérico
   */
  static formatPercentageValue(value, decimals = 1) {
    const parsed = DataNormalizer.parseNumeric(value);
    return parsed.toFixed(decimals).replace('.', ',');
  }
  
  // ========================================
  // FORMATAÇÃO DE NÚMEROS
  // ========================================
  
  /**
   * Formatar número com localização brasileira
   */
  static formatNumber(value, options = {}) {
    const parsed = DataNormalizer.parseNumeric(value);
    
    const config = {
      ...FORMAT_CONFIG.NUMBER,
      ...options
    };
    
    return parsed.toLocaleString(config.locale, {
      minimumFractionDigits: config.minimumFractionDigits,
      maximumFractionDigits: config.maximumFractionDigits
    });
  }
  
  /**
   * Formatar número inteiro
   */
  static formatInteger(value) {
    const parsed = Math.round(DataNormalizer.parseNumeric(value));
    return parsed.toLocaleString('pt-BR');
  }
  
  // ========================================
  // FORMATAÇÃO DE TEMPO
  // ========================================
  
  /**
   * Formatar tempo em minutos para exibição
   */
  static formatPrepTime(minutes) {
    const parsed = Math.round(DataNormalizer.parseNumeric(minutes));
    
    if (parsed === 0) return '0 min';
    if (parsed < 60) return `${parsed} min`;
    
    const hours = Math.floor(parsed / 60);
    const remainingMinutes = parsed % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}min`;
  }
  
  // ========================================
  // FORMATAÇÃO DE DATAS
  // ========================================
  
  /**
   * Formatar data para exibição brasileira
   */
  static formatDate(dateValue) {
    if (!dateValue) return 'N/A';
    
    let date;
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      // Firestore Timestamp
      date = dateValue.toDate();
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else {
      return 'Data inválida';
    }
    
    return date.toLocaleString('pt-BR');
  }
  
  /**
   * Formatar data apenas (sem hora)
   */
  static formatDateOnly(dateValue) {
    if (!dateValue) return 'N/A';
    
    let date;
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else {
      return 'Data inválida';
    }
    
    return date.toLocaleDateString('pt-BR');
  }
  
  // ========================================
  // FORMATAÇÃO PARA INPUTS
  // ========================================
  
  /**
   * Formatar valor numérico para input (com vírgula)
   */
  static formatForInput(value) {
    const parsed = DataNormalizer.parseNumeric(value);
    
    if (parsed === 0) return '';
    
    return parsed.toString().replace('.', ',');
  }
  
  /**
   * Parsing de valor de input (aceita vírgula)
   */
  static parseFromInput(value) {
    if (!value) return 0;
    return DataNormalizer.parseNumeric(value);
  }
  
  // ========================================
  // FORMATAÇÃO PARA TABELAS
  // ========================================
  
  /**
   * Formatadores específicos para exibição em tabelas
   */
  static getTableFormatters() {
    return {
      weight: (value) => this.formatWeightValue(value),
      currency: (value) => this.formatCurrencyValue(value),
      percentage: (value) => this.formatPercentageValue(value),
      integer: (value) => this.formatInteger(value),
      decimal: (value, decimals = 2) => this.formatNumber(value, { maximumFractionDigits: decimals })
    };
  }
  
  // ========================================
  // VALIDAÇÃO DE FORMATO
  // ========================================
  
  /**
   * Valida se string está em formato brasileiro válido
   */
  static validateBrazilianFormat(value, type = 'number') {
    if (!value || typeof value !== 'string') return false;
    
    const patterns = {
      number: /^-?\d{1,3}(?:\.\d{3})*(?:,\d+)?$/,
      currency: /^R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?$/,
      percentage: /^\d{1,3}(?:,\d+)?%$/
    };
    
    return patterns[type] ? patterns[type].test(value) : false;
  }
  
  // ========================================
  // MÉTODOS DE CONVENIÊNCIA
  // ========================================
  
  /**
   * Formatação inteligente baseada no valor
   */
  static smartFormat(value, type = 'auto') {
    const parsed = DataNormalizer.parseNumeric(value);
    
    if (type === 'auto') {
      // Detectar tipo automaticamente baseado no contexto
      if (parsed >= 1000000) return this.formatCurrency(parsed);
      if (parsed <= 0.001) return this.formatWeightInGrams(parsed);
      if (parsed <= 100 && parsed >= 0) return this.formatPercentage(parsed);
      return this.formatWeight(parsed);
    }
    
    const formatters = {
      currency: () => this.formatCurrency(parsed),
      weight: () => this.formatWeight(parsed),
      percentage: () => this.formatPercentage(parsed),
      number: () => this.formatNumber(parsed),
      integer: () => this.formatInteger(parsed)
    };
    
    return formatters[type] ? formatters[type]() : this.formatNumber(parsed);
  }
}

// ========================================
// EXPORTS PARA COMPATIBILIDADE
// ========================================

export const formatCurrency = FormatUtils.formatCurrency;
export const formatWeight = FormatUtils.formatWeight;
export const formatPercentage = FormatUtils.formatPercentage;
export const formatNumber = FormatUtils.formatNumber;
export const formatDate = FormatUtils.formatDate;
export const formatPrepTime = FormatUtils.formatPrepTime;
export const parseFromInput = FormatUtils.parseFromInput;
export const formatForInput = FormatUtils.formatForInput;

export default FormatUtils;