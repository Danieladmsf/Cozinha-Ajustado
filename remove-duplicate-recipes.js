import { Recipe } from './app/api/entities.js';

async function removeDuplicateRecipes() {
  try {
    console.log('🔍 Carregando todos os registros da coleção Recipe...');
    
    // Buscar todos os registros de Recipe
    const allRecipes = await Recipe.getAll();
    console.log(`📊 Total de receitas encontradas: ${allRecipes.length}`);
    
    if (allRecipes.length === 0) {
      console.log('❌ Nenhuma receita encontrada na coleção.');
      return;
    }
    
    // Mapear receitas por nome (case insensitive)
    const recipesByName = new Map();
    
    for (const recipe of allRecipes) {
      if (!recipe.name) {
        console.log(`⚠️  Receita sem nome encontrada: ${recipe.id}`);
        continue;
      }
      
      const normalizedName = recipe.name.toLowerCase().trim();
      
      if (!recipesByName.has(normalizedName)) {
        recipesByName.set(normalizedName, []);
      }
      
      recipesByName.get(normalizedName).push(recipe);
    }
    
    console.log(`📋 Nomes únicos encontrados: ${recipesByName.size}`);
    
    // Identificar duplicatas
    const duplicateGroups = [];
    let totalDuplicates = 0;
    
    for (const [name, recipes] of recipesByName.entries()) {
      if (recipes.length > 1) {
        duplicateGroups.push({ name, recipes });
        totalDuplicates += recipes.length - 1; // -1 porque vamos manter o primeiro
      }
    }
    
    console.log(`🔄 Grupos com duplicatas: ${duplicateGroups.length}`);
    console.log(`❌ Total de registros duplicados a serem removidos: ${totalDuplicates}`);
    
    if (duplicateGroups.length === 0) {
      console.log('✅ Nenhuma duplicata encontrada!');
      return;
    }
    
    // Mostrar duplicatas encontradas
    console.log('\n📝 DUPLICATAS ENCONTRADAS:');
    for (const group of duplicateGroups) {
      console.log(`\n🍽️  Nome: "${group.name}"`);
      console.log(`   Registros (${group.recipes.length}):`);
      for (const recipe of group.recipes) {
        console.log(`   - ID: ${recipe.id} | Criado: ${recipe.createdAt || 'N/A'} | Ativo: ${recipe.active !== false ? 'Sim' : 'Não'}`);
      }
    }
    
    // Confirmar antes de deletar
    console.log('\n⚠️  ATENÇÃO: Este script irá deletar os registros duplicados, mantendo apenas o primeiro de cada grupo.');
    console.log('💾 Recomenda-se fazer backup antes de continuar.');
    
    // Para execução automática, definir como true
    const AUTO_EXECUTE = true;
    
    if (!AUTO_EXECUTE) {
      console.log('🛑 Execução pausada. Defina AUTO_EXECUTE = true para executar a remoção.');
      return;
    }
    
    console.log('\n🗑️  Iniciando remoção de duplicatas...');
    let deletedCount = 0;
    
    for (const group of duplicateGroups) {
      const recipes = group.recipes;
      
      // Ordenar por data de criação (mais antigo primeiro) ou por ID se não houver data
      recipes.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }
        return a.id.localeCompare(b.id);
      });
      
      const keepRecipe = recipes[0];
      const toDelete = recipes.slice(1);
      
      console.log(`\n🍽️  Processando "${group.name}":`);
      console.log(`   ✅ Mantendo: ${keepRecipe.id}`);
      
      for (const recipe of toDelete) {
        try {
          await Recipe.delete(recipe.id);
          console.log(`   ❌ Deletado: ${recipe.id}`);
          deletedCount++;
        } catch (error) {
          console.error(`   ⚠️  Erro ao deletar ${recipe.id}:`, error.message);
        }
      }
    }
    
    console.log(`\n✅ Processo concluído!`);
    console.log(`📊 Registros deletados: ${deletedCount}`);
    console.log(`📊 Registros mantidos: ${duplicateGroups.length}`);
    console.log(`📊 Total de receitas únicas: ${recipesByName.size}`);
    
  } catch (error) {
    console.error('❌ Erro durante o processo:', error);
    throw error;
  }
}

// Executar o script
if (import.meta.url === `file://${process.argv[1]}`) {
  removeDuplicateRecipes()
    .then(() => {
      console.log('🎉 Script finalizado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script finalizado com erro:', error);
      process.exit(1);
    });
}

export { removeDuplicateRecipes };