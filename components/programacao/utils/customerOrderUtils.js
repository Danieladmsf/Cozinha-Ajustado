/**
 * Utilitários para gerenciar a ordem dos clientes
 * Usado tanto no Editor de Impressão quanto nas abas de visualização
 */

const CUSTOMER_ORDER_KEY = 'print-preview-customer-order';
const BLOCK_ORDER_KEY = 'print-preview-page-order';

/**
 * Carrega a ordem dos clientes salva no localStorage
 * @returns {Array} Array de nomes de clientes na ordem salva
 */
export function loadSavedCustomerOrder() {
  try {
    const saved = localStorage.getItem(CUSTOMER_ORDER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed;
    }
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Carrega a ordem dos blocos salva no localStorage
 * @returns {Array} Array de IDs de blocos na ordem salva
 */
export function loadSavedBlockOrder() {
  try {
    const saved = localStorage.getItem(BLOCK_ORDER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed;
    }
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Extrai a ordem dos clientes a partir dos IDs dos blocos
 * Os IDs são no formato "empresa-0", "empresa-1", etc.
 * Mas precisamos dos nomes dos clientes
 * @param {Array} blockIds - Array de IDs de blocos
 * @param {Array} orders - Array de pedidos para extrair nomes de clientes
 * @returns {Array} Array de nomes de clientes na ordem
 */
export function extractCustomerOrderFromBlockIds(blockIds, orders) {
  if (!blockIds || blockIds.length === 0) return [];
  if (!orders || orders.length === 0) return [];

  // Extrair apenas os IDs de empresa
  const empresaIds = blockIds.filter(id => id.startsWith('empresa-'));

  // Se não houver IDs de empresa salvos, retornar ordem padrão dos pedidos
  if (empresaIds.length === 0) {
    const uniqueCustomers = [...new Set(orders.map(o => o.customer_name))];
    return uniqueCustomers;
  }

  // Precisamos mapear os índices para os nomes dos clientes
  // A ordem original é baseada na ordem dos pedidos agrupados por cliente
  const customersByOrder = [];
  const seenCustomers = new Set();

  orders.forEach(order => {
    if (!seenCustomers.has(order.customer_name)) {
      seenCustomers.add(order.customer_name);
      customersByOrder.push(order.customer_name);
    }
  });

  // Reordenar de acordo com os IDs salvos
  const reorderedCustomers = [];
  empresaIds.forEach(id => {
    const index = parseInt(id.replace('empresa-', ''), 10);
    if (customersByOrder[index]) {
      reorderedCustomers.push(customersByOrder[index]);
    }
  });

  // Adicionar clientes que não estavam na ordem salva
  customersByOrder.forEach(customer => {
    if (!reorderedCustomers.includes(customer)) {
      reorderedCustomers.push(customer);
    }
  });

  return reorderedCustomers;
}

/**
 * Ordena um objeto de clientes de acordo com a ordem especificada
 * @param {Object} clientesObj - Objeto com clientes como chaves
 * @param {Array} customerOrder - Array com a ordem dos clientes
 * @returns {Array} Array de [customerName, data] ordenado
 */
export function sortClientesByOrder(clientesObj, customerOrder) {
  if (!clientesObj || typeof clientesObj !== 'object') return [];

  const entries = Object.entries(clientesObj);

  if (!customerOrder || customerOrder.length === 0) {
    return entries;
  }

  // Criar array lowercase para comparação case-insensitive
  const customerOrderLower = customerOrder.map(c => c.toLowerCase());

  return entries.sort((a, b) => {
    const lowerA = a[0].toLowerCase();
    const lowerB = b[0].toLowerCase();

    // Usar findIndex com comparação case-insensitive
    const indexA = customerOrderLower.indexOf(lowerA);
    const indexB = customerOrderLower.indexOf(lowerB);

    // Se não encontrar na lista, colocar no final
    const posA = indexA === -1 ? 9999 : indexA;
    const posB = indexB === -1 ? 9999 : indexB;

    return posA - posB;
  });
}

/**
 * Hook-like function para obter a ordem dos clientes
 * Primeiro tenta usar a ordem salva diretamente, depois fallback para IDs de blocos
 * @param {Array} orders - Array de pedidos (opcional, usado como fallback)
 * @returns {Array} Array de nomes de clientes na ordem salva
 */
export function getCustomerOrder(orders = []) {
  // Primeiro tentar carregar ordem direta de clientes
  const savedCustomerOrder = loadSavedCustomerOrder();
  if (savedCustomerOrder.length > 0) {
    return savedCustomerOrder;
  }

  // Fallback: extrair dos IDs de blocos
  const savedBlockOrder = loadSavedBlockOrder();
  const extractedOrder = extractCustomerOrderFromBlockIds(savedBlockOrder, orders);

  if (extractedOrder.length > 0) {
    // MIGRAÇÃO: Salvar a ordem extraída para uso futuro
    // Isso garante que próximas cargas não precisem extrair novamente
    try {
      localStorage.setItem(CUSTOMER_ORDER_KEY, JSON.stringify(extractedOrder));
    } catch (error) {
      // Silently fail
    }
  }

  return extractedOrder;
}

/**
 * Salva a ordem dos clientes no localStorage
 * Útil para migrar a ordem quando já existe no Editor de Impressão
 * @param {Array} customerOrder - Array de nomes de clientes
 */
export function saveCustomerOrder(customerOrder) {
  try {
    localStorage.setItem(CUSTOMER_ORDER_KEY, JSON.stringify(customerOrder));
  } catch (error) {
    // Silently fail
  }
}
