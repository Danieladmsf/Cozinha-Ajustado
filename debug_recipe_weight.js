import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

async function debugRecipeWeight() {
  try {
    console.log('🔍 Debug detalhado da receita R. Milho e Ervilha...\n');
    
    // Buscar receita específica
    const recipeId = 'GySgqrujDEoUCKbKeo78'; // R. Milho e Ervilha
    const docRef = doc(db, 'Recipe', recipeId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log('❌ Receita não encontrada');
      return;
    }
    
    const data = docSnap.data();
    console.log('📋 RECEITA: R. Milho e Ervilha');
    console.log('🆔 ID:', recipeId);
    console.log('');
    
    // Campos de peso principais
    console.log('=== CAMPOS DE PESO PRINCIPAIS ===');
    console.log('cuba_weight:', data.cuba_weight);
    console.log('yield_weight:', data.yield_weight);
    console.log('total_weight:', data.total_weight);
    console.log('portion_weight_calculated:', data.portion_weight_calculated);
    console.log('container_type:', data.container_type);
    console.log('');
    
    // Analisar preparações
    if (data.preparations && Array.isArray(data.preparations)) {
      console.log('=== ANÁLISE DAS PREPARAÇÕES ===');
      
      data.preparations.forEach((prep, index) => {
        console.log(`\n--- PREPARAÇÃO ${index + 1}: ${prep.title} ---`);
        console.log('Peso Bruto Total:', prep.total_raw_weight_prep);
        console.log('Peso Rendimento Total:', prep.total_yield_weight_prep);
        console.log('Porcentagem de Rendimento:', prep.yield_percentage_prep);
        
        // Se tem configuração de montagem
        if (prep.assembly_config) {
          console.log('\n🔧 CONFIGURAÇÃO DE MONTAGEM:');
          console.log('  Container Type:', prep.assembly_config.container_type);
          console.log('  Total Weight:', prep.assembly_config.total_weight);
          console.log('  Units Quantity:', prep.assembly_config.units_quantity);
        }
        
        // Sub-componentes
        if (prep.sub_components && prep.sub_components.length > 0) {
          console.log('\n📦 SUB-COMPONENTES:');
          prep.sub_components.forEach((sub, subIndex) => {
            console.log(`  ${subIndex + 1}. ${sub.name}`);
            console.log(`     Assembly Weight: ${sub.assembly_weight_kg} kg`);
            console.log(`     Input Yield Weight: ${sub.input_yield_weight} kg`);
            console.log(`     Yield Weight: ${sub.yield_weight} kg`);
          });
        }
      });
    }
    
    // Simulação do cálculo como o sistema faria
    console.log('\n=== SIMULAÇÃO DO CÁLCULO DE PESO ===');
    
    const cubaWeight = parseFloat(data.cuba_weight) || 0;
    const yieldWeight = parseFloat(data.yield_weight) || 0;
    const containerType = data.container_type || '';
    const quantity = 0.5; // Como na tela do portal
    
    console.log('Dados para cálculo:');
    console.log('- cuba_weight:', cubaWeight);
    console.log('- yield_weight:', yieldWeight);
    console.log('- container_type:', containerType);
    console.log('- quantidade pedida:', quantity);
    
    // Simular lógica do categoryLogic.jsx
    let calculatedWeight = 0;
    const unitType = containerType.toLowerCase();
    
    if (unitType === 'cuba' || unitType === 'cuba-g') {
      calculatedWeight = cubaWeight > 0 ? cubaWeight * quantity : yieldWeight * quantity;
      console.log(`\n📐 CÁLCULO (Cuba): ${cubaWeight > 0 ? cubaWeight : yieldWeight} × ${quantity} = ${calculatedWeight} kg`);
    } else if (unitType === 'kg') {
      calculatedWeight = quantity;
      console.log(`\n📐 CÁLCULO (Kg): ${quantity} kg`);
    } else if (unitType === 'unid' || unitType === 'unid.' || unitType === 'unidade') {
      calculatedWeight = cubaWeight > 0 ? cubaWeight * quantity : yieldWeight * quantity;
      console.log(`\n📐 CÁLCULO (Unid): ${cubaWeight > 0 ? cubaWeight : yieldWeight} × ${quantity} = ${calculatedWeight} kg`);
    }
    
    // Formatação como o sistema faria
    let formattedWeight;
    if (calculatedWeight === 0) {
      formattedWeight = "0 g";
    } else if (calculatedWeight >= 1) {
      formattedWeight = `${calculatedWeight.toFixed(2).replace('.', ',')} kg`;
    } else {
      formattedWeight = `${Math.round(calculatedWeight * 1000)} g`;
    }
    
    console.log('📊 RESULTADO FINAL:', formattedWeight);
    console.log('🎯 ESPERADO:', '610 g (0.5 × 1.22 kg)');
    
    if (calculatedWeight === 0) {
      console.log('\n❌ PROBLEMA IDENTIFICADO: Peso calculado é zero!');
      
      if (cubaWeight === 0 && yieldWeight === 0) {
        console.log('💡 CAUSA: Ambos cuba_weight e yield_weight estão zerados');
      } else if (cubaWeight === 0) {
        console.log('💡 CAUSA: cuba_weight está zerado, usando yield_weight como fallback');
      } else {
        console.log('💡 CAUSA: Possível problema na lógica de cálculo');
      }
    } else {
      console.log('\n✅ Cálculo de peso funcionando corretamente');
    }
    
    // Verificar se há algum campo que está sendo usado incorretamente
    console.log('\n=== VERIFICAÇÃO DE DADOS INCONSISTENTES ===');
    
    // Comparar cuba_weight com dados das preparações finais
    if (data.preparations && data.preparations.length > 0) {
      const finalPrep = data.preparations[data.preparations.length - 1];
      if (finalPrep.assembly_config && finalPrep.assembly_config.total_weight) {
        const assemblyWeight = finalPrep.assembly_config.total_weight;
        console.log('cuba_weight (campo principal):', cubaWeight);
        console.log('assembly total_weight (última preparação):', assemblyWeight);
        
        if (cubaWeight !== assemblyWeight) {
          console.log('⚠️  INCONSISTÊNCIA: cuba_weight diferente do assembly total_weight');
          console.log('💡 Possível causa: Sistema pode estar usando assembly_config ao invés de cuba_weight');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  }
}

// Executar debug
debugRecipeWeight().then(() => {
  console.log('\n✅ Debug concluído!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erro na execução:', error);
  process.exit(1);
});