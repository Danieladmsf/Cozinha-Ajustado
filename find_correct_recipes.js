import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
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

// Nomes das receitas que aparecem na tela do portal
const recipeNames = [
  'Arroz Branco',
  'Feijão', 
  'R. Milho e Ervilha',
  'Filé de Frango com cheddar e bacon',
  'Ovos fritos',
  'Macarrão ao Sugo',
  'S. Alface',
  'S. Cenoura Ralada'
];

async function findCorrectRecipes() {
  try {
    console.log('🔍 Buscando receitas pelos nomes corretos...');
    
    let analysisReport = 'ANÁLISE DAS RECEITAS CORRETAS DO PORTAL\n';
    analysisReport += '==========================================\n\n';
    
    for (const recipeName of recipeNames) {
      console.log(`\n📋 Buscando receita: "${recipeName}"`);
      
      try {
        // Buscar receita pelo nome exato
        const recipesRef = collection(db, 'Recipe');
        const q = query(recipesRef, where('name', '==', recipeName));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const recipeId = doc.id;
            
            analysisReport += `RECEITA: ${recipeName}\n`;
            analysisReport += `ID: ${recipeId}\n`;
            analysisReport += `Categoria: ${data.category || 'Sem categoria'}\n`;
            analysisReport += `Ativa: ${data.active}\n`;
            analysisReport += `Tipo de Container: ${data.container_type || 'Não definido'}\n`;
            
            // Campos de peso relevantes
            analysisReport += '\n--- DADOS DE PESO ---\n';
            analysisReport += `cuba_weight: ${data.cuba_weight !== undefined ? data.cuba_weight : 'undefined'}\n`;
            analysisReport += `yield_weight: ${data.yield_weight !== undefined ? data.yield_weight : 'undefined'}\n`;
            analysisReport += `total_weight: ${data.total_weight !== undefined ? data.total_weight : 'undefined'}\n`;
            analysisReport += `portion_weight_calculated: ${data.portion_weight_calculated !== undefined ? data.portion_weight_calculated : 'undefined'}\n`;
            
            // Campos de custo
            analysisReport += '\n--- DADOS DE CUSTO ---\n';
            analysisReport += `cost_per_kg_raw: ${data.cost_per_kg_raw !== undefined ? data.cost_per_kg_raw : 'undefined'}\n`;
            analysisReport += `cost_per_kg_yield: ${data.cost_per_kg_yield !== undefined ? data.cost_per_kg_yield : 'undefined'}\n`;
            analysisReport += `cuba_cost: ${data.cuba_cost !== undefined ? data.cuba_cost : 'undefined'}\n`;
            analysisReport += `portion_cost: ${data.portion_cost !== undefined ? data.portion_cost : 'undefined'}\n`;
            
            // Análise específica dos problemas de peso
            analysisReport += '\n--- DIAGNÓSTICO DO PROBLEMA DE PESO ---\n';
            
            const cubaWeight = data.cuba_weight;
            const yieldWeight = data.yield_weight; 
            const containerType = data.container_type;
            
            if (cubaWeight === undefined || cubaWeight === null || cubaWeight === 0) {
              analysisReport += `❌ PROBLEMA: cuba_weight está ${cubaWeight === undefined ? 'undefined' : cubaWeight === null ? 'null' : 'zerado'}\n`;
            } else {
              analysisReport += `✅ cuba_weight OK: ${cubaWeight} kg\n`;
            }
            
            if (!containerType) {
              analysisReport += `❌ PROBLEMA: container_type não definido\n`;
            } else {
              analysisReport += `✅ container_type OK: ${containerType}\n`;
            }
            
            if (yieldWeight === undefined || yieldWeight === null || yieldWeight === 0) {
              analysisReport += `⚠️  yield_weight vazio: ${yieldWeight}\n`;
            } else {
              analysisReport += `✅ yield_weight OK: ${yieldWeight} kg\n`;
            }
            
            // Cálculo simulado do peso (como o sistema faria)
            analysisReport += '\n--- SIMULAÇÃO DO CÁLCULO DE PESO ---\n';
            const simulatedQuantity = 1; // Simular 1 cuba/unidade
            let simulatedWeight = 0;
            
            const unitType = (containerType || '').toLowerCase();
            const cubaWeightParsed = parseFloat(cubaWeight) || 0;
            const yieldWeightParsed = parseFloat(yieldWeight) || 0;
            
            if (unitType === 'cuba' || unitType === 'cuba-g') {
              simulatedWeight = cubaWeightParsed > 0 ? cubaWeightParsed * simulatedQuantity : yieldWeightParsed * simulatedQuantity;
              analysisReport += `Para ${simulatedQuantity} ${containerType}: ${simulatedWeight} kg\n`;
            } else if (unitType === 'unid' || unitType === 'unid.' || unitType === 'unidade') {
              simulatedWeight = cubaWeightParsed > 0 ? cubaWeightParsed * simulatedQuantity : yieldWeightParsed * simulatedQuantity;
              analysisReport += `Para ${simulatedQuantity} unidade: ${simulatedWeight} kg\n`;
            } else if (unitType === 'kg') {
              simulatedWeight = simulatedQuantity;
              analysisReport += `Para ${simulatedQuantity} kg: ${simulatedWeight} kg\n`;
            } else {
              analysisReport += `❌ Tipo de unidade não reconhecido: ${unitType}\n`;
            }
            
            if (simulatedWeight === 0) {
              analysisReport += `❌ RESULTADO: Peso calculado = 0 (problema identificado!)\n`;
            } else {
              analysisReport += `✅ RESULTADO: Peso calculado = ${simulatedWeight} kg\n`;
            }
            
            console.log(`✅ Receita "${recipeName}" analisada - ID: ${recipeId}`);
          });
        } else {
          analysisReport += `RECEITA: ${recipeName}\n`;
          analysisReport += `❌ RECEITA NÃO ENCONTRADA NO BANCO\n`;
          console.log(`❌ Receita "${recipeName}" não encontrada`);
        }
        
        analysisReport += '\n' + '='.repeat(80) + '\n\n';
        
      } catch (error) {
        analysisReport += `ERRO ao buscar receita "${recipeName}": ${error.message}\n\n`;
        console.error(`❌ Erro ao buscar receita "${recipeName}":`, error);
      }
    }
    
    // Salvar relatório
    const filename = 'analise_receitas_corretas.txt';
    fs.writeFileSync(filename, analysisReport, 'utf8');
    
    console.log(`\n📄 Análise completa salva em: ${filename}`);
    console.log(`🔍 Total de receitas buscadas: ${recipeNames.length}`);
    
  } catch (error) {
    console.error('❌ Erro na análise:', error);
  }
}

// Executar análise
findCorrectRecipes().then(() => {
  console.log('✅ Análise concluída!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erro na execução:', error);
  process.exit(1);
});