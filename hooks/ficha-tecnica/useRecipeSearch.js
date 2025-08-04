import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui';

/**
 * Hook para gerenciar busca e filtragem de receitas
 * Responsável por carregar receitas do banco e filtrar baseado na query
 */
export function useRecipeSearch() {
  const { toast } = useToast();

  // Estados de busca
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [allRecipes, setAllRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Carregar todas as receitas do banco via API
  const loadAllRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/recipes');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const recipes = result.data;
      const activeRecipes = recipes.filter(recipe => recipe.active !== false);
      
      setAllRecipes(activeRecipes);
      setFilteredRecipes(activeRecipes);
      
      return { success: true, recipes: activeRecipes };
    } catch (error) {
      setError(error.message);
      
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de receitas para pesquisa.",
        variant: "destructive"
      });
      
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Filtrar receitas baseado na query de busca com priorização
  const filterRecipes = useCallback((query) => {
    if (!query.trim()) {
      setFilteredRecipes(allRecipes);
      return allRecipes;
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Separar receitas por prioridade de correspondência
    const exactMatches = [];      // Começa exatamente com o termo
    const wordStartMatches = [];  // Palavra no nome começa com o termo
    const containsMatches = [];   // Contém o termo em qualquer lugar
    const categoryMatches = [];   // Match na categoria ou complemento
    
    allRecipes.forEach(recipe => {
      const recipeName = recipe.name?.toLowerCase() || '';
      const recipeCategory = recipe.category?.toLowerCase() || '';
      const recipeComplement = recipe.name_complement?.toLowerCase() || '';
      
      // 1ª prioridade: Nome começa exatamente com o termo
      if (recipeName.startsWith(searchTerm)) {
        exactMatches.push(recipe);
      }
      // 2ª prioridade: Alguma palavra no nome começa com o termo
      else if (recipeName.split(' ').some(word => word.startsWith(searchTerm))) {
        wordStartMatches.push(recipe);
      }
      // 3ª prioridade: Nome contém o termo
      else if (recipeName.includes(searchTerm)) {
        containsMatches.push(recipe);
      }
      // 4ª prioridade: Categoria ou complemento contém o termo
      else if (recipeCategory.includes(searchTerm) || recipeComplement.includes(searchTerm)) {
        categoryMatches.push(recipe);
      }
    });

    // Ordenar cada grupo alfabeticamente
    const sortAlphabetically = (a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR');
    
    exactMatches.sort(sortAlphabetically);
    wordStartMatches.sort(sortAlphabetically);
    containsMatches.sort(sortAlphabetically);
    categoryMatches.sort(sortAlphabetically);

    // Combinar todos os resultados por ordem de prioridade
    const filtered = [
      ...exactMatches,
      ...wordStartMatches,
      ...containsMatches,
      ...categoryMatches
    ];

    setFilteredRecipes(filtered);
    return filtered;
  }, [allRecipes]);

  // Handlers de busca
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    
    if (value.trim() && !searchOpen) {
      setSearchOpen(true);
    }
    
    filterRecipes(value);
  }, [filterRecipes, searchOpen]);

  const handleSearchFocus = useCallback(() => {
    setSearchOpen(true);
    
    // Se não há query, mostrar todas as receitas
    if (!searchQuery.trim()) {
      setFilteredRecipes(allRecipes);
    }
  }, [searchQuery, allRecipes]);

  const handleSearchBlur = useCallback(() => {
    // Delay para permitir clique nos resultados
    setTimeout(() => {
      setSearchOpen(false);
    }, 200);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    setSearchOpen(false);
    setFilteredRecipes(allRecipes);
    setError(null);
  }, [allRecipes]);

  // Manipulação de seleção de receita
  const handleRecipeSelect = useCallback((recipeId, onSelect) => {
    const selectedRecipe = filteredRecipes.find(r => r.id === recipeId);
    
    if (selectedRecipe) {
      setSearchQuery(selectedRecipe.name);
      setSearchOpen(false);
      
      if (onSelect && typeof onSelect === 'function') {
        onSelect(selectedRecipe);
      }
      
      return selectedRecipe;
    }
    
    return null;
  }, [filteredRecipes]);

  // Buscar receita por ID
  const findRecipeById = useCallback((recipeId) => {
    return allRecipes.find(recipe => recipe.id === recipeId) || null;
  }, [allRecipes]);

  // Buscar receitas por categoria
  const getRecipesByCategory = useCallback((categoryName) => {
    if (!categoryName) return allRecipes;
    
    return allRecipes.filter(recipe => 
      recipe.category?.toLowerCase() === categoryName.toLowerCase()
    );
  }, [allRecipes]);

  // Estatísticas de busca
  const getSearchStats = useCallback(() => {
    return {
      totalRecipes: allRecipes.length,
      filteredCount: filteredRecipes.length,
      hasResults: filteredRecipes.length > 0,
      isSearching: searchQuery.trim().length > 0
    };
  }, [allRecipes.length, filteredRecipes.length, searchQuery]);

  // Validação de receita
  const validateRecipe = useCallback((recipe) => {
    const errors = [];
    
    if (!recipe) {
      errors.push('Receita não encontrada');
      return { isValid: false, errors };
    }
    
    if (!recipe.name?.trim()) {
      errors.push('Nome da receita é obrigatório');
    }
    
    if (recipe.active === false) {
      errors.push('Receita está inativa');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // Recarregar receitas
  const refreshRecipes = useCallback(async () => {
    const result = await loadAllRecipes();
    
    if (result.success && searchQuery.trim()) {
      filterRecipes(searchQuery);
    }
    
    return result;
  }, [loadAllRecipes, searchQuery, filterRecipes]);

  // Effect para carregar receitas ao montar o componente
  useEffect(() => {
    loadAllRecipes();
  }, [loadAllRecipes]);

  // Effect para filtrar quando a query ou receitas mudam
  useEffect(() => {
    filterRecipes(searchQuery);
  }, [searchQuery, allRecipes, filterRecipes]);

  return {
    // Estados
    searchQuery,
    searchOpen,
    allRecipes,
    filteredRecipes,
    loading,
    error,
    
    // Handlers de busca
    handleSearchChange,
    handleSearchFocus,
    handleSearchBlur,
    handleSearchClear,
    handleRecipeSelect,
    
    // Utilitários
    findRecipeById,
    getRecipesByCategory,
    getSearchStats,
    validateRecipe,
    
    // Ações
    loadAllRecipes,
    refreshRecipes,
    filterRecipes,
    
    // Setters (para casos específicos)
    setSearchQuery,
    setSearchOpen
  };
}