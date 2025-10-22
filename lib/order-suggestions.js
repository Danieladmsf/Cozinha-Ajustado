/**
 * Sistema de Gestão de Sugestões de Pedidos
 * 
 * Este sistema analisa pedidos históricos e fornece sugestões inteligentes
 * para preenchimento automático dos campos de quantidade baseado em padrões
 * de consumo anteriores.
 * 
 * Funcionalidades:
 * - Análise de pedidos históricos por cliente
 * - Cálculo de média de consumo por receita
 * - Sugestões baseadas em refeições esperadas
 * - Priorização por recência dos pedidos
 * - Suporte para diferentes tipos de categoria (especialmente categoria carne)
 */

import { Order } from '@/app/api/entities';
import { CategoryLogic } from '@/components/utils/categoryLogic';
import { parseQuantity } from '@/components/utils/orderUtils';

export class OrderSuggestionManager {
  
  /**
   * Carrega histórico de pedidos para análise
   * @param {string} customerId - ID do cliente
   * @param {number} lookbackWeeks - Quantas semanas analisar (padrão: 8)
   * @param {number} dayOfWeek - Dia da semana (1=Segunda, 2=Terça, ..., 5=Sexta) - OPCIONAL
   * @returns {Promise<Array>} Array de pedidos históricos
   */
  static async loadHistoricalOrders(customerId, lookbackWeeks = 8, dayOfWeek = null) {
    try {
      // Calcular período de análise
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentWeek = this.getWeekNumber(currentDate);

      const orders = [];

      // Buscar pedidos das últimas N semanas
      for (let weeksAgo = 1; weeksAgo <= lookbackWeeks; weeksAgo++) {
        let targetYear = currentYear;
        let targetWeek = currentWeek - weeksAgo;

        // Ajustar para ano anterior se necessário
        if (targetWeek <= 0) {
          targetYear--;
          targetWeek = 52 + targetWeek; // Assumindo 52 semanas por ano
        }

        // ✅ FILTRO POR DIA DA SEMANA
        // Construir array de filtros base
        const queryFilters = [
          { field: 'customer_id', operator: '==', value: customerId },
          { field: 'week_number', operator: '==', value: targetWeek },
          { field: 'year', operator: '==', value: targetYear }
        ];

        // Adicionar filtro de dia se fornecido
        if (dayOfWeek !== null && dayOfWeek !== undefined) {
          queryFilters.push({ field: 'day_of_week', operator: '==', value: dayOfWeek });
        }

        const weekOrders = await Order.query(queryFilters);

        orders.push(...weekOrders);
      }

      return orders;
    } catch (error) {
      return [];
    }
  }

  /**
   * Analisa padrões de consumo baseado no histórico
   * @param {Array} historicalOrders - Pedidos históricos
   * @returns {Object} Mapa de análises por receita
   */
  static analyzeConsumptionPatterns(historicalOrders) {
    const recipeAnalysis = {};
    
    historicalOrders.forEach(order => {
      const mealsExpected = order.total_meals_expected || 0;
      
      if (mealsExpected === 0) return; // Pular pedidos sem refeições informadas
      
      order.items?.forEach(item => {
        const recipeId = item.recipe_id;
        const baseQuantity = parseQuantity(item.base_quantity) || 0;
        const adjustmentPercentage = parseQuantity(item.adjustment_percentage) || 0;
        const quantity = parseQuantity(item.quantity) || 0;
        
        if (!recipeAnalysis[recipeId]) {
          recipeAnalysis[recipeId] = {
            recipe_id: recipeId,
            recipe_name: item.recipe_name,
            category: item.category,
            unit_type: item.unit_type,
            samples: [],
            statistics: null
          };
        }
        
        // Adicionar amostra com contexto
        recipeAnalysis[recipeId].samples.push({
          base_quantity: baseQuantity,
          adjustment_percentage: adjustmentPercentage,
          final_quantity: quantity,
          meals_expected: mealsExpected,
          // ✅ CORREÇÃO: Usar quantity (quantidade final) ao invés de base_quantity
          // Isso garante que ajustes de porcionamento sejam considerados
          ratio_per_meal: quantity / mealsExpected, // Ratio da quantidade FINAL por refeição
          date: order.date,
          week_number: order.week_number,
          year: order.year,
          day_of_week: order.day_of_week
        });
      });
    });
    
    // Calcular estatísticas para cada receita
    Object.keys(recipeAnalysis).forEach(recipeId => {
      const analysis = recipeAnalysis[recipeId];
      analysis.statistics = this.calculateRecipeStatistics(analysis.samples);
    });
    
    return recipeAnalysis;
  }

