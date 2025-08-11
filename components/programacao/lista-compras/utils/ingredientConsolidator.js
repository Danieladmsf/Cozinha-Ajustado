/**
 * Utilitário para consolidação de ingredientes de receitas
 * Processa todos os pedidos da semana e consolida os ingredientes por nome
 */

/**
 * Extrai ingredientes de uma receita com suas quantidades
 * @param {Object} recipe - Receita com dados de ingredientes
 * @param {number} quantityNeeded - Quantidade de receitas necessárias
 * @returns {Array} Array de ingredientes com quantidades calculadas
 */
const extractIngredientsFromRecipe = (recipe, quantityNeeded) => {
  const ingredientes = [];
  console.error(`🔥 FUNÇÃO EXECUTANDO: ${recipe.name} - ${new Date().toISOString()}`);
  
  console.log(`[DEBUG] Processando receita: ${recipe.name}, quantidade necessária: ${quantityNeeded}`);
  
  // Verificar estrutura de preparations
  if (!recipe.preparations || !Array.isArray(recipe.preparations)) {
    console.log(`[DEBUG] Receita ${recipe.name}: Sem preparations ou não é array`);
    return ingredientes;
  }
  
  recipe.preparations.forEach((preparation, prepIndex) => {
    console.log(`[DEBUG] Preparation ${prepIndex} da receita ${recipe.name}:`, preparation.title || 'Sem título');
    
    if (preparation.ingredients && Array.isArray(preparation.ingredients)) {
      preparation.ingredients.forEach((ingredient, ingIndex) => {
        // FORÇAR VISUALIZAÇÃO DO OBJETO INGREDIENTE - Tentativa final
        if (ingredient.name && ingredient.name.includes('Maminha')) {
          console.error('=== INGREDIENTE MAMINHA ESTRUTURA ===');
          console.error('Keys:', Object.keys(ingredient));
          console.error('Ingredient object:', ingredient);
          console.error('Weight thawed:', ingredient.weight_thawed);
          console.error('Weight clean:', ingredient.weight_clean);
          console.error('Weight cooked:', ingredient.weight_cooked);
          console.error('=====================================');
        }
        
        if (ingredient.name) {
          // Calcular peso total do ingrediente
          let ingredientWeight = 0;
          const baseQuantity = parseFloat(ingredient.quantity) || 1; // Default para 1 se não especificado
          
          // Tentar diferentes estruturas possíveis para os pesos
          let unitWeight = 0;
          
          // Testar propriedades diretas baseadas nos dados reais do banco
          unitWeight = parseFloat(ingredient.weight_thawed) || 
                      parseFloat(ingredient.weight_clean) || 
                      parseFloat(ingredient.weight_cooked) ||
                      parseFloat(ingredient.weight_pre_cooking) ||
                      0;
          
          // Se ainda não encontrou peso, testar objetos aninhados
          if (!unitWeight && ingredient.weights) {
            unitWeight = parseFloat(ingredient.weights.thawed) ||
                        parseFloat(ingredient.weights.clean) ||
                        parseFloat(ingredient.weights.cooked);
          }
          
          // Se ainda não encontrou peso unitário, pular este ingrediente
          if (!unitWeight) {
            console.log(`[DEBUG] ⚠️ Ingrediente ${ingredient.name} sem peso definido - pulando`);
            return; // Pular este ingrediente
          }
          
          console.log(`[DEBUG] Peso unitário encontrado: ${unitWeight}kg para ${ingredient.name}`);
          
          // Total = peso unitário × quantas receitas (quantity é sempre 0 nas receitas, usar apenas unitWeight)
          ingredientWeight = unitWeight * quantityNeeded;
          
          ingredientes.push({
            name: ingredient.name.trim(),
            category: ingredient.category || 'Outros',
            unit: ingredient.unit || 'kg',
            quantity: unitWeight * quantityNeeded, // Usar o peso calculado como quantidade
            weight: ingredientWeight,
            recipe: recipe.name,
            brand: ingredient.brand || '',
            notes: ingredient.notes || '',
            debug: {
              baseQuantity,
              unitWeight,
              quantityNeeded,
              finalWeight: ingredientWeight
            }
          });
          
          console.log(`[DEBUG] Ingrediente processado: ${ingredient.name} = ${ingredientWeight}kg`);
        }
      });
    } else {
      console.log(`[DEBUG] Preparation ${prepIndex}: Sem ingredients ou não é array`);
    }
  });
  
  console.log(`[DEBUG] Total ingredientes extraídos da receita ${recipe.name}: ${ingredientes.length}`);
  return ingredientes;
};

