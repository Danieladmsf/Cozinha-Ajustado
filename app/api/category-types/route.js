import { CategoryType } from '@/app/api/entities';
import { NextResponse } from 'next/server';

// GET /api/category-types - Buscar tipos de categoria
export async function GET(request) {
  try {
    
    const categoryTypes = await CategoryType.getAll();
    
    
    return NextResponse.json(categoryTypes);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get category types', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/category-types - Criar novo tipo de categoria
export async function POST(request) {
  try {
    const typeData = await request.json();
    
    const newType = await CategoryType.create(typeData);
    
    return NextResponse.json(newType, { status: 201 });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create category type', details: error.message },
      { status: 500 }
    );
  }
}