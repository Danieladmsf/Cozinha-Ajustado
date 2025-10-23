import { useCallback } from 'react';
import { useToast } from '@/components/ui';

/**
 * Hook para gerenciar operações CRUD da Ficha Técnica
 * Extraído automaticamente de RecipeTechnicall.jsx
 */
export function useRecipeOperations() {
  const { toast } = useToast();

  // Função para parsing seguro
  const parseNumericValue = useCallback((value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleanValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
      const parsed = parseFloat(cleanValue);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }, []);

  // Operações de preparação
  const addPreparation = useCallback((preparationsData, setPreparationsData, newPreparation) => {
    const newPrep = {
      id: String(Date.now()),
      title: newPreparation.title || `${preparationsData.length + 1}º Processo`,
      ingredients: newPreparation.ingredients || [],
      sub_components: newPreparation.sub_components || [],
      instructions: newPreparation.instructions || "",
      processes: newPreparation.processes || ['cooking'],
      assembly_config: newPreparation.assembly_config,
      ...newPreparation
    };

    setPreparationsData(prev => [...prev, newPrep]);
    return newPrep;
  }, []);

  const updatePreparation = useCallback((preparationsData, setPreparationsData, prepIndex, field, value) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]) {
        newPreparations[prepIndex] = {
          ...newPreparations[prepIndex],
          [field]: value
        };
      }
      return newPreparations;
    });
  }, []);

  const removePreparation = useCallback((preparationsData, setPreparationsData, prepId) => {
    setPreparationsData(prev => prev.filter(prep => prep.id !== prepId));
    
    toast({
      title: "Processo removido",
      description: "O processo foi removido com sucesso.",
    });
  }, [toast]);

  // Operações de ingredientes
  const addIngredientToPreparation = useCallback((preparationsData, setPreparationsData, prepIndex, ingredient) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]) {
        // CORRIGIDO: Spread primeiro, depois garantir campos numéricos
        const newIngredient = {
          id: String(Date.now()),
          ...ingredient,
          name: ingredient.name,
          // Garantir que campos de peso sejam numéricos (0 se vazio)
          weight_raw: ingredient.weight_raw || 0,
          weight_frozen: ingredient.weight_frozen || 0,
          weight_thawed: ingredient.weight_thawed || 0,
          weight_clean: ingredient.weight_clean || 0,
          weight_cooked: ingredient.weight_cooked || 0,
          weight_portioned: ingredient.weight_portioned || 0,
          weight_pre_cooking: ingredient.weight_pre_cooking || 0,
          current_price: ingredient.current_price || 0,
          unit: ingredient.unit || 'kg',
        };

        newPreparations[prepIndex].ingredients = [
          ...(newPreparations[prepIndex].ingredients || []),
          newIngredient
        ];
      }
      return newPreparations;
    });
  }, []);

  const updateIngredient = useCallback((preparationsData, setPreparationsData, prepIndex, ingredientIndex, field, value) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]?.ingredients?.[ingredientIndex]) {
        // CORRIGIDO: Converter strings vazias para 0 em campos de peso
        const isWeightField = field.startsWith('weight_');
        const normalizedValue = isWeightField && value === '' ? 0 : value;

        newPreparations[prepIndex].ingredients[ingredientIndex] = {
          ...newPreparations[prepIndex].ingredients[ingredientIndex],
          [field]: normalizedValue
        };
      }
      return newPreparations;
    });
  }, []);

  const removeIngredient = useCallback((preparationsData, setPreparationsData, prepIndex, ingredientIndex) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]?.ingredients) {
        newPreparations[prepIndex].ingredients.splice(ingredientIndex, 1);
      }
      return newPreparations;
    });
  }, []);

  // Operações de sub-componentes
  const addSubComponent = useCallback((preparationsData, setPreparationsData, prepIndex, subComponent) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]) {
        const newSubComponent = {
          id: String(Date.now()),
          name: subComponent.name,
          type: subComponent.isRecipe ? 'recipe' : 'preparation',
          source_id: subComponent.id,
          assembly_weight_kg: 0,
          yield_weight: subComponent.yield_weight || 0,
          total_cost: subComponent.total_cost || 0,
          ...subComponent
        };
        
        newPreparations[prepIndex].sub_components = [
          ...(newPreparations[prepIndex].sub_components || []),
          newSubComponent
        ];
      }
      return newPreparations;
    });
  }, []);

  const updateSubComponent = useCallback((preparationsData, setPreparationsData, prepIndex, subCompIndex, field, value) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]?.sub_components?.[subCompIndex]) {
        newPreparations[prepIndex].sub_components[subCompIndex] = {
          ...newPreparations[prepIndex].sub_components[subCompIndex],
          [field]: value
        };
      }
      return newPreparations;
    });
  }, []);

  const removeSubComponent = useCallback((preparationsData, setPreparationsData, prepIndex, subCompIndex) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]?.sub_components) {
        newPreparations[prepIndex].sub_components.splice(subCompIndex, 1);
      }
      return newPreparations;
    });
  }, []);

  // Operações de receita
  const saveRecipe = useCallback(async (recipeData, preparationsData) => {
    // Lógica de salvamento será implementada aqui
  }, [toast]);

  const loadRecipe = useCallback(async (recipeId) => {
    try {
      const response = await fetch(`/api/recipes?id=${recipeId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      const recipe = result.data;

      if (!recipe) {
        throw new Error('Receita não encontrada');
      }

      // CORRIGIDO: Normalizar campos de peso vazios em ingredientes (Firestore omite strings vazias)
      const normalizedPreparations = (recipe.preparations || []).map(prep => ({
        ...prep,
        ingredients: (prep.ingredients || []).map(ing => ({
          ...ing,
          weight_raw: ing.weight_raw || 0,
          weight_frozen: ing.weight_frozen || 0,
          weight_thawed: ing.weight_thawed || 0,
          weight_clean: ing.weight_clean || 0,
          weight_cooked: ing.weight_cooked || 0,
          weight_portioned: ing.weight_portioned || 0,
          weight_pre_cooking: ing.weight_pre_cooking || 0,
        }))
      }));

      return {
        success: true,
        recipe: {
          id: recipe.id,
          name: recipe.name || '',
          name_complement: recipe.name_complement || '',
          category: recipe.category || '',
          prep_time: recipe.prep_time || 0,
          total_weight: recipe.total_weight || 0,
          yield_weight: recipe.yield_weight || 0,
          cuba_weight: recipe.cuba_weight || 0,
          total_cost: recipe.total_cost || 0,
          cost_per_kg_raw: recipe.cost_per_kg_raw || 0,
          cost_per_kg_yield: recipe.cost_per_kg_yield || 0,
          active: recipe.active !== undefined ? recipe.active : true,
          instructions: recipe.instructions || ''
        },
        preparations: normalizedPreparations
      };
    } catch (error) {
      toast({
        title: "Erro ao carregar",
        description: "Ocorreu um erro ao carregar a receita: " + error.message,
        variant: "destructive"
      });

      return { success: false, error };
    }
  }, [toast]);

  return {
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
  };
}