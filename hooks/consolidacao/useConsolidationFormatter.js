/**
 * Hook para formatação de consolidação de pedidos
 * 
 * Versão refatorada usando o CubaUniversalConverter
 * Responsável pela formatação e exibição de quantidades e unidades
 * 
 * @version 2.0 - Refatorado e consolidado
 */

import CubaUniversalConverter from "@/lib/cubaConverter";

/**
 * Hook principal para formatação da consolidação
 * @returns {Object} Funções de formatação
 */
export const useConsolidationFormatter = () => {
  
  /**
   * Formata quantidade para consolidação usando conversor universal
   * @param {string|number} quantity - Quantidade a ser formatada
   * @param {string} unitType - Tipo de unidade
   * @returns {string} Quantidade formatada para exibição
   */
  const formatConsolidationQuantity = (quantity, unitType) => {
    // Validação de entrada
    if (quantity === null || quantity === undefined || quantity === "") {
      return "";
    }

    // Converter usando sistema universal
    const conversionResult = CubaUniversalConverter.convert(quantity, unitType);
    
    // Debug logging removed for production

    // Retornar display formatado
    return conversionResult.display || "";
  };

  /**
   * Determina o tipo de unidade para exibição
   * @param {string} unitType - Tipo original da unidade
   * @param {string} formattedQuantity - Quantidade já formatada
   * @returns {string} Tipo de unidade para exibir (ou vazio se já incluído)
   */
  const getDisplayUnitType = (unitType, formattedQuantity) => {
    // Se quantidade já inclui unidade (Pote, Cuba-g, Cuba-p), não mostrar extra
    if (formattedQuantity.includes('Pote') || 
        formattedQuantity.includes('Cuba-g') || 
        formattedQuantity.includes('Cuba-p')) {
      return '';
    }

    // Se quantidade está vazia, não mostrar unidade
    if (!formattedQuantity) {
      return '';
    }

    // Formatar unidade para exibição
    return CubaUniversalConverter.formatUnitTypeDisplay(unitType);
  };

  /**
   * Verifica se um item deve ser ocultado na renderização
   * @param {string|number} quantity - Quantidade do item
   * @param {string} unitType - Tipo de unidade
   * @returns {boolean} True se deve ocultar
   */
  const shouldHideItem = (quantity, unitType) => {
    const conversionResult = CubaUniversalConverter.convert(quantity, unitType);
    return CubaUniversalConverter.shouldHideItem(conversionResult);
  };

  /**
   * Obtém texto completo para exibição (quantidade + unidade)
   * @param {string|number} quantity - Quantidade do item
   * @param {string} unitType - Tipo de unidade
   * @returns {string} Texto completo para exibição
   */
  const getFullDisplayText = (quantity, unitType) => {
    const conversionResult = CubaUniversalConverter.convert(quantity, unitType);
    return CubaUniversalConverter.getDisplayText(conversionResult);
  };

  // Retornar API do hook
  return {
    formatConsolidationQuantity,
    getDisplayUnitType,
    shouldHideItem,
    getFullDisplayText
  };
};

/**
 * Hook simplificado apenas para formatação de quantidade
 * Útil quando só precisa da quantidade formatada
 * @param {string|number} quantity - Quantidade
 * @param {string} unitType - Tipo de unidade
 * @returns {string} Quantidade formatada
 */
export const useSimpleQuantityFormatter = (quantity, unitType) => {
  const conversionResult = CubaUniversalConverter.convert(quantity, unitType);
  return conversionResult.display || "";
};

/**
 * Hook para verificação rápida de ocultação
 * @param {string|number} quantity - Quantidade
 * @param {string} unitType - Tipo de unidade  
 * @returns {boolean} Se deve ocultar
 */
export const useItemVisibility = (quantity, unitType) => {
  const conversionResult = CubaUniversalConverter.convert(quantity, unitType);
  return !CubaUniversalConverter.shouldHideItem(conversionResult);
};

export default useConsolidationFormatter;