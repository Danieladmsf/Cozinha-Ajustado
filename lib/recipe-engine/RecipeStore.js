/**
 * RECIPE STORE - GERENCIADOR DE ESTADO CENTRALIZADO
 * 
 * Store isolado que gerencia todo o estado da receita de forma previsível.
 * Implementa padrão Observer para notificações de mudanças.
 * Remove dependências circulares e props drilling.
 * 
 * @version 2.0.0
 * @author Sistema Cozinha Afeto
 */

import { create } from 'zustand';
import RecipeEngineAPI from './index.js';
import { CategoryType, UserEntity, Recipe, Ingredient } from '@/app/api/entities';
import { processTypes, defaultConfig, validationRules } from '@/lib/recipeConstants';
import { APP_CONSTANTS } from '@/lib/constants';

const deepClone = (obj, visited = new WeakSet()) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (visited.has(obj)) return {}; // Evita referência circular

  visited.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item, visited));
  }

  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key], visited);
    }
  }

  return cloned;
};

const getEmptyRecipe = () => ({
  id: null,
  name: '',
  description: '',
  chef: '',
  servings: 1,
  method: '',
  notes: '',
  source: '',
  category: '',
  ingredients: [],
  preparations: [],
  subrecipes: [],
  metrics: getEmptyMetrics(),
});

const getEmptyMetrics = () => ({
  totalCost: 0,
  costPerServing: 0,
  recommendedSellingPrice: 0,
  profitMargin: 0,
  markup: 0,
  breakevenUnits: 0,
  cmv: 0,
});

const removeUndefined = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)).filter(item => item !== undefined);
  }
  const newObj = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        newObj[key] = removeUndefined(value);
      }
    }
  }
  return newObj;
};

