import { CategoryTree } from '@/app/api/entities';
import { NextResponse } from 'next/server';

// GET /api/category-tree - Buscar categorias da árvore
export async function GET(request) {
  try {
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    let categories = await CategoryTree.getAll();
    
    // Filtrar por tipo se especificado
    if (type) {
      categories = categories.filter(cat => 
        cat.type === type || cat.category_type === type
      );
    }
    
    
    return NextResponse.json(categories);
    
  } catch (error) {
    console.error('[API] Error getting CategoryTree:', error);
    return NextResponse.json(
      { error: 'Failed to get categories', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/category-tree - Criar nova categoria
export async function POST(request) {
  try {
    const categoryData = await request.json();
    
    const newCategory = await CategoryTree.create(categoryData);
    
    return NextResponse.json(newCategory, { status: 201 });
    
  } catch (error) {
    console.error('[API] Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/category-tree?id=... - Atualizar categoria
export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    const categoryData = await request.json();
    
    const updatedCategory = await CategoryTree.update(id, categoryData);
    
    return NextResponse.json(updatedCategory);
    
  } catch (error) {
    console.error('[API] Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category', details: error.message },
      { status: 500 }
    );
  }
}