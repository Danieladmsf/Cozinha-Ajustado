/**
 * Resolvedor de conflitos entre edições manuais e atualizações do portal
 * Gerencia a lógica de detecção, visualização e resolução de conflitos
 */

import { determineChangeType, getChangeStyles, getChangeLabel } from '../constants/editStates';
import { createEditKey, detectConflict } from './editStateManager';

/**
 * Compara valores para detectar mudanças
 */
export function hasValueChanged(original, current) {
  // Converter para string para comparação consistente
  const orig = String(original || '').trim();
  const curr = String(current || '').trim();

  return orig !== curr;
}

/**
 * Detecta conflitos em um item
 */
export function detectItemConflict({
  itemKey,
  editedItems = {},
  portalUpdates = {},
  resolvedConflicts = {}
}) {
  // Verificar se já foi resolvido
  if (resolvedConflicts[itemKey]) {
    return {
      hasConflict: false,
      isResolved: true,
      resolution: resolvedConflicts[itemKey].resolution
    };
  }

  // Verificar se há edição manual
  const manualEdit = editedItems[itemKey];
  if (!manualEdit) {
    return { hasConflict: false, isResolved: false };
  }

  // Verificar se há atualização do portal
  const portalUpdate = portalUpdates[itemKey];
  if (!portalUpdate) {
    return { hasConflict: false, isResolved: false };
  }

  // Detectar conflito real
  const hasConflict = detectConflict(manualEdit, portalUpdate);

  return {
    hasConflict,
    isResolved: false,
    manualEdit,
    portalUpdate
  };
}

/**
 * Obtém informações de estilo e status para um item
 */
export function getItemDisplayInfo({
  itemKey,
  editedItems = {},
  portalUpdates = {},
  resolvedConflicts = {}
}) {
  const conflictInfo = detectItemConflict({
    itemKey,
    editedItems,
    portalUpdates,
    resolvedConflicts
  });

  const isEdited = !!editedItems[itemKey];
  const isChanged = !!portalUpdates[itemKey];
  const isConflict = conflictInfo.hasConflict;
  const conflictResolution = conflictInfo.resolution;

  const changeType = determineChangeType({
    isEdited,
    isChanged,
    isConflict,
    conflictResolution
  });

  return {
    changeType,
    styles: getChangeStyles(changeType),
    label: getChangeLabel(changeType),
    isEdited,
    isChanged,
    isConflict,
    conflictResolution,
    conflictInfo
  };
}

/**
 * Cria tooltip com informações detalhadas
 */
export function createDetailedTooltip({
  itemKey,
  editedItems = {},
  portalUpdates = {},
  conflictInfo = {}
}) {
  const parts = [];

  if (conflictInfo.hasConflict) {
    parts.push('⚠️ CONFLITO DETECTADO');
    parts.push('');

    if (conflictInfo.manualEdit) {
      parts.push('📝 Edição Manual:');
      parts.push(`  Valor: ${conflictInfo.manualEdit.editedValue}`);
      parts.push(`  Por: ${conflictInfo.manualEdit.userName}`);
      parts.push(`  Em: ${new Date(conflictInfo.manualEdit.timestamp).toLocaleString('pt-BR')}`);
      parts.push('');
    }

    if (conflictInfo.portalUpdate) {
      parts.push('🌐 Atualização Portal:');
      parts.push(`  Novo valor: ${conflictInfo.portalUpdate.currentQuantity}`);
      parts.push(`  Valor anterior: ${conflictInfo.portalUpdate.previousQuantity}`);
      parts.push(`  Em: ${new Date(conflictInfo.portalUpdate.timestamp).toLocaleString('pt-BR')}`);
    }

    parts.push('');
    parts.push('Clique nos botões para resolver o conflito');

  } else if (conflictInfo.isResolved) {
    parts.push('✅ Conflito Resolvido');
    parts.push('');
    parts.push(`Resolução: ${conflictInfo.resolution === 'accepted' ? 'Aceito portal' : 'Mantido edição'}`);

  } else if (editedItems[itemKey]) {
    const edit = editedItems[itemKey];
    parts.push('📝 Item Editado Manualmente');
    parts.push('');
    parts.push(`Original: ${edit.originalValue}`);
    parts.push(`Editado: ${edit.editedValue}`);
    parts.push(`Por: ${edit.userName}`);
    parts.push(`Em: ${new Date(edit.timestamp).toLocaleString('pt-BR')}`);

  } else if (portalUpdates[itemKey]) {
    const update = portalUpdates[itemKey];
    parts.push('🌐 Atualizado pelo Portal');
    parts.push('');
    parts.push(`Anterior: ${update.previousQuantity}`);
    parts.push(`Atual: ${update.currentQuantity}`);
    parts.push(`Em: ${new Date(update.timestamp).toLocaleString('pt-BR')}`);
  }

  return parts.join('\n');
}

