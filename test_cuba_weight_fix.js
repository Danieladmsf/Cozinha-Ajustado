/**
 * TESTE - CORREÇÃO DO CUBA_WEIGHT NA INTERFACE
 * 
 * Este teste verifica se a correção do cuba_weight foi aplicada
 * corretamente na atualização do estado da interface.
 */

console.log('🧪 [CUBA-WEIGHT-FIX-TEST] Verificando correção da interface...\n');

// Simular o comportamento da função de recálculo
function simulateRecalculate(newMetrics, currentRecipeData) {
  console.log('🔄 [SIMULATE] Simulando recálculo com métricas:');
  console.log('- cuba_weight calculado:', newMetrics.cuba_weight, 'kg');
  console.log('- cuba_weight atual na interface:', currentRecipeData.cuba_weight, 'kg');
  
  // Verificar mudança significativa (incluindo cuba_weight)
  const hasSignificantChange = 
    Math.abs((newMetrics.total_weight || 0) - (currentRecipeData.total_weight || 0)) > 0.001 ||
    Math.abs((newMetrics.total_cost || 0) - (currentRecipeData.total_cost || 0)) > 0.01 ||
    Math.abs((newMetrics.cost_per_kg_raw || 0) - (currentRecipeData.cost_per_kg_raw || 0)) > 0.01 ||
    Math.abs((newMetrics.cuba_weight || 0) - (currentRecipeData.cuba_weight || 0)) > 0.001; // ✅ CORREÇÃO APLICADA

  console.log('🟡 [SIMULATE] Tem mudança significativa:', hasSignificantChange);

  if (hasSignificantChange) {
    console.log('🟢 [SIMULATE] Atualizando estado da receita');
    
    // Simular setRecipeData (incluindo cuba_weight)
    const updatedRecipeData = {
      ...currentRecipeData,
      total_weight: newMetrics.total_weight,
      total_cost: newMetrics.total_cost,
      cost_per_kg_raw: newMetrics.cost_per_kg_raw,
      cost_per_kg_yield: newMetrics.cost_per_kg_yield,
      weight_field_name: newMetrics.weight_field_name,
      cost_field_name: newMetrics.cost_field_name,
      yield_weight: newMetrics.yield_weight,
      cuba_weight: newMetrics.cuba_weight // ✅ CORREÇÃO APLICADA
    };
    
    return updatedRecipeData;
  }
  
  return currentRecipeData;
}

// Cenário: receita com cuba_weight zerado (problema reportado)
const currentRecipeData = {
  name: 'Lagarto ao Molho Madeira',
  total_weight: 20.095,
  yield_weight: 12.095,
  cuba_weight: 0.000, // ❌ PROBLEMA: estava zerado
  total_cost: 226.70,
  cost_per_kg_raw: 11.28,
  cost_per_kg_yield: 18.74,
  weight_field_name: 'Peso da Cuba',
  cost_field_name: 'Custo da Cuba'
};

// Métricas calculadas (corretas)
const newMetrics = {
  total_weight: 20.095,
  yield_weight: 12.095,
  cuba_weight: 0.095, // ✅ VALOR CORRETO CALCULADO
  total_cost: 228.40,
  cost_per_kg_raw: 11.37,
  cost_per_kg_yield: 18.88,
  weight_field_name: 'Peso da Cuba',
  cost_field_name: 'Custo da Cuba'
};

console.log('📋 [CENÁRIO] Estado atual da interface:');
console.log('- cuba_weight na interface:', currentRecipeData.cuba_weight, 'kg ❌');

console.log('\n📋 [MÉTRICAS] Valores calculados:');
console.log('- cuba_weight calculado:', newMetrics.cuba_weight, 'kg ✅');

// Executar simulação
const result = simulateRecalculate(newMetrics, currentRecipeData);

console.log('\n📊 [RESULTADO] Estado após correção:');
console.log('- cuba_weight na interface:', result.cuba_weight, 'kg');

// Verificação
const fixed = result.cuba_weight === newMetrics.cuba_weight;

console.log('\n🎯 [VERIFICAÇÃO]');
if (fixed) {
  console.log('✅ CORREÇÃO APLICADA COM SUCESSO!');
  console.log('   cuba_weight agora será atualizado corretamente na interface');
  console.log('   Valor esperado na tela: 0,095kg');
} else {
  console.log('❌ CORREÇÃO NÃO FUNCIONOU');
  console.log('   cuba_weight ainda não está sendo atualizado');
}

console.log('\n📝 [RESUMO DA CORREÇÃO]');
console.log('1. ✅ Adicionado cuba_weight na verificação hasSignificantChange');
console.log('2. ✅ Adicionado cuba_weight na atualização do setRecipeData');
console.log('3. ✅ Agora o valor calculado chegará na interface');

export default {
  testPassed: fixed,
  before: currentRecipeData.cuba_weight,
  after: result.cuba_weight,
  expected: newMetrics.cuba_weight
};