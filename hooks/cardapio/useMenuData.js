import { useState, useEffect, useCallback } from 'react';
import { CategoryTree } from "@/app/api/entities";
import { WeeklyMenu as WeeklyMenuEntity } from "@/app/api/entities";
import { Recipe } from "@/app/api/entities";
import { MenuConfig } from "@/app/api/entities";
import { Customer } from "@/app/api/entities";
import { APP_CONSTANTS } from "@/lib/constants";
import { getWeekInfo } from "../shared/weekUtils";

// Cache global para dados estáticos
let globalCache = {
  categories: null,
  recipes: null,
  customers: null,
  menuConfig: null,
  lastLoaded: null
};

// Cache para menus semanais
let weeklyMenuCache = new Map();

// Lista de listeners para sincronização entre instâncias
let cacheListeners = new Set();

// Função para notificar todos os listeners sobre mudanças no cache
const notifyCacheUpdate = (type, data) => {
  cacheListeners.forEach(listener => {
    listener(type, data);
  });
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const useMenuData = (currentDate) => {
  const [categories, setCategories] = useState(globalCache.categories || []);
  const [recipes, setRecipes] = useState(globalCache.recipes || []);
  const [weeklyMenu, setWeeklyMenu] = useState(null);
  const [customers, setCustomers] = useState(globalCache.customers || []);
  const [menuConfig, setMenuConfig] = useState(globalCache.menuConfig || null);
  const [loading, setLoading] = useState(!globalCache.categories);

  // Listener para sincronização entre instâncias
  useEffect(() => {
    const listener = (type, data) => {
      switch (type) {
        case 'initialData':
          setCategories(data.categories);
          setRecipes(data.recipes);
          setCustomers(data.customers);
          setMenuConfig(data.menuConfig);
          setLoading(false);
          break;
        case 'weeklyMenu':
          if (data.weekKey === getWeekInfo(currentDate).weekKey) {
            setWeeklyMenu(data.menu);
          }
          break;
        case 'menuConfig':
          setMenuConfig(data);
          break;
      }
    };

    cacheListeners.add(listener);
    return () => {
      cacheListeners.delete(listener);
    };
  }, [currentDate]);

  // Verifica se cache é válido
  const isCacheValid = () => {
    return globalCache.lastLoaded && 
           (Date.now() - globalCache.lastLoaded) < CACHE_DURATION &&
           globalCache.categories;
  };

  // Carregamento inicial com cache inteligente
  const loadInitialData = useCallback(async () => {
    try {
      console.log('🔄 [useMenuData] Iniciando carregamento de dados...');

      // Se cache é válido, usar dados do cache
      if (isCacheValid()) {
        console.log('✅ [useMenuData] Usando dados do cache válido');
        console.log('📊 [useMenuData] Cache:', {
          categories: globalCache.categories?.length,
          recipes: globalCache.recipes?.length,
          customers: globalCache.customers?.length,
          menuConfig: globalCache.menuConfig ? 'presente' : 'ausente'
        });
        setCategories(globalCache.categories);
        setRecipes(globalCache.recipes);
        setCustomers(globalCache.customers);
        setMenuConfig(globalCache.menuConfig);
        setLoading(false);
        return;
      }

      console.log('🔍 [useMenuData] Cache inválido ou ausente, carregando do banco...');
      setLoading(true);

      const [categoriesData, recipesData, customersData, configData] = await Promise.all([
        CategoryTree.list(),
        Recipe.list(),
        Customer.list(),
        loadMenuConfig()
      ]);

      console.log('📦 [useMenuData] Dados carregados do banco:', {
        categories: categoriesData?.length || 0,
        recipes: recipesData?.length || 0,
        customers: customersData?.length || 0,
        menuConfig: configData ? 'presente' : 'ausente'
      });

      // Atualizar estado e cache global
      const newData = {
        categories: categoriesData || [],
        recipes: recipesData || [],
        customers: customersData || [],
        menuConfig: configData,
        lastLoaded: Date.now()
      };

      globalCache = newData;

      setCategories(newData.categories);
      setRecipes(newData.recipes);
      setCustomers(newData.customers);
      setMenuConfig(newData.menuConfig);

      console.log('✅ [useMenuData] Dados carregados e cache atualizado com sucesso');

      // Notificar outras instâncias
      notifyCacheUpdate('initialData', newData);

    } catch (error) {
      console.error('❌ [useMenuData] Erro ao carregar dados iniciais:', error);
    } finally {
      setLoading(false);
    }
  }, []);



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
      return null;
    }
  };

  const loadWeeklyMenu = async (date) => {
    try {
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      const { weekStart, weekKey, weekNumber, year } = getWeekInfo(date);

      console.log('📅 [loadWeeklyMenu] Carregando menu semanal:', {
        date: date.toLocaleDateString(),
        weekKey,
        weekNumber,
        year,
        userId: mockUserId
      });

      // Verificar cache do menu semanal
      const cachedMenu = weeklyMenuCache.get(weekKey);
      if (cachedMenu && (Date.now() - cachedMenu.timestamp) < CACHE_DURATION) {
        console.log('✅ [loadWeeklyMenu] Usando menu do cache');
        console.log('📊 [loadWeeklyMenu] Menu em cache:', cachedMenu.data ? 'presente' : 'null');
        setWeeklyMenu(cachedMenu.data);
        return;
      }

      console.log('🔍 [loadWeeklyMenu] Consultando banco...');
      const menus = await WeeklyMenuEntity.query([
        { field: 'user_id', operator: '==', value: mockUserId },
        { field: 'week_key', operator: '==', value: weekKey }
      ]);

      console.log('📦 [loadWeeklyMenu] Resultado da query:', {
        encontrados: menus?.length || 0
      });

      if (menus && menus.length > 0) {
        const menu = menus[0];
        console.log('✅ [loadWeeklyMenu] Menu encontrado:', {
          id: menu.id,
          weekKey: menu.week_key,
          temMenuData: !!menu.menu_data,
          diasComDados: menu.menu_data ? Object.keys(menu.menu_data).length : 0
        });

        // Salvar no cache
        weeklyMenuCache.set(weekKey, {
          data: menu,
          timestamp: Date.now()
        });
        setWeeklyMenu(menu);

        // Notificar outras instâncias
        notifyCacheUpdate('weeklyMenu', { weekKey, menu });
      } else {
        console.log('⚠️ [loadWeeklyMenu] Nenhum menu encontrado para esta semana');

        // Salvar null no cache também
        weeklyMenuCache.set(weekKey, {
          data: null,
          timestamp: Date.now()
        });
        setWeeklyMenu(null);

        // Notificar outras instâncias
        notifyCacheUpdate('weeklyMenu', { weekKey, menu: null });
      }
    } catch (error) {
      console.error('❌ [loadWeeklyMenu] Erro ao carregar menu semanal:', error);
      setWeeklyMenu(null);
    }
  };

  const refreshMenuConfig = useCallback(async () => {
    try {
      const configData = await loadMenuConfig();
      setMenuConfig(configData);
      
      // Notificar outras instâncias
      notifyCacheUpdate('menuConfig', configData);
    } catch (error) {
      // Error updating config
    }
  }, []);

  const forceReloadFromDatabase = useCallback(async () => {
    try {
      // Limpar todos os caches
      localStorage.removeItem('menuConfig');
      globalCache = {
        categories: null,
        recipes: null,
        customers: null,
        menuConfig: null,
        lastLoaded: null
      };
      weeklyMenuCache.clear();
      
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
        
        // Notificar outras instâncias
        notifyCacheUpdate('menuConfig', config);
        
        return config;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }, []);

  // Função para invalidar cache específico
  const invalidateWeeklyMenuCache = useCallback((weekKey) => {
    if (weekKey) {
      weeklyMenuCache.delete(weekKey);
    } else {
      weeklyMenuCache.clear();
    }
  }, []);

  // Carregamento inicial
  useEffect(() => {
    loadInitialData();
  }, []);

  // Carregar menu da semana quando data muda
  useEffect(() => {
    setWeeklyMenu(null); // Limpa o menu antes de carregar um novo
    invalidateWeeklyMenuCache(getWeekInfo(currentDate).weekKey); // Invalida o cache para a semana atual
    if (categories.length > 0) { // Só carrega menu se já tiver dados iniciais
      loadWeeklyMenu(currentDate);
    }
  }, [currentDate, categories.length]);

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
    refreshData: loadInitialData,
    refreshMenuConfig,
    forceReloadFromDatabase,
    invalidateWeeklyMenuCache,
    isCacheValid: isCacheValid()
  };
};