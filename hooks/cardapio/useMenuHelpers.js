import { useCallback } from 'react';

export const useMenuHelpers = () => {
  const getActiveCategories = useCallback((categories, menuConfig) => {
    if (!categories || !menuConfig) return [];
    
    // Primeiro filtro: categorias principais selecionadas
    let filteredCategories = categories;
    if (menuConfig.selected_main_categories && menuConfig.selected_main_categories.length > 0) {
      filteredCategories = categories.filter(category => {
        return menuConfig.selected_main_categories.includes(category.type);
      });
    }
    
    // Segundo filtro: categorias ativas (não desabilitadas)
    const activeCategories = filteredCategories.filter(category => {
      return menuConfig.active_categories?.[category.id] === true;
    });

    // Aplicar ordem personalizada se existir
    if (menuConfig.category_order && menuConfig.category_order.length > 0) {
      return menuConfig.category_order
        .map(id => activeCategories.find(cat => cat.id === id))
        .filter(Boolean);
    }

    return activeCategories;
  }, []);

  const getCategoryColor = useCallback((categoryId, categories, menuConfig) => {
    const category = categories?.find(c => c.id === categoryId);
    const configColor = menuConfig?.category_colors?.[categoryId];
    const categoryColor = category?.color;
    return configColor || categoryColor || '#6B7280';
  }, []);

  const filterRecipesBySearch = useCallback((recipes, categoryName, searchTerm) => {
    if (!Array.isArray(recipes) || recipes.length === 0) {
      return [];
    }
    
    // Mapeamento de nomes de categorias do sistema para categorias das receitas
    const categoryMapping = {
      'Acompanhamento': 'Acompanhamentos',
      'Sobremesas': 'Sobremesa',
      'Padrão': ['Padrão', 'Bhkm4hqX8a8NgALgm7fq']
    };
    
    // Determinar qual categoria de receita buscar
    let targetRecipeCategory = categoryName;
    if (categoryMapping[categoryName]) {
      targetRecipeCategory = Array.isArray(categoryMapping[categoryName]) 
        ? categoryMapping[categoryName]
        : categoryMapping[categoryName];
    }
    
    const availableRecipes = recipes.filter(r => {
      const isActive = r?.active !== false;
      
      let matchesCategory = false;
      
      if (Array.isArray(targetRecipeCategory)) {
        matchesCategory = targetRecipeCategory.includes(r?.category);
      } else {
        matchesCategory = r?.category === targetRecipeCategory;
      }
      
      return isActive && matchesCategory;
    });
    
    return availableRecipes.filter(recipe => 
      !searchTerm || 
      recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, []);

  const ensureMinimumItems = useCallback((categoryItems, fixedDropdowns) => {
    const items = [...categoryItems];
    while (items.length < fixedDropdowns) {
      items.push({
        recipe_id: null,
        locations: []
      });
    }
    return items;
  }, []);

  const generateCategoryStyles = useCallback((categoryColor) => {
    console.log('🎨 [generateCategoryStyles] Gerando estilos para cor:', categoryColor);
    
    const lighterColor = `${categoryColor}22`;
    const darkColor = `${categoryColor}99`;
    
    const styles = {
      headerStyle: {
        background: `linear-gradient(135deg, ${darkColor} 0%, ${lighterColor} 100%)`,
        borderBottom: `2px solid ${categoryColor}`
      },
      buttonStyle: {
        borderColor: `${categoryColor}40`,
        color: categoryColor
      }
    };
    
    console.log('🎨 [generateCategoryStyles] Estilos gerados:', styles);
    
    return styles;
  }, []);

  return {
    getActiveCategories,
    getCategoryColor,
    filterRecipesBySearch,
    ensureMinimumItems,
    generateCategoryStyles
  };
};