  /**
   * Calcula estatísticas para uma receita específica
   * @param {Array} samples - Amostras de pedidos para a receita
   * @returns {Object} Estatísticas calculadas
   */
  static calculateRecipeStatistics(samples) {
    if (samples.length === 0) {
      return {
        median_base_quantity: 0,
        median_adjustment_percentage: 0,
        median_ratio_per_meal: 0,
        avg_base_quantity: 0,
        confidence: 0,
        total_samples: 0,
        recent_samples: 0
      };
    }

    // Ordenar por data (mais recentes primeiro)
    const sortedSamples = samples.sort((a, b) => {
      const dateA = new Date(a.date || '1970-01-01');
      const dateB = new Date(b.date || '1970-01-01');
      return dateB - dateA;
    });

    // Usar até 8 amostras recentes para basear a sugestão
    const recentSamples = sortedSamples.slice(0, Math.min(8, samples.length));

    // ✅ MUDANÇA: Usar mediana para ser robusto a outliers.
    // A mediana é calculada sobre as amostras recentes para priorizar dados novos.
    const targetSamples = recentSamples.length > 0 ? recentSamples : sortedSamples;

    const medianBaseQuantity = this.median(targetSamples.map(s => s.base_quantity));
    const medianAdjustmentPercentage = this.median(targetSamples.map(s => s.adjustment_percentage));
    const medianRatioPerMeal = this.median(targetSamples.map(s => s.ratio_per_meal));
    
    // Manter a média para fallback e comparações
    const avgBaseQuantity = this.average(samples.map(s => s.base_quantity));

    // Calcular nível de confiança baseado no número de amostras
    const confidence = Math.min(samples.length / 4, 1); // Máxima confiança com 4+ amostras

    return {
      median_base_quantity: Math.round(medianBaseQuantity * 100) / 100,
      median_adjustment_percentage: Math.round(medianAdjustmentPercentage * 100) / 100,
      median_ratio_per_meal: Math.round(medianRatioPerMeal * 10000) / 10000, // Mais precisão para ratios
      avg_base_quantity: Math.round(avgBaseQuantity * 100) / 100, // Manter média para fallback
      confidence: Math.round(confidence * 100) / 100,
      total_samples: samples.length,
      recent_samples: recentSamples.length
    };
  }

