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
    
    // Função para normalizar texto (remover acentos e caracteres especiais)
    const normalizeText = (text) => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
    };
    
    // Mapeamento de nomes de categorias do sistema para categorias das receitas
    const categoryMapping = {
      'Acompanhamento': 'Acompanhamento', // Receitas usam singular mesmo
      'Sobremesas': 'Sobremesas', // Receitas usam plural mesmo  
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
    
    
    // Se não há termo de busca, retorna todas as receitas da categoria ordenadas alfabeticamente
    if (!searchTerm || searchTerm.trim() === '') {
      return availableRecipes.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }
    
    const normalizedSearchTerm = normalizeText(searchTerm);
    
    const filteredRecipes = availableRecipes.filter(recipe => {
      if (!recipe.name) return false;
      
      const normalizedRecipeName = normalizeText(recipe.name);
      
      // Se o termo de busca for uma palavra só ou sequência contínua, busca diretamente
      if (!normalizedSearchTerm.includes(' ')) {
        return normalizedRecipeName.includes(normalizedSearchTerm);
      }
      
      // Para múltiplas palavras, busca por qualquer uma das palavras (OR) em vez de todas (AND)
      const searchWords = normalizedSearchTerm.split(/\s+/).filter(word => word.length > 0);
      
      return searchWords.some(word => 
        normalizedRecipeName.includes(word)
      );
    });
    
    // Ordenar resultados filtrados alfabeticamente
    return filteredRecipes.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
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