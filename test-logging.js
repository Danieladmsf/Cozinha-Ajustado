// Teste do sistema de logging
import { log, qlog, logVar, logTime } from './lib/quickLog.js';

// Teste básico
console.log('🧪 Testando sistema de logging...');

// Teste 1: Logging simples
qlog('Sistema iniciado');

// Teste 2: Logging de objetos
const exemploObjeto = {
  id: 123,
  nome: 'Receita Teste',
  ingredientes: ['farinha', 'açúcar']
};

// Teste 3: Logging de variáveis
const minhaVariavel = 'valor importante';
logVar('minhaVariavel', minhaVariavel);

// Teste 4: Medição de performance
const timer = logTime('Operação de teste');
// Simula algum processamento
await new Promise(resolve => setTimeout(resolve, 100));
timer.end();

// Teste 5: Logging de função
// Simula processamento
const resultado = 'sucesso';
funcaoTeste.end(resultado);

console.log('✅ Teste concluído! Verifique o arquivo logs/debug.log');