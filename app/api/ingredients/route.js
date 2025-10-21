import { Ingredient, Recipe } from '@/app/api/entities';
import { RecipeCalculator } from '@/lib/recipeCalculator';
import { NextResponse } from 'next/server';

// GET /api/ingredients - Buscar ingredientes
export async function GET(request) {
  try {
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const active = searchParams.get('active');
    
    let ingredients = await Ingredient.getAll();
    
    // Filtrar apenas ativos se especificado
    if (active === 'true') {
      ingredients = ingredients.filter(ing => ing.active !== false);
    }
    
    // Filtrar por busca se especificado
    if (search) {
      const searchTerm = search.toLowerCase();
      ingredients = ingredients.filter(ing => 
        ing.name?.toLowerCase().includes(searchTerm) ||
        ing.brand?.toLowerCase().includes(searchTerm) ||
        ing.category?.toLowerCase().includes(searchTerm)
      );
    }
    
    
    return NextResponse.json(ingredients);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get ingredients', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/ingredients - Criar novo ingrediente
export async function POST(request) {
  try {
    const ingredientData = await request.json();
    
    const newIngredient = await Ingredient.create(ingredientData);
    
    return NextResponse.json(newIngredient, { status: 201 });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create ingredient', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/ingredients?id=... - Atualizar ingrediente
export async function PUT(request) {
  console.log('--- INGREDIENT PUT: INÍCIO DA REQUISIÇÃO ---');
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      console.error('PUT ERROR: ID do ingrediente não fornecido.');
      return NextResponse.json(
        { error: 'Ingredient ID is required' },
        { status: 400 }
      );
    }
    
    const ingredientData = await request.json();
    console.log(`ID do Ingrediente a ser atualizado: ${id}`);
    console.log('Dados recebidos para atualização:', ingredientData);

    // Verificar se o ingrediente existe antes de tentar atualizar
    const existingIngredient = await Ingredient.getById(id);
    if (!existingIngredient) {
      console.error(`PUT ERROR: Ingrediente com ID ${id} não encontrado.`);
      return NextResponse.json(
        { error: 'Ingredient not found' },
        { status: 404 }
      );
    }
    
    const updatedIngredient = await Ingredient.update(id, ingredientData);
    console.log('Ingrediente atualizado no banco:', updatedIngredient);

    // Se o preço foi atualizado, propaga a mudança para as receitas
    if (ingredientData.current_price !== undefined) {
      console.log('Detectada atualização de preço. Iniciando propagação para receitas...');
      
      const allRecipes = await Recipe.getAll();
      console.log(`Total de receitas encontradas: ${allRecipes.length}`);
      
      const affectedRecipes = allRecipes.filter(recipe => 
        recipe.preparations?.some(prep => 
          prep.ingredients?.some(ing => {
            // CORREÇÃO: O ID do ingrediente na receita parece ser um ID composto.
            const match = ing.id?.startsWith(id);
            if (match) {
              console.log(`Encontrado ingrediente correspondente na receita ${recipe.id} (${recipe.name})`);
            }
            return match;
          })
        )
      );
      console.log(`Total de receitas afetadas encontradas: ${affectedRecipes.length}`);

      if (affectedRecipes.length > 0) {
        await Promise.all(affectedRecipes.map(async (recipe) => {
          console.log(`Processando receita afetada: ${recipe.id} (${recipe.name})`);
          let needsUpdate = false;
          recipe.preparations.forEach(prep => {
            prep.ingredients?.forEach(ing => {
              if (ing.id?.startsWith(id)) {
                console.log(`Atualizando preço do ingrediente ${ing.name} dentro da receita ${recipe.id}`);
                ing.current_price = updatedIngredient.current_price;
                ing.raw_price_kg = updatedIngredient.raw_price_kg;
                needsUpdate = true;
              }
            });
          });

          if (needsUpdate) {
            console.log(`Recalculando métricas para a receita ${recipe.id}`);
            const updatedMetrics = RecipeCalculator.calculateRecipeMetrics(recipe.preparations, recipe);
            
            const finalUpdatedRecipe = {
              ...recipe,
              ...updatedMetrics
            };

            await Recipe.update(recipe.id, finalUpdatedRecipe);
            console.log(`Receita ${recipe.id} atualizada com sucesso no banco.`);
          }
        }));
      }
    }
    
    console.log('--- INGREDIENT PUT: FIM DA REQUISIÇÃO ---');
    return NextResponse.json(updatedIngredient);
    
  } catch (error) {
    console.error('--- ERRO FATAL NA API PUT DE INGREDIENTES ---');
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to update ingredient', details: error.message },
      { status: 500 }
    );
  }
}