import { Ingredient, Recipe, User } from '../entities';
import { NextResponse } from 'next/server';

// Dados de exemplo para ingredientes
const SAMPLE_INGREDIENTS = [
  {
    name: 'Carne Bovina (Maminha)',
    brand: 'Frigorífico Nacional',
    category: 'Carnes',
    unit: 'kg',
    current_price: 35.90,
    active: true,
    yield_percentage: 75
  },
  {
    name: 'Cebola',
    brand: 'Hortifruti',
    category: 'Legumes',
    unit: 'kg',
    current_price: 4.50,
    active: true,
    yield_percentage: 85
  },
  {
    name: 'Alho',
    brand: 'Hortifruti',
    category: 'Temperos',
    unit: 'kg',
    current_price: 18.00,
    active: true,
    yield_percentage: 90
  },
  {
    name: 'Azeite Extra Virgem',
    brand: 'Gallo',
    category: 'Óleos',
    unit: 'L',
    current_price: 12.90,
    active: true,
    yield_percentage: 100
  },
  {
    name: 'Sal Refinado',
    brand: 'Cisne',
    category: 'Temperos',
    unit: 'kg',
    current_price: 2.50,
    active: true,
    yield_percentage: 100
  },
  {
    name: 'Pimenta do Reino',
    brand: 'Kitano',
    category: 'Temperos',
    unit: 'g',
    current_price: 0.08,
    active: true,
    yield_percentage: 100
  },
  {
    name: 'Vinho Tinto Seco',
    brand: 'Casa Valduga',
    category: 'Bebidas',
    unit: 'ml',
    current_price: 0.025,
    active: true,
    yield_percentage: 100
  },
  {
    name: 'Caldo de Carne',
    brand: 'Knorr',
    category: 'Caldos',
    unit: 'ml',
    current_price: 0.006,
    active: true,
    yield_percentage: 100
  },
  {
    name: 'Tomate',
    brand: 'Hortifruti',
    category: 'Legumes',
    unit: 'kg',
    current_price: 5.80,
    active: true,
    yield_percentage: 80
  },
  {
    name: 'Batata',
    brand: 'Hortifruti',
    category: 'Tubérculos',
    unit: 'kg',
    current_price: 3.20,
    active: true,
    yield_percentage: 85
  }
];

// Dados de exemplo para receitas
const SAMPLE_RECIPES = [
  {
    name: 'Lagarto ao Molho Madeira',
    name_complement: 'Receita Tradicional',
    category: 'Carnes',
    prep_time: 180,
    cuba_weight: 5.0,
    instructions: 'Tempere a carne com sal e pimenta. Sele em fogo alto com azeite. Adicione os temperos e o vinho. Cozinhe em fogo baixo por 2 horas.',
    cost_per_kg_yield: 0,
    total_weight: 0,
    portions: 8
  },
  {
    name: 'Batata Rosti',
    name_complement: 'Acompanhamento Clássico',
    category: 'Acompanhamentos',
    prep_time: 45,
    cuba_weight: 2.0,
    instructions: 'Rale as batatas cruas. Tempere com sal. Forme discos e frite até dourar.',
    cost_per_kg_yield: 0,
    total_weight: 0,
    portions: 6
  },
  {
    name: 'Molho de Tomate Caseiro',
    name_complement: 'Base para Massas',
    category: 'Molhos',
    prep_time: 60,
    cuba_weight: 1.5,
    instructions: 'Refogue cebola e alho. Adicione tomates picados. Tempere e cozinhe até encorpar.',
    cost_per_kg_yield: 0,
    total_weight: 0,
    portions: 4
  }
];

// POST /api/populate - Popular banco de dados
export async function POST(request) {
  try {
    
    const results = {
      ingredients: [],
      recipes: [],
      user: null,
      errors: []
    };

    // 1. Criar usuário mock
    try {
      const mockUser = {
        email: 'dev@cozinhaafeto.com',
        displayName: 'Usuário de Desenvolvimento',
        photoURL: null,
        preferences: {
          theme: 'light',
          notifications: true
        }
      };
      
      const created = await User.createWithId('mock-user-id', mockUser);
      results.user = created;
    } catch (error) {
      if (error.message.includes('already exists')) {
        results.user = { id: 'mock-user-id', status: 'already_exists' };
      } else {
        results.errors.push(`Erro ao criar usuário: ${error.message}`);
      }
    }

    // 2. Popular ingredientes
    for (const ingredient of SAMPLE_INGREDIENTS) {
      try {
        const created = await Ingredient.create(ingredient);
        results.ingredients.push(created);
      } catch (error) {
        results.errors.push(`Erro ao criar ingrediente ${ingredient.name}: ${error.message}`);
      }
    }

    // 3. Popular receitas
    for (const recipe of SAMPLE_RECIPES) {
      try {
        const created = await Recipe.create(recipe);
        results.recipes.push(created);
      } catch (error) {
        results.errors.push(`Erro ao criar receita ${recipe.name}: ${error.message}`);
      }
    }


    return NextResponse.json({
      success: true,
      message: 'Banco de dados populado com sucesso!',
      results
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to populate database', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/populate - Status da população
export async function GET(request) {
  try {
    const ingredientsCount = (await Ingredient.getAll()).length;
    const recipesCount = (await Recipe.getAll()).length;
    
    return NextResponse.json({
      status: 'ready',
      counts: {
        ingredients: ingredientsCount,
        recipes: recipesCount
      },
      populated: ingredientsCount > 0 || recipesCount > 0
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check population status', details: error.message },
      { status: 500 }
    );
  }
}