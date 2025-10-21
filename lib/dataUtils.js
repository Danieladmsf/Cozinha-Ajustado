import { parseNumericValue } from './formatUtils';

export const sanitizeFields = (obj, fields, converter) => {
  const sanitized = { ...obj };
  fields.forEach(field => {
    if (sanitized[field] !== undefined) {
      sanitized[field] = converter(sanitized[field]);
    }
  });
  return sanitized;
};

export const toNumber = (value) => {
  const num = parseNumericValue(value);
  return isNaN(num) ? 0 : num;
};

export const toString = (value) => {
  return value === null || value === undefined ? '' : String(value);
};

export const processWeightFields = (source, fields) => {
  const processed = {};
  fields.forEach(field => {
    const value = parseNumericValue(source[field]) || 0;
    processed[field] = value > 0 ? String(value).replace('.', ',') : '';
  });
  return processed;
};

export const sanitizeNumericData = (data) => {
  if (!data) return data;

  const prepFields = [
    'cost', 'ipi', 'icms', 'pis', 'cofins', 'weight', 'grossWeight',
    'quantity', 'unitCost', 'totalCost', 'waste', 'actualWeight'
  ];

  const ingFields = [
    'cost', 'ipi', 'icms', 'pis', 'cofins', 'weight', 'grossWeight',
    'quantity', 'unitCost', 'totalCost', 'waste', 'actualWeight'
  ];

  const scFields = [
    'cost', 'ipi', 'icms', 'pis', 'cofins', 'weight', 'grossWeight',
    'quantity', 'unitCost', 'totalCost', 'waste', 'actualWeight'
  ];

  const sanitized = { ...data };

  if (sanitized.preparations) {
    sanitized.preparations = sanitized.preparations.map(prep => 
      sanitizeFields(prep, prepFields, toNumber)
    );
  }

  if (sanitized.ingredients) {
    sanitized.ingredients = sanitized.ingredients.map(ing => 
      sanitizeFields(ing, ingFields, toNumber)
    );
  }

  if (sanitized.subComponents) {
    sanitized.subComponents = sanitized.subComponents.map(sc => 
      sanitizeFields(sc, scFields, toNumber)
    );
  }

  const mainFields = ['portions', 'unitCost', 'totalCost', 'profitMargin', 'sellPrice'];
  return sanitizeFields(sanitized, mainFields, toNumber);
};