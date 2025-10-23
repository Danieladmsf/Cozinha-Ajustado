/**
 * Utilitário CORRIGIDO para consolidação de ingredientes de receitas
 * Processa todos os pedidos da semana e consolida os ingredientes por nome
 *
 * CORREÇÕES IMPLEMENTADAS:
 * 1. Cálculo correto baseado no tipo de unidade (cuba-g, porção, unid., etc.)
 * 2. Extração mais robusta de peso dos ingredientes
 * 3. Uso correto da quantidade do ingrediente na receita
 */

/**
 * Extrai o peso mais adequado de um ingrediente
 * Tenta diferentes estruturas e propriedades
 */
const getIngredientWeight = (ingredient) => {
  // Helper para converter valores vazios/inválidos e lidar com formato brasileiro (vírgula)
  const parseWeight = (value) => {
    if (value === null || value === undefined || value === '') return 0;

    // Se for string, substituir vírgula por ponto (formato brasileiro → formato JS)
    if (typeof value === 'string') {
      value = value.replace(',', '.');
    }

    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  // 1. Tentar propriedades diretas de peso processado (prioridade: cooked > pre_cooking > clean > thawed)
  let weight = parseWeight(ingredient.weight_cooked);

  if (!weight) weight = parseWeight(ingredient.weight_pre_cooking);
  if (!weight) weight = parseWeight(ingredient.weight_clean);
  if (!weight) weight = parseWeight(ingredient.weight_thawed);

  // 2. Se não encontrou, tentar objetos aninhados
  if (!weight && ingredient.weights) {
    weight = parseWeight(ingredient.weights.cooked);
    if (!weight) weight = parseWeight(ingredient.weights.pre_cooking);
    if (!weight) weight = parseWeight(ingredient.weights.clean);
    if (!weight) weight = parseWeight(ingredient.weights.thawed);
  }

  // 3. Fallback: peso bruto (menos ideal, mas melhor que nada)
  if (!weight) {
    weight = parseWeight(ingredient.weight);
  }
  if (!weight) {
    weight = parseWeight(ingredient.weight_raw);
  }
  if (!weight) {
    weight = parseWeight(ingredient.raw_weight);
  }

  return weight;
};

/**
 * Extrai ingredientes de uma receita com suas quantidades
 * @param {Object} recipe - Receita com dados de ingredientes
 * @param {number} recipeMultiplier - Multiplicador de receitas (quantas vezes a receita completa)
 * @returns {Array} Array de ingredientes com quantidades calculadas
 */
const extractIngredientsFromRecipe = (recipe, recipeMultiplier) => {
  const ingredientes = [];

  console.log(`📦 [Extract] Receita: ${recipe.name}, Multiplicador: ${recipeMultiplier}x`);

  // Verificar estrutura de preparations
  if (!recipe.preparations || !Array.isArray(recipe.preparations)) {
    console.warn(`⚠️ [Extract] Receita ${recipe.name} não tem preparations`);
    return ingredientes;
  }

  recipe.preparations.forEach((preparation, prepIndex) => {
    if (preparation.ingredients && Array.isArray(preparation.ingredients)) {
      console.log(`  📋 Prep ${prepIndex}: ${preparation.ingredients.length} ingredientes`);

      preparation.ingredients.forEach((ingredient, ingIndex) => {
        if (!ingredient.name) {
          console.warn(`  ⚠️ Ingrediente sem nome no índice ${ingIndex}`);
          return;
        }

        // DEBUG: Mostrar estrutura do ingrediente
        if (ingIndex === 0) {
          console.log(`  🔍 DEBUG - Estrutura do ingrediente "${ingredient.name}":`, {
            quantity: ingredient.quantity,
            weight: ingredient.weight,
            weight_cooked: ingredient.weight_cooked,
            weight_pre_cooking: ingredient.weight_pre_cooking,
            weight_clean: ingredient.weight_clean,
            weight_thawed: ingredient.weight_thawed,
            weights: ingredient.weights,
            raw_weight: ingredient.raw_weight,
            allKeys: Object.keys(ingredient)
          });
        }

        // Quantidade base do ingrediente na receita (quantas unidades)
        const baseQuantity = parseFloat(ingredient.quantity) || 1;

        // Peso unitário do ingrediente
        const unitWeight = getIngredientWeight(ingredient);

        if (!unitWeight || unitWeight === 0) {
          console.warn(`  ⚠️ ${ingredient.name}: sem peso válido, PULANDO`);
          console.log(`     Estrutura completa:`, ingredient);
          return; // Pular apenas se realmente não houver peso
        }

        // CORREÇÃO: Calcular peso total = (peso unitário × quantidade na receita) × multiplicador de receitas
        const totalWeight = unitWeight * baseQuantity * recipeMultiplier;

        console.log(`  ✅ ${ingredient.name}: ${baseQuantity} × ${unitWeight}kg × ${recipeMultiplier}x = ${totalWeight}kg`);

        ingredientes.push({
          name: ingredient.name.trim(),
          category: ingredient.category || 'Outros',
          unit: ingredient.unit || 'kg',
          quantity: totalWeight, // A quantidade total em kg
          weight: totalWeight, // Peso total em kg
          recipe: recipe.name,
          brand: ingredient.brand || '',
          notes: ingredient.notes || '',
          debug: {
            baseQuantity,
            unitWeight,
            recipeMultiplier,
            totalWeight
          }
        });
      });
    }
  });

  console.log(`  ✅ Total extraído: ${ingredientes.length} ingredientes`);
  return ingredientes;
};

/**
 * Calcula quantas vezes cada receita precisa ser feita baseado nos pedidos
 * CORRIGIDO: Considera o tipo de unidade corretamente
 * @param {Array} orders - Array de pedidos da semana
 * @param {Array} recipes - Array de receitas disponíveis
 * @returns {Object} Objeto com recipe_id como chave e multiplicador de receitas
 */
const calculateRecipeQuantities = (orders, recipes) => {
  const recipeQuantities = {};

  console.log(`\n🔍 [Calculate] Processando ${orders.length} pedidos...`);

  orders.forEach((order, orderIndex) => {
    console.log(`\n📋 Pedido ${orderIndex + 1}: ${order.customer_name} - Dia ${order.day_of_week}`);

    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item) => {
        if (item.recipe_id && item.quantity) {
          const recipe = recipes.find(r => r.id === item.recipe_id);
          if (!recipe) {
            console.warn(`  ⚠️ Receita não encontrada: ${item.recipe_id}`);
            return;
          }

          // CORREÇÃO: Calcular baseado no tipo de unidade
          let recipeMultiplier = 0;
          const itemQuantity = parseFloat(item.quantity);
          const unitType = (item.unit_type || '').toLowerCase();

          console.log(`  📦 ${recipe.name}: ${itemQuantity} ${unitType}`);

          if (unitType === 'cuba' || unitType === 'cuba-g' || unitType === 'cuba-p') {
            // Para cubas: a quantidade é o número de cubas
            // Se pede 2 cubas, multiplica a receita por 2
            recipeMultiplier = itemQuantity;
            console.log(`    ✅ Cuba: ${itemQuantity} cubas = ${recipeMultiplier}x receita`);

          } else if (unitType === 'unid.' || unitType === 'porção') {
            // Para unidades/porções: calcular quantas receitas são necessárias
            const portionWeight = recipe.portion_weight_calculated || 0.06; // peso de 1 porção
            const cubaWeight = recipe.cuba_weight || 1; // peso de 1 cuba
            const portionsPerCuba = cubaWeight / portionWeight;
            recipeMultiplier = itemQuantity / portionsPerCuba;
            console.log(`    ✅ Porção: ${itemQuantity} porções ÷ ${portionsPerCuba} porções/cuba = ${recipeMultiplier}x receita`);

          } else if (unitType === 'kg') {
            // Para kg: calcular baseado no rendimento da receita
            const yieldWeight = recipe.yield_weight || recipe.cuba_weight || 1;
            recipeMultiplier = itemQuantity / yieldWeight;
            console.log(`    ✅ Kg: ${itemQuantity} kg ÷ ${yieldWeight} kg/receita = ${recipeMultiplier}x receita`);

          } else {
            // Fallback: assumir que é cuba
            recipeMultiplier = itemQuantity;
            console.warn(`    ⚠️ Unidade desconhecida "${unitType}", assumindo como cuba`);
          }

          if (!recipeQuantities[item.recipe_id]) {
            recipeQuantities[item.recipe_id] = 0;
          }

          recipeQuantities[item.recipe_id] += recipeMultiplier;
          console.log(`    📊 Total acumulado para ${recipe.name}: ${recipeQuantities[item.recipe_id]}x`);
        }
      });
    }
  });

  console.log(`\n✅ [Calculate] Resumo de receitas necessárias:`);
  Object.entries(recipeQuantities).forEach(([recipeId, quantity]) => {
    const recipe = recipes.find(r => r.id === recipeId);
    console.log(`  - ${recipe?.name || recipeId}: ${quantity.toFixed(2)}x`);
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

  console.log(`\n🔄 [Consolidate] Consolidando ${allIngredients.length} ingredientes...`);

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

      console.log(`  ➕ ${ingredient.name}: +${ingredient.quantity}kg (total: ${consolidated[key].totalQuantity}kg)`);
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

      console.log(`  🆕 ${ingredient.name}: ${ingredient.quantity}kg`);
    }
  });

  const result = Object.values(consolidated);
  console.log(`\n✅ [Consolidate] Resultado: ${result.length} ingredientes únicos`);

  return result;
};

