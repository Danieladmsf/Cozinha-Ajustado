/**
 * Utilitários para conversão de unidades cuba-g para formato da cozinha
 * Converte para: cubas G, cubas P, potes
 * 
 * Regras de conversão:
 * - 1 cuba G = 2 cubas P
 * - 0,1 cuba G = 1 pote
 * - 0,2 cuba G = 2 potes
 * - 0,3 cuba G = 3 potes
 * - 0,4 cuba G = 4 potes
 * - 0,5 cuba G = 1 cuba P
 */

/**
 * Converte um valor cuba-g para o formato da cozinha
 * @param {number} cubaGValue - Valor em cuba-g (ex: 2.5, 0.3, 4)
 * @returns {string} - Formato para cozinha (ex: "2 cubas G + 1 cuba P", "3 potes", "4 cubas G")
 */
export const convertCubaGToKitchenFormat = (cubaGValue) => {
  if (!cubaGValue || cubaGValue <= 0) return "";
  
  // Separar parte inteira e decimal
  const integerPart = Math.floor(cubaGValue);
  const decimalPart = cubaGValue - integerPart;
  
  let result = "";
  
  // Processar parte inteira (cubas G)
  if (integerPart > 0) {
    result += integerPart === 1 ? `${integerPart} cuba G` : `${integerPart} cubas G`;
  }
  
  // Processar parte decimal
  if (decimalPart > 0) {
    const decimalFormatted = convertDecimalToKitchenUnit(decimalPart);
    
    if (decimalFormatted) {
      if (result) {
        result += ` + ${decimalFormatted}`;
      } else {
        result = decimalFormatted;
      }
    }
  }
  
  return result || "0";
};

/**
 * Converte a parte decimal para unidade da cozinha
 * @param {number} decimal - Parte decimal (ex: 0.5, 0.3, 0.1, 0.25, 0.75)
 * @returns {string} - Unidade da cozinha (ex: "1 cuba P", "3 potes", "½ cuba P")
 */
const convertDecimalToKitchenUnit = (decimal) => {
  // Arredondar para evitar problemas de ponto flutuante
  // Usar arredondamento para 0.01 para capturar 0.25, 0.75, etc.
  const rounded = Math.round(decimal * 100) / 100;

  // ✅ CASOS ESPECIAIS: múltiplos de 0.25 (sugestões) - usando símbolos de fração
  if (rounded === 0.25) {
    return "½ cuba P"; // Meia cuba pequena (símbolo ½)
  } else if (rounded === 0.75) {
    return "1 cuba P + ½ cuba P"; // Uma cuba e meia pequena
  }

  // ✅ CASOS PADRÃO: cuba P e potes
  if (rounded === 0.5) {
    return "1 cuba P";
  } else if (rounded === 0.1) {
    return "1 pote";
  } else if (rounded === 0.2) {
    return "2 potes";
  } else if (rounded === 0.3) {
    return "3 potes";
  } else if (rounded === 0.4) {
    return "4 potes";
  }

  // ✅ VALORES INTERMEDIÁRIOS: Aproximar para o mais próximo
  if (rounded < 0.5) {
    // Para valores menores que 0.5
    // Se estiver mais perto de 0.25, mostrar como fração de cuba P
    if (Math.abs(rounded - 0.25) < Math.abs(rounded - (Math.round(rounded * 10) / 10))) {
      return "½ cuba P";
    }
    // Senão, converter para potes
    const potes = Math.round(rounded * 10);
    return potes === 1 ? "1 pote" : `${potes} potes`;
  } else {
    // Valores maiores que 0.5 - converter para cubas P
    const cubasP = Math.round(rounded * 2);
    return cubasP === 1 ? "1 cuba P" : `${cubasP} cubas P`;
  }
};

/**
 * Converte texto de quantidade e unidade para formato da cozinha
 * @param {string|number} quantity - Quantidade (ex: "2.5", 2.5)
 * @param {string} unitType - Tipo de unidade (ex: "cuba-g", "unid.", "kg")
 * @returns {string} - Quantidade formatada para cozinha
 */
export const convertQuantityForKitchen = (quantity, unitType) => {
  if (!unitType || unitType.toLowerCase() !== 'cuba-g') {
    // Para unidades que não são cuba-g, manter formato original
    return quantity ? String(quantity) : "";
  }
  
  const numValue = parseFloat(quantity);
  if (isNaN(numValue)) return "";
  
  return convertCubaGToKitchenFormat(numValue);
};

/**
 * Converte uma linha de item completa para formato da cozinha
 * @param {Object} item - Item com quantity, unit_type, recipe_name
 * @returns {string} - Linha formatada para cozinha
 */
export const convertItemLineForKitchen = (item) => {
  if (!item) return "";
  
  const { quantity, unit_type, recipe_name } = item;
  
  if (unit_type?.toLowerCase() === 'cuba-g') {
    const convertedQuantity = convertQuantityForKitchen(quantity, unit_type);
    return `${convertedQuantity} – ${recipe_name || ''}`;
  } else {
    // Para outras unidades, manter formato original
    const formattedQuantity = quantity ? String(quantity).replace('.', ',') : '';
    const unit = unit_type || '';
    return `${formattedQuantity}${unit ? ` ${unit}` : ''} – ${recipe_name || ''}`;
  }
};

/**
 * Testa as conversões com os exemplos fornecidos
 * Função para desenvolvimento/debug
 */
export const testConversions = () => {
  const testCases = [
    { input: 2.5, expected: "2 cubas G + 1 cuba P" },
    { input: 0.3, expected: "3 potes" },
    { input: 4, expected: "4 cubas G" },
    { input: 1, expected: "1 cuba G" },
    { input: 0.5, expected: "1 cuba P" },
    { input: 0.1, expected: "1 pote" },
    { input: 1.5, expected: "1 cuba G + 1 cuba P" },
    { input: 5.5, expected: "5 cubas G + 1 cuba P" }
  ];
  
  // Console logging removed for production
  testCases.forEach(({ input, expected }) => {
    const result = convertCubaGToKitchenFormat(input);
    const status = result === expected ? "✅ PASS" : "❌ FAIL";
  });
};