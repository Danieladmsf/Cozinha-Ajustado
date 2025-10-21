'use client';

import React, { useCallback, useState, useEffect } from "react";
import {
  Button,
  Card, CardContent, CardHeader, CardTitle,
  Input,
  Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Tabs, TabsContent, TabsList, TabsTrigger,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  useToast
} from "@/components/ui";
import {
  Plus,
  Trash2,
  Save,
  CookingPot,
  Settings,
  Printer,
  Search,
  ClipboardList,
  ClipboardCheck,
  FilePlus,
  FileUp,
  Loader2,
  Edit,
  List,
  ChevronDown,
  ChevronUp,
  Check,
  X
} from "lucide-react";

// Componente de refresh
import { RefreshButton } from "@/components/ui/refresh-button";

// Componente de criação de processo
import ProcessCreatorModalComponent from "./ProcessCreatorModal";

// Drag and Drop
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Hooks customizados organizados
import {
  useRecipeState,
  useRecipeOperations,
  useRecipeInterface,
  useRecipeCalculations,
  useRecipeSearch,
  useRecipeConfig,
  useRecipeCategories
} from "@/hooks/ficha-tecnica";
import { useIngredientSearch } from "@/hooks/ficha-tecnica/useIngredientSearch";
import useRecipeZustandStore from '@/lib/recipe-engine/RecipeStore.js';
import { formatCurrency, formatWeight } from "@/lib/formatUtils";
import { processTypes } from "@/lib/recipeConstants";
import { 
  calculateRecipeMetrics, 
  updateRecipeMetrics,
  calculateCubaCost,
  updatePreparationsMetrics
} from "@/lib/recipeMetricsCalculator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

// Componentes organizados
import AddAssemblyItemModal from "./AddAssemblyItemModal";
import AssemblySubComponents from "./AssemblySubComponents";
import RecipeQuickEditor from "./RecipeQuickEditor";
import RecipeSelectorModal from "./RecipeSelectorModal";
import IngredientTable from "./optimized/IngredientTable";

