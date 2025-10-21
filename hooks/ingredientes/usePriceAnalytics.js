import { useState, useCallback, useMemo } from "react";
import { PriceHistory } from "@/app/api/entities";

export function usePriceAnalytics() {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Carregar histórico de preços
  const loadPriceHistory = useCallback(async (ingredientId) => {
    if (!ingredientId) return [];
    
    setLoading(true);
    try {
      const allHistory = await PriceHistory.list();
      const ingredientHistory = allHistory
        .filter(record => record.ingredient_id === ingredientId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setPriceHistory(ingredientHistory);
      return ingredientHistory;
    } catch (error) {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Analisar tendências de preço
  const analyzePriceTrends = useCallback((history = priceHistory) => {
    if (!history || history.length < 2) {
      return {
        trend: 'stable',
        volatility: 0,
        averageChange: 0,
        totalChange: 0,
        percentTotalChange: 0
      };
    }

    // Ordenar por data (mais antiga primeiro)
    const sortedHistory = history.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calcular mudanças
    const changes = [];
    for (let i = 1; i < sortedHistory.length; i++) {
      const current = parseFloat(sortedHistory[i].new_price) || 0;
      const previous = parseFloat(sortedHistory[i-1].new_price) || 0;
      
      if (previous > 0) {
        const percentChange = ((current - previous) / previous) * 100;
        changes.push({
          absolute: current - previous,
          percent: percentChange,
          date: sortedHistory[i].date
        });
      }
    }

    if (changes.length === 0) {
      return {
        trend: 'stable',
        volatility: 0,
        averageChange: 0,
        totalChange: 0,
        percentTotalChange: 0
      };
    }

    // Calcular métricas
    const firstPrice = parseFloat(sortedHistory[0].new_price) || 0;
    const lastPrice = parseFloat(sortedHistory[sortedHistory.length - 1].new_price) || 0;
    const totalChange = lastPrice - firstPrice;
    const percentTotalChange = firstPrice > 0 ? (totalChange / firstPrice) * 100 : 0;
    
    const averageChange = changes.reduce((sum, change) => sum + change.percent, 0) / changes.length;
    
    // Calcular volatilidade (desvio padrão dos percentuais)
    const variance = changes.reduce((sum, change) => {
      return sum + Math.pow(change.percent - averageChange, 2);
    }, 0) / changes.length;
    const volatility = Math.sqrt(variance);

    // Determinar tendência
    let trend = 'stable';
    if (Math.abs(percentTotalChange) > 5) {
      trend = percentTotalChange > 0 ? 'up' : 'down';
    }

    return {
      trend,
      volatility,
      averageChange,
      totalChange,
      percentTotalChange,
      recentChanges: changes.slice(-5), // Últimas 5 mudanças
      firstPrice,
      lastPrice
    };
  }, [priceHistory]);

  // Fazer projeções baseadas no histórico
  const projectFuturePrice = useCallback((history = priceHistory, daysAhead = 30) => {
    if (!history || history.length < 3) {
      return {
        projectedPrice: null,
        confidence: 'low',
        methodology: 'insufficient_data'
      };
    }

    const analysis = analyzePriceTrends(history);
    const { averageChange, lastPrice, volatility } = analysis;

    // Método 1: Média móvel simples das variações
    const projectedChangePercent = averageChange;
    const projectedPrice = lastPrice * (1 + (projectedChangePercent * daysAhead / 30) / 100);

    // Determinar confiança baseada na volatilidade
    let confidence = 'medium';
    if (volatility < 5) confidence = 'high';
    else if (volatility > 15) confidence = 'low';

    // Calcular range de preços possíveis
    const volatilityFactor = volatility / 100;
    const lowerBound = projectedPrice * (1 - volatilityFactor);
    const upperBound = projectedPrice * (1 + volatilityFactor);

    return {
      projectedPrice: Math.max(0, projectedPrice), // Não pode ser negativo
      confidence,
      methodology: 'moving_average',
      range: {
        lower: Math.max(0, lowerBound),
        upper: upperBound
      },
      daysAhead,
      basedOnDays: history.length
    };
  }, [priceHistory, analyzePriceTrends]);

  // Detectar alertas de preços
  const detectPriceAlerts = useCallback((history = priceHistory) => {
    const alerts = [];
    
    if (!history || history.length < 2) return alerts;

    const analysis = analyzePriceTrends(history);
    const recentHistory = history.slice(0, 5); // Últimos 5 registros

    // Alerta de alta volatilidade
    if (analysis.volatility > 20) {
      alerts.push({
        type: 'high_volatility',
        severity: 'warning',
        message: `Alta volatilidade detectada (${analysis.volatility.toFixed(1)}%)`,
        recommendation: 'Monitorar preços com mais frequência'
      });
    }

    // Alerta de mudança brusca recente
    if (recentHistory.length >= 2) {
      const latest = parseFloat(recentHistory[0].new_price) || 0;
      const previous = parseFloat(recentHistory[1].new_price) || 0;
      
      if (previous > 0) {
        const recentChange = ((latest - previous) / previous) * 100;
        
        if (Math.abs(recentChange) > 15) {
          alerts.push({
            type: 'sudden_change',
            severity: recentChange > 0 ? 'info' : 'warning',
            message: `Mudança brusca de ${recentChange.toFixed(1)}% no último registro`,
            recommendation: 'Verificar causa da mudança abrupta'
          });
        }
      }
    }

    // Alerta de tendência consistente
    if (Math.abs(analysis.percentTotalChange) > 25) {
      alerts.push({
        type: 'strong_trend',
        severity: 'info',
        message: `Tendência forte de ${analysis.percentTotalChange > 0 ? 'alta' : 'baixa'} (${Math.abs(analysis.percentTotalChange).toFixed(1)}%)`,
        recommendation: analysis.percentTotalChange > 0 ? 'Considerar fornecedores alternativos' : 'Aproveitar preços baixos'
      });
    }

    return alerts;
  }, [priceHistory, analyzePriceTrends]);

  // Comparar com histórico médio
  const compareWithAverage = useCallback((currentPrice, history = priceHistory) => {
    if (!history || history.length === 0) return null;

    const prices = history.map(h => parseFloat(h.new_price)).filter(p => !isNaN(p));
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);

    const differenceFromAvg = currentPrice - averagePrice;
    const percentDifferenceFromAvg = averagePrice > 0 ? (differenceFromAvg / averagePrice) * 100 : 0;

    return {
      averagePrice,
      maxPrice,
      minPrice,
      differenceFromAvg,
      percentDifferenceFromAvg,
      position: currentPrice > averagePrice ? 'above' : currentPrice < averagePrice ? 'below' : 'equal'
    };
  }, [priceHistory]);

  return {
    priceHistory,
    loading,
    loadPriceHistory,
    analyzePriceTrends,
    projectFuturePrice,
    detectPriceAlerts,
    compareWithAverage
  };
}