  /**
   * Gera sugestões de quantidade para um conjunto de itens
   * @param {Array} orderItems - Itens do pedido atual
   * @param {number} mealsExpected - Número de refeições esperadas
   * @param {Object} consumptionPatterns - Padrões de consumo analisados
   * @returns {Array} Itens com sugestões aplicadas
   */
  static generateSuggestions(orderItems, mealsExpected, consumptionPatterns) {
    if (!mealsExpected || mealsExpected <= 0) {
      return orderItems; // Não gerar sugestões sem refeições esperadas
    }

    return orderItems.map(item => {
      const recipeAnalysis = consumptionPatterns[item.recipe_id];
      
      // Se não há dados históricos, manter item original
      if (!recipeAnalysis || recipeAnalysis.statistics.confidence < 0.25) {
        return {
          ...item,
          suggestion: {
            has_suggestion: false,
            reason: recipeAnalysis ? 'baixa_confianca' : 'sem_historico',
            confidence: recipeAnalysis?.statistics?.confidence || 0
          }
        };
      }

      const stats = recipeAnalysis.statistics;
      const isCarneCategory = CategoryLogic.isCarneCategory(item.category);

      // ✅ ESTRATÉGIA 1: Usar ratio da MEDIANA por refeição (mais robusto)
      let suggestedBaseQuantity = stats.median_ratio_per_meal * mealsExpected;
      let source = 'median_ratio_per_meal';

      // ✅ ESTRATÉGIA 2: Fallback para MEDIANA da quantidade base se:
      // - Ratio gerar valor muito baixo (< 0.1)
      if (suggestedBaseQuantity < 0.1 && stats.median_base_quantity > 0) {
        suggestedBaseQuantity = stats.median_base_quantity;
        source = 'median_quantity';
      }

      // ✅ ESTRATÉGIA 3: Validação de sanidade - se sugestão for muito diferente da MÉDIA histórica
      // A média ainda é útil para detectar desvios extremos.
      if (stats.avg_base_quantity > 0 && suggestedBaseQuantity > 0) {
        const ratio = suggestedBaseQuantity / stats.avg_base_quantity;
        // Se a sugestão for menos de 40% ou mais de 250% da média histórica, usar a MEDIANA da quantidade.
        if (ratio < 0.4 || ratio > 2.5) {
          suggestedBaseQuantity = stats.median_base_quantity;
          source = 'median_quantity_after_sanity_check';
        }
      }

      // ✅ CORREÇÃO: Não sugerir 0 para itens com histórico de consumo.
      // Se a sugestão for muito pequena, mas o item costuma ser pedido, sugerir uma quantidade mínima.
      if (suggestedBaseQuantity < 0.125 && stats.avg_base_quantity > 0) {
        suggestedBaseQuantity = 0.25; // Mínimo razoável
        source = 'min_quantity_instead_of_zero';
      }

      // Arredondar para valores práticos
      suggestedBaseQuantity = this.roundToPracticalValue(suggestedBaseQuantity, item.unit_type);

      const suggestedAdjustmentPercentage = isCarneCategory ? 
        Math.round(stats.median_adjustment_percentage) : 0;

      // Aplicar lógica de categoria para calcular quantidade final
      const suggestedItem = CategoryLogic.calculateItemValues(
        { ...item, base_quantity: suggestedBaseQuantity, adjustment_percentage: suggestedAdjustmentPercentage },
        'base_quantity',
        suggestedBaseQuantity,
        mealsExpected
      );

      return {
        ...suggestedItem,
        suggestion: {
          has_suggestion: true,
          confidence: stats.confidence,
          based_on_samples: stats.total_samples,
          recent_samples: stats.recent_samples,
          suggested_base_quantity: suggestedBaseQuantity,
          suggested_adjustment_percentage: suggestedAdjustmentPercentage,
          meals_expected: mealsExpected, // *** ADICIONADO: Passar refeições esperadas ***
          source: source
        }
      };
    });
  }

  /**
   * Aplica sugestões em um pedido, mantendo valores já preenchidos
   * Esta é uma versão "soft" que só preenche campos vazios
   * @param {Array} orderItems - Itens do pedido
   * @param {Array} suggestedItems - Itens com sugestões
   * @param {number} currentMealsExpected - Refeições esperadas atuais
   * @returns {Array} Itens com sugestões aplicadas apenas em campos vazios
   */
  static applySuggestionsToEmptyFields(orderItems, suggestedItems, currentMealsExpected = null) {
    return orderItems.map((originalItem, index) => {
      const suggestedItem = suggestedItems[index];
      
      if (!suggestedItem?.suggestion?.has_suggestion) {
        return originalItem;
      }

      const suggestionMealsExpected = suggestedItem.suggestion.meals_expected || 0;
      const targetMealsExpected = currentMealsExpected || suggestionMealsExpected;
      const updatedItem = { ...originalItem };

      // ✅ CONDIÇÃO 1: Aplicar apenas se campo estiver vazio ou zero
      const currentBaseQuantity = parseQuantity(originalItem.base_quantity) || 0;
      const currentAdjustmentPercentage = parseQuantity(originalItem.adjustment_percentage) || 0;

      if (currentBaseQuantity === 0) {
        // Calcular quantidade escalada se necessário
        let scaledBaseQuantity = suggestedItem.suggestion.suggested_base_quantity;
        
        if (suggestionMealsExpected > 0 && targetMealsExpected !== suggestionMealsExpected) {
          const scalingRatio = targetMealsExpected / suggestionMealsExpected;
          scaledBaseQuantity = suggestedItem.suggestion.suggested_base_quantity * scalingRatio;
          scaledBaseQuantity = this.roundToPracticalValue(scaledBaseQuantity, originalItem.unit_type);
        }
        
        updatedItem.base_quantity = scaledBaseQuantity;
      }

      if (CategoryLogic.isCarneCategory(originalItem.category) && currentAdjustmentPercentage === 0) {
        updatedItem.adjustment_percentage = suggestedItem.suggestion.suggested_adjustment_percentage;
      }

      // ✅ CONDIÇÃO 2: Recalcular valores dependentes usando CategoryLogic  
      const recalculatedItem = CategoryLogic.calculateItemValues(
        updatedItem,
        'base_quantity',
        updatedItem.base_quantity,
        targetMealsExpected
      );

      // Preservar informações da sugestão para feedback ao usuário
      recalculatedItem.suggestion = {
        ...suggestedItem.suggestion,
        meals_expected: targetMealsExpected,
        scaled_from: suggestionMealsExpected !== targetMealsExpected ? suggestionMealsExpected : null,
        scaling_ratio: suggestionMealsExpected !== targetMealsExpected ? (targetMealsExpected / suggestionMealsExpected) : null
      };

      return recalculatedItem;
    });
  }

