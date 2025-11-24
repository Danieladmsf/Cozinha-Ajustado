/**
 * Sistema SIMPLES de gerenciamento de edições
 * Usa estrutura hierárquica em vez de chaves concatenadas
 * SYNC: Salva no Firebase + localStorage com sincronização em tempo real
 */

import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

const STORAGE_KEY = 'print_preview_edits_v2';
const FIRESTORE_COLLECTION = 'programming_edits';

/**
 * Estrutura de dados simplificada:
 * {
 *   "Faap": {
 *     "Arroz Branco": {
 *       value: "6 cubas G",
 *       quantity: 6,
 *       unit: "cuba-g",
 *       timestamp: "2025-11-14T14:00:00.000Z",
 *       userId: "local-user"
 *     }
 *   }
 * }
 */

/**
 * Salva uma edição com informações de origem (Firebase hash)
 * SYNC: Salva no localStorage E no Firebase
 * @param {string} userId - ID do usuário que fez a edição (default: 'local-user')
 *   - 'local-user': edição manual no Editor de Impressão (amarelo)
 *   - 'portal-client' ou outro: edição vinda do Portal do Cliente (verde)
 */
export async function saveEdit(customerName, recipeName, editedValue, field = 'quantity', firebaseValue = null, weekDayKey = null, userId = 'local-user') {
  // IMPORTANTE: Carregar do Firebase primeiro para ter dados atualizados
  // Isso evita race condition quando múltiplas edições são salvas rapidamente
  let edits;
  if (weekDayKey) {
    try {
      edits = await loadEditsFromFirebase(weekDayKey);
      // Também atualizar localStorage com dados do Firebase
      if (Object.keys(edits).length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
      } else {
        edits = loadAllEdits();
      }
    } catch (error) {
      // Fallback para localStorage se Firebase falhar
      edits = loadAllEdits();
    }
  } else {
    edits = loadAllEdits();
  }

  // Criar estrutura se não existir
  if (!edits[customerName]) {
    edits[customerName] = {};
  }

  // Extrair quantidade e unidade do valor editado
  let quantity = null;
  let unit = null;

  if (typeof editedValue === 'number') {
    // Se já é número, usar diretamente
    quantity = editedValue;
  } else if (typeof editedValue === 'string') {
    // Se é string, tentar extrair número
    const numMatch = editedValue.match(/([\d.,]+)\s*(.+)/);
    if (numMatch) {
      quantity = parseFloat(numMatch[1].replace(',', '.'));
      unit = numMatch[2];
    } else {
      // Pode ser só um número sem unidade
      const parsed = parseFloat(editedValue.replace(',', '.'));
      if (!isNaN(parsed)) {
        quantity = parsed;
      }
    }
  }

  // Salvar edição COM hash do Firebase no momento da edição
  edits[customerName][recipeName] = {
    value: editedValue,
    quantity,
    unit,
    field,
    timestamp: new Date().toISOString(),
    userId: userId,
    // Hash do valor do Firebase quando editou (para detectar se Firebase mudou depois)
    firebaseValueHash: firebaseValue !== null ? hashValue(firebaseValue) : null
  };

  // Persistir no localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));

  // SYNC: Salvar no Firebase se temos weekDayKey
  if (weekDayKey) {
    try {
      await saveEditsToFirebase(weekDayKey, edits);
    } catch (error) {
      // Silenciar erro
    }
  }

  return edits;
}

/**
 * Gera hash simples de um valor para comparação
 */
function hashValue(value) {
  if (typeof value === 'number') return `num:${value}`;
  if (typeof value === 'string') return `str:${value}`;
  return `obj:${JSON.stringify(value)}`;
}

/**
 * Sistema de Semáforo: decide se usa edição manual ou Firebase
 * 🟢 Firebase mudou DEPOIS da edição → Retorna null (usa Firebase)
 * 🟡 Edição manual mais recente → Retorna edição
 */
export function shouldUseEdit(customerName, recipeName, currentFirebaseValue) {
  const edit = getEdit(customerName, recipeName);
  if (!edit) return null; // Sem edição, usa Firebase

  // Se não tem hash salvo (edição antiga), usa edição (retrocompatibilidade)
  if (!edit.firebaseValueHash) {
    return edit;
  }

  // Comparar hash atual do Firebase com hash salvo
  const currentHash = hashValue(currentFirebaseValue);

  if (currentHash === edit.firebaseValueHash) {
    // Firebase não mudou desde a edição → usa edição
    return edit;
  } else {
    // Firebase mudou DEPOIS da edição → descarta edição, usa Firebase
    // Auto-remover edição desatualizada
    removeEdit(customerName, recipeName);
    return null;
  }
}

