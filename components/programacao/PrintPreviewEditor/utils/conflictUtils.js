/**
 * Utilitários para gerenciamento de estilos e tooltips de conflitos
 */

/**
 * Obtém os estilos CSS para uma linha baseado no status de conflito
 * @param {Object} params - Parâmetros
 * @param {string|null} params.conflictResolution - Status de resolução ('accepted'/'rejected')
 * @param {boolean} params.hasConflict - Se há conflito ativo
 * @param {boolean} params.edited - Se foi editado manualmente
 * @param {boolean} params.changed - Se mudou no portal
 * @returns {Object} Estilos CSS para aplicar na linha
 */
export function getConflictLineStyles({
  conflictResolution,
  hasConflict,
  edited,
  changed
}) {
  // Mudança aceita do portal (roxo)
  if (conflictResolution === 'accepted') {
    return {
      backgroundColor: '#e9d5ff',
      borderLeft: '3px solid #9333ea',
      paddingLeft: '8px',
      borderRadius: '4px'
    };
  }

  // Edição manual mantida - mudança rejeitada (laranja)
  if (conflictResolution === 'rejected') {
    return {
      backgroundColor: '#fed7aa',
      borderLeft: '3px solid #f97316',
      paddingLeft: '8px',
      borderRadius: '4px'
    };
  }

  // Conflito ativo não resolvido (vermelho/rosa)
  if (hasConflict) {
    return {
      backgroundColor: '#fee2e2',
      borderLeft: '4px solid #dc2626',
      paddingLeft: '8px',
      borderRadius: '4px'
    };
  }

  // Editado manualmente (sem conflito) (amarelo)
  if (edited) {
    return {
      backgroundColor: '#fef3c7',
      borderLeft: '3px solid #f59e0b',
      paddingLeft: '8px',
      borderRadius: '4px'
    };
  }

  // Mudado no portal (sem edição) (verde)
  if (changed) {
    return {
      backgroundColor: '#d1fae5',
      borderLeft: '3px solid #10b981',
      paddingLeft: '8px',
      borderRadius: '4px'
    };
  }

  // Sem modificações
  return {
    backgroundColor: 'transparent',
    borderLeft: 'none',
    paddingLeft: '2px',
    borderRadius: '4px'
  };
}

/**
 * Obtém o conteúdo do tooltip baseado no status
 * @param {Object} params - Parâmetros
 * @param {string|null} params.conflictResolution - Status de resolução
 * @param {boolean} params.hasConflict - Se há conflito
 * @param {boolean} params.edited - Se foi editado
 * @param {boolean} params.changed - Se mudou no portal
 * @param {Object|null} params.editInfo - Informações de edição
 * @param {Object|null} params.changeInfo - Informações de mudança
 * @returns {string} Conteúdo do tooltip
 */
export function getConflictTooltip({
  conflictResolution,
  hasConflict,
  edited,
  changed,
  editInfo,
  changeInfo
}) {
  // Mudança aceita
  if (conflictResolution === 'accepted') {
    return 'Mudança do portal aceita';
  }

  // Mudança rejeitada (edição mantida)
  if (conflictResolution === 'rejected') {
    return 'Edição manual mantida';
  }

  // Conflito ativo
  if (hasConflict) {
    return '⚠️ CONFLITO: Você editou manualmente E o portal modificou este item';
  }

  // Apenas editado
  if (edited && editInfo) {
    const userName = editInfo.userName || 'Você';
    const timestamp = editInfo.timestamp ? new Date(editInfo.timestamp).toLocaleString() : '';
    return `Editado por ${userName}${timestamp ? ' em ' + timestamp : ''}`;
  }

  // Apenas mudado
  if (changed && changeInfo) {
    const changeType = changeInfo.type === 'modified' ? 'Modificado' : changeInfo.type === 'added' ? 'Adicionado' : 'Removido';
    return `${changeType} nos pedidos originais`;
  }

  return null;
}

/**
 * Determina o ícone a mostrar baseado no status
 * @param {Object} params - Parâmetros (mesmos de getConflictLineStyles)
 * @returns {string} Emoji/ícone a mostrar
 */
export function getConflictIcon({
  conflictResolution,
  hasConflict,
  edited,
  changed
}) {
  if (conflictResolution === 'accepted') return '✅';
  if (conflictResolution === 'rejected') return '🔒';
  if (hasConflict) return '⚠️';
  if (edited) return '✏️';
  if (changed) return '🔄';
  return '';
}

/**
 * Verifica se uma linha deve mostrar botões de resolução de conflito
 * @param {Object} params - Parâmetros
 * @param {string|null} params.conflictResolution - Status de resolução
 * @param {boolean} params.hasConflict - Se há conflito
 * @returns {boolean} Se deve mostrar botões
 */
export function shouldShowConflictButtons({
  conflictResolution,
  hasConflict
}) {
  // Mostrar botões apenas se há conflito não resolvido
  return hasConflict && !conflictResolution;
}
