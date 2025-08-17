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
  
  
  // Verificar estrutura de preparations
  if (!recipe.preparations || !Array.isArray(recipe.preparations)) {
    return ingredientes;
  }
  
  recipe.preparations.forEach((preparation, prepIndex) => {
    
    if (preparation.ingredients && Array.isArray(preparation.ingredients)) {
      preparation.ingredients.forEach((ingredient, ingIndex) => {
        // FORÇAR VISUALIZAÇÃO DO OBJETO INGREDIENTE - Tentativa final
        if (ingredient.name && ingredient.name.includes('Maminha')) {
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
            return; // Pular este ingrediente
          }
          
          
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
          
        }
      });
    } else {
    }
  });
  
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
  
  
  orders.forEach((order, orderIndex) => {
    
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item, itemIndex) => {
        if (item.recipe_id && item.quantity) {
          const recipe = recipes.find(r => r.id === item.recipe_id);
          if (recipe) {
            
            // Calcular quantas receitas completas são necessárias
            const portionSize = recipe.portion_weight_calculated || recipe.cuba_weight || 0.06; // peso por porção
            const recipeYield = recipe.yield_weight || 0.17; // rendimento total da receita
            const portionsPerRecipe = recipeYield / portionSize; // quantas porções uma receita produz
            
            const recipesNeeded = item.quantity / portionsPerRecipe;
            
            
            if (!recipeQuantities[item.recipe_id]) {
              recipeQuantities[item.recipe_id] = 0;
            }
            
            recipeQuantities[item.recipe_id] += recipesNeeded;
            
          } else {
          }
        }
      });
    }
  });
  
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
    
    // 1. Calcular quantidades necessárias de cada receita
    const recipeQuantities = calculateRecipeQuantities(orders, recipes);
    const totalRecipesNeeded = Object.keys(recipeQuantities).length;
    
    
    if (totalRecipesNeeded === 0) {
      return [];
    }
    
    // 2. Extrair todos os ingredientes de todas as receitas
    const allIngredients = [];
    
    Object.entries(recipeQuantities).forEach(([recipeId, quantity]) => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (recipe && quantity > 0) {
        const ingredients = extractIngredientsFromRecipe(recipe, quantity);
        allIngredients.push(...ingredients);
      } else {
      }
    });
    
    
    if (allIngredients.length === 0) {
      return [];
    }
    
    // 3. Consolidar ingredientes duplicados
    const consolidatedIngredients = consolidateDuplicateIngredients(allIngredients);
    
    // 4. Ordenar alfabeticamente
    consolidatedIngredients.sort((a, b) => a.name.localeCompare(b.name));
    
    // 5. Log de debug final
    
    return consolidatedIngredients;
    
  } catch (error) {
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