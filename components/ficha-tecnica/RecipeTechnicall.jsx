'use client';


import React, { useState, useEffect, useRef, useCallback } from "react";
import { Recipe, Ingredient, Category, CategoryType, CategoryTree, User } from "@/app/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Trash2,
  Save,
  CookingPot,
  Edit,
  AlertTriangle,
  Loader2,
  Package,
  Settings,
  Printer,
  Search,
  ChevronsUpDown,
  Scissors,
  Layers,
  ClipboardList,
  ClipboardCheck,
  FilePlus,
  Clock,
  AlertCircle
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { createPageUrl } from "@/utils";
import { motion } from 'framer-motion';
import RecipeTechnicalPrintDialog from "@/components/receitas/RecipeTechnicalPrintDialog";
import RecipeTechnicalCollectDialog from "@/components/receitas/RecipeTechnicalCollectDialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import RecipeCalculator, { parseNumber, formatters } from '@/lib/recipeCalculator';
import { TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import IngredientPrePreparoItem from "@/components/receitas/IngredientPrePreparoItem";

export default function RecipeTechnical() {
  const router = useRouter();
  const { toast } = useToast();

  // TODOS OS HOOKS DEVEM SER DECLARADOS NO INÍCIO, SEM CONDIÇÕES
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecipeId, setCurrentRecipeId] = useState(null);

  const [defaultNames, setDefaultNames] = useState({
    preparation: "Preparo",
    group: "Grupo"
  });

  const [categories, setCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);

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

  const [isDetailedProcessDialogOpen, setDetailedProcessDialogOpen] = useState(false);
  const [currentIngredient, setCurrentIngredient] = useState(null);
  const [processFormData, setProcessFormData] = useState({
    weight_frozen: 0,
    weight_thawed: 0,
    weight_clean: 0,
    weight_cooked: 0
  });

  const [currentPrepIndexForDetail, setCurrentPrepIndexForDetail] = useState(null);
  const [currentItemIndexForDetail, setCurrentItemIndexForDetail] = useState(null);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [currentItemType, setCurrentItemType] = "ingredient";
  const [currentPrepIndex, setCurrentPrepIndex] = useState(0);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState("");

  const [showConfigDialog, setShowConfigDialog] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [allCategories, setAllCategories] = useState([]);

  const [defaultStartOption, setDefaultStartOption] = useState("preparation");
  const [configSaving, setConfigSaving] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allRecipes, setAllRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);

  const [isAssemblyItemModalOpen, setIsAssemblyItemModalOpen] = useState(false);
  const [currentPrepIndexForAssembly, setCurrentPrepIndexForAssembly] = useState(0);

  const [isProcessCreatorOpen, setIsProcessCreatorOpen] = useState(false);
  const [selectedProcesses, setSelectedProcesses] = useState([]);

  const [isDirty, setIsDirty] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isPrintCollectDialogOpen, setIsPrintCollectDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("ficha-tecnica");

  // Novos states para cópia de receita
  const [isRecipeCopyModalOpen, setIsRecipeCopyModalOpen] = useState(false);
  const [selectedSourceRecipe, setSelectedSourceRecipe] = useState(null);
  const [selectedStageLevel, setSelectedStageLevel] = useState('complete');
  const [sourceRecipeSearch, setSourceRecipeSearch] = useState('');
  const [filteredSourceRecipes, setFilteredSourceRecipes] = useState([]);
  const [sourceRecipeStages, setSourceRecipeStages] = useState([]);
  const [recipePreview, setRecipePreview] = useState(null);

  // REFS
  const saveTimeoutRef = useRef(null);
  const dirtyRecipeRef = useRef(null);
  const isMounted = useRef(false);
  const lastManualSaveTimestampRef = useRef(Date.now());

  // UTILITY FUNCTIONS
  const parseNumericValue = parseNumber;

  // CORREÇÃO: Função para calcular automaticamente o peso total da montagem
  const calculateAssemblyTotalWeight = useCallback((subComponents) => {
    if (!subComponents || subComponents.length === 0) return 0;
    
    return subComponents.reduce((total, sc) => {
      // Use parseNumericValue for robustness in parsing the string weight
      const weight = parseNumericValue(sc.assembly_weight_kg) || 0; 
      return total + weight;
    }, 0);
  }, [parseNumericValue]);

  // CORREÇÃO: Função de sanitização corrigida para assembly_config
  const sanitizeNumericData = useCallback((data) => {
    const sanitized = JSON.parse(JSON.stringify(data));

    const toNumber = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      if (typeof value === 'number') return isNaN(value) || !isFinite(value) ? 0 : value;
      if (typeof value === 'string') {
        const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.'); // Allow only digits, comma, dot, minus
        const num = parseFloat(cleaned);
        return isNaN(num) || !isFinite(num) ? 0 : num;
      }
      return 0;
    };

    const toString = (value) => {
      if (value === null || value === undefined) return '';
      return String(value);
    };

    // Sanitizar receita
    const recipeFields = [
      'prep_time', 'total_weight', 'yield_weight', 'cuba_weight', 'portion_size',
      'total_cost', 'cost_per_kg_raw', 'cost_per_kg_yield', 'yield_rate', 'cuba_cost', 'portion_cost'
    ];

    recipeFields.forEach(field => {
      if (sanitized[field] !== undefined) {
        const original = sanitized[field];
        sanitized[field] = toNumber(original);
        if (original !== sanitized[field]) {
        }
      }
    });

    // CORREÇÃO CRÍTICA: Sanitizar preparações com tratamento especial para assembly_config
    if (sanitized.processes && Array.isArray(sanitized.processes)) {
      sanitized.processes.forEach((prep, prepIdx) => {

        // Sanitizar campos numericos da preparação  
        const prepFields = ['total_raw_weight_prep', 'total_yield_weight_prep', 'total_cost_prep'];
        prepFields.forEach(field => {
          if (prep[field] !== undefined) {
            const original = prep[field];
            prep[field] = toNumber(original);
            if (original !== prep[field]) {
            }
          }
        });

        // CORREÇÃO CRÍTICA: assembly_config - campos devem ser STRINGS no banco
        if (prep.assembly_config && typeof prep.assembly_config === 'object') {
          
          // CAMPOS QUE DEVEM SER STRINGS no banco (conforme erro)
          const assemblyStringFields = ['total_weight', 'units_quantity'];
          assemblyStringFields.forEach(field => {
            if (prep.assembly_config[field] !== undefined) {
              const original = prep.assembly_config[field];
              prep.assembly_config[field] = toString(original);
            }
          });

          // Outros campos que são strings mesmo
          const otherStringFields = ['container_type', 'notes'];
          otherStringFields.forEach(field => {
            if (prep.assembly_config[field] !== undefined) {
              prep.assembly_config[field] = toString(prep.assembly_config[field]);
            }
          });
        }

        // Sanitizar ingredientes
        if (prep.ingredients && Array.isArray(prep.ingredients)) {
          prep.ingredients.forEach((ing, ingIdx) => {
            const ingFields = [
              'quantity', 'current_price', 'unit_price', 'total_cost', 'yield_weight',
              'weight_frozen', 'weight_thawed', 'weight_clean', 'weight_pre_cooking',
              'weight_cooked', 'weight_portioned', 'weight_raw'
            ];

            ingFields.forEach(field => {
              if (ing[field] !== undefined) {
                const original = ing[field];
                ing[field] = toNumber(original);
                if (original !== ing[field] && original !== '' && original !== null) { // Only log if change or not empty
                }
              }
            });
          });
        }

        // CORREÇÃO: Sanitizar sub_components
        if (prep.sub_components && Array.isArray(prep.sub_components)) {
          prep.sub_components.forEach((sc, scIdx) => {
            const scFields = [
              'assembly_weight_kg', 'yield_weight', 'total_cost', 'weight_portioned',
              'input_yield_weight', 'input_total_cost', 'quantity'
            ];

            scFields.forEach(field => {
              if (sc[field] !== undefined) {
                const original = sc[field];
                sc[field] = toNumber(original);
                if (original !== sc[field] && original !== '' && original !== null) { // Only log if change or not empty
                }
              }
            });
          });
        }
      });
    }

    return sanitized;
  }, [parseNumericValue]);

  // CALLBACK FUNCTIONS
  const handleClickOutside = useCallback((event) => {
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer && !searchContainer.contains(event.target)) {
      if (searchOpen) {
        setSearchOpen(false);
      }
    }
  }, [searchOpen]);

  // CORREÇÃO: Recálculo otimizado para atualização em tempo real
  const handleRecalculate = useCallback((currentRecipeData, currentPreparationsData) => {

    if (!currentPreparationsData || currentPreparationsData.length === 0) {
      if (currentRecipeData.total_weight !== 0 || currentRecipeData.yield_weight !== 0 || currentRecipeData.total_cost !== 0) {
        setRecipeData(prevRecipe => ({
          ...prevRecipe,
          total_weight: 0,
          yield_weight: 0,
          total_cost: 0,
          cost_per_kg_raw: 0,
          cost_per_kg_yield: 0,
          cuba_weight: prevRecipe.cuba_weight // Preserve current string input for cuba_weight
        }));
        setIsDirty(true);
      }
      return;
    }

    try {
      // Make a deep copy to ensure RecipeCalculator doesn't modify the state directly
      const preparationsCopy = JSON.parse(JSON.stringify(currentPreparationsData));
      const recipeDataCopy = JSON.parse(JSON.stringify(currentRecipeData));

      // Store current cuba_weight before calculation (it's a string from input)
      const currentCubaWeightString = recipeDataCopy.cuba_weight;

      const calculatedMetrics = RecipeCalculator.calculateRecipeMetrics(
        preparationsCopy, // Pass a copy
        recipeDataCopy // Pass a copy
      );

      const updatedRecipe = {
        ...recipeDataCopy,
        ...calculatedMetrics
      };

      const updatedPreparations = preparationsCopy;

      // Restore cuba_weight (as string for input display) after calculation
      if (currentCubaWeightString !== undefined && currentCubaWeightString !== null) {
        updatedRecipe.cuba_weight = currentCubaWeightString; // Keep it as string with comma
      } else {
        updatedRecipe.cuba_weight = ''; // Default to empty string for input if not set
      }

      // CORREÇÃO: Atualizar SEMPRE os dados calculados para mostrar em tempo real

      // Update recipeData (ensure cuba_weight is string with comma for UI)
      setRecipeData(prev => ({
        ...updatedRecipe,
        cuba_weight: String(updatedRecipe.cuba_weight).replace('.', ',') // Ensure it's string for input
      }));
      setPreparationsData(updatedPreparations);
      setIsDirty(true); // Always mark as dirty if recalculation occurs after user input

    } catch (error) {
      console.error('Error during recalculation:', error);
    }
  }, [parseNumericValue]); // Dependencies: only parseNumericValue

  // CORREÇÃO: Handler para mudança no peso dos componentes com string no final
  const handleSubComponentWeightChange = useCallback((prepId, subComponentId, newWeight) => {
    
    setPreparationsData(prev => prev.map(prep => {
      if (prep.id === prepId) {
        const updatedSubComponents = prep.sub_components.map(sc => {
          if (sc.id === subComponentId) {
            return { ...sc, assembly_weight_kg: newWeight };
          }
          return sc;
        });
        
        // Calcular peso total da montagem
        const totalWeight = calculateAssemblyTotalWeight(updatedSubComponents);
        
        return {
          ...prep,
          sub_components: updatedSubComponents,
          assembly_config: {
            ...prep.assembly_config,
            // MANTER COMO NÚMERO para cálculos, será convertido para string na sanitização
            total_weight: totalWeight
          },
          // Ensure total_yield_weight_prep reflects the sum for this assembly (numeric)
          total_yield_weight_prep: totalWeight,
        };
      }
      return prep;
    }));
    setIsDirty(true);
    // Trigger recalculation for the main recipe data after state update
    setTimeout(() => handleRecalculate(recipeData, preparationsData.map(prep => {
      if (prep.id === prepId) {
        const updatedSubComponents = prep.sub_components.map(sc => {
          if (sc.id === subComponentId) {
            return { ...sc, assembly_weight_kg: newWeight };
          }
          return sc;
        });
        const totalWeight = calculateAssemblyTotalWeight(updatedSubComponents);
        return {
          ...prep,
          sub_components: updatedSubComponents,
          assembly_config: { ...prep.assembly_config, total_weight: totalWeight },
          total_yield_weight_prep: totalWeight,
        };
      }
      return prep;
    })), 0);
  }, [calculateAssemblyTotalWeight, handleRecalculate, recipeData, preparationsData]);

  // Handler for other assembly config changes (selects, textareas)
  const handleAssemblyConfigChange = useCallback((prepId, field, value) => {
    setPreparationsData(prev => prev.map(prep => {
      if (prep.id === prepId) {
        return {
          ...prep,
          assembly_config: {
            ...prep.assembly_config,
            [field]: value
          }
        };
      }
      return prep;
    }));
    setIsDirty(true);
    // No direct recalculate needed here, as it's not a weight affecting cost/yield
  }, []);

  // TODOS OS USEEFFECTS DEVEM VIR DEPOIS DOS HOOKS DE ESTADO
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    const initializePage = async () => {
      setLoading(true);
      try {
        await loadInitialData(); // This loads ingredients, categories, recipes
        await loadCategories(); // This loads allCategories

        if (!id || id === 'new') {
          initializeNewRecipe(); // Call the dedicated function for new recipe setup
          setSearchQuery(''); // Clear search query for new recipe
          window.history.replaceState({}, '', createPageUrl('RecipeTechnical', { id: 'new' })); // Ensure URL is ?id=new
        } else {
          setCurrentRecipeId(id);
          setIsEditing(true);
          await loadRecipe(id); // loadRecipe will now focus on fetching and setting recipe/preparations
        }
      } catch (error) {
        console.error("Erro ao inicializar página:", error);
        setError("Falha ao carregar dados necessários.");
        toast({ variant: "destructive", title: "Erro de Inicialização", description: error.message });
        // If initial load fails, default to a new, empty recipe state
        initializeNewRecipe();
        setCurrentRecipeId(null);
        setIsEditing(false);
        window.history.replaceState({}, '', createPageUrl('RecipeTechnical', { id: 'new' }));
      } finally {
        setLoading(false);
      }
    };
    initializePage();
  }, []); // Dependências vazias para executar apenas uma vez

  useEffect(() => {
    async function loadAllRecipes() {
      try {
        const recipes = await Recipe.list();
        setAllRecipes(recipes);
      } catch (error) {
        console.error("Erro ao carregar lista de receitas:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de receitas para pesquisa.",
          variant: "destructive"
        });
      }
    }

    loadAllRecipes();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRecipes(allRecipes);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allRecipes.filter(recipe =>
      recipe.name.toLowerCase().includes(query) ||
      (recipe.category && recipe.category.toLowerCase().includes(query))
    );

    setFilteredRecipes(filtered);
  }, [searchQuery, allRecipes]);


  useEffect(() => {
    if (allCategories.length > 0) {
      loadUserConfiguration();
    }
  }, [allCategories]);


  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  useEffect(() => {
    if (!sourceRecipeSearch.trim()) {
      setFilteredSourceRecipes(allRecipes.filter(r => r.id !== currentRecipeId)); // Excluir receita atual
      return;
    }

    // CORREÇÃO: Verificar se já há uma receita selecionada com esse nome exato
    const exactMatch = allRecipes.find(r => r.name === sourceRecipeSearch && r.id !== currentRecipeId);
    if (exactMatch && selectedSourceRecipe?.id === exactMatch.id) {
      // Se há match exato e é a receita selecionada, esconder a lista
      setFilteredSourceRecipes([]);
      return;
    }

    const query = sourceRecipeSearch.toLowerCase().trim();
    const filtered = allRecipes
      .filter(r => r.id !== currentRecipeId) // Excluir receita atual
      .filter(recipe =>
        recipe.name.toLowerCase().includes(query) ||
        (recipe.category && recipe.category.toLowerCase().includes(query))
      );

    setFilteredSourceRecipes(filtered);
  }, [sourceRecipeSearch, allRecipes, currentRecipeId, selectedSourceRecipe]);

  // Carregar etapas da receita selecionada
  useEffect(() => {
    if (selectedSourceRecipe) {
      const stages = [];

      // Adicionar etapas específicas da receita
      if (selectedSourceRecipe.processes && Array.isArray(selectedSourceRecipe.processes)) {
        selectedSourceRecipe.processes.forEach((process, index) => {
          stages.push({
            value: `stage_${index}`,
            label: `Até ${process.title}`,
            description: `Copiar ingredientes processados até esta etapa`
          });
        });
      }

      setSourceRecipeStages(stages);

      // Preview da receita (manter apenas se for receita completa)
      if (selectedStageLevel === 'complete') {
        const totalIngredients = selectedSourceRecipe.ingredients?.length || 0;
        const totalWeight = parseNumericValue(selectedSourceRecipe.yield_weight) || 0;
        const totalCost = parseNumericValue(selectedSourceRecipe.total_cost) || 0;

        setRecipePreview({
          ingredients: totalIngredients,
          weight: totalWeight,
          cost: totalCost
        });
      }
    } else {
      setSourceRecipeStages([]);
      setRecipePreview(null);
    }
  }, [selectedSourceRecipe, selectedStageLevel, parseNumericValue]);

  // Gerar preview da cópia
  useEffect(() => {
    if (selectedSourceRecipe && selectedStageLevel) {
      generateRecipePreview();
    }
  }, [selectedSourceRecipe, selectedStageLevel]);

  const formatWeight = (weightInGrams) => {
    if (weightInGrams === null || weightInGrams === undefined || isNaN(weightInGrams)) return "0,000g";

    if (weightInGrams >= 1000) {
      return `${(weightInGrams / 1000).toFixed(3).replace('.', ',')}kg`;
    } else {
      return `${weightInGrams}g`;
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return "R$ 0,00";
    }
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  // ASYNC FUNCTIONS
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [categoriesData, ingredientsData, recipesData] = await Promise.all([
        Category.list(),
        Ingredient.list(),
        Recipe.list()
      ]);

      const recipeCategories = categoriesData.filter(
        cat => cat.type === "recipe" && cat.active !== false
      );

      setCategories(recipeCategories);
      setIngredients(ingredientsData.filter(ing => ing.active !== false));
      setRecipes(recipesData.filter(rec => rec.active !== false));

    } catch (err) {
      console.error("Erro ao carregar dados iniciais:", err);
      setError("Erro ao carregar dados. Por favor, recarregue a página.");
    } finally {
      // setLoading(false); // Handled by initializePage
    }
  };

  const loadCategories = async () => {
    try {
      const categoryData = await CategoryTree.list();
      setAllCategories(categoryData);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as categorias."
      });
    }
  };

  const loadUserConfiguration = async () => {
    try {
      // Try to load user data
      const userData = await User.getMyUserData();
      
      if (userData && userData.recipe_config) {
        // Load saved category
        if (userData.recipe_config.selected_category) {
          const categoryExists = allCategories.find(cat => cat.id === userData.recipe_config.selected_category && cat.level === 1);
          if (categoryExists) {
            setSelectedCategory(userData.recipe_config.selected_category);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações do usuário:", error);
    }
  };

  const loadRecipe = async (id) => {
    try {
      setLoading(true);

      const recipe = await Recipe.getById(id);
      if (!recipe) {
        throw new Error('Receita não encontrada');
      }


      // Processar os dados carregados
      const processedRecipe = {
        name: recipe.name || '',
        name_complement: recipe.name_complement || '',
        category: recipe.category || '', // Keep default empty, user can select
        prep_time: parseInt(recipe.prep_time) || 0, // Ensure it's a number
        total_weight: parseNumericValue(recipe.total_weight) || 0,
        yield_weight: parseNumericValue(recipe.yield_weight) || 0,
        cuba_weight: recipe.cuba_weight !== undefined && recipe.cuba_weight !== null ? String(recipe.cuba_weight).replace('.', ',') : '', // Keep as string for input
        portion_size: parseNumericValue(recipe.portion_size) || 0,
        total_cost: parseNumericValue(recipe.total_cost) || 0,
        cost_per_kg_raw: parseNumericValue(recipe.cost_per_kg_raw) || 0,
        cost_per_kg_yield: parseNumericValue(recipe.cost_per_kg_yield) || 0,
        yield_rate: parseNumericValue(recipe.yield_rate) || 0,
        active: recipe.active !== false,
        notes: recipe.notes || '',
        instructions: recipe.instructions || '',
        pre_preparo: recipe.pre_preparo || {}
      };

      // CORREÇÃO CRÍTICA: Processar os dados carregados do campo "processes"
      let processedPreparations = [];


      if (recipe.processes && Array.isArray(recipe.processes) && recipe.processes.length > 0) {
        const ingredientsMap = (await Ingredient.list()).reduce((map, ing) => {
          map[ing.id] = ing;
          return map;
        }, {});

        // Usar APENAS dados do campo "processes" (formato novo)
        processedPreparations = recipe.processes.map(prep => {
          const processIngredients = Array.isArray(prep.ingredients)
            ? prep.ingredients.map(ing => ({
                id: String(ing.id || Date.now() + Math.random()),
                ingredient_id: ing.ingredient_id,
                name: ing.name || ingredientsMap[ing.ingredient_id]?.name || "Ingrediente",
                unit: ing.unit || ingredientsMap[ing.ingredient_id]?.unit || "kg",
                current_price: String(ing.current_price || ing.unit_price || ingredientsMap[ing.ingredient_id]?.current_price || '').replace('.', ','),
                weight_frozen: String(ing.weight_frozen || ing.process_details?.weight_frozen || '').replace('.', ','),
                weight_thawed: String(ing.weight_thawed || ing.process_details?.weight_thawed || '').replace('.', ','),
                weight_clean: String(ing.weight_clean || ing.process_details?.weight_clean || '').replace('.', ','),
                weight_pre_cooking: String(ing.weight_pre_cooking || ing.process_details?.weight_pre_cooking || '').replace('.', ','),
                weight_cooked: String(ing.weight_cooked || ing.process_details?.weight_cooked || '').replace('.', ','),
                weight_portioned: String(ing.weight_portioned || ing.process_details?.weight_portioned || '').replace('.', ','),
                weight_raw: String(ing.weight_raw || ing.process_details?.weight_raw || '').replace('.', ','),
                total_cost: parseNumericValue(ing.total_cost) || 0 // Ensure total_cost is numeric
              }))
            : [];

          const subComponents = Array.isArray(prep.sub_components)
            ? prep.sub_components.map(sc => ({
                id: String(sc.id || Date.now() + Math.random()),
                source_id: sc.source_id,
                name: sc.name,
                type: sc.type,
                yield_weight: String(sc.yield_weight || '').replace('.', ','),
                total_cost: String(sc.total_cost || '').replace('.', ','),
                weight_portioned: String(sc.weight_portioned || '').replace('.', ','),
                input_yield_weight: String(sc.input_yield_weight || '').replace('.', ','),
                input_total_cost: String(sc.input_total_cost || '').replace('.', ','),
                assembly_weight_kg: sc.assembly_weight_kg !== undefined && sc.assembly_weight_kg !== null ? String(sc.assembly_weight_kg).replace('.', ',') : '', // Keep as string for input
              }))
            : [];

          return {
            id: String(prep.id || Date.now()), // Ensure ID exists
            title: prep.title || "Processo",
            instructions: prep.instructions || "",
            processes: Array.isArray(prep.processes) ? prep.processes : ["cooking"],
            ingredients: processIngredients,
            sub_components: subComponents,
            order: prep.order || 0,
            total_raw_weight_prep: parseNumericValue(prep.total_raw_weight_prep) || 0,
            total_yield_weight_prep: parseNumericValue(prep.total_yield_weight_prep) || 0,
            total_cost_prep: parseNumericValue(prep.total_cost_prep) || 0,
            assembly_config: prep.assembly_config ? {
              container_type: prep.assembly_config.container_type || 'cuba',
              total_weight: prep.assembly_config.total_weight !== undefined && prep.assembly_config.total_weight !== null ? String(prep.assembly_config.total_weight).replace('.', ',') : '',
              units_quantity: prep.assembly_config.units_quantity !== undefined && prep.assembly_config.units_quantity !== null ? String(prep.assembly_config.units_quantity).replace('.', ',') : '',
              notes: prep.assembly_config.notes || ''
            } : undefined,
          };
        });

      } else {
        // Se não tem processes, começar com array vazio
        processedPreparations = [];
      }

      // Atualizar estados
      setRecipeData(processedRecipe);
      setPreparationsData(processedPreparations);
      setIsEditing(true);
      setCurrentRecipeId(id);


    } catch (error) {
      console.error('[RecipeTechnical] Erro ao carregar receita:', error);
      toast({
        variant: "destructive",
        title: "Erro ao Carregar Receita",
        description: error.message
      });
      initializeNewRecipe();
      window.history.replaceState({}, '', createPageUrl('RecipeTechnical', { id: 'new' }));
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setConfigSaving(true);

      await User.updateMyUserData({
        recipe_config: {
          selected_category: selectedCategory
        }
      });

      toast({
        title: "Configurações salvas",
        description: "Suas configurações foram salvas com sucesso."
      });

      setShowConfigDialog(false);
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar suas configurações."
      });
    } finally {
      setConfigSaving(false);
    }
  };

  const handleSave = async () => {
    if (!recipeData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nome da receita é obrigatório"
      });
      return;
    }

    setSaving(true);
    try {

      // Limpar processos vazios
      const cleanedPreparations = preparationsData.filter(prep => {
        const hasIngredients = prep.ingredients && prep.ingredients.length > 0;
        const hasSubComponents = prep.sub_components && prep.sub_components.length > 0;
        const hasInstructions = prep.instructions && prep.instructions.trim() !== '';

        // An assembly or portioning step might only have sub-components and instructions.
        const isAssemblyOrPortioning = prep.processes?.includes('assembly') || prep.processes?.includes('portioning');
        const isRecipeProcess = prep.processes?.includes('recipe');

        return hasIngredients || hasSubComponents || hasInstructions || (isAssemblyOrPortioning && (parseNumericValue(prep.assembly_config?.total_weight) > 0 || prep.sub_components?.length > 0)) || isRecipeProcess;
      });


      // Calcular métricas com DEBUG
      
      // Pass a copy of recipeData for calculation, so that current cuba_weight can be correctly handled
      const recipeDataCopyForCalc = { ...recipeData, cuba_weight: parseNumericValue(recipeData.cuba_weight) || 0 };

      const calculatedMetrics = RecipeCalculator.calculateRecipeMetrics(
        cleanedPreparations,
        recipeDataCopyForCalc
      );

      const updatedRecipe = {
        ...recipeDataCopyForCalc,
        ...calculatedMetrics
      };

      const updatedPreparations = cleanedPreparations;


      // CORREÇÃO CRÍTICA: Sanitizar ANTES de salvar
      const dataToSave = sanitizeNumericData({
        ...updatedRecipe,
        processes: updatedPreparations,
        ingredients: [] // Limpar campo antigo
      });


      // IMPORTANT: Restore cuba_weight to original string format for UI if needed, but for saving it should be numeric now
      // The sanitizeNumericData will convert cuba_weight to a number for the `dataToSave` object.


      let savedRecipe;
      if (currentRecipeId && currentRecipeId !== 'new' && currentRecipeId !== 'null') { // Check if it's an existing recipe ID
        // No need to delete transient fields like created_date, updated_date, created_by, as backend typically manages them
        savedRecipe = await Recipe.update(currentRecipeId, dataToSave);
      } else {
        // No need to delete transient fields
        savedRecipe = await Recipe.create(dataToSave);

        setCurrentRecipeId(savedRecipe.id);
        setIsEditing(true);

        const newUrl = createPageUrl('RecipeTechnical') + `?id=${savedRecipe.id}`;
        window.history.replaceState({}, '', newUrl);
      }

      // IMPORTANTE: Atualizar estado local com dados calculados

      setRecipeData(prev => ({
        ...updatedRecipe,
        cuba_weight: String(recipeData.cuba_weight).replace('.', ',') // Ensure cuba_weight in state remains a string for input purposes, using its *original* value
      }));
      setPreparationsData(updatedPreparations);
      setIsDirty(false);


      toast({
        title: "Sucesso",
        description: `Receita ${savedRecipe.name} salva com sucesso!`
      });


    } catch (err) {
      console.error('Erro no salvamento:', err);
      console.error('Dados da receita no momento do erro:', recipeData);

      let errorMessage = "Erro interno";
      
      if (err.name === 'FirebaseError') {
        errorMessage = `Erro no Firebase: ${err.message}`;
      } else if (err.message?.includes('permission')) {
        errorMessage = "Erro de permissão - verifique se você tem acesso para salvar receitas";
      } else if (err.message?.includes('network')) {
        errorMessage = "Erro de conexão - verifique sua internet";
      } else if (err.message?.includes('validation')) {
        errorMessage = "Erro de validação - dados da receita inválidos";
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast({
        variant: "destructive",
        title: "Erro ao salvar receita",
        description: errorMessage
      });
    } finally {
      setSaving(false);
    }
  };

  // EVENT HANDLERS
  const handleRecipeSelect = async (selectedRecipeId) => {
    if (!selectedRecipeId) return;

    window.history.pushState({}, '', `/recipes/technical?id=${selectedRecipeId}`);

    // The main useEffect will handle the full reload if recipeId changes.
    // For now, let's trigger the loadRecipeData directly for immediate feedback.
    setCurrentRecipeId(selectedRecipeId);
    setIsEditing(true);
    await loadRecipe(selectedRecipeId);

    const selectedRecipe = filteredRecipes.find(r => r.id === selectedRecipeId);
    if (selectedRecipe) {
      setSearchQuery(selectedRecipe.name);
    }

    setSearchOpen(false);
  };

  const handleInputFocus = () => {
    setSearchOpen(true);
  };

  // Adicionar handler de teclado seguro
  const handleKeyDown = (e) => {
    // Verificar se clipboardData existe antes de usar
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      // Permitir paste normal sem interceptar
      return;
    }

    if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  const handleQueryChange = (e) => {
    setSearchQuery(e.target.value);
    if (!searchOpen) {
      setSearchOpen(true);
    }
  };

  const handleClear = () => {
    if (isDirty) {
      const confirm = window.confirm("Existem alterações não salvas. Deseja continuar e descartar estas alterações?");
      if (!confirm) return;
    }
    resetForm();
    setCurrentRecipeId(null); // Explicitly clear recipe ID
    setIsEditing(false); // Not editing
    setSearchQuery('');
    window.history.replaceState({}, '', createPageUrl('RecipeTechnical', { id: 'new' })); // Navigate to new recipe URL
  };

  const handleDeleteProcess = (prepId) => {

    setPreparationsData(prevPreps => {
      const updatedPreparations = prevPreps.filter(prep => prep.id !== prepId);
      
      // Recalculate metrics based on the new state
      setTimeout(() => handleRecalculate(recipeData, updatedPreparations), 0);
      setIsDirty(true);
      return updatedPreparations;
    });

    toast({
      title: "Processo excluído",
      description: "O processo foi removido com sucesso."
    });
  };

  const handlePrePreparoUpdate = (ingredientId, prePreparoDataFromItem) => {
    setRecipeData(prevRecipe => {
      const currentPrePreparo = prevRecipe.pre_preparo || {};

      const updatedPrePreparo = {
        ...currentPrePreparo,
        [ingredientId]: {
          ...prePreparoDataFromItem,
          ingredient_name: prevRecipe.ingredients?.find(i => i.id === ingredientId)?.name || ingredientId,
          updated_at: new Date().toISOString()
        }
      };

      return {
        ...prevRecipe,
        pre_preparo: updatedPrePreparo
      };
    });
    setIsDirty(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRecipeData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleNumericInputChange = (name) => (e) => {
    const value = e.target.value;
    // Allow empty string for clearer input
    const parsedValue = value === '' ? null : parseNumericValue(value);

    setRecipeData(prev => ({ ...prev, [name]: parsedValue }));
    setIsDirty(true);
  };

  // Handler específico para mudanças no peso da cuba
  const handleCubaWeightChange = (e) => {
    const value = e.target.value;

    setRecipeData(prev => ({
      ...prev,
      cuba_weight: value, // Manter como string durante edição
    }));
    setIsDirty(true);
    // Recalculate after cuba weight change to update cuba cost and total recipe cost
    setTimeout(() => handleRecalculate({ ...recipeData, cuba_weight: value }, preparationsData), 0);
  };

  // OTHER FUNCTIONS
  const initializeNewRecipe = () => {
    const newRecipe = {
      name: "Nova Receita",
      name_complement: "",
      category: "", // Default empty, let user select or config
      prep_time: 30,
      total_weight: 0,
      yield_weight: 0,
      cuba_weight: '', // Default to empty string for new recipes
      portion_size: 0,
      total_cost: 0,
      cost_per_kg_raw: 0,
      cost_per_kg_yield: 0,
      yield_rate: 0,
      active: true,
      notes: "",
      instructions: "",
      pre_preparo: {},
      ingredients: [], // Ensure these are initialized for structure consistency
      processes: [] // Ensure these are initialized for structure consistency
    };
    setRecipeData(newRecipe);
    setPreparationsData([]);
    setCurrentRecipeId(null); // Explicitly null for new recipe
    setIsEditing(false); // Not editing an existing one
    setIsDirty(false); // New recipe, not dirty yet
  };

  const resetForm = () => {
    setRecipeData({
      name: "",
      name_complement: "",
      category: "",
      prep_time: 0,
      total_weight: 0,
      yield_weight: 0,
      cuba_weight: '',
      total_cost: 0,
      cost_per_kg_raw: 0,
      cost_per_kg_yield: 0,
      instructions: "",
      active: true,
      pre_preparo: {}
    });

    setPreparationsData([]);
    setGroups([]);
    setIsDirty(false); // Resetting means no longer dirty
    setCurrentRecipeId(null); // Explicitly clear recipe ID
    setIsEditing(false); // Not editing
  };

  const calculateCubaCost = () => {
    const cubaWeight = parseNumericValue(recipeData.cuba_weight);
    const costPerKgYield = parseNumericValue(recipeData.cost_per_kg_yield);
    return cubaWeight * costPerKgYield;
  };

  // Definir tipos de processos disponíveis
  const processTypes = {
    defrosting: {
      id: 'defrosting',
      label: 'Descongelamento',
      color: 'blue',
      order: 1
    },
    cleaning: {
      id: 'cleaning',
      label: 'Limpeza',
      color: 'amber',
      order: 2
    },
    cooking: {
      id: 'cooking',
      label: 'Cocção',
      color: 'rose',
      order: 3
    },
    portioning: {
      id: 'portioning',
      label: 'Porcionamento',
      color: 'teal',
      order: 4
    },
    assembly: {
      id: 'assembly',
      label: 'Montagem',
      color: 'indigo',
      order: 5
    },
    recipe: {
      id: 'recipe',
      label: 'Receita',
      color: 'emerald',
      order: 6
    }
  };

  const generateRecipePreview = useCallback(() => {
    if (!selectedSourceRecipe) return;

    let ingredientsCount = 0;
    let totalCost = 0;
    let totalWeight = 0;

    if (selectedStageLevel === 'complete') {
      // Receita completa (apenas custo e peso final da receita)
      totalCost = parseNumericValue(selectedSourceRecipe.total_cost) || 0;
      totalWeight = parseNumericValue(selectedSourceRecipe.yield_weight) || 0;

      // Contar ingredientes de todos os processos (para exibição no preview)
      if (Array.isArray(selectedSourceRecipe.processes)) { // CORREÇÃO: Verificar se é array
        ingredientsCount = selectedSourceRecipe.processes.reduce((count, process) =>
          count + (Array.isArray(process.ingredients) ? process.ingredients.length : 0), 0 // CORREÇÃO: Verificar se ingredients é array
        );
      }
    } else if (selectedStageLevel.startsWith('stage_')) {
      // Etapa específica
      const stageIndex = parseInt(selectedStageLevel.split('_')[1]);
      const targetStage = Array.isArray(selectedSourceRecipe.processes) ? selectedSourceRecipe.processes[stageIndex] : null; // CORREÇÃO: Verificar se é array

      if (targetStage && Array.isArray(targetStage.ingredients)) { // CORREÇÃO: Verificar se ingredients é array
        ingredientsCount = targetStage.ingredients.length;
        totalCost = targetStage.ingredients.reduce((sum, ing) =>
          sum + (parseNumericValue(ing.total_cost) || 0), 0
        );

        // Calcular peso de rendimento da etapa
        totalWeight = targetStage.ingredients.reduce((sum, ing) => {
          const finalWeight = Math.max(
            parseNumericValue(ing.weight_portioned || 0),
            parseNumericValue(ing.weight_cooked || 0),
            parseNumericValue(ing.weight_clean || 0),
            parseNumericValue(ing.weight_thawed || 0),
            parseNumericValue(ing.weight_raw || 0),
            parseNumericValue(ing.weight_frozen || 0)
          );
          return sum + finalWeight;
        }, 0);
      }
    }

    setRecipePreview({
      ingredientsCount,
      totalCost,
      totalWeight
    });
  }, [selectedSourceRecipe, selectedStageLevel, parseNumericValue]);

  const copyRecipeData = () => {
    if (!selectedSourceRecipe || !selectedStageLevel) {
      toast({
        title: "Seleção incompleta",
        description: "Selecione uma receita e o nível de cópia.",
        variant: "destructive"
      });
      return;
    }


    let copiedIngredients = [];
    let processTitle = '';
    let processInstructions = '';
    let newPreparationProcesses = ['cooking']; // Default
    let copiedSubComponents = [];

    try {
      if (selectedStageLevel === 'complete') {
        // Cópia da receita completa
        processTitle = `${preparationsData.length + 1}º Etapa: Receita (${selectedSourceRecipe.name} - Completa)`;

        // Identify all unique processes from the original recipe
        const allProcessTypes = new Set();
        if (selectedSourceRecipe.processes && Array.isArray(selectedSourceRecipe.processes)) {
          selectedSourceRecipe.processes.forEach(process => {
            if (process.processes && Array.isArray(process.processes)) {
              process.processes.forEach(pType => allProcessTypes.add(pType));
            }
          });
        }

        // If no processes found, infer from ingredients
        if (allProcessTypes.size === 0 && selectedSourceRecipe.ingredients) {
          selectedSourceRecipe.ingredients.forEach(ing => {
            const processDetails = ing.process_details || ing;
            if (parseNumericValue(processDetails.weight_frozen || ing.weight_frozen)) allProcessTypes.add('defrosting');
            if (parseNumericValue(processDetails.weight_clean || ing.weight_clean)) allProcessTypes.add('cleaning');
            if (parseNumericValue(processDetails.weight_cooked || ing.weight_cooked)) allProcessTypes.add('cooking');
            if (parseNumericValue(processDetails.weight_portioned || ing.weight_portioned)) allProcessTypes.add('portioning');
          });
        }

        newPreparationProcesses = Array.from(allProcessTypes);
        if (newPreparationProcesses.length === 0) newPreparationProcesses = ['cooking'];

        if (selectedSourceRecipe.ingredients && Array.isArray(selectedSourceRecipe.ingredients)) {
          copiedIngredients = selectedSourceRecipe.ingredients.map(ing => {

            const processDetails = ing.process_details || ing;
            const unitPrice = parseNumericValue(ing.unit_price) || parseNumericValue(ing.current_price) || 0;

            // CORREÇÃO: Extrair todos os pesos corretamente e converter para strings com vírgula
            const weightFrozen = parseNumericValue(processDetails.weight_frozen || ing.weight_frozen) || 0;
            const weightThawed = parseNumericValue(processDetails.weight_thawed || ing.weight_thawed) || 0;
            const weightRaw = parseNumericValue(processDetails.weight_raw || ing.weight_raw) || parseNumericValue(ing.quantity) || 0;
            const weightClean = parseNumericValue(processDetails.weight_clean || ing.weight_clean) || 0;
            const weightPreCooking = parseNumericValue(processDetails.weight_pre_cooking || ing.weight_pre_cooking) || 0;
            const weightCooked = parseNumericValue(processDetails.weight_cooked || ing.weight_cooked) || 0;
            const weightPortioned = parseNumericValue(processDetails.weight_portioned || ing.weight_portioned) || 0;

            const copiedIngredient = {
              id: String(Date.now() + Math.random()),
              ingredient_id: ing.ingredient_id || '',
              name: ing.name || 'Ingrediente sem nome',
              // CORREÇÃO: Converter números para strings com vírgula (formato brasileiro)
              weight_frozen: weightFrozen > 0 ? String(weightFrozen).replace('.', ',') : '',
              weight_thawed: weightThawed > 0 ? String(weightThawed).replace('.', ',') : '',
              weight_raw: weightRaw > 0 ? String(weightRaw).replace('.', ',') : '',
              weight_clean: weightClean > 0 ? String(weightClean).replace('.', ',') : '',
              weight_pre_cooking: weightPreCooking > 0 ? String(weightPreCooking).replace('.', ',') : '',
              weight_cooked: weightCooked > 0 ? String(weightCooked).replace('.', ',') : '',
              weight_portioned: weightPortioned > 0 ? String(weightPortioned).replace('.', ',') : '',
              current_price: String(unitPrice).replace('.', ','),
              unit: ing.unit || 'kg',
              total_cost: parseNumericValue(ing.total_cost) || 0
            };

            return copiedIngredient;
          });
        }
        // Copy sub_components if they exist in the source recipe (for complete copy)
        if (selectedSourceRecipe.sub_components && Array.isArray(selectedSourceRecipe.sub_components)) {
          copiedSubComponents = selectedSourceRecipe.sub_components.map(sc => ({
            id: String(Date.now() + Math.random()),
            source_id: sc.source_id,
            name: sc.name,
            type: sc.type,
            assembly_weight_kg: String(parseNumericValue(sc.assembly_weight_kg) || 0).replace('.', ','), // Ensure string with comma for input
            input_yield_weight: String(parseNumericValue(sc.input_yield_weight) || 0).replace('.', ','),
            input_total_cost: String(parseNumericValue(sc.input_total_cost) || 0).replace('.', ','),
            yield_weight: String(parseNumericValue(sc.yield_weight) || 0).replace('.', ','),
            total_cost: String(parseNumericValue(sc.total_cost) || 0).replace('.', ','),
            weight_portioned: String(parseNumericValue(sc.weight_portioned) || 0).replace('.', ',')
          }));
        }

        processInstructions = selectedSourceRecipe.instructions || '';

      } else {
        // Cópia até etapa específica
        const stageIndex = parseInt(selectedStageLevel.replace('stage_', ''));

        if (selectedSourceRecipe.processes && selectedSourceRecipe.processes[stageIndex]) {
          const targetStage = selectedSourceRecipe.processes[stageIndex];
          processTitle = `${preparationsData.length + 1}º Etapa: Receita (${selectedSourceRecipe.name} - ${targetStage.title})`;
          processInstructions = targetStage.instructions || '';
          newPreparationProcesses = targetStage.processes || ['cooking'];

          if (targetStage.ingredients && Array.isArray(targetStage.ingredients)) {
            copiedIngredients = targetStage.ingredients.map(ing => {
              const unitPrice = parseNumericValue(ing.current_price) || parseNumericValue(ing.unit_price) || 0;

              // CORREÇÃO: Converter todos os campos numéricos para string com vírgula
              const convertWeight = (value) => {
                const num = parseNumericValue(value);
                return num > 0 ? String(num).replace('.', ',') : '';
              };

              return {
                id: String(Date.now() + Math.random()),
                ingredient_id: ing.ingredient_id || '',
                name: ing.name || 'Ingrediente sem nome',
                weight_frozen: convertWeight(ing.weight_frozen),
                weight_thawed: convertWeight(ing.weight_thawed),
                weight_raw: convertWeight(ing.weight_raw),
                weight_clean: convertWeight(ing.weight_clean),
                weight_pre_cooking: convertWeight(ing.weight_pre_cooking),
                weight_cooked: convertWeight(ing.weight_cooked),
                weight_portioned: convertWeight(ing.weight_portioned),
                current_price: String(unitPrice).replace('.', ','),
                unit: ing.unit || 'kg',
                total_cost: parseNumericValue(ing.total_cost) || 0
              };
            });
          }
          // Copy sub_components if they exist in the target stage (for stage copy)
          if (targetStage.sub_components && Array.isArray(targetStage.sub_components)) {
            copiedSubComponents = targetStage.sub_components.map(sc => ({
              id: String(Date.now() + Math.random()),
              source_id: sc.source_id,
              name: sc.name,
              type: sc.type,
              assembly_weight_kg: String(parseNumericValue(sc.assembly_weight_kg) || 0).replace('.', ','),
              input_yield_weight: String(parseNumericValue(sc.input_yield_weight) || 0).replace('.', ','),
              input_total_cost: String(parseNumericValue(sc.input_total_cost) || 0).replace('.', ','),
              yield_weight: String(parseNumericValue(sc.yield_weight) || 0).replace('.', ','),
              total_cost: String(parseNumericValue(sc.total_cost) || 0).replace('.', ','),
              weight_portioned: String(parseNumericValue(sc.weight_portioned) || 0).replace('.', ',')
            }));
          }
        }
      }


      // Criar nova preparação
      const newPreparation = {
        id: String(Date.now()),
        title: processTitle,
        processes: newPreparationProcesses,
        ingredients: copiedIngredients,
        sub_components: copiedSubComponents, // Add copied sub_components
        instructions: processInstructions || `Receita copiada de: ${selectedSourceRecipe.name}`,
        total_raw_weight_prep: 0,
        total_yield_weight_prep: 0,
        total_cost_prep: 0,
        assembly_config: newPreparationProcesses.includes('assembly') ? {
          container_type: 'cuba',
          total_weight: '', // Will be calculated by handleSubComponentWeightChange if sub-components exist
          units_quantity: '1',
          notes: ''
        } : undefined,
      };


      setPreparationsData(currentPreparations => {
        const newPreparations = [...currentPreparations, newPreparation];
        // Trigger recalculation after new prep is added
        setTimeout(() => handleRecalculate(recipeData, newPreparations), 0);
        return newPreparations;
      });

      // Limpar estados do modal
      setIsRecipeCopyModalOpen(false);
      setSelectedSourceRecipe(null);
      setSourceRecipeSearch('');
      setSelectedStageLevel('complete');
      setRecipePreview(null);
      setFilteredSourceRecipes([]);

      setIsDirty(true);

      toast({
        title: "Receita copiada com sucesso!",
        description: `${copiedIngredients.length} ingredientes e ${copiedSubComponents.length} sub-componentes foram adicionados com ${newPreparationProcesses.join(' + ')}.`
      });

    } catch (error) {
      console.error("🍽️ [COPY] Erro ao copiar receita:", error);
      toast({
        title: "Erro ao copiar receita",
        description: error.message,
        variant: "destructive"
      });
    }
  };


  // RENDER FUNCTIONS
  const renderPrePreparoSection = () => {
    const allIngredients = [];
    const ingredientMap = new Map();

    preparationsData.forEach(prep => {
      if (prep.ingredients && prep.ingredients.length > 0) {
        prep.ingredients.forEach(ing => {
          const key = ing.ingredient_id || ing.name;
          if (!ingredientMap.has(key)) {
            ingredientMap.set(key, {
              id: key,
              name: ing.name,
              unit: ing.unit || 'kg',
              category: ing.category || 'Geral',
              prep_step: prep.title || 'Processo Principal'
            });
            allIngredients.push(ingredientMap.get(key));
          }
        });
      }
    });

    if (allIngredients.length === 0) {
      return (
        <div className="bg-purple-50 p-8 rounded-lg border border-purple-200 text-center shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <Package className="h-12 w-12 text-purple-400" />
            <h3 className="text-xl font-semibold text-purple-700">Nenhum Ingrediente na Ficha</h3>
            <p className="text-purple-600 max-w-md mx-auto text-sm">
              Adicione ingredientes na aba "Ficha Técnica" primeiro.
              Eles aparecerão aqui para você configurar o planejamento de pré-preparo.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-lg shadow-lg text-white">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-7 w-7" />
            <h3 className="text-2xl font-bold">
              Planejamento Cronológico de Pré-Preparo
            </h3>
          </div>
          <p className="text-sm text-purple-100 max-w-2xl">
            Defina as tarefas de pré-preparo para cada ingrediente e quantos dias antes da produção da receita elas devem ser iniciadas.
            Isso ajudará a organizar sua cozinha e otimizar o fluxo de trabalho.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold text-gray-800">Ingredientes da Receita</h4>
              <Badge variant="outline" className="bg-gray-100 text-gray-700">
                {allIngredients.length} ingrediente{allIngredients.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Clique em um ingrediente abaixo para expandir e configurar suas tarefas de pré-preparo.
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {allIngredients.map(ingredient => (
              <IngredientPrePreparoItem
                key={ingredient.id}
                ingredient={ingredient}
                recipe={recipeData}
                onUpdate={handlePrePreparoUpdate}
              />
            ))}
          </div>
        </div>

        {recipeData.pre_preparo && Object.keys(recipeData.pre_preparo).length > 0 && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>Lembre-se de salvar a Ficha Técnica principal para que as configurações de pré-preparo sejam persistidas.</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProcessTable = (prep, prepIndex) => {

    if (!prep || typeof prep !== 'object') {
      console.error('Invalid prep in renderProcessTable:', prep);
      return <div>Erro: dados inválidos</div>;
    }

    const processes = Array.isArray(prep.processes) ? prep.processes : ['cooking'];
    const ingredients = Array.isArray(prep.ingredients) ? prep.ingredients : [];
    const hasIngredients = ingredients.length > 0;


    const hasProcess = (processName) => processes.includes(processName);

    const orderedActiveProcesses = ['defrosting', 'cleaning', 'cooking', 'portioning']
      .filter(p => hasProcess(p));

    const isAssemblyOnly = hasProcess('assembly') && orderedActiveProcesses.length === 0 && !hasIngredients;
    const isRecipeProcess = hasProcess('recipe');


    if (isAssemblyOnly) {
      return (
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-center">
          <Layers className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
          <p className="text-sm text-indigo-700">Esta é uma etapa de montagem. Adicione instruções abaixo.</p>
        </div>
      );
    }

    if (isRecipeProcess && !hasIngredients && !prep.sub_components?.length > 0) { // If it's recipe but nothing was copied
      return (
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 text-center">
          <CookingPot className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm text-emerald-700">Esta etapa é uma cópia de receita. Adicione instruções abaixo.</p>
        </div>
      );
    }


    return (
      <div className="bg-white rounded-xl overflow-x-auto shadow-lg">
        <table className="w-full text-xs border-separate border-spacing-0">
          <thead>
            <tr>
              <th colSpan="3" className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-center border-b">
                Dados Ingrediente
              </th>

              {orderedActiveProcesses.map(processId => {
                const processInfo = processTypes[processId];
                let colSpan = 2;
                if (processId === 'defrosting' ||
                  (processId === 'cleaning' && !hasProcess('defrosting')) ||
                  (processId === 'cooking' && !hasProcess('defrosting') && !hasProcess('cleaning')) ||
                  (processId === 'portioning' && !hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking'))
                ) {
                  colSpan = (processId === 'defrosting') ? 3 : 3;
                } else {
                  colSpan = 2;
                }
                if (processId === 'portioning' && (hasProcess('cooking') || hasProcess('cleaning') || hasProcess('defrosting'))) {
                  colSpan = 2;
                } else if (processId === 'portioning') {
                  colSpan = 3;
                }


                return (
                  <th key={processId} colSpan={colSpan} className={`px-4 py-2 bg-${processInfo.color}-50/50 font-medium text-${processInfo.color}-600 text-center border-b`}>
                    {processInfo.label}
                  </th>
                );
              })}

              <th colSpan="2" className="px-4 py-2 bg-purple-50/50 font-medium text-purple-600 text-center border-b">
                Dados Rendimento
              </th>
            </tr>

            <tr>
              <th className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-left whitespace-nowrap">Ingrediente</th>
              <th className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-center whitespace-nowrap">Preço/kg (Bruto)</th>
              <th className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-center whitespace-nowrap">Preço/kg (Líquido)</th>

              {hasProcess('defrosting') && (
                <>
                  <th className="px-4 py-2 bg-blue-50/50 font-medium text-blue-600 text-center whitespace-nowrap">Peso Congelado</th>
                  <th className="px-4 py-2 bg-blue-50/50 font-medium text-blue-600 text-center whitespace-nowrap">Peso Resfriado</th>
                  <th className="px-4 py-2 bg-blue-50/50 font-medium text-blue-600 text-center whitespace-nowrap">Perda Desc.(%)</th>
                </>
              )}

              {hasProcess('cleaning') && (
                <>
                  {!hasProcess('defrosting') && (
                    <th className="px-4 py-2 bg-amber-50/50 font-medium text-amber-600 text-center whitespace-nowrap">Peso Bruto</th>
                  )}
                  <th className="px-4 py-2 bg-amber-50/50 font-medium text-amber-600 text-center whitespace-nowrap">Pós Limpeza</th>
                  <th className="px-4 py-2 bg-amber-50/50 font-medium text-amber-600 text-center whitespace-nowrap">Perda Limp.(%)</th>
                </>
              )}

              {hasProcess('cooking') && (
                <>
                  <th className="px-4 py-2 bg-rose-50/50 font-medium text-rose-600 text-center whitespace-nowrap">Peso Pré Cocção</th>
                  <th className="px-4 py-2 bg-rose-50/50 font-medium text-rose-600 text-center whitespace-nowrap">Pós Cocção</th>
                  <th className="px-4 py-2 bg-rose-50/50 font-medium text-rose-600 text-center whitespace-nowrap">Perda Cocção(%)</th>
                </>
              )}

              {hasProcess('portioning') && (
                <>
                  {(!hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking')) && (
                    <th className={`px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center whitespace-nowrap`}>Peso Bruto (Porc.)</th>
                  )}
                  <th className={`px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center whitespace-nowrap`}>Pós Porcionamento</th>
                  <th className={`px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center whitespace-nowrap`}>Perda Porcion.(%)</th>
                </>
              )}

              <th className="px-4 py-2 bg-purple-50/50 font-medium text-purple-600 text-center whitespace-nowrap">Rendimento(%)</th>
              <th className="px-4 py-2 bg-purple-50/50 font-medium text-purple-600 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!hasIngredients && !isRecipeProcess && !prep.sub_components?.length > 0 ? ( 
              <tr>
                <td colSpan={15} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-gray-400" />
                    <span>Nenhum ingrediente adicionado</span>
                  </div>
                </td>
              </tr>
            ) : (
              ingredients.map((item, itemIndex) => {

                if (!item || typeof item !== 'object') {
                  console.error(`Invalid ingredient at ${itemIndex}:`, item);
                  return (
                    <tr key={itemIndex}>
                      <td colSpan={15} className="px-4 py-2 text-center text-red-500">
                        Erro: dados inválidos
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={item.id || itemIndex} className="border-b border-gray-50 hover:bg-gray-50/50">
                    {renderTableCells(item, prepIndex, itemIndex, prep)}
                  </tr>
                );
              })
            )}
            {isRecipeProcess && prep.sub_components?.length > 0 && (
              prep.sub_components.map((sc, scIndex) => {
                const sourcePrep = preparationsData.find(p => p.id === sc.source_id);
                let inputYieldWeightNumeric = parseNumericValue(sc.input_yield_weight) || 0;
                let inputTotalCostNumeric = parseNumericValue(sc.input_total_cost) || 0;

                // Override if internal preparation is available and more up-to-date
                if (sourcePrep) {
                  inputYieldWeightNumeric = parseNumericValue(sourcePrep.total_yield_weight_prep) || 0;
                  inputTotalCostNumeric = parseNumericValue(sourcePrep.total_cost_prep) || 0;
                }

                return (
                  <tr key={`sc-${sc.id || scIndex}`} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <TableCell className="font-medium">
                      {sc.name}
                      <Badge variant="outline" className="ml-2 text-xs border-emerald-300 text-emerald-700">
                        {sc.type === 'recipe' ? 'Receita Copiada' : 'Etapa Interna'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center" colSpan={2}>
                      <span className="text-xs text-gray-500">Preço/kg (Calculado): </span>
                      {inputYieldWeightNumeric > 0 ? formatCurrency(inputTotalCostNumeric / inputYieldWeightNumeric) : formatCurrency(0)}
                    </TableCell>
                    <TableCell className="text-center" colSpan={orderedActiveProcesses.reduce((acc, p) => {
                        const info = processTypes[p];
                        let colSpan = 2; // default
                        if (p === 'defrosting') colSpan = 3;
                        else if (p === 'cleaning' && !hasProcess('defrosting')) colSpan = 3;
                        else if (p === 'cooking' && !hasProcess('defrosting') && !hasProcess('cleaning')) colSpan = 3;
                        else if (p === 'portioning' && !hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking')) colSpan = 3;
                        else if (p === 'portioning') colSpan = 2; // if previous process exists
                        return acc + colSpan;
                    }, 0) || 1} // At least 1 if no active processes
                    >
                      <span className="text-xs text-gray-500">Peso de Rendimento: </span>
                      {formatWeight(inputYieldWeightNumeric * 1000)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs text-gray-500">Custo Total: </span>
                      {formatCurrency(inputTotalCostNumeric)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAssemblyItem(prepIndex, scIndex)} // Using removeAssemblyItem as it works for sub_components
                        className="h-7 w-7 rounded-full hover:bg-red-50"
                        title="Remover componente"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </TableCell>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAssemblyTable = (prep, prepIndex) => {
    // CORREÇÃO: Renderizar componentes da montagem com cálculo automático (Replacing existing renderAssemblyTable content)
    if (!prep.sub_components || prep.sub_components.length === 0) {
      return (
        <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 text-center">
          <div className="flex flex-col items-center gap-3">
            <Layers className="h-10 w-10 text-indigo-500" />
            <h3 className="text-lg font-medium text-indigo-800">Adicione Componentes de Montagem</h3>
            <p className="text-indigo-600 max-w-md mx-auto">
              Clique em "+ Adicionar Preparo/Receita" para incluir etapas anteriores ou receitas externas nesta montagem.
            </p>
          </div>
        </div>
      );
    }

    // Calculate total weight for display from current sub_components
    const totalAssemblyWeight = calculateAssemblyTotalWeight(prep.sub_components);

    return (
      <div className="space-y-4">
        {/* Tabela de componentes */}
        <div className="bg-white rounded-xl overflow-x-auto shadow-lg">
          <div className="bg-indigo-50 px-4 py-3 border-b rounded-t-xl">
            <h5 className="font-semibold text-indigo-800">Componentes da Montagem</h5>
            <p className="text-sm text-indigo-600 mt-1">
              Defina o peso específico de cada componente que será usado nesta montagem
            </p>
          </div>
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="px-4 py-3 bg-indigo-50/50 font-medium text-indigo-600 text-left">Componente</th>
                <th className="px-4 py-3 bg-indigo-50/50 font-medium text-indigo-600 text-center">Peso na Montagem</th>
                <th className="px-4 py-3 bg-indigo-50/50 font-medium text-indigo-600 text-center">% do Total</th>
                <th className="px-4 py-3 bg-indigo-50/50 font-medium text-indigo-600 text-center">Custo Proporcional</th>
                <th className="px-4 py-3 bg-indigo-50/50 font-medium text-indigo-600 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {prep.sub_components.map((sc, scIndex) => {
                // The assembly_weight_kg from state is already a string with comma if user typed it.
                // Use parseNumericValue for calculation, but keep the original string for the input field.
                const componentWeightNumeric = parseNumericValue(sc.assembly_weight_kg) || 0;
                const percentage = totalAssemblyWeight > 0 ? (componentWeightNumeric / totalAssemblyWeight) * 100 : 0;

                const sourcePrep = preparationsData.find(p => p.id === sc.source_id);
                let inputYieldWeightNumeric = 0;
                let inputTotalCostNumeric = 0;

                if (sourcePrep) {
                  inputYieldWeightNumeric = parseNumericValue(sourcePrep.total_yield_weight_prep);
                  inputTotalCostNumeric = parseNumericValue(sourcePrep.total_cost_prep);
                } else { // External recipe
                  inputYieldWeightNumeric = parseNumericValue(sc.input_yield_weight) || 0;
                  inputTotalCostNumeric = parseNumericValue(sc.input_total_cost) || 0;
                }

                const proportionalCost = inputYieldWeightNumeric > 0 ? (inputTotalCostNumeric * componentWeightNumeric) / inputYieldWeightNumeric : 0;

                return (
                  <tr key={sc.id || scIndex} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-left">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800">{sc.name}</span>
                        <Badge variant="outline" className={`w-fit text-xs mt-1 ${sc.type === 'recipe' ? 'border-green-300 text-green-700' : 'border-purple-300 text-purple-700'}`}>
                          {sc.type === 'recipe' ? 'Receita Externa' : 'Etapa Anterior'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Input
                          type="text"
                          // Display the stored string value, which might contain commas
                          value={sc.assembly_weight_kg || ''}
                          onChange={(e) => handleSubComponentWeightChange(prep.id, sc.id, e.target.value)}
                          className="w-20 h-8 text-center text-xs"
                          placeholder="0,000"
                        />
                        <span className="text-xs text-gray-400">kg</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="font-medium text-indigo-600">
                        {percentage.toFixed(1).replace('.', ',')}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="font-medium text-green-600">
                        {formatCurrency(proportionalCost)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAssemblyItem(prepIndex, scIndex)}
                        className="h-7 w-7 rounded-full hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Resumo da montagem */}
          <div className="bg-indigo-50 px-4 py-3 border-t rounded-b-xl">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-indigo-800">Total da Montagem:</span>
              <div className="flex gap-4">
                <span className="text-indigo-600">
                  Peso: {formatWeight(totalAssemblyWeight * 1000)}
                </span>
                <span className="text-green-600 font-medium">
                  Custo: {formatCurrency(prep.sub_components?.reduce((sum, sc) => {
                    const componentWeightNumeric = parseNumericValue(sc.assembly_weight_kg) || 0;
                    const sourcePrep = preparationsData.find(p => p.id === sc.source_id);
                    let inputYieldWeightNumeric = 0;
                    let inputTotalCostNumeric = 0;

                    if (sourcePrep) {
                      inputYieldWeightNumeric = parseNumericValue(sourcePrep.total_yield_weight_prep);
                      inputTotalCostNumeric = parseNumericValue(sourcePrep.total_cost_prep);
                    } else {
                      inputYieldWeightNumeric = parseNumericValue(sc.input_yield_weight) || 0;
                      inputTotalCostNumeric = parseNumericValue(sc.input_total_cost) || 0;
                    }
                    return sum + (inputYieldWeightNumeric > 0 ? (inputTotalCostNumeric * componentWeightNumeric) / inputYieldWeightNumeric : 0);
                  }, 0) || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPortioningTable = (prep, prepIndex) => {
    const hasSubComponents = prep.sub_components && prep.sub_components.length > 0;

    if (!hasSubComponents) {
      return (
        <div className="bg-teal-50 p-6 rounded-lg border border-teal-100 text-center">
          <div className="flex flex-col items-center gap-3">
            <Scissors className="h-10 w-10 text-teal-500" />
            <h3 className="text-lg font-medium text-teal-800">Selecione o Produto</h3>
            <p className="text-teal-600 max-w-md mx-auto">
              Clique em "+ Adicionar Produto para Porcionar" para selecionar o item que será processado.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl overflow-x-auto shadow-lg">
        <table className="w-full text-xs border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-left">Produto de Entrada</th>
              <th className="px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center">Peso Entrada (Rendimento)</th>
              <th className="px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center">Peso Pós Porcionamento</th>
              <th className="px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center">Perda Porcion. (%)</th>
              <th className="px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {prep.sub_components.map((item, itemIndex) => {
              const sourcePrep = preparationsData.find(p => p.id === item.source_id);

              let actualInputWeight = 0;
              let actualInputCost = 0;

              if (sourcePrep) {
                // For internal previous processes, get their calculated yield/cost
                actualInputWeight = parseNumericValue(sourcePrep.total_yield_weight_prep) || 0;
                actualInputCost = parseNumericValue(sourcePrep.total_cost_prep) || 0;
              } else {
                // For external recipes, use their stored yield/cost
                actualInputWeight = parseNumericValue(item.input_yield_weight) || 0;
                actualInputCost = parseNumericValue(item.input_total_cost) || 0;
              }


              let weightPortioned = parseNumericValue(item.weight_portioned);
              if (weightPortioned === 0 && actualInputWeight > 0) { // If portioned weight is 0, pre-fill with input yield
                weightPortioned = actualInputWeight;
                // Update the state's item directly to reflect this initial value for the input field
                // This will cause a re-render and the input will show this value
                // It's a bit of a side effect during render, but common for pre-filling inputs.
                // A more "React-pure" way would be to do this in an effect or on addItemToPreparation,
                // but given the current flow, this might be acceptable.
                if (!item.weight_portioned || item.weight_portioned === '' || parseNumericValue(item.weight_portioned) === 0) {
                    item.weight_portioned = String(actualInputWeight).replace('.', ',');
                }
              }

              const portioningLoss = actualInputWeight > 0 && weightPortioned > 0
                ? ((actualInputWeight - weightPortioned) / actualInputWeight) * 100
                : 0;

              return (
                <tr key={item.id || itemIndex} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2 text-left min-w-[200px]">
                    <span className="font-medium">{item.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs border-purple-300 text-purple-700">
                      {item.type === 'recipe' ? 'Receita' : 'Preparo Interno'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-center min-w-[150px] font-medium">
                    {actualInputWeight > 0 ? formatWeight(actualInputWeight * 1000) : "0,000g"}
                  </td>
                  <td className="px-4 py-2 text-center min-w-[150px]">
                    <Input
                      type="text"
                      value={item.weight_portioned || ''}
                      onChange={(e) => {
                        setPreparationsData(prev => {
                          const newPreps = [...prev];
                          if (newPreps[prepIndex]?.sub_components?.[itemIndex]) {
                            const newValue = e.target.value;
                            newPreps[prepIndex].sub_components[itemIndex].weight_portioned = newValue;
                            // Update yield_weight (which is the output) based on portioned weight
                            newPreps[prepIndex].sub_components[itemIndex].yield_weight = String(parseNumericValue(newValue)).replace('.', ',');
                          }
                          return newPreps;
                        });
                        setIsDirty(true);
                        setTimeout(() => handleRecalculate(recipeData, preparationsData), 0); // Trigger recalculation
                      }}
                      className="w-24 h-8 text-center text-xs"
                      placeholder="0,000"
                    />
                  </td>
                  <td className="px-4 py-2 text-center min-w-[120px] font-medium">
                    {portioningLoss.toFixed(2).replace('.', ',')}%
                  </td>
                  <td className="px-4 py-2 text-center min-w-[80px]">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setPreparationsData(prev => {
                          const newPreps = [...prev];
                          if (newPreps[prepIndex]) {
                            newPreps[prepIndex].sub_components.splice(itemIndex, 1);
                          }
                          setTimeout(() => handleRecalculate(recipeData, newPreps), 0); // Trigger recalculation
                          return newPreps;
                        });
                        setIsDirty(true);
                      }}
                      className="h-7 w-7 rounded-full hover:bg-red-100"
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTableCells = (item, prepIndex, itemIndex, prep) => {
    const processes = prep.processes || [];
    const hasProcess = (processName) => processes.includes(processName);

    // Pass the current item state (which might be updated by user input)
    const thawingLoss = {
      percentage: RecipeCalculator.calculateLoss(parseNumber(item.weight_frozen), parseNumber(item.weight_thawed)),
      classification: 'normal'
    };
    const cleaningLoss = {
      percentage: RecipeCalculator.calculateLoss(parseNumber(item.weight_thawed), parseNumber(item.weight_clean)),
      classification: 'normal'
    };
    const cookingLoss = {
      percentage: RecipeCalculator.calculateLoss(parseNumber(item.weight_pre_cooking || item.weight_clean), parseNumber(item.weight_cooked)),
      classification: 'normal'
    };
    const portioningLoss = {
      percentage: RecipeCalculator.calculateLoss(parseNumber(item.weight_cooked), parseNumber(item.weight_portioned)),
      classification: 'normal'
    };
    const yieldResult = {
      percentage: RecipeCalculator.calculateYield(item),
      classification: 'normal'
    };

    return (
      <>
        <TableCell className="font-medium">{item.name}</TableCell>

        <TableCell>{formatters.currency(parseNumericValue(item.current_price))}</TableCell>
        <TableCell>{formatters.currency(parseNumericValue(item.current_price))}</TableCell>

        {hasProcess('defrosting') && (
          <>
            <TableCell>
              <Input
                type="text"
                value={item.weight_frozen || ''}
                onChange={(e) => updatePreparationItem(prepIndex, itemIndex, 'weight_frozen', e.target.value)}
                className="w-24 h-8 text-center text-xs"
                placeholder="0,000"
              />
            </TableCell>
            <TableCell>
              <Input
                type="text"
                value={item.weight_thawed || ''}
                onChange={(e) => updatePreparationItem(prepIndex, itemIndex, 'weight_thawed', e.target.value)}
                className="w-24 h-8 text-center text-xs"
                placeholder="0,000"
              />
            </TableCell>
            <TableCell className="text-center">
              <Badge variant={thawingLoss.status}>
                {formatters.percentage(thawingLoss.percentage)}
              </Badge>
            </TableCell>
          </>
        )}

        {hasProcess('cleaning') && (
          <>
            {!hasProcess('defrosting') && (
              <TableCell>
                <Input
                  type="text"
                  value={item.weight_raw || ''}
                  onChange={(e) => updatePreparationItem(prepIndex, itemIndex, 'weight_raw', e.target.value)}
                  className="w-24 h-8 text-center text-xs"
                  placeholder="0,000"
                />
              </TableCell>
            )}
            <TableCell>
              <Input
                type="text"
                value={item.weight_clean || ''}
                onChange={(e) => updatePreparationItem(prepIndex, itemIndex, 'weight_clean', e.target.value)}
                className="w-24 h-8 text-center text-xs"
                placeholder="0,000"
              />
            </TableCell>
            <TableCell className="text-center">
              <Badge variant={cleaningLoss.status}>
                {formatters.percentage(cleaningLoss.percentage)}
              </Badge>
            </TableCell>
          </>
        )}

        {hasProcess('cooking') && (
          <>
            <TableCell>
              <Label className="text-xs text-gray-500 mb-1 block">Pré Cocção</Label>
              <Input
                type="text"
                value={item.weight_pre_cooking || ''}
                onChange={(e) => updatePreparationItem(prepIndex, itemIndex, 'weight_pre_cooking', e.target.value)}
                className="w-24 h-8 text-center text-xs"
                placeholder="0,000"
                title="Peso antes da cocção"
              />
            </TableCell>

            <TableCell>
              <Label className="text-xs text-gray-500 mb-1 block">Pós Cocção</Label>
              <Input
                type="text"
                value={item.weight_cooked || ''}
                onChange={(e) => updatePreparationItem(prepIndex, itemIndex, 'weight_cooked', e.target.value)}
                className="w-24 h-8 text-center text-xs"
                placeholder="0,000"
                title="Peso após a cocção"
              />
            </TableCell>

            <TableCell className="text-center">
              <Label className="text-xs text-gray-500 mb-1 block">Perda Cocção</Label>
              <Badge variant={cookingLoss.status}>
                {formatters.percentage(cookingLoss.percentage)}
              </Badge>
            </TableCell>
          </>
        )}

        {hasProcess('portioning') && (
          <>
            {(!hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking')) && (
              <TableCell>
                <Input
                  type="text"
                  value={item.weight_raw || ''}
                  onChange={(e) => updatePreparationItem(prepIndex, itemIndex, 'weight_raw', e.target.value)}
                  className="w-24 h-8 text-center text-xs"
                  placeholder="0,000"
                />
              </TableCell>
            )}
            <TableCell>
              <Input
                type="text"
                value={item.weight_portioned || ''}
                onChange={(e) => updatePreparationItem(prepIndex, itemIndex, 'weight_portioned', e.target.value)}
                className="w-24 h-8 text-center text-xs"
                placeholder="0,000"
              />
            </TableCell>
            <TableCell className="text-center">
              <Badge variant={portioningLoss.status}>
                {formatters.percentage(portioningLoss.percentage)}
              </Badge>
            </TableCell>
          </>
        )}

        <TableCell className="text-center">
          <Badge variant={yieldResult.status}>
            {formatters.percentage(yieldResult.percentage)}
          </Badge>
        </TableCell>

        <TableCell>
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openDetailedProcessModal(prepIndex, itemIndex, item)}
              className="h-7 w-7 rounded-full hover:bg-blue-50"
              title="Detalhes do Processo"
            >
              <Edit className="h-3 w-3 text-blue-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removePreparationItem(prepIndex, itemIndex)}
              className="h-7 w-7 rounded-full hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </Button>
          </div>
        </TableCell>
      </>
    );
  };

  const renderPreparationCards = () => {

    if (!Array.isArray(preparationsData)) {
      console.error('Preparations is not an array:', preparationsData);
      setPreparationsData([]); // Fix it
      return (
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 text-center">
          <div className="flex flex-col items-center gap-3">
            <CookingPot className="h-10 w-10 text-blue-500" />
            <h3 className="text-lg font-medium text-blue-800">Dados corrompidos detectados</h3>
            <p className="text-blue-600 max-w-md mx-auto">
              Os dados foram corrigidos. Por favor, recarregue a página.
            </p>
          </div>
        </div>
      );
    }

    if (preparationsData.length === 0) {
      return (
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 text-center">
          <div className="flex flex-col items-center gap-3">
            <CookingPot className="h-10 w-10 text-blue-500" />
            <h3 className="text-lg font-medium text-blue-800">Comece sua ficha técnica</h3>
            <p className="text-blue-600 max-w-md mx-auto">
              Para iniciar, adicione um novo processo utilizando o botão acima.
            </p>
          </div>
        </div>
      );
    }

    return preparationsData.map((prep, prepIndex) => {

      // Ensure prep has required structure
      if (!prep || typeof prep !== 'object') {
        console.error(`Invalid prep at index ${prepIndex}:`, prep);
        return null;
      }

      // Ensure processes is an array
      const processes = Array.isArray(prep.processes) ? prep.processes : ['cooking'];

      const isAssemblyOnly = processes.includes('assembly') &&
        !processes.includes('defrosting') &&
        !processes.includes('cleaning') &&
        !processes.includes('cooking') &&
        !processes.includes('portioning');

      const isPortioningOnly = processes.includes('portioning') &&
        !processes.includes('defrosting') &&
        !processes.includes('cleaning') &&
        !processes.includes('cooking') &&
        !processes.includes('assembly');

      const isRecipeProcess = processes.includes('recipe');

      const showAddSubComponentButton = isAssemblyOnly || isPortioningOnly || isRecipeProcess; // Recipe processes can also have sub-components now

      return (
        <Card key={prep.id || prepIndex} className="overflow-hidden">
          <CardHeader className={`py-4 ${isAssemblyOnly ? 'bg-indigo-50' : isPortioningOnly ? 'bg-teal-50' : isRecipeProcess ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center flex-grow min-w-0">
                {isAssemblyOnly ? <Layers className="mr-2 h-5 w-5 flex-shrink-0 text-indigo-500" />
                  : isPortioningOnly ? <Scissors className="mr-2 h-5 w-5 flex-shrink-0 text-teal-500" />
                    : isRecipeProcess ? <CookingPot className="mr-2 h-5 w-5 flex-shrink-0 text-emerald-500" />
                      : <CookingPot className="mr-2 h-5 w-5 flex-shrink-0 text-amber-500" />}
                <Input
                  value={prep.title || ''}
                  onChange={(e) => handleTitleChange(prepIndex, e.target.value)}
                  onBlur={() => handleTitleBlur(prepIndex)}
                  placeholder={`${prepIndex + 1}º ${isAssemblyOnly ? 'Montagem' : isPortioningOnly ? 'Porcionamento' : isRecipeProcess ? 'Receita' : 'Processo'}`}
                  className="font-medium border-0 bg-transparent p-0 h-8 focus-visible:ring-0 w-full min-w-0"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 ml-2 flex-shrink-0"
                onClick={() => handleDeleteProcess(prep.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {isAssemblyOnly && (
              <div className="mb-6">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
                  <h4 className="font-semibold text-indigo-800 mb-3 flex items-center">
                    <Layers className="h-5 w-5 mr-2" />
                    Configuração da Montagem
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-indigo-700">Tipo de Embalagem</Label>
                      <Select
                        value={prep.assembly_config?.container_type || 'cuba'}
                        onValueChange={(value) => handleAssemblyConfigChange(prep.id, 'container_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cuba">Cuba</SelectItem>
                          <SelectItem value="descartavel">Embalagem Descartável</SelectItem>
                          <SelectItem value="individual">Porção Individual</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      {/* CORRECTION: Make this input readOnly and display the calculated total_yield_weight_prep */}
                      <Label className="text-sm font-medium text-indigo-700">Peso Total Calculado (kg)</Label>
                      <Input
                        type="text"
                        // Display the numeric value from state, converted to string with comma
                        value={String(parseNumericValue(prep.total_yield_weight_prep)).replace('.', ',')}
                        readOnly // Make it read-only
                        className="text-center bg-gray-50 cursor-not-allowed" // Add styling for read-only
                        title="Este peso é calculado automaticamente a partir dos componentes da montagem."
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-indigo-700">Quantidade de Unidades</Label>
                      <Input
                        type="text"
                        value={prep.assembly_config?.units_quantity || ''}
                        onChange={(e) => handleAssemblyConfigChange(prep.id, 'units_quantity', e.target.value)}
                        placeholder="1"
                        className="text-center"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label className="text-sm font-medium text-indigo-700">Observações da Montagem</Label>
                    <Textarea
                      value={prep.assembly_config?.notes || ''}
                      onChange={(e) => handleAssemblyConfigChange(prep.id, 'notes', e.target.value)}
                      placeholder="Ex: Escondidinho - 1,6kg de massa + 0,4kg de recheio"
                      className="h-20 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              {showAddSubComponentButton ? (
                <Button
                  onClick={() => openAddAssemblyItemModal(prepIndex)}
                  variant="outline"
                  size="sm"
                  className={`mb-4 ${isAssemblyOnly ? 'border-indigo-300 text-indigo-600 hover:bg-indigo-50' : 'border-teal-300 text-teal-600 hover:bg-teal-50'}`}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isAssemblyOnly ? "Adicionar Preparo/Receita" : "Adicionar Produto para Porcionar"}
                </Button>
              ) : (
                <Button
                  onClick={() => openAddIngredientModal(prepIndex)}
                  variant="outline"
                  size="sm"
                  className="mb-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ingrediente
                </Button>
              )}

              {isAssemblyOnly ? renderAssemblyTable(prep, prepIndex)
                : isPortioningOnly ? renderPortioningTable(prep, prepIndex)
                  : renderProcessTable(prep, prepIndex)}
            </div>

            <div className="mt-6">
              <Label htmlFor={`prep-instructions-${prep.id || prepIndex}`} className="text-sm font-medium mb-2 block">
                Modo de Preparo desta Etapa
              </Label>
              <Textarea
                id={`prep-instructions-${prep.id || prepIndex}`}
                value={prep.instructions || ''}
                onChange={(e) => updatePreparation(prepIndex, 'instructions', e.target.value)}
                placeholder={`Descreva o processo ${isAssemblyOnly ? 'de montagem' : isPortioningOnly ? 'de porcionamento' : isRecipeProcess ? 'desta receita' : 'desta etapa'}...`}
                className="min-h-[120px] resize-none"
              />
            </div>
          </CardContent>
        </Card>
      );
    });
  };

  const createNewProcess = () => {
    if (selectedProcesses.length === 0) {
      toast({ title: "Selecione ao menos um tipo de processo", variant: "destructive" });
      return;
    }

    // Verificar se é processo de receita (cópia)
    if (selectedProcesses.includes('recipe')) {
      if (selectedProcesses.length > 1) {
        toast({
          title: "Processo 'Receita' deve ser usado sozinho",
          description: "Não é possível combinar 'Receita' com outros processos.",
          variant: "destructive"
        });
        return;
      }

      // Abrir modal de cópia de receita
      setIsRecipeCopyModalOpen(true);
      setIsProcessCreatorOpen(false);
      return;
    }

    const sortedProcessTypesForDisplay = Object.values(processTypes).sort((a, b) => a.order - b.order);

    const orderedSelectedProcesses = selectedProcesses
      .map(id => processTypes[id])
      .sort((a, b) => a.order - b.order)
      .map(pt => pt.id);

    const prepCount = preparationsData.length;

    let processTitle = '';
    if (orderedSelectedProcesses.length === 1) {
      const processType = orderedSelectedProcesses[0];
      const processLabel = processTypes[processType]?.label || processType;
      processTitle = `${prepCount + 1}º Etapa: ${processLabel}`;
    } else {
      const processNames = orderedSelectedProcesses
        .map(pId => processTypes[pId].label)
        .join(' + ');
      processTitle = `${prepCount + 1}º Etapa: ${processNames}`;
    }

    const newPrep = {
      id: String(Date.now()),
      title: processTitle,
      ingredients: [],
      sub_components: [],
      instructions: "",
      processes: orderedSelectedProcesses,
      assembly_config: orderedSelectedProcesses.includes('assembly') ? {
        container_type: 'cuba',
        total_weight: '', // Will be updated by handleSubComponentWeightChange
        units_quantity: '1',
        notes: ''
      } : undefined,
    };

    // CORREÇÃO: Usar função de callback para evitar problemas de state
    setPreparationsData(currentPreparations => {
      const newPreparations = [...currentPreparations, newPrep];
      setTimeout(() => handleRecalculate(recipeData, newPreparations), 0); // Recalculate with new preparations
      return newPreparations;
    });

    // Limpar o estado do modal
    setSelectedProcesses([]);
    setIsProcessCreatorOpen(false);
    setIsDirty(true);
  };

  const handleCloseProcessModal = useCallback(() => {
    setIsProcessCreatorOpen(false);
    setSelectedProcesses([]);
  }, [setIsProcessCreatorOpen, setSelectedProcesses]);

  const handleOpenProcessModal = useCallback(() => {
    setSelectedProcesses([]);
    setIsProcessCreatorOpen(true);
  }, [setIsProcessCreatorOpen, setSelectedProcesses]);

  const ProcessCreatorDialog = React.memo(() => {
    if (!isProcessCreatorOpen) {
      return null;
    }

    const sortedProcessTypesForDisplay = Object.values(processTypes).sort((a, b) => a.order - b.order);

    return (
      <Dialog
        open={isProcessCreatorOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseProcessModal();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CookingPot className="w-5 h-5" />
              Criar Nova Etapa de Processo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selecione os Processos Desejados para esta Etapa</Label>
              <div className="flex flex-col gap-2">
                {sortedProcessTypesForDisplay.map(process => {
                  const isChecked = selectedProcesses.includes(process.id);

                  return (
                    <div key={process.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`process-type-${process.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          setSelectedProcesses(prev =>
                            checked
                              ? [...prev, process.id]
                              : prev.filter(p => p !== process.id)
                          );
                        }}
                      />
                      <Label
                        htmlFor={`process-type-${process.id}`}
                        className={`text-${process.color}-600 cursor-pointer`}
                      >
                        {process.label}
                        {process.id === 'portioning' && <Scissors className="inline ml-1 h-3 w-3" />}
                        {process.id === 'assembly' && <Layers className="inline ml-1 h-3 w-3" />}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-sky-50 p-3 rounded-md border border-sky-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-sky-600" />
                <p className="text-sm text-sky-800 font-medium">Ordem das Colunas</p>
              </div>
              <p className="text-xs text-sky-700 mt-1">
                As colunas na tabela seguirão a ordem: Descongelamento → Limpeza → Cocção → Porcionamento. A Montagem não adiciona colunas de peso. O processo 'Receita' traz os ingredientes já na tabela sem colunas adicionais.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseProcessModal}>
              Cancelar
            </Button>
            <Button
              onClick={createNewProcess}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={selectedProcesses.length === 0}
            >
              Criar Etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  });

  // FUNÇÕES DE MODIFICAÇÃO DE ESTADO
  const updatePreparationItem = (prepIndex, itemIndex, field, value) => {

    let displayValue = String(value).trim();
    if (displayValue.startsWith(',') || displayValue.startsWith('.')) {
      displayValue = `0${displayValue}`;
    }

    const numericValueForCalc = parseNumericValue(displayValue);

    if (numericValueForCalc < 0 && (field.startsWith('weight_') || field === 'current_price')) {
      toast({
        variant: "destructive",
        title: "Valor Inválido",
        description: `O campo ${field} não pode ser negativo.`
      });
      return;
    }

    setPreparationsData(prev => {

      if (!Array.isArray(prev)) {
        console.error('Previous state is not an array:', prev);
        return [];
      }

      const newPreparations = [...prev];
      const targetPrep = newPreparations[prepIndex];

      if (!targetPrep) {
        console.error(`No prep at index ${prepIndex}`);
        return prev;
      }

      if (!Array.isArray(targetPrep.ingredients)) {
        console.error('Target prep ingredients is not an array:', targetPrep.ingredients);
        targetPrep.ingredients = []; // Attempt to fix
        return prev;
      }

      const itemToUpdate = targetPrep.ingredients[itemIndex];
      if (!itemToUpdate) {
        console.error(`No item at index ${itemIndex} in prep ${prepIndex}`);
        return prev;
      }

      itemToUpdate[field] = displayValue === '' ? '' : displayValue;


      // Recalculate metrics after the update
      setTimeout(() => handleRecalculate(recipeData, newPreparations), 0);

      return newPreparations;
    });

    setIsDirty(true);
  };

  const updatePreparation = (prepIndex, field, value) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]) {
        newPreparations[prepIndex][field] = value;
      }
      return newPreparations;
    });
    setIsDirty(true);
  };

  const removePreparationItem = (prepIndex, itemIndex) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex] && Array.isArray(newPreparations[prepIndex].ingredients)) {
        newPreparations[prepIndex].ingredients.splice(itemIndex, 1);
      }
      // Recalculate metrics after item removal
      setTimeout(() => handleRecalculate(recipeData, newPreparations), 0);
      setIsDirty(true); // Mark dirty after removal
      return newPreparations;
    });
  };

  const removeAssemblyItem = (prepIndex, subComponentIndex) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex] && Array.isArray(newPreparations[prepIndex].sub_components)) {
        newPreparations[prepIndex].sub_components.splice(subComponentIndex, 1);
      }
      // Recalculate metrics after item removal
      setTimeout(() => handleRecalculate(recipeData, newPreparations), 0);
      return newPreparations;
    });
    setIsDirty(true);
  };

  const updatePreparationSubComponent = useCallback((prepIndex, subComponentIndex, field, value) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      const subComponentToUpdate = newPreparations[prepIndex]?.sub_components?.[subComponentIndex];
      if (subComponentToUpdate) {
        // If field is assembly_weight_kg, use the specific handler.
        // For other numeric fields, use parseNumericValue.
        if (field === 'assembly_weight_kg') {
          // This branch should ideally not be hit if handleSubComponentWeightChange is used for input directly
          // but serves as a fallback or if this function is called internally with numeric values
          subComponentToUpdate[field] = String(value).replace('.', ','); // Store as string for display
        } else if (['input_yield_weight', 'input_total_cost', 'yield_weight', 'total_cost', 'quantity'].includes(field)) {
          subComponentToUpdate[field] = String(parseNumericValue(value)).replace('.', ','); // Store parsed numeric as string
        } else {
          subComponentToUpdate[field] = value;
        }
      }
      // Recalculate metrics after sub-component update
      setTimeout(() => handleRecalculate(recipeData, newPreparations), 0);
      return newPreparations;
    });
    setIsDirty(true);
  }, [handleRecalculate, parseNumericValue, recipeData]);


  // Modal Functions
  const openDetailedProcessModal = (prepIndex, itemIndex, item) => {
    setCurrentIngredient(item);
    setCurrentPrepIndexForDetail(prepIndex);
    setCurrentItemIndexForDetail(itemIndex);

    setProcessFormData({
      weight_frozen: parseNumericValue(item.weight_frozen),
      weight_thawed: parseNumericValue(item.weight_thawed),
      weight_clean: parseNumericValue(item.weight_clean),
      weight_cooked: parseNumericValue(item.weight_cooked)
    });
    setDetailedProcessDialogOpen(true);
  };

  const applyDetailedProcess = () => {
    if (!currentIngredient || currentPrepIndexForDetail === null || currentItemIndexForDetail === null) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível identificar o item a ser atualizado." });
      return;
    }

    setPreparationsData(prevPreps => {
      const newPreps = [...prevPreps];
      const targetPrep = newPreps[currentPrepIndexForDetail];

      if (targetPrep && targetPrep.ingredients && targetPrep.ingredients[currentItemIndexForDetail]) {
        const itemToUpdate = targetPrep.ingredients[currentItemIndexForDetail];

        targetPrep.ingredients[currentItemIndexForDetail] = {
          ...itemToUpdate,
          weight_frozen: String(processFormData.weight_frozen || '').replace('.', ','),
          weight_thawed: String(processFormData.weight_thawed || '').replace('.', ','),
          weight_clean: String(processFormData.weight_clean || '').replace('.', ','),
          weight_cooked: String(processFormData.weight_cooked || '').replace('.', ','),
        };
      } else {
        console.error("Não foi possível encontrar o ingrediente para aplicar detalhes:", { currentPrepIndexForDetail, currentItemIndexForDetail });
        toast({ variant: "destructive", title: "Erro interno", description: "Ingrediente não encontrado para atualização." })
      }
      // Recalculate metrics after detailed process application
      setTimeout(() => handleRecalculate(recipeData, newPreps), 0);
      return newPreps;
    });

    setDetailedProcessDialogOpen(false);
    setCurrentPrepIndexForDetail(null);
    setCurrentItemIndexForDetail(null);
    setCurrentIngredient(null);
    setIsDirty(true);
  };

  const openAddIngredientModal = (prepIndex) => {
    setCurrentItemType("ingredient");
    setCurrentPrepIndex(prepIndex);
    setSearchModalOpen(true);
  };

  const openAddAssemblyItemModal = (prepIndex) => {
    setCurrentPrepIndexForAssembly(prepIndex);
    setIsAssemblyItemModalOpen(true);
  };

  const addItemToPreparation = (itemDataFromModal, isIngredient = true, prepIndex = 0) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      const targetPrep = newPreparations[prepIndex];

      if (!targetPrep) {
        console.error(`Tentativa de adicionar a um preparo inexistente: índice ${prepIndex}`);
        return prev;
      }

      if (!targetPrep.processes) {
        targetPrep.processes = ["cooking"];
      }

      const isPortioningOnlyStep = targetPrep.processes?.includes('portioning') &&
        !targetPrep.processes?.includes('defrosting') &&
        !targetPrep.processes?.includes('cleaning') &&
        !targetPrep.processes?.includes('cooking') &&
        !targetPrep.processes?.includes('assembly');

      const isAssemblyOnlyStep = targetPrep.processes?.includes('assembly') &&
        !targetPrep.processes?.includes('defrosting') &&
        !targetPrep.processes?.includes('cleaning') &&
        !targetPrep.processes?.includes('cooking') &&
        !targetPrep.processes?.includes('portioning');

      const isRecipeProcessStep = targetPrep.processes?.includes('recipe');


      if (isIngredient) {
        if (isPortioningOnlyStep || isAssemblyOnlyStep || isRecipeProcessStep) {
          toast({ variant: "destructive", title: "Ação Inválida", description: "Não é possível adicionar ingredientes crus diretamente a uma etapa pura de Porcionamento, Montagem ou Receita copiada. Adicione um produto de uma etapa anterior ou use a cópia de receita." });
          return prev;
        }

        if (!targetPrep.ingredients) targetPrep.ingredients = [];

        const newItem = {
          id: String(Date.now() + Math.random()),
          ingredient_id: itemDataFromModal.id,
          name: itemDataFromModal.name,
          unit: itemDataFromModal.unit || "kg",
          current_price: String(parseNumericValue(itemDataFromModal.current_price) || 0).replace('.', ','),
          weight_raw: '',
          weight_frozen: '',
          weight_thawed: '',
          weight_clean: '',
          weight_cooked: '',
          weight_portioned: '',
          total_cost: 0,
          process_details: {
            weight_frozen: 0,
            weight_thawed: 0,
            weight_clean: 0,
            weight_cooked: 0,
            weight_portioned: 0,
            weight_raw: 0
          }
        };

        targetPrep.ingredients.push(newItem);
      } else { // Adicionando sub-componente (etapa anterior ou receita externa)
        if (!targetPrep.sub_components) targetPrep.sub_components = [];

        const sourcePrep = !itemDataFromModal.isRecipe
          ? newPreparations.find(p => p.id === itemDataFromModal.id)
          : null;

        let inputYieldWeight = 0;
        let inputTotalCost = 0;

        if (sourcePrep) {

          // Calculate actual yield/cost based on the source prep's type or its ingredients/sub_components
          if (sourcePrep.processes?.includes('assembly') || sourcePrep.processes?.includes('portioning') || sourcePrep.processes?.includes('recipe')) {
            inputYieldWeight = parseNumericValue(sourcePrep.total_yield_weight_prep) || 0;
            inputTotalCost = parseNumericValue(sourcePrep.total_cost_prep) || 0;
          } else if (sourcePrep.ingredients && sourcePrep.ingredients.length > 0) {
            // For standard ingredient-based processes
            const totalYieldWeight = sourcePrep.ingredients.reduce((total, ing) => {
              const finalWeight = parseNumericValue(
                ing.weight_portioned || ing.weight_cooked || ing.weight_clean || ing.weight_thawed || ing.weight_raw || ing.weight_frozen || 0
              );
              return total + finalWeight;
            }, 0);

            const totalCost = sourcePrep.ingredients.reduce((total, ing) => {
              const unitPrice = parseNumericValue(ing.current_price || 0);
              const quantity = parseNumericValue(ing.weight_raw || ing.weight_frozen || ing.weight_thawed || 0); // Use raw input quantity for cost calculation
              return total + (unitPrice * quantity);
            }, 0);

            inputYieldWeight = totalYieldWeight;
            inputTotalCost = totalCost;

            // Update source prep's calculated totals if needed
            // This is already handled by RecipeCalculator.calculateRecipeMetrics if it recalculates after every change.
            // Avoid modifying sourcePrep directly here to prevent side effects in `prev` state.
          }
        } else { // External recipe
          inputYieldWeight = parseNumericValue(itemDataFromModal.yield_weight) || 0;
          inputTotalCost = parseNumericValue(itemDataFromModal.total_cost) || 0;
        }


        const newSubComponent = {
          id: String(Date.now() + Math.random()),
          source_id: itemDataFromModal.id,
          name: itemDataFromModal.name || itemDataFromModal.title,
          type: itemDataFromModal.isRecipe ? 'recipe' : 'internal_process',
          input_yield_weight: String(inputYieldWeight).replace('.', ','), // Store as string for consistency with other inputs
          input_total_cost: String(inputTotalCost).replace('.', ','),     // Store as string
          yield_weight: String(inputYieldWeight).replace('.', ','),       // Initial yield (string)
          total_cost: String(inputTotalCost).replace('.', ','),           // Initial cost (string)
          assembly_weight_kg: isAssemblyOnlyStep ? String(inputYieldWeight).replace('.', ',') : '', // Pre-fill with yield, as string
          weight_portioned: isPortioningOnlyStep ? String(inputYieldWeight).replace('.', ',') : '', // Pre-fill with yield, as string
        };


        targetPrep.sub_components.push(newSubComponent);
      }

      // Recalculate metrics after adding an item to a preparation
      setTimeout(() => handleRecalculate(recipeData, newPreparations), 0);
      return newPreparations;
    });

    setSearchModalOpen(false);
    setIsAssemblyItemModalOpen(false);
    setIsDirty(true);
  };

  const handleTitleChange = (prepIndex, newTitle) => {
    updatePreparation(prepIndex, 'title', newTitle);
  };

  const handleTitleBlur = (prepIndex) => {
    setIsDirty(true);
  };

  const updateAssemblyItemQuantity = (prepIndex, subComponentIndex, quantity) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]?.sub_components?.[subComponentIndex]) {
        newPreparations[prepIndex].sub_components[subComponentIndex].quantity = parseFloat(quantity) || 1;
      }
      return newPreparations;
    });
    setIsDirty(true);
  };

  const removeGroupItem = (groupIndex, itemIndex) => {
    setGroups(prev => {
      const newGroups = [...prev];
      newGroups[groupIndex].items.splice(itemIndex, 1);

      return newGroups;
    });
  };

  // EARLY RETURNS - SEMPRE DEPOIS DE TODOS OS HOOKS
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
          <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // MAIN JSX RETURN
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Card de Cabeçalho */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <ClipboardList className="h-5 w-5" />
                <h1 className="text-xl font-semibold">Ficha Técnica</h1>
              </div>
              <p className="text-gray-500 text-sm">
                Crie e estruture suas receitas com detalhes profissionais
              </p>
            </div>

            <div className="relative search-container">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={handleQueryChange}
                onFocus={handleInputFocus}
                onKeyDown={handleKeyDown}
                placeholder="Buscar receita..."
                className="w-full pl-10 pr-12 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Settings
                  className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer"
                  onClick={() => setShowConfigDialog(true)}
                />
              </div>

              {searchOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  <div className="p-2">
                    {filteredRecipes.length === 0 ? (
                      <div className="p-3 text-center text-gray-500">
                        Nenhuma receita encontrada
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {filteredRecipes.map(recipe => (
                          <div
                            key={recipe.id}
                            className="p-2 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
                            onClick={() => handleRecipeSelect(recipe.id)}
                          >
                            <CookingPot className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium">{recipe.name}</div>
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

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsPrintDialogOpen(true)}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-2"
              >
                <Printer className="h-4 w-4" />
                Ficha Técnica Completa
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsPrintCollectDialogOpen(true)}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-2"
              >
                <ClipboardCheck className="h-4 w-4" />
                Ficha de Coleta
              </Button>

              <Button
                variant="outline"
                onClick={handleClear}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-2"
              >
                <FilePlus className="h-4 w-4" />
                Nova Ficha
              </Button>

              <div className="flex-grow"></div>

              <Button
                onClick={handleSave}
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
            <CardTitle className="text-lg font-semibold text-gray-700">Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 items-start">
              <div>
                <Label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <span className="text-blue-500 mr-1.5">&#9679;</span> Nome Principal *
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={recipeData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Maminha Assada"
                  required
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="name_complement" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <span className="text-purple-500 mr-1.5">&#9679;</span> Complemento (opcional)
                </Label>
                <Input
                  id="name_complement"
                  name="name_complement" // Corrigido para name_complement
                  value={recipeData.name_complement} // Corrigido para name_complement
                  onChange={handleInputChange}
                  placeholder="Ex: ao molho de mostarda"
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="cuba_weight" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <span className="text-pink-500 mr-1.5">&#9679;</span> Peso da Cuba (kg)
                </Label>
                <Input
                  id="cuba_weight"
                  name="cuba_weight"
                  type="text" // Changed to text to allow comma input
                  value={recipeData.cuba_weight || ''}
                  onChange={handleCubaWeightChange} // Use the specific handler
                  placeholder="Ex: 3,5"
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md::grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="category"
                  className="text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  Categoria
                </Label>
                <Select
                  value={recipeData.category}
                  onValueChange={(value) => {
                    setRecipeData({ ...recipeData, category: value });
                    setIsDirty(true);
                  }}
                >
                  <SelectTrigger id="category" className="transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-400">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories
                      .filter(cat => cat.level === 2 && (!selectedCategory || cat.parent_id === selectedCategory))
                      .map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="prep_time"
                  className="text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                  Tempo de Preparo (min)
                </Label>
                <Input
                  id="prep_time"
                  type="number"
                  min="0"
                  value={recipeData.prep_time}
                  onChange={(e) => {
                    setRecipeData({ ...recipeData, prep_time: parseInt(e.target.value) || 0 });
                    setIsDirty(true);
                  }}
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
                  {(parseNumericValue(recipeData.total_weight)).toFixed(3).replace('.', ',')}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-200">
                <div className="text-sm font-medium text-blue-600 mb-1">Peso Total (Rendimento)</div>
                <div className="text-xl font-bold flex items-center text-blue-700">
                  <span className="text-blue-400 mr-1">kg</span>
                  {(parseNumericValue(recipeData.yield_weight)).toFixed(3).replace('.', ',')}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 hover:shadow-md transition-all duration-200">
                <div className="text-sm font-medium text-green-600 mb-1">Custo por Kg (Bruto)</div>
                <div className="text-xl font-bold flex items-center text-green-700">
                  <span className="text-green-400 mr-1">R$</span>
                  {formatCurrency(parseNumericValue(recipeData.cost_per_kg_raw))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200 hover:shadow-md transition-all duration-200">
                <div className="text-sm font-medium text-indigo-600 mb-1">Custo por Kg (Rendimento)</div>
                <div className="text-xl font-bold flex items-center text-indigo-700">
                  <span className="text-indigo-400 mr-1">R$</span>
                  {formatCurrency(parseNumericValue(recipeData.cost_per_kg_yield))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 hover:shadow-md transition-all duration-200">
                <div className="text-sm font-medium text-purple-600 mb-1">Peso da Cuba (Rendimento)</div>
                <div className="text-xl font-bold flex items-center text-purple-700">
                  <span className="text-purple-400 mr-1">kg</span>
                  {(parseNumericValue(recipeData.cuba_weight)).toFixed(3).replace('.', ',')}
                </div>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg border border-pink-200 hover:shadow-md transition-all duration-200">
                <div className="text-sm font-medium text-pink-600 mb-1">Custo da Cuba</div>
                <div className="text-xl font-bold flex items-center text-pink-700">
                  <span className="text-pink-400 mr-1">R$</span>
                  {formatCurrency(calculateCubaCost())}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sistema de Abas */}
        <Card className="bg-white shadow-sm border">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-200 px-6 pt-6">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100">
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

              <div className="space-y-6">
                {renderPreparationCards()}
              </div>
            </TabsContent>

            <TabsContent value="pre-preparo" className="p-6 bg-gray-50 rounded-b-lg">
              {renderPrePreparoSection()}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Dialogs */}
        <RecipeTechnicalPrintDialog
          recipe={recipeData}
          preparations={preparationsData}
          isOpen={isPrintDialogOpen}
          onClose={() => setIsPrintDialogOpen(false)}
        />

        <RecipeTechnicalCollectDialog
          recipe={recipeData}
          preparations={preparationsData}
          isOpen={isPrintCollectDialogOpen}
          onClose={() => setIsPrintCollectDialogOpen(false)}
        />

        <ProcessCreatorDialog />

        {/* Modal de Cópia de Receita */}
        <Dialog open={isRecipeCopyModalOpen} onOpenChange={setIsRecipeCopyModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CookingPot className="w-5 h-5 text-emerald-600" />
                Copiar Receita Existente
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Seleção da Receita Fonte */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Receita Fonte</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Digite para buscar receitas..."
                    value={sourceRecipeSearch}
                    onChange={(e) => setSourceRecipeSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="bg-gray-50 rounded-md max-h-[200px] overflow-y-auto border">
                  {filteredSourceRecipes.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {sourceRecipeSearch ? 'Nenhuma receita encontrada' : 'Busque ou selecione uma receita'}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredSourceRecipes.map(recipe => (
                        <button
                          key={recipe.id}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors ${
                            selectedSourceRecipe?.id === recipe.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''
                          }`}
                          onClick={() => {
                            setSelectedSourceRecipe(recipe);
                            // CORREÇÃO: Limpar o campo de busca após seleção para ocultar a lista
                            setSourceRecipeSearch(recipe.name);
                          }}
                        >
                          <div className="font-medium text-gray-800">{recipe.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {recipe.category && `Categoria: ${recipe.category} • `}
                            Rendimento: {formatWeight((parseNumericValue(recipe.yield_weight) || 0) * 1000)}
                            {recipe.total_cost && ` • Custo: ${recipe.total_cost !== undefined && recipe.total_cost !== null ? formatCurrency(recipe.total_cost) : ''}`}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Seleção do Nível de Cópia */}
              {selectedSourceRecipe && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Copiar até qual nível:</Label>
                  <div className="space-y-2">
                    {/* REMOVIDO: Opção "Apenas Ingredientes Crus" */}

                    {sourceRecipeStages.map(stage => (
                      <label key={stage.value} className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="stageLevel"
                          value={stage.value}
                          checked={selectedStageLevel === stage.value}
                          onChange={(e) => setSelectedStageLevel(e.target.value)}
                          className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                        />
                        <div>
                          <div className="font-medium text-gray-800">{stage.label}</div>
                          <div className="text-sm text-gray-500">{stage.description}</div>
                        </div>
                      </label>
                    ))}

                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="stageLevel"
                        value="complete"
                        checked={selectedStageLevel === 'complete'}
                        onChange={(e) => setSelectedStageLevel(e.target.value)}
                        className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                      />
                      <div>
                        <div className="font-medium text-gray-800">Receita Completa (todas as etapas)</div>
                        <div className="text-sm text-gray-500">Copiar receita inteira com todos os processamentos</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Preview da Cópia */}
              {recipePreview && (
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <h4 className="font-medium text-emerald-800 mb-2">Preview da Cópia:</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-emerald-600 font-medium">Ingredientes:</span>
                      <div className="text-emerald-800">{recipePreview.ingredientsCount} itens</div>
                    </div>
                    <div>
                      <span className="text-emerald-600 font-medium">Peso Total:</span>
                      <div className="text-emerald-800">{formatWeight(recipePreview.totalWeight * 1000)}</div>
                    </div>
                    <div>
                      <span className="text-emerald-600 font-medium">Custo:</span>
                      <div className="text-emerald-800">{formatCurrency(recipePreview.totalCost)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsRecipeCopyModalOpen(false);
                  setSelectedSourceRecipe(null);
                  setSourceRecipeSearch(''); // Limpar busca
                  setSelectedStageLevel('complete');
                  setRecipePreview(null);
                  setFilteredSourceRecipes([]); // Limpar lista filtrada
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={copyRecipeData}
                disabled={!selectedSourceRecipe || !selectedStageLevel}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CookingPot className="mr-2 h-4 w-4" />
                Copiar Dados
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Processo detalhado modal */}
        <Dialog open={isDetailedProcessDialogOpen} onOpenChange={setDetailedProcessDialogOpen}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Processo Detalhado do Item: {currentIngredient?.name || "Ingrediente"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {currentIngredient && (
                <>
                  {/* Seção de Descongelamento */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="text-blue-800 font-medium mb-3 flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      Processo de Descongelamento
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="detail-frozen">Peso Congelado (kg)</Label>
                        <Input id="detail-frozen" type="number" value={processFormData.weight_frozen} onChange={(e) => setProcessFormData(prev => ({ ...prev, weight_frozen: parseNumericValue(e.target.value) }))} className="mt-1" min="0" step="0.001" />
                      </div>
                      <div>
                        <Label htmlFor="detail-thawed">Peso Resfriado (kg)</Label>
                        <Input id="detail-thawed" type="number" value={processFormData.weight_thawed} onChange={(e) => setProcessFormData(prev => ({ ...prev, weight_thawed: parseNumericValue(e.target.value) }))} className="mt-1" min="0" step="0.001" />
                      </div>
                      <div>
                        <Label>Perda Descongelamento (%)</Label>
                        <div className="h-10 px-3 py-2 rounded-md border border-input bg-background mt-1 text-left">
                          {(() => { const f = processFormData.weight_frozen, t = processFormData.weight_thawed; return f && t && f > 0 ? (((f - t) / f) * 100).toFixed(2).replace('.',',') : '0.00'; })()}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção de Limpeza */}
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                    <h3 className="text-amber-800 font-medium mb-3 flex items-center">
                      <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
                      Processo de Limpeza
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Peso Bruto (Entrada Limpeza)</Label>
                        <div className="h-10 px-3 py-2 rounded-md border border-input bg-gray-100 mt-1 text-left">
                          {(processFormData.weight_thawed || parseNumericValue(currentIngredient.weight_thawed) || parseNumericValue(currentIngredient.weight_frozen) || parseNumericValue(currentIngredient.weight_raw) || 0).toFixed(3).replace('.', ',')} kg
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="detail-clean">Pós Limpeza (kg)</Label>
                        <Input id="detail-clean" type="number" value={processFormData.weight_clean} onChange={(e) => setProcessFormData(prev => ({ ...prev, weight_clean: parseNumericValue(e.target.value) }))} className="mt-1" min="0" step="0.001" />
                      </div>
                      <div>
                        <Label>Perda Limpeza (%)</Label>
                        <div className="h-10 px-3 py-2 rounded-md border border-input bg-background mt-1 text-left">
                          {(() => { const r = (processFormData.weight_thawed || parseNumericValue(currentIngredient.weight_thawed) || parseNumericValue(currentIngredient.weight_frozen) || parseNumericValue(currentIngredient.weight_raw) || 0), c = processFormData.weight_clean; return r && c && r > 0 ? (((r - c) / r) * 100).toFixed(2).replace('.',',') : '0.00'; })()}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção de Cocção */}
                  <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
                    <h3 className="text-rose-800 font-medium mb-3 flex items-center">
                      <div className="w-3 h-3 bg-rose-500 rounded-full mr-2"></div>
                      Processo de Cocção
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Peso Pré-Cocção (Entrada Cocção)</Label>
                        <div className="h-10 px-3 py-2 rounded-md border border-input bg-gray-100 mt-1 text-left">
                          {(processFormData.weight_clean || parseNumericValue(currentIngredient.weight_clean) || processFormData.weight_thawed || parseNumericValue(currentIngredient.weight_thawed) || parseNumericValue(currentIngredient.weight_frozen) || parseNumericValue(currentIngredient.weight_raw) || 0).toFixed(3).replace('.', ',')} kg
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="detail-cooked">Pós Cocção (kg)</Label>
                        <Input id="detail-cooked" type="number" value={processFormData.weight_cooked} onChange={(e) => setProcessFormData(prev => ({ ...prev, weight_cooked: parseNumericValue(e.target.value) }))} className="mt-1" min="0" step="0.001" />
                      </div>
                      <div>
                        <Label>Perda Cocção (%)</Label>
                        <div className="h-10 px-3 py-2 rounded-md border border-input bg-background mt-1 text-left">
                          {(() => { const pre = (processFormData.weight_clean || parseNumericValue(currentIngredient.weight_clean) || processFormData.weight_thawed || parseNumericValue(currentIngredient.weight_thawed) || parseNumericValue(currentIngredient.weight_frozen) || parseNumericValue(currentIngredient.weight_raw) || 0), cooked = processFormData.weight_cooked; return pre && cooked && pre > 0 ? (((pre - cooked) / pre) * 100).toFixed(2).replace('.',',') : '0.00'; })()}%
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {!currentIngredient && <p className="text-center text-gray-500">Nenhum ingrediente selecionado para detalhamento.</p>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setDetailedProcessDialogOpen(false);
                setCurrentPrepIndexForDetail(null);
                setCurrentItemIndexForDetail(null);
                setCurrentIngredient(null);
              }}>
                Cancelar
              </Button>
              <Button type="button" onClick={applyDetailedProcess} className="bg-blue-600 hover:bg-blue-700" disabled={!currentIngredient}>
                Aplicar Alterações ao Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL DE ADIÇÃO DE INGREDIENTES/RECEITAS */}
        <Dialog open={searchModalOpen} onOpenChange={(isOpen) => {
          setSearchModalOpen(isOpen);
          if (!isOpen) {
            setIngredientSearchTerm("");
          }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {currentItemType === "ingredient" ? (
                  <>
                    <Package className="w-5 h-5 text-blue-600" /> Adicionar Ingrediente
                  </>
                ) : (
                  <>
                    <CookingPot className="w-5 h-5 text-green-600" /> Adicionar Receita ao Grupo
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {currentItemType === "ingredient" && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Pesquisar ingrediente..."
                    value={ingredientSearchTerm}
                    onChange={(e) => setIngredientSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}

              <div className="bg-gray-50 rounded-md max-h-[400px] overflow-y-auto border">
                <div className="divide-y divide-gray-200">
                  {(currentItemType === "ingredient"
                    ? ingredients.filter(ing =>
                      ing.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase())
                    )
                    : recipes
                  ).map(item => (
                    <button
                      key={item.id}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors duration-150 flex items-center justify-between group"
                      onClick={() => {
                        if (currentItemType === "ingredient") {
                          addItemToPreparation(item, true, currentPrepIndex);
                        } else {
                          toast({ title: "Ação não implementada", description: "Adicionar receita a grupo ainda não está completo." });
                        }
                        setIsDirty(true);
                      }}
                    >
                      <div>
                        <div className="font-medium text-gray-800 group-hover:text-blue-600">{item.name}</div>
                        {currentItemType === "ingredient" && item.unit && item.current_price !== undefined && (
                          <div className="text-xs text-gray-500 group-hover:text-gray-600">
                            Unidade: {item.unit} • Preço: {formatCurrency(item.current_price)}/kg
                          </div>
                        )}
                        {currentItemType === "recipe" && item.category && item.yield_weight !== undefined && (
                          <div className="text-xs text-gray-500 group-hover:text-gray-600">
                            Categoria: {item.category} • Rendimento: {formatWeight(parseNumericValue(item.yield_weight) * 1000)}
                          </div>
                        )}
                      </div>
                      <Plus className="h-4 w-4 text-gray-400" />
                    </button>
                  ))}
                </div>
                {currentItemType === "ingredient" && ingredients.filter(ing => ing.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase())).length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500">
                    Nenhum ingrediente encontrado com "{ingredientSearchTerm}".
                  </div>
                )}
                {currentItemType === "recipe" && recipes.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500">
                    Nenhuma receita disponível.
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setSearchModalOpen(false);
                setIngredientSearchTerm("");
              }}>
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL DE ADIÇÃO DE ITEM À MONTAGEM */}
        <Dialog open={isAssemblyItemModalOpen} onOpenChange={setIsAssemblyItemModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Adicionar Item à Montagem
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div>
                <Label className="font-medium text-gray-700">Processos Anteriores (desta Ficha)</Label>
                <div className="bg-gray-50 rounded-md max-h-[200px] overflow-y-auto mt-1 border">
                  {preparationsData.filter((p, idx) => idx < currentPrepIndexForAssembly && p.title && !(p.processes?.includes('assembly') && (!p.ingredients || p.ingredients.length === 0) && (!p.sub_components || p.sub_components.length === 0))).length > 0 ? (
                    preparationsData
                      .filter((p, idx) =>
                        idx < currentPrepIndexForAssembly &&
                        p.title &&
                        !(p.processes?.includes('assembly') && (!p.ingredients || p.ingredients.length === 0) && (!p.sub_components || p.sub_components.length === 0))
                      )
                      .map(prevPrep => (
                        <button
                          key={`prep-${prevPrep.id}`}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center justify-between border-b last:border-b-0"
                          onClick={() => addItemToPreparation({
                            id: prevPrep.id,
                            title: prevPrep.title,
                            isRecipe: false,
                            yield_weight: prevPrep.total_yield_weight_prep || 0,
                            total_cost: prevPrep.total_cost_prep || 0
                          }, false, currentPrepIndexForAssembly)}
                        >
                          <div>
                            <div className="font-medium">{prevPrep.title}</div>
                            <div className="text-xs text-gray-500">
                              Rendimento: {formatWeight((parseNumericValue(prevPrep.total_yield_weight_prep) || 0) * 1000)} / Custo: {formatCurrency(parseNumericValue(prevPrep.total_cost_prep))}
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-gray-400" />
                        </button>
                      ))
                  ) : (
                    <p className="px-4 py-3 text-sm text-gray-500">Nenhum processo anterior utilizável nesta ficha.</p>
                  )}
                </div>
              </div>

              <div>
                <Label className="font-medium text-gray-700">Receitas Externas</Label>
                <div className="bg-gray-50 rounded-md max-h-[200px] overflow-y-auto mt-1 border">
                  {recipes.length > 0 ? (
                    recipes
                      .filter(r => r.id !== currentRecipeId) // Filter out the current recipe being edited
                      .map(rec => (
                        <button
                          key={`recipe-${rec.id}`}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center justify-between border-b last:border-b-0"
                          onClick={() => addItemToPreparation({
                            id: rec.id,
                            name: rec.name,
                            isRecipe: true,
                            yield_weight: rec.yield_weight || 0,
                            total_cost: rec.total_cost || 0
                          }, false, currentPrepIndexForAssembly)}
                        >
                          <div>
                            <div className="font-medium">{rec.name}</div>
                            <div className="text-xs text-gray-500">
                              Categoria: {rec.category} / Rendimento: {formatWeight(parseNumericValue(rec.yield_weight) * 1000)} / Custo: {formatCurrency(parseNumericValue(rec.total_cost))}
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-gray-400" />
                        </button>
                      ))
                  ) : (
                    <p className="px-4 py-3 text-sm text-gray-500">Nenhuma receita externa disponível.</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssemblyItemModalOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                <Label htmlFor="category">Categoria</Label>
                <Select
                  id="category"
                  name="category"
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    setIsDirty(true);
                  }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories
                      .filter(cat => cat.level === 1)
                      .map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                Fechar
              </Button>
              <Button
                onClick={saveConfiguration}
                disabled={configSaving}
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
      </div>
    </div>
  );
}
