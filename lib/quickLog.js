// Versão ultra-simples para logging rápido
// Removida dependência de debugLogger para evitar erro de módulo

// Para usar em qualquer lugar: import { log } from './lib/quickLog.js'
export const log = {
  d: (msg, data) => console.log(`🐛 ${msg}`, data),
  i: (msg, data) => console.log(`ℹ️ ${msg}`, data),
  w: (msg, data) => console.warn(`⚠️ ${msg}`, data),
  e: (msg, data) => console.error(`❌ ${msg}`, data),
  
  obj: (name, obj) => console.log(`📦 ${name}:`, obj),
  
  fn: (name, params) => console.log(`🔧 ${name}:`, params)
};

// Versão ainda mais rápida - apenas uma função
export const qlog = (message, data = null) => {
  console.log(`📝 ${message}`, data || {});
};

// Para debugging de variáveis específicas
export const logVar = (varName, value) => {
  console.log(`🔍 Variável ${varName}:`, { [varName]: value });
};

// Para debugging de performance
export const logTime = (label) => {
  const start = Date.now();
  return {
    end: () => {
      const duration = Date.now() - start;
      console.log(`⏱️ ${label}: ${duration}ms`);
    }
  };
};

/**
 * Logs específicos para análise de zeros
 */
export const ZeroDebug = {
  
  /**
   * Log quando zeros são detectados
   */
  found: (context, itemName, zeroFields) => {
    const timestamp = new Date().toISOString().substr(11, 12);
    console.log(`🚨 [${timestamp}] ZERO-FOUND-${context}:`, {
      item: itemName,
      zero_fields: zeroFields,
      context: context
    });
  },
  
  /**
   * Log dados de entrada da receita
   */
  recipeInput: (recipeName, recipeData) => {
    const timestamp = new Date().toISOString().substr(11, 12);
    console.log(`📊 [${timestamp}] RECIPE-INPUT:`, {
      recipe: recipeName,
      cuba_weight: recipeData.cuba_weight,
      yield_weight: recipeData.yield_weight,
      total_weight: recipeData.total_weight,
      cuba_cost: recipeData.cuba_cost,
      portion_cost: recipeData.portion_cost,
      cost_per_kg_yield: recipeData.cost_per_kg_yield,
      unit_type: recipeData.unit_type || recipeData.container_type
    });
  },
  
  /**
   * Log transformação de dados
   */
  transform: (context, before, after) => {
    const timestamp = new Date().toISOString().substr(11, 12);
    const changes = {};
    Object.keys(before).forEach(key => {
      if (before[key] !== after[key]) {
        changes[key] = { from: before[key], to: after[key] };
      }
    });
    
    console.log(`🔄 [${timestamp}] TRANSFORM-${context}:`, {
      item: before.recipe_name || before.name || 'Unknown',
      changes: changes,
      zero_introduced: Object.values(changes).some(change => change.from !== 0 && change.to === 0)
    });
  }
};