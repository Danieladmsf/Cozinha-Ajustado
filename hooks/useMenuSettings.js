import { useState, useEffect, useCallback } from 'react';
import { CategoryType, CategoryTree } from "@/app/api/entities";
import { MenuConfig as MenuConfigEntity } from "@/app/api/entities";
import { Customer } from "@/app/api/entities";
import { APP_CONSTANTS } from "@/lib/constants";

export const useMenuSettings = () => {
  // Estados principais
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [configId, setConfigId] = useState(null);
  
  // Estados de configuração
  const [selectedMainCategories, setSelectedMainCategories] = useState([]);
  const [activeCategories, setActiveCategories] = useState({});
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [categoryColors, setCategoryColors] = useState({});
  const [fixedDropdowns, setFixedDropdowns] = useState({});
  const [availableDays, setAvailableDays] = useState([1, 2, 3, 4, 5]);
  const [categoryOrder, setCategoryOrder] = useState([]);
  const [clientCategorySettings, setClientCategorySettings] = useState({});

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [categoriesData, categoryTreeData, customersData] = await Promise.all([
        CategoryType.list(),
        CategoryTree.list(),
        Customer.list()
      ]);

      console.log('useMenuSettings: loadData - categoriesData:', categoriesData);
      console.log('useMenuSettings: loadData - categoryTreeData:', categoryTreeData);
      console.log('useMenuSettings: loadData - customersData:', customersData);

      setCategories(categoriesData || []);
      setCategoryTree(categoryTreeData || []);
      setCustomers(customersData || []);

      await loadConfig(categoriesData, categoryTreeData);
    } catch (error) {
      setError(`Erro ao carregar dados: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar configuração
  const loadConfig = async (categoriesData, categoryTreeData) => {
    try {
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      
      const configs = await MenuConfigEntity.query([
        { field: 'user_id', operator: '==', value: mockUserId },
        { field: 'is_default', operator: '==', value: true }
      ]);
      
      if (configs && configs.length > 0) {
        const config = configs[0];
        setConfigId(config.id);
        console.log('useMenuSettings: loadConfig - config loaded:', config);
        
        setExpandedCategories(config.expanded_categories || []);
        setCategoryColors(config.category_colors || {});
        setFixedDropdowns(config.fixed_dropdowns || {});
        setAvailableDays(config.available_days || [1, 2, 3, 4, 5]);
        setSelectedMainCategories(config.selected_main_categories || []);
        setClientCategorySettings(config.client_category_settings || {});
        
        const rootCategories = categoryTreeData.filter(cat => cat.level === 1);
        const categoriesToUse = rootCategories.length > 0 ? rootCategories : categoryTreeData;
        
        let orderToSet;
        if (config.category_order && config.category_order.length > 0) {
          // Filter out any IDs from config.category_order that are no longer valid categories
          const validConfigOrder = config.category_order.filter(id => categoriesToUse.some(cat => cat.id === id));
          // Add any new root categories that are not in the config.category_order
          const newRootCategoryIds = rootCategories.map(cat => cat.id).filter(id => !validConfigOrder.includes(id));
          orderToSet = [...validConfigOrder, ...newRootCategoryIds];
        } else {
          orderToSet = categoriesToUse.map(cat => cat.id);
        }
        
        setCategoryOrder(orderToSet);
        console.log('useMenuSettings: loadConfig - orderToSet:', orderToSet);
        
        if (config.active_categories) {
          setActiveCategories(config.active_categories);
        } else {
          const initialActiveState = {};
          categoriesData.forEach(category => {
            initialActiveState[category.id] = true;
          });
          setActiveCategories(initialActiveState);
          console.log('useMenuSettings: loadConfig - initial active state:', initialActiveState);
        }
      } else {
        await createDefaultConfig(categoryTreeData);
      }
    } catch (error) {
      setError("Não foi possível carregar as configurações do cardápio.");
    }
  };

  // Criar configuração padrão
  const createDefaultConfig = async (categoriesData) => {
    try {
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      
      const defaultConfig = {
        user_id: mockUserId,
        expanded_categories: [],
        category_colors: {},
        fixed_dropdowns: {},
        available_days: [1, 2, 3, 4, 5],
        category_order: categoriesData.length > 0 ? categoriesData.map(cat => cat.id) : [],
        is_default: true,
        active_categories: categoriesData.reduce((obj, category) => {
          obj[category.id] = true;
          return obj;
        }, {})
      };
      
      const newConfig = await MenuConfigEntity.create(defaultConfig);
      setConfigId(newConfig.id);
      console.log('useMenuSettings: createDefaultConfig - new config created:', newConfig);
    } catch (error) {
      setError("Não foi possível criar a configuração padrão.");
    }
  };

  // Salvar configurações
  const saveConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      
      const configData = {
        user_id: mockUserId,
        expanded_categories: expandedCategories || [],
        category_colors: categoryColors || {},
        fixed_dropdowns: fixedDropdowns || {},
        available_days: availableDays || [1, 2, 3, 4, 5],
        category_order: categoryOrder || [],
        active_categories: activeCategories || {},
        selected_main_categories: selectedMainCategories || [],
        client_category_settings: clientCategorySettings || {},
        is_default: true
      };
      console.log('useMenuSettings: saveConfig - configData being saved:', configData);
      
      if (configId) {
        await MenuConfigEntity.update(configId, configData);
      } else {
        const newConfig = await MenuConfigEntity.create(configData);
        setConfigId(newConfig.id);
      }
      
      // Atualizar localStorage - usar mesmo formato do banco (snake_case)
      const menuConfigForCache = {
        expanded_categories: configData.expanded_categories,
        category_colors: configData.category_colors,
        fixed_dropdowns: configData.fixed_dropdowns,
        available_days: configData.available_days,
        category_order: configData.category_order,
        active_categories: configData.active_categories,
        selected_main_categories: configData.selected_main_categories
      };
      localStorage.setItem('menuConfig', JSON.stringify(menuConfigForCache));
      
      return true;
    } catch (error) {
      setError("Não foi possível salvar as configurações.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Funções utilitárias
  const getFilteredCategories = () => {
    console.log('useMenuSettings: getFilteredCategories - selectedMainCategories:', selectedMainCategories);
    if (selectedMainCategories.length === 0) {
      console.log('useMenuSettings: getFilteredCategories - returning all categoryTree (no filter):', categoryTree);
      return categoryTree;
    }
    
    const filteredCategories = categoryTree.filter(subCategory => {
      const mainCategory = categories.find(cat => 
        cat.value === subCategory.type
      );
      
      if (mainCategory) {
        return selectedMainCategories.includes(mainCategory.value);
      }
      
      return false;
    });
    console.log('useMenuSettings: getFilteredCategories - returning filtered categories:', filteredCategories);
    return filteredCategories;
  };

  const toggleCategoryActive = (categoryId) => {
    setActiveCategories(prev => ({
      ...prev,
      [categoryId]: !Boolean(prev[categoryId])
    }));
  };

  const toggleExpandedCategory = (categoryId) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const updateCategoryColor = (categoryId, color) => {
    setCategoryColors(prev => ({
      ...prev,
      [categoryId]: color
    }));
  };

  const updateFixedDropdowns = (categoryId, value) => {
    const numValue = parseInt(value) || 0;
    setFixedDropdowns(prev => ({
      ...prev,
      [categoryId]: Math.max(0, Math.min(10, numValue))
    }));
  };

  const toggleDay = (day) => {
    setAvailableDays(prev => {
      if (prev.includes(day)) {
        if (prev.length > 1) {
          return prev.filter(d => d !== day);
        }
        return prev;
      } else {
        return [...prev, day].sort((a, b) => a - b);
      }
    });
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // Estados
    categories,
    categoryTree,
    customers,
    loading,
    saving,
    error,
    selectedMainCategories,
    activeCategories,
    expandedCategories,
    categoryColors,
    fixedDropdowns,
    availableDays,
    categoryOrder,
    clientCategorySettings,
    
    // Setters
    setSelectedMainCategories,
    setActiveCategories,
    setExpandedCategories,
    setCategoryColors,
    setFixedDropdowns,
    setAvailableDays,
    setCategoryOrder,
    setClientCategorySettings,
    
    // Funções
    saveConfig,
    getFilteredCategories,
    toggleCategoryActive,
    toggleExpandedCategory,
    updateCategoryColor,
    updateFixedDropdowns,
    toggleDay
  };
};