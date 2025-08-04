import { useCallback } from 'react';

/**
 * Hook específico para aplicar filtros de configuração do menu
 * Centraliza toda a lógica de filtragem baseada nas configurações salvas
 */
export const useMenuConfigFilters = () => {
  
  /**
   * Filtra categorias baseado nas configurações salvas:
   * 1. Categorias principais selecionadas (selected_main_categories)
   * 2. Categorias ativas (activeCategories)  
   * 3. Ordem personalizada (category_order)
   */
  const filterActiveCategories = useCallback((categories, menuConfig) => {
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
      return menuConfig.activeCategories?.[category.id] !== false;
    });

    // Aplicar ordem personalizada se existir
    if (menuConfig.category_order && menuConfig.category_order.length > 0) {
      return menuConfig.category_order
        .map(id => activeCategories.find(cat => cat.id === id))
        .filter(Boolean);
    }

    return activeCategories;
  }, []);

  /**
   * Filtra dias da semana baseado na configuração available_days
   */
  const filterAvailableDays = useCallback((menuConfig) => {
    return menuConfig?.available_days || [1, 2, 3, 4, 5];
  }, []);

  /**
   * Aplica cor personalizada ou usa cor padrão da categoria
   */
  const getCategoryColor = useCallback((categoryId, categories, menuConfig) => {
    const category = categories?.find(c => c.id === categoryId);
    return menuConfig?.categoryColors?.[categoryId] || 
           category?.color || 
           '#6B7280';
  }, []);

  /**
   * Valida se um dia está disponível nas configurações
   */
  const isDayAvailable = useCallback((day, menuConfig) => {
    const availableDays = filterAvailableDays(menuConfig);
    return availableDays.includes(day);
  }, [filterAvailableDays]);

  return {
    filterActiveCategories,
    filterAvailableDays, 
    getCategoryColor,
    isDayAvailable
  };
};