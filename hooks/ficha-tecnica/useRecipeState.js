import { useState, useCallback, useEffect } from 'react';

/**
 * Hook para gerenciar todos os estados da Ficha Técnica
 * Extraído automaticamente de RecipeTechnicall.jsx
 */
export function useRecipeState() {
  // Estados principais
  const [loading, setLoading] = useState(false); // Mudado para false para permitir renderização inicial
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecipeId, setCurrentRecipeId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // Estados de dados
  const [recipeData, setRecipeData] = useState({
    name: "",
    name_complement: "",
    category: "",
    prep_time: 0,
    total_weight: 0,
    yield_weight: 0,
    cuba_weight: 0,
    total_cost: 0,
    cost_per_kg_raw: 0,
    cost_per_kg_yield: 0,
    instructions: "",
    active: true,
    pre_preparo: {}
  });

  const [preparationsData, setPreparationsData] = useState([]);
  const [groups, setGroups] = useState([]);

  // Estados de interface
  const [activeTab, setActiveTab] = useState("ficha-tecnica");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  // Estados de modais
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [isProcessCreatorOpen, setIsProcessCreatorOpen] = useState(false);
  const [isAssemblyItemModalOpen, setIsAssemblyItemModalOpen] = useState(false);
  const [isRecipeCopyModalOpen, setIsRecipeCopyModalOpen] = useState(false);
  const [isDetailedProcessDialogOpen, setDetailedProcessDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isPrintCollectDialogOpen, setIsPrintCollectDialogOpen] = useState(false);
  const [isPrintSimpleDialogOpen, setIsPrintSimpleDialogOpen] = useState(false);

  // Estados de dados externos
  const [categories, setCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Estados de processos
  const [selectedProcesses, setSelectedProcesses] = useState([]);
  const [currentPrepIndex, setCurrentPrepIndex] = useState(null);
  const [currentPrepIndexForAssembly, setCurrentPrepIndexForAssembly] = useState(null);
  const [currentItemType, setCurrentItemType] = useState("ingredient");

  // Estados de ingredientes e receitas
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState("");
  const [currentIngredient, setCurrentIngredient] = useState(null);
  const [processFormData, setProcessFormData] = useState({
    weight_frozen: 0,
    weight_thawed: 0,
    weight_clean: 0,
    weight_cooked: 0
  });

  // Estados de cópia de receita
  const [sourceRecipeSearch, setSourceRecipeSearch] = useState('');
  const [selectedSourceRecipe, setSelectedSourceRecipe] = useState(null);
  const [filteredSourceRecipes, setFilteredSourceRecipes] = useState([]);
  const [selectedStageLevel, setSelectedStageLevel] = useState('complete');
  const [sourceRecipeStages, setSourceRecipeStages] = useState([]);
  const [recipePreview, setRecipePreview] = useState(null);

  // Funções de reset
  const resetRecipeData = useCallback(() => {
    setRecipeData({
      name: "",
      name_complement: "",
      category: "",
      prep_time: 0,
      total_weight: 0,
      yield_weight: 0,
      cuba_weight: 0,
      total_cost: 0,
      cost_per_kg_raw: 0,
      cost_per_kg_yield: 0,
      instructions: "",
      active: true,
      pre_preparo: {}
    });
    setPreparationsData([]);
    setGroups([]);
    setIsDirty(false);
  }, []);

  const resetModals = useCallback(() => {
    setSearchModalOpen(false);
    setIsProcessCreatorOpen(false);
    setIsAssemblyItemModalOpen(false);
    setIsRecipeCopyModalOpen(false);
    setDetailedProcessDialogOpen(false);
    setIsPrintDialogOpen(false);
    setIsPrintCollectDialogOpen(false);
    setIsPrintSimpleDialogOpen(false);
  }, []);

  return {
    // Estados principais
    loading, setLoading,
    saving, setSaving,
    error, setError,
    isEditing, setIsEditing,
    currentRecipeId, setCurrentRecipeId,
    isDirty, setIsDirty,

    // Estados de dados
    recipeData, setRecipeData,
    preparationsData, setPreparationsData,
    groups, setGroups,

    // Estados de interface
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    searchOpen, setSearchOpen,
    showConfigDialog, setShowConfigDialog,

    // Estados de modais
    searchModalOpen, setSearchModalOpen,
    isProcessCreatorOpen, setIsProcessCreatorOpen,
    isAssemblyItemModalOpen, setIsAssemblyItemModalOpen,
    isRecipeCopyModalOpen, setIsRecipeCopyModalOpen,
    isDetailedProcessDialogOpen, setDetailedProcessDialogOpen,
    isPrintDialogOpen, setIsPrintDialogOpen,
    isPrintCollectDialogOpen, setIsPrintCollectDialogOpen,
    isPrintSimpleDialogOpen, setIsPrintSimpleDialogOpen,

    // Estados de dados externos
    categories, setCategories,
    ingredients, setIngredients,
    recipes, setRecipes,
    allCategories, setAllCategories,
    selectedCategory, setSelectedCategory,

    // Estados de processos
    selectedProcesses, setSelectedProcesses,
    currentPrepIndex, setCurrentPrepIndex,
    currentPrepIndexForAssembly, setCurrentPrepIndexForAssembly,
    currentItemType, setCurrentItemType,

    // Estados de ingredientes
    ingredientSearchTerm, setIngredientSearchTerm,
    currentIngredient, setCurrentIngredient,
    processFormData, setProcessFormData,

    // Estados de cópia de receita
    sourceRecipeSearch, setSourceRecipeSearch,
    selectedSourceRecipe, setSelectedSourceRecipe,
    filteredSourceRecipes, setFilteredSourceRecipes,
    selectedStageLevel, setSelectedStageLevel,
    sourceRecipeStages, setSourceRecipeStages,
    recipePreview, setRecipePreview,

    // Funções de reset
    resetRecipeData,
    resetModals
  };
}