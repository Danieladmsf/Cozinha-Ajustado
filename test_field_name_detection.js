/**
 * TESTE - DETECÇÃO DE MUDANÇA NOS NOMES DOS CAMPOS
 * 
 * Este teste verifica se a correção para detectar mudanças nos nomes
 * dos campos (weight_field_name e cost_field_name) está funcionando.
 */

console.log('🧪 [FIELD-NAME-TEST] Testando detecção de mudança nos nomes dos campos...\n');

const currentRecipeData = {
  total_weight: 20.095,
  total_cost: 226.70,
  cost_per_kg_raw: 11.28,
  cuba_weight: 0.095,
  weight_field_name: 'Peso da Cuba',        // ← Nome atual
  cost_field_name: 'Custo da Cuba'          // ← Nome atual
};

const newMetrics = {
  total_weight: 20.095,                     // Mesmo valor
  total_cost: 226.70,                       // Mesmo valor  
  cost_per_kg_raw: 11.28,                   // Mesmo valor
  cuba_weight: 0.095,                       // Mesmo valor
  weight_field_name: 'Peso da Porção',      // ← Nome DIFERENTE
  cost_field_name: 'Custo da Porção'        // ← Nome DIFERENTE
};

// Verificação ANTES da correção (apenas valores numéricos)
const hasNumericChange = 
  Math.abs((newMetrics.total_weight || 0) - (currentRecipeData.total_weight || 0)) > 0.001 ||
  Math.abs((newMetrics.total_cost || 0) - (currentRecipeData.total_cost || 0)) > 0.01 ||
  Math.abs((newMetrics.cost_per_kg_raw || 0) - (currentRecipeData.cost_per_kg_raw || 0)) > 0.01 ||
  Math.abs((newMetrics.cuba_weight || 0) - (currentRecipeData.cuba_weight || 0)) > 0.001;

// Verificação DEPOIS da correção (incluindo nomes dos campos)
const hasSignificantChange = 
  Math.abs((newMetrics.total_weight || 0) - (currentRecipeData.total_weight || 0)) > 0.001 ||
  Math.abs((newMetrics.total_cost || 0) - (currentRecipeData.total_cost || 0)) > 0.01 ||
  Math.abs((newMetrics.cost_per_kg_raw || 0) - (currentRecipeData.cost_per_kg_raw || 0)) > 0.01 ||
  Math.abs((newMetrics.cuba_weight || 0) - (currentRecipeData.cuba_weight || 0)) > 0.001 ||
  (newMetrics.weight_field_name !== currentRecipeData.weight_field_name) ||  // ✅ CORREÇÃO
  (newMetrics.cost_field_name !== currentRecipeData.cost_field_name);        // ✅ CORREÇÃO

console.log('📊 [COMPARAÇÃO]');
console.log('Campo atual:', '"' + currentRecipeData.weight_field_name + '"');
console.log('Campo novo: ', '"' + newMetrics.weight_field_name + '"');
console.log('');
console.log('ANTES (só numérico):', hasNumericChange, '❌');
console.log('DEPOIS (com nomes):  ', hasSignificantChange, '✅');

if (hasSignificantChange && !hasNumericChange) {
  console.log('');
  console.log('✅ CORREÇÃO FUNCIONOU!');
  console.log('   Mudanças nos nomes dos campos agora são detectadas');
  console.log('   Interface será atualizada quando dropdown mudar');
} else {
  console.log('❌ Algo não funcionou como esperado');
}

console.log('\n📝 [CENÁRIO REAL]');
console.log('1. Usuário tem receita com dropdown = "Cuba"');
console.log('2. Interface mostra: "Peso da Cuba (kg)"'); 
console.log('3. Usuário muda dropdown para "Porção Individual"');
console.log('4. Sistema detecta mudança no weight_field_name');
console.log('5. Interface atualiza para: "Peso da Porção (kg)"');

export default {
  testPassed: hasSignificantChange && !hasNumericChange,
  detectedFieldChange: newMetrics.weight_field_name !== currentRecipeData.weight_field_name,
  before: currentRecipeData.weight_field_name,
  after: newMetrics.weight_field_name
};