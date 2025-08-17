/**
 * Script para extrair receitas do banco de dados
 * Substitui o arquivo recipes_readable que foi apagado
 */

import { Recipe } from '../app/api/entities.js';
import fs from 'fs';
import path from 'path';

async function extractRecipes() {
  try {
    console.log('🔍 Extraindo receitas do banco de dados...');
    
    // Buscar todas as receitas
    const recipes = await Recipe.getAll();
    
    console.log(`📊 Encontradas ${recipes.length} receitas`);
    
    // Formatar dados de forma legível
    const readableData = recipes.map((recipe, index) => ({
      index: index + 1,
      id: recipe.id,
      name: recipe.name,
      category: recipe.category,
      cuba_weight: recipe.cuba_weight,
      weight_field_name: recipe.weight_field_name,
      total_weight: recipe.total_weight,
      yield_weight: recipe.yield_weight,
      total_cost: recipe.total_cost,
      cost_per_kg_raw: recipe.cost_per_kg_raw,
      cost_per_kg_yield: recipe.cost_per_kg_yield,
      prep_time: recipe.prep_time,
      active: recipe.active,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      // Dados completos para análise
      ...recipe
    }));
    
    // Gerar timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recipes_readable_${timestamp}.txt`;
    const filepath = path.join('./SCRIPTS', filename);
    
    // Criar diretório se não existir
    if (!fs.existsSync('./SCRIPTS')) {
      fs.mkdirSync('./SCRIPTS', { recursive: true });
    }
    
    // Salvar arquivo
    const content = JSON.stringify(readableData, null, 2);
    fs.writeFileSync(filepath, content, 'utf8');
    
    console.log(`✅ Arquivo salvo: ${filepath}`);
    console.log(`📋 Total de receitas extraídas: ${recipes.length}`);
    
    // Estatísticas rápidas
    const withCubaWeight = recipes.filter(r => r.cuba_weight && r.cuba_weight > 0).length;
    const byCategory = {};
    recipes.forEach(r => {
      if (r.category) {
        byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      }
    });
    
    console.log(`📊 Receitas com peso da cuba: ${withCubaWeight}`);
    console.log('📈 Por categoria:', byCategory);
    
    return filepath;
    
  } catch (error) {
    console.error('❌ Erro ao extrair receitas:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  extractRecipes()
    .then(filepath => {
      console.log(`🎉 Extração concluída: ${filepath}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Falha na extração:', error);
      process.exit(1);
    });
}

export default extractRecipes;