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
      console.log(`[API] Getting recipe by ID: ${id}`);
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
      console.log('[API] Getting all recipes');
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
    
    console.log('[API] Creating new recipe');
    console.log('[API] Data received:', data);
    console.log('[API] name_complement:', data.name_complement);
    
    // Create new recipe
    const savedRecipe = await Recipe.create(data);
    
    console.log('[API] Recipe created successfully:', savedRecipe.id);
    console.log('[API] name_complement saved:', savedRecipe.name_complement);
    
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
    
    console.log(`[API] Updating recipe ${id}`);
    console.log('[API] Data received:', data);
    console.log('[API] name_complement:', data.name_complement);
    
    // Update recipe
    const updatedRecipe = await Recipe.update(id, data);
    
    console.log('[API] Recipe updated successfully');
    console.log('[API] name_complement updated:', updatedRecipe.name_complement);
    
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
    
    console.log(`[API] Deleting recipe ${id}`);
    
    // Delete recipe
    await Recipe.delete(id);
    
    console.log('[API] Recipe deleted successfully');
    
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