/**
 * Calcula quantas vezes cada receita precisa ser feita baseado nos pedidos
 * @param {Array} orders - Array de pedidos da semana
 * @param {Array} recipes - Array de receitas disponíveis
 * @returns {Object} Objeto com recipe_id como chave e quantidade de receitas necessárias
 */
const calculateRecipeQuantities = (orders, recipes) => {
  const recipeQuantities = {};
  
  console.log(`[DEBUG] Processando ${orders.length} pedidos para calcular quantidades de receitas`);
  
  orders.forEach((order, orderIndex) => {
    console.log(`[DEBUG] Pedido ${orderIndex}: ${order.customer_name}, dia ${order.day_of_week}`);
    
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item, itemIndex) => {
        if (item.recipe_id && item.quantity) {
          const recipe = recipes.find(r => r.id === item.recipe_id);
          if (recipe) {
            console.log(`[DEBUG] Item ${itemIndex}: ${recipe.name} - ${item.quantity} porções pedidas`);
            
            // Calcular quantas receitas completas são necessárias
            const portionSize = recipe.portion_weight_calculated || recipe.cuba_weight || 0.06; // peso por porção
            const recipeYield = recipe.yield_weight || 0.17; // rendimento total da receita
            const portionsPerRecipe = recipeYield / portionSize; // quantas porções uma receita produz
            
            const recipesNeeded = item.quantity / portionsPerRecipe;
            
            console.log(`[DEBUG] Cálculo: ${item.quantity} porções ÷ ${portionsPerRecipe.toFixed(2)} porções/receita = ${recipesNeeded.toFixed(2)} receitas`);
            
            if (!recipeQuantities[item.recipe_id]) {
              recipeQuantities[item.recipe_id] = 0;
            }
            
            recipeQuantities[item.recipe_id] += recipesNeeded;
            
            console.log(`[DEBUG] Total acumulado para ${recipe.name}: ${recipeQuantities[item.recipe_id].toFixed(2)} receitas`);
          } else {
            console.log(`[DEBUG] Receita não encontrada para item com recipe_id: ${item.recipe_id}`);
          }
        }
      });
    }
  });
  
  console.log(`[DEBUG] Quantidades finais de receitas:`, recipeQuantities);
  return recipeQuantities;
};

/**
 * Consolida ingredientes duplicados somando suas quantidades
 * @param {Array} allIngredients - Array de todos os ingredientes extraídos
 * @returns {Array} Array de ingredientes consolidados sem duplicatas
 */
const consolidateDuplicateIngredients = (allIngredients) => {
  const consolidated = {};
  
  allIngredients.forEach(ingredient => {
    const key = `${ingredient.name}_${ingredient.unit}`.toLowerCase();
    
    if (consolidated[key]) {
      // Somar quantidades e pesos
      consolidated[key].totalQuantity += ingredient.quantity;
      consolidated[key].totalWeight += ingredient.weight;
      consolidated[key].usedInRecipes += 1;
      
      // Combinar receitas onde é usado
      if (!consolidated[key].recipes.includes(ingredient.recipe)) {
        consolidated[key].recipes.push(ingredient.recipe);
      }
    } else {
      consolidated[key] = {
        name: ingredient.name,
        category: ingredient.category,
        unit: ingredient.unit,
        totalQuantity: ingredient.quantity,
        totalWeight: ingredient.weight,
        usedInRecipes: 1,
        recipes: [ingredient.recipe],
        brand: ingredient.brand,
        notes: ingredient.notes
      };
    }
  });
  
  return Object.values(consolidated);
};

