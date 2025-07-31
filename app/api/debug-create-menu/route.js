import { NextResponse } from 'next/server';
import { WeeklyMenu, Recipe } from '../entities.js';

export async function POST() {
  try {
    console.log('🔄 [API] Iniciando criação de cardápio de teste...');
    
    // Carregar receitas existentes
    console.log('🔄 [API] Carregando receitas...');
    const recipes = await Recipe.list();
    console.log(`✅ [API] ${recipes.length} receitas encontradas`);
    
    if (recipes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma receita encontrada. Impossível criar cardápio.'
      }, { status: 400 });
    }

    // Verificar se já existe cardápio para semana 31/2025
    const existingMenus = await WeeklyMenu.query([
      { field: 'week_number', operator: '==', value: 31 },
      { field: 'year', operator: '==', value: 2025 }
    ]);
    
    if (existingMenus.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cardápio para semana 31/2025 já existe',
        existing: existingMenus[0]
      }, { status: 400 });
    }
    
    // Criar estrutura do cardápio usando todas as receitas
    const menuData = {};
    
    // Distribuir receitas pelos dias da semana
    for (let day = 1; day <= 5; day++) {
      menuData[day] = {};
      
      // Agrupar receitas por categoria (ou usar categoria padrão)
      const recipesByCategory = {};
      
      recipes.forEach(recipe => {
        const category = recipe.category || 'principal';
        if (!recipesByCategory[category]) {
          recipesByCategory[category] = [];
        }
        recipesByCategory[category].push({
          recipe_id: recipe.id,
          locations: [] // Disponível para todos os clientes
        });
      });
      
      menuData[day] = recipesByCategory;
    }

    // Criar o cardápio
    const weeklyMenuData = {
      week_number: 31,
      year: 2025,
      status: 'active',
      menu_data: menuData,
      created_by: 'debug-api',
      notes: 'Cardápio de teste criado automaticamente via API',
      title: 'Cardápio Semana 31/2025 - Teste'
    };

    console.log('🔄 [API] Criando cardápio...');
    const newMenu = await WeeklyMenu.create(weeklyMenuData);
    console.log('✅ [API] Cardápio criado:', newMenu.id);
    
    return NextResponse.json({
      success: true,
      message: 'Cardápio criado com sucesso!',
      menu: {
        id: newMenu.id,
        week_number: newMenu.week_number,
        year: newMenu.year,
        recipes_used: recipes.length,
        days_populated: Object.keys(menuData).length
      }
    });
    
  } catch (error) {
    console.error('❌ [API] Erro ao criar cardápio:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Listar todos os cardápios existentes
    const allMenus = await WeeklyMenu.list();
    const recipes = await Recipe.list();
    
    return NextResponse.json({
      total_menus: allMenus.length,
      total_recipes: recipes.length,
      menus: allMenus.map(menu => ({
        id: menu.id,
        week_number: menu.week_number,
        year: menu.year,
        status: menu.status,
        created_by: menu.created_by
      })),
      recipes: recipes.map(recipe => ({
        id: recipe.id,
        name: recipe.name,
        category: recipe.category,
        active: recipe.active
      }))
    });
    
  } catch (error) {
    console.error('❌ [API] Erro ao listar dados:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}