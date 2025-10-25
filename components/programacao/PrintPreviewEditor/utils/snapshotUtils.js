/**
 * Utilitários para criação e gerenciamento de snapshots de pedidos
 */

import { createItemKey } from './itemKeyUtils';

/**
 * Cria um snapshot dos pedidos atuais
 * @param {Array} orders - Array de pedidos
 * @returns {Object} Snapshot com itemKey -> {quantity, unit_type, createdAt}
 */
export function createOrdersSnapshot(orders) {
  const snapshot = {};

  if (!orders || !Array.isArray(orders)) {
    return snapshot;
  }

  orders.forEach(order => {
    if (!order.items || !Array.isArray(order.items)) {
      return;
    }

    order.items.forEach(item => {
      const itemKey = createItemKey(
        item.recipe_name,
        order.customer_name
      );

      snapshot[itemKey] = {
        quantity: item.quantity,
        unit_type: item.unit_type,
        createdAt: new Date().toISOString()
      };
    });
  });

  return snapshot;
}

/**
 * Detecta mudanças entre snapshot original e pedidos atuais
 * @param {Object} originalSnapshot - Snapshot original
 * @param {Array} currentOrders - Pedidos atuais
 * @returns {Object} Mudanças detectadas
 */
export function detectOrderChanges(originalSnapshot, currentOrders) {
  const changes = {};

  if (!originalSnapshot || !currentOrders) {
    return changes;
  }

  // Criar snapshot atual
  const currentSnapshot = {};
  currentOrders.forEach(order => {
    if (!order.items) return;
    order.items.forEach(item => {
      const itemKey = createItemKey(item.recipe_name, order.customer_name);
      currentSnapshot[itemKey] = {
        quantity: item.quantity,
        unit_type: item.unit_type
      };
    });
  });

  // Comparar snapshots
  Object.keys(originalSnapshot).forEach(itemKey => {
    const original = originalSnapshot[itemKey];
    const current = currentSnapshot[itemKey];

    if (!current) return; // Item removido, ignorar

    const hasChanged =
      original.quantity !== current.quantity ||
      original.unit_type !== current.unit_type;

    if (hasChanged) {
      changes[itemKey] = {
        originalQuantity: original.quantity,
        originalUnit: original.unit_type,
        currentQuantity: current.quantity,
        currentUnit: current.unit_type,
        changedAt: new Date().toISOString()
      };
    }
  });

  return changes;
}

/**
 * Carrega snapshot do localStorage
 * @param {number} weekNumber - Número da semana
 * @param {number} year - Ano
 * @param {number} dayNumber - Número do dia
 * @returns {Object|null} Snapshot salvo ou null
 */
export function loadSnapshot(weekNumber, year, dayNumber) {
  const key = `snapshot_${weekNumber}_${year}_${dayNumber}`;
  const saved = localStorage.getItem(key);

  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error('Error loading snapshot:', error);
    return null;
  }
}

/**
 * Salva snapshot no localStorage
 * @param {number} weekNumber - Número da semana
 * @param {number} year - Ano
 * @param {number} dayNumber - Número do dia
 * @param {Object} snapshot - Snapshot a salvar
 */
export function saveSnapshot(weekNumber, year, dayNumber, snapshot) {
  const key = `snapshot_${weekNumber}_${year}_${dayNumber}`;
  try {
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch (error) {
    console.error('Error saving snapshot:', error);
  }
}

/**
 * Remove snapshot do localStorage
 * @param {number} weekNumber - Número da semana
 * @param {number} year - Ano
 * @param {number} dayNumber - Número do dia
 */
export function deleteSnapshot(weekNumber, year, dayNumber) {
  const key = `snapshot_${weekNumber}_${year}_${dayNumber}`;
  localStorage.removeItem(key);
}
