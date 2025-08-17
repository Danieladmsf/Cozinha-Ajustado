// Exemplo de como usar o debugLogger sem modificar código existente

import { debugLogger } from '../lib/debugLogger.js';

// ============================================
// EXEMPLO 1: Logging básico
// ============================================

// Em vez de modificar código existente, você pode:
function exemploFuncaoExistente() {
  // Suas variáveis/dados existentes
  const dados = { usuario: 'João', idade: 30 };
  
  // Adicione apenas uma linha para logar
  debugLogger.info('Função chamada', { dados });
  
  // Resto do código permanece inalterado
  return dados;
}

// ============================================
// EXEMPLO 2: Monitoramento de funções
// ============================================

function funcaoQueVoceQuerMonitorar(parametros) {
  const log = debugLogger.logFunction('funcaoQueVoceQuerMonitorar', { parametros });
  
  try {
    // Seu código existente aqui...
    const resultado = { sucesso: true, dados: parametros };
    
    return resultado;
  } catch (error) {
    throw error;
  }
}

// ============================================
// EXEMPLO 3: Logging de objetos complexos
// ============================================

function exemploReceitaCalculation() {
  const receita = {
    id: 123,
    nome: 'Bolo de Chocolate',
    ingredientes: [
      { nome: 'Farinha', quantidade: 200 },
      { nome: 'Açúcar', quantidade: 150 }
    ]
  };
  
  // Log do objeto completo
  debugLogger.logObject('Receita sendo processada', receita);
  
  // Seu processamento existente...
  const resultado = calcularCusto(receita);
  
  debugLogger.info('Cálculo finalizado', { custoTotal: resultado });
  
  return resultado;
}

// ============================================
// EXEMPLO 4: Debugging de APIs
// ============================================

// Para debuggar rotas de API sem modificar o código principal:
export function debugApiRoute(req, res, handler) {
  debugLogger.info('API Route chamada', {
    method: req.method,
    url: req.url,
    query: req.query,
    body: req.body
  });
  
  return handler(req, res);
}

// ============================================
// EXEMPLO 5: Uso em hooks React
// ============================================

// Em hooks existentes, adicione apenas uma linha:
function useExemplo(dados) {
  debugLogger.debug('Hook useExemplo executado', { dados });
  
  // Resto do hook permanece igual...
  return dados;
}

// ============================================
// COMANDOS ÚTEIS
// ============================================

// Limpar logs
// debugLogger.clearLogs();

// Arquivar logs por data
// debugLogger.archiveLogs();

// Exemplo de função auxiliar para funcionar
function calcularCusto(receita) {
  return receita.ingredientes.reduce((total, ing) => total + ing.quantidade * 0.1, 0);
}