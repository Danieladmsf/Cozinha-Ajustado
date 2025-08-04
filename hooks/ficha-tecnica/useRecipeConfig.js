import { useState, useEffect, useCallback } from 'react';
import { CategoryType, User, Recipe } from '@/app/api/entities';
import { useToast } from '@/components/ui';
import { processTypes, defaultConfig, validationRules } from '@/lib/recipeConstants';

/**
 * Hook para gerenciar configurações da Ficha Técnica
 */
export function useRecipeConfig() {
  const { toast } = useToast();
  
  const [config, setConfig] = useState(defaultConfig);
  const [configSaving, setConfigSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categoryTypes, setCategoryTypes] = useState([]);
  const [selectedCategoryType, setSelectedCategoryType] = useState('');

  // Atualizar configuração
  const updateConfig = useCallback((key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Carregar tipos de categoria do banco via API
  const loadCategoryTypes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/category-types');
      const types = await response.json();
      
      if (!response.ok) {
        throw new Error(types.error || 'Erro ao carregar tipos');
      }
      
      setCategoryTypes(types || []);
      return { success: true, types };
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os tipos de categoria.",
        variant: "destructive"
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Carregar configuração do usuário via API
  const loadUserConfiguration = useCallback(async () => {
    try {
      // Buscar configuração do usuário atual via API
      const response = await fetch('/api/user');
      const userData = await response.json();
      
      if (!response.ok) {
        throw new Error(userData.error || 'Erro ao carregar usuário');
      }
      
      if (userData?.recipe_config) {
        const categoryType = userData.recipe_config.selected_category_type || 'refeicoes';
        setSelectedCategoryType(categoryType);
        updateConfig('selected_category_type', categoryType);
      }
      return { success: true, userData };
    } catch (error) {
      return { success: false, error };
    }
  }, [updateConfig]);

  // Salvar configuração no banco de dados
  const saveConfiguration = useCallback(async (categoryType) => {
    setConfigSaving(true);
    
    try {
      
      // Atualizar configuração do usuário via API
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipe_config: {
            selected_category_type: categoryType,
            selected_category: config.selectedCategory || '',
            selected_subcategory: config.selectedSubcategory || ''
          }
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar configuração');
      }
      
      setSelectedCategoryType(categoryType);
      updateConfig('selected_category_type', categoryType);
      
      
      toast({
        title: "Configurações salvas",
        description: "Suas preferências foram atualizadas com sucesso."
      });
      
      return { success: true };
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas configurações.",
        variant: "destructive"
      });
      return { success: false, error };
    } finally {
      setConfigSaving(false);
    }
  }, [config, updateConfig, toast]);

  // Helper function to recursively remove undefined values
  const removeUndefined = (obj) => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(removeUndefined).filter(item => item !== undefined);
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

  // Salvar receita completa (dados básicos + preparações)
  const saveRecipe = useCallback(async (recipeData, preparationsData = []) => {
    setConfigSaving(true);
    
    try {
      // Preparar dados da receita para salvamento (sanitizar undefined values)
      const recipeToSave = {
        name: recipeData.name || '',
        name_complement: recipeData.name_complement || '',
        category: recipeData.category || '',
        prep_time: parseFloat(recipeData.prep_time) || 0,
        total_weight: parseFloat(recipeData.total_weight) || 0,
        yield_weight: parseFloat(recipeData.yield_weight) || 0,
        cuba_weight: parseFloat(recipeData.cuba_weight) || 0,
        total_cost: parseFloat(recipeData.total_cost) || 0,
        cost_per_kg_raw: parseFloat(recipeData.cost_per_kg_raw) || 0,
        cost_per_kg_yield: parseFloat(recipeData.cost_per_kg_yield) || 0,
        cuba_cost: parseFloat(recipeData.cuba_cost) || 0, // NOVO: Campo do custo da cuba
        portion_cost: parseFloat(recipeData.portion_cost) || 0, // NOVO: Campo do custo da porção
        active: recipeData.active !== undefined ? recipeData.active : true,
        instructions: recipeData.instructions || '',
        preparations: preparationsData || []
      };

      // Recursively remove undefined values to prevent Firebase errors
      const sanitizedRecipe = removeUndefined(recipeToSave);

      let result;
      
      if (recipeData.id) {
        // Atualizar receita existente
        result = await Recipe.update(recipeData.id, sanitizedRecipe);
        
        toast({
          title: "Receita atualizada",
          description: `"${recipeData.name}" foi atualizada com sucesso.`
        });
      } else {
        // Criar nova receita
        result = await Recipe.create(sanitizedRecipe);
        
        toast({
          title: "Receita criada",
          description: `"${recipeData.name}" foi criada com sucesso.`
        });
      }

      return { success: true, recipe: result };
      
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a receita: " + error.message,
        variant: "destructive"
      });
      
      return { success: false, error };
    } finally {
      setConfigSaving(false);
    }
  }, [toast]);

  // Resetar configuração
  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  // Validar configuração
  const validateConfig = useCallback((configData) => {
    const errors = [];
    
    // Adicionar validações específicas aqui
    if (!configData.selectedCategory) {
      errors.push('Categoria deve ser selecionada');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // Obter tipos de processo
  const getProcessTypes = useCallback(() => {
    return processTypes;
  }, []);

  // Obter regras de validação
  const getValidationRules = useCallback(() => {
    return validationRules;
  }, []);

  // Carregar dados ao montar o componente
  useEffect(() => {
    const initializeConfig = async () => {
      await Promise.all([
        loadCategoryTypes(),
        loadUserConfiguration()
      ]);
    };
    
    initializeConfig();
  }, [loadCategoryTypes, loadUserConfiguration]);

  return {
    // Estado
    config,
    configSaving,
    loading,
    categoryTypes,
    selectedCategoryType,
    
    // Ações
    updateConfig,
    saveConfiguration,
    saveRecipe,
    resetConfig,
    loadCategoryTypes,
    loadUserConfiguration,
    
    // Utilitários
    validateConfig,
    getProcessTypes,
    getValidationRules,
    
    // Setters
    setSelectedCategoryType
  };
}