import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Hook para detectar mudanças em tempo real nos pedidos originais
 *
 * Funcionalidades:
 * - Captura snapshot inicial dos pedidos ao abrir preview
 * - Monitora mudanças em tempo real na coleção pedidos
 * - Compara dados atuais com snapshot inicial
 * - Identifica itens que foram modificados, adicionados ou removidos
 * - Fornece informações detalhadas sobre as mudanças
 */
export function useOrderChangeDetection(weekNumber, year, dayNumber, initialData) {
  // Estados
  const [changedItems, setChangedItems] = useState({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastChangeTime, setLastChangeTime] = useState(null);

  // Refs
  const initialSnapshotRef = useRef(null);
  const unsubscribeRef = useRef(null);

  /**
   * Criar snapshot inicial dos pedidos
   */
  const createInitialSnapshot = useCallback(() => {
    if (!initialData?.originalOrders) {
      console.log('❌ Sem originalOrders em initialData');
      return;
    }

    const snapshot = {};

    // Processar pedidos originais
    initialData.originalOrders.forEach(order => {
      if (!order.items) return;

      order.items.forEach(item => {
        const itemKey = `${item.recipe_name}_${order.customer_name || 'sem_cliente'}`;
        snapshot[itemKey] = {
          itemName: item.recipe_name,
          quantity: item.quantity,
          unit: item.unit_type,
          clientName: order.customer_name,
          category: item.category,
          originalOrderId: order.id,
          timestamp: new Date().toISOString()
        };
      });
    });

    initialSnapshotRef.current = snapshot;
    console.log('📸 Snapshot inicial criado:', {
      totalItems: Object.keys(snapshot).length,
      amostra: Object.keys(snapshot).slice(0, 5),
      costelinha: Object.keys(snapshot).filter(k => k.includes('Costelinha'))
    });
  }, [initialData]);

  /**
   * Comparar pedido atual com snapshot inicial
   */
  const compareWithSnapshot = useCallback((currentOrders) => {
    if (!initialSnapshotRef.current) return {};

    const changes = {};
    const currentSnapshot = {};

    // Criar snapshot dos dados atuais
    Object.entries(currentOrders).forEach(([category, items]) => {
      items.forEach(item => {
        const itemKey = `${item.itemName}_${item.clientName || 'sem_cliente'}`;
        currentSnapshot[itemKey] = {
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          clientName: item.clientName,
          category: category,
          originalOrderId: item.orderId
        };
      });
    });

    // Detectar itens modificados ou removidos
    Object.entries(initialSnapshotRef.current).forEach(([itemKey, initialItem]) => {
      const currentItem = currentSnapshot[itemKey];

      if (!currentItem) {
        // Item foi removido
        changes[itemKey] = {
          type: 'removed',
          itemName: initialItem.itemName,
          clientName: initialItem.clientName,
          category: initialItem.category,
          previousQuantity: initialItem.quantity,
          previousUnit: initialItem.unit,
          detectedAt: new Date().toISOString()
        };
      } else if (
        currentItem.quantity !== initialItem.quantity ||
        currentItem.unit !== initialItem.unit
      ) {
        // Item foi modificado
        changes[itemKey] = {
          type: 'modified',
          itemName: currentItem.itemName,
          clientName: currentItem.clientName,
          category: currentItem.category,
          previousQuantity: initialItem.quantity,
          previousUnit: initialItem.unit,
          currentQuantity: currentItem.quantity,
          currentUnit: currentItem.unit,
          detectedAt: new Date().toISOString()
        };
      }
    });

    // Detectar itens adicionados
    Object.entries(currentSnapshot).forEach(([itemKey, currentItem]) => {
      if (!initialSnapshotRef.current[itemKey]) {
        changes[itemKey] = {
          type: 'added',
          itemName: currentItem.itemName,
          clientName: currentItem.clientName,
          category: currentItem.category,
          currentQuantity: currentItem.quantity,
          currentUnit: currentItem.unit,
          detectedAt: new Date().toISOString()
        };
      }
    });

    return changes;
  }, []);

  /**
   * Processar dados do Firestore para o formato esperado
   */
  const processFirestoreOrders = useCallback((ordersData) => {
    const grouped = {};

    ordersData.forEach(order => {
      if (!order.items) return;

      order.items.forEach(item => {
        const category = item.category || 'Outros';

        if (!grouped[category]) {
          grouped[category] = [];
        }

        grouped[category].push({
          itemName: item.recipe_name,
          quantity: item.quantity,
          unit: item.unit_type,
          clientName: order.customer_name,
          orderId: order.id,
          category: category
        });
      });
    });

    return grouped;
  }, []);

  /**
   * Monitorar mudanças em tempo real
   */
  useEffect(() => {
    console.log('🚀 useOrderChangeDetection iniciado:', { weekNumber, year, dayNumber });

    if (weekNumber === null || weekNumber === undefined || !year || dayNumber === null || dayNumber === undefined) {
      console.log('⚠️ Faltam dados:', { weekNumber, year, dayNumber });
      return;
    }

    // Criar snapshot inicial
    if (!initialSnapshotRef.current) {
      createInitialSnapshot();
    }

    setIsMonitoring(true);

    // Construir query para os pedidos do dia
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('week_number', '==', weekNumber),
      where('year', '==', year),
      where('day_of_week', '==', dayNumber)
    );

    // Listener em tempo real
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('🔥 Firebase listener disparado:', {
        numDocs: snapshot.size,
        weekNumber,
        year,
        dayNumber
      });

      const ordersData = [];

      snapshot.forEach((doc) => {
        ordersData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log('📦 Pedidos recebidos:', ordersData.length);

      // Processar e comparar
      const currentOrders = processFirestoreOrders(ordersData);
      console.log('🔄 Pedidos processados:', {
        categorias: Object.keys(currentOrders),
        totalItens: Object.values(currentOrders).reduce((sum, items) => sum + items.length, 0)
      });

      const detectedChanges = compareWithSnapshot(currentOrders);
      console.log('🔍 Mudanças detectadas:', {
        total: Object.keys(detectedChanges).length,
        mudancas: detectedChanges
      });

      // Atualizar estado apenas se houver mudanças
      if (Object.keys(detectedChanges).length > 0) {
        setChangedItems(detectedChanges);
        setLastChangeTime(new Date());
      }
    }, (error) => {
      console.error('❌ Erro no listener:', error);
      setIsMonitoring(false);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [weekNumber, year, dayNumber, createInitialSnapshot, processFirestoreOrders, compareWithSnapshot]);

  /**
   * Verificar se um item específico foi alterado
   */
  const isItemChanged = useCallback((itemName, clientName = null) => {
    const itemKey = `${itemName}_${clientName || 'sem_cliente'}`;
    return !!changedItems[itemKey];
  }, [changedItems]);

  /**
   * Obter informações sobre mudança de um item
   */
  const getItemChangeInfo = useCallback((itemName, clientName = null) => {
    const itemKey = `${itemName}_${clientName || 'sem_cliente'}`;
    return changedItems[itemKey] || null;
  }, [changedItems]);

  /**
   * Obter todas as mudanças agrupadas por tipo
   */
  const getChangesSummary = useCallback(() => {
    const summary = {
      modified: [],
      added: [],
      removed: [],
      totalChanges: 0
    };

    Object.entries(changedItems).forEach(([itemKey, change]) => {
      summary[change.type].push(change);
      summary.totalChanges++;
    });

    return summary;
  }, [changedItems]);

  /**
   * Resetar snapshot (útil para "aceitar" as mudanças)
   */
  const resetSnapshot = useCallback(() => {
    createInitialSnapshot();
    setChangedItems({});
    setLastChangeTime(null);
  }, [createInitialSnapshot]);

  return {
    changedItems,
    isItemChanged,
    getItemChangeInfo,
    getChangesSummary,
    resetSnapshot,
    isMonitoring,
    lastChangeTime,
    hasChanges: Object.keys(changedItems).length > 0
  };
}
