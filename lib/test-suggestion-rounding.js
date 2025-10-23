/**
 * Teste da nova lógica de arredondamento de sugestões
 *
 * REGRA: Sugestões são arredondadas apenas para múltiplos de 0,5
 * (0,5 / 1,0 / 1,5 / 2,0 / 2,5 / 3,0 / 3,5...)
 */

import { OrderSuggestionManager } from './order-suggestions.js';

console.log('🧪 TESTE DE ARREDONDAMENTO DE SUGESTÕES\n');
console.log('═══════════════════════════════════════\n');

const testCases = [
  // Valores muito pequenos → 0
  { input: 0.05, expected: 0, description: 'Valor muito pequeno (< 0.25)' },
  { input: 0.1, expected: 0, description: '0.1 pote (só aceito se digitado)' },
  { input: 0.2, expected: 0, description: '0.2 potes (só aceito se digitado)' },
  { input: 0.24, expected: 0, description: 'Quase 0.25' },

  // Arredonda para 0.5
  { input: 0.25, expected: 0.5, description: '0.25 → 0.5' },
  { input: 0.3, expected: 0.5, description: '0.3 → 0.5' },
  { input: 0.4, expected: 0.5, description: '0.4 → 0.5' },
  { input: 0.49, expected: 0.5, description: 'Quase 0.5' },

  // Múltiplos de 0.5
  { input: 0.5, expected: 0.5, description: 'Exatamente 0.5' },
  { input: 0.6, expected: 0.5, description: '0.6 → 0.5 (arredonda para baixo)' },
  { input: 0.7, expected: 0.5, description: '0.7 → 0.5' },
  { input: 0.74, expected: 0.5, description: '0.74 → 0.5' },
  { input: 0.75, expected: 1.0, description: '0.75 → 1.0 (arredonda para cima)' },
  { input: 0.8, expected: 1.0, description: '0.8 → 1.0' },
  { input: 0.9, expected: 1.0, description: '0.9 → 1.0' },

  // Inteiros e múltiplos de 0.5
  { input: 1.0, expected: 1.0, description: 'Exatamente 1.0' },
  { input: 1.1, expected: 1.0, description: '1.1 → 1.0' },
  { input: 1.2, expected: 1.0, description: '1.2 → 1.0' },
  { input: 1.24, expected: 1.0, description: '1.24 → 1.0' },
  { input: 1.25, expected: 1.5, description: '1.25 → 1.5' },
  { input: 1.3, expected: 1.5, description: '1.3 → 1.5' },
  { input: 1.4, expected: 1.5, description: '1.4 → 1.5' },
  { input: 1.5, expected: 1.5, description: 'Exatamente 1.5' },
  { input: 1.6, expected: 1.5, description: '1.6 (1G+1P+1pote) → 1.5 na sugestão' },
  { input: 1.7, expected: 1.5, description: '1.7 → 1.5' },
  { input: 1.74, expected: 1.5, description: '1.74 → 1.5' },
  { input: 1.75, expected: 2.0, description: '1.75 → 2.0' },
  { input: 1.8, expected: 2.0, description: '1.8 → 2.0' },
  { input: 1.9, expected: 2.0, description: '1.9 → 2.0' },

  // Valores maiores
  { input: 2.0, expected: 2.0, description: 'Exatamente 2.0' },
  { input: 2.3, expected: 2.5, description: '2.3 → 2.5' },
  { input: 2.5, expected: 2.5, description: 'Exatamente 2.5' },
  { input: 2.7, expected: 2.5, description: '2.7 → 2.5' },
  { input: 3.0, expected: 3.0, description: 'Exatamente 3.0' },
  { input: 3.4, expected: 3.5, description: '3.4 → 3.5' },
  { input: 4.8, expected: 5.0, description: '4.8 → 5.0' },
  { input: 5.2, expected: 5.0, description: '5.2 → 5.0' },
];

console.log('📋 Testando arredondamento para cuba-g:\n');

let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected, description }) => {
  const result = OrderSuggestionManager.roundToPracticalValue(input, 'cuba-g');
  const status = result === expected ? '✅' : '❌';

  if (result === expected) {
    passed++;
  } else {
    failed++;
  }

  console.log(`${status} ${description}`);
  console.log(`   Input: ${input.toFixed(2)} → Output: ${result.toFixed(1)} (esperado: ${expected.toFixed(1)})`);

  if (result !== expected) {
    console.log(`   ⚠️  FALHA: esperava ${expected} mas obteve ${result}`);
  }
  console.log('');
});

console.log('═══════════════════════════════════════\n');
console.log(`📊 RESULTADO: ${passed} passou, ${failed} falhou\n`);

if (failed === 0) {
  console.log('🎉 Todos os testes passaram!\n');
} else {
  console.log('❌ Alguns testes falharam. Revise a lógica.\n');
}

console.log('💡 IMPORTANTE:\n');
console.log('   - Sugestões: apenas múltiplos de 0,5');
console.log('   - Digitação manual: aceita qualquer valor (0,1 / 0,2 / 0,3 / 0,4)');
console.log('   - Histórico com 1,6: será usado para calcular média, mas sugestão arredonda para 1,5\n');
