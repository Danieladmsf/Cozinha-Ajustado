/**
 * Sistema SIMPLES de gerenciamento de edições
 * Usa estrutura hierárquica em vez de chaves concatenadas
 */

const STORAGE_KEY = 'print_preview_edits_v2';

/**
 * Estrutura de dados simplificada:
 * {
 *   "Faap": {
 *     "Arroz Branco": {
 *       value: "6 cubas G",
 *       quantity: 6,
 *       unit: "cuba-g",
 *       timestamp: "2025-11-14T14:00:00.000Z",
 *       userId: "local-user"
 *     }
 *   }
 * }
 */

/**
 * Salva uma edição
 */
export function saveEdit(customerName, recipeName, editedValue, field = 'quantity') {
  const edits = loadAllEdits();

  // Criar estrutura se não existir
  if (!edits[customerName]) {
    edits[customerName] = {};
  }

  // Extrair quantidade e unidade do valor editado
  const numMatch = editedValue.match(/([\d.,]+)\s*(.+)/);
  const quantity = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : null;
  const unit = numMatch ? numMatch[2] : null;

  // Salvar edição
  edits[customerName][recipeName] = {
    value: editedValue,
    quantity,
    unit,
    field,
    timestamp: new Date().toISOString(),
    userId: 'local-user'
  };

  // Persistir
  localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));

  console.log('[SimpleEditManager] ✅ Edição salva:', {
    customerName,
    recipeName,
    value: editedValue,
    totalCustomers: Object.keys(edits).length,
    totalRecipes: Object.keys(edits[customerName]).length
  });

  return edits;
}

/**
 * Busca uma edição específica
 */
export function getEdit(customerName, recipeName) {
  const edits = loadAllEdits();
  return edits[customerName]?.[recipeName] || null;
}

/**
 * Busca TODAS as edições de uma receita (em todos os clientes)
 */
export function getAllEditsForRecipe(recipeName) {
  const edits = loadAllEdits();
  const results = [];

  Object.entries(edits).forEach(([customerName, recipes]) => {
    if (recipes[recipeName]) {
      results.push({
        customerName,
        recipeName,
        ...recipes[recipeName]
      });
    }
  });

  return results;
}

/**
 * Busca TODAS as edições de um cliente
 */
export function getAllEditsForCustomer(customerName) {
  const edits = loadAllEdits();
  return edits[customerName] || {};
}

/**
 * Carrega todas as edições
 */
export function loadAllEdits() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('[SimpleEditManager] Erro ao carregar edições:', error);
    return {};
  }
}

/**
 * Remove uma edição específica
 */
export function removeEdit(customerName, recipeName) {
  const edits = loadAllEdits();

  if (edits[customerName]?.[recipeName]) {
    delete edits[customerName][recipeName];

    // Se cliente ficou sem edições, remove o cliente
    if (Object.keys(edits[customerName]).length === 0) {
      delete edits[customerName];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
    console.log('[SimpleEditManager] 🗑️ Edição removida:', { customerName, recipeName });
  }
}

/**
 * Remove TODAS as edições
 */
export function clearAllEdits() {
  localStorage.removeItem(STORAGE_KEY);
  console.log('[SimpleEditManager] 🗑️ Todas as edições removidas');
  return {};
}

/**
 * Obtém resumo das edições
 */
export function getEditsSummary() {
  const edits = loadAllEdits();
  const customers = Object.keys(edits);
  let totalEdits = 0;

  customers.forEach(customer => {
    totalEdits += Object.keys(edits[customer]).length;
  });

  return {
    totalCustomers: customers.length,
    totalEdits,
    customers: customers.map(customer => ({
      name: customer,
      recipes: Object.keys(edits[customer]).length
    }))
  };
}

/**
 * Migra do sistema antigo para o novo
 */
export function migrateFromOldSystem() {
  const oldKey = 'print_preview_edit_state';
  const oldData = localStorage.getItem(oldKey);

  if (!oldData) {
    console.log('[SimpleEditManager] Nenhum dado antigo para migrar');
    return;
  }

  try {
    const oldEdits = JSON.parse(oldData);
    const newEdits = {};

    // Converter do formato antigo para o novo
    Object.entries(oldEdits).forEach(([key, edit]) => {
      // Tentar extrair cliente e receita da chave antiga
      // Formatos possíveis:
      // - "Cliente::Receita::sem_cliente"
      // - "Receita::Cliente"
      const parts = key.split('::');
      let customerName, recipeName;

      if (parts.length === 3) {
        // Formato: Cliente::Receita::sem_cliente
        customerName = parts[0];
        recipeName = parts[1];
      } else if (parts.length === 2) {
        // Formato: Receita::Cliente
        recipeName = parts[0];
        customerName = parts[1];
      } else {
        console.warn('[SimpleEditManager] Chave antiga não reconhecida:', key);
        return;
      }

      // Criar estrutura nova
      if (!newEdits[customerName]) {
        newEdits[customerName] = {};
      }

      newEdits[customerName][recipeName] = {
        value: edit.editedValue,
        quantity: null, // Será extraído do value
        unit: null,
        field: edit.field || 'quantity',
        timestamp: edit.timestamp,
        userId: edit.userId || 'local-user'
      };
    });

    // Salvar novo formato
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEdits));
    console.log('[SimpleEditManager] ✅ Migração concluída:', {
      oldEdits: Object.keys(oldEdits).length,
      newCustomers: Object.keys(newEdits).length
    });

    // Opcional: remover dados antigos
    // localStorage.removeItem(oldKey);

  } catch (error) {
    console.error('[SimpleEditManager] Erro na migração:', error);
  }
}