/**
 * Aplica resolução de conflito a um item
 */
export function applyConflictResolution({
  itemKey,
  resolution, // 'accepted' ou 'rejected'
  conflictInfo,
  currentValue
}) {
  if (!conflictInfo || !conflictInfo.hasConflict) {
    return currentValue;
  }

  if (resolution === 'accepted' && conflictInfo.portalUpdate) {
    // Aceitar valor do portal
    return {
      value: conflictInfo.portalUpdate.currentQuantity,
      unit: conflictInfo.portalUpdate.currentUnit
    };
  }

  if (resolution === 'rejected' && conflictInfo.manualEdit) {
    // Manter valor da edição manual
    return {
      value: conflictInfo.manualEdit.editedValue,
      unit: currentValue.unit
    };
  }

  return currentValue;
}

/**
 * Processa todos os items de um bloco aplicando informações de estado
 */
export function processBlockItemsWithStates({
  block,
  editedItems = {},
  portalUpdates = {},
  resolvedConflicts = {}
}) {
  if (!block || !block.items) {
    return block;
  }

  // Para blocos tipo 'empresa'
  if (block.type === 'empresa') {
    const processedItems = {};

    Object.entries(block.items).forEach(([category, categoryItems]) => {
      processedItems[category] = categoryItems.map(item => {
        const itemKey = createEditKey(
          item.recipe_name,
          item.customer_name || 'sem_cliente',
          block.title
        );

        const displayInfo = getItemDisplayInfo({
          itemKey,
          editedItems,
          portalUpdates,
          resolvedConflicts
        });

        return {
          ...item,
          _displayInfo: displayInfo,
          _itemKey: itemKey
        };
      });
    });

    return {
      ...block,
      items: processedItems
    };
  }

  // Para outros tipos de blocos (detailed-section, embalagem-category)
  if (block.type === 'detailed-section' || block.type === 'embalagem-category') {
    const processedItems = block.items.map(recipe => {
      const processedClientes = recipe.clientes.map(cliente => {
        const itemKey = createEditKey(recipe.recipe_name, cliente.customer_name);

        const displayInfo = getItemDisplayInfo({
          itemKey,
          editedItems,
          portalUpdates,
          resolvedConflicts
        });

        return {
          ...cliente,
          _displayInfo: displayInfo,
          _itemKey: itemKey
        };
      });

      return {
        ...recipe,
        clientes: processedClientes
      };
    });

    return {
      ...block,
      items: processedItems
    };
  }

  return block;
}

/**
 * Obtém estatísticas de conflitos
 */
export function getConflictStatistics(editedItems = {}, portalUpdates = {}, resolvedConflicts = {}) {
  const stats = {
    totalEdits: Object.keys(editedItems).length,
    totalPortalUpdates: Object.keys(portalUpdates).length,
    unresolvedConflicts: 0,
    resolvedConflicts: Object.keys(resolvedConflicts).length,
    conflictItems: []
  };

  // Detectar conflitos não resolvidos
  Object.keys(editedItems).forEach(itemKey => {
    if (portalUpdates[itemKey] && !resolvedConflicts[itemKey]) {
      const conflict = detectItemConflict({
        itemKey,
        editedItems,
        portalUpdates,
        resolvedConflicts
      });

      if (conflict.hasConflict) {
        stats.unresolvedConflicts++;
        stats.conflictItems.push(itemKey);
      }
    }
  });

  return stats;
}