  /**
   * Versão "hard" que substitui todos os valores com sugestões
   * @param {Array} orderItems - Itens do pedido  
   * @param {Array} suggestedItems - Itens com sugestões
   * @param {number} currentMealsExpected - Refeições esperadas atuais
   * @returns {Array} Itens com todas as sugestões aplicadas
   */
  static applyAllSuggestions(orderItems, suggestedItems, currentMealsExpected = null) {
    return suggestedItems.map((suggestedItem, index) => {
      const originalItem = orderItems[index];
      
      if (!suggestedItem.suggestion?.has_suggestion) {
        return originalItem; // Manter item original se não há sugestão
      }

      const suggestionMealsExpected = suggestedItem.suggestion.meals_expected || 0;
      const targetMealsExpected = currentMealsExpected || suggestionMealsExpected;
      
      // ✅ CALCULAR PROPORÇÃO SE DIFERENTES
      let scaledBaseQuantity = suggestedItem.suggestion.suggested_base_quantity;
      
      if (suggestionMealsExpected > 0 && targetMealsExpected !== suggestionMealsExpected) {
        const scalingRatio = targetMealsExpected / suggestionMealsExpected;
        scaledBaseQuantity = suggestedItem.suggestion.suggested_base_quantity * scalingRatio;
        scaledBaseQuantity = this.roundToPracticalValue(scaledBaseQuantity, originalItem.unit_type);
      }

      // Aplicar os valores sugeridos (já escalados se necessário)
      const updatedItem = {
        ...originalItem,
        base_quantity: scaledBaseQuantity,
        adjustment_percentage: suggestedItem.suggestion.suggested_adjustment_percentage || 0
      };
      
      // Recalcular valores dependentes usando CategoryLogic
      const recalculatedItem = CategoryLogic.calculateItemValues(
        updatedItem,
        'base_quantity',
        updatedItem.base_quantity,
        targetMealsExpected
      );
      
      // Preservar informações da sugestão (atualizadas)
      recalculatedItem.suggestion = {
        ...suggestedItem.suggestion,
        meals_expected: targetMealsExpected,
        scaled_from: suggestionMealsExpected !== targetMealsExpected ? suggestionMealsExpected : null,
        scaling_ratio: suggestionMealsExpected !== targetMealsExpected ? (targetMealsExpected / suggestionMealsExpected) : null
      };
      
      return recalculatedItem;
    });
  }

