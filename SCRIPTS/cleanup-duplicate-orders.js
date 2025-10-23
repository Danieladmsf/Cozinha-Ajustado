/**
 * Script para limpar pedidos duplicados no Firestore
 *
 * ATENÇÃO: Este script remove pedidos antigos/duplicados
 * Mantém apenas o último pedido de cada cliente por dia
 *
 * USO:
 * 1. Simular (sem deletar): node SCRIPTS/cleanup-duplicate-orders.js --dry-run
 * 2. Executar limpeza: node SCRIPTS/cleanup-duplicate-orders.js --execute
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc, orderBy } from 'firebase/firestore';
import readline from 'readline';
import fs from 'fs';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAP_zieVJnXSLSNY8Iv1F7oYETA577r9YY",
  authDomain: "psabordefamilia-2167e.firebaseapp.com",
  projectId: "psabordefamilia-2167e",
  storageBucket: "psabordefamilia-2167e.firebasestorage.app",
  messagingSenderId: "372180651336",
  appId: "1:372180651336:web:f7a3a48d99e7db6974b77d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Configuração
const isDryRun = process.argv.includes('--dry-run');
const isExecute = process.argv.includes('--execute');

// ====================================================================
// FUNÇÕES AUXILIARES
// ====================================================================

/**
 * Aguarda confirmação do usuário
 */
async function askConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (digite 'SIM' para confirmar): `, (answer) => {
      rl.close();
      resolve(answer.toUpperCase() === 'SIM');
    });
  });
}

/**
 * Salva backup dos pedidos que serão deletados
 */
async function saveBackup(ordersToDelete) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-orders-deleted-${timestamp}.json`;

  const backup = ordersToDelete.map(order => ({
    id: order.id,
    customer_name: order.data.customer_name,
    day_of_week: order.data.day_of_week,
    week_number: order.data.week_number,
    year: order.data.year,
    created_at: order.data.created_at,
    updated_at: order.data.updated_at,
    items_count: order.data.items?.length || 0
  }));

  fs.writeFileSync(`SCRIPTS/${filename}`, JSON.stringify(backup, null, 2));
  console.log(`📦 Backup salvo em: SCRIPTS/${filename}`);
  return filename;
}

// ====================================================================
// LÓGICA PRINCIPAL
// ====================================================================

/**
 * Encontra pedidos duplicados
 */
async function findDuplicateOrders() {
  console.log('🔍 Buscando pedidos duplicados...\n');

  try {
    const ordersRef = collection(db, 'Order');
    console.log('   Conectando ao Firestore...');

    const snapshot = await getDocs(ordersRef);
    console.log(`   Snapshot obtido: ${snapshot.size} documentos`);

    const orders = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - Pedido encontrado: ${doc.id} | Cliente: ${data.customer_name || 'N/A'} | Dia: ${data.day_of_week || 'N/A'}`);
      orders.push({
        id: doc.id,
        data: data
      });
    });

    console.log(`\n📊 Total de pedidos no banco: ${orders.length}`);

    // Agrupar por cliente + dia + semana + ano
    const grouped = {};

    orders.forEach(order => {
      const key = `${order.data.customer_name}_${order.data.day_of_week}_${order.data.week_number}_${order.data.year}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(order);
    });

    // Identificar duplicados
    const duplicates = {};
    let totalDuplicates = 0;

    Object.entries(grouped).forEach(([key, orderGroup]) => {
      if (orderGroup.length > 1) {
        duplicates[key] = orderGroup;
        totalDuplicates += orderGroup.length - 1; // -1 porque vamos manter 1
      }
    });

    return { duplicates, totalDuplicates, totalOrders: orders.length };
  } catch (error) {
    console.error('❌ Erro ao buscar pedidos:', error);
    throw error;
  }
}

/**
 * Seleciona qual pedido manter (o mais recente)
 */
function selectOrderToKeep(orderGroup) {
  // Ordenar por ID (assumindo que ID maior = mais recente)
  // Ou usar updated_at se disponível

  const sorted = orderGroup.sort((a, b) => {
    // Tentar usar updated_at primeiro
    if (a.data.updated_at && b.data.updated_at) {
      return new Date(b.data.updated_at) - new Date(a.data.updated_at);
    }

    // Senão usar ID
    return b.id.localeCompare(a.id);
  });

  return sorted[0]; // Primeiro é o mais recente
}

/**
 * Processa duplicados e retorna lista de pedidos para deletar
 */
