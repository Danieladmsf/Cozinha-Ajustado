import { useState, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Recipe, Ingredient, PriceHistory } from "@/app/api/entities";

export const useRecipeAnalysisData = () => {
  const { toast } = useToast();
  
  // Estados de dados
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  
  // Estados de loading
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Estados de seleção
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedRecipeDetails, setSelectedRecipeDetails] = useState(null);

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [recipesData, ingredientsData, priceHistoryData] = await Promise.all([
        Recipe.list(),
        Ingredient.list(),
        PriceHistory.list()
      ]);

      // Filtrar apenas receitas e ingredientes ativos
      const activeRecipes = recipesData.filter(recipe => recipe.active !== false);
      const activeIngredients = ingredientsData.filter(ingredient => ingredient.active !== false);

      setRecipes(activeRecipes);
      setIngredients(activeIngredients);
      setPriceHistory(priceHistoryData || []);

      return {
        recipes: activeRecipes,
        ingredients: activeIngredients,
        priceHistory: priceHistoryData || []
      };
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de análise.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Buscar histórico de preços de um ingrediente específico
  const getIngredientPriceHistory = useCallback((ingredientId, startDate, endDate) => {
    try {
      return priceHistory.filter(price => {
        if (price.ingredient_id !== ingredientId) return false;
        
        const priceDate = new Date(price.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return priceDate >= start && priceDate <= end;
      }).sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
      return [];
    }
  }, [priceHistory]);

  // Obter preço atual de um ingrediente
  const getCurrentIngredientPrice = useCallback((ingredientId) => {
    try {
      const ingredient = ingredients.find(ing => ing.id === ingredientId);
      return ingredient?.current_price || ingredient?.price || 0;
    } catch (error) {
      return 0;
    }
  }, [ingredients]);

  // Obter preço de um ingrediente em uma data específica
  const getIngredientPriceAtDate = useCallback((ingredientId, targetDate) => {
    try {
      const targetDateTime = new Date(targetDate);
      
      // Buscar o preço mais próximo da data target (anterior ou igual)
      const relevantPrices = priceHistory
        .filter(price => 
          price.ingredient_id === ingredientId && 
          new Date(price.date) <= targetDateTime
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      if (relevantPrices.length > 0) {
        return relevantPrices[0].price;
      }

      // Se não encontrar no histórico, usar preço atual
      return getCurrentIngredientPrice(ingredientId);
    } catch (error) {
      return getCurrentIngredientPrice(ingredientId);
    }
  }, [priceHistory, getCurrentIngredientPrice]);

  // Selecionar receita para análise detalhada
  const selectRecipe = useCallback(async (recipe) => {
    try {
      setLoadingDetails(true);
      setSelectedRecipe(recipe);

      // Aqui você pode adicionar lógica adicional para carregar dados específicos da receita
      // Por exemplo, carregar histórico detalhado, análises específicas, etc.
      
      setSelectedRecipeDetails(recipe);
      
      return recipe;
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes da receita.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoadingDetails(false);
    }
  }, [toast]);

  // Limpar seleção de receita
  const clearRecipeSelection = useCallback(() => {
    setSelectedRecipe(null);
    setSelectedRecipeDetails(null);
  }, []);

  // Recarregar dados específicos
  const refreshRecipes = useCallback(async () => {
    try {
      const recipesData = await Recipe.list();
      const activeRecipes = recipesData.filter(recipe => recipe.active !== false);
      setRecipes(activeRecipes);
      return activeRecipes;
    } catch (error) {
      throw error;
    }
  }, []);

  const refreshIngredients = useCallback(async () => {
    try {
      const ingredientsData = await Ingredient.list();
      const activeIngredients = ingredientsData.filter(ingredient => ingredient.active !== false);
      setIngredients(activeIngredients);
      return activeIngredients;
    } catch (error) {
      throw error;
    }
  }, []);

  const refreshPriceHistory = useCallback(async () => {
    try {
      const priceHistoryData = await PriceHistory.list();
      setPriceHistory(priceHistoryData || []);
      return priceHistoryData;
    } catch (error) {
      throw error;
    }
  }, []);

  // Obter estatísticas gerais
  const getDataStatistics = useCallback(() => {
    return {
      totalRecipes: recipes.length,
      totalIngredients: ingredients.length,
      priceHistoryEntries: priceHistory.length,
      selectedRecipeId: selectedRecipe?.id || null,
      hasActiveSelection: !!selectedRecipe
    };
  }, [recipes, ingredients, priceHistory, selectedRecipe]);

  return {
    // Estados de dados
    recipes,
    ingredients,
    priceHistory,
    selectedRecipe,
    selectedRecipeDetails,

    // Estados de loading
    loading,
    loadingDetails,

    // Operações principais
    loadData,
    selectRecipe,
    clearRecipeSelection,

    // Consultas de preços
    getIngredientPriceHistory,
    getCurrentIngredientPrice,
    getIngredientPriceAtDate,

    // Refresh operations
    refreshRecipes,
    refreshIngredients,
    refreshPriceHistory,

    // Utilities
    getDataStatistics,

    // Setters diretos (para casos especiais)
    setRecipes,
    setIngredients,
    setPriceHistory,
    setSelectedRecipe,
    setSelectedRecipeDetails,
    setLoading,
    setLoadingDetails
  };
};