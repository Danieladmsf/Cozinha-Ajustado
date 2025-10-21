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
   * @returns {Promise<Array>} Array de pedidos históricos
   */
  static async loadHistoricalOrders(customerId, lookbackWeeks = 8) {
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
        
        const weekOrders = await Order.query([
          { field: 'customer_id', operator: '==', value: customerId },
          { field: 'week_number', operator: '==', value: targetWeek },
          { field: 'year', operator: '==', value: targetYear }
        ]);
        
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
          ratio_per_meal: baseQuantity / mealsExpected, // Ratio base por refeição
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
        avg_base_quantity: 0,
        avg_adjustment_percentage: 0,
        avg_ratio_per_meal: 0,
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

    // Dar mais peso às amostras recentes (últimas 4 semanas)
    const recentSamples = sortedSamples.slice(0, Math.min(8, samples.length));
    const allSamplesWeight = 0.3;
    const recentSamplesWeight = 0.7;

    // Calcular médias
    const avgBaseQuantity = (
      recentSamplesWeight * this.average(recentSamples.map(s => s.base_quantity)) +
      allSamplesWeight * this.average(samples.map(s => s.base_quantity))
    );

    const avgAdjustmentPercentage = (
      recentSamplesWeight * this.average(recentSamples.map(s => s.adjustment_percentage)) +
      allSamplesWeight * this.average(samples.map(s => s.adjustment_percentage))
    );

    const avgRatioPerMeal = (
      recentSamplesWeight * this.average(recentSamples.map(s => s.ratio_per_meal)) +
      allSamplesWeight * this.average(samples.map(s => s.ratio_per_meal))
    );

    // Calcular nível de confiança baseado no número de amostras
    const confidence = Math.min(samples.length / 4, 1); // Máxima confiança com 4+ amostras

    return {
      avg_base_quantity: Math.round(avgBaseQuantity * 100) / 100,
      avg_adjustment_percentage: Math.round(avgAdjustmentPercentage * 100) / 100,
      avg_ratio_per_meal: Math.round(avgRatioPerMeal * 10000) / 10000, // Mais precisão para ratios
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

      // ✅ ESTRATÉGIA 1: Usar ratio por refeição (mais preciso)
      let suggestedBaseQuantity = stats.avg_ratio_per_meal * mealsExpected;
      
      // ✅ ESTRATÉGIA 2: Fallback para média direta se ratio é muito baixo
      if (suggestedBaseQuantity < 0.1 && stats.avg_base_quantity > 0) {
        suggestedBaseQuantity = stats.avg_base_quantity;
      }

      // Arredondar para valores práticos
      suggestedBaseQuantity = this.roundToPracticalValue(suggestedBaseQuantity, item.unit_type);

      const suggestedAdjustmentPercentage = isCarneCategory ? 
        Math.round(stats.avg_adjustment_percentage) : 0;

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
          source: stats.avg_ratio_per_meal * mealsExpected >= 0.1 ? 'ratio_per_meal' : 'average_quantity'
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
      lookbackWeeks = 8,
      applyToEmptyOnly = true,
      minConfidence = 0.25
    } = options;

    try {
      // 1. Carregar histórico
      const historicalOrders = await this.loadHistoricalOrders(customerId, lookbackWeeks);
      
      if (historicalOrders.length === 0) {
        return {
          success: true,
          items: currentOrderItems,
          metadata: {
            historical_orders: 0,
            suggestions_applied: 0,
            message: 'Nenhum histórico encontrado para análise'
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
          recipes_analyzed: Object.keys(consumptionPatterns).length,
          message: `${suggestionsApplied} sugestões aplicadas baseadas em ${historicalOrders.length} pedidos históricos`
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
  static average(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    const validNumbers = numbers.filter(n => typeof n === 'number' && !isNaN(n));
    if (validNumbers.length === 0) return 0;
    return validNumbers.reduce((sum, n) => sum + n, 0) / validNumbers.length;
  }

  /**
   * Arredonda valores para números práticos baseado no tipo de unidade
   * @param {number} value - Valor a ser arredondado
   * @param {string} unitType - Tipo da unidade
   * @returns {number} Valor arredondado
   */
  static roundToPracticalValue(value, unitType) {
    if (value === 0) return 0;
    
    const unit = (unitType || '').toLowerCase();
    
    if (unit.includes('kg')) {
      // Para kg: arredondar para 2 casas decimais
      const result = Math.round(value * 100) / 100;
      return result;
    } else if (unit.includes('cuba') || unit.includes('unid')) {
      let result;
      if (value < 0.05) {
        result = 0;
      } else if (value >= 0.05 && value < 0.5) {
        // Arredondar para 0.1, 0.2, 0.3, 0.4
        result = Math.round(value * 10) / 10;
        if (result === 0) result = 0.1; // Garantir mínimo de 0.1 APENAS se resultado for 0
      } else if (value >= 0.5 && value < 0.8) {
        // De 0.5 a 0.8 (exclusivo) arredonda para 0.5
        result = 0.5;
      } else if (value >= 0.8 && value < 1) {
        // De 0.8 a 1 (exclusivo) arredonda para 1
        result = 1;
      } else {
        // Para valores >= 1: arredondar para o 0.25 mais próximo
        result = Math.round(value * 4) / 4;
      }
      return result;
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