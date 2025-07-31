import { useMemo, useCallback } from 'react';

export const useRecipeFilters = () => {

  // Filtrar receitas por termo de busca
  const filterBySearchTerm = useCallback((recipes, searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') {
      return recipes;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    
    return recipes.filter(recipe => {
      const nameMatch = recipe.name?.toLowerCase().includes(searchLower);
      const categoryMatch = recipe.category?.toLowerCase().includes(searchLower);
      const descriptionMatch = recipe.description?.toLowerCase().includes(searchLower);
      
      return nameMatch || categoryMatch || descriptionMatch;
    });
  }, []);

  // Filtrar receitas por categorias selecionadas
  const filterByCategories = useCallback((recipes, selectedCategories) => {
    if (!selectedCategories || selectedCategories.length === 0) {
      return recipes;
    }

    return recipes.filter(recipe => 
      selectedCategories.includes(recipe.category)
    );
  }, []);

  // Filtrar receitas por faixa de preço
  const filterByPriceRange = useCallback((recipes, priceRange, calculateCurrentRecipeCost, ingredients) => {
    if (!priceRange || (priceRange.min === 0 && priceRange.max === 1000)) {
      return recipes;
    }

    return recipes.filter(recipe => {
      const cost = calculateCurrentRecipeCost(recipe, ingredients);
      return cost >= priceRange.min && cost <= priceRange.max;
    });
  }, []);

  // Filtrar receitas por faixa de volatilidade
  const filterByVolatilityRange = useCallback((recipes, volatilityRange) => {
    if (!volatilityRange || (volatilityRange.min === 0 && volatilityRange.max === 100)) {
      return recipes;
    }

    return recipes.filter(recipe => {
      const volatility = recipe.statistics?.volatilityPercentage || 0;
      return volatility >= volatilityRange.min && volatility <= volatilityRange.max;
    });
  }, []);

  // Ordenar receitas
  const sortRecipes = useCallback((recipes, sortBy, sortOrder, calculateCurrentRecipeCost, ingredients) => {
    const sortedRecipes = [...recipes];
    
    sortedRecipes.sort((a, b) => {
      let valueA, valueB;

      switch (sortBy) {
        case 'name':
          valueA = a.name?.toLowerCase() || '';
          valueB = b.name?.toLowerCase() || '';
          break;
        
        case 'category':
          valueA = a.category?.toLowerCase() || '';
          valueB = b.category?.toLowerCase() || '';
          break;
        
        case 'price':
          valueA = calculateCurrentRecipeCost(a, ingredients);
          valueB = calculateCurrentRecipeCost(b, ingredients);
          break;
        
        case 'volatility':
          valueA = a.statistics?.volatilityPercentage || 0;
          valueB = b.statistics?.volatilityPercentage || 0;
          break;
        
        case 'trend':
          valueA = a.statistics?.trendPercentage || 0;
          valueB = b.statistics?.trendPercentage || 0;
          break;
        
        case 'updated_at':
          valueA = new Date(a.updated_at || 0);
          valueB = new Date(b.updated_at || 0);
          break;
        
        default:
          valueA = a.id;
          valueB = b.id;
      }

      // Comparação
      let comparison = 0;
      if (valueA < valueB) comparison = -1;
      if (valueA > valueB) comparison = 1;

      // Aplicar ordem
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sortedRecipes;
  }, []);

  // Aplicar todos os filtros e ordenação
  const applyFiltersAndSort = useCallback((
    recipes,
    filters,
    sortConfig,
    calculationFunctions
  ) => {
    const {
      searchTerm,
      selectedCategories,
      priceRange,
      volatilityRange
    } = filters;

    const {
      sortBy,
      sortOrder
    } = sortConfig;

    const {
      calculateCurrentRecipeCost,
      ingredients
    } = calculationFunctions;

    let filteredRecipes = [...recipes];

    // Aplicar filtros sequencialmente
    filteredRecipes = filterBySearchTerm(filteredRecipes, searchTerm);
    filteredRecipes = filterByCategories(filteredRecipes, selectedCategories);
    filteredRecipes = filterByPriceRange(filteredRecipes, priceRange, calculateCurrentRecipeCost, ingredients);
    filteredRecipes = filterByVolatilityRange(filteredRecipes, volatilityRange);

    // Aplicar ordenação
    filteredRecipes = sortRecipes(filteredRecipes, sortBy, sortOrder, calculateCurrentRecipeCost, ingredients);

    return filteredRecipes;
  }, [
    filterBySearchTerm,
    filterByCategories, 
    filterByPriceRange,
    filterByVolatilityRange,
    sortRecipes
  ]);

  // Obter categorias únicas das receitas
  const getUniqueCategories = useCallback((recipes) => {
    const categories = recipes
      .map(recipe => recipe.category)
      .filter(Boolean) // Remove valores null/undefined
      .filter((category, index, array) => array.indexOf(category) === index) // Remove duplicatas
      .sort(); // Ordenar alfabeticamente

    return categories;
  }, []);

  // Calcular estatísticas de filtros
  const getFilterStatistics = useCallback((originalRecipes, filteredRecipes) => {
    return {
      total: originalRecipes.length,
      filtered: filteredRecipes.length,
      hidden: originalRecipes.length - filteredRecipes.length,
      percentage: originalRecipes.length > 0 
        ? Math.round((filteredRecipes.length / originalRecipes.length) * 100)
        : 0
    };
  }, []);

  // Calcular faixas de preço e volatilidade para definir limites dos filtros
  const calculateFilterRanges = useCallback((recipes, calculateCurrentRecipeCost, ingredients) => {
    if (recipes.length === 0) {
      return {
        priceRange: { min: 0, max: 100 },
        volatilityRange: { min: 0, max: 100 }
      };
    }

    const costs = recipes.map(recipe => calculateCurrentRecipeCost(recipe, ingredients));
    const volatilities = recipes.map(recipe => recipe.statistics?.volatilityPercentage || 0);

    const priceRange = {
      min: Math.floor(Math.min(...costs)),
      max: Math.ceil(Math.max(...costs))
    };

    const volatilityRange = {
      min: Math.floor(Math.min(...volatilities)),
      max: Math.ceil(Math.max(...volatilities))
    };

    return { priceRange, volatilityRange };
  }, []);

  // Hook principal que combina filtros e ordenação usando useMemo
  const useFilteredAndSortedRecipes = useCallback((
    recipes,
    filters,
    sortConfig,
    calculationFunctions
  ) => {
    return useMemo(() => {
      return applyFiltersAndSort(recipes, filters, sortConfig, calculationFunctions);
    }, [
      recipes,
      filters.searchTerm,
      filters.selectedCategories,
      filters.priceRange,
      filters.volatilityRange,
      sortConfig.sortBy,
      sortConfig.sortOrder,
      calculationFunctions.ingredients,
      applyFiltersAndSort,
      calculationFunctions
    ]);
  }, [applyFiltersAndSort]);

  // Validar se os filtros estão aplicados
  const hasActiveFilters = useCallback((filters) => {
    const {
      searchTerm,
      selectedCategories,
      priceRange,
      volatilityRange
    } = filters;

    return (
      (searchTerm && searchTerm.trim() !== '') ||
      (selectedCategories && selectedCategories.length > 0) ||
      (priceRange && (priceRange.min > 0 || priceRange.max < 1000)) ||
      (volatilityRange && (volatilityRange.min > 0 || volatilityRange.max < 100))
    );
  }, []);

  return {
    // Filtros individuais
    filterBySearchTerm,
    filterByCategories,
    filterByPriceRange,
    filterByVolatilityRange,
    
    // Ordenação
    sortRecipes,
    
    // Aplicação combinada
    applyFiltersAndSort,
    useFilteredAndSortedRecipes,
    
    // Utilitários
    getUniqueCategories,
    getFilterStatistics,
    calculateFilterRanges,
    hasActiveFilters
  };
};