/**
 * Script para extrair ingredientes do banco de dados
 * Baseado na mesma lógica do extract-recipes.js
 */

import { Ingredient } from '../app/api/entities.js';
import fs from 'fs';
import path from 'path';

async function extractIngredients() {
  try {
    console.log('🔍 Extraindo ingredientes do banco de dados...');
    
    // Buscar todos os ingredientes
    const ingredients = await Ingredient.getAll();
    
    console.log(`📊 Encontrados ${ingredients.length} ingredientes`);
    
    // Formatar dados de forma legível
    const readableData = ingredients.map((ingredient, index) => ({
      index: index + 1,
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      cost_per_unit: ingredient.cost_per_unit,
      density: ingredient.density,
      conversion_factor: ingredient.conversion_factor,
      supplier: ingredient.supplier,
      active: ingredient.active,
      createdAt: ingredient.createdAt,
      updatedAt: ingredient.updatedAt,
      // Dados completos para análise
      ...ingredient
    }));
    
    // Gerar timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ingredients_readable_${timestamp}.txt`;
    const filepath = path.join('./SCRIPTS', filename);
    
    // Criar diretório se não existir
    if (!fs.existsSync('./SCRIPTS')) {
      fs.mkdirSync('./SCRIPTS', { recursive: true });
    }
    
    // Salvar arquivo
    const content = JSON.stringify(readableData, null, 2);
    fs.writeFileSync(filepath, content, 'utf8');
    
    console.log(`✅ Arquivo salvo: ${filepath}`);
    console.log(`📋 Total de ingredientes extraídos: ${ingredients.length}`);
    
    // Estatísticas rápidas
    const withCost = ingredients.filter(i => i.cost_per_unit && i.cost_per_unit > 0).length;
    const withDensity = ingredients.filter(i => i.density && i.density > 0).length;
    const byCategory = {};
    const byUnit = {};
    
    ingredients.forEach(i => {
      if (i.category) {
        byCategory[i.category] = (byCategory[i.category] || 0) + 1;
      }
      if (i.unit) {
        byUnit[i.unit] = (byUnit[i.unit] || 0) + 1;
      }
    });
    
    console.log(`💰 Ingredientes com custo: ${withCost}`);
    console.log(`⚖️ Ingredientes com densidade: ${withDensity}`);
    console.log('📈 Por categoria:', byCategory);
    console.log('📏 Por unidade:', byUnit);
    
    return filepath;
    
  } catch (error) {
    console.error('❌ Erro ao extrair ingredientes:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  extractIngredients()
    .then(filepath => {
      console.log(`🎉 Extração concluída: ${filepath}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Falha na extração:', error);
      process.exit(1);
    });
}

export default extractIngredients;