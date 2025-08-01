import { User } from '@/app/api/entities';
import { NextResponse } from 'next/server';

// GET /api/user - Buscar dados do usuário
export async function GET(request) {
  try {
    
    const userData = await User.getMyUserData();
    
    
    return NextResponse.json(userData || {});
    
  } catch (error) {
    console.error('[API] Error getting user data:', error);
    return NextResponse.json(
      { error: 'Failed to get user data', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/user - Atualizar dados do usuário
export async function PUT(request) {
  try {
    const userData = await request.json();
    
    const result = await User.updateMyUserData(userData);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] Error updating user data:', error);
    return NextResponse.json(
      { error: 'Failed to update user data', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/user/config - Salvar configuração específica
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    if (type === 'recipe-config') {
      const configData = await request.json();
      
      const result = await User.updateMyUserData({
        recipe_config: configData
      });
      
      return NextResponse.json(result);
    }
    
    return NextResponse.json(
      { error: 'Invalid config type' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('[API] Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save config', details: error.message },
      { status: 500 }
    );
  }
}