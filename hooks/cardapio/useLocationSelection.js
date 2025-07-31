import { useCallback } from 'react';

// ===== CONSTANTES DE ESTADO =====
const LOCATION_STATES = {
  ALL_SELECTED: 'ALL_SELECTED',    // Todos os clientes estão selecionados
  NONE_SELECTED: 'NONE_SELECTED',  // Nenhum cliente está selecionado  
  PARTIAL_SELECTED: 'PARTIAL_SELECTED' // Alguns clientes estão selecionados
};

const SPECIAL_VALUES = {
  NONE_MARKER: '__NONE_SELECTED__'
};

/**
 * Hook para gerenciamento profissional de seleção de locations
 * 
 * Estados possíveis:
 * - ALL_SELECTED: Todos os clientes selecionados (array vazio ou array completo)
 * - NONE_SELECTED: Nenhum cliente selecionado (array com marcador especial)
 * - PARTIAL_SELECTED: Alguns clientes selecionados (array com IDs específicos)
 * 
 * @param {string[]} allClientIds - Array com todos os IDs de clientes disponíveis
 * @returns {Object} Funções para gerenciar seleção de locations
 */
export const useLocationSelection = (allClientIds) => {
  
  // ===== FUNÇÕES DE ANÁLISE DE ESTADO =====
  
  /**
   * Determina o estado atual da seleção
   * @param {string[]} itemLocations - Array atual de locations do item
   * @returns {string} Estado atual (ALL_SELECTED, NONE_SELECTED, PARTIAL_SELECTED)
   */
  const getSelectionState = useCallback((itemLocations) => {
    // Caso especial: marcador de "nenhum selecionado"
    if (itemLocations && itemLocations.includes(SPECIAL_VALUES.NONE_MARKER)) {
      return LOCATION_STATES.NONE_SELECTED;
    }
    
    // Estado inicial: array vazio = todos selecionados
    if (!itemLocations || itemLocations.length === 0) {
      return LOCATION_STATES.ALL_SELECTED;
    }
    
    // Verificar se contém todos os IDs válidos
    const validIds = itemLocations.filter(id => allClientIds.includes(id));
    
    if (validIds.length === allClientIds.length) {
      return LOCATION_STATES.ALL_SELECTED;
    } else if (validIds.length === 0) {
      return LOCATION_STATES.NONE_SELECTED;
    } else {
      return LOCATION_STATES.PARTIAL_SELECTED;
    }
  }, [allClientIds]);
  
  // ===== VALIDAÇÃO DE ESTADO =====
  
  /**
   * Verifica se todos os clientes estão selecionados
   * @param {string[]} itemLocations - Array atual de locations do item
   * @returns {boolean} True se todos estão selecionados
   */
  const isAllSelected = useCallback((itemLocations) => {
    return getSelectionState(itemLocations) === LOCATION_STATES.ALL_SELECTED;
  }, [getSelectionState]);
  
  /**
   * Verifica se nenhum cliente está selecionado
   * @param {string[]} itemLocations - Array atual de locations do item
   * @returns {boolean} True se nenhum está selecionado
   */
  const isNoneSelected = useCallback((itemLocations) => {
    return getSelectionState(itemLocations) === LOCATION_STATES.NONE_SELECTED;
  }, [getSelectionState]);
  
  /**
   * Verifica se um cliente específico está selecionado
   * @param {string[]} itemLocations - Array atual de locations do item
   * @param {string} locationId - ID do cliente a verificar
   * @returns {boolean} True se o cliente está selecionado
   */
  const isLocationSelected = useCallback((itemLocations, locationId) => {
    const state = getSelectionState(itemLocations);
    
    switch (state) {
      case LOCATION_STATES.ALL_SELECTED:
        return true;
      case LOCATION_STATES.NONE_SELECTED:
        return false;
      case LOCATION_STATES.PARTIAL_SELECTED:
        return itemLocations.includes(locationId);
      default:
        return false;
    }
  }, [getSelectionState]);
  
  // ===== OPERAÇÕES DE SELEÇÃO =====
  
  /**
   * Seleciona todos os clientes
   * @returns {string[]} Array representando todos selecionados
   */
  const selectAll = useCallback(() => {
    // Usar array vazio para representar "todos selecionados" (mais eficiente)
    return [];
  }, []);
  
  /**
   * Deseleciona todos os clientes
   * @returns {string[]} Array com marcador especial para "nenhum selecionado"
   */
  const unselectAll = useCallback(() => {
    return [SPECIAL_VALUES.NONE_MARKER];
  }, []);
  
  /**
   * Alterna a seleção de um cliente específico
   * 
   * @param {string[]} currentLocations - Array atual de locations
   * @param {string} locationId - ID do cliente a alterar
   * @param {boolean} checked - True para marcar, false para desmarcar
   * @returns {string[]} Novo array de locations
   */
  const toggleLocation = useCallback((currentLocations, locationId, checked) => {
    const currentState = getSelectionState(currentLocations);
    
    switch (currentState) {
      case LOCATION_STATES.ALL_SELECTED:
        if (checked) {
          // Re-marcar quando já está marcado: manter todos selecionados
          return [];
        } else {
          // Desmarcar um quando todos estão marcados: todos EXCETO este
          return allClientIds.filter(id => id !== locationId);
        }
        
      case LOCATION_STATES.NONE_SELECTED:
        if (checked) {
          // Marcar um quando nenhum está marcado: apenas este
          return [locationId];
        } else {
          // Desmarcar quando já nenhum está marcado: manter nenhum
          return [SPECIAL_VALUES.NONE_MARKER];
        }
        
      case LOCATION_STATES.PARTIAL_SELECTED:
        if (checked) {
          // Adicionar cliente à seleção parcial
          const newLocations = [...currentLocations, locationId];
          // Se agora tem todos, otimizar para estado "todos"
          if (newLocations.length === allClientIds.length) {
            return [];
          }
          return newLocations;
        } else {
          // Remover cliente da seleção parcial
          const newLocations = currentLocations.filter(id => id !== locationId);
          // Se não sobrou nenhum, usar estado "nenhum"
          if (newLocations.length === 0) {
            return [SPECIAL_VALUES.NONE_MARKER];
          }
          return newLocations;
        }
        
      default:
        return currentLocations;
    }
  }, [getSelectionState, allClientIds]);
  
  // ===== UTILITÁRIOS =====
  
  /**
   * Obtém uma representação limpa dos IDs selecionados (sem marcadores especiais)
   * @param {string[]} itemLocations - Array atual de locations
   * @returns {string[]} Array com apenas IDs válidos de clientes
   */
  const getSelectedIds = useCallback((itemLocations) => {
    const state = getSelectionState(itemLocations);
    
    switch (state) {
      case LOCATION_STATES.ALL_SELECTED:
        return [...allClientIds];
      case LOCATION_STATES.NONE_SELECTED:
        return [];
      case LOCATION_STATES.PARTIAL_SELECTED:
        return itemLocations.filter(id => allClientIds.includes(id));
      default:
        return [];
    }
  }, [getSelectionState, allClientIds]);
  
  // ===== API PÚBLICA =====
  
  return {
    // Análise de estado
    getSelectionState,
    
    // Validação de estado
    isAllSelected,
    isNoneSelected,
    isLocationSelected,
    
    // Operações de seleção
    selectAll,
    unselectAll,
    toggleLocation,
    
    // Utilitários
    getSelectedIds,
    
    // Constantes (para uso externo se necessário)
    STATES: LOCATION_STATES
  };
};