/**
 * Busca uma edição específica
 */
export function getEdit(customerName, recipeName) {
  const edits = loadAllEdits();
  return edits[customerName]?.[recipeName] || null;
}

/**
 * Busca TODAS as edições de uma receita (em todos os clientes)
 */
export function getAllEditsForRecipe(recipeName) {
  const edits = loadAllEdits();
  const results = [];

  Object.entries(edits).forEach(([customerName, recipes]) => {
    if (recipes[recipeName]) {
      results.push({
        customerName,
        recipeName,
        ...recipes[recipeName]
      });
    }
  });

  return results;
}

/**
 * Busca TODAS as edições de um cliente
 */
export function getAllEditsForCustomer(customerName) {
  const edits = loadAllEdits();
  return edits[customerName] || {};
}

/**
 * Carrega todas as edições
 */
export function loadAllEdits() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    return {};
  }
}

/**
 * Remove uma edição específica
 */
export function removeEdit(customerName, recipeName) {
  const edits = loadAllEdits();

  if (edits[customerName]?.[recipeName]) {
    delete edits[customerName][recipeName];

    // Se cliente ficou sem edições, remove o cliente
    if (Object.keys(edits[customerName]).length === 0) {
      delete edits[customerName];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
  }
}

/**
 * Remove TODAS as edições (localStorage E Firebase)
 */
export async function clearAllEdits(weekDayKey = null) {
  localStorage.removeItem(STORAGE_KEY);

  // SYNC: Remover do Firebase também
  if (weekDayKey) {
    try {
      await clearEditsFromFirebase(weekDayKey);
    } catch (error) {
      // Silenciar erro
    }
  }

  return {};
}

/**
 * Obtém resumo das edições
 */
export function getEditsSummary() {
  const edits = loadAllEdits();
  const customers = Object.keys(edits);
  let totalEdits = 0;

  customers.forEach(customer => {
    totalEdits += Object.keys(edits[customer]).length;
  });

  return {
    totalCustomers: customers.length,
    totalEdits,
    customers: customers.map(customer => ({
      name: customer,
      recipes: Object.keys(edits[customer]).length
    }))
  };
}

/**
 * ========================================
 * FIREBASE SYNC FUNCTIONS (Tempo Real)
 * ========================================
 */

/**
 * Salva todas as edições no Firebase
 * @param {string} weekDayKey - Ex: "2025_W46_Mon"
 * @param {object} edits - Estrutura de edições
 */
export async function saveEditsToFirebase(weekDayKey, edits) {
  if (!weekDayKey) {
    return;
  }

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, weekDayKey);
    await setDoc(docRef, {
      edits,
      lastModified: new Date().toISOString(),
      modifiedBy: 'local-user' // Pode ser substituído por user.uid
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Carrega edições do Firebase
 * @param {string} weekDayKey - Ex: "2025_W46_Mon"
 * @returns {object} Edições ou {}
 */
export async function loadEditsFromFirebase(weekDayKey) {
  if (!weekDayKey) {
    return {};
  }

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, weekDayKey);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.edits || {};
    } else {
      return {};
    }
  } catch (error) {
    return {};
  }
}

/**
 * Cria listener em tempo real para edições do Firebase
 * @param {string} weekDayKey - Ex: "2025_W46_Mon"
 * @param {function} callback - Função chamada quando edições mudam
 * @returns {function} Unsubscribe function
 */
export function subscribeToEdits(weekDayKey, callback) {
  if (!weekDayKey) {
    return () => {};
  }

  const docRef = doc(db, FIRESTORE_COLLECTION, weekDayKey);

  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback(data.edits || {});
    } else {
      callback({});
    }
  }, (error) => {
    // Silenciar erro
  });

  return unsubscribe;
}

/**
 * Remove todas as edições do Firebase para um dia específico
 * @param {string} weekDayKey - Ex: "2025_W46_Mon"
 */
export async function clearEditsFromFirebase(weekDayKey) {
  if (!weekDayKey) {
    return;
  }

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, weekDayKey);
    await deleteDoc(docRef);
  } catch (error) {
    throw error;
  }
}

/**
 * Migra do sistema antigo para o novo
 */
