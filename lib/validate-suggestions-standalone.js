/**
 * Valida Precisão das Sugestões - Versão Standalone
 *
 * Compara sugestões geradas vs pedidos reais
 * SEM dependências do projeto
 */

import fs from 'fs';

// Ler dados exportados
const allOrders = JSON.parse(fs.readFileSync('export-orders-simple-2025-10-22T22-28-50.json', 'utf8'));

/**
 * Parse quantity
 */
function parseQuantity(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const cleanedValue = value.toString().trim().replace(',', '.');
  const parsed = parseFloat(cleanedValue);
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
}

/**
 * Arredondar para múltiplos de 0.25
 */
function roundToPracticalValue(value, unitType) {
  if (value === 0) return 0;
  const unit = (unitType || '').toLowerCase();

  if (unit.includes('kg')) {
    return Math.round(value * 100) / 100;
  } else if (unit.includes('cuba') || unit.includes('unid')) {
    if (value < 0.05) return 0; // Reduzido de 0.125
    return Math.round(value * 4) / 4;
  } else {
    if (value < 0.05) return 0;
    return Math.round(value * 10) / 10;
  }
}

/**
 * Calcula mediana
 */
function median(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  const validNumbers = numbers.filter(n => typeof n === 'number' && !isNaN(n)).sort((a, b) => a - b);
  if (validNumbers.length === 0) return 0;
  
  const mid = Math.floor(validNumbers.length / 2);
  if (validNumbers.length % 2 !== 0) {
    return validNumbers[mid];
  } else {
    return (validNumbers[mid - 1] + validNumbers[mid]) / 2;
  }
}

/**
 * Calcula média
 */
function average(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  const validNumbers = numbers.filter(n => typeof n === 'number' && !isNaN(n));
  if (validNumbers.length === 0) return 0;
  return validNumbers.reduce((sum, n) => sum + n, 0) / validNumbers.length;
}

/**
 * Analisa padrões de consumo
 */