const useRecipeStore = create((set, get) => ({
  // Estado inicial
  recipe: getEmptyRecipe(),
  preparations: [],
  metrics: getEmptyMetrics(),
  ui: {
    activeTab: 'process',
    isLoading: false,
    isSaving: false,
    hasUnsavedChanges: false,
    validationErrors: {},
    lastCalculation: null,
    isProcessCreatorOpen: false,
    isAssemblyItemModalOpen: false,
    showConfigDialog: false,
  },
  history: {
    past: [],
    future: []
  },
  search: {
    query: '',
    isOpen: false,
    allRecipes: [],
    filteredRecipes: [],
    loading: false,
    error: null,
  },
  config: {
    saving: false,
    loading: false,
    categoryTypes: [],
    selectedCategoryType: '',
  },
  categories: {
    all: [],
    loading: false,
    error: null,
  },
  ingredients: {
    all: [],
    loading: false,
    searchTerm: '',
    filtered: [],
    lastRefresh: null,
  },

  // Actions
  init: async () => {
    await get().dispatch({ type: 'ingredients.load' });
    await get().dispatch({ type: 'categories.load' });
    await get().dispatch({ type: 'config.loadUserConfiguration' });
    await get().dispatch({ type: 'config.loadCategoryTypes' });
    await get().dispatch({ type: 'search.loadAll' });
  },

  getState: () => deepClone(get()),

  setRecipeField: (field, value) => set(state => ({
    recipe: { ...state.recipe, [field]: value },
    ui: { ...state.ui, hasUnsavedChanges: true }
  })),

  setUIState: (field, value) => set(state => ({
    ui: { ...state.ui, [field]: value }
  })),

  addPreparation: (preparation) => set(state => {
    const newPrep = {
      id: Date.now().toString(),
      name: preparation.name || '',
      ingredients: [],
      instructions: preparation.instructions || '',
      ...preparation
    };
    return {
      preparations: [...state.preparations, newPrep],
      ui: { ...state.ui, hasUnsavedChanges: true }
    };
  }),

  updatePreparation: (index, field, value) => set(state => {
    if (!state.preparations[index]) return state;
    const newPreparations = [...state.preparations];
    newPreparations[index] = { ...newPreparations[index], [field]: value };
    return {
      preparations: newPreparations,
      ui: { ...state.ui, hasUnsavedChanges: true }
    };
  }),

  removePreparation: (id) => set(state => ({
    preparations: state.preparations.filter(prep => prep.id !== id),
    ui: { ...state.ui, hasUnsavedChanges: true }
  })),

  addIngredient: (prepIndex, ingredient) => set(state => {
    if (!state.preparations[prepIndex]) return state;
    const newPreparations = [...state.preparations];
    const newIngredients = [...newPreparations[prepIndex].ingredients, {
      id: Date.now().toString(),
      ...ingredient
    }];
    newPreparations[prepIndex] = { ...newPreparations[prepIndex], ingredients: newIngredients };
    get().recalculateMetrics(); // Recalculate after state update
    return {
      preparations: newPreparations,
      ui: { ...state.ui, hasUnsavedChanges: true }
    };
  }),

  updateIngredient: (prepIndex, ingredientIndex, field, value) => set(state => {
    if (!state.preparations[prepIndex]?.ingredients[ingredientIndex]) return state;
    const newPreparations = [...state.preparations];
    const newIngredients = [...newPreparations[prepIndex].ingredients];
    newIngredients[ingredientIndex] = { ...newIngredients[ingredientIndex], [field]: value };
    newPreparations[prepIndex] = { ...newPreparations[prepIndex], ingredients: newIngredients };
    get().recalculateMetrics(); // Recalculate after state update
    return {
      preparations: newPreparations,
      ui: { ...state.ui, hasUnsavedChanges: true }
    };
  }),

  removeIngredient: (prepIndex, ingredientIndex) => set(state => {
    if (!state.preparations[prepIndex]?.ingredients) return state;
    const newPreparations = [...state.preparations];
    const newIngredients = [...newPreparations[prepIndex].ingredients];
    newIngredients.splice(ingredientIndex, 1);
    newPreparations[prepIndex] = { ...newPreparations[prepIndex], ingredients: newIngredients };
    get().recalculateMetrics(); // Recalculate after state update
    return {
      preparations: newPreparations,
      ui: { ...state.ui, hasUnsavedChanges: true }
    };
  }),

  recalculateMetrics: () => {
    // Debounce calculations
    if (get().calculationQueue) {
      clearTimeout(get().calculationQueue);
    }

    const calculationQueue = setTimeout(() => {
      set(state => {
        try {
          let totalCost = 0;
          let totalWeight = 0;

          state.preparations.forEach(prep => {
            prep.ingredients.forEach(ing => {
              const cost = parseFloat(ing.current_price) || 0; // Use current_price
              const quantity = parseFloat(ing.quantity) || 0;
              totalCost += cost * quantity;
              totalWeight += quantity;
            });
          });

          return {
            metrics: {
              ...state.metrics,
              total_cost: totalCost,
              total_weight: totalWeight,
              cost_per_kg_raw: totalWeight > 0 ? totalCost / (totalWeight / 1000) : 0
            },
            ui: { ...state.ui, lastCalculation: Date.now() }
          };
        } catch (error) {
          return state; // Return current state on error
        }
      });
    }, 300);
    set({ calculationQueue });
  },

  loadRecipe: (data) => set(state => ({
    recipe: { ...getEmptyRecipe(), ...data },
    preparations: data.preparations || [],
    metrics: data.metrics || getEmptyMetrics(),
    ui: { ...state.ui, hasUnsavedChanges: false },
  })),

  reset: () => set(state => ({
    recipe: getEmptyRecipe(),
    preparations: [],
    metrics: getEmptyMetrics(),
    ui: { ...state.ui, hasUnsavedChanges: false },
    history: { past: [], future: [] }
  })),

  saveToHistory: (prevState) => set(state => {
    const newPast = [...state.history.past, prevState];
    if (newPast.length > 50) {
      newPast.shift();
    }
    return {
      history: { past: newPast, future: [] }
    };
  }),

  undo: () => set(state => {
    if (state.history.past.length === 0) return state;
    const prevState = state.history.past[state.history.past.length - 1];
    const newPast = state.history.past.slice(0, -1);
    const newFuture = [...state.history.future, deepClone({
      recipe: state.recipe,
      preparations: state.preparations,
      metrics: state.metrics,
    })];
    return {
      recipe: prevState.recipe,
      preparations: prevState.preparations,
      metrics: prevState.metrics,
      history: { past: newPast, future: newFuture }
    };
  }),

  redo: () => set(state => {
    if (state.history.future.length === 0) return state;
    const futureState = state.history.future[state.history.future.length - 1];
    const newFuture = state.history.future.slice(0, -1);
    const newPast = [...state.history.past, deepClone({
      recipe: state.recipe,
      preparations: state.preparations,
      metrics: state.metrics,
    })];
    return {
      recipe: futureState.recipe,
      preparations: futureState.preparations,
      metrics: futureState.metrics,
      history: { past: newPast, future: newFuture }
    };
  }),

  dispatch: async (action) => {
    const prevState = get().getState();

    try {
      switch (action.type) {
        case 'SET_RECIPE_FIELD':
          get().setRecipeField(action.field, action.value);
          break;
        case 'ADD_PREPARATION':
          get().addPreparation(action.preparation);
          break;
        case 'UPDATE_PREPARATION':
          get().updatePreparation(action.index, action.field, action.value);
          break;
        case 'REMOVE_PREPARATION':
          get().removePreparation(action.id);
          break;
        case 'ADD_INGREDIENT':
          get().addIngredient(action.prepIndex, action.ingredient);
          break;
        case 'UPDATE_INGREDIENT':
          get().updateIngredient(action.prepIndex, action.ingredientIndex, action.field, action.value);
          break;
        case 'REMOVE_INGREDIENT':
          get().removeIngredient(action.prepIndex, action.ingredientIndex);
          break;
        case 'SET_UI_STATE':
          get().setUIState(action.field, action.value);
          break;
        case 'RECALCULATE':
          get().recalculateMetrics();
          break;
        case 'RESET':
          get().reset();
          break;
        case 'LOAD_RECIPE':
          get().loadRecipe(action.data);
          break;
        case 'UNDO':
          get().undo();
          break;
        case 'REDO':
          get().redo();
          break;

        case 'search.setQuery':
          set(state => ({ search: { ...state.search, query: action.query } }));
          get().filterRecipes(action.query);
          break;
        case 'search.setOpen':
          set(state => ({ search: { ...state.search, isOpen: action.isOpen } }));
          break;
        case 'search.loadAll':
          await get().loadAllRecipes();
          break;

        case 'config.loadCategoryTypes':
          await get().loadCategoryTypes();
          break;
        case 'config.loadUserConfiguration':
          await get().loadUserConfiguration();
          break;
        case 'config.save':
          await get().saveConfiguration(action.categoryType);
          break;
        case 'config.saveRecipe':
          return await get().saveRecipe(action.recipeData, action.preparationsData);

        case 'categories.load':
          await get().loadCategories();
          break;

        case 'ingredients.load':
          await get().loadIngredients();
          break;
        case 'ingredients.setSearchTerm':
          set(state => ({ ingredients: { ...state.ingredients, searchTerm: action.term } }));
          get().filterIngredients(action.term);
          break;

        default:
          return;
      }

      if (!action.type.startsWith('SET_UI')) {
        get().saveToHistory(prevState);
      }

    } catch (error) {
      set(prevState); // Revert to previous state on error
    }
  },

  // ==== SEARCH OPERATIONS ====
  loadAllRecipes: async () => {
    set(state => ({ search: { ...state.search, loading: true } }));
    try {
      const response = await fetch('/api/recipes');
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      const activeRecipes = result.data.filter(recipe => recipe.active !== false);
      set(state => ({ search: { ...state.search, allRecipes: activeRecipes, filteredRecipes: activeRecipes } }));
    } catch (error) {
      set(state => ({ search: { ...state.search, error: error.message } }));
    } finally {
      set(state => ({ search: { ...state.search, loading: false } }));
    }
  },

  filterRecipes: (query) => set(state => {
    if (!query.trim()) {
      return { search: { ...state.search, filteredRecipes: state.search.allRecipes } };
    }

    const searchTerm = query.toLowerCase().trim();

    const exactMatches = [];
    const wordStartMatches = [];
    const containsMatches = [];
    const categoryMatches = [];

    state.search.allRecipes.forEach(recipe => {
      const recipeName = recipe.name?.toLowerCase() || '';
      const recipeCategory = recipe.category?.toLowerCase() || '';
      const recipeComplement = recipe.name_complement?.toLowerCase() || '';

      if (recipeName.startsWith(searchTerm)) {
        exactMatches.push(recipe);
      } else if (recipeName.split(' ').some(word => word.startsWith(searchTerm))) {
        wordStartMatches.push(recipe);
      } else if (recipeName.includes(searchTerm)) {
        containsMatches.push(recipe);
      } else if (recipeCategory.includes(searchTerm) || recipeComplement.includes(searchTerm)) {
        categoryMatches.push(recipe);
      }
    });

    const sortAlphabetically = (a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR');

    exactMatches.sort(sortAlphabetically);
    wordStartMatches.sort(sortAlphabetically);
    containsMatches.sort(sortAlphabetically);
    categoryMatches.sort(sortAlphabetically);

    return {
      search: {
        ...state.search,
        filteredRecipes: [
          ...exactMatches,
          ...wordStartMatches,
          ...containsMatches,
          ...categoryMatches
        ]
      }
    };
  }),

  // ==== CONFIG OPERATIONS ====
  loadCategoryTypes: async () => {
    set(state => ({ config: { ...state.config, loading: true } }));
    try {
      const response = await fetch('/api/category-types');
      const types = await response.json();
      if (!response.ok) throw new Error(types.error || 'Erro ao carregar tipos');
      set(state => ({ config: { ...state.config, categoryTypes: types || [] } }));
    } catch (error) {
      // handle error silently
    } finally {
      set(state => ({ config: { ...state.config, loading: false } }));
    }
  },

  loadUserConfiguration: async () => {
    try {
      const response = await fetch('/api/user');
      const userData = await response.json();
      if (!response.ok) throw new Error(userData.error || 'Erro ao carregar usuário');
      if (userData?.recipe_config) {
        const categoryType = userData.recipe_config.selected_category_type || 'refeicoes';
        set(state => ({ config: { ...state.config, selectedCategoryType: categoryType } }));
      }
    } catch (error) {
      // handle error silently
    }
  },

  saveConfiguration: async (categoryType) => {
    set(state => ({ config: { ...state.config, saving: true } }));
    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_config: {
            selected_category_type: categoryType,
          }
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao salvar configuração');
      set(state => ({ config: { ...state.config, selectedCategoryType: categoryType } }));
    } catch (error) {
      // handle error silently
    } finally {
      set(state => ({ config: { ...state.config, saving: false } }));
    }
  },

  saveRecipe: async (recipeData, preparationsData) => {
    set(state => ({ ui: { ...state.ui, isSaving: true } }));
    try {
      const recipeToSave = {
        name: recipeData.name || '',
        name_complement: recipeData.name_complement || '',
        category: recipeData.category || '',
        prep_time: parseFloat(recipeData.prep_time) || 0,
        total_weight: parseFloat(get().metrics.total_weight) || 0,
        yield_weight: parseFloat(get().metrics.yield_weight) || 0,
        cuba_weight: parseFloat(get().metrics.cuba_weight) || 0,
        total_cost: parseFloat(get().metrics.total_cost) || 0,
        cost_per_kg_raw: parseFloat(get().metrics.cost_per_kg_raw) || 0,
        cost_per_kg_yield: parseFloat(get().metrics.cost_per_kg_yield) || 0,
        cuba_cost: parseFloat(get().metrics.cuba_cost) || 0,
        portion_cost: parseFloat(recipeData.portion_cost) || 0,
        active: recipeData.active !== undefined ? recipeData.active : true,
        instructions: recipeData.instructions || '',
        preparations: preparationsData || []
      };

      const sanitizedRecipe = removeUndefined(recipeToSave);

      let result;
      if (recipeData.id) {
        result = await Recipe.update(recipeData.id, sanitizedRecipe);
      } else {
        result = await Recipe.create(sanitizedRecipe);
      }
      return { success: true, recipe: result };
    } catch (error) {
      return { success: false, error };
    } finally {
      set(state => ({ ui: { ...state.ui, isSaving: false } }));
    }
  },

  // ==== CATEGORIES OPERATIONS ====
  loadCategories: async () => {
    set(state => ({ categories: { ...state.categories, loading: true } }));
    try {
      const categoryType = get().config.selectedCategoryType || 'default';
      if (categoryType === 'default') {
        set(state => ({
          categories: {
            ...state.categories,
            all: [
              { id: 'entrada', name: 'Entrada', value: 'entrada' },
              { id: 'prato-principal', name: 'Prato Principal', value: 'prato-principal' },
              { id: 'sobremesa', name: 'Sobremesa', value: 'sobremesa' },
              { id: 'acompanhamento', name: 'Acompanhamento', value: 'acompanhamento' }
            ]
          }
        }));
        return;
      }

      const response = await fetch(`/api/category-tree?type=${categoryType}`);
      const filteredCategories = await response.json();
      if (!response.ok) throw new Error(filteredCategories.error || 'Erro ao carregar categorias');

      if (filteredCategories.length === 0) {
        set(state => ({
          categories: {
            ...state.categories,
            all: [
              { id: 'entrada', name: 'Entrada', value: 'entrada' },
              { id: 'prato-principal', name: 'Prato Principal', value: 'prato-principal' },
              { id: 'sobremesa', name: 'Sobremesa', value: 'sobremesa' },
              { id: 'acompanhamento', name: 'Acompanhamento', value: 'acompanhamento' }
            ]
          }
        }));
        return;
      }

      const processedCategories = filteredCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        value: cat.name,
        color: cat.color,
        order: cat.order || 0
      }));

      processedCategories.sort((a, b) => a.order - b.order);
      set(state => ({ categories: { ...state.categories, all: processedCategories } }));
    } catch (error) {
      set(state => ({ categories: { ...state.categories, error: error.message } }));
    } finally {
      set(state => ({ categories: { ...state.categories, loading: false } }));
    }
  },

  // ==== INGREDIENTS OPERATIONS ====
  loadIngredients: async () => {
    set(state => ({ ingredients: { ...state.ingredients, loading: true } }));
    try {
      const response = await fetch('/api/ingredients?active=true');
      const allIngredients = await response.json();
      if (!response.ok) throw new Error(allIngredients.error || 'Erro ao carregar ingredientes');
      set(state => ({ 
        ingredients: { 
          ...state.ingredients, 
          all: allIngredients,
          lastRefresh: Date.now()
        } 
      }));
    } catch (error) {
      // handle error silently
    } finally {
      set(state => ({ ingredients: { ...state.ingredients, loading: false } }));
    }
  },

  // Função para buscar preço atual de um ingrediente por ID
  getIngredientCurrentPrice: (ingredientId) => {
    const state = get();
    const ingredient = state.ingredients.all.find(ing => ing.id === ingredientId);
    return ingredient?.current_price || 0;
  },

  // Função para invalidar cache e recarregar ingredientes automaticamente
  refreshIngredientsIfNeeded: async (forceRefresh = false) => {
    const state = get();
    const lastRefresh = state.ingredients.lastRefresh;
    const now = Date.now();
    const CACHE_DURATION = 30000; // 30 segundos

    // Recarregar se forçado ou se cache expirou
    if (forceRefresh || !lastRefresh || (now - lastRefresh) > CACHE_DURATION) {
      await get().loadIngredients();
    }
  },

  filterIngredients: (term) => set(state => {
    if (!term.trim()) {
      return { ingredients: { ...state.ingredients, filtered: [] } };
    }

    const lowerCaseTerm = term.toLowerCase();
    const filtered = state.ingredients.all.filter(ingredient => {
      const name = ingredient.name?.toLowerCase() || '';
      const brand = ingredient.brand?.toLowerCase() || '';
      const category = ingredient.category?.toLowerCase() || '';
      return name.includes(lowerCaseTerm) || brand.includes(lowerCaseTerm) || category.includes(lowerCaseTerm);
    });

    filtered.sort((a, b) => {
      const aName = a.name?.toLowerCase() || '';
      const bName = b.name?.toLowerCase() || '';
      if (aName.startsWith(lowerCaseTerm) && !bName.startsWith(lowerCaseTerm)) return -1;
      if (!aName.startsWith(lowerCaseTerm) && bName.startsWith(lowerCaseTerm)) return 1;
      return aName.localeCompare(bName, 'pt-BR');
    });

    return { ingredients: { ...state.ingredients, filtered: filtered } };
  }),

  validate: () => {
    // TODO: Implement validation logic
    return {
      isValid: true,
      errors: {}
    };
  },

  // Initialisation
  // This will be called once when the store is created
  // and can be used to load initial data
  _init: (() => {
    // Using a self-invoking function to run init once
    // This is a common pattern for Zustand stores that need to load data on creation
    // It ensures `get()` and `set()` are available.
    setTimeout(() => {
      get().init();
    }, 0);
  })(),
}));

export default useRecipeStore;
