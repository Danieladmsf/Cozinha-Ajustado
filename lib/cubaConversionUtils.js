/**
 * Utilitários para conversão de unidades cuba-g para formato da cozinha
 * Converte para: cubas G e cubas P (SEM POTES)
 *
 * Regras de conversão:
 * - 1 cuba G = 2 cubas P
 * - 0,25 cuba G = ½ cuba P (arredondamento inteligente)
 * - 0,5 cuba G = 1 cuba P
 * - 0,75 cuba G = 1½ cuba P
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
 * Arredonda valor decimal para o padrão de cuba-p mais próximo
 */
const roundToNearestCubaP = (decimal) => {
  if (decimal === 0) return 0;

  const standards = [0.25, 0.5, 0.75, 1.0];
  const tolerance = 0.15; // Aumentado para arredondamento mais agressivo

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
  if (minDiff < tolerance) {
    return nearest;
  }

  return decimal;
};

/**
 * Converte a parte decimal para unidade da cozinha (SEM POTES)
 * @param {number} decimal - Parte decimal (ex: 0.5, 0.3, 0.25, 0.75)
 * @returns {string} - Unidade da cozinha (ex: "1 cuba P", "½ cuba P", "1½ cuba P")
 */
const convertDecimalToKitchenUnit = (decimal) => {
  // Arredondamento inteligente
  const rounded = roundToNearestCubaP(decimal);

  // Converter para cubas-p (1 cuba-g = 2 cubas-p)
  const cubasPValue = rounded * 2;

  if (cubasPValue === 0) {
    return "";
  } else if (cubasPValue === 0.5) {
    return "½ cuba P";
  } else if (cubasPValue === 1) {
    return "1 cuba P";
  } else if (cubasPValue === 1.5) {
    return "1½ cuba P";
  } else if (cubasPValue === 2) {
    return "2 cubas P";
  } else {
    // Valor não padrão - mostrar formatado
    const formatted = Number.isInteger(cubasPValue)
      ? String(cubasPValue)
      : cubasPValue.toFixed(1).replace('.', ',');
    return `${formatted} cuba${cubasPValue > 1 ? 's' : ''} P`;
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
 * Testa as conversões com os exemplos fornecidos (SEM POTES)
 * Função para desenvolvimento/debug
 */
export const testConversions = () => {
  const testCases = [
    { input: 2.5, expected: "2 cubas G + 1 cuba P" },
    { input: 0.3, expected: "½ cuba P" }, // Arredonda para 0.25
    { input: 4, expected: "4 cubas G" },
    { input: 1, expected: "1 cuba G" },
    { input: 0.5, expected: "1 cuba P" },
    { input: 0.25, expected: "½ cuba P" },
    { input: 1.5, expected: "1 cuba G + 1 cuba P" },
    { input: 5.5, expected: "5 cubas G + 1 cuba P" }
  ];

  console.log("🧪 Testando conversões:");
  testCases.forEach(({ input, expected }) => {
    const result = convertCubaGToKitchenFormat(input);
    const status = result === expected ? "✅" : "❌";
    console.log(`${status} ${input} → "${result}" (esperado: "${expected}")`);
  });
};