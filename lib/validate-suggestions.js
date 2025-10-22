/**
 * Valida Precisão das Sugestões
 *
 * Compara sugestões geradas vs pedidos reais
 *
 * Uso:
 * node lib/validate-suggestions.js <customer_id>
 */

import { OrderSuggestionManager } from './order-suggestions.js';
import fs from 'fs';

// Ler dados exportados
const allOrders = JSON.parse(fs.readFileSync('export-orders-simple-2025-10-22T22-28-50.json', 'utf8'));

/**
 * Valida sugestões para um cliente
 */
async function validateSuggestions(customerId) {
  console.log(`\n🔍 Validando sugestões para cliente: ${customerId}\n`);

  let report = '';
  report += '═══════════════════════════════════════════════════════\n';
  report += '  VALIDAÇÃO DE PRECISÃO DAS SUGESTÕES\n';
  report += '═══════════════════════════════════════════════════════\n\n';

  try {
    // Filtrar pedidos do cliente
    const customerOrders = allOrders.filter(o => o.customer_id === customerId);

    if (customerOrders.length === 0) {
      console.log('❌ Nenhum pedido encontrado para este cliente!');
      return;
    }

    const customerName = customerOrders[0].customer_name;
    report += `Cliente: ${customerName} (${customerId})\n`;
    report += `Total de pedidos: ${customerOrders.length}\n`;
    report += `Data da análise: ${new Date().toISOString()}\n\n`;

    // Ordenar por semana/ano/dia
    customerOrders.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.week_number !== b.week_number) return a.week_number - b.week_number;
      return a.day_of_week - b.day_of_week;
    });

    // Estatísticas gerais
    let totalComparisons = 0;
    let totalErrors = [];
    const recipeErrors = {};

    report += '───────────────────────────────────────────────────────\n';
    report += 'ANÁLISE PEDIDO POR PEDIDO\n';
    report += '───────────────────────────────────────────────────────\n\n';

    // Para cada pedido (usar como teste)
    for (let i = 4; i < customerOrders.length; i++) {
      const testOrder = customerOrders[i];

      // ✅ FILTRAR PEDIDOS HISTÓRICOS PELO MESMO DIA DA SEMANA
      // Pegar últimos pedidos ANTES deste
      const previousOrders = customerOrders.slice(Math.max(0, i - 40), i); // Buscar mais para ter histórico suficiente

      // Filtrar apenas pedidos do MESMO dia da semana
      const historicalOrders = previousOrders
        .filter(order => order.day_of_week === testOrder.day_of_week)
        .slice(-12); // Pegar até 12 mais recentes do mesmo dia

      if (historicalOrders.length < 2) continue; // Precisa de pelo menos 2 pedidos históricos

      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const dayName = dayNames[testOrder.day_of_week] || testOrder.day_of_week;

      report += `\n${'━'.repeat(55)}\n`;
      report += `Pedido de Teste:\n`;
      report += `  Data: ${testOrder.date}\n`;
      report += `  Semana ${testOrder.week_number}/${testOrder.year} - ${dayName} (dia ${testOrder.day_of_week})\n`;
      report += `  Refeições: ${testOrder.total_meals_expected}\n`;
      report += `  Baseado em: ${historicalOrders.length} pedidos de ${dayName} anteriores\n`;
      report += `${'━'.repeat(55)}\n\n`;

      // Analisar padrões
      const consumptionPatterns = OrderSuggestionManager.analyzeConsumptionPatterns(historicalOrders);

      // Criar mapa de itens reais do pedido de teste
      const actualItemsMap = {};
      testOrder.items
        .filter(item => item.quantity > 0)
        .forEach(item => {
          actualItemsMap[item.recipe_id] = {
            name: item.recipe_name,
            quantity: item.quantity,
            base_quantity: item.base_quantity,
            unit_type: item.unit_type
          };
        });

      // Para cada receita que tem sugestão
      Object.entries(consumptionPatterns).forEach(([recipeId, analysis]) => {
        const stats = analysis.statistics;

        // Pular se não tem confiança mínima
        if (stats.confidence < 0.25) return;

        // Calcular sugestão
        const mealsExpected = testOrder.total_meals_expected || 100;
        
        // ✅ USA LÓGICA ATUALIZADA COM MEDIANA
        let suggestedQty = stats.median_ratio_per_meal * mealsExpected;

        if (suggestedQty < 0.1 && stats.median_base_quantity > 0) {
          suggestedQty = stats.median_base_quantity;
        }

        if (stats.avg_base_quantity > 0 && suggestedQty > 0) {
          const ratio = suggestedQty / stats.avg_base_quantity;
          if (ratio < 0.4 || ratio > 2.5) {
            suggestedQty = stats.median_base_quantity;
          }
        }

        if (suggestedQty < 0.125 && stats.avg_base_quantity > 0) {
          suggestedQty = 0.25;
        }

        // Arredondar
        suggestedQty = OrderSuggestionManager.roundToPracticalValue(suggestedQty, analysis.unit_type);

        // Pegar valor real
        const actualItem = actualItemsMap[recipeId];

        if (actualItem) {
          const actualQty = actualItem.base_quantity || actualItem.quantity;
          
          // ✅ AVALIAR ERRO ABSOLUTO PARA ITENS PEQUENOS
          let error, errorAbs;
          const isSmallItem = (actualItem.unit_type && actualItem.unit_type.toLowerCase().includes('cuba') && actualQty < 1.0);

          if (isSmallItem && actualQty > 0) {
            // Para itens pequenos, a diferença absoluta é mais importante que a percentual.
            // Normalizamos para uma escala parecida com percentual (0.25 de diferença = 25 'pontos de erro')
            const diff = suggestedQty - actualQty;
            error = diff * 100;
            errorAbs = Math.abs(diff) * 100;
          } else {
            error = actualQty !== 0 ? ((suggestedQty - actualQty) / actualQty) * 100 : (suggestedQty > 0 ? 100 : 0);
            errorAbs = Math.abs(error);
          }

          totalComparisons++;
          totalErrors.push(errorAbs);

          if (!recipeErrors[analysis.recipe_name]) {
            recipeErrors[analysis.recipe_name] = [];
          }
          recipeErrors[analysis.recipe_name].push(errorAbs);

          // Símbolo de status
          let status = '✅';
          if (errorAbs > 50) status = '❌';
          else if (errorAbs > 25) status = '⚠️';

          report += `${status} ${analysis.recipe_name}:\n`;
          report += `     Sugerido: ${suggestedQty} ${analysis.unit_type}\n`;
          report += `     Real: ${actualQty} ${analysis.unit_type}\n`;
          report += `     Erro: ${error > 0 ? '+' : ''}${error.toFixed(1)}%\n`;
          report += `     Confiança: ${(stats.confidence * 100).toFixed(0)}% (${stats.total_samples} amostras)\n`;
          report += `\n`;
        } else {
          // Sugeriu mas não foi pedido
          report += `⚪ ${analysis.recipe_name}:\n`;
          report += `     Sugerido: ${suggestedQty} ${analysis.unit_type}\n`;
          report += `     Real: NÃO PEDIDO\n`;
          report += `\n`;
        }
      });

      // Itens pedidos mas sem sugestão
      Object.entries(actualItemsMap).forEach(([recipeId, item]) => {
        if (!consumptionPatterns[recipeId]) {
          report += `🆕 ${item.name}:\n`;
          report += `     Real: ${item.quantity} ${item.unit_type}\n`;
          report += `     Sugestão: SEM HISTÓRICO\n`;
          report += `\n`;
        }
      });
    }

    // Estatísticas finais
    report += '\n';
    report += '═══════════════════════════════════════════════════════\n';
    report += '  ESTATÍSTICAS GERAIS\n';
    report += '═══════════════════════════════════════════════════════\n\n';

    if (totalComparisons > 0) {
      const avgError = totalErrors.reduce((a, b) => a + b, 0) / totalErrors.length;
      const maxError = Math.max(...totalErrors);
      const minError = Math.min(...totalErrors);

      const excellent = totalErrors.filter(e => e <= 10).length;
      const good = totalErrors.filter(e => e > 10 && e <= 25).length;
      const fair = totalErrors.filter(e => e > 25 && e <= 50).length;
      const poor = totalErrors.filter(e => e > 50).length;

      report += `📊 Comparações realizadas: ${totalComparisons}\n`;
      report += `\n`;
      report += `Erro médio: ${avgError.toFixed(1)}%\n`;
      report += `Erro mínimo: ${minError.toFixed(1)}%\n`;
      report += `Erro máximo: ${maxError.toFixed(1)}%\n`;
      report += `\n`;
      report += `Precisão por Faixa:\n`;
      report += `  ✅ Excelente (≤10%): ${excellent} (${(excellent/totalComparisons*100).toFixed(1)}%)\n`;
      report += `  ✅ Bom (10-25%): ${good} (${(good/totalComparisons*100).toFixed(1)}%)\n`;
      report += `  ⚠️  Regular (25-50%): ${fair} (${(fair/totalComparisons*100).toFixed(1)}%)\n`;
      report += `  ❌ Ruim (>50%): ${poor} (${(poor/totalComparisons*100).toFixed(1)}%)\n`;
      report += `\n`;

      // Receitas com maior erro médio
      report += `Receitas com Maior Erro Médio:\n`;
      const recipeAvgErrors = Object.entries(recipeErrors)
        .map(([name, errors]) => ({
          name,
          avgError: errors.reduce((a, b) => a + b, 0) / errors.length,
          count: errors.length
        }))
        .sort((a, b) => b.avgError - a.avgError)
        .slice(0, 10);

      recipeAvgErrors.forEach((recipe, idx) => {
        report += `  ${idx + 1}. ${recipe.name}: ${recipe.avgError.toFixed(1)}% (${recipe.count} comparações)\n`;
      });
    } else {
      report += '❌ Nenhuma comparação realizada!\n';
      report += '   Motivo: Não há pedidos suficientes ou sem histórico.\n';
    }

    report += '\n';
    report += '═══════════════════════════════════════════════════════\n';

    // Salvar
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `validation-suggestions-${customerId}-${timestamp}.txt`;
    fs.writeFileSync(filename, report);

    console.log(`\n✅ Validação salva em: ${filename}`);
    console.log('\n───────────────────────────────────────────────────────');
    console.log(report);
    console.log('───────────────────────────────────────────────────────\n');

  } catch (error) {
    console.error('\n❌ Erro na validação:', error);
    console.error('\nStack:', error.stack);
  }
}

// Executar
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('❌ Uso: node lib/validate-suggestions.js <customer_id>');
  console.log('\nExemplo:');
  console.log('  node lib/validate-suggestions.js fvewfgqwefgrewg');
  process.exit(1);
}

const customerId = args[0];
validateSuggestions(customerId).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
