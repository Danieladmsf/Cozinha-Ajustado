// Script para criar um cardápio de teste
import { WeeklyMenu, Recipe } from './app/api/entities.js';

async function createTestMenu() {
  try {
    console.log('🔄 Carregando receitas...');
    const recipes = await Recipe.list();
    console.log(`✅ ${recipes.length} receitas encontradas`);
    
    if (recipes.length === 0) {
      console.log('❌ Nenhuma receita encontrada. Impossível criar cardápio.');
      return;
    }
    
    // Usar as receitas existentes para criar o cardápio
    const menuData = {
      1: { // Segunda-feira
        "categoria-1": recipes.slice(0, 2).map(recipe => ({
          recipe_id: recipe.id,
          locations: [] // Disponível para todos os clientes
        }))
      },
      2: { // Terça-feira
        "categoria-1": recipes.slice(2, 4).map(recipe => ({
          recipe_id: recipe.id,
          locations: [] // Disponível para todos os clientes
        }))
      },
      3: { // Quarta-feira
        "categoria-1": recipes.slice(0, 3).map(recipe => ({
          recipe_id: recipe.id,
          locations: [] // Disponível para todos os clientes
        }))
      },
      4: { // Quinta-feira
        "categoria-1": recipes.slice(1, 4).map(recipe => ({
          recipe_id: recipe.id,
          locations: [] // Disponível para todos os clientes
        }))
      },
      5: { // Sexta-feira
        "categoria-1": recipes.slice(0, 2).map(recipe => ({
          recipe_id: recipe.id,
          locations: [] // Disponível para todos os clientes
        }))
      }
    };

    const weeklyMenuData = {
      week_number: 31,
      year: 2025,
      status: 'active',
      menu_data: menuData,
      created_by: 'debug-script',
      notes: 'Cardápio de teste criado automaticamente'
    };

    console.log('🔄 Criando cardápio da semana 31/2025...');
    const newMenu = await WeeklyMenu.create(weeklyMenuData);
    console.log('✅ Cardápio criado com sucesso!', newMenu.id);
    console.log('📅 Dados do cardápio:', newMenu);
    
  } catch (error) {
    console.error('❌ Erro ao criar cardápio:', error);
  }
}

createTestMenu();