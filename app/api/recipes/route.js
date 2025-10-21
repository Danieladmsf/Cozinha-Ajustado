/**
 * API ROUTE FOR RECIPE CRUD OPERATIONS
 * Handles frontend requests for recipe management
 */

import { Recipe } from '../entities.js';

// Função para remover acentos e normalizar string
function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const excludeId = searchParams.get('excludeId');
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const validOnly = searchParams.get('validOnly') === 'true';

    if (id) {
      // Get single recipe by ID
      const recipe = await Recipe.getById(id);

      if (!recipe) {
        return Response.json({
          success: false,
          error: 'Recipe not found'
        }, { status: 404 });
      }

      return Response.json({
        success: true,
        data: recipe
      });
    } else {
      // Get all recipes
      let recipes = await Recipe.getAll();

      // Aplicar filtros se fornecidos
      if (search || excludeId || activeOnly || validOnly) {
        recipes = recipes.filter(recipe => {
          // Excluir receita específica (para evitar recursão)
          if (excludeId && recipe.id === excludeId) {
            return false;
          }

          // Filtrar apenas receitas ativas
          if (activeOnly && recipe.active === false) {
            return false;
          }

          // Filtrar apenas receitas com métricas válidas
          if (validOnly) {
            const hasValidMetrics =
              recipe.yield_weight &&
              parseFloat(recipe.yield_weight) > 0 &&
              recipe.cost_per_kg_yield !== undefined &&
              parseFloat(recipe.cost_per_kg_yield) > 0;

            if (!hasValidMetrics) {
              return false;
            }
          }

          // Busca por termo (nome, categoria ou complemento) - ignorando acentos
          if (search) {
            const term = removeAccents(search.toLowerCase());
            const recipeName = removeAccents(recipe.name?.toLowerCase() || '');
            const recipeCategory = removeAccents(recipe.category?.toLowerCase() || '');
            const recipeComplement = removeAccents(recipe.name_complement?.toLowerCase() || '');

            return recipeName.includes(term) ||
                   recipeCategory.includes(term) ||
                   recipeComplement.includes(term);
          }

          return true;
        });
      }

      return Response.json({
        success: true,
        data: recipes
      });
    }
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    
    // Create new recipe
    const savedRecipe = await Recipe.create(data);
    
    
    return Response.json({ 
      success: true, 
      data: savedRecipe 
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return Response.json({ 
        success: false, 
        error: 'Recipe ID is required' 
      }, { status: 400 });
    }
    
    const data = await request.json();
    
    
    // Update recipe
    const updatedRecipe = await Recipe.update(id, data);
    
    
    return Response.json({ 
      success: true, 
      data: updatedRecipe 
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return Response.json({ 
        success: false, 
        error: 'Recipe ID is required' 
      }, { status: 400 });
    }
    
    
    // Delete recipe
    await Recipe.delete(id);
    
    
    return Response.json({ 
      success: true, 
      message: 'Recipe deleted successfully' 
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}