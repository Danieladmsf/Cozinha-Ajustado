/**
 * TESTE DE CÁLCULO DO PESO DE RENDIMENTO
 * 
 * Script para testar se o peso de rendimento está sendo calculado corretamente
 * após a correção do bug que preservava valores manuais antigos.
 */

import RecipeCalculator from './lib/recipeCalculator.js';

// Dados de teste baseados na ficha técnica apresentada
const testData = [
  // 1º Etapa: Descongelamento + Limpeza + Cocção
  {
    title: "1º Etapa: Descongelamento + Limpeza + Cocção",
    processes: ['defrosting', 'cleaning', 'cooking'],
    ingredients: [
      {
        name: "Arroz branco",
        weight_frozen: 10,      // 10kg congelado
        weight_thawed: 8,       // 8kg descongelado
        weight_clean: 7,        // 7kg limpo
        weight_cooked: 5,       // 5kg cozido (RENDIMENTO FINAL)
        current_price: 4.67
      },
      {
        name: "Cachaça",
        weight_frozen: 0,       // 0kg congelado (líquido)
        weight_thawed: 10,      // 10kg inicial
        weight_clean: 8,        // 8kg após "limpeza"
        weight_cooked: 7,       // 7kg após "cocção" (RENDIMENTO FINAL)
        current_price: 22.70
      }
    ]
  },
  
  // 2º Etapa: Porcionamento
  {
    title: "2º Etapa: Porcionamento",
    processes: ['portioning'], // APENAS porcionamento (finalização)
    ingredients: [
      {
        name: "Feijão Carioca", // Ingrediente de finalização
        weight_raw: 0.09,       // 90g - conta como bruto = rendimento
        current_price: 8.00
      }
    ],
    sub_components: [
      {
        name: "1º Etapa: Descongelamento + Limpeza + Cocção",
        assembly_weight_kg: 0.005, // 5g da etapa anterior
        total_cost: 0.11
      }
    ]
  }
];

// Simular dados da receita (valores antigos/manuais que deveriam ser ignorados)
const oldRecipeData = {
  yield_weight: 12.000, // VALOR MANUAL ANTIGO (deveria ser ignorado)
  cuba_weight: 35
};

console.log('🧪 [TESTE] Iniciando teste de cálculo do peso de rendimento...');
console.log('🧪 [TESTE] Valor manual antigo (deveria ser ignorado):', oldRecipeData.yield_weight, 'kg');

// Executar cálculo
const result = RecipeCalculator.calculateRecipeMetrics(testData, oldRecipeData);

console.log('\n📊 [RESULTADO] Métricas calculadas:');
console.log('- Peso Total (Bruto):', result.total_weight.toFixed(3), 'kg');
console.log('- Peso Total (Rendimento):', result.yield_weight.toFixed(3), 'kg');
console.log('- Rendimento Geral:', result.yield_percentage.toFixed(1), '%');

console.log('\n🔍 [ANÁLISE DETALHADA]');

// Analisar cada preparação
result.preparation_metrics?.forEach((prepMetric, index) => {
  console.log(`\n📋 Preparação ${index + 1}: ${prepMetric.preparationTitle}`);
  console.log(`  - Peso Bruto: ${prepMetric.totalRawWeight.toFixed(3)}kg`);
  console.log(`  - Peso Rendimento: ${prepMetric.totalYieldWeight.toFixed(3)}kg`);
  console.log(`  - Custo: R$ ${prepMetric.totalCost.toFixed(2)}`);
  console.log(`  - Rendimento: ${prepMetric.yieldPercentage.toFixed(1)}%`);
});

console.log('\n✅ [EXPECTATIVA]');
console.log('1º Etapa: Arroz (5kg) + Cachaça (7kg) = 12kg');
console.log('2º Etapa: Feijão (0,09kg) + Sub-comp (0,005kg) = 0,095kg');
console.log('TOTAL ESPERADO: ~12,095kg');

console.log('\n🎯 [VERIFICAÇÃO]');
const expectedYield = 12.095;
const calculatedYield = result.yield_weight;
const difference = Math.abs(expectedYield - calculatedYield);

console.log(`Esperado: ${expectedYield}kg`);
console.log(`Calculado: ${calculatedYield.toFixed(3)}kg`);
console.log(`Diferença: ${difference.toFixed(3)}kg`);

if (difference < 0.01) {
  console.log('✅ [SUCESSO] Cálculo está correto!');
} else {
  console.log('❌ [FALHA] Cálculo não confere com expectativa');
}

console.log('\n🔧 [STATUS] Correção do bug de yield_weight manual aplicada');

export default {
  testData,
  oldRecipeData,
  result,
  expectedYield: 12.095
};