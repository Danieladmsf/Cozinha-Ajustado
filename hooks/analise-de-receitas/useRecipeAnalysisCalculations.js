import { useCallback } from 'react';
import { format, subDays, subMonths, parseISO, isAfter, isBefore, addDays } from "date-fns";

export const useRecipeAnalysisCalculations = () => {

  // Calcular custo atual da receita
  const calculateCurrentRecipeCost = useCallback((recipe, ingredients) => {
    try {
      if (!recipe.processes || !Array.isArray(recipe.processes)) {
        return 0;
      }

      let totalCost = 0;

      recipe.processes.forEach(process => {
        if (process.items && Array.isArray(process.items)) {
          process.items.forEach(item => {
            const ingredient = ingredients.find(ing => ing.id === item.ingredient_id);
            if (ingredient) {
              const price = ingredient.current_price || ingredient.price || 0;
              const weight = parseFloat(item.weight) || 0;
              totalCost += (price * weight) / 1000; // Converter g para kg
            }
          });
        }
      });

      return totalCost;
    } catch (error) {
      console.error("Erro ao calcular custo atual:", error);
      return 0;
    }
  }, []);

  // Calcular custo da receita em uma data específica
  const calculateRecipeCostAtDate = useCallback((recipe, targetDate, getIngredientPriceAtDate) => {
    try {
      if (!recipe.processes || !Array.isArray(recipe.processes)) {
        return 0;
      }

      let totalCost = 0;

      recipe.processes.forEach(process => {
        if (process.items && Array.isArray(process.items)) {
          process.items.forEach(item => {
            const price = getIngredientPriceAtDate(item.ingredient_id, targetDate);
            const weight = parseFloat(item.weight) || 0;
            totalCost += (price * weight) / 1000; // Converter g para kg
          });
        }
      });

      return totalCost;
    } catch (error) {
      console.error("Erro ao calcular custo na data:", error);
      return 0;
    }
  }, []);

  // Calcular histórico de preços da receita
  const calculateRecipePriceHistory = useCallback(async (recipe, timeRange, getIngredientPriceAtDate) => {
    try {
      const today = new Date();
      let startDate, interval;

      // Definir período e intervalo baseado no timeRange
      switch (timeRange) {
        case "1w":
          startDate = subDays(today, 7);
          interval = 1; // diário
          break;
        case "1m":
          startDate = subMonths(today, 1);
          interval = 2; // a cada 2 dias
          break;
        case "3m":
          startDate = subMonths(today, 3);
          interval = 7; // semanal
          break;
        case "6m":
          startDate = subMonths(today, 6);
          interval = 14; // quinzenal
          break;
        case "1y":
          startDate = subMonths(today, 12);
          interval = 30; // mensal
          break;
        default:
          startDate = subMonths(today, 3);
          interval = 7;
      }

      const priceHistory = [];
      const dates = [];
      let currentDate = startDate;

      // Gerar array de datas
      while (currentDate <= today) {
        dates.push(new Date(currentDate));
        currentDate = addDays(currentDate, interval);
      }

      // Calcular custo para cada data
      for (const date of dates) {
        const cost = calculateRecipeCostAtDate(recipe, date, getIngredientPriceAtDate);
        priceHistory.push({
          date: format(date, 'yyyy-MM-dd'),
          cost: cost,
          formattedDate: format(date, 'dd/MM')
        });
      }

      // Calcular estatísticas
      const costs = priceHistory.map(item => item.cost);
      const minCost = Math.min(...costs);
      const maxCost = Math.max(...costs);
      const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
      const currentCost = costs[costs.length - 1] || 0;
      
      // Calcular volatilidade (desvio padrão)
      const variance = costs.reduce((sum, cost) => sum + Math.pow(cost - avgCost, 2), 0) / costs.length;
      const volatility = Math.sqrt(variance);
      const volatilityPercentage = avgCost > 0 ? (volatility / avgCost) * 100 : 0;

      // Calcular tendência (comparar primeiros vs últimos 20% dos dados)
      const firstQuintile = costs.slice(0, Math.ceil(costs.length * 0.2));
      const lastQuintile = costs.slice(Math.floor(costs.length * 0.8));
      const firstAvg = firstQuintile.reduce((sum, cost) => sum + cost, 0) / firstQuintile.length;
      const lastAvg = lastQuintile.reduce((sum, cost) => sum + cost, 0) / lastQuintile.length;
      const trendPercentage = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

      return {
        ...recipe,
        priceHistory,
        statistics: {
          minCost,
          maxCost,
          avgCost,
          currentCost,
          volatility,
          volatilityPercentage,
          trendPercentage,
          dataPoints: costs.length
        }
      };
    } catch (error) {
      console.error("Erro ao calcular histórico de preços:", error);
      return {
        ...recipe,
        priceHistory: [],
        statistics: {
          minCost: 0,
          maxCost: 0,
          avgCost: 0,
          currentCost: 0,
          volatility: 0,
          volatilityPercentage: 0,
          trendPercentage: 0,
          dataPoints: 0
        }
      };
    }
  }, [calculateRecipeCostAtDate]);

  // Calcular contribuição dos ingredientes para o custo
  const calculateIngredientContributions = useCallback((recipe, ingredients) => {
    try {
      if (!recipe.processes || !Array.isArray(recipe.processes)) {
        return [];
      }

      const contributions = new Map();
      const currentTotalCost = calculateCurrentRecipeCost(recipe, ingredients);

      recipe.processes.forEach(process => {
        if (process.items && Array.isArray(process.items)) {
          process.items.forEach(item => {
            const ingredient = ingredients.find(ing => ing.id === item.ingredient_id);
            if (ingredient) {
              const price = ingredient.current_price || ingredient.price || 0;
              const weight = parseFloat(item.weight) || 0;
              const itemCost = (price * weight) / 1000;
              
              const existingContribution = contributions.get(item.ingredient_id) || {
                ingredient,
                totalWeight: 0,
                totalCost: 0,
                percentage: 0
              };

              existingContribution.totalWeight += weight;
              existingContribution.totalCost += itemCost;
              existingContribution.percentage = currentTotalCost > 0 
                ? (existingContribution.totalCost / currentTotalCost) * 100 
                : 0;

              contributions.set(item.ingredient_id, existingContribution);
            }
          });
        }
      });

      return Array.from(contributions.values()).sort((a, b) => b.totalCost - a.totalCost);
    } catch (error) {
      console.error("Erro ao calcular contribuições:", error);
      return [];
    }
  }, [calculateCurrentRecipeCost]);

  // Calcular volatilidade de uma receita
  const calculateRecipeVolatility = useCallback((recipe, timeRange, getIngredientPriceAtDate) => {
    try {
      const today = new Date();
      const startDate = subMonths(today, 3); // Usar sempre 3 meses para volatilidade
      const dates = [];
      let currentDate = startDate;

      // Gerar datas semanais
      while (currentDate <= today) {
        dates.push(new Date(currentDate));
        currentDate = addDays(currentDate, 7);
      }

      // Calcular custos
      const costs = dates.map(date => 
        calculateRecipeCostAtDate(recipe, date, getIngredientPriceAtDate)
      );

      if (costs.length === 0) return 0;

      // Calcular volatilidade (desvio padrão)
      const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
      const variance = costs.reduce((sum, cost) => sum + Math.pow(cost - avgCost, 2), 0) / costs.length;
      const volatility = Math.sqrt(variance);
      
      return avgCost > 0 ? (volatility / avgCost) * 100 : 0;
    } catch (error) {
      console.error("Erro ao calcular volatilidade:", error);
      return 0;
    }
  }, [calculateRecipeCostAtDate]);

  // Calcular tendência de preço
  const calculatePriceTrend = useCallback((priceHistory) => {
    try {
      if (!priceHistory || priceHistory.length < 2) {
        return { trend: 'stable', percentage: 0 };
      }

      const costs = priceHistory.map(item => item.cost);
      const firstValue = costs[0];
      const lastValue = costs[costs.length - 1];
      
      if (firstValue === 0) {
        return { trend: 'stable', percentage: 0 };
      }

      const percentageChange = ((lastValue - firstValue) / firstValue) * 100;
      
      let trend = 'stable';
      if (percentageChange > 5) trend = 'increasing';
      else if (percentageChange < -5) trend = 'decreasing';

      return {
        trend,
        percentage: percentageChange
      };
    } catch (error) {
      console.error("Erro ao calcular tendência:", error);
      return { trend: 'stable', percentage: 0 };
    }
  }, []);

  // Calcular estatísticas comparativas
  const calculateComparativeStatistics = useCallback((recipes, timeRange, getIngredientPriceAtDate, ingredients) => {
    try {
      const statistics = recipes.map(recipe => {
        const currentCost = calculateCurrentRecipeCost(recipe, ingredients);
        const volatility = calculateRecipeVolatility(recipe, timeRange, getIngredientPriceAtDate);
        
        return {
          recipeId: recipe.id,
          recipeName: recipe.name,
          currentCost,
          volatility,
          category: recipe.category || 'Sem categoria'
        };
      });

      // Calcular médias
      const avgCost = statistics.reduce((sum, stat) => sum + stat.currentCost, 0) / statistics.length;
      const avgVolatility = statistics.reduce((sum, stat) => sum + stat.volatility, 0) / statistics.length;

      // Encontrar extremos
      const mostExpensive = statistics.reduce((max, stat) => stat.currentCost > max.currentCost ? stat : max);
      const cheapest = statistics.reduce((min, stat) => stat.currentCost < min.currentCost ? stat : min);
      const mostVolatile = statistics.reduce((max, stat) => stat.volatility > max.volatility ? stat : max);
      const mostStable = statistics.reduce((min, stat) => stat.volatility < min.volatility ? stat : min);

      return {
        averages: {
          cost: avgCost,
          volatility: avgVolatility
        },
        extremes: {
          mostExpensive,
          cheapest,
          mostVolatile,
          mostStable
        },
        totalRecipes: statistics.length
      };
    } catch (error) {
      console.error("Erro ao calcular estatísticas comparativas:", error);
      return {
        averages: { cost: 0, volatility: 0 },
        extremes: null,
        totalRecipes: 0
      };
    }
  }, [calculateCurrentRecipeCost, calculateRecipeVolatility]);

  return {
    // Cálculos básicos
    calculateCurrentRecipeCost,
    calculateRecipeCostAtDate,
    calculateRecipePriceHistory,
    
    // Análises avançadas
    calculateIngredientContributions,
    calculateRecipeVolatility,
    calculatePriceTrend,
    calculateComparativeStatistics
  };
};