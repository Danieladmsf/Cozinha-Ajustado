/**
 * Constantes para gerenciar estados de edição, cores e status
 * Centraliza toda a lógica de visualização de mudanças do portal e edições manuais
 */

// Tipos de mudanças
export const CHANGE_TYPES = {
  NONE: 'none',
  MANUAL_EDIT: 'manual_edit',       // Edição manual do usuário
  PORTAL_UPDATE: 'portal_update',   // Atualização vinda do portal
  CONFLICT: 'conflict',             // Conflito entre edição manual e portal
  RESOLVED_ACCEPTED: 'resolved_accepted',  // Conflito resolvido aceitando portal
  RESOLVED_REJECTED: 'resolved_rejected'   // Conflito resolvido mantendo edição manual
};

// Cores para cada tipo de mudança
export const CHANGE_COLORS = {
  [CHANGE_TYPES.NONE]: {
    background: 'transparent',
    border: 'transparent',
    text: '#1f2937'
  },
  [CHANGE_TYPES.MANUAL_EDIT]: {
    background: '#fef3c7',  // Amarelo claro
    border: '#f59e0b',      // Amarelo/laranja
    text: '#92400e',        // Texto escuro
    badge: '#f59e0b'
  },
  [CHANGE_TYPES.PORTAL_UPDATE]: {
    background: '#d1fae5',  // Verde claro
    border: '#10b981',      // Verde
    text: '#065f46',        // Texto escuro
    badge: '#10b981'
  },
  [CHANGE_TYPES.CONFLICT]: {
    background: '#fee2e2',  // Vermelho claro
    border: '#ef4444',      // Vermelho
    text: '#991b1b',        // Texto escuro
    badge: '#ef4444',
    alert: '#dc2626'
  },
  [CHANGE_TYPES.RESOLVED_ACCEPTED]: {
    background: '#d1fae5',  // Verde claro
    border: '#10b981',      // Verde
    text: '#065f46',        // Texto escuro
    badge: '#10b981'
  },
  [CHANGE_TYPES.RESOLVED_REJECTED]: {
    background: '#fef3c7',  // Amarelo claro
    border: '#f59e0b',      // Amarelo
    text: '#92400e',        // Texto escuro
    badge: '#f59e0b'
  }
};

// Labels para cada tipo de mudança
export const CHANGE_LABELS = {
  [CHANGE_TYPES.NONE]: '',
  [CHANGE_TYPES.MANUAL_EDIT]: 'Editado',
  [CHANGE_TYPES.PORTAL_UPDATE]: 'Atualizado pelo portal',
  [CHANGE_TYPES.CONFLICT]: 'Conflito: edição manual vs portal',
  [CHANGE_TYPES.RESOLVED_ACCEPTED]: 'Conflito resolvido (portal aceito)',
  [CHANGE_TYPES.RESOLVED_REJECTED]: 'Conflito resolvido (edição mantida)'
};

// Ordem fixa das categorias (NUNCA deve mudar)
export const CATEGORY_ORDER = [
  'PADRÃO',
  'REFOGADO',
  'ACOMPANHAMENTO',
  'SALADA',
  'SOBREMESA'
];

// Prioridade de renderização (maior número = maior prioridade)
export const CATEGORY_PRIORITY = {
  'PADRÃO': 5,
  'REFOGADO': 4,
  'ACOMPANHAMENTO': 3,
  'SALADA': 2,
  'SOBREMESA': 1
};

/**
 * Obtém as cores para um tipo de mudança
 */
export function getChangeColors(changeType) {
  return CHANGE_COLORS[changeType] || CHANGE_COLORS[CHANGE_TYPES.NONE];
}

/**
 * Obtém o label para um tipo de mudança
 */
export function getChangeLabel(changeType) {
  return CHANGE_LABELS[changeType] || '';
}

/**
 * Determina o tipo de mudança com base nos flags
 */
export function determineChangeType({ isEdited, isChanged, isConflict, conflictResolution }) {
  if (isConflict && !conflictResolution) {
    return CHANGE_TYPES.CONFLICT;
  }

  if (conflictResolution === 'accepted') {
    return CHANGE_TYPES.RESOLVED_ACCEPTED;
  }

  if (conflictResolution === 'rejected') {
    return CHANGE_TYPES.RESOLVED_REJECTED;
  }

  if (isEdited) {
    return CHANGE_TYPES.MANUAL_EDIT;
  }

  if (isChanged) {
    return CHANGE_TYPES.PORTAL_UPDATE;
  }

  return CHANGE_TYPES.NONE;
}

/**
 * Retorna estilos CSS para aplicar em uma linha
 */
export function getChangeStyles(changeType) {
  const colors = getChangeColors(changeType);

  return {
    backgroundColor: colors.background,
    borderLeft: `4px solid ${colors.border}`,
    color: colors.text,
    paddingLeft: '8px',
    transition: 'all 0.3s ease'
  };
}