export function migrateFromOldSystem() {
  const oldKey = 'print_preview_edit_state';
  const oldData = localStorage.getItem(oldKey);

  if (!oldData) {
    return;
  }

  try {
    const oldEdits = JSON.parse(oldData);
    const newEdits = {};

    // Converter do formato antigo para o novo
    Object.entries(oldEdits).forEach(([key, edit]) => {
      // Tentar extrair cliente e receita da chave antiga
      // Formatos possíveis:
      // - "Cliente::Receita::sem_cliente"
      // - "Receita::Cliente"
      const parts = key.split('::');
      let customerName, recipeName;

      if (parts.length === 3) {
        // Formato: Cliente::Receita::sem_cliente
        customerName = parts[0];
        recipeName = parts[1];
      } else if (parts.length === 2) {
        // Formato: Receita::Cliente
        recipeName = parts[0];
        customerName = parts[1];
      } else {
        return;
      }

      // Criar estrutura nova
      if (!newEdits[customerName]) {
        newEdits[customerName] = {};
      }

      newEdits[customerName][recipeName] = {
        value: edit.editedValue,
        quantity: null, // Será extraído do value
        unit: null,
        field: edit.field || 'quantity',
        timestamp: edit.timestamp,
        userId: edit.userId || 'local-user'
      };
    });

    // Salvar novo formato
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEdits));

    // Opcional: remover dados antigos
    // localStorage.removeItem(oldKey);

  } catch (error) {
    // Silenciar erro
  }
}

/**
 * ========================================
 * ORDEM DOS BLOCOS - FIREBASE SYNC
 * ========================================
 */

const BLOCK_ORDER_STORAGE_KEY = 'print_preview_page_order';
const BLOCK_ORDER_FIRESTORE_COLLECTION = 'programming_block_order';

/**
 * Salva ordem dos blocos no Firebase
 * @param {string} weekDayKey - Ex: "2025_W46_Mon"
 * @param {array} blockOrder - Array de IDs dos blocos em ordem
 */
export async function saveBlockOrderToFirebase(weekDayKey, blockOrder) {
  if (!weekDayKey || !blockOrder) {
    console.log('[saveBlockOrderToFirebase] ❌ Sem weekDayKey ou blockOrder:', { weekDayKey, blockOrder });
    return;
  }

  try {
    console.log('[saveBlockOrderToFirebase] 💾 Salvando ordem no Firebase:', {
      weekDayKey,
      numBlocks: blockOrder.length,
      order: blockOrder
    });
    const docRef = doc(db, BLOCK_ORDER_FIRESTORE_COLLECTION, weekDayKey);
    await setDoc(docRef, {
      order: blockOrder,
      lastModified: new Date().toISOString(),
      modifiedBy: 'local-user'
    });
    console.log('[saveBlockOrderToFirebase] ✅ Ordem salva com sucesso no Firebase');
  } catch (error) {
    console.error('[saveBlockOrderToFirebase] ❌ Erro ao salvar no Firebase:', error);
    throw error;
  }
}

/**
 * Carrega ordem dos blocos do Firebase
 * @param {string} weekDayKey - Ex: "2025_W46_Mon"
 * @returns {array} Array de IDs dos blocos ou []
 */
export async function loadBlockOrderFromFirebase(weekDayKey) {
  if (!weekDayKey) {
    console.log('[loadBlockOrderFromFirebase] ⚠️ Sem weekDayKey');
    return [];
  }

  try {
    console.log('[loadBlockOrderFromFirebase] 📡 Carregando do Firebase:', weekDayKey);
    const docRef = doc(db, BLOCK_ORDER_FIRESTORE_COLLECTION, weekDayKey);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('[loadBlockOrderFromFirebase] ✅ Ordem encontrada:', {
        numBlocks: data.order?.length,
        order: data.order
      });
      return data.order || [];
    } else {
      console.log('[loadBlockOrderFromFirebase] ⚠️ Nenhuma ordem salva no Firebase');
      return [];
    }
  } catch (error) {
    console.error('[loadBlockOrderFromFirebase] ❌ Erro ao carregar:', error);
    return [];
  }
}

/**
 * Cria listener em tempo real para ordem dos blocos do Firebase
 * @param {string} weekDayKey - Ex: "2025_W46_Mon"
 * @param {function} callback - Função chamada quando ordem muda
 * @returns {function} Unsubscribe function
 */
