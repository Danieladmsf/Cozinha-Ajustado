/**
 * Utilitários para mapeamento e ordenação de categorias
 */

/**
 * Normaliza texto removendo acentos e caracteres especiais
 * @param {string} text - Texto para normalizar
 * @returns {string} Texto normalizado
 */
export const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Encontra uma categoria correspondente baseada em nome ou ID
 * @param {Array} categories - Array de categorias disponíveis
 * @param {string} searchValue - Valor para buscar (nome ou ID)
 * @returns {Object|null} Categoria encontrada ou null
 */
export const findMatchingCategory = (categories, searchValue) => {
  if (!categories || !searchValue) return null;

  // 1. Busca exata por ID
  let found = categories.find(cat => cat.id === searchValue);
  if (found) return found;

  // 2. Busca exata por nome
  found = categories.find(cat => cat.name === searchValue);
  if (found) return found;

  // 3. Busca normalizada
  const normalizedSearch = normalizeText(searchValue);
  found = categories.find(cat => 
    normalizeText(cat.name) === normalizedSearch ||
    normalizeText(cat.id) === normalizedSearch
  );

  return found || null;
};

/**
 * Mapeia itens consolidados para categorias corretas baseado na configuração
 * @param {Object} consolidatedItems - Itens agrupados por categoria original
 * @param {Array} categories - Categorias disponíveis
 * @returns {Object} Itens reagrupados por categoria correta
 */
export const remapItemsToCorrectCategories = (consolidatedItems, categories) => {
  if (!consolidatedItems || !categories) return {};

  const regroupedItems = {};

  Object.entries(consolidatedItems).forEach(([originalCategoryKey, items]) => {
    items.forEach(item => {
      // Tentar encontrar categoria correta através de múltiplas estratégias
      let correctCategory = 
        findMatchingCategory(categories, item.category) ||
        findMatchingCategory(categories, originalCategoryKey);

      if (correctCategory) {
        if (!regroupedItems[correctCategory.id]) {
          regroupedItems[correctCategory.id] = {
            category: correctCategory,
            items: []
          };
        }
        regroupedItems[correctCategory.id].items.push(item);
      }
    });
  });

  return regroupedItems;
};

/**
 * Ordena categorias baseado na configuração ativa
 * @param {Object} regroupedItems - Itens agrupados por categoria
 * @param {Array} activeCategories - Categorias na ordem configurada
 * @returns {Array} Array de objetos {category, items} na ordem correta
 */
export const orderCategoriesByConfig = (regroupedItems, activeCategories) => {
  if (!regroupedItems || !activeCategories) return [];

  return activeCategories
    .map(category => regroupedItems[category.id])
    .filter(Boolean)
    .filter(categoryData => categoryData.items && categoryData.items.length > 0);
};

/**
 * Pipeline completo para processar e ordenar itens consolidados
 * @param {Object} consolidatedItems - Itens consolidados originais
 * @param {Array} categories - Todas as categorias disponíveis  
 * @param {Array} activeCategories - Categorias ativas na ordem configurada
 * @returns {Array} Array ordenado de {category, items}
 */
export const processConsolidatedItems = (consolidatedItems, categories, activeCategories) => {
  const regroupedItems = remapItemsToCorrectCategories(consolidatedItems, categories);
  return orderCategoriesByConfig(regroupedItems, activeCategories);
};