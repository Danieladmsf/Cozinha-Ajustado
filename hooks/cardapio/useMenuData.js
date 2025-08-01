import { useState, useEffect, useCallback } from 'react';
import { CategoryTree } from "@/app/api/entities";
import { WeeklyMenu as WeeklyMenuEntity } from "@/app/api/entities";
import { Recipe } from "@/app/api/entities";
import { MenuCategory, MenuConfig } from "@/app/api/entities";
import { Customer } from "@/app/api/entities";
import { APP_CONSTANTS } from "@/lib/constants";
import { getWeekInfo } from "../shared/weekUtils";

export const useMenuData = (currentDate) => {
  const [categories, setCategories] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [weeklyMenu, setWeeklyMenu] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [menuConfig, setMenuConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [categoriesData, recipesData, customersData, configData] = await Promise.all([
        CategoryTree.list(),
        Recipe.list(),
        Customer.list(),
        loadMenuConfig()
      ]);


      // Log resumido apenas uma vez
      if (process.env.NODE_ENV === 'development') {
      }

      setCategories(categoriesData || []);
      setRecipes(recipesData || []);
      setCustomers(customersData || []);
      setMenuConfig(configData);

      await loadWeeklyMenu(currentDate);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  const loadMenuConfig = async () => {
    try {
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      
      // Primeiro tenta carregar do cache local se existir e for recente
      const cachedConfig = localStorage.getItem('menuConfig');
      if (cachedConfig) {
        try {
          const parsedConfig = JSON.parse(cachedConfig);
          
          // Verificar se cache tem formato antigo (camelCase)
          if (parsedConfig.categoryColors && !parsedConfig.category_colors) {
            // Migrar cache antigo para novo formato
            const migratedConfig = {
              ...parsedConfig,
              category_colors: parsedConfig.categoryColors,
              active_categories: parsedConfig.activeCategories || {},
              expanded_categories: parsedConfig.expandedCategories || [],
              fixed_dropdowns: parsedConfig.fixedDropdowns || {},
              available_days: parsedConfig.availableDays || [1, 2, 3, 4, 5],
              category_order: parsedConfig.categoryOrder || [],
              selected_main_categories: parsedConfig.selectedMainCategories || []
            };
            
            // Remover campos antigos
            delete migratedConfig.categoryColors;
            delete migratedConfig.activeCategories;
            delete migratedConfig.expandedCategories;
            delete migratedConfig.fixedDropdowns;
            delete migratedConfig.availableDays;
            delete migratedConfig.categoryOrder;
            delete migratedConfig.selectedMainCategories;
            
            localStorage.setItem('menuConfig', JSON.stringify(migratedConfig));
            return migratedConfig;
          }
          
          // Usar cache se disponível e no formato correto
          if (parsedConfig && Object.keys(parsedConfig).length > 0 && parsedConfig.category_colors !== undefined) {
            return parsedConfig;
          }
        } catch (e) {
          // Cache inválido, continua para carregar do banco
        }
      }
      
      const configs = await MenuConfig.query([
        { field: 'user_id', operator: '==', value: mockUserId },
        { field: 'is_default', operator: '==', value: true }
      ]);

      if (configs && configs.length > 0) {
        const config = configs[0];
        
        // Atualizar cache com dados do banco
        localStorage.setItem('menuConfig', JSON.stringify(config));
        
        return config;
      }
      return null;
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
      return null;
    }
  };

  const loadWeeklyMenu = async (date) => {
    try {
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      const { weekStart, weekKey, weekNumber, year } = getWeekInfo(date);

      const menus = await WeeklyMenuEntity.query([
        { field: 'user_id', operator: '==', value: mockUserId },
        { field: 'week_key', operator: '==', value: weekKey }
      ]);

      if (menus && menus.length > 0) {
        const menu = menus[0];
        setWeeklyMenu(menu);
      } else {
        setWeeklyMenu(null);
      }
    } catch (error) {
      console.error("ERRO AO CARREGAR MENU SEMANAL:", error);
      setWeeklyMenu(null);
    }
  };

  const refreshMenuConfig = useCallback(async () => {
    try {
      const configData = await loadMenuConfig();
      setMenuConfig(configData);
    } catch (error) {
      console.error("Erro ao atualizar configuração:", error);
    }
  }, []);

  const forceReloadFromDatabase = useCallback(async () => {
    try {
      
      // Limpar cache
      localStorage.removeItem('menuConfig');
      
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      const configs = await MenuConfig.query([
        { field: 'user_id', operator: '==', value: mockUserId },
        { field: 'is_default', operator: '==', value: true }
      ]);

      if (configs && configs.length > 0) {
        const config = configs[0];
        
        // Atualizar cache e estado
        localStorage.setItem('menuConfig', JSON.stringify(config));
        setMenuConfig(config);
        
        return config;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Erro no recarregamento forçado:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [currentDate]);

  // Detectar mudanças no localStorage e recarregar config
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'menuConfig') {
        refreshMenuConfig();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    categories,
    recipes,
    weeklyMenu,
    customers,
    menuConfig,
    loading,
    setWeeklyMenu,
    loadWeeklyMenu,
    refreshData: loadData,
    refreshMenuConfig,
    forceReloadFromDatabase
  };
};