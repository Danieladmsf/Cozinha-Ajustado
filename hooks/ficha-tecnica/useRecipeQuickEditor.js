
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui';

export function useRecipeQuickEditor() {
  const { toast } = useToast();

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/recipes');
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      const sortedRecipes = result.data.sort((a, b) => a.name.localeCompare(b.name));
      setRecipes(sortedRecipes);
      return { success: true, recipes: sortedRecipes };
    } catch (error) {
      setError(error.message);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as receitas.",
        variant: "destructive"
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateRecipe = useCallback(async (recipeId, updatedData) => {
    // Placeholder for update logic
    toast({
      title: "Função não implementada",
      description: "A atualização de receitas ainda não foi implementada.",
    });
  }, [toast]);

  const deleteRecipe = useCallback(async (recipeId) => {
    // Placeholder for delete logic
    toast({
      title: "Função não implementada",
      description: "A exclusão de receitas ainda não foi implementada.",
    });
  }, [toast]);

  const refreshRecipes = useCallback(async () => {
    return await loadRecipes();
  }, [loadRecipes]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  return {
    recipes,
    loading,
    error,
    refreshRecipes,
    updateRecipe,
    deleteRecipe,
  };
}
