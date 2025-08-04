import { Ingredient } from '@/app/api/entities';
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
    console.error('[API] Error getting ingredients:', error);
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
    console.error('[API] Error creating ingredient:', error);
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
    
    if (!id) {
      return NextResponse.json(
        { error: 'Ingredient ID is required' },
        { status: 400 }
      );
    }
    
    const ingredientData = await request.json();
    
    const updatedIngredient = await Ingredient.update(id, ingredientData);
    
    return NextResponse.json(updatedIngredient);
    
  } catch (error) {
    console.error('[API] Error updating ingredient:', error);
    return NextResponse.json(
      { error: 'Failed to update ingredient', details: error.message },
      { status: 500 }
    );
  }
}
