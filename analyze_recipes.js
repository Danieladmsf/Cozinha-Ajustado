import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc } from "firebase/firestore";
import fs from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyAP_zieVJnXSLSNY8Iv1F7oYETA577r9YY",
  authDomain: "psabordefamilia-2167e.firebaseapp.com",
  databaseURL: "https://psabordefamilia-2167e-default-rtdb.firebaseio.com",
  projectId: "psabordefamilia-2167e",
  storageBucket: "psabordefamilia-2167e.firebasestorage.app",
  messagingSenderId: "372180651336",
  appId: "1:372180651336:web:f7a3a48d99e7db6974b77d"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// IDs das receitas para análise
const recipeIds = [
  'ISQBi666SGiKYPXQVJGL',  // Fraldinha ao Molho de Queijo
  'CTXA8iQis1Ibt4Ffr7Op',  // Macarrão ao Sugo
  'cykeRtfjfLhYExloxgSf',  // S. Alface
  '1V17emgm6ISIARdQTuFb'   // S. Cenoura Ralada
];

async function analyzeSpecificRecipes() {
  try {
    console.log('🔍 Analisando receitas específicas...');
    
    let analysisReport = 'ANÁLISE DE RECEITAS ESPECÍFICAS\n';
    analysisReport += '=====================================\n\n';
    
    for (const recipeId of recipeIds) {
      console.log(`\n📋 Buscando receita: ${recipeId}`);
      
      try {
        const docRef = doc(db, 'Recipe', recipeId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          analysisReport += `RECEITA ID: ${recipeId}\n`;
          analysisReport += `Nome: ${data.name || 'Sem nome'}\n`;
          analysisReport += `Categoria: ${data.category || 'Sem categoria'}\n`;
          analysisReport += `Ativa: ${data.active}\n`;
          analysisReport += `Tipo de Container: ${data.container_type || 'Não definido'}\n`;
          
          // Campos de peso relevantes
          analysisReport += '\n--- DADOS DE PESO ---\n';
          analysisReport += `cuba_weight: ${data.cuba_weight || 'undefined'}\n`;
          analysisReport += `yield_weight: ${data.yield_weight || 'undefined'}\n`;
          analysisReport += `total_weight: ${data.total_weight || 'undefined'}\n`;
          analysisReport += `portion_weight_calculated: ${data.portion_weight_calculated || 'undefined'}\n`;
          
          // Campos de custo
          analysisReport += '\n--- DADOS DE CUSTO ---\n';
          analysisReport += `cost_per_kg_raw: ${data.cost_per_kg_raw || 'undefined'}\n`;
          analysisReport += `cost_per_kg_yield: ${data.cost_per_kg_yield || 'undefined'}\n`;
          analysisReport += `cuba_cost: ${data.cuba_cost || 'undefined'}\n`;
          analysisReport += `portion_cost: ${data.portion_cost || 'undefined'}\n`;
          
          // Preparações (pode conter dados de peso)
          if (data.preparations && Array.isArray(data.preparations)) {
            analysisReport += '\n--- PREPARAÇÕES ---\n';
            data.preparations.forEach((prep, index) => {
              analysisReport += `Preparação ${index + 1}: ${prep.title || 'Sem título'}\n`;
              analysisReport += `  Total Raw Weight: ${prep.total_raw_weight_prep || 'undefined'}\n`;
              analysisReport += `  Total Yield Weight: ${prep.total_yield_weight_prep || 'undefined'}\n`;
              analysisReport += `  Yield Percentage: ${prep.yield_percentage_prep || 'undefined'}\n`;
            });
          }
          
          // Métricas de preparação
          if (data.preparation_metrics && Array.isArray(data.preparation_metrics)) {
            analysisReport += '\n--- MÉTRICAS DE PREPARAÇÃO ---\n';
            data.preparation_metrics.forEach((metric, index) => {
              analysisReport += `Métrica ${index + 1}: ${metric.preparationTitle || 'Sem título'}\n`;
              analysisReport += `  Total Raw Weight: ${metric.totalRawWeight || 'undefined'}\n`;
              analysisReport += `  Total Yield Weight: ${metric.totalYieldWeight || 'undefined'}\n`;
              analysisReport += `  Average Yield: ${metric.averageYield || 'undefined'}%\n`;
              analysisReport += `  Included in Total: ${metric.includedInTotal}\n`;
            });
          }
          
          // Estrutura completa (JSON)
          analysisReport += '\n--- ESTRUTURA COMPLETA (JSON) ---\n';
          analysisReport += JSON.stringify(data, null, 2) + '\n';
          
          console.log(`✅ Receita ${data.name} analisada`);
        } else {
          analysisReport += `RECEITA ID: ${recipeId}\n`;
          analysisReport += `❌ RECEITA NÃO ENCONTRADA\n`;
          console.log(`❌ Receita ${recipeId} não encontrada`);
        }
        
        analysisReport += '\n' + '='.repeat(80) + '\n\n';
        
      } catch (error) {
        analysisReport += `ERRO ao buscar receita ${recipeId}: ${error.message}\n\n`;
        console.error(`❌ Erro ao buscar receita ${recipeId}:`, error);
      }
    }
    
    // Salvar relatório
    const filename = 'analise_receitas_especificas.txt';
    fs.writeFileSync(filename, analysisReport, 'utf8');
    
    console.log(`\n📄 Análise completa salva em: ${filename}`);
    console.log(`🔍 Total de receitas analisadas: ${recipeIds.length}`);
    
  } catch (error) {
    console.error('❌ Erro na análise:', error);
  }
}

// Executar análise
analyzeSpecificRecipes().then(() => {
  console.log('✅ Análise concluída!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erro na execução:', error);
  process.exit(1);
});