/**
 * Gerenciador de estado de edições
 * Rastreia edições manuais, atualizações do portal e conflitos
 */

import { CHANGE_TYPES } from '../constants/editStates';

/**
 * Cria uma chave única para um item
 */
export function createEditKey(recipeName, customerName, blockTitle = null) {
  const normalized = {
    recipe: (recipeName || '').trim(),
    customer: (customerName || 'sem_cliente').trim(),
    block: blockTitle ? blockTitle.trim() : ''
  };

  if (normalized.block) {
    return `${normalized.block}::${normalized.recipe}::${normalized.customer}`;
  }

  return `${normalized.recipe}::${normalized.customer}`;
}

/**
 * Estrutura de dados para uma edição
 */
export function createEditRecord({
  itemKey,
  originalValue,
  editedValue,
  field = 'quantity',
  timestamp = new Date().toISOString(),
  userId = 'local',
  userName = 'Usuário Local'
}) {
  return {
    itemKey,
    originalValue,
    editedValue,
    field,
    timestamp,
    userId,
    userName,
    type: CHANGE_TYPES.MANUAL_EDIT
  };
}

/**
 * Estrutura de dados para uma atualização do portal
 */
export function createPortalUpdateRecord({
  itemKey,
  previousQuantity,
  currentQuantity,
  previousUnit,
  currentUnit,
  timestamp = new Date().toISOString()
}) {
  return {
    itemKey,
    previousQuantity,
    currentQuantity,
    previousUnit,
    currentUnit,
    timestamp,
    type: CHANGE_TYPES.PORTAL_UPDATE
  };
}

/**
 * Estrutura de dados para um conflito
 */
export function createConflictRecord({
  itemKey,
  manualEdit,
  portalUpdate,
  resolution = null
}) {
  return {
    itemKey,
    manualEdit,
    portalUpdate,
    resolution, // null, 'accepted', ou 'rejected'
    type: CHANGE_TYPES.CONFLICT,
    createdAt: new Date().toISOString()
  };
}

/**
 * Detecta se há conflito entre edição manual e atualização do portal
 */
export function detectConflict(editRecord, portalUpdate) {
  if (!editRecord || !portalUpdate) {
    return false;
  }

  // Se ambos mudaram o mesmo campo, há conflito
  if (editRecord.field === 'quantity' && portalUpdate.currentQuantity !== undefined) {
    // Verificar se os valores são diferentes
    const editedQty = parseFloat(editRecord.editedValue);
    const portalQty = parseFloat(portalUpdate.currentQuantity);

    return !isNaN(editedQty) && !isNaN(portalQty) && editedQty !== portalQty;
  }

  return false;
}

/**
 * Mescla estados de edição preservando informações
 */
export function mergeEditStates(currentEdits = {}, newEdits = {}) {
  const merged = { ...currentEdits };

  Object.keys(newEdits).forEach(key => {
    const newEdit = newEdits[key];
    const existingEdit = merged[key];

    if (!existingEdit) {
      // Nova edição, apenas adicionar
      merged[key] = newEdit;
    } else {
      // Edição existente, mesclar informações
      merged[key] = {
        ...existingEdit,
        ...newEdit,
        // Preservar timestamp original se existir
        timestamp: existingEdit.timestamp || newEdit.timestamp
      };
    }
  });

  return merged;
}

/**
 * Limpa edições antigas (mais de 24 horas)
 */
export function cleanOldEdits(edits = {}, maxAgeHours = 24) {
  const now = new Date().getTime();
  const maxAge = maxAgeHours * 60 * 60 * 1000; // Converter para ms

  const cleaned = {};

  Object.keys(edits).forEach(key => {
    const edit = edits[key];
    if (!edit.timestamp) {
      // Se não tem timestamp, manter (segurança)
      cleaned[key] = edit;
      return;
    }

    const editTime = new Date(edit.timestamp).getTime();
    const age = now - editTime;

    if (age < maxAge) {
      cleaned[key] = edit;
    }
  });

  return cleaned;
}

/**
 * Resolve um conflito
 */
export function resolveConflict(conflictRecord, resolution) {
  if (!conflictRecord || conflictRecord.type !== CHANGE_TYPES.CONFLICT) {
    return null;
  }

  return {
    ...conflictRecord,
    resolution, // 'accepted' ou 'rejected'
    resolvedAt: new Date().toISOString(),
    type: resolution === 'accepted'
      ? CHANGE_TYPES.RESOLVED_ACCEPTED
      : CHANGE_TYPES.RESOLVED_REJECTED
  };
}

/**
 * Serializa estado de edições para salvar no localStorage
 */
export function serializeEditState(editState) {
  try {
    return JSON.stringify(editState);
  } catch (error) {
    return '{}';
  }
}

/**
 * Desserializa estado de edições do localStorage
 */
export function deserializeEditState(serialized) {
  try {
    return JSON.parse(serialized || '{}');
  } catch (error) {
    return {};
  }
}

/**
 * Salva estado de edições no localStorage
 */
export function saveEditStateToLocal(key, editState) {
  try {
    const serialized = serializeEditState(editState);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Carrega estado de edições do localStorage
 */
export function loadEditStateFromLocal(key) {
  try {
    const serialized = localStorage.getItem(key);
    return deserializeEditState(serialized);
  } catch (error) {
    return {};
  }
}

/**
 * Obtém resumo do estado de edições
 */
export function getEditStateSummary(editState = {}) {
  const summary = {
    total: 0,
    manualEdits: 0,
    portalUpdates: 0,
    conflicts: 0,
    resolvedConflicts: 0
  };

  Object.values(editState).forEach(edit => {
    summary.total++;

    switch (edit.type) {
      case CHANGE_TYPES.MANUAL_EDIT:
        summary.manualEdits++;
        break;
      case CHANGE_TYPES.PORTAL_UPDATE:
        summary.portalUpdates++;
        break;
      case CHANGE_TYPES.CONFLICT:
        summary.conflicts++;
        break;
      case CHANGE_TYPES.RESOLVED_ACCEPTED:
      case CHANGE_TYPES.RESOLVED_REJECTED:
        summary.resolvedConflicts++;
        break;
    }
  });

  return summary;
}
