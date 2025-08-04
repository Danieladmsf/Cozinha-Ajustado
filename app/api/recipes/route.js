/**
 * API ROUTE FOR RECIPE CRUD OPERATIONS
 * Handles frontend requests for recipe management
 */

import { Recipe } from '../entities.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
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
      const recipes = await Recipe.getAll();
      
      return Response.json({ 
        success: true, 
        data: recipes 
      });
    }
  } catch (error) {
    console.error('[API] Error in GET /api/recipes:', error);
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
    console.error('[API] Error in POST /api/recipes:', error);
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
    console.error('[API] Error in PUT /api/recipes:', error);
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
    console.error('[API] Error in DELETE /api/recipes:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}