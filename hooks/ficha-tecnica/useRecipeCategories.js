import { useState, useEffect, useCallback } from 'react';
import { CategoryTree, UserEntity, CategoryType } from '@/app/api/entities';
import { APP_CONSTANTS } from '@/lib/constants';

/**
 * Hook para gerenciar categorias da Ficha Técnica
 * Funcionalidades:
 * 1. Carregar categorias do CategoryTree baseado na configuração do usuário
 * 2. Exibir categoria selecionada da receita
 * 3. Permitir seleção de categoria ao criar/editar receita
 */
export function useRecipeCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userConfig, setUserConfig] = useState(null);

  // Carregar configuração do usuário para determinar qual tipo de categoria usar
  const loadUserConfig = useCallback(async () => {
    try {
      const userId = APP_CONSTANTS.MOCK_USER_ID;
      
      // Tenta carregar dados do usuário
      const userData = await UserEntity.getById(userId);
      
      
      if (userData?.recipe_config?.selected_category_type) {
        setUserConfig(userData);
        return userData.recipe_config.selected_category_type;
      }
      
      // Fallback para verificar se há selected_category_type diretamente no user
      if (userData?.selected_category_type) {
        setUserConfig(userData);
        return userData.selected_category_type;
      }
      
      return 'default'; // Valor padrão se não houver configuração
    } catch (error) {
      // Se o usuário não existe ou há erro, não é crítico
      return 'default';
    }
  }, []);

  // Carregar categorias baseado no tipo configurado
  const loadCategories = useCallback(async (categoryType = 'default') => {
    try {
      setLoading(true);
      setError(null);

      if (categoryType === 'default') {
        // Usar categorias padrão hardcoded
        const defaultCategories = [
          { id: 'entrada', name: 'Entrada', value: 'entrada' },
          { id: 'prato-principal', name: 'Prato Principal', value: 'prato-principal' },
          { id: 'sobremesa', name: 'Sobremesa', value: 'sobremesa' },
          { id: 'acompanhamento', name: 'Acompanhamento', value: 'acompanhamento' }
        ];
        
        setCategories(defaultCategories);
        return;
      }

      // Carregar do CategoryTree baseado no tipo via API
      const response = await fetch(`/api/category-tree?type=${categoryType}`);
      const filteredCategories = await response.json();
      
      if (!response.ok) {
        throw new Error(filteredCategories.error || 'Erro ao carregar categorias');
      }

      if (filteredCategories.length === 0) {
        // Fallback para categorias padrão
        const defaultCategories = [
          { id: 'entrada', name: 'Entrada', value: 'entrada' },
          { id: 'prato-principal', name: 'Prato Principal', value: 'prato-principal' },
          { id: 'sobremesa', name: 'Sobremesa', value: 'sobremesa' },
          { id: 'acompanhamento', name: 'Acompanhamento', value: 'acompanhamento' }
        ];
        setCategories(defaultCategories);
        return;
      }

      // Processar categorias carregadas
      const processedCategories = filteredCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        value: cat.name, // Usar o nome como valor para corresponder ao que está salvo nas receitas
        color: cat.color,
        order: cat.order || 0
      }));

      // Ordenar por ordem definida
      processedCategories.sort((a, b) => a.order - b.order);
      
      setCategories(processedCategories);

    } catch (error) {
      setError(error.message);
      
      // Fallback para categorias padrão em caso de erro
      const defaultCategories = [
        { id: 'entrada', name: 'Entrada', value: 'entrada' },
        { id: 'prato-principal', name: 'Prato Principal', value: 'prato-principal' },
        { id: 'sobremesa', name: 'Sobremesa', value: 'sobremesa' },
        { id: 'acompanhamento', name: 'Acompanhamento', value: 'acompanhamento' }
      ];
      setCategories(defaultCategories);
    } finally {
      setLoading(false);
    }
  }, []);

  // Inicializar dados
  useEffect(() => {
    const initializeCategories = async () => {
      const categoryType = await loadUserConfig();
      await loadCategories(categoryType);
    };

    initializeCategories();
  }, [loadUserConfig, loadCategories]);

  // Função para obter categorias com a categoria atual incluída se necessário
  const getCategoriesWithCurrent = useCallback((currentCategory) => {
    if (!currentCategory) return categories;
    
    // Verificar se a categoria atual já está na lista
    const exists = categories.some(cat => 
      cat.value === currentCategory || 
      cat.name === currentCategory ||
      cat.id === currentCategory
    );
    
    if (exists) {
      return categories;
    }
    
    // Se não existe, adicionar como categoria personalizada
    const customCategory = {
      id: `custom-${currentCategory}`,
      name: currentCategory,
      value: currentCategory,
      color: '#6b7280', // cor cinza para categorias personalizadas
      order: 999 // colocar no final
    };
    
    return [...categories, customCategory].sort((a, b) => a.order - b.order);
  }, [categories]);

  // Função para obter informações de uma categoria por ID ou nome
  const getCategoryInfo = useCallback((categoryIdentifier) => {
    if (!categoryIdentifier) return null;

    // Buscar por ID exato
    let category = categories.find(cat => cat.id === categoryIdentifier);
    if (category) return category;

    // Buscar por valor
    category = categories.find(cat => cat.value === categoryIdentifier);
    if (category) return category;

    // Buscar por nome (case insensitive)
    category = categories.find(cat => 
      cat.name.toLowerCase() === categoryIdentifier.toLowerCase()
    );
    if (category) return category;

    // Buscar por nome parcial
    category = categories.find(cat => 
      cat.name.toLowerCase().includes(categoryIdentifier.toLowerCase()) ||
      categoryIdentifier.toLowerCase().includes(cat.name.toLowerCase())
    );

    return category || null;
  }, [categories]);

  // Função para obter o nome de exibição de uma categoria
  const getCategoryDisplayName = useCallback((categoryIdentifier) => {
    const categoryInfo = getCategoryInfo(categoryIdentifier);
    return categoryInfo?.name || categoryIdentifier || 'Categoria não encontrada';
  }, [getCategoryInfo]);

  // Recarregar categorias
  const reloadCategories = useCallback(async () => {
    const categoryType = await loadUserConfig();
    await loadCategories(categoryType);
  }, [loadUserConfig, loadCategories]);

  return {
    categories,
    loading,
    error,
    userConfig,
    getCategoryInfo,
    getCategoryDisplayName,
    getCategoriesWithCurrent,
    reloadCategories
  };
}