function analyzeConsumptionPatterns(historicalOrders) {
  const recipeAnalysis = {};

  historicalOrders.forEach(order => {
    const mealsExpected = order.total_meals_expected || 0;
    if (mealsExpected === 0) return;

    order.items?.forEach(item => {
      const recipeId = item.recipe_id;
      const baseQuantity = parseQuantity(item.base_quantity) || 0;
      const quantity = parseQuantity(item.quantity) || 0;

      if (!recipeAnalysis[recipeId]) {
        recipeAnalysis[recipeId] = {
          recipe_id: recipeId,
          recipe_name: item.recipe_name,
          category: item.category,
          unit_type: item.unit_type,
          samples: []
        };
      }

      recipeAnalysis[recipeId].samples.push({
        base_quantity: baseQuantity,
        final_quantity: quantity,
        meals_expected: mealsExpected,
        ratio_per_meal: quantity / mealsExpected,
        date: order.date,
        week_number: order.week_number,
        year: order.year
      });
    });
  });

  // Calcular estatísticas
  Object.keys(recipeAnalysis).forEach(recipeId => {
    const analysis = recipeAnalysis[recipeId];
    const samples = analysis.samples;

    // Ordenar por data
    samples.sort((a, b) => {
      const dateA = new Date(a.date || '1970-01-01');
      const dateB = new Date(b.date || '1970-01-01');
      return dateB - dateA;
    });

    const recentSamples = samples.slice(0, Math.min(8, samples.length));
    const targetSamples = recentSamples.length > 0 ? recentSamples : samples;

    const medianBaseQuantity = median(targetSamples.map(s => s.base_quantity));
    const medianRatioPerMeal = median(targetSamples.map(s => s.ratio_per_meal));
    const avgBaseQuantity = average(samples.map(s => s.base_quantity));
    const confidence = Math.min(samples.length / 4, 1);

    analysis.statistics = {
      median_base_quantity: Math.round(medianBaseQuantity * 100) / 100,
      median_ratio_per_meal: Math.round(medianRatioPerMeal * 10000) / 10000,
      avg_base_quantity: Math.round(avgBaseQuantity * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      total_samples: samples.length,
      recent_samples: recentSamples.length
    };
  });

  return recipeAnalysis;
}

/**
 * Valida sugestões
 */
function validateSuggestions(customerId) {
  console.log(`\n🔍 Validando sugestões para cliente: ${customerId}\n`);

  let report = '';
  report += '═══════════════════════════════════════════════════════\n';
  report += '  VALIDAÇÃO DE PRECISÃO DAS SUGESTÕES\n';
  report += '═══════════════════════════════════════════════════════\n\n';

  // Filtrar pedidos do cliente
  const customerOrders = allOrders.filter(o => o.customer_id === customerId);

  if (customerOrders.length === 0) {
    console.log('❌ Nenhum pedido encontrado!');
    return;
  }

  const customerName = customerOrders[0].customer_name;
  report += `Cliente: ${customerName} (${customerId})\n`;
  report += `Total de pedidos: ${customerOrders.length}\n\n`;

  // Ordenar
  customerOrders.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.week_number !== b.week_number) return a.week_number - b.week_number;
    return a.day_of_week - b.day_of_week;
  });

  let totalComparisons = 0;
  let totalErrors = [];
  const recipeErrors = {};

  report += '───────────────────────────────────────────────────────\n';
  report += 'ANÁLISE PEDIDO POR PEDIDO\n';
  report += '───────────────────────────────────────────────────────\n\n';

  // Para cada pedido
  for (let i = 4; i < customerOrders.length; i++) {
    const testOrder = customerOrders[i];

    // ✅ FILTRAR PEDIDOS HISTÓRICOS PELO MESMO DIA DA SEMANA
    // Pegar últimos pedidos ANTES deste
    const previousOrders = customerOrders.slice(Math.max(0, i - 40), i); // Buscar mais para ter histórico suficiente

    // Filtrar apenas pedidos do MESMO dia da semana
    const historicalOrders = previousOrders
      .filter(order => order.day_of_week === testOrder.day_of_week)
      .slice(-12); // Pegar até 12 mais recentes do mesmo dia

    if (historicalOrders.length < 2) continue;

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayName = dayNames[testOrder.day_of_week] || testOrder.day_of_week;

    report += `\n${'━'.repeat(55)}\n`;
    report += `Pedido de Teste #${i + 1}:\n`;
    report += `  Data: ${testOrder.date}\n`;
    report += `  Semana ${testOrder.week_number}/${testOrder.year} - ${dayName} (dia ${testOrder.day_of_week})\n`;
    report += `  Refeições: ${testOrder.total_meals_expected}\n`;
    report += `  Baseado em: ${historicalOrders.length} pedidos de ${dayName} anteriores\n`;
    report += `${'━'.repeat(55)}\n\n`;

    const consumptionPatterns = analyzeConsumptionPatterns(historicalOrders);

    // Mapa de itens reais
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

    // Para cada receita com sugestão
    Object.entries(consumptionPatterns).forEach(([recipeId, analysis]) => {
      const stats = analysis.statistics;

      if (stats.confidence < 0.25) return;

      const mealsExpected = testOrder.total_meals_expected || 100;
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

      suggestedQty = roundToPracticalValue(suggestedQty, analysis.unit_type);

      const actualItem = actualItemsMap[recipeId];

      if (actualItem) {
        const actualQty = actualItem.base_quantity || actualItem.quantity;
        
        let error, errorAbs;
        const isSmallItem = (actualItem.unit_type && actualItem.unit_type.toLowerCase().includes('cuba') && actualQty < 1.0);

        if (isSmallItem && actualQty > 0) {
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

        let status = '✅';
        if (errorAbs > 50) status = '❌';
        else if (errorAbs > 25) status = '⚠️';

        report += `${status} ${analysis.recipe_name}:\n`;
        report += `     Sugerido: ${suggestedQty} ${analysis.unit_type}\n`;
        report += `     Real: ${actualQty} ${analysis.unit_type}\n`;
        report += `     Erro: ${error > 0 ? '+' : ''}${error.toFixed(1)}%${isSmallItem ? ' (abs)' : ''}\n`;
        report += `     Confiança: ${(stats.confidence * 100).toFixed(0)}% (${stats.total_samples} amostras)\n\n`;
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

    report += `📊 Comparações realizadas: ${totalComparisons}\n\n`;
    report += `Erro médio: ${avgError.toFixed(1)}%\n`;
    report += `Erro mínimo: ${minError.toFixed(1)}%\n`;
    report += `Erro máximo: ${maxError.toFixed(1)}%\n\n`;
    report += `Precisão por Faixa:\n`;
    report += `  ✅ Excelente (≤10%): ${excellent} (${(excellent/totalComparisons*100).toFixed(1)}%)\n`;
    report += `  ✅ Bom (10-25%): ${good} (${(good/totalComparisons*100).toFixed(1)}%)\n`;
    report += `  ⚠️  Regular (25-50%): ${fair} (${(fair/totalComparisons*100).toFixed(1)}%)\n`;
    report += `  ❌ Ruim (>50%): ${poor} (${(poor/totalComparisons*100).toFixed(1)}%)\n\n`;

    // Top 10 piores
    const recipeAvgErrors = Object.entries(recipeErrors)
      .map(([name, errors]) => ({
        name,
        avgError: errors.reduce((a, b) => a + b, 0) / errors.length,
        count: errors.length
      }))
      .sort((a, b) => b.avgError - a.avgError)
      .slice(0, 10);

    report += `Top 10 Receitas com Maior Erro:\n`;
    recipeAvgErrors.forEach((recipe, idx) => {
      report += `  ${idx + 1}. ${recipe.name}: ${recipe.avgError.toFixed(1)}% (${recipe.count}x)\n`;
    });
  } else {
    report += '❌ Nenhuma comparação realizada!\n';
  }

  report += '\n═══════════════════════════════════════════════════════\n';

  // Salvar
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `validation-${customerName}-${timestamp}.txt`;
  fs.writeFileSync(filename, report);

  console.log(`\n✅ Validação salva em: ${filename}\n`);
  console.log(report);
}

// Executar
const customerId = process.argv[2] || 'fvewfgqwefgrewg';
validateSuggestions(customerId);
