/**
 * Utilitários para gerenciamento de links de clientes
 * Funções puras sem dependência do React
 */

/**
 * Gera URL do portal do cliente
 * @param {string} customerId - ID do cliente
 * @param {string} baseUrl - URL base (opcional, usa window.location.origin se não fornecida)
 * @returns {string|null} URL do portal ou null se customerId inválido
 */
export function generateCustomerPortalLink(customerId, baseUrl = null) {
  if (!customerId) return null;
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/portal/${customerId}`;
}

/**
 * Copia texto para área de transferência com fallbacks
 * @param {string} text - Texto para copiar
 * @returns {Promise<boolean>} True se copiou com sucesso
 */
export async function copyToClipboard(text) {
  // Tentar primeiro a API moderna
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // Clipboard API bloqueada, usando fallback
  }

  // Fallback usando document.execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const result = document.execCommand('copy');
    textArea.remove();
    
    if (result) {
      return true;
    } else {
      throw new Error('document.execCommand failed');
    }
  } catch (fallbackError) {
    // Fallback clipboard também falhou
    return false;
  }
}

/**
 * Valida dados básicos do cliente
 * @param {object} customerData - Dados do cliente
 * @returns {object} { isValid: boolean, errors: string[] }
 */
export function validateCustomerData(customerData) {
  const errors = [];
  
  if (!customerData.name || !customerData.name.trim()) {
    errors.push('Nome é obrigatório');
  }
  
  if (customerData.email && !isValidEmail(customerData.email)) {
    errors.push('Email inválido');
  }
  
  if (customerData.phone && !isValidPhone(customerData.phone)) {
    errors.push('Telefone inválido');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valida formato de email
 * @param {string} email 
 * @returns {boolean}
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida formato de telefone brasileiro
 * @param {string} phone 
 * @returns {boolean}
 */
function isValidPhone(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
}

/**
 * Formata dados do cliente para criação
 * @param {object} formData - Dados do formulário
 * @returns {object} Dados formatados
 */
export function formatCustomerDataForCreation(formData) {
  const { 
    CUSTOMER_CATEGORIES, 
    BILLING_PERIODS, 
    CUSTOMER_STATUS, 
    REGISTRATION_STATUS 
  } = require('./customerConstants');
  
  return {
    name: formData.name?.trim(),
    company: formData.company?.trim() || null,
    address: formData.address?.trim() || null,
    cnpj: formData.cnpj?.trim() || null,
    phone: formData.phone?.trim() || null,
    email: formData.email?.trim() || null,
    category: formData.category || CUSTOMER_CATEGORIES.PESSOA_FISICA,
    billing_period: formData.billing_period || BILLING_PERIODS.MENSAL,
    payment_day: formData.payment_day || null,
    notes: formData.notes?.trim() || null,
    active: CUSTOMER_STATUS.ACTIVE,
    pending_registration: REGISTRATION_STATUS.PENDING
  };
}
