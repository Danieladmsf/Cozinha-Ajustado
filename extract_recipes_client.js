import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
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

async function extractRecipes() {
  try {
    console.log('Conectando ao Firestore...');
    
    // Buscar todos os documentos da coleção Recipe
    const recipesRef = collection(db, 'Recipe');
    const recipesSnapshot = await getDocs(recipesRef);
    
    console.log(`Encontradas ${recipesSnapshot.size} receitas`);
    
    let output = 'ID\tNOME\n';
    output += '---\t----\n';
    
    recipesSnapshot.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;
      const name = data.name || 'Nome não encontrado';
      
      output += `${id}\t${name}\n`;
      console.log(`Processando: ${id} - ${name}`);
    });
    
    // Salvar no arquivo TXT
    const filename = 'receitas_extraidas.txt';
    fs.writeFileSync(filename, output, 'utf8');
    
    console.log(`\nDados extraídos salvos em: ${filename}`);
    console.log(`Total de receitas processadas: ${recipesSnapshot.size}`);
    
  } catch (error) {
    console.error('Erro ao extrair receitas:', error);
  }
}

// Executar a extração
extractRecipes().then(() => {
  console.log('Extração concluída!');
  process.exit(0);
}).catch((error) => {
  console.error('Erro na execução:', error);
  process.exit(1);
});