/**
 * Script para atualizar todas as fichas técnicas no Firestore
 *
 * Isso força o recálculo de todos os campos calculados (pesos, custos, etc.)
 *
 * USO:
 * 1. Simular (ver quais receitas serão atualizadas): node SCRIPTS/update-all-recipes.js --dry-run
 * 2. Executar atualização: node SCRIPTS/update-all-recipes.js --execute
 * 3. Atualizar apenas uma receita específica: node SCRIPTS/update-all-recipes.js --execute --id=RECIPE_ID
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import readline from 'readline';

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

// Pegar ID específico se fornecido
const idArg = process.argv.find(arg => arg.startsWith('--id='));
const specificRecipeId = idArg ? idArg.split('=')[1] : null;

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

// ====================================================================
// LÓGICA PRINCIPAL
// ====================================================================

/**
 * Busca todas as receitas ou uma específica
 */
async function fetchRecipes() {
  console.log('🔍 Buscando receitas...\n');

  try {
    const recipesRef = collection(db, 'Recipe');
    console.log('   Conectando ao Firestore...');

    const snapshot = await getDocs(recipesRef);
    console.log(`   Snapshot obtido: ${snapshot.size} documentos`);

    const recipes = [];
    snapshot.forEach(doc => {
      const data = doc.data();

      // Se foi especificado um ID, filtrar apenas essa receita
      if (specificRecipeId && doc.id !== specificRecipeId) {
        return;
      }

      console.log(`   - Receita encontrada: ${doc.id} | Nome: ${data.name || 'N/A'} | Categoria: ${data.category || 'N/A'}`);
      recipes.push({
        id: doc.id,
        data: data
      });
    });

    console.log(`\n📊 Total de receitas encontradas: ${recipes.length}`);

    if (specificRecipeId && recipes.length === 0) {
      console.warn(`\n⚠️ Receita com ID "${specificRecipeId}" não encontrada!`);
    }

    return recipes;
  } catch (error) {
    console.error('❌ Erro ao buscar receitas:', error);
    throw error;
  }
}

/**
 * Mostra relatório das receitas que serão atualizadas
 */
function showReport(recipes) {
  console.log('\n📋 RELATÓRIO DE RECEITAS:\n');
  console.log('═'.repeat(80));

  // Agrupar por categoria
  const byCategory = {};
  recipes.forEach(recipe => {
    const category = recipe.data.category || 'Sem Categoria';
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(recipe);
  });

  // Mostrar por categoria
  Object.entries(byCategory).forEach(([category, recipeList]) => {
    console.log(`\n📂 ${category.toUpperCase()}: ${recipeList.length} receitas`);
    console.log('─'.repeat(80));

    recipeList.forEach((recipe, index) => {
      const prepCount = recipe.data.preparations?.length || 0;
      const hasWeight = recipe.data.total_weight ? '✅' : '⚠️';

      console.log(`  ${index + 1}. ${recipe.data.name || 'Sem nome'}`);
      console.log(`     ID: ${recipe.id}`);
      console.log(`     Preparações: ${prepCount}`);
      console.log(`     Peso Total: ${hasWeight} ${recipe.data.total_weight || 'N/A'} kg`);
    });
  });

  console.log('\n' + '═'.repeat(80));
  console.log(`\n📊 RESUMO:`);
  console.log(`   Total de receitas: ${recipes.length}`);
  console.log(`   Categorias: ${Object.keys(byCategory).length}`);
  console.log('');
}

/**
 * Atualiza as receitas no Firestore
 */
async function updateRecipes(recipes) {
  if (isDryRun) {
    console.log('🔵 MODO SIMULAÇÃO - Nenhuma receita foi atualizada');
    return;
  }

  console.log('\n🔄 Atualizando receitas...\n');

  let updated = 0;
  let errors = 0;

  for (const recipe of recipes) {
    try {
      const recipeRef = doc(db, 'Recipe', recipe.id);

      // Atualizar o campo updatedAt para forçar recálculo
      await updateDoc(recipeRef, {
        updatedAt: new Date()
      });

      updated++;
      console.log(`   ✓ Atualizado: ${recipe.data.name || recipe.id}`);
    } catch (error) {
      errors++;
      console.error(`   ✗ Erro ao atualizar ${recipe.id}:`, error.message);
    }
  }

  console.log(`\n✅ ${updated} receitas atualizadas com sucesso!`);
  if (errors > 0) {
    console.log(`⚠️  ${errors} erros durante atualização`);
  }
}

// ====================================================================
// EXECUÇÃO PRINCIPAL
// ====================================================================

async function main() {
  console.log('🔄 ATUALIZAÇÃO DE FICHAS TÉCNICAS\n');
  console.log('═'.repeat(80));

  // Verificar modo
  if (!isDryRun && !isExecute) {
    console.log('❌ ERRO: Modo não especificado!');
    console.log('\nUso correto:');
    console.log('  Simular: node SCRIPTS/update-all-recipes.js --dry-run');
    console.log('  Executar: node SCRIPTS/update-all-recipes.js --execute');
    console.log('  Atualizar uma receita: node SCRIPTS/update-all-recipes.js --execute --id=RECIPE_ID');
    process.exit(1);
  }

  if (isDryRun) {
    console.log('🔵 MODO: SIMULAÇÃO (dry-run)');
    console.log('   Nenhuma receita será atualizada\n');
  } else {
    console.log('🔴 MODO: EXECUÇÃO REAL');
    console.log('   ⚠️  Receitas serão atualizadas no Firestore!\n');
  }

  if (specificRecipeId) {
    console.log(`🎯 FILTRO: Apenas receita com ID "${specificRecipeId}"\n`);
  }

  console.log('═'.repeat(80));

  // 1. Buscar receitas
  const recipes = await fetchRecipes();

  if (recipes.length === 0) {
    console.log('\n⚠️  Nenhuma receita encontrada!');
    process.exit(0);
  }

  // 2. Mostrar relatório
  showReport(recipes);

  // 3. Se for execução real, pedir confirmação
  if (!isDryRun) {
    console.log('⚠️  ATENÇÃO: Esta ação irá atualizar as receitas no banco!');
    console.log('⚠️  Isso vai forçar o recálculo de pesos, custos, etc.\n');

    const confirmed = await askConfirmation('Tem certeza que deseja atualizar estas receitas?');

    if (!confirmed) {
      console.log('\n❌ Operação cancelada pelo usuário.');
      process.exit(0);
    }

    // 4. Atualizar receitas
    await updateRecipes(recipes);
  }

  console.log('\n✅ Processo concluído!');
  process.exit(0);
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