export default function RecipeTechnical() {
  const { toast } = useToast();
  const fileInputRef = React.useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // ==== HOOKS DE ESTADO (CONECTADOS) ====
  const {
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
  } = useRecipeState();

  // ==== HOOKS DE OPERAÇÕES (CONECTADOS) ====
  const {
    parseNumericValue,
    addPreparation,
    updatePreparation,
    removePreparation,
    addIngredientToPreparation,
    updateIngredient,
    removeIngredient,
    addSubComponent,
    updateSubComponent,
    removeSubComponent,
    saveRecipe,
    loadRecipe
  } = useRecipeOperations();

  // ==== HOOKS DE INTERFACE (CONECTADOS) ====
  const updateRecipeData = useCallback((key, value) => {
    setRecipeData(prev => ({
      ...prev,
      [key]: value
    }));
  }, [setRecipeData]);

  const {
    handleTabChange,
    handleSearchFocus,
    handleSearchBlur,
    openModal,
    closeModal,
    openProcessCreatorModal,
    closeProcessCreatorModal,
    handleInputChange,
    handleSelectChange,
    handleNumberInputChange,
    handleProcessSelection,
    handleSave,
    handleClear,
    formatDisplayValue
  } = useRecipeInterface({ 
    recipeData, 
    preparationsData, 
    updateRecipeData 
  });

  // ==== HOOKS DE CÁLCULOS (CONECTADOS) ====
  const {
    calculateRecipeMetrics: hookCalculateRecipeMetrics,
    formatters
  } = useRecipeCalculations();

  // ==== HOOKS DE BUSCA (CONECTADOS) ====
  const {
    searchQuery: searchQueryRecipe,
    searchOpen: searchOpenRecipe,
    filteredRecipes,
    loading: searchLoading,
    handleSearchChange,
    handleSearchFocus: handleSearchFocusRecipe,
    handleSearchBlur: handleSearchBlurRecipe,
    handleRecipeSelect,
    getSearchStats,
    refreshRecipes,
    setSearchQuery: setRecipeSearchQuery
  } = useRecipeSearch();

  // ==== HOOKS DE CONFIGURAÇÃO (CONECTADOS) ====
  const {
    config,
    configSaving,
    loading: configLoading,
    categoryTypes,
    selectedCategoryType,
    updateConfig,
    saveConfiguration,
    saveRecipe: saveRecipeConfig,
    getProcessTypes,
    setSelectedCategoryType
  } = useRecipeConfig();

  // ==== HOOKS DE CATEGORIAS (CONECTADOS) ====
  const {
    categories: availableCategories,
    loading: categoriesLoading,
    error: categoriesError,
    getCategoryInfo,
    getCategoryDisplayName,
    getCategoriesWithCurrent,
    reloadCategories
  } = useRecipeCategories();

  // ==== HOOKS DE INGREDIENTES (CONECTADOS) ====
  const {
    ingredients: availableIngredients,
    loading: ingredientsLoading,
    searchTerm: ingredientModalSearchTerm,
    filteredIngredients,
    handleSearchChange: handleIngredientSearchChange,
    loadIngredients,
    getIngredientById,
    clearSearch: clearIngredientSearch
  } = useIngredientSearch();

  // Estados para modal de ingredientes
  const [ingredientModalOpen, setIngredientModalOpen] = useState(false);
  const [currentPrepIndexForIngredient, setCurrentPrepIndexForIngredient] = useState(null);

  // Estados para modal de receitas
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [currentPrepIndexForRecipe, setCurrentPrepIndexForRecipe] = useState(null);

  // Estados para controle de expansão e edição de cards
  const [expandedCards, setExpandedCards] = useState({});
  const [editingTitle, setEditingTitle] = useState(null);
  const [tempTitle, setTempTitle] = useState('');

  // ==== FUNÇÕES DE CARREGAMENTO (como no Editar Cliente) ====
  const loadRecipeById = async (recipeId) => {
    if (!recipeId) return;
    
    try {
      setLoading(true);
      
      const result = await loadRecipe(recipeId);
      if (result.success) {
        
        // Atualizar estados com os dados da receita (como no Editar Cliente)
        setRecipeData(result.recipe);
        setPreparationsData(result.preparations || []);
        setCurrentRecipeId(recipeId);
        setIsEditing(true);
        setIsDirty(false);
        
        toast({
          title: "Receita carregada",
          description: `"${result.recipe.name}" foi carregada para edição.`
        });
      } else {
        toast({
          title: "Erro ao carregar",
          description: "Não foi possível carregar a receita.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // ==== HANDLERS ESPECÍFICOS ====
  const handleRecipeInputChange = (e) => {
    handleInputChange(setRecipeData, e);
    setIsDirty(true);
  };

  const handleCategoryChange = (value) => {
    handleSelectChange(setRecipeData, 'category', value);
    setIsDirty(true);
  };

  const handlePrepTimeChange = (e) => {
    handleNumberInputChange(setRecipeData, 'prep_time', e.target.value);
    setIsDirty(true);
  };

  const handleSaveRecipe = async () => {
    if (!recipeData.name || recipeData.name.trim() === '') {
      toast({ title: "Erro de validação", description: "O nome da receita é obrigatório.", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      let finalPreparationsData = JSON.parse(JSON.stringify(preparationsData));
      let recipeDataToSave = { ...recipeData };

      const finalAssemblyStep = finalPreparationsData.slice().reverse().find(p => p.processes?.some(pr => ['assembly', 'portioning'].includes(pr)));

      if (finalAssemblyStep && finalAssemblyStep.sub_components && finalAssemblyStep.sub_components.length > 0) {
        const scaledPreparations = JSON.parse(JSON.stringify(finalPreparationsData));
        const weightFields = ['weight_frozen', 'weight_thawed', 'weight_raw', 'weight_clean', 'weight_pre_cooking', 'weight_cooked', 'weight_portioned', 'assembly_weight_kg'];

        for (const subComponent of finalAssemblyStep.sub_components) {
          const targetWeight = parseNumericValue(subComponent.assembly_weight_kg);
          const sourcePrep = scaledPreparations.find(p => p.id === subComponent.source_id);

          if (sourcePrep && targetWeight > 0) {
            const sourceMetrics = updateRecipeMetrics([sourcePrep], {}, {}).yield_weight;
            const currentYield = sourceMetrics;

            if (currentYield > 0 && Math.abs(targetWeight - currentYield) > 0.001) {
              const scalingFactor = targetWeight / currentYield;
              toast({ title: "Aplicando Auto-Escala", description: `Ajustando ingredientes de "${subComponent.name}" com fator ${scalingFactor.toFixed(2)}.` });

              sourcePrep.ingredients.forEach(ing => {
                weightFields.forEach(field => {
                  if (ing[field]) {
                    const originalValue = parseNumericValue(ing[field]);
                    if (originalValue > 0) {
                      const scaledValue = originalValue * scalingFactor;
                      ing[field] = scaledValue.toFixed(3).replace('.', ',');
                    }
                  }
                });
              });
            } 
          } 
        }
        finalPreparationsData = scaledPreparations;
      }

      const newMetrics = updateRecipeMetrics(finalPreparationsData, recipeDataToSave, recipeDataToSave);

      recipeDataToSave = {
        ...recipeDataToSave,
        ...newMetrics
      };
      
      const result = await saveRecipeConfig(recipeDataToSave, finalPreparationsData);

      if (result.success) {
        setIsDirty(false);
        toast({ title: "Receita Salva", description: `"${result.recipe.name}" foi salva com sucesso.` });

        setPreparationsData(finalPreparationsData);
        setRecipeData(recipeDataToSave);

        if (result.recipe && result.recipe.id && !recipeData.id) {
            setCurrentRecipeId(result.recipe.id);
            setIsEditing(true);
        }
        
        try {
          await refreshRecipes();
          if (isEditing && recipeDataToSave.name) {
            setRecipeSearchQuery(recipeDataToSave.name);
          }
        } catch (error) {
          console.error("Falha ao atualizar a lista de receitas após salvar.", error);
        }
      }
    } catch (error) {
      toast({ title: "Erro inesperado", description: "Ocorreu um erro inesperado ao salvar a receita.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClearRecipe = () => {
    handleClear(resetRecipeData, resetModals, setActiveTab);
  };

  const handleRefresh = () => {
    if (currentRecipeId) {
      loadRecipeById(currentRecipeId);
    } else {
      toast({
        title: "Nenhuma receita selecionada",
        description: "Por favor, busque e selecione uma receita para atualizar.",
        variant: "destructive"
      });
    }
  };

  // ==== HANDLERS PARA IMPORTAÇÃO DE RECEITA ====
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      const fileContent = await file.text();
      const recipesToUpload = JSON.parse(fileContent);

      const response = await fetch('/api/recipes/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipes: recipesToUpload }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Importação Concluída",
          description: result.message,
        });
        if (result.errors && result.errors.length > 0) {
          console.error("Erros de importação:", result.errors);
        }
        await refreshRecipes();
      } else {
        throw new Error(result.message || 'Falha ao importar receitas.');
      }
    } catch (error) {
      toast({
        title: "Erro na Importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if(fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ==== FUNÇÃO DE RECÁLCULO AUTOMÁTICO ====
  const recalculateRecipeMetrics = useCallback(() => {
    console.log("[UI] recalculateRecipeMetrics triggered.");
    const hasValidData = (preparationsData && preparationsData.length > 0) || 
                         (recipeData && (recipeData.name || recipeData.id));
    
    if (!hasValidData) {
      console.log("[UI] No valid data, skipping recalculation.");
      return;
    }
    
    try {
      if (!preparationsData || preparationsData.length === 0) {
        // ... (o código para zerar as métricas permanece o mesmo)
        return;
      }

      const metricsResult = updateRecipeMetrics(preparationsData, recipeData, recipeData);
      console.log("[UI] Metrics received from calculator:", JSON.stringify(metricsResult, null, 2));
      
      const newMetrics = metricsResult;
      const hasSignificantChange = 
        Math.abs((newMetrics.total_weight || 0) - (recipeData.total_weight || 0)) > 0.001 ||
        Math.abs((newMetrics.total_cost || 0) - (recipeData.total_cost || 0)) > 0.01 ||
        Math.abs((newMetrics.cuba_cost || 0) - (recipeData.cuba_cost || 0)) > 0.01;

      console.log(`[UI] Has significant change? ${hasSignificantChange}`);

      if (hasSignificantChange) {
        console.log("[UI] Significant change detected. Calling setRecipeData with new metrics.");
        setRecipeData(prev => {
          const updatedData = {
            ...prev,
            total_weight: newMetrics.total_weight,
            total_cost: newMetrics.total_cost,
            cost_per_kg_raw: newMetrics.cost_per_kg_raw,
            cost_per_kg_yield: newMetrics.cost_per_kg_yield,
            weight_field_name: newMetrics.weight_field_name,
            cost_field_name: newMetrics.cost_field_name,
            yield_weight: newMetrics.yield_weight,
            cuba_weight: newMetrics.cuba_weight,
            cuba_cost: newMetrics.cuba_cost
          };
          console.log("[UI] New data being set:", JSON.stringify(updatedData, null, 2));
          return updatedData;
        });
        
        if (metricsResult.updatedPreparations) {
          setPreparationsData(metricsResult.updatedPreparations);
        }
        
        setIsDirty(true);
      }
    } catch (error) {
      console.error("[UI] Error during recalculateRecipeMetrics:", error);
    }
  }, [preparationsData, recipeData, setRecipeData, setPreparationsData, setIsDirty]);

  // ==== EFFECT PARA RECÁLCULO AUTOMÁTICO (DEBOUNCED) ====
  useEffect(() => {
    const handler = setTimeout(() => {
      recalculateRecipeMetrics();
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [preparationsData, recalculateRecipeMetrics]);

  // ==== EFFECT PARA DEBUG DOS ESTADOS INICIAIS ====
  // Debug effect removed for production

  // ==== EFFECT PARA RECÁLCULO AUTOMÁTICO (REMOVIDO) ====
  // O useEffect a seguir foi removido para evitar o recálculo automático dos
  // ingredientes a cada alteração, o que impedia a edição manual dos campos.
  // O cálculo agora é feito apenas ao salvar a receita.

  // ==== EFFECT PARA REFRESH AUTOMÁTICO DE INGREDIENTES ====
  useEffect(() => {
    // Refresh automático de ingredientes quando componente monta
    const refreshIngredients = async () => {
      try {
        await useRecipeZustandStore.getState().refreshIngredientsIfNeeded();
      } catch (error) {
      }
    };

    refreshIngredients();

    // Refresh periódico a cada 30 segundos se a página estiver ativa
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshIngredients();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleOpenProcessModal = () => {
    openProcessCreatorModal(setIsProcessCreatorOpen, setSelectedProcesses);
  };

  const handleCloseProcessModal = () => {
    closeProcessCreatorModal(setIsProcessCreatorOpen, setSelectedProcesses);
  };

  const handleProcessToggle = (processId, checked) => {
    handleProcessSelection(setSelectedProcesses, processId, checked);
  };

  const handleCreateProcess = () => {
    if (selectedProcesses.length === 0) return;

    // Criar título do processo
    const prepCount = preparationsData.length;
    const processLabels = selectedProcesses
      .map(id => processTypes[id]?.label || id)
      .join(' + ');

    const newPreparation = {
      title: `${prepCount + 1}º Etapa: ${processLabels}`,
      processes: selectedProcesses,
      ingredients: [],
      sub_components: [],
      instructions: "",
      assembly_config: selectedProcesses.includes('assembly') ? {
        container_type: 'cuba',
        total_weight: '',
        units_quantity: '1',
        notes: ''
      } : undefined
    };

    addPreparation(preparationsData, setPreparationsData, newPreparation);
    handleCloseProcessModal();
    setIsDirty(true);
  };

  // Função para adicionar preparação do modal (usada pelo ProcessCreatorModal)
  const handleAddPreparationFromModal = (newPreparation) => {
    addPreparation(preparationsData, setPreparationsData, newPreparation);
    setIsDirty(true);
  };

  // ==== HANDLERS DE INGREDIENTES ====
  const handleOpenIngredientModal = (prepIndex) => {
    setCurrentPrepIndexForIngredient(prepIndex);
    setIngredientModalOpen(true);
    clearIngredientSearch();
  };

  const handleCloseIngredientModal = () => {
    setIngredientModalOpen(false);
    setCurrentPrepIndexForIngredient(null);
    clearIngredientSearch();
  };

  // ==== HANDLERS DE RECEITAS ====
  const handleOpenRecipeModal = (prepIndex) => {
    setCurrentPrepIndexForRecipe(prepIndex);
    setRecipeModalOpen(true);
  };

  const handleCloseRecipeModal = () => {
    setRecipeModalOpen(false);
    setCurrentPrepIndexForRecipe(null);
  };

  const handleSelectRecipe = (recipe) => {
    if (currentPrepIndexForRecipe !== null) {
      const prepIndex = currentPrepIndexForRecipe;
      handleCloseRecipeModal();

      // Verificar se a receita já existe na preparação
      const currentPrep = preparationsData[prepIndex];
      const recipeExists = currentPrep?.recipes?.some(
        r => r.id === recipe.id
      );

      if (recipeExists) {
        toast({
          title: "Receita já existe",
          description: `"${recipe.name}" já foi adicionada a esta preparação.`,
          variant: "destructive"
        });
        return;
      }

      // Adicionar receita à preparação
      setPreparationsData(prev => {
        const newPreparations = [...prev];
        if (newPreparations[prepIndex]) {
          // Garantir que o array de receitas existe
          if (!newPreparations[prepIndex].recipes) {
            newPreparations[prepIndex].recipes = [];
          }

          // Adicionar a receita
          newPreparations[prepIndex] = {
            ...newPreparations[prepIndex],
            recipes: [...newPreparations[prepIndex].recipes, recipe]
          };
        }
        return newPreparations;
      });

      setIsDirty(true);

      toast({
        title: "Receita adicionada",
        description: `"${recipe.name}" foi adicionada à preparação.`
      });
    }
  };

  // ==== HANDLERS DE MONTAGEM/PORCIONAMENTO ====
  const openAddAssemblyItemModal = (prepIndex) => {
    setCurrentPrepIndexForAssembly(prepIndex);
    setIsAssemblyItemModalOpen(true);
  };

  const handleCloseAssemblyItemModal = () => {
    setIsAssemblyItemModalOpen(false);
    setCurrentPrepIndexForAssembly(0);
  };

  const addItemToPreparation = (itemData, prepIndex) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      const targetPrep = newPreparations[prepIndex];
      
      if (!targetPrep) {
        return prev;
      }
      
      // Determine the correct type based on the itemData
      let itemType = 'preparation'; // default
      if (itemData.isRecipe) {
        itemType = 'recipe';
      } else if (itemData.isIngredient) {
        itemType = 'ingredient';
      }

      const newSubComponent = {
        id: `${itemData.id}_${Date.now()}`,
        source_id: itemData.id,
        name: itemData.name,
        type: itemType, // Use the corrected type
        // Pass the price through for ingredients
        current_price: itemData.current_price || 0, 
        input_yield_weight: String(itemData.yield_weight || 0).replace('.', ','),
        input_total_cost: String(itemData.total_cost || 0).replace('.', ','),
        weight_portioned: '',
        yield_weight: '',
        total_cost: '',
        assembly_weight_kg: ''
      };
      
      // Adicionar aos sub_components
      newPreparations[prepIndex] = {
        ...targetPrep,
        sub_components: [...(targetPrep.sub_components || []), newSubComponent]
      };
      
      return newPreparations;
    });
    
    setIsDirty(true);
    
    toast({
      title: "Item adicionado",
      description: `"${itemData.name}" foi adicionado à preparação.`
    });
    
    handleCloseAssemblyItemModal();
  };

  const handleSelectIngredient = (ingredient) => {
    if (currentPrepIndexForIngredient !== null) {
      // Fechar modal imediatamente para evitar múltiplas chamadas
      const prepIndex = currentPrepIndexForIngredient;
      handleCloseIngredientModal();
      
      // Verificar se o ingrediente já existe na preparação
      const currentPrep = preparationsData[prepIndex];
      const ingredientExists = currentPrep?.ingredients?.some(
        ing => ing.ingredient_id === ingredient.id || ing.name === ingredient.name || ing.id === ingredient.id
      );
      
      if (ingredientExists) {
        toast({
          title: "Ingrediente já existe",
          description: `"${ingredient.name}" já foi adicionado a esta preparação.`,
          variant: "destructive"
        });
        return;
      }
      
      // Criar um novo ingrediente com ID único para evitar duplicatas
      const newIngredient = {
        ...ingredient,
        id: `${ingredient.id}_${Date.now()}`, // ID único baseado no timestamp
        ingredient_id: ingredient.id, // Manter referência ao ingrediente original
        // Inicializar campos de peso como strings
        weight_frozen: '',
        weight_thawed: '',
        weight_raw: '',
        weight_clean: '',
        weight_pre_cooking: '',
        weight_cooked: '',
        weight_portioned: '',
        current_price: String(ingredient.current_price || '').replace('.', ',')
      };
      
      // Adicionar ingrediente com implementação direta para evitar problemas no hook
      setPreparationsData(prev => {
        const newPreparations = [...prev];
        if (newPreparations[prepIndex]) {
          newPreparations[prepIndex] = {
            ...newPreparations[prepIndex],
            ingredients: [...(newPreparations[prepIndex].ingredients || []), newIngredient]
          };
        }
        return newPreparations;
      });
      setIsDirty(true);
      
      toast({
        title: "Ingrediente adicionado",
        description: `"${ingredient.name}" foi adicionado à preparação.`
      });
    }
  };

  const handleSaveConfig = async () => {
    const result = await saveConfiguration(selectedCategoryType);
    if (result.success) {
      setShowConfigDialog(false);
    }
  };

  // ==== HANDLERS PARA EXPANSÃO E EDIÇÃO DE CARDS ====
  const toggleCardExpansion = (prepId) => {
    setExpandedCards(prev => {
      // Se não existe, está expandido por padrão (true)
      // Então o toggle deve setar para false
      const currentState = prev[prepId] !== false; // true se expandido
      return {
        ...prev,
        [prepId]: !currentState
      };
    });
  };

  // ==== HANDLER PARA DRAG AND DROP ====
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // Reordenar o array
    const newPreparations = Array.from(preparationsData);
    const [removed] = newPreparations.splice(sourceIndex, 1);
    newPreparations.splice(destinationIndex, 0, removed);

    // Atualizar os títulos com a nova numeração
    const updatedPreparations = newPreparations.map((prep, index) => {
      // Extrair a parte do título sem o número
      const titleWithoutNumber = prep.title.replace(/^\d+º Etapa:\s*/, '');

      return {
        ...prep,
        title: `${index + 1}º Etapa: ${titleWithoutNumber}`
      };
    });

    setPreparationsData(updatedPreparations);
    setIsDirty(true);
  };

  const startEditingTitle = (prepIndex, currentTitle) => {
    setEditingTitle(prepIndex);
    // Remover o número da etapa para edição
    const titleWithoutNumber = currentTitle.replace(/^\d+º Etapa:\s*/, '');
    setTempTitle(titleWithoutNumber);
  };

  const cancelEditingTitle = () => {
    setEditingTitle(null);
    setTempTitle('');
  };

  const saveTitle = (prepIndex) => {
    if (tempTitle.trim()) {
      setPreparationsData(prev => {
        const newData = [...prev];
        if (newData[prepIndex]) {
          // Manter o número da etapa e atualizar apenas o conteúdo
          newData[prepIndex].title = `${prepIndex + 1}º Etapa: ${tempTitle.trim()}`;
        }
        return newData;
      });
      setIsDirty(true);
    }
    setEditingTitle(null);
    setTempTitle('');
  };

  // Handler para quando uma receita é selecionada na busca
  const handleRecipeSelection = useCallback((selectedRecipe) => {
    if (!selectedRecipe) {
      return;
    }


    // Popular dados básicos da receita - usar todos os dados da receita selecionada
    const newRecipeData = {
      ...selectedRecipe, // Usar todos os dados da receita
      // Garantir valores padrão para campos que podem estar undefined
      name: selectedRecipe.name || "",
      name_complement: selectedRecipe.name_complement || "",
      category: selectedRecipe.category || "",
      prep_time: selectedRecipe.prep_time || 0,
      total_weight: selectedRecipe.total_weight || 0,
      yield_weight: selectedRecipe.yield_weight || 0,
      cuba_weight: selectedRecipe.cuba_weight || 0,
      total_cost: selectedRecipe.total_cost || 0,
      cost_per_kg_raw: selectedRecipe.cost_per_kg_raw || 0,
      cost_per_kg_yield: selectedRecipe.cost_per_kg_yield || 0,
      instructions: selectedRecipe.instructions || "",
      active: selectedRecipe.active !== undefined ? selectedRecipe.active : true
    };

    setRecipeData(newRecipeData);

    // Se há dados de preparação, carregá-los também
    if (selectedRecipe.preparations && Array.isArray(selectedRecipe.preparations)) {
      setPreparationsData(selectedRecipe.preparations);
    } else {
      setPreparationsData([]);
    }

    // Marcar como editando uma receita existente
    setIsEditing(true);
    setCurrentRecipeId(selectedRecipe.id);
    setIsDirty(false); // Não está sujo ainda, acabou de carregar
    
    // Forçar recálculo das métricas após um pequeno delay para garantir que os estados foram atualizados
    setTimeout(() => {
      recalculateRecipeMetrics();
    }, 100);
  }, [setRecipeData, setPreparationsData, setIsEditing, setCurrentRecipeId, setIsDirty, recalculateRecipeMetrics]);


  // ==== CÁLCULOS AUTOMÁTICOS ====
  // Removed duplicate calculation - handled in useRecipeInterface hook

  // ==== FUNÇÃO DE RENDERIZAÇÃO DA TABELA DE INGREDIENTES ====
  const renderIngredientTable = (prep, prepIndex) => {
    const processes = prep.processes || [];
    const hasProcess = (processName) => processes.includes(processName);
    const ingredients = prep.ingredients || [];
    
    // Casos especiais: Assembly ou Portioning puros (sem outros processos)
    const isAssemblyOnly = hasProcess('assembly') && 
      !hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking');
    
    const isPortioningOnly = hasProcess('portioning') && 
      !hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking') && !hasProcess('assembly');

    // Para processos puros de Assembly ou Portioning, usar o componente especializado
    if (isAssemblyOnly || isPortioningOnly) {
      return (
        <div className="space-y-4">
          {/* Componente especializado para Assembly/Portioning (botão agora no header) */}
          <AssemblySubComponents
            subComponents={prep.sub_components || []}
            onUpdateSubComponents={(components) => {
              setPreparationsData(prev => {
                const newData = [...prev];
                if (newData[prepIndex]) {
                  newData[prepIndex].sub_components = components;
                }
                return newData;
              });
              setIsDirty(true);
            }}
            preparationsData={preparationsData}
            assemblyConfig={prep.assembly_config || {}}
            onAssemblyConfigChange={(field, value) => {
              setPreparationsData(prev => {
                const newData = [...prev];
                if (newData[prepIndex]) {
                  if (!newData[prepIndex].assembly_config) {
                    newData[prepIndex].assembly_config = {};
                  }
                  newData[prepIndex].assembly_config[field] = value;
                }
                return newData;
              });
              setIsDirty(true);
            }}
            totalYieldWeight={prep.total_yield_weight_prep || 0}
            onRemoveSubComponent={(index) => {
              setPreparationsData(prev => {
                const newData = [...prev];
                if (newData[prepIndex]?.sub_components) {
                  newData[prepIndex].sub_components.splice(index, 1);
                }
                return newData;
              });
              setIsDirty(true);
            }}
            showAssemblyConfig={true}
            showComponentsTable={true}
            onAddComponent={() => openAddAssemblyItemModal(prepIndex)}
            addComponentLabel={isAssemblyOnly ? 'Adicionar Preparo/Receita' : 'Adicionar Produto'}
            addComponentClassName={isAssemblyOnly ? 'border-indigo-300 text-indigo-600 hover:bg-indigo-50' : 'border-teal-300 text-teal-600 hover:bg-teal-50'}
          />

          {/* Área de instruções */}
          <div>
            <label className="text-sm font-medium mb-2 block text-gray-700">
              Modo de Preparo desta Etapa
            </label>
            <textarea
              value={prep.instructions || ''}
              onChange={(e) => {
                setPreparationsData(prev => {
                  const newData = [...prev];
                  if (newData[prepIndex]) {
                    newData[prepIndex].instructions = e.target.value;
                  }
                  return newData;
                });
                setIsDirty(true);
              }}
              placeholder="Descreva o modo de preparo desta etapa..."
              className="w-full p-3 border border-gray-200 rounded-lg resize-none min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      );
    }
    
    // Mapeamento de cores para processos normais
    const processColors = {
      'defrosting': { bg: 'bg-blue-50/50', text: 'text-blue-600' },
      'cleaning': { bg: 'bg-green-50/50', text: 'text-green-600' },
      'cooking': { bg: 'bg-orange-50/50', text: 'text-orange-600' },
      'portioning': { bg: 'bg-teal-50/50', text: 'text-teal-600' }
    };
    
    // Processos ordenados conforme a sequência natural
    const orderedActiveProcesses = ['defrosting', 'cleaning', 'cooking', 'portioning']
      .filter(p => hasProcess(p));

    // Para casos onde não há ingredientes nem sub_components
    if (ingredients.length === 0 && prep.sub_components?.length === 0) {
      return (
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className="text-gray-500 mb-3">
            Nenhum ingrediente adicionado ainda
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleOpenIngredientModal(prepIndex)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Ingrediente
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Botão para adicionar ingredientes - processos normais */}
        <div className="flex gap-3 justify-start">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleOpenIngredientModal(prepIndex)}
            className="border-dashed hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Ingrediente
          </Button>
        </div>

        <div className="bg-white rounded-xl overflow-x-auto shadow-sm border">
          <Table>
            <TableHeader>
            {/* Primeira linha do cabeçalho - grupos de colunas */}
            <TableRow>
              <TableHead colSpan="3" className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-center border-b">
                Dados Ingrediente
              </TableHead>
              {orderedActiveProcesses.map(processId => {
                const processInfo = processTypes[processId];
                const colors = processColors[processId] || { bg: 'bg-gray-50/50', text: 'text-gray-600' };
                let colSpan = 2;
                
                // Lógica de colspan baseada no processo
                if (processId === 'defrosting') {
                  colSpan = 3;
                } else if (processId === 'cleaning') {
                  colSpan = hasProcess('defrosting') ? 3 : 3;
                } else if (processId === 'cooking') {
                  colSpan = 3;
                } else if (processId === 'portioning') {
                  if (!hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking')) {
                    colSpan = 3;
                  } else {
                    colSpan = 2;
                  }
                }
                
                return (
                  <TableHead 
                    key={processId} 
                    colSpan={colSpan} 
                    className={`px-4 py-2 ${colors.bg} font-medium ${colors.text} text-center border-b`}
                  >
                    {processInfo.label}
                  </TableHead>
                );
              })}
              <TableHead colSpan="2" className="px-4 py-2 bg-purple-50/50 font-medium text-purple-600 text-center border-b">
                Dados Rendimento
              </TableHead>
            </TableRow>

            {/* Segunda linha do cabeçalho - colunas específicas */}
            <TableRow>
              <TableHead className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-left whitespace-nowrap">
                Ingrediente
              </TableHead>
              <TableHead className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-center whitespace-nowrap">
                Preço/kg (Bruto)
              </TableHead>
              <TableHead className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-center whitespace-nowrap">
                Preço/kg (Líquido)
              </TableHead>
              
              {hasProcess('defrosting') && (
                <>
                  <TableHead className="px-4 py-2 bg-blue-50/50 font-medium text-blue-600 text-center whitespace-nowrap">
                    Peso Congelado
                  </TableHead>
                  <TableHead className="px-4 py-2 bg-blue-50/50 font-medium text-blue-600 text-center whitespace-nowrap">
                    Peso Resfriado
                  </TableHead>
                  <TableHead className="px-4 py-2 bg-blue-50/50 font-medium text-blue-600 text-center whitespace-nowrap">
                    Perda Desc.(%)
                  </TableHead>
                </>
              )}
              
              {hasProcess('cleaning') && (
                <>
                  {!hasProcess('defrosting') && (
                    <TableHead className="px-4 py-2 bg-green-50/50 font-medium text-green-600 text-center whitespace-nowrap">
                      Peso Bruto (Limpeza)
                    </TableHead>
                  )}
                  {hasProcess('defrosting') && (
                    <TableHead className="px-4 py-2 bg-green-50/50 font-medium text-green-600 text-center whitespace-nowrap">
                      Peso Entrada (Limpeza)
                    </TableHead>
                  )}
                  <TableHead className="px-4 py-2 bg-green-50/50 font-medium text-green-600 text-center whitespace-nowrap">
                    Pós Limpeza
                  </TableHead>
                  <TableHead className="px-4 py-2 bg-green-50/50 font-medium text-green-600 text-center whitespace-nowrap">
                    Perda Limpeza(%)
                  </TableHead>
                </>
              )}
              
              {hasProcess('cooking') && (
                <>
                  <TableHead className="px-4 py-2 bg-orange-50/50 font-medium text-orange-600 text-center whitespace-nowrap">
                    Pré Cocção
                  </TableHead>
                  <TableHead className="px-4 py-2 bg-orange-50/50 font-medium text-orange-600 text-center whitespace-nowrap">
                    Pós Cocção
                  </TableHead>
                  <TableHead className="px-4 py-2 bg-orange-50/50 font-medium text-orange-600 text-center whitespace-nowrap">
                    Perda Cocção(%)
                  </TableHead>
                </>
              )}
              
              {hasProcess('portioning') && (
                <>
                  {!hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking') && (
                    <TableHead className="px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center whitespace-nowrap">
                      Peso Bruto (Porc.)
                    </TableHead>
                  )}
                  <TableHead className="px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center whitespace-nowrap">
                    Pós Porcionamento
                  </TableHead>
                  <TableHead className="px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center whitespace-nowrap">
                    Perda Porcion.(%)
                  </TableHead>
                </>
              )}
              
              <TableHead className="px-4 py-2 bg-purple-50/50 font-medium text-purple-600 text-center whitespace-nowrap">
                Rendimento(%)
              </TableHead>
              <TableHead className="px-4 py-2 bg-purple-50/50 font-medium text-purple-600 text-center">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {ingredients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <ClipboardList className="h-8 w-8 text-gray-400" />
                    <span>Nenhum ingrediente adicionado</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              ingredients.map((ingredient, ingredientIndex) => 
                renderIngredientRow(ingredient, prepIndex, ingredientIndex, prep)
              )
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    );
  };

  // ==== FUNÇÃO DE RENDERIZAÇÃO DE LINHA DE INGREDIENTE ====
  const renderIngredientRow = (ingredient, prepIndex, ingredientIndex, prep) => {
    const processes = prep.processes || [];
    const hasProcess = (processName) => processes.includes(processName);
    
    // Funções auxiliares para cálculos (versões simplificadas)
    const parseNumericValue = (value) => {
      if (!value) return 0;
      const cleaned = String(value).replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };
    
    const calculateLoss = (initial, final) => {
      const initialNum = parseNumericValue(initial);
      const finalNum = parseNumericValue(final);
      if (initialNum === 0) return 0;
      return ((initialNum - finalNum) / initialNum) * 100;
    };
    
    const calculateYield = () => {
      // Encontrar o peso inicial e final corretos baseado nos processos
      let initialWeight = 0;
      let finalWeight = 0;
      
      // Determinar peso inicial (primeiro processo da cadeia)
      if (hasProcess('defrosting')) {
        initialWeight = parseNumericValue(ingredient.weight_frozen);
      } else if (hasProcess('cleaning')) {
        initialWeight = parseNumericValue(ingredient.weight_raw);
      } else if (hasProcess('cooking')) {
        initialWeight = parseNumericValue(ingredient.weight_pre_cooking) || 
                       parseNumericValue(ingredient.weight_raw);
      } else if (hasProcess('portioning')) {
        initialWeight = parseNumericValue(ingredient.weight_raw);
      }
      
      // Determinar peso final (último processo da cadeia)
      if (hasProcess('portioning')) {
        finalWeight = parseNumericValue(ingredient.weight_portioned);
      } else if (hasProcess('cooking')) {
        finalWeight = parseNumericValue(ingredient.weight_cooked);
      } else if (hasProcess('cleaning')) {
        finalWeight = parseNumericValue(ingredient.weight_clean);
      } else if (hasProcess('defrosting')) {
        finalWeight = parseNumericValue(ingredient.weight_thawed);
      }
      
      // Se não há peso inicial, retornar 0
      if (initialWeight === 0) return 0;
      
      // Calcular rendimento
      return (finalWeight / initialWeight) * 100;
    };

    const updateIngredientField = (field, value) => {
      updateIngredient(
        preparationsData,
        setPreparationsData,
        prepIndex,
        ingredientIndex,
        field,
        value
      );
      setIsDirty(true);
    };

    return (
      <TableRow key={`${prepIndex}-${ingredientIndex}-${ingredient.id || ingredient.ingredient_id}`} className="border-b border-gray-50 hover:bg-gray-50/50">
        {/* Nome do ingrediente */}
        <TableCell className="font-medium px-4 py-2">
          {ingredient.name}
        </TableCell>
        
        {/* Preço bruto */}
        <TableCell className="text-center px-4 py-2">
          {(() => {
            // Buscar preço atual dinamicamente se ingrediente tem ingredient_id
            const currentPrice = ingredient.ingredient_id 
              ? useRecipeZustandStore.getState().getIngredientCurrentPrice(ingredient.ingredient_id)
              : parseNumericValue(ingredient.current_price);
            return formatCurrency(currentPrice);
          })()}
        </TableCell>
        
        {/* Preço líquido - calculado */}
        <TableCell className="text-center px-4 py-2">
          {(() => {
            // Buscar preço atual dinamicamente
            const brutPrice = ingredient.ingredient_id 
              ? useRecipeZustandStore.getState().getIngredientCurrentPrice(ingredient.ingredient_id)
              : parseNumericValue(ingredient.current_price);
            const yieldPercent = calculateYield();
            const liquidPrice = yieldPercent > 0 ? brutPrice / (yieldPercent / 100) : brutPrice;
            return formatCurrency(liquidPrice);
          })()}
        </TableCell>
        
        {/* Campos de descongelamento */}
        {hasProcess('defrosting') && (
          <>
            <TableCell className="px-4 py-2">
              <Input
                type="text"
                value={ingredient.weight_frozen || ''}
                onChange={(e) => updateIngredientField('weight_frozen', e.target.value)}
                className="w-24 h-8 text-center text-xs"
                placeholder="0,000"
              />
            </TableCell>
            <TableCell className="px-4 py-2">
              <Input
                type="text"
                value={ingredient.weight_thawed || ''}
                onChange={(e) => updateIngredientField('weight_thawed', e.target.value)}
                className="w-24 h-8 text-center text-xs"
                placeholder="0,000"
              />
            </TableCell>
            <TableCell className="text-center px-4 py-2">
              <Badge variant="secondary">
                {calculateLoss(ingredient.weight_frozen, ingredient.weight_thawed).toFixed(1)}%
              </Badge>
            </TableCell>
          </>
        )}
        
        {/* Campos de limpeza */}
        {hasProcess('cleaning') && (
          <>
            {!hasProcess('defrosting') && (
              <TableCell className="px-4 py-2">
                <Input
                  type="text"
                  value={ingredient.weight_raw || ''}
                  onChange={(e) => updateIngredientField('weight_raw', e.target.value)}
                  className="w-24 h-8 text-center text-xs"
                  placeholder="0,000"
                />
              </TableCell>
            )}
            {hasProcess('defrosting') && (
              <TableCell className="px-4 py-2">
                <Input
                  type="text"
                  value={ingredient.weight_thawed || ''}
                  readOnly
                  className="w-24 h-8 text-center text-xs bg-gray-50 cursor-not-allowed"
                  placeholder="0,000"
                  title="Valor vem do processo de descongelamento"
                />
              </TableCell>
            )}
            <TableCell className="px-4 py-2">
              <Input
                type="text"
                value={ingredient.weight_clean || ''}
                onChange={(e) => updateIngredientField('weight_clean', e.target.value)}
                className="w-24 h-8 text-center text-xs"
                placeholder="0,000"
              />
            </TableCell>
            <TableCell className="text-center px-4 py-2">
              <Badge variant="secondary">
                {(() => {
                  // Determinar peso inicial para cálculo de perda de limpeza
                  let initialWeight = 0;
                  if (hasProcess('defrosting')) {
                    // Se tem descongelamento, usar peso descongelado
                    initialWeight = parseNumericValue(ingredient.weight_thawed);
                  } else {
                    // Se não tem descongelamento, usar peso bruto
                    initialWeight = parseNumericValue(ingredient.weight_raw);
                  }
                  const cleanWeight = parseNumericValue(ingredient.weight_clean);
                  const loss = calculateLoss(initialWeight, cleanWeight);
                  return `${loss.toFixed(1)}%`;
                })()}
              </Badge>
            </TableCell>
          </>
        )}
        
        {/* Campos de cocção */}
        {hasProcess('cooking') && (
          <>
            <TableCell className="px-4 py-2">
              <Input
                type="text"
                value={ingredient.weight_pre_cooking || ''}
                onChange={(e) => updateIngredientField('weight_pre_cooking', e.target.value)}
                className="w-24 h-8 text-center text-xs"
                placeholder="0,000"
                title="Peso antes da cocção"
              />
            </TableCell>
            <TableCell className="px-4 py-2">
              <Input
                type="text"
                value={ingredient.weight_cooked || ''}
                onChange={(e) => updateIngredientField('weight_cooked', e.target.value)}
                className="w-24 h-8 text-center text-xs"
                placeholder="0,000"
                title="Peso depois da cocção"
              />
            </TableCell>
            <TableCell className="text-center px-4 py-2">
              <Badge variant="secondary">
                {(() => {
                  // Para cocção, usar peso pré-cocção como base
                  const preWeight = parseNumericValue(ingredient.weight_pre_cooking);
                  const postWeight = parseNumericValue(ingredient.weight_cooked);
                  
                  // Se não há peso pré-cocção, usar peso bruto ou peso limpo como fallback
                  let initialWeight = preWeight;
                  if (initialWeight === 0) {
                    initialWeight = parseNumericValue(ingredient.weight_clean) || 
                                   parseNumericValue(ingredient.weight_thawed) || 
                                   parseNumericValue(ingredient.weight_raw);
                  }
                  
                  const loss = calculateLoss(initialWeight, postWeight);
                  return `${loss.toFixed(1)}%`;
                })()}
              </Badge>
            </TableCell>
          </>
        )}
        
        {/* Campos de porcionamento */}
        {hasProcess('portioning') && (
          <>
            {!hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking') && (
              <TableCell className="px-4 py-2">
                <Input
                  type="text"
                  value={ingredient.weight_raw || ''}
                  onChange={(e) => updateIngredientField('weight_raw', e.target.value)}
                  className="w-24 h-8 text-center text-xs"
                  placeholder="0,000"
                />
              </TableCell>
            )}
            <TableCell className="px-4 py-2">
              <Input
                type="text"
                value={ingredient.weight_portioned || ''}
                onChange={(e) => updateIngredientField('weight_portioned', e.target.value)}
                className="w-24 h-8 text-center text-xs"
                placeholder="0,000"
              />
            </TableCell>
            <TableCell className="text-center px-4 py-2">
              <Badge variant="secondary">
                {calculateLoss(
                  ingredient.weight_raw || ingredient.weight_cooked || ingredient.weight_clean,
                  ingredient.weight_portioned
                ).toFixed(1)}%
              </Badge>
            </TableCell>
          </>
        )}
        
        {/* Rendimento total */}
        <TableCell className="text-center px-4 py-2">
          <Badge variant="default">
            {calculateYield().toFixed(1)}%
          </Badge>
        </TableCell>
        
        {/* Ações */}
        <TableCell className="px-4 py-2">
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-blue-50"
              title="Editar ingrediente"
            >
              <Edit className="h-3 w-3 text-blue-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeIngredient(
                preparationsData,
                setPreparationsData,
                prepIndex,
                ingredientIndex
              )}
              className="h-7 w-7 rounded-full hover:bg-red-50"
              title="Remover ingrediente"
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // ==== EARLY RETURNS ====
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-500">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }


  // ==== RENDER PRINCIPAL ====
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Card de Cabeçalho */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <ClipboardList className="h-5 w-5" />
                  <h1 className="text-xl font-semibold">Ficha Técnica</h1>
                  {isDirty && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                      Não salvo
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm">
                  Crie e estruture suas receitas com detalhes profissionais
                </p>
              </div>
              <RefreshButton 
                text="Atualizar Dados"
                onClick={handleRefresh}
                className="shrink-0"
              />
            </div>

            {/* Barra de Busca */}
            <div className="relative search-container">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQueryRecipe}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={handleSearchFocusRecipe}
                onBlur={handleSearchBlurRecipe}
                placeholder="Buscar receita..."
                className="w-full pl-10 pr-12 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Settings
                  className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer"
                  onClick={() => setShowConfigDialog(true)}
                />
              </div>

              {searchOpenRecipe && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  <div className="p-2">
                    {searchLoading ? (
                      <div className="p-3 text-center text-gray-500 flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando receitas...
                      </div>
                    ) : filteredRecipes.length === 0 ? (
                      <div className="p-3 text-center text-gray-500">
                        {searchQueryRecipe.trim() ? 'Nenhuma receita encontrada' : 'Digite para buscar receitas'}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {filteredRecipes.map(recipe => (
                          <div
                            key={recipe.id}
                            className="p-2 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
                            onClick={() => handleRecipeSelect(recipe.id, handleRecipeSelection)}
                          >
                            <CookingPot className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{recipe.name}</div>
                              {recipe.category && (
                                <div className="text-xs text-gray-500">{recipe.category}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button variant="outline" className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-2">
                <Printer className="h-4 w-4" />
                Ficha Técnica Completa
              </Button>

              <Button variant="outline" className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Ficha de Coleta
              </Button>

              <Button
                variant="outline"
                onClick={handleClearRecipe}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-2"
              >
                <FilePlus className="h-4 w-4" />
                Nova Ficha
              </Button>

              <Button
                variant="outline"
                onClick={handleImportClick}
                disabled={isUploading}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-2"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileUp className="h-4 w-4" />
                )}
                {isUploading ? 'Importando...' : 'Importar Ficha Técnica'}
              </Button>

              <div className="flex-grow"></div>

              <Button
                onClick={handleSaveRecipe}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Salvando...' : 'Salvar Ficha'}
              </Button>
            </div>
          </div>
        </div>

        {/* Card de Informações Básicas */}
        <Card className="bg-white shadow-sm border">
          <CardHeader className="bg-gray-50 border-b border-gray-200 px-6 py-4 rounded-t-lg">
            <CardTitle className="text-lg font-semibold text-gray-700">
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 items-start">
              <div>
                <Label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <span className="text-blue-500 mr-1.5">●</span> Nome Principal *
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={recipeData.name || ''}
                  onChange={handleRecipeInputChange}
                  placeholder="Ex: Maminha Assada"
                  required
                  className="w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="name_complement" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <span className="text-purple-500 mr-1.5">●</span> Complemento (opcional)
                </Label>
                <Input
                  id="name_complement"
                  name="name_complement"
                  value={recipeData.name_complement || ''}
                  onChange={handleRecipeInputChange}
                  placeholder="Ex: ao molho de mostarda"
                  className="w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="cuba_weight" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <span className="text-pink-500 mr-1.5">●</span> {recipeData.weight_field_name || 'Peso da Cuba'} (kg)
                  <span className="ml-auto text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">Calculado automaticamente</span>
                </Label>
                <Input
                  id="cuba_weight"
                  name="cuba_weight"
                  type="text"
                  value={formatDisplayValue(recipeData.cuba_weight, 'weight')}
                  readOnly
                  placeholder="Calculado pela soma das etapas de finalização"
                  className="w-full bg-gray-50 text-gray-600 cursor-not-allowed"
                  title="Este valor é calculado automaticamente pela soma das etapas de Porcionamento e Montagem"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  Categoria
                  {recipeData.category && !availableCategories.find(cat => cat.value === recipeData.category) && (
                    <span className="text-xs text-orange-500">
                      (Categoria personalizada)
                    </span>
                  )}
                </Label>
                <Select 
                  value={recipeData.category} 
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-400">
                    <SelectValue 
                      placeholder={categoriesLoading ? "Carregando categorias..." : "Selecione a categoria"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesLoading ? (
                      <SelectItem value="loading" disabled>Carregando categorias...</SelectItem>
                    ) : categoriesError ? (
                      <SelectItem value="error" disabled>Erro ao carregar categorias</SelectItem>
                    ) : availableCategories.length === 0 ? (
                      <SelectItem value="empty" disabled>Nenhuma categoria disponível</SelectItem>
                    ) : (
                      getCategoriesWithCurrent(recipeData.category).map(category => (
                        <SelectItem key={category.id} value={category.value}>
                          {category.name}
                          {category.id.startsWith('custom-') && (
                            <span className="text-xs text-gray-400 ml-1">(personalizada)</span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                  Tempo de Preparo (min)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={recipeData.prep_time || 0}
                  onChange={handlePrepTimeChange}
                  className="transition-all duration-200 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 hover:border-gray-400"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Informações de Custo e Peso */}
        <Card className="bg-white backdrop-blur-sm bg-opacity-90 border border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-700">
              Informações de Custo e Peso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200">
                <div className="text-sm font-medium text-gray-500 mb-1">Peso Total (Bruto)</div>
                <div className="text-xl font-bold flex items-center text-gray-700">
                  <span className="text-gray-400 mr-1">kg</span>
                  {formatDisplayValue(recipeData.total_weight, 'weight')}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-200">
                <div className="text-sm font-medium text-blue-600 mb-1">Peso Total (Rendimento)</div>
                <div className="text-xl font-bold flex items-center text-blue-700">
                  <span className="text-blue-400 mr-1">kg</span>
                  {formatDisplayValue(recipeData.yield_weight, 'weight')}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 hover:shadow-md transition-all duration-200">
                <div className="text-sm font-medium text-green-600 mb-1">Custo por Kg (Bruto)</div>
                <div className="text-xl font-bold flex items-center text-green-700">
                  <span className="text-green-400 mr-1">R$</span>
                  {formatDisplayValue(recipeData.cost_per_kg_raw, 'currency')}
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200 hover:shadow-md transition-all duration-200">
                <div className="text-sm font-medium text-indigo-600 mb-1">Custo por Kg (Rendimento)</div>
                <div className="text-xl font-bold flex items-center text-indigo-700">
                  <span className="text-indigo-400 mr-1">R$</span>
                  {formatDisplayValue(recipeData.cost_per_kg_yield, 'currency')}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 hover:shadow-md transition-all duration-200">
                <div className="text-sm font-medium text-purple-600 mb-1">{recipeData.weight_field_name || 'Peso da Cuba'}</div>
                <div className="text-xl font-bold flex items-center text-purple-700">
                  <span className="text-purple-400 mr-1">kg</span>
                  {formatDisplayValue(recipeData.cuba_weight, 'weight')}
                </div>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg border border-pink-200 hover:shadow-md transition-all duration-200">
                <div className="text-sm font-medium text-pink-600 mb-1">{recipeData.cost_field_name || 'Custo da Cuba'}</div>
                <div className="text-xl font-bold flex items-center text-pink-700">
                  <span className="text-pink-400 mr-1">R$</span>
                  {formatDisplayValue(
                    calculateCubaCost(recipeData.cuba_weight, recipeData.cost_per_kg_yield), 
                    'currency'
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sistema de Abas */}
        <Card className="bg-white shadow-sm border">
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => handleTabChange(setActiveTab, value)} 
            className="w-full"
          >
            <div className="border-b border-gray-200 px-6 pt-6">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                <TabsTrigger
                  value="ficha-tecnica"
                  className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Ficha Técnica
                </TabsTrigger>
                <TabsTrigger
                  value="pre-preparo"
                  className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm"
                >
                  <CookingPot className="h-4 w-4 mr-2" />
                  Pré Preparo
                </TabsTrigger>
                <TabsTrigger
                  value="edicao-rapida"
                  className="data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm"
                >
                  <List className="h-4 w-4 mr-2" />
                  Edição Rápida
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="ficha-tecnica" className="p-6 space-y-6">
              <div className="flex flex-wrap gap-3 mb-6">
                <Button
                  onClick={handleOpenProcessModal}
                  variant="outline"
                  className="border-dashed hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Processo
                </Button>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="preparations">
                  {(provided) => (
                    <div
                      className="space-y-6"
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      {preparationsData.length === 0 ? (
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <CookingPot className="h-10 w-10 text-blue-500" />
                            <h3 className="text-lg font-medium text-blue-800">Comece sua ficha técnica</h3>
                            <p className="text-blue-600 max-w-md mx-auto">
                              Para iniciar, adicione um novo processo utilizando o botão acima.
                            </p>
                          </div>
                        </div>
                      ) : (
                        preparationsData.map((prep, index) => {
                    const isExpanded = expandedCards[prep.id] !== false; // Expandido por padrão
                    const isEditingThisTitle = editingTitle === index;

                    return (
                      <Draggable key={prep.id} draggableId={prep.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                          >
                            <Card
                              className={`border-l-4 border-l-blue-400 ${
                                snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-400' : ''
                              }`}
                            >
                              <CardHeader className="bg-blue-50 border-b">
                                <div className="flex justify-between items-center gap-3">
                                  {/* Handle de Drag */}
                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-move p-1 hover:bg-blue-100 rounded"
                                  >
                                    <List className="h-4 w-4 text-blue-600" />
                                  </div>

                                  {/* Botão de Expandir/Recolher */}
                                  <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCardExpansion(prep.id)}
                              className="text-blue-600 hover:bg-blue-100"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>

                            {/* Título editável */}
                            <div className="flex-1 flex items-center gap-2">
                              {isEditingThisTitle ? (
                                <>
                                  <Input
                                    value={tempTitle}
                                    onChange={(e) => setTempTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        saveTitle(index);
                                      } else if (e.key === 'Escape') {
                                        cancelEditingTitle();
                                      }
                                    }}
                                    className="text-lg font-semibold"
                                    autoFocus
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => saveTitle(index)}
                                    className="text-green-600 hover:bg-green-50"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={cancelEditingTitle}
                                    className="text-gray-600 hover:bg-gray-100"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <CardTitle className="text-lg text-blue-800">
                                    {prep.title}
                                  </CardTitle>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditingTitle(index, prep.title)}
                                    className="text-blue-600 hover:bg-blue-100"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>

                            {/* Botão de Deletar */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePreparation(preparationsData, setPreparationsData, prep.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>

                        {isExpanded && (
                          <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Ocultar "Processos:" para Assembly/Portioning (já exibido dentro do IngredientTable) */}
                          {(() => {
                            const processes = prep.processes || [];
                            const isAssemblyOnly = processes.includes('assembly') &&
                              !processes.includes('defrosting') && !processes.includes('cleaning') && !processes.includes('cooking');
                            const isPortioningOnly = processes.includes('portioning') &&
                              !processes.includes('defrosting') && !processes.includes('cleaning') && !processes.includes('cooking') && !processes.includes('assembly');

                            if (isAssemblyOnly || isPortioningOnly) return null;

                            return (
                              <div>
                                <Label className="text-sm font-medium mb-2 block">
                                  Processos: {prep.processes?.map(p => processTypes[p]?.label).join(', ')}
                                </Label>
                              </div>
                            );
                          })()}

                          {/* Tabela de Ingredientes com Processos */}
                          <IngredientTable
                            prep={prep}
                            prepIndex={index}
                            onOpenIngredientModal={handleOpenIngredientModal}
                            onOpenRecipeModal={handleOpenRecipeModal}
                            onOpenAddAssemblyItemModal={openAddAssemblyItemModal}
                            onUpdatePreparation={(prepIdx, field, value) => {
                              setPreparationsData(prev => {
                                const newData = [...prev];
                                if (newData[prepIdx]) {
                                  newData[prepIdx][field] = value;
                                }
                                return newData;
                              });
                              setIsDirty(true);
                            }}
                            onUpdateIngredient={(prepIdx, ingIdx, field, value) => {
                              updateIngredient(
                                preparationsData,
                                setPreparationsData,
                                prepIdx,
                                ingIdx,
                                field,
                                value
                              );
                              setIsDirty(true);
                            }}
                            onUpdateRecipe={(prepIdx, recIdx, field, value) => {
                              setPreparationsData(prev => {
                                const newData = [...prev];
                                if (newData[prepIdx]?.recipes?.[recIdx]) {
                                  newData[prepIdx].recipes[recIdx][field] = value;
                                }
                                return newData;
                              });
                              setIsDirty(true);
                            }}
                            onRemoveIngredient={(prepIdx, ingIdx) => {
                              removeIngredient(
                                preparationsData,
                                setPreparationsData,
                                prepIdx,
                                ingIdx
                              );
                              setIsDirty(true);
                            }}
                            onRemoveRecipe={(prepIdx, recIdx) => {
                              setPreparationsData(prev => {
                                const newData = [...prev];
                                if (newData[prepIdx]?.recipes) {
                                  newData[prepIdx].recipes.splice(recIdx, 1);
                                }
                                return newData;
                              });
                              setIsDirty(true);
                              toast({
                                title: "Receita removida",
                                description: "A receita foi removida da preparação."
                              });
                            }}
                            preparations={preparationsData}
                          />

                          <div>
                            <Label className="text-sm font-medium mb-2 block">
                              Instruções
                            </Label>
                            <textarea
                              value={prep.instructions || ''}
                              onChange={(e) => updatePreparation(
                                preparationsData, 
                                setPreparationsData, 
                                index, 
                                'instructions', 
                                e.target.value
                              )}
                              placeholder="Descreva o modo de preparo desta etapa..."
                              className="w-full p-3 border border-gray-200 rounded-lg resize-none min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                          </CardContent>
                        )}
                      </Card>
                    </div>
                  )}
                </Draggable>
                    );
                  })
                )}
                {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </TabsContent>

            <TabsContent value="pre-preparo" className="p-6 bg-gray-50 rounded-b-lg">
              <div className="bg-purple-50 p-6 rounded-lg border border-purple-100 text-center">
                <div className="flex flex-col items-center gap-3">
                  <CookingPot className="h-10 w-10 text-purple-500" />
                  <h3 className="text-lg font-medium text-purple-800">Seção de Pré Preparo</h3>
                  <p className="text-purple-600 max-w-md mx-auto">
                    Configure os ingredientes e processos de pré preparo para suas receitas.
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="edicao-rapida" className="p-6 bg-gray-50 rounded-b-lg">
                <RecipeQuickEditor />
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Modal de Criação de Processo */}
      <ProcessCreatorModalComponent
        isOpen={isProcessCreatorOpen}
        onClose={handleCloseProcessModal}
        onAddPreparation={handleAddPreparationFromModal}
        preparationsLength={preparationsData.length}
        currentRecipeId={currentRecipeId}
      />
      
      {/* Modal de Configuração */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações da Ficha Técnica
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryType">Tipo de Categoria</Label>
              {configLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Carregando opções...
                </div>
              ) : categoryTypes.length === 0 ? (
                <div className="p-4 text-center text-gray-500 border border-dashed rounded">
                  Nenhum tipo de categoria encontrado
                </div>
              ) : (
                <Select
                  value={selectedCategoryType}
                  onValueChange={setSelectedCategoryType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tipo de categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryTypes.map((type) => {
                      // Suporte para diferentes estruturas de dados
                      const displayName = type.name || type.label || type.value;
                      const typeValue = type.value || type.id;
                      return (
                        <SelectItem key={type.id} value={typeValue}>
                          {displayName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={configSaving || !selectedCategoryType}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {configSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Seleção de Ingredientes */}
      <Dialog open={ingredientModalOpen} onOpenChange={setIngredientModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Selecionar Ingrediente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Campo de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar ingrediente..."
                value={ingredientModalSearchTerm}
                onChange={(e) => handleIngredientSearchChange(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Lista de resultados */}
            <div className="max-h-80 overflow-y-auto border rounded-lg">
              {ingredientsLoading ? (
                <div className="p-4 text-center text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando ingredientes...
                </div>
              ) : filteredIngredients.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {ingredientModalSearchTerm.trim() ? 'Nenhum ingrediente encontrado' : 'Digite para buscar ingredientes'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredIngredients.map(ingredient => (
                    <div
                      key={ingredient.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectIngredient(ingredient);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{ingredient.name}</div>
                          {ingredient.brand && (
                            <div className="text-xs text-gray-500">Marca: {ingredient.brand}</div>
                          )}
                          {ingredient.category && (
                            <div className="text-xs text-gray-500">Categoria: {ingredient.category}</div>
                          )}
                        </div>
                        <div className="text-right">
                          {ingredient.current_price && (
                            <div className="text-sm font-medium text-green-600">
                              {formatCurrency(ingredient.current_price)}/{ingredient.unit || 'kg'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseIngredientModal}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Seleção de Receitas */}
      <RecipeSelectorModal
        isOpen={recipeModalOpen}
        onClose={handleCloseRecipeModal}
        onSelectRecipe={handleSelectRecipe}
        currentRecipeId={currentRecipeId}
      />

      {/* Modal de Adição de Item à Montagem/Porcionamento - Usando componente organizado */}
      <AddAssemblyItemModal
        isOpen={isAssemblyItemModalOpen}
        onClose={handleCloseAssemblyItemModal}
        preparationsData={preparationsData}
        currentPrepIndex={currentPrepIndexForAssembly}
        ingredients={availableIngredients || []}
        currentRecipeId={currentRecipeId}
        onAddItem={(itemData) => addItemToPreparation(itemData, currentPrepIndexForAssembly)}
      />
    </div>
  );
}