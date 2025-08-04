import { useState, useCallback } from 'react';

export const useRecipeAnalysisInterface = () => {
  // Estados de navegação e visualização
  const [activeTab, setActiveTab] = useState("cost_overview");
  const [timeRange, setTimeRange] = useState("3m"); // 1w, 1m, 3m, 6m, 1y
  
  // Estados de interface
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("volatility"); // volatility, price, name
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc
  
  // Estados de filtros
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [volatilityRange, setVolatilityRange] = useState({ min: 0, max: 100 });
  
  // Estados de modais e diálogos
  const [showFiltersDialog, setShowFiltersDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  
  // Estados de seleção múltipla
  const [selectedRecipesForComparison, setSelectedRecipesForComparison] = useState([]);
  const [isComparisonMode, setIsComparisonMode] = useState(false);

  // Estados de gráficos e visualização
  const [chartType, setChartType] = useState("line"); // line, bar, area
  const [showTrendLines, setShowTrendLines] = useState(true);
  const [showDataPoints, setShowDataPoints] = useState(false);

  // Navegação entre tabs
  const changeTab = useCallback((newTab) => {
    setActiveTab(newTab);
  }, []);

  // Gerenciamento de período de tempo
  const changeTimeRange = useCallback((newRange) => {
    setTimeRange(newRange);
  }, []);

  const getTimeRangeLabel = useCallback((range) => {
    const labels = {
      "1w": "1 Semana",
      "1m": "1 Mês", 
      "3m": "3 Meses",
      "6m": "6 Meses",
      "1y": "1 Ano"
    };
    return labels[range] || "3 Meses";
  }, []);

  // Gerenciamento de busca
  const updateSearchTerm = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  // Gerenciamento de ordenação
  const changeSortBy = useCallback((newSortBy) => {
    // Se é o mesmo campo, inverte a ordem
    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc"); // Default para desc em novo campo
    }
  }, [sortBy]);

  const getSortIcon = useCallback((field) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? "↑" : "↓";
  }, [sortBy, sortOrder]);

  // Gerenciamento de filtros
  const updateCategoryFilter = useCallback((category, isSelected) => {
    setSelectedCategories(prev => {
      if (isSelected) {
        return [...prev, category];
      } else {
        return prev.filter(cat => cat !== category);
      }
    });
  }, []);

  const updatePriceRange = useCallback((range) => {
    setPriceRange(range);
  }, []);

  const updateVolatilityRange = useCallback((range) => {
    setVolatilityRange(range);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedCategories([]);
    setPriceRange({ min: 0, max: 1000 });
    setVolatilityRange({ min: 0, max: 100 });
    setSearchTerm("");
  }, []);

  const hasActiveFilters = useCallback(() => {
    return (
      selectedCategories.length > 0 ||
      priceRange.min > 0 ||
      priceRange.max < 1000 ||
      volatilityRange.min > 0 ||
      volatilityRange.max < 100 ||
      searchTerm.length > 0
    );
  }, [selectedCategories, priceRange, volatilityRange, searchTerm]);

  // Gerenciamento de modais
  const openFiltersDialog = useCallback(() => {
    setShowFiltersDialog(true);
  }, []);

  const closeFiltersDialog = useCallback(() => {
    setShowFiltersDialog(false);
  }, []);

  const openExportDialog = useCallback(() => {
    setShowExportDialog(true);
  }, []);

  const closeExportDialog = useCallback(() => {
    setShowExportDialog(false);
  }, []);

  const openComparisonDialog = useCallback(() => {
    setShowComparisonDialog(true);
  }, []);

  const closeComparisonDialog = useCallback(() => {
    setShowComparisonDialog(false);
  }, []);

  // Gerenciamento de comparação de receitas
  const toggleComparisonMode = useCallback(() => {
    setIsComparisonMode(prev => {
      if (prev) {
        // Se está saindo do modo comparação, limpar seleções
        setSelectedRecipesForComparison([]);
      }
      return !prev;
    });
  }, []);

  const toggleRecipeForComparison = useCallback((recipeId) => {
    setSelectedRecipesForComparison(prev => {
      if (prev.includes(recipeId)) {
        return prev.filter(id => id !== recipeId);
      } else {
        // Limitar a 5 receitas para comparação
        if (prev.length >= 5) {
          return [...prev.slice(1), recipeId];
        }
        return [...prev, recipeId];
      }
    });
  }, []);

  const clearComparisonSelection = useCallback(() => {
    setSelectedRecipesForComparison([]);
  }, []);

  // Gerenciamento de gráficos
  const changeChartType = useCallback((newType) => {
    setChartType(newType);
  }, []);

  const toggleTrendLines = useCallback(() => {
    setShowTrendLines(prev => !prev);
  }, []);

  const toggleDataPoints = useCallback(() => {
    setShowDataPoints(prev => !prev);
  }, []);

  // Utilitários de estado
  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (selectedCategories.length > 0) count++;
    if (priceRange.min > 0 || priceRange.max < 1000) count++;
    if (volatilityRange.min > 0 || volatilityRange.max < 100) count++;
    if (searchTerm.length > 0) count++;
    return count;
  }, [selectedCategories, priceRange, volatilityRange, searchTerm]);

  const resetInterface = useCallback(() => {
    setActiveTab("cost_overview");
    setTimeRange("3m");
    setSearchTerm("");
    setSortBy("volatility");
    setSortOrder("desc");
    clearAllFilters();
    setShowFiltersDialog(false);
    setShowExportDialog(false);
    setShowComparisonDialog(false);
    setIsComparisonMode(false);
    setSelectedRecipesForComparison([]);
    setChartType("line");
    setShowTrendLines(true);
    setShowDataPoints(false);
  }, [clearAllFilters]);

  return {
    // Estados de navegação
    activeTab,
    timeRange,

    // Estados de busca e filtros
    searchTerm,
    sortBy,
    sortOrder,
    selectedCategories,
    priceRange,
    volatilityRange,

    // Estados de modais
    showFiltersDialog,
    showExportDialog,
    showComparisonDialog,

    // Estados de comparação
    selectedRecipesForComparison,
    isComparisonMode,

    // Estados de gráficos
    chartType,
    showTrendLines,
    showDataPoints,

    // Navegação
    changeTab,
    changeTimeRange,
    getTimeRangeLabel,

    // Busca
    updateSearchTerm,
    clearSearch,

    // Ordenação
    changeSortBy,
    getSortIcon,

    // Filtros
    updateCategoryFilter,
    updatePriceRange,
    updateVolatilityRange,
    clearAllFilters,
    hasActiveFilters,
    getActiveFiltersCount,

    // Modais
    openFiltersDialog,
    closeFiltersDialog,
    openExportDialog,
    closeExportDialog,
    openComparisonDialog,
    closeComparisonDialog,

    // Comparação
    toggleComparisonMode,
    toggleRecipeForComparison,
    clearComparisonSelection,

    // Gráficos
    changeChartType,
    toggleTrendLines,
    toggleDataPoints,

    // Utilitários
    resetInterface,

    // Setters diretos (para casos especiais)
    setActiveTab,
    setTimeRange,
    setSearchTerm,
    setSortBy,
    setSortOrder,
    setSelectedCategories,
    setPriceRange,
    setVolatilityRange
  };
};