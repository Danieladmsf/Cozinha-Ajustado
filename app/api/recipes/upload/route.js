import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// =================== INICIALIZAÇÃO DO FIREBASE ADMIN ===================
// Garante que o app Firebase só seja inicializado uma vez.
try {
  if (!admin.apps.length) {
    // As credenciais são buscadas automaticamente das variáveis de ambiente
    // (GOOGLE_APPLICATION_CREDENTIALS) quando em produção/servidor.
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } 
} catch (error) {
  console.error('Firebase Admin initialization error', error.stack);
}

const db = admin.firestore();

// =================== LÓGICA DE IMPORTAÇÃO (Adaptada do Script) ===================

async function findIngredientByName(ingredientName) {
  const ingredientsRef = db.collection('ingredients');
  const snapshot = await ingredientsRef.where('name', '==', ingredientName).limit(1).get();
  
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return null;
}

function buildFirestoreRecipeObject(simpleRecipe, matchedIngredients) {
  const recipeObject = {
    name: simpleRecipe.nome,
    category: simpleRecipe.categoria || 'Não categorizado',
    prep_time: simpleRecipe.tempo_preparo_min || 30,
    instructions: simpleRecipe.instrucoes_gerais || '',
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
        ...matchedIng,
        ingredient_id: matchedIng.id,
        id: `${matchedIng.id}_${Date.now()}`,
        weight_raw: ing.peso_bruto_kg ? String(ing.peso_bruto_kg).replace('.', ',') : '0',
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

// =================== HANDLER DA ROTA DE API ===================

export async function POST(request) {
  try {
    const body = await request.json();
    const simpleRecipes = body.recipes;

    if (!simpleRecipes || !Array.isArray(simpleRecipes) || simpleRecipes.length === 0) {
      return NextResponse.json({ message: 'Nenhuma receita válida encontrada no arquivo.' }, { status: 400 });
    }

    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    for (const recipe of simpleRecipes) {
      const ingredientsToFind = recipe.preparacoes.flatMap(p => p.ingredientes.map(i => i.nome));
      const uniqueIngredients = [...new Set(ingredientsToFind)];
      const matchedIngredients = [];
      let allIngredientsFound = true;

      for (const ingredientName of uniqueIngredients) {
        const found = await findIngredientByName(ingredientName);
        if (found) {
          matchedIngredients.push(found);
        } else {
          allIngredientsFound = false;
          errors.push(`Receita "${recipe.nome}" falhou: Ingrediente "${ingredientName}" não encontrado.`);
          break;
        }
      }

      if (allIngredientsFound) {
        const firestoreRecipe = buildFirestoreRecipeObject(recipe, matchedIngredients);
        await db.collection('recipes').add(firestoreRecipe);
        successCount++;
      } else {
        failureCount++;
      }
    }

    if (successCount > 0) {
        return NextResponse.json({
            message: `${successCount} de ${simpleRecipes.length} receitas importadas com sucesso!`,
            errors: errors
        }, { status: 200 });
    } else {
        return NextResponse.json({
            message: 'Falha na importação. Verifique os erros.',
            errors: errors
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Erro na API de upload:', error);
    return NextResponse.json({ message: 'Ocorreu um erro interno no servidor.', error: error.message }, { status: 500 });
  }
}
