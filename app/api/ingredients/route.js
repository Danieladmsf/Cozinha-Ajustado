import { Ingredient, Recipe } from '@/app/api/entities';
import { RecipeCalculator } from '@/lib/recipeCalculator';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { isValidId } from '@/lib/validators';

// GET /api/ingredients - Buscar ingredientes
export async function GET(request) {
  try {

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const active = searchParams.get('active');

    // Se um ID foi fornecido, buscar apenas esse ingrediente
    if (id) {
      logger.debug('Buscando ingrediente por ID:', id);
      const ingredient = await Ingredient.getById(id);

      if (!ingredient) {
        logger.warn('Ingrediente não encontrado:', id);
        return NextResponse.json(
          { error: 'Ingredient not found', details: `Ingrediente com ID ${id} não existe` },
          { status: 404 }
        );
      }

      logger.debug('Ingrediente encontrado:', ingredient.name);
      return NextResponse.json(ingredient);
    }

    let ingredients = await Ingredient.getAll();

    // Lista de IDs antigos problemáticos que devem ser ignorados
    const BLACKLISTED_IDS = [
      '684bfe20b60fe3a1a47dfce7', '684bfe28943203651ae5a922',
      '684bfe2b60647d247b5533be', '684bfe32767c7d82725a74d5',
      '684bfe39ce1a5c4bb28d47a2', '684bfe3cce1a5c4bb28d47bc',
      '684bfe3cfede6d0d2bb1ef16', '684bfe3d8e7a40c69f0fe67e',
      '684bfe40ce1a5c4bb28d47d9', '684bfe3760647d247b5533f5'
    ];

    // Filtrar IDs problemáticos
    ingredients = ingredients.filter(ing => !BLACKLISTED_IDS.includes(ing.id));

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
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validar ID usando função centralizada
    if (!isValidId(id)) {
      logger.error('ID do ingrediente inválido:', id);
      return NextResponse.json(
        { error: 'Ingredient ID is required and must be valid' },
        { status: 400 }
      );
    }

    const ingredientData = await request.json();
    logger.debug('Atualizando ingrediente:', id);

    // Verificar se o ingrediente existe antes de tentar atualizar
    const existingIngredient = await Ingredient.getById(id);

    if (!existingIngredient) {
      logger.warn('Ingrediente não encontrado para atualização:', id);
      return NextResponse.json(
        { error: 'Ingredient not found', details: `Ingrediente com ID ${id} não existe no banco de dados` },
        { status: 404 }
      );
    }

    const updatedIngredient = await Ingredient.update(id, ingredientData);
    logger.debug('Ingrediente atualizado:', updatedIngredient.name);

    // Se o preço foi atualizado, propaga a mudança para as receitas
    if (ingredientData.current_price !== undefined) {
      logger.info('Propagando atualização de preço para receitas');

      const allRecipes = await Recipe.getAll();
      const affectedRecipes = allRecipes.filter(recipe =>
        recipe.preparations?.some(prep =>
          prep.ingredients?.some(ing => ing.id?.startsWith(id))
        )
      );

      logger.debug(`${affectedRecipes.length} receitas afetadas encontradas`);

      if (affectedRecipes.length > 0) {
        await Promise.all(affectedRecipes.map(async (recipe) => {
          let needsUpdate = false;
          recipe.preparations.forEach(prep => {
            prep.ingredients?.forEach(ing => {
              if (ing.id?.startsWith(id)) {
                ing.current_price = updatedIngredient.current_price;
                ing.raw_price_kg = updatedIngredient.raw_price_kg;
                needsUpdate = true;
              }
            });
          });

          if (needsUpdate) {
            const updatedMetrics = RecipeCalculator.calculateRecipeMetrics(recipe.preparations, recipe);
            const finalUpdatedRecipe = {
              ...recipe,
              ...updatedMetrics
            };
            await Recipe.update(recipe.id, finalUpdatedRecipe);
            logger.debug(`Receita ${recipe.name} atualizada`);
          }
        }));
      }
    }

    return NextResponse.json(updatedIngredient);

  } catch (error) {
    logger.error('Erro ao atualizar ingrediente:', error);
    return NextResponse.json(
      { error: 'Failed to update ingredient', details: error.message },
      { status: 500 }
    );
  }
}