export function subscribeToBlockOrder(weekDayKey, callback) {
  if (!weekDayKey) {
    return () => {};
  }

  const docRef = doc(db, BLOCK_ORDER_FIRESTORE_COLLECTION, weekDayKey);

  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback(data.order || []);
    } else {
      callback([]);
    }
  }, (error) => {
    // Silenciar erro
  });

  return unsubscribe;
}

/**
 * Salva ordem dos blocos (localStorage + Firebase)
 * @param {array} blockOrder - Array de IDs dos blocos
 * @param {string} weekDayKey - Ex: "2025_W46_Mon"
 */
export async function saveBlockOrder(blockOrder, weekDayKey = null) {
  console.log('[saveBlockOrder] 💾 Salvando ordem:', {
    numBlocks: blockOrder.length,
    weekDayKey,
    order: blockOrder
  });

  // Salvar no localStorage
  try {
    localStorage.setItem(BLOCK_ORDER_STORAGE_KEY, JSON.stringify(blockOrder));
    console.log('[saveBlockOrder] ✅ Salvo no localStorage');
  } catch (error) {
    console.error('[saveBlockOrder] ❌ Erro ao salvar no localStorage:', error);
  }

  // Salvar no Firebase se temos weekDayKey
  if (weekDayKey) {
    try {
      await saveBlockOrderToFirebase(weekDayKey, blockOrder);
    } catch (error) {
      console.error('[saveBlockOrder] ❌ Erro ao salvar no Firebase:', error);
    }
  } else {
    console.log('[saveBlockOrder] ⚠️ Sem weekDayKey, não salvando no Firebase');
  }
}

/**
 * Carrega ordem dos blocos do localStorage
 * @returns {array} Array de IDs dos blocos ou []
 */
export function loadBlockOrderFromLocal() {
  try {
    const saved = localStorage.getItem(BLOCK_ORDER_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  } catch (error) {
    return [];
  }
}

// ============================================
// GERENCIAMENTO DE BLOCOS CUSTOMIZADOS
// ============================================

const CUSTOM_BLOCKS_FIRESTORE_COLLECTION = 'programming_custom_blocks';

/**
 * Salva blocos customizados (duplicados) no Firebase
 * @param {string} weekDayKey - Ex: "2025_W46_Mon"
 * @param {array} customBlocks - Array de blocos customizados
 */
export async function saveCustomBlocksToFirebase(weekDayKey, customBlocks) {
  if (!weekDayKey) {
    console.log('[saveCustomBlocksToFirebase] ⚠️ Sem weekDayKey');
    return;
  }

  try {
    console.log('[saveCustomBlocksToFirebase] 💾 Salvando blocos customizados:', {
      weekDayKey,
      numBlocks: customBlocks.length,
      blocks: customBlocks.map(b => ({ id: b.id, title: b.title, isDuplicated: b.isDuplicated }))
    });

    const docRef = doc(db, CUSTOM_BLOCKS_FIRESTORE_COLLECTION, weekDayKey);
    await setDoc(docRef, {
      customBlocks,
      updatedAt: new Date().toISOString()
    });

    console.log('[saveCustomBlocksToFirebase] ✅ Blocos salvos no Firebase');
  } catch (error) {
    console.error('[saveCustomBlocksToFirebase] ❌ Erro ao salvar:', error);
  }
}

/**
 * Carrega blocos customizados do Firebase
 * @param {string} weekDayKey - Ex: "2025_W46_Mon"
 * @returns {array} Array de blocos customizados ou []
 */
export async function loadCustomBlocksFromFirebase(weekDayKey) {
  if (!weekDayKey) {
    console.log('[loadCustomBlocksFromFirebase] ⚠️ Sem weekDayKey');
    return [];
  }

  try {
    console.log('[loadCustomBlocksFromFirebase] 📡 Carregando do Firebase:', weekDayKey);
    const docRef = doc(db, CUSTOM_BLOCKS_FIRESTORE_COLLECTION, weekDayKey);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('[loadCustomBlocksFromFirebase] ✅ Blocos encontrados:', {
        numBlocks: data.customBlocks?.length,
        blocks: data.customBlocks?.map(b => ({ id: b.id, title: b.title }))
      });
      return data.customBlocks || [];
    } else {
      console.log('[loadCustomBlocksFromFirebase] ⚠️ Nenhum bloco customizado salvo');
      return [];
    }
  } catch (error) {
    console.error('[loadCustomBlocksFromFirebase] ❌ Erro ao carregar:', error);
    return [];
  }
}
