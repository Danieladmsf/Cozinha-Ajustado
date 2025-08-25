const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// ============== INICIALIZAÇÃO DO FIREBASE ===============
// O script assume que você está executando em um ambiente
// onde as credenciais do Firebase são descobertas automaticamente
// (ex: Google Cloud, ou com a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS)

try {
  admin.initializeApp();
} catch (e) {
  if (e.code !== 'app/duplicate-app') {
    console.error('Erro na inicialização do Firebase Admin:', e);
    process.exit(1);
  }
}

const db = admin.firestore();

// =================== FUNÇÕES AUXILIARES ===================

/**
 * Busca um ingrediente no banco de dados pelo nome.
 * @param {string} ingredientName - O nome do ingrediente a ser buscado.
 * @returns {Promise<Object|null>} - O documento do ingrediente ou null se não for encontrado.
 */
async function findIngredientByName(ingredientName) {
  const ingredientsRef = db.collection('ingredients');
  // Tenta buscar pelo nome exato, ignorando maiúsculas/minúsculas com um truque
  const snapshot = await ingredientsRef.where('name', '==', ingredientName).get();
  
  if (!snapshot.empty) {
    // Retorna o primeiro encontrado
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  
  // Fallback: tenta buscar com variações de capitalização (mais lento)
  const allIngredientsSnapshot = await ingredientsRef.get();
  let foundIngredient = null;
  allIngredientsSnapshot.forEach(doc => {
    if (doc.data().name.toLowerCase() === ingredientName.toLowerCase()) {
      foundIngredient = { id: doc.id, ...doc.data() };
    }
  });

  return foundIngredient;
}

/**
 * Transforma o JSON simples da receita para o formato complexo do Firestore.
 * @param {Object} simpleRecipe - A receita no formato simplificado.
 * @param {Array<Object>} matchedIngredients - A lista de ingredientes encontrados no DB.
 * @returns {Object} - O objeto da receita pronto para ser salvo no Firestore.
 */
function buildFirestoreRecipeObject(simpleRecipe, matchedIngredients) {
  console.log(`   Construindo objeto da receita para: "${simpleRecipe.nome}"`);
  const recipeObject = {
    name: simpleRecipe.nome,
    category: simpleRecipe.categoria || 'Não categorizado',
    prep_time: simpleRecipe.tempo_preparo_min || 30,
    instructions: simpleRecipe.instrucoes_gerais || '',
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    // Campos calculados podem ser inicializados como 0 ou calculados posteriormente
    total_cost: 0,
    total_weight: 0,
    yield_weight: 0,
    cost_per_kg_raw: 0,
    cost_per_kg_yield: 0,
    cuba_cost: 0,
    preparations: []
  };

  recipeObject.preparations = simpleRecipe.preparacoes.map((prep, index) => {
    const firestorePrep = {
      id: `${Date.now()}_${index}`,
      title: prep.titulo,
      instructions: prep.instrucoes || '',
      processes: prep.processos || ['cooking'],
      ingredients: [],
      sub_components: []
    };

    firestorePrep.ingredients = prep.ingredientes.map(ing => {
      const matchedIng = matchedIngredients.find(mi => mi.name.toLowerCase() === ing.nome.toLowerCase());
      return {
        ...matchedIng, // Espalha todos os dados do ingrediente do DB
        ingredient_id: matchedIng.id,
        id: `${matchedIng.id}_${Date.now()}`, // ID único para esta instância na receita
        // Adiciona os pesos do arquivo de upload
        weight_raw: ing.peso_bruto_kg ? String(ing.peso_bruto_kg).replace('.', ',') : '0',
        // Zera outros campos de peso que seriam preenchidos na Ficha Técnica
        weight_frozen: '',
        weight_thawed: '',
        weight_clean: '',
        weight_pre_cooking: '',
        weight_cooked: '',
        weight_portioned: ''
      };
    });

    return firestorePrep;
  });

  return recipeObject;
}

// =================== FUNÇÃO PRINCIPAL ===================

async function uploadRecipes(filePath) {
  console.log(`
🚀 Iniciando script de upload de receitas.`);
  console.log(`Lendo arquivo: ${filePath}\n`);

  let simpleRecipes;
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    simpleRecipes = JSON.parse(fileContent);
  } catch (error) {
    console.error(`❌ Erro ao ler ou parsear o arquivo JSON: ${error.message}`);
    return;
  }

  console.log(`Encontradas ${simpleRecipes.length} receitas no arquivo.\n`);

  for (const recipe of simpleRecipes) {
    console.log(`--------------------------------------------------`);
    console.log(`🔥 Processando receita: "${recipe.nome}"`);
    const ingredientsToFind = recipe.preparacoes.flatMap(p => p.ingredientes.map(i => i.nome));
    const uniqueIngredients = [...new Set(ingredientsToFind)];
    
    console.log(`   Necessita de ${uniqueIngredients.length} ingredientes únicos...`);

    let allIngredientsFound = true;
    const matchedIngredients = [];

    for (const ingredientName of uniqueIngredients) {
      const found = await findIngredientByName(ingredientName);
      if (found) {
        console.log(`   ✅ Encontrado: ${ingredientName} (ID: ${found.id})`);
        matchedIngredients.push(found);
      } else {
        console.log(`   ❌ NÃO ENCONTRADO: ${ingredientName}`);
        allIngredientsFound = false;
        break; // Interrompe o processo para esta receita
      }
    }

    if (allIngredientsFound) {
      console.log(`   👍 Todos os ingredientes foram encontrados!`);
      const firestoreRecipe = buildFirestoreRecipeObject(recipe, matchedIngredients);
      
      try {
        const docRef = await db.collection('recipes').add(firestoreRecipe);
        console.log(`   🎉 Receita "${recipe.nome}" salva com sucesso no banco de dados! ID: ${docRef.id}`);
      } catch (error) {
        console.error(`   💥 Erro ao salvar a receita "${recipe.nome}" no Firestore:`, error);
      }
    } else {
      console.log(`   ⚠️ Receita "${recipe.nome}" ignorada por falta de ingredientes.`);
    }
    console.log(`--------------------------------------------------\n`);
  }

  console.log('✅ Script finalizado.');
}

// =================== EXECUÇÃO DO SCRIPT ===================

const filePath = process.argv[2];

if (!filePath) {
  console.error('Por favor, forneça o caminho para o arquivo JSON como argumento.');
  console.error('Exemplo: node SCRIPTS/uploadReceitas.js caminho/para/receitas.json');
  process.exit(1);
}

uploadRecipes(path.resolve(filePath));
