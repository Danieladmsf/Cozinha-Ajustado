import { useState, useEffect, useCallback, useRef } from 'react';
import { createItemKey } from '../utils/itemKeyUtils';
import { createOrdersSnapshot } from '../utils/snapshotUtils';

/**
 * Hook para gerenciar detecção de mudanças e resolução de conflitos
 * @param {Array} originalOrders - Pedidos originais do Firebase
 * @param {number} weekNumber - Número da semana
 * @param {number} year - Ano
 * @param {number} dayNumber - Número do dia
 * @param {Function} markItemAsEdited - Função para marcar item como editado
 * @param {Function} rejectPortalChange - Função do Firebase hook para rejeitar mudança
 * @returns {Object} Estado e funções de conflito
 */
export function useConflictResolution(
  originalOrders,
  weekNumber,
  year,
  dayNumber,
  markItemAsEdited,
  rejectPortalChange
) {
  // Snapshot inicial dos pedidos (captura ao abrir o editor)
  const initialOrdersRef = useRef(null);
  const [changedItems, setChangedItems] = useState({});
  const [resolvedConflicts, setResolvedConflicts] = useState({}); // { itemKey: { status, portalValueAtResolution } }
  const [initialSnapshot, setInitialSnapshot] = useState(null);

  // Carregar snapshot inicial do localStorage ou criar novo
  useEffect(() => {
    if (!originalOrders) return;

    // Tentar carregar snapshot do localStorage primeiro (persistência local)
    const savedSnapshotKey = `initial-snapshot-${weekNumber}-${year}-${dayNumber}`;
    const savedSnapshot = localStorage.getItem(savedSnapshotKey);

    if (savedSnapshot && !initialOrdersRef.current) {
      // Usar snapshot salvo
      const parsed = JSON.parse(savedSnapshot);
      initialOrdersRef.current = parsed;
      setInitialSnapshot(parsed);
    } else if (!initialOrdersRef.current) {
      // Criar novo snapshot usando utilitário
      const snapshot = createOrdersSnapshot(originalOrders);
      initialOrdersRef.current = snapshot;
      setInitialSnapshot(snapshot);
      // Salvar no localStorage
      localStorage.setItem(savedSnapshotKey, JSON.stringify(snapshot));
    }
  }, [originalOrders, weekNumber, year, dayNumber]);

  // Detectar mudanças comparando originalOrders atual com snapshot inicial
  useEffect(() => {
    if (!initialOrdersRef.current || !originalOrders) return;

    const changes = {};

    // Criar snapshot atual usando utilitário
    const currentSnapshot = createOrdersSnapshot(originalOrders);

    // Comparar com snapshot inicial
    Object.entries(currentSnapshot).forEach(([itemKey, current]) => {
      const initial = initialOrdersRef.current[itemKey];
      if (initial && (initial.quantity !== current.quantity || initial.unit_type !== current.unit_type)) {
        changes[itemKey] = {
          type: 'modified',
          previousQuantity: initial.quantity,
          currentQuantity: current.quantity,
          previousUnit: initial.unit_type,
          currentUnit: current.unit_type,
          detectedAt: new Date().toISOString()
        };
      }
    });

    if (Object.keys(changes).length > 0) {
      console.log('[useConflictResolution] Mudanças detectadas:', changes);
      setChangedItems(changes);
    } else {
      // Limpar mudanças se não houver mais (caso os dados voltem ao normal)
      if (Object.keys(changedItems).length > 0) {
        console.log('[useConflictResolution] Limpando mudanças (dados voltaram ao normal)');
        setChangedItems({});
      }
    }
  }, [originalOrders, changedItems]);

  // Funções helper
  const isItemChanged = useCallback((itemName, clientName) => {
    const itemKey = createItemKey(itemName, clientName);
    return !!changedItems[itemKey];
  }, [changedItems]);

  const getItemChangeInfo = useCallback((itemName, clientName) => {
    const itemKey = createItemKey(itemName, clientName);
    return changedItems[itemKey] || null;
  }, [changedItems]);

  const hasChanges = Object.keys(changedItems).length > 0;

  // Wrappers para rastrear resolução de conflitos
  const handleAcceptPortalChange = useCallback((itemKey, newValue, portalQuantity, portalUnit) => {
    const portalValue = `${portalQuantity}_${portalUnit}`;

    setResolvedConflicts(prev => ({
      ...prev,
      [itemKey]: {
        status: 'accepted',
        portalValueAtResolution: portalValue
      }
    }));

    // Atualizar o item com o novo valor do portal
    if (newValue) {
      markItemAsEdited(itemKey, '', newValue, 'quantity');
    }
  }, [markItemAsEdited]);

  const handleRejectPortalChange = useCallback((itemKey, currentValue) => {
    setResolvedConflicts(prev => ({
      ...prev,
      [itemKey]: {
        status: 'rejected',
        portalValueAtResolution: currentValue
      }
    }));
    rejectPortalChange(itemKey);
  }, [rejectPortalChange]);

  // Helper para obter status de resolução (suporta formato antigo e novo)
  const getResolutionStatus = useCallback((itemKey) => {
    const resolution = resolvedConflicts[itemKey];
    if (!resolution) return null;
    // Formato novo: { status: 'accepted'/'rejected', portalValueAtResolution: '...' }
    if (typeof resolution === 'object' && resolution.status) {
      return resolution.status;
    }
    // Formato antigo: 'accepted' ou 'rejected' (string)
    return resolution;
  }, [resolvedConflicts]);

  // Limpar conflitos resolvidos se o valor do portal mudou novamente
  useEffect(() => {
    if (!changedItems || Object.keys(changedItems).length === 0) return;

    setResolvedConflicts(prev => {
      const updated = { ...prev };
      let hasChanges = false;

      Object.entries(prev).forEach(([resolvedItemKey, resolution]) => {
        // Verificar se o valor do portal mudou novamente (tanto para accepted quanto rejected)
        if (!resolution?.portalValueAtResolution) return;

        // Extrair informações da chave de resolução
        // Formato blocos empresa: "CompanyName_RecipeName_CustomerName"
        // Ex: "Museu_Costelinha Assada_sem_cliente"
        // Formato outros blocos: "RecipeName_CustomerName"
        const parts = resolvedItemKey.split('_');
        let recipeName, companyName;

        if (parts.length >= 3) {
          // Formato empresa: "CompanyName_RecipeName_CustomerName"
          companyName = parts[0]; // "Museu"
          recipeName = parts.slice(1, -1).join('_'); // "Costelinha Assada"
          // Último elemento é "sem_cliente", ignorar
        } else {
          // Formato padrão: "RecipeName_CustomerName"
          recipeName = parts[0];
          companyName = parts[1];
        }

        // Construir chave para changedItems: "RecipeName_CompanyName"
        // Ex: "Costelinha Assada_Museu"
        const changeKey = `${recipeName}_${companyName}`;
        const changeInfo = changedItems[changeKey];

        if (changeInfo) {
          const currentPortalValue = `${changeInfo.currentQuantity}_${changeInfo.currentUnit}`;

          // Se o valor do portal mudou, limpar resolução (aceito OU rejeitado)
          if (currentPortalValue !== resolution.portalValueAtResolution) {
            delete updated[resolvedItemKey];
            hasChanges = true;
          }
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [changedItems]);

  // Resetar snapshot (considerar valores atuais como novos valores base)
  const handleResetSnapshot = useCallback(() => {
    if (!originalOrders) return;

    const savedSnapshotKey = `initial-snapshot-${weekNumber}-${year}-${dayNumber}`;

    // Criar novo snapshot com valores atuais usando utilitário
    const snapshot = createOrdersSnapshot(originalOrders);

    // Atualizar refs e state
    initialOrdersRef.current = snapshot;
    setInitialSnapshot(snapshot);
    setChangedItems({});
    setResolvedConflicts({});

    // Salvar no localStorage
    localStorage.setItem(savedSnapshotKey, JSON.stringify(snapshot));
  }, [originalOrders, weekNumber, year, dayNumber]);

  return {
    // Estado
    changedItems,
    resolvedConflicts,
    initialSnapshot,
    hasChanges,

    // Checkers
    isItemChanged,
    getItemChangeInfo,
    getResolutionStatus,

    // Handlers
    handleAcceptPortalChange,
    handleRejectPortalChange,
    handleResetSnapshot
  };
}
