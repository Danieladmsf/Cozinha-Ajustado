/**
 * HOOK DE INTEGRAÇÃO COM RECIPE STORE
 * 
 * Hook React que conecta componentes ao RecipeStore de forma limpa.
 * Remove props drilling e dependências circulares.
 * Fornece interface reativa e type-safe.
 * 
 * @version 2.0.0
 * @author Sistema Cozinha Afeto
 */

import { useCallback } from 'react';
import useRecipeZustandStore from '@/lib/recipe-engine/RecipeStore.js';

/**
 * Hook principal para acessar e manipular o estado da receita
 */
export function useRecipeStore(selector) {
  const state = useRecipeZustandStore(selector);

  const actions = {
    setRecipeField: useCallback((field, value) => useRecipeZustandStore.getState().dispatch({ type: 'SET_RECIPE_FIELD', field, value }), []),
    addPreparation: useCallback((prep) => useRecipeZustandStore.getState().dispatch({ type: 'ADD_PREPARATION', preparation: prep }), []),
    updatePreparation: useCallback((index, field, value) => useRecipeZustandStore.getState().dispatch({ type: 'UPDATE_PREPARATION', index, field, value }), []),
    removePreparation: useCallback((id) => useRecipeZustandStore.getState().dispatch({ type: 'REMOVE_PREPARATION', id }), []),
    addIngredient: useCallback((prepIndex, ing) => useRecipeZustandStore.getState().dispatch({ type: 'ADD_INGREDIENT', prepIndex, ingredient: ing }), []),
    updateIngredient: useCallback((prepIndex, ingIndex, field, value) => useRecipeZustandStore.getState().dispatch({ type: 'UPDATE_INGREDIENT', prepIndex, ingredientIndex: ingIndex, field, value }), []),
    removeIngredient: useCallback((prepIndex, ingIndex) => useRecipeZustandStore.getState().dispatch({ type: 'REMOVE_INGREDIENT', prepIndex, ingredientIndex: ingIndex }), []),
    setUIState: useCallback((field, value) => useRecipeZustandStore.getState().dispatch({ type: 'SET_UI_STATE', field, value }), []),
    recalculate: useCallback(() => useRecipeZustandStore.getState().dispatch({ type: 'RECALCULATE' }), []),
    undo: useCallback(() => useRecipeZustandStore.getState().dispatch({ type: 'UNDO' }), []),
    redo: useCallback(() => useRecipeZustandStore.getState().dispatch({ type: 'REDO' }), []),
    loadRecipe: useCallback((data) => useRecipeZustandStore.getState().dispatch({ type: 'LOAD_RECIPE', data }), []),
    reset: useCallback(() => useRecipeZustandStore.getState().dispatch({ type: 'RESET' }), []),
    validate: useCallback(() => useRecipeZustandStore.getState().validate(), []),

    // Search actions
    search: {
      setQuery: useCallback((q) => useRecipeZustandStore.getState().dispatch({ type: 'search.setQuery', query: q }), []),
      setOpen: useCallback((isOpen) => useRecipeZustandStore.getState().dispatch({ type: 'search.setOpen', isOpen }), []),
      loadAll: useCallback(() => useRecipeZustandStore.getState().dispatch({ type: 'search.loadAll' }), []),
    },

    // Config actions
    config: {
      save: useCallback((type) => useRecipeZustandStore.getState().dispatch({ type: 'config.save', categoryType: type }), []),
      saveRecipe: useCallback((recipeData, prepData) => useRecipeZustandStore.getState().dispatch({ type: 'config.saveRecipe', recipeData, preparationsData: prepData }), []),
    },

    // Categories actions
    categories: {
      load: useCallback(() => useRecipeZustandStore.getState().dispatch({ type: 'categories.load' }), []),
    },

    // Ingredients actions
    ingredients: {
      setSearchTerm: useCallback((t) => useRecipeZustandStore.getState().dispatch({ type: 'ingredients.setSearchTerm', term: t }), []),
    },
  };

  const computed = {
    hasPreparations: state.preparations.length > 0,
    totalIngredients: state.preparations.reduce((total, prep) => total + (prep.ingredients?.length || 0), 0),
    isValid: Object.keys(state.ui.validationErrors).length === 0,
    hasErrors: Object.keys(state.ui.validationErrors).length > 0,
    canUndo: state.history.past.length > 0,
    canRedo: state.history.future.length > 0,
    isEmpty: !state.recipe.name && state.preparations.length === 0,
    isCalculating: state.ui.isLoading,
    needsSave: state.ui.hasUnsavedChanges,
  };

  const getters = {
    getPreparation: useCallback((index) => state.preparations[index], [state.preparations]),
    getIngredient: useCallback((prepIndex, ingIndex) => state.preparations[prepIndex]?.ingredients?.[ingIndex], [state.preparations]),
    getFormattedMetrics: useCallback(() => {
      const { metrics } = state;
      return {
        totalWeight: `${metrics.total_weight?.toFixed(3) || '0.000'} kg`,
        yieldWeight: `${metrics.yield_weight?.toFixed(3) || '0.000'} kg`,
        totalCost: `R$ ${metrics.total_cost?.toFixed(2) || '0.00'}`,
        costPerKgRaw: `R$ ${metrics.cost_per_kg_raw?.toFixed(2) || '0.00'}`,
        costPerKgYield: `R$ ${metrics.cost_per_kg_yield?.toFixed(2) || '0.00'}`,
        yieldPercentage: `${metrics.yield_percentage?.toFixed(1) || '0.0'}%`,
        cubaWeight: `${metrics.cuba_weight?.toFixed(3) || '0.000'} kg`,
        cubaCost: `R$ ${metrics.cuba_cost?.toFixed(2) || '0.00'}`,
      };
    }, [state.metrics]),
    
    // Nova função para buscar preço atual de ingrediente
    getIngredientCurrentPrice: useCallback((ingredientId) => {
      return useRecipeZustandStore.getState().getIngredientCurrentPrice(ingredientId);
    }, []),
  };

  return {
    ...state,
    actions,
    computed,
    ...getters,
  };
}