/**
 * Função principal para consolidar ingredientes de todas as receitas da semana
 * @param {Array} orders - Pedidos da semana
 * @param {Array} recipes - Receitas disponíveis
 * @returns {Array} Array de ingredientes consolidados ordenado alfabeticamente
 */
export const consolidateIngredientsFromRecipes = (orders, recipes) => {
  try {
    console.log(`[DEBUG] === INÍCIO CONSOLIDAÇÃO DE INGREDIENTES ===`);
    console.log(`[DEBUG] Total pedidos: ${orders.length}, Total receitas: ${recipes.length}`);
    
    // 1. Calcular quantidades necessárias de cada receita
    const recipeQuantities = calculateRecipeQuantities(orders, recipes);
    const totalRecipesNeeded = Object.keys(recipeQuantities).length;
    
    console.log(`[DEBUG] Total de receitas diferentes necessárias: ${totalRecipesNeeded}`);
    
    if (totalRecipesNeeded === 0) {
      console.log(`[DEBUG] Nenhuma receita encontrada nos pedidos`);
      return [];
    }
    
    // 2. Extrair todos os ingredientes de todas as receitas
    const allIngredients = [];
    
    Object.entries(recipeQuantities).forEach(([recipeId, quantity]) => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (recipe && quantity > 0) {
        console.log(`[DEBUG] Processando receita: ${recipe.name} (${quantity.toFixed(2)}x)`);
        const ingredients = extractIngredientsFromRecipe(recipe, quantity);
        allIngredients.push(...ingredients);
        console.log(`[DEBUG] Ingredientes extraídos: ${ingredients.length}`);
      } else {
        console.log(`[DEBUG] Receita não encontrada ou quantidade zero: ${recipeId}`);
      }
    });
    
    console.log(`[DEBUG] Total ingredientes brutos extraídos: ${allIngredients.length}`);
    
    if (allIngredients.length === 0) {
      console.log(`[DEBUG] Nenhum ingrediente encontrado nas receitas`);
      return [];
    }
    
    // 3. Consolidar ingredientes duplicados
    const consolidatedIngredients = consolidateDuplicateIngredients(allIngredients);
    
    // 4. Ordenar alfabeticamente
    consolidatedIngredients.sort((a, b) => a.name.localeCompare(b.name));
    
    // 5. Log de debug final
    console.log(`[DEBUG] === RESULTADO FINAL ===`);
    console.log(`[DEBUG] Ingredientes únicos consolidados: ${consolidatedIngredients.length}`);
    consolidatedIngredients.forEach(ing => {
      console.log(`[DEBUG] ${ing.name}: ${ing.totalWeight.toFixed(3)}kg (${ing.usedInRecipes} receitas)`);
    });
    
    return consolidatedIngredients;
    
  } catch (error) {
    console.error('Erro ao consolidar ingredientes:', error);
    console.error('Stack trace:', error.stack);
    return [];
  }
};

/**
 * Função utilitária para formatar peso para exibição
 * @param {number} weightKg - Peso em quilogramas
 * @returns {string} Peso formatado
 */
export const formatWeight = (weightKg) => {
  if (!weightKg || weightKg === 0) return "0g";
  
  if (weightKg >= 1) {
    return `${weightKg.toFixed(2)}kg`;
  } else {
    return `${Math.round(weightKg * 1000)}g`;
  }
};

/**
 * Função utilitária para formatar quantidade para exibição
 * @param {number} quantity - Quantidade
 * @param {string} unit - Unidade
 * @returns {string} Quantidade formatada
 */
export const formatQuantity = (quantity, unit) => {
  if (!quantity || quantity === 0) return `0 ${unit}`;
  
  // Se for número inteiro, mostrar sem decimais
  if (Number.isInteger(quantity)) {
    return `${quantity} ${unit}`;
  }
  
  // Mostrar até 3 casas decimais, removendo zeros desnecessários
  return `${parseFloat(quantity.toFixed(3))} ${unit}`;
};