function processDuplicates(duplicates) {
  const toDelete = [];
  const toKeep = [];

  Object.entries(duplicates).forEach(([key, orderGroup]) => {
    const orderToKeep = selectOrderToKeep(orderGroup);
    const ordersToDelete = orderGroup.filter(o => o.id !== orderToKeep.id);

    toKeep.push(orderToKeep);
    toDelete.push(...ordersToDelete);
  });

  return { toDelete, toKeep };
}

/**
 * Mostra relatório detalhado
 */
function showReport(duplicates, toDelete, toKeep) {
  console.log('\n📋 RELATÓRIO DE DUPLICADOS:\n');
  console.log('═'.repeat(80));

  Object.entries(duplicates).forEach(([key, orderGroup]) => {
    const [customer, day, week, year] = key.split('_');
    console.log(`\n🏢 Cliente: ${customer}`);
    console.log(`📅 Dia: ${day} | Semana: ${week} | Ano: ${year}`);
    console.log(`📦 Total de pedidos: ${orderGroup.length}`);
    console.log('─'.repeat(80));

    orderGroup.forEach((order, index) => {
      const isKeep = toKeep.find(o => o.id === order.id);
      const status = isKeep ? '✅ MANTER' : '❌ DELETAR';
      const itemsCount = order.data.items?.length || 0;

      console.log(`  ${index + 1}. ${status}`);
      console.log(`     ID: ${order.id}`);
      console.log(`     Items: ${itemsCount}`);
      console.log(`     Updated: ${order.data.updated_at || 'N/A'}`);
    });
  });

  console.log('\n' + '═'.repeat(80));
  console.log(`\n📊 RESUMO:`);
  console.log(`   Total de pedidos duplicados: ${Object.keys(duplicates).length} grupos`);
  console.log(`   Pedidos a manter: ${toKeep.length} ✅`);
  console.log(`   Pedidos a deletar: ${toDelete.length} ❌`);
  console.log('');
}

/**
 * Deleta pedidos (apenas se não for dry-run)
 */
async function deleteOrders(toDelete) {
  if (isDryRun) {
    console.log('🔵 MODO SIMULAÇÃO - Nenhum pedido foi deletado');
    return;
  }

  console.log('\n🗑️  Deletando pedidos...\n');

  let deleted = 0;
  for (const order of toDelete) {
    try {
      await deleteDoc(doc(db, 'Order', order.id));
      deleted++;
      console.log(`   ✓ Deletado: ${order.data.customer_name} - ${order.id}`);
    } catch (error) {
      console.error(`   ✗ Erro ao deletar ${order.id}:`, error.message);
    }
  }

  console.log(`\n✅ ${deleted} pedidos deletados com sucesso!`);
}

// ====================================================================
// EXECUÇÃO PRINCIPAL
// ====================================================================

async function main() {
  console.log('🧹 LIMPEZA DE PEDIDOS DUPLICADOS\n');
  console.log('═'.repeat(80));

  // Verificar modo
  if (!isDryRun && !isExecute) {
    console.log('❌ ERRO: Modo não especificado!');
    console.log('\nUso correto:');
    console.log('  Simular: node SCRIPTS/cleanup-duplicate-orders.js --dry-run');
    console.log('  Executar: node SCRIPTS/cleanup-duplicate-orders.js --execute');
    process.exit(1);
  }

  if (isDryRun) {
    console.log('🔵 MODO: SIMULAÇÃO (dry-run)');
    console.log('   Nenhum pedido será deletado\n');
  } else {
    console.log('🔴 MODO: EXECUÇÃO REAL');
    console.log('   ⚠️  Pedidos serão permanentemente deletados!\n');
  }

  console.log('═'.repeat(80));

  // 1. Buscar duplicados
  const { duplicates, totalDuplicates, totalOrders } = await findDuplicateOrders();

  if (Object.keys(duplicates).length === 0) {
    console.log('\n✅ Nenhum pedido duplicado encontrado!');
    process.exit(0);
  }

  // 2. Processar duplicados
  const { toDelete, toKeep } = processDuplicates(duplicates);

  // 3. Mostrar relatório
  showReport(duplicates, toDelete, toKeep);

  // 4. Se for execução real, pedir confirmação
  if (!isDryRun) {
    console.log('⚠️  ATENÇÃO: Esta ação é IRREVERSÍVEL!');
    console.log('⚠️  Um backup será criado antes da exclusão.\n');

    const confirmed = await askConfirmation('Tem certeza que deseja deletar estes pedidos?');

    if (!confirmed) {
      console.log('\n❌ Operação cancelada pelo usuário.');
      process.exit(0);
    }

    // 5. Criar backup
    await saveBackup(toDelete);

    // 6. Deletar pedidos
    await deleteOrders(toDelete);
  }

  console.log('\n✅ Processo concluído!');
  process.exit(0);
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