/**
 * Função principal para consolidar ingredientes de todas as receitas da semana
 * @param {Array} orders - Pedidos da semana
 * @param {Array} recipes - Receitas disponíveis
 * @returns {Array} Array de ingredientes consolidados ordenado alfabeticamente
 */
export const consolidateIngredientsFromRecipes = (orders, recipes) => {
  try {
    console.log(`\n🚀 ========== CONSOLIDAÇÃO DE INGREDIENTES ==========`);
    console.log(`📊 Input: ${orders.length} pedidos, ${recipes.length} receitas`);

    // 1. Calcular quantidades necessárias de cada receita
    const recipeQuantities = calculateRecipeQuantities(orders, recipes);
    const totalRecipesNeeded = Object.keys(recipeQuantities).length;

    if (totalRecipesNeeded === 0) {
      console.warn(`⚠️ Nenhuma receita necessária encontrada`);
      return [];
    }

    // 2. Extrair todos os ingredientes de todas as receitas
    const allIngredients = [];

    Object.entries(recipeQuantities).forEach(([recipeId, quantity]) => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (recipe && quantity > 0) {
        const ingredients = extractIngredientsFromRecipe(recipe, quantity);
        allIngredients.push(...ingredients);
      }
    });

    if (allIngredients.length === 0) {
      console.warn(`⚠️ Nenhum ingrediente extraído das receitas`);
      return [];
    }

    // 3. Consolidar ingredientes duplicados
    const consolidatedIngredients = consolidateDuplicateIngredients(allIngredients);

    // 4. Ordenar alfabeticamente
    consolidatedIngredients.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`\n✅ ========== CONSOLIDAÇÃO COMPLETA ==========`);
    console.log(`📦 Total de ingredientes únicos: ${consolidatedIngredients.length}`);
    console.log(`⚖️  Peso total: ${consolidatedIngredients.reduce((sum, i) => sum + i.totalWeight, 0).toFixed(2)}kg\n`);

    return consolidatedIngredients;

  } catch (error) {
    console.error(`❌ Erro na consolidação:`, error);
    return [];
  }
};

/**
 * Função utilitária para formatar peso para exibição
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