  /**
   * Pipeline completo de sugestões
   * @param {string} customerId - ID do cliente
   * @param {Array} currentOrderItems - Itens do pedido atual
   * @param {number} mealsExpected - Refeições esperadas
   * @param {Object} options - Opções de configuração
   * @returns {Promise<Object>} Resultado com itens sugeridos e metadados
   */
  static async generateOrderSuggestions(customerId, currentOrderItems, mealsExpected, options = {}) {
    const {
      lookbackWeeks = 12,
      applyToEmptyOnly = true,
      minConfidence = 0.25,
      dayOfWeek = null // ✅ NOVO: Dia da semana para filtrar histórico
    } = options;

    try {
      // 1. Carregar histórico (COM FILTRO DE DIA DA SEMANA)
      const historicalOrders = await this.loadHistoricalOrders(customerId, lookbackWeeks, dayOfWeek);

      if (historicalOrders.length === 0) {
        return {
          success: true,
          items: currentOrderItems,
          metadata: {
            historical_orders: 0,
            suggestions_applied: 0,
            day_of_week: dayOfWeek,
            message: dayOfWeek
              ? `Nenhum histórico encontrado para o dia ${dayOfWeek}`
              : 'Nenhum histórico encontrado para análise'
          }
        };
      }

      // 2. Analisar padrões
      const consumptionPatterns = this.analyzeConsumptionPatterns(historicalOrders);

      // 3. Gerar sugestões
      const suggestedItems = this.generateSuggestions(currentOrderItems, mealsExpected, consumptionPatterns);

      // 4. Aplicar sugestões conforme configuração
      const finalItems = applyToEmptyOnly
        ? this.applySuggestionsToEmptyFields(currentOrderItems, suggestedItems, mealsExpected)
        : this.applyAllSuggestions(currentOrderItems, suggestedItems, mealsExpected);

      // 5. Calcular estatísticas
      const suggestionsApplied = finalItems.filter(item => item.suggestion?.has_suggestion).length;
      const highConfidenceSuggestions = finalItems.filter(item =>
        item.suggestion?.has_suggestion && item.suggestion.confidence >= 0.7
      ).length;

      return {
        success: true,
        items: finalItems,
        metadata: {
          historical_orders: historicalOrders.length,
          suggestions_applied: suggestionsApplied,
          high_confidence_suggestions: highConfidenceSuggestions,
          lookback_weeks: lookbackWeeks,
          day_of_week: dayOfWeek,
          recipes_analyzed: Object.keys(consumptionPatterns).length,
          message: dayOfWeek
            ? `${suggestionsApplied} sugestões aplicadas baseadas em ${historicalOrders.length} pedidos de ${this.getDayName(dayOfWeek)}`
            : `${suggestionsApplied} sugestões aplicadas baseadas em ${historicalOrders.length} pedidos históricos`
        }
      };

    } catch (error) {
      return {
        success: false,
        items: currentOrderItems,
        error: error.message,
        metadata: {
          historical_orders: 0,
          suggestions_applied: 0,
          day_of_week: dayOfWeek,
          message: 'Erro ao gerar sugestões'
        }
      };
    }
  }

  // ===== MÉTODOS UTILITÁRIOS =====

