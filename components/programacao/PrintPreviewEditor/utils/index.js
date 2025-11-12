/**
 * Índice central de utilitários para gerenciamento de edições e conflitos
 * Exporta todas as funções de forma organizada
 */

// Constantes
export {
  CHANGE_TYPES,
  CHANGE_COLORS,
  CHANGE_LABELS,
  CATEGORY_ORDER,
  CATEGORY_PRIORITY,
  getChangeColors,
  getChangeLabel,
  determineChangeType,
  getChangeStyles
} from '../constants/editStates';

// Gerenciador de ordem de categorias
export {
  normalizeCategoryName,
  getCategoryPriority,
  sortCategoriesByOrder,
  sortCategoriesObject,
  mergeItemsPreservingCategoryOrder,
  isValidCategory,
  getDefaultCategory,
  reorganizeBlockItems,
  ensureCategoryOrderInBlocks
} from './categoryOrderManager';

// Gerenciador de estado de edições
export {
  createEditKey,
  createEditRecord,
  createPortalUpdateRecord,
  createConflictRecord,
  detectConflict,
  mergeEditStates,
  cleanOldEdits,
  resolveConflict,
  serializeEditState,
  deserializeEditState,
  saveEditStateToLocal,
  loadEditStateFromLocal,
  getEditStateSummary
} from './editStateManager';

// Resolvedor de conflitos
export {
  hasValueChanged,
  detectItemConflict,
  getItemDisplayInfo,
  createDetailedTooltip,
  applyConflictResolution,
  processBlockItemsWithStates,
  getConflictStatistics
} from './conflictResolver';
