// Simular exatamente como o CategoryLogic.calculateItemTotalWeight está sendo chamado

// Função parseQuantity (como está no orderUtils.jsx)
function parseQuantity(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const cleanedValue = value.trim().replace(',', '.');
  const parsed = parseFloat(cleanedValue);
  const result = isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  return result;
}

// Função calculateItemTotalWeight (como está no categoryLogic.jsx)
function calculateItemTotalWeight(item) {
  if (!item) return 0;
  
  const quantity = parseQuantity(item.quantity) || 0;
  const unitType = (item.unit_type || '').toLowerCase();
  const cubaWeight = parseQuantity(item.cuba_weight) || 0;
  const yieldWeight = parseQuantity(item.yield_weight) || 0;
  
  console.log('🔍 DEBUG calculateItemTotalWeight:');
  console.log('  item.recipe_name:', item.recipe_name);
  console.log('  item.quantity:', item.quantity);
  console.log('  item.unit_type:', item.unit_type);
  console.log('  item.cuba_weight:', item.cuba_weight);
  console.log('  item.yield_weight:', item.yield_weight);
  console.log('  ---');
  console.log('  quantity (parsed):', quantity);
  console.log('  unitType (lowercase):', unitType);
  console.log('  cubaWeight (parsed):', cubaWeight);
  console.log('  yieldWeight (parsed):', yieldWeight);
  
  let totalWeight = 0;
  
  if (unitType === 'cuba' || unitType === 'cuba-g') {
    // Para cuba, usar cuba_weight. Se zerado, tentar yield_weight como fallback
    totalWeight = cubaWeight > 0 ? cubaWeight * quantity : yieldWeight * quantity;
    console.log('  🧮 Cálculo (Cuba):', cubaWeight > 0 ? `${cubaWeight} × ${quantity}` : `${yieldWeight} × ${quantity}`, '=', totalWeight);
  } else if (unitType === 'kg') {
    // Para kg, a quantidade já é o peso
    totalWeight = quantity;
    console.log('  🧮 Cálculo (Kg):', quantity);
  } else if (unitType === 'unid' || unitType === 'unid.' || unitType === 'unidade') {
    // Para unidades, usar cuba_weight. Se zerado, tentar yield_weight como fallback
    totalWeight = cubaWeight > 0 ? cubaWeight * quantity : yieldWeight * quantity;
    console.log('  🧮 Cálculo (Unid):', cubaWeight > 0 ? `${cubaWeight} × ${quantity}` : `${yieldWeight} × ${quantity}`, '=', totalWeight);
  } else {
    // Tipo de unidade não reconhecido
    console.log('  ❌ Tipo de unidade não reconhecido:', unitType);
    totalWeight = 0;
  }
  
  console.log('  ✅ RESULTADO FINAL:', totalWeight, 'kg');
  console.log('');
  
  return totalWeight;
}

console.log('🧪 TESTE: Simulando itens problemáticos do portal...\n');

// Teste 1: R. Milho e Ervilha (deveria funcionar)
console.log('=== TESTE 1: R. Milho e Ervilha ===');
const milhoItem = {
  recipe_name: 'R. Milho e Ervilha',
  quantity: 0.5,  // 0.5 cuba-g conforme portal
  unit_type: 'cuba-g',
  cuba_weight: 1.2200000000000002,  // Valor do Firebase
  yield_weight: 1.2200000000000002,
  total_weight: 1.2200000000000002
};
const milhoWeight = calculateItemTotalWeight(milhoItem);

// Teste 2: S. Alface (deveria funcionar) 
console.log('=== TESTE 2: S. Alface ===');
const alfaceItem = {
  recipe_name: 'S. Alface',
  quantity: 1.5,  // 1.5 cuba-g conforme portal
  unit_type: 'cuba-g',
  cuba_weight: 1,  // Valor do Firebase
  yield_weight: 0.9,
  total_weight: 1
};
const alfaceWeight = calculateItemTotalWeight(alfaceItem);

// Teste 3: Ovos fritos (deveria funcionar)
console.log('=== TESTE 3: Ovos fritos ===');
const ovosItem = {
  recipe_name: 'Ovos fritos',
  quantity: 200,  // 200 unid conforme portal
  unit_type: 'Unid.',  // Note o "U" maiúsculo como no Firebase
  cuba_weight: 1,  // Valor do Firebase
  yield_weight: 1,
  total_weight: 1
};
const ovosWeight = calculateItemTotalWeight(ovosItem);

// Teste 4: Macarrão ao Sugo (problemas conhecidos)
console.log('=== TESTE 4: Macarrão ao Sugo ===');
const macarraoItem = {
  recipe_name: 'Macarrão ao Sugo',
  quantity: 8,  // 8 cuba-g conforme portal
  unit_type: undefined,  // container_type undefined no Firebase
  cuba_weight: 0,  // cuba_weight zerado no Firebase
  yield_weight: 2.6300000000000003,
  total_weight: 1.6300000000000001
};
const macarraoWeight = calculateItemTotalWeight(macarraoItem);

console.log('📊 RESUMO DOS RESULTADOS:');
console.log('R. Milho e Ervilha:', milhoWeight, 'kg (esperado: ~0.61 kg)');
console.log('S. Alface:', alfaceWeight, 'kg (esperado: 1.5 kg)');
console.log('Ovos fritos:', ovosWeight, 'kg (esperado: 200 kg)');
console.log('Macarrão ao Sugo:', macarraoWeight, 'kg (esperado: problema conhecido)');