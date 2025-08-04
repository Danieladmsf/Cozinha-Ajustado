import { FORMAT_CONFIG } from './constants';

/**
 * Utilitários específicos para o módulo de Sobras
 */

// Função para validar e normalizar números de input
export const normalizeNumericInputString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[^0-9,]/g, ''); // Permite apenas números e vírgula
};

// Validação numérica para commit de valores
export const validateNumericOnCommit = (value, defaultValue = 0) => {
  const num = parseFloat(String(value).replace(',', '.'));
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
};

// Formatação de quantidade para exibição
export const formatQuantityForDisplay = (value) => {
  const num = validateNumericOnCommit(value);
  if (num === 0) return '0';
  // Retorna com uma casa decimal se não for inteiro
  return Number.isInteger(num) ? String(num) : num.toFixed(1).replace('.', ',');
};

// Formatação de moeda para sobras
export const formatCurrency = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value) || 0;
  return new Intl.NumberFormat(FORMAT_CONFIG.CURRENCY.LOCALE, {
    style: 'currency',
    currency: FORMAT_CONFIG.CURRENCY.CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

// Formatação de peso
export const formatWeight = (weightKg, unit = 'kg') => {
  const weight = validateNumericOnCommit(weightKg);
  if (weight === 0) return '0 kg';
  
  if (unit === 'cuba') {
    return weight === 1 ? '1 cuba' : `${formatQuantityForDisplay(weight)} cubas`;
  }
  
  return `${formatQuantityForDisplay(weight)} kg`;
};

// Parseamento de quantidade (compatível com orderUtils)
export const parseQuantity = (value, defaultValue = 0) => {
  return validateNumericOnCommit(value, defaultValue);
};

// Formatação de quantidade (compatível com orderUtils)
export const formattedQuantity = (value) => {
  return formatQuantityForDisplay(value);
};

// Cálculo de peso total de item baseado na unidade
export const calculateItemTotalWeight = (item, recipe) => {
  if (!item || !recipe) return 0;
  
  const quantity = parseQuantity(item.quantity || item.internal_waste_quantity || item.client_returned_quantity);
  const unitType = item.unit_type || item.internal_waste_unit_type || item.client_returned_unit_type;
  
  if (unitType === 'cuba') {
    const cubaWeight = parseQuantity(recipe.cuba_weight);
    return quantity * cubaWeight;
  }
  
  return quantity; // Já está em kg
};

// Validação de percentual de pagamento
export const validatePaymentPercentage = (value) => {
  const num = validateNumericOnCommit(value, 100);
  return Math.max(0, Math.min(100, num));
};

// Cálculo de valor final baseado no percentual de pagamento
export const calculateFinalValue = (originalValue, paymentPercentage) => {
  const value = parseQuantity(originalValue);
  const percentage = validatePaymentPercentage(paymentPercentage);
  return value * (percentage / 100);
};

// Suporte para sanitização de input de percentual
export const sanitizePercentageInput = (inputValue) => {
  return inputValue.replace(/[^0-9]/g, '').substring(0, 3); // Apenas números, max 3 chars
};

// Suporte para sanitização de input de quantidade
export const sanitizeQuantityInput = (inputValue) => {
  let sanitized = normalizeNumericInputString(inputValue);
  if (sanitized.includes(',')) {
    const parts = sanitized.split(',');
    const decimalPart = parts[1] ? parts[1].substring(0, 1) : '';
    sanitized = `${parts[0]},${decimalPart}`;
  }
  return sanitized;
};

// Constantes específicas para sobras
export const WASTE_CONSTANTS = {
  DEFAULT_PAYMENT_PERCENTAGE: 100,
  MIN_PAYMENT_PERCENTAGE: 0,
  MAX_PAYMENT_PERCENTAGE: 100,
  AVAILABLE_UNITS: ['cuba', 'kg'],
  UNIT_LABELS: {
    cuba: 'Cuba',
    kg: 'Kg'
  }
};

// Tipos de sobra
export const WASTE_TYPES = {
  INTERNAL: 'internal_waste',
  CLIENT_RETURNED: 'client_returned'
};

// Status de processamento de sobras
export const WASTE_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  CANCELLED: 'cancelled'
};