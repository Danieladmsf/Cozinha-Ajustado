import { useState, useEffect, useCallback } from 'react';
import { useLocationSelection } from './useLocationSelection';

/**
 * Hook para gerenciar configurações específicas por cliente
 * Aplica filtros e personalizações baseadas no cliente selecionado
 * 
 * @param {Object} menuConfig - Configurações do menu
 * @param {string[]} allClientIds - Array com todos os IDs de clientes disponíveis
 */
export const useClientConfig = (menuConfig, allClientIds = []) => {
  const [selectedClientId, setSelectedClientId] = useState(null);
  
  // Hook de seleção de locations para interpretar dados corretamente
  const locationSelection = useLocationSelection(allClientIds);

  /**
   * Filtra categorias baseado nas configurações do cliente selecionado
   */
  const filterCategoriesForClient = useCallback((categories, clientId) => {
    if (!clientId || !menuConfig?.client_category_settings?.[clientId]) {
      return categories; // Sem cliente selecionado, mostra todas as categorias
    }

    const clientSettings = menuConfig.client_category_settings[clientId];
    
    return categories.filter(category => {
      const setting = clientSettings[category.id];
      // Se não há configuração específica, assume visível por padrão
      return setting?.visible !== false;
    });
  }, [menuConfig]);

  /**
   * Obtém quantidade de dropdowns para uma categoria específica do cliente
   */
  const getClientDropdownsForCategory = useCallback((categoryId, clientId) => {
    if (!clientId || !menuConfig?.client_category_settings?.[clientId]?.[categoryId]) {
      // Sem configuração específica, usa o padrão global
      return menuConfig?.fixed_dropdowns?.[categoryId] || 0;
    }

    const clientSetting = menuConfig.client_category_settings[clientId][categoryId];
    
    // Se tem configuração específica para este cliente, usa ela
    if (clientSetting.dropdowns !== null && clientSetting.dropdowns !== undefined) {
      return clientSetting.dropdowns;
    }
    
    // Senão, usa padrão global
    return menuConfig?.fixed_dropdowns?.[categoryId] || 0;
  }, [menuConfig]);

  /**
   * Verifica se uma categoria é visível para o cliente
   */
  const isCategoryVisibleForClient = useCallback((categoryId, clientId) => {
    if (!clientId || !menuConfig?.client_category_settings?.[clientId]?.[categoryId]) {
      return true; // Sem configuração específica, assume visível
    }

    const clientSetting = menuConfig.client_category_settings[clientId][categoryId];
    return clientSetting.visible !== false;
  }, [menuConfig]);

  /**
   * Filtra itens de menu baseado no cliente selecionado
   * Usa a lógica centralizada do useLocationSelection para consistência
   * 
   * @param {Array} items - Itens do menu para filtrar
   * @param {string} categoryId - ID da categoria dos itens
   * @param {string} clientId - ID do cliente para filtrar (ou 'all' para todos)
   * @returns {Array} Itens filtrados para o cliente
   */
  const getFilteredItemsForClient = useCallback((items, categoryId, clientId) => {
    // Se for "todos" ou sem cliente, retorna todos os itens
    if (!clientId || clientId === 'all') {
      return items;
    }

    // PRIMEIRO: Filtrar por locais de servimento usando lógica centralizada
    const filteredByLocation = items.filter(item => 
      locationSelection.isLocationSelected(item.locations, clientId)
    );

    // SEGUNDO: Aplicar configurações específicas do cliente
    const clientSettings = menuConfig?.client_category_settings?.[clientId];
    const categorySettings = clientSettings?.[categoryId];

    if (categorySettings) {
      // Se a categoria não está visível para este cliente
      if (!categorySettings.visible) {
        return [];
      }

      // Limitar número de itens baseado na configuração do cliente
      const maxItems = categorySettings.dropdowns !== null && categorySettings.dropdowns !== undefined 
        ? categorySettings.dropdowns 
        : (menuConfig?.fixed_dropdowns?.[categoryId] || filteredByLocation.length);
      
      return filteredByLocation.slice(0, maxItems);
    }

    // TERCEIRO: Aplicar configuração global de dropdowns fixos
    const globalDropdowns = menuConfig?.fixed_dropdowns?.[categoryId];
    if (globalDropdowns !== undefined) {
      return filteredByLocation.slice(0, globalDropdowns);
    }

    return filteredByLocation;
  }, [locationSelection, menuConfig]);

  /**
   * Aplica todas as configurações do cliente nas categorias
   */
  const applyClientConfig = useCallback((categories, clientId) => {
    if (!clientId) return categories;

    return filterCategoriesForClient(categories, clientId).map(category => ({
      ...category,
      clientDropdowns: getClientDropdownsForCategory(category.id, clientId),
      visibleForClient: isCategoryVisibleForClient(category.id, clientId)
    }));
  }, [filterCategoriesForClient, getClientDropdownsForCategory, isCategoryVisibleForClient]);

  return {
    selectedClientId,
    setSelectedClientId,
    filterCategoriesForClient,
    getClientDropdownsForCategory,
    isCategoryVisibleForClient,
    applyClientConfig,
    getFilteredItemsForClient
  };
};