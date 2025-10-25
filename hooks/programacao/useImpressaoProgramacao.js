import { useState, useEffect, useRef, useCallback } from 'react';
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

/**
 * Remover valores undefined recursivamente de um objeto
 * Firebase não aceita valores undefined
 */
const removeUndefined = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  } else if (obj !== null && typeof obj === 'object') {
    const cleaned = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    });

    return cleaned;
  }
  return obj;
};

/**
 * Hook para gerenciar impressão de programação com sincronização Firebase
 *
 * Funcionalidades:
 * - Salva automaticamente cada edição no Firebase
 * - Sincroniza em tempo real entre dispositivos
 * - Detecta mudanças nos pedidos originais
 * - Gerencia presença de usuários editando
 * - Bloqueia edição se outro usuário está editando
 */
export function useImpressaoProgramacao(weekNumber, year, dayNumber, initialData) {
  // Estados
  const [blocks, setBlocks] = useState([]);
  const [editedItems, setEditedItems] = useState({});
  const [editingUsers, setEditingUsers] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [user, setUser] = useState(null);

  // Refs
  const sessionId = useRef(`${Date.now()}_${Math.random()}`);
  const presenceRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Monitorar estado de autenticação
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser({
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        email: currentUser.email
      });
    } else {
      // Criar usuário "anônimo" para permitir edição sem login
      const anonymousId = localStorage.getItem('anonymous_user_id') || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('anonymous_user_id', anonymousId);

      setUser({
        uid: anonymousId,
        displayName: 'Usuário Anônimo',
        email: 'anonymous@local'
      });
    }
  }, []);

  // Gerar ID do documento
  const docId = `${weekNumber}_${year}_${dayNumber}`;
  const docRef = doc(db, 'impressaoProgramacao', docId);

  /**
   * Inicializar presença do usuário
   */
  const initializePresence = useCallback(async () => {
    if (!user) return;

    try {
      const presenceDocRef = doc(db, 'impressaoProgramacao', docId, 'editingPresence', user.uid);
      presenceRef.current = presenceDocRef;

      // Marcar presença
      await setDoc(presenceDocRef, {
        userId: user.uid,
        userName: user.displayName || user.email,
        sessionId: sessionId.current,
        timestamp: serverTimestamp(),
        isEditing: true
      });

      // Atualizar presença a cada 30 segundos
      const intervalId = setInterval(async () => {
        try {
          await updateDoc(presenceDocRef, {
            timestamp: serverTimestamp()
          });
        } catch (error) {
          // Silenciar erro de presença
        }
      }, 30000);

      // Limpar presença ao sair
      const cleanup = async () => {
        clearInterval(intervalId);
        try {
          await deleteDoc(presenceDocRef);
        } catch (error) {
          // Silenciar erro
        }
      };

      window.addEventListener('beforeunload', cleanup);

      return () => {
        cleanup();
        window.removeEventListener('beforeunload', cleanup);
      };
    } catch (error) {
      // Silenciar erro
    }
  }, [user, docId]);

  /**
   * Observar outros usuários editando
   */
  useEffect(() => {
    if (!user) return;

    const presenceCollectionRef = collection(db, 'impressaoProgramacao', docId, 'editingPresence');

    const unsubscribe = onSnapshot(presenceCollectionRef, (snapshot) => {
      const users = [];
      let hasOtherEditor = false;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const presenceAge = Date.now() - (data.timestamp?.toMillis() || 0);

        // Considerar ativo se atualizou nos últimos 60 segundos
        if (presenceAge < 60000) {
          users.push({
            userId: data.userId,
            userName: data.userName,
            sessionId: data.sessionId,
            timestamp: data.timestamp
          });

          // Verificar se há outro usuário editando (não é esta sessão)
          if (data.userId !== user.uid || data.sessionId !== sessionId.current) {
            hasOtherEditor = true;
          }
        }
      });

      setEditingUsers(users);

      setIsLocked(hasOtherEditor);
    });

    return () => unsubscribe();
  }, [user, docId, isLocked]);

  /**
   * Salvar dados no Firebase (debounced)
   */
  const lastSaveDataRef = useRef(null);
  const saveToFirebase = useCallback(async (blocksData, editedItemsData) => {
    if (!user) return;

    // Prevenir saves duplicados
    const dataHash = JSON.stringify({ blocks: blocksData, edited: editedItemsData });
    if (lastSaveDataRef.current === dataHash) {
      return;
    }

    // Cancelar save anterior se houver
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Salvar após 500ms de inatividade
    saveTimeoutRef.current = setTimeout(async () => {
      lastSaveDataRef.current = dataHash;
      try {
        setIsSyncing(true);

        // Limpar valores undefined antes de salvar
        const cleanedBlocks = removeUndefined(blocksData);
        const cleanedEditedItems = removeUndefined(editedItemsData);

        const metadata = {
          weekNumber: weekNumber || 0,
          year: year || new Date().getFullYear(),
          dayNumber: dayNumber || 0,
          lastModified: serverTimestamp(),
          lastModifiedBy: user.uid,
          lastModifiedByName: user.displayName || user.email || 'Anônimo'
        };

        // Adicionar date apenas se existir
        if (initialData?.selectedDayInfo?.fullDate) {
          metadata.date = initialData.selectedDayInfo.fullDate;
        }

        const dataToSave = {
          metadata,
          blocks: cleanedBlocks
        };

        // Só incluir editedItems se houver dados (não sobrescrever com vazio)
        if (cleanedEditedItems && Object.keys(cleanedEditedItems).length > 0) {
          dataToSave.editedItems = cleanedEditedItems;
        }

        await setDoc(docRef, dataToSave, { merge: true });

        setLastSyncTime(new Date());
      } catch (error) {
        // Silenciar erro
      } finally {
        setIsSyncing(false);
      }
    }, 500);
  }, [user, docRef, weekNumber, year, dayNumber, initialData]);

  /**
   * Carregar dados do Firebase
   */
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        // Só atualizar se não for desta sessão (evitar loop)
        if (data.metadata?.lastModifiedBy !== user.uid ||
            Date.now() - (data.metadata?.lastModified?.toMillis() || 0) > 1000) {

          if (data.blocks) {
            setBlocks(data.blocks);
          }

          if (data.editedItems) {
            setEditedItems(data.editedItems);
          }

          setLastSyncTime(data.metadata?.lastModified?.toDate());
        }
      }
    });

    unsubscribeRef.current = unsubscribe;
    return () => unsubscribe();
  }, [user, docRef]);

  /**
   * Atualizar blocos (preserva editedItems existentes)
   */
  const updateBlocks = useCallback((newBlocks) => {
    if (isLocked) {
      alert('Outro usuário está editando. Aguarde para fazer alterações.');
      return false;
    }

    setBlocks(newBlocks);
    // IMPORTANTE: Sempre preservar editedItems ao atualizar blocos
    saveToFirebase(newBlocks, editedItems);
    return true;
  }, [isLocked, editedItems, saveToFirebase]);

  /**
   * Marcar item como editado
   */
  const markItemAsEdited = useCallback((itemId, originalValue, editedValue, field = 'content') => {
    if (isLocked) {
      alert('Outro usuário está editando. Aguarde para fazer alterações.');
      return false;
    }

    const newEditedItems = {
      ...editedItems,
      [itemId]: {
        originalValue,
        editedValue,
        field,
        timestamp: new Date().toISOString(),
        userId: user.uid,
        userName: user.displayName || user.email
      }
    };

    setEditedItems(newEditedItems);
    saveToFirebase(blocks, newEditedItems);
    return true;
  }, [isLocked, editedItems, blocks, user, saveToFirebase]);

  /**
   * Verificar se item foi editado
   */
  const isItemEdited = useCallback((itemId) => {
    return !!editedItems[itemId];
  }, [editedItems]);

  /**
   * Obter informações de edição de um item
   */
  const getItemEditInfo = useCallback((itemId) => {
    return editedItems[itemId] || null;
  }, [editedItems]);

  /**
   * Aceitar mudança do portal (substitui edição manual pelo valor do portal)
   */
  const acceptPortalChange = useCallback((itemId) => {
    // Remove a edição manual, permitindo que o valor do portal apareça
    const newEditedItems = { ...editedItems };
    delete newEditedItems[itemId];
    setEditedItems(newEditedItems);
    saveToFirebase(blocks, newEditedItems);
  }, [editedItems, blocks, saveToFirebase]);

  /**
   * Rejeitar mudança do portal (mantém edição manual)
   */
  const rejectPortalChange = useCallback((itemId) => {
    // Não faz nada, mantém a edição manual
    // Pode adicionar flag para não mostrar mais o aviso de conflito
    return true;
  }, []);

  /**
   * Inicializar presença ao montar
   */
  useEffect(() => {
    const cleanup = initializePresence();
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(fn => fn && fn());
      }
    };
  }, [initializePresence]);

  return {
    blocks,
    updateBlocks,
    editedItems,
    markItemAsEdited,
    isItemEdited,
    getItemEditInfo,
    acceptPortalChange,
    rejectPortalChange,
    editingUsers,
    isLocked,
    isSyncing,
    lastSyncTime,
    sessionId: sessionId.current
  };
}
