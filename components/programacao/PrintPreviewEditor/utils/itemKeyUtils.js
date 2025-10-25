/**
 * Utilitários para criação e manipulação de chaves de itens
 */

/**
 * Cria uma chave única para um item
 * @param {string} itemName - Nome do item/receita
 * @param {string} clientName - Nome do cliente
 * @param {string|null} blockTitle - Título do bloco (opcional)
 * @returns {string} Chave única
 */
export function createItemKey(itemName, clientName, blockTitle = null) {
  const normalizedClient = clientName || 'sem_cliente';

  if (blockTitle) {
    return `${blockTitle}_${itemName}_${normalizedClient}`;
  }

  return `${itemName}_${normalizedClient}`;
}

/**
 * Extrai componentes de uma chave de item
 * @param {string} itemKey - Chave do item
 * @returns {Object} Objeto com itemName, clientName, blockTitle
 */
export function parseItemKey(itemKey) {
  const parts = itemKey.split('_');

  if (parts.length >= 3) {
    // Formato novo: blockTitle_itemName_clientName
    // Ou pode ser itemName_clientName_com_underscores
    // Tentamos identificar pelo contexto
    const potentialBlockTitle = parts[0];
    const potentialItemName = parts[1];
    const restAsClient = parts.slice(2).join('_');

    // Se temos mais de 3 partes, provavelmente é formato novo
    if (parts.length > 3) {
      return {
        blockTitle: potentialBlockTitle,
        itemName: potentialItemName,
        clientName: restAsClient || 'sem_cliente'
      };
    }

    // Com exatamente 3 partes, pode ser ambíguo
    // Por padrão, assumimos formato novo se blockTitle é reconhecível
    return {
      blockTitle: potentialBlockTitle,
      itemName: potentialItemName,
      clientName: parts[2] || 'sem_cliente'
    };
  }

  // Formato antigo: itemName_clientName
  return {
    blockTitle: null,
    itemName: parts[0],
    clientName: parts[1] || 'sem_cliente'
  };
}

/**
 * Normaliza uma chave de item para formato consistente
 * @param {string} itemKey - Chave original
 * @returns {string} Chave normalizada
 */
export function normalizeItemKey(itemKey) {
  const { itemName, clientName, blockTitle } = parseItemKey(itemKey);
  return createItemKey(itemName, clientName, blockTitle);
}
