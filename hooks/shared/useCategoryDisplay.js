import { useState, useEffect, useCallback } from 'react';
import { CategoryTree, MenuConfig } from '@/app/api/entities';
import { useMenuHelpers } from '@/hooks/cardapio/useMenuHelpers';
import { APP_CONSTANTS } from '@/lib/constants';

export const useCategoryDisplay = () => {
  const [categories, setCategories] = useState([]);
  const [menuConfig, setMenuConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const menuHelpers = useMenuHelpers();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [categoriesData, configData] = await Promise.all([
        CategoryTree.list(),
        loadMenuConfig()
      ]);
      
      
      setCategories(categoriesData || []);
      setMenuConfig(configData);
    } catch (error) {
      setCategories([]);
      setMenuConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMenuConfig = async () => {
    try {
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      
      const configs = await MenuConfig.query([
        { field: 'user_id', operator: '==', value: mockUserId },
        { field: 'is_default', operator: '==', value: true }
      ]);
      
      
      return configs && configs.length > 0 ? configs[0] : null;
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getCategoryInfo = useCallback((categoryId) => {
    const findCategory = () => {
      // 1. Buscar por ID exato
      let category = categories.find(c => c.id === categoryId);
      if (category) return category;
      
      // 2. Buscar por nome exato
      category = categories.find(c => c.name === categoryId);
      if (category) return category;
      
      // 3. Buscar por variações do nome (parcial)
      const variations = categories.filter(c => 
        c.name.toLowerCase().includes(categoryId.toLowerCase()) || 
        categoryId.toLowerCase().includes(c.name.toLowerCase())
      );
      
      return variations.length > 0 ? variations[0] : null;
    };

    const foundCategory = findCategory();
    const categoryIdForConfig = foundCategory?.id || categoryId;
    
    // Obter cor: configuração > categoria > padrão
    const configColor = menuConfig?.category_colors?.[categoryIdForConfig];
    const categoryColor = foundCategory?.color;
    const finalColor = configColor || categoryColor || '#6B7280';
    
    // Obter ordem da configuração
    const orderIndex = menuConfig?.category_order?.indexOf(categoryIdForConfig) ?? -1;
    
    return {
      id: categoryIdForConfig,
      name: foundCategory?.name || categoryId || 'Sem Categoria',
      color: finalColor,
      order: orderIndex
    };
  }, [categories, menuConfig]);

  const getOrderedCategories = useCallback((categoryGroups) => {
    const categoriesWithOrder = Object.entries(categoryGroups).map(([name, data]) => ({
      name,
      data,
      order: data.categoryInfo.order
    }));

    // Ordenar por ordem configurada, depois alfabética
    return categoriesWithOrder.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.name.localeCompare(b.name);
    });
  }, []);

  const groupItemsByCategory = useCallback((items, getItemCategory = (item) => item.category) => {
    if (!items || !Array.isArray(items)) return {};
    
    const groups = items.reduce((acc, item) => {
      const categoryId = getItemCategory(item) || 'sem-categoria';
      const categoryInfo = getCategoryInfo(categoryId);
      
      if (!acc[categoryInfo.name]) {
        acc[categoryInfo.name] = {
          categoryInfo,
          items: []
        };
      }
      
      acc[categoryInfo.name].items.push(item);
      return acc;
    }, {});

    // Filtrar apenas categorias que têm itens
    return Object.fromEntries(
      Object.entries(groups).filter(([, categoryData]) => 
        categoryData.items && categoryData.items.length > 0
      )
    );
  }, [getCategoryInfo]);

  const generateCategoryStyles = useCallback((categoryColor) => {
    return menuHelpers.generateCategoryStyles(categoryColor);
  }, [menuHelpers]);

  return {
    categories,
    menuConfig,
    loading,
    getCategoryInfo,
    groupItemsByCategory,
    getOrderedCategories,
    generateCategoryStyles,
    reload: loadData
  };
};