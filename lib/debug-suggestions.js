/**
 * Script de Debug para Análise de Sugestões
 *
 * Este script analisa o histórico de pedidos de um cliente e mostra:
 * - Todos os pedidos históricos
 * - Cálculos intermediários (médias, ratios)
 * - Sugestões geradas
 * - Comparação entre sugestão e valores reais
 *
 * Uso:
 * node lib/debug-suggestions.js <customer_id>
 */

import { OrderSuggestionManager } from './order-suggestions.js';
import { Order } from '../app/api/entities.js';
import fs from 'fs';

/**
 * Gera relatório detalhado de sugestões para um cliente
 */
async function analyzeSuggestions(customerId, mealsExpected = 100) {
  console.log(`\n🔍 Analisando sugestões para cliente: ${customerId}`);
  console.log(`   Refeições esperadas: ${mealsExpected}\n`);

  let report = '';
  report += '═══════════════════════════════════════════════════════\n';
  report += '  ANÁLISE DETALHADA DE SUGESTÕES DE PEDIDOS\n';
  report += '═══════════════════════════════════════════════════════\n\n';
  report += `Cliente ID: ${customerId}\n`;
  report += `Refeições Esperadas: ${mealsExpected}\n`;
  report += `Data da Análise: ${new Date().toISOString()}\n`;
  report += `\n`;

  try {
    // 1. Carregar histórico
    report += '───────────────────────────────────────────────────────\n';
    report += '1. CARREGANDO HISTÓRICO DE PEDIDOS\n';
    report += '───────────────────────────────────────────────────────\n\n';

    const historicalOrders = await OrderSuggestionManager.loadHistoricalOrders(customerId, 8);

    if (historicalOrders.length === 0) {
      report += '❌ Nenhum pedido histórico encontrado!\n';
      return report;
    }

    report += `✅ Encontrados ${historicalOrders.length} pedidos históricos\n\n`;

    // Mostrar resumo dos pedidos
    historicalOrders.forEach((order, idx) => {
      report += `Pedido ${idx + 1}:\n`;
      report += `  - Data: ${order.date || 'N/A'}\n`;
      report += `  - Semana: ${order.week_number}/${order.year}\n`;
      report += `  - Dia: ${order.day_of_week}\n`;
      report += `  - Refeições: ${order.total_meals_expected || 0}\n`;
      report += `  - Itens: ${order.items?.length || 0}\n\n`;
    });

    // 2. Analisar padrões de consumo
    report += '───────────────────────────────────────────────────────\n';
    report += '2. ANÁLISE DE PADRÕES DE CONSUMO\n';
    report += '───────────────────────────────────────────────────────\n\n';

    const consumptionPatterns = OrderSuggestionManager.analyzeConsumptionPatterns(historicalOrders);
    const recipeCount = Object.keys(consumptionPatterns).length;

    report += `✅ ${recipeCount} receitas analisadas\n\n`;

    // 3. Detalhamento por receita
    report += '───────────────────────────────────────────────────────\n';
    report += '3. DETALHAMENTO POR RECEITA\n';
    report += '───────────────────────────────────────────────────────\n\n';

    Object.entries(consumptionPatterns).forEach(([recipeId, analysis]) => {
      const stats = analysis.statistics;

      report += `━━━ ${analysis.recipe_name} ━━━\n`;
      report += `Recipe ID: ${recipeId}\n`;
      report += `Categoria: ${analysis.category}\n`;
      report += `Unidade: ${analysis.unit_type}\n`;
      report += `\n`;

      // Histórico de amostras
      report += `Amostras (${analysis.samples.length} total, ${stats.recent_samples} recentes):\n`;
      analysis.samples.forEach((sample, idx) => {
        report += `  ${idx + 1}. Semana ${sample.week_number}/${sample.year} (${sample.date || 'N/A'})\n`;
        report += `     - Base Quantity: ${sample.base_quantity}\n`;
        report += `     - Adjustment: ${sample.adjustment_percentage}%\n`;
        report += `     - Final Quantity: ${sample.final_quantity}\n`;
        report += `     - Refeições: ${sample.meals_expected}\n`;
        report += `     - Ratio/Refeição: ${sample.ratio_per_meal.toFixed(4)}\n`;
      });
      report += `\n`;

      // Estatísticas
      report += `Estatísticas Calculadas:\n`;
      report += `  - Média Base Quantity: ${stats.avg_base_quantity}\n`;
      report += `  - Média Adjustment %: ${stats.avg_adjustment_percentage}\n`;
      report += `  - Média Ratio/Refeição: ${stats.avg_ratio_per_meal.toFixed(4)}\n`;
      report += `  - Confiança: ${(stats.confidence * 100).toFixed(0)}%\n`;
      report += `\n`;

      // Cálculo da sugestão
      const suggestedQty = stats.avg_ratio_per_meal * mealsExpected;
      const roundedQty = OrderSuggestionManager.roundToPracticalValue(suggestedQty, analysis.unit_type);

      report += `Cálculo da Sugestão (para ${mealsExpected} refeições):\n`;
      report += `  1. Calculado: ${stats.avg_ratio_per_meal.toFixed(4)} × ${mealsExpected} = ${suggestedQty.toFixed(4)}\n`;
      report += `  2. Arredondado: ${roundedQty}\n`;

      // Validação de sanidade
      if (stats.avg_base_quantity > 0 && suggestedQty > 0) {
        const ratio = roundedQty / stats.avg_base_quantity;
        report += `  3. Validação: ${roundedQty} / ${stats.avg_base_quantity} = ${ratio.toFixed(2)}\n`;
        if (ratio < 0.4) {
          report += `     ⚠️  Muito baixo (< 40%) → Usar média: ${stats.avg_base_quantity}\n`;
        } else if (ratio > 2.5) {
          report += `     ⚠️  Muito alto (> 250%) → Usar média: ${stats.avg_base_quantity}\n`;
        } else {
          report += `     ✅ Dentro do esperado (40%-250%)\n`;
        }
      }

      report += `\n`;
      report += `╰─ Sugestão Final: ${roundedQty} ${analysis.unit_type}\n`;
      report += `\n\n`;
    });

    // 4. Resumo Final
    report += '───────────────────────────────────────────────────────\n';
    report += '4. RESUMO FINAL\n';
    report += '───────────────────────────────────────────────────────\n\n';

    const highConfidence = Object.values(consumptionPatterns).filter(
      p => p.statistics.confidence >= 0.7
    ).length;

    const lowConfidence = Object.values(consumptionPatterns).filter(
      p => p.statistics.confidence < 0.25
    ).length;

    report += `📊 Estatísticas Gerais:\n`;
    report += `   - Total de receitas: ${recipeCount}\n`;
    report += `   - Alta confiança (≥70%): ${highConfidence}\n`;
    report += `   - Baixa confiança (<25%): ${lowConfidence}\n`;
    report += `   - Pedidos analisados: ${historicalOrders.length}\n`;
    report += `   - Período: últimas 8 semanas\n`;
    report += `\n`;

    // Receitas com problemas
    const problematicRecipes = Object.entries(consumptionPatterns)
      .filter(([_, analysis]) => {
        const stats = analysis.statistics;
        const suggestedQty = stats.avg_ratio_per_meal * mealsExpected;
        const roundedQty = OrderSuggestionManager.roundToPracticalValue(suggestedQty, analysis.unit_type);
        const ratio = stats.avg_base_quantity > 0 ? roundedQty / stats.avg_base_quantity : 0;
        return ratio < 0.4 || ratio > 2.5 || stats.confidence < 0.25;
      });

    if (problematicRecipes.length > 0) {
      report += `\n⚠️  Receitas com Possíveis Problemas:\n`;
      problematicRecipes.forEach(([recipeId, analysis]) => {
        const stats = analysis.statistics;
        const reason = stats.confidence < 0.25 ? 'Baixa confiança' : 'Sugestão fora do range';
        report += `   - ${analysis.recipe_name}: ${reason}\n`;
      });
      report += `\n`;
    }

    report += '═══════════════════════════════════════════════════════\n';
    report += '  FIM DA ANÁLISE\n';
    report += '═══════════════════════════════════════════════════════\n';

    return report;

  } catch (error) {
    report += `\n❌ ERRO: ${error.message}\n`;
    report += `\nStack trace:\n${error.stack}\n`;
    return report;
  }
}

/**
 * Função principal
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('❌ Uso: node lib/debug-suggestions.js <customer_id> [meals_expected]');
    console.log('\nExemplo:');
    console.log('  node lib/debug-suggestions.js abc123 100');
    process.exit(1);
  }

  const customerId = args[0];
  const mealsExpected = args[1] ? parseInt(args[1]) : 100;

  const report = await analyzeSuggestions(customerId, mealsExpected);

  // Salvar em arquivo
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `suggestion-analysis-${customerId}-${timestamp}.txt`;

  fs.writeFileSync(filename, report);

  console.log(`\n✅ Análise completa salva em: ${filename}\n`);
  console.log('───────────────────────────────────────────────────────');
  console.log(report);
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

export { analyzeSuggestions };