  /**
   * Calcula média de um array de números
   * @param {Array<number>} numbers - Array de números
   * @returns {number} Média calculada
   */
  /**
   * Calcula mediana de um array de números
   * @param {Array<number>} numbers - Array de números
   * @returns {number} Mediana calculada
   */
  static median(numbers) {
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
   * Calcula média de um array de números
   * @param {Array<number>} numbers - Array de números
   * @returns {number} Média calculada
   */
  static average(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    const validNumbers = numbers.filter(n => typeof n === 'number' && !isNaN(n));
    if (validNumbers.length === 0) return 0;
    return validNumbers.reduce((sum, n) => sum + n, 0) / validNumbers.length;
  }

  /**
   * Arredonda valores para números práticos baseado no tipo de unidade
   *
   * IMPORTANTE: Esta função é APENAS para sugestões automáticas
   * - Sugestões: arredonda para múltiplos de 0,25 (0,25 / 0,5 / 0,75 / 1,0 / 1,25 / 1,5 / 1,75 / 2,0...)
   *   - 0,25 = 0,5 cuba P (meia cuba pequena)
   *   - 0,5 = 1 cuba P
   *   - 0,75 = 1,5 cuba P
   *   - 1,0 = 1 cuba G
   * - Digitação manual: aceita qualquer valor (inclusive 0,1 / 0,2 / 0,3 / 0,4 potes)
   * - A lógica de potes (0,1 increments) só é usada quando o cliente digita manualmente
   *
   * @param {number} value - Valor a ser arredondado
   * @param {string} unitType - Tipo da unidade
   * @returns {number} Valor arredondado para múltiplos de 0,25
   */
  static roundToPracticalValue(value, unitType) {
    if (value === 0) return 0;

    const unit = (unitType || '').toLowerCase();

    if (unit.includes('kg')) {
      // Para kg: arredondar para 2 casas decimais
      const result = Math.round(value * 100) / 100;
      return result;
    } else if (unit.includes('cuba') || unit.includes('unid')) {
      // ✅ NOVA LÓGICA: Arredondar APENAS para múltiplos de 0,25
      // Exemplos:
      // - 0.1 → 0.25
      // - 0.2 → 0.25
      // - 0.3 → 0.25
      // - 0.4 → 0.5
      // - 0.6 → 0.5
      // - 0.7 → 0.75
      // - 0.8 → 0.75
      // - 1.1 → 1.0
      // - 1.4 → 1.5
      // - 1.6 → 1.5
      // - 1.65 → 1.75
      // - 2.3 → 2.25

      if (value < 0.05) {
        // Valores muito pequenos (< 0.05) arredondam para 0 (não sugerir quantidades insignificantes)
        return 0;
      } else {
        // Para valores >= 0.125: arredondar para o 0.25 mais próximo
        // Math.round(value * 4) / 4 arredonda para múltiplos de 0.25
        return Math.round(value * 4) / 4;
      }
    } else {
      // Outros casos: uma casa decimal
      if (value < 0.05) {
        return 0;
      }
      const result = Math.round(value * 10) / 10;
      return result;
    }
  }

  /**
   * Calcula número da semana no ano
   * @param {Date} date - Data para calcular
   * @returns {number} Número da semana
   */
  static getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * Converte número do dia da semana para nome
   * @param {number} dayOfWeek - Dia da semana (1=Segunda, 2=Terça, ..., 5=Sexta)
   * @returns {string} Nome do dia
   */
  static getDayName(dayOfWeek) {
    const dayNames = {
      1: 'Segunda-feira',
      2: 'Terça-feira',
      3: 'Quarta-feira',
      4: 'Quinta-feira',
      5: 'Sexta-feira'
    };
    return dayNames[dayOfWeek] || `Dia ${dayOfWeek}`;
  }

  /**
   * Gera relatório de sugestões para debug/análise
   * @param {Object} result - Resultado do pipeline de sugestões
   * @returns {string} Relatório formatado
   */
  static generateSuggestionReport(result) {
    if (!result.success) {
      return `❌ Erro: ${result.error}`;
    }

    const { items, metadata } = result;
    const suggestedItems = items.filter(item => item.suggestion?.has_suggestion);
    
    let report = `📊 RELATÓRIO DE SUGESTÕES\n`;
    report += `═══════════════════════════\n`;
    report += `📈 Pedidos Históricos: ${metadata.historical_orders}\n`;
    report += `🎯 Receitas Analisadas: ${metadata.recipes_analyzed}\n`;
    report += `✅ Sugestões Aplicadas: ${metadata.suggestions_applied}\n`;
    report += `🌟 Alta Confiança: ${metadata.high_confidence_suggestions}\n`;
    report += `📅 Período Analisado: ${metadata.lookback_weeks} semanas\n\n`;
    
    if (suggestedItems.length > 0) {
      report += `🔍 DETALHES DAS SUGESTÕES:\n`;
      report += `─────────────────────────\n`;
      
      suggestedItems.forEach(item => {
        const suggestion = item.suggestion;
        report += `• ${item.recipe_name}\n`;
        report += `  └ Quantidade: ${suggestion.suggested_base_quantity} ${item.unit_type}\n`;
        if (CategoryLogic.isCarneCategory(item.category)) {
          report += `  └ Porcionamento: ${suggestion.suggested_adjustment_percentage}%\n`;
        }
        report += `  └ Confiança: ${Math.round(suggestion.confidence * 100)}% (${suggestion.based_on_samples} amostras)\n`;
        report += `  └ Fonte: ${suggestion.source}\n\n`;
      });
    }
    
    return report;
  }
}

export default OrderSuggestionManager;