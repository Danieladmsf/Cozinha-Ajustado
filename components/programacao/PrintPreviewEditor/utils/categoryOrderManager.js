/**
 * Gerenciador de ordem de categorias
 * Garante que as categorias SEMPRE mantenham a mesma ordem, independente de edições
 */

import { CATEGORY_ORDER, CATEGORY_PRIORITY } from '../constants/editStates';

/**
 * Normaliza o nome de uma categoria
 */
export function normalizeCategoryName(category) {
  if (!category) return 'OUTROS';
  return category.toString().toUpperCase().trim();
}

/**
 * Obtém a prioridade de uma categoria
 */
export function getCategoryPriority(category) {
  const normalized = normalizeCategoryName(category);
  return CATEGORY_PRIORITY[normalized] || 0;
}

/**
 * Ordena categorias mantendo a ordem fixa definida
 */
export function sortCategoriesByOrder(categories) {
  if (!Array.isArray(categories)) {
    return [];
  }

  return [...categories].sort((a, b) => {
    const priorityA = getCategoryPriority(a);
    const priorityB = getCategoryPriority(b);
    return priorityB - priorityA; // Ordem decrescente de prioridade
  });
}

/**
 * Ordena um objeto de categorias mantendo a ordem fixa
 * @param {Object} categoriesObj - Objeto com categorias como chaves
 * @returns {Object} - Novo objeto com categorias ordenadas
 */
export function sortCategoriesObject(categoriesObj) {
  if (!categoriesObj || typeof categoriesObj !== 'object') {
    return {};
  }

  const categoryNames = Object.keys(categoriesObj);
  const sortedNames = sortCategoriesByOrder(categoryNames);

  const sortedObj = {};
  sortedNames.forEach(categoryName => {
    sortedObj[categoryName] = categoriesObj[categoryName];
  });

  return sortedObj;
}

/**
 * Preserva a ordem original das categorias ao mesclar items
 * Usa apenas para ADICIONAR novos items, não para reordenar
 */
export function mergeItemsPreservingCategoryOrder(originalItems, updatedItems) {
  if (!originalItems || typeof originalItems !== 'object') {
    return sortCategoriesObject(updatedItems || {});
  }

  if (!updatedItems || typeof updatedItems !== 'object') {
    return sortCategoriesObject(originalItems);
  }

  // Criar novo objeto com ordem fixa das categorias
  const merged = {};

  // Primeiro, adicionar todas as categorias do original na ordem correta
  const originalCategories = Object.keys(originalItems);
  const sortedOriginalCategories = sortCategoriesByOrder(originalCategories);

  sortedOriginalCategories.forEach(category => {
    if (updatedItems[category]) {
      // Se a categoria existe no update, usar o valor atualizado
      merged[category] = updatedItems[category];
    } else {
      // Se não existe no update, manter o original
      merged[category] = originalItems[category];
    }
  });

  // Adicionar novas categorias que só existem no update
  Object.keys(updatedItems).forEach(category => {
    if (!originalItems[category]) {
      merged[category] = updatedItems[category];
    }
  });

  // Reordenar o objeto final para garantir ordem correta
  return sortCategoriesObject(merged);
}

/**
 * Valida se uma categoria está na lista válida
 */
export function isValidCategory(category) {
  const normalized = normalizeCategoryName(category);
  return CATEGORY_ORDER.includes(normalized);
}

/**
 * Obtém a categoria padrão se a fornecida for inválida
 */
export function getDefaultCategory(category) {
  if (isValidCategory(category)) {
    return normalizeCategoryName(category);
  }
  return 'PADRÃO';
}

/**
 * Reorganiza items de um bloco mantendo ordem das categorias
 * @param {Object} block - Bloco com items organizados por categoria
 * @returns {Object} - Bloco com items reorganizados
 */
export function reorganizeBlockItems(block) {
  if (!block || !block.items) {
    return block;
  }

  return {
    ...block,
    items: sortCategoriesObject(block.items)
  };
}

/**
 * Garante que todos os blocos tenham categorias ordenadas corretamente
 * @param {Array} blocks - Array de blocos
 * @returns {Array} - Blocos com categorias ordenadas
 */
export function ensureCategoryOrderInBlocks(blocks) {
  if (!Array.isArray(blocks)) {
    return [];
  }

  return blocks.map(block => {
    if (block.type === 'empresa' && block.items) {
      return reorganizeBlockItems(block);
    }
    return block;
  });
}
