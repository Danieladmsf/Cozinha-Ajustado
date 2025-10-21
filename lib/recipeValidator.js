export const validateRecipe = (recipeData, preparationsData) => {
  const errors = [];

  // 1. Validate Recipe Name
  if (!recipeData.name || recipeData.name.trim() === '') {
    errors.push("O nome da receita é obrigatório.");
  }

  // 2. Validate Prep Time
  if (recipeData.prep_time < 0) {
    errors.push("O tempo de preparo não pode ser negativo.");
  }

  // 3. Validate Category
  if (!recipeData.category || recipeData.category.trim() === '') {
    errors.push("A categoria da receita é obrigatória.");
  }

  // 4. Validate Preparations and Ingredients
  if (!preparationsData || preparationsData.length === 0) {
    errors.push("A receita deve ter pelo menos uma etapa de preparo.");
  } else {
    const hasIngredients = preparationsData.some(prep => (prep.ingredients && prep.ingredients.length > 0) || (prep.sub_components && prep.sub_components.length > 0));
    if (!hasIngredients) {
      errors.push("A receita deve ter pelo menos um ingrediente ou sub-componente.");
    }

    preparationsData.forEach((prep, prepIndex) => {
      if (prep.ingredients) {
        prep.ingredients.forEach((ing, ingIndex) => {
          const ingName = ing.name || `Ingrediente ${ingIndex + 1}`;
          // 5. Validate Prices
          const price = parseFloat(String(ing.current_price).replace(',', '.'));
          if (price < 0) {
            errors.push(`Etapa ${prepIndex + 1}, ${ingName}: O preço não pode ser negativo.`);
          }
          if (price > 2000) { // Limite simbólico para preços por kg
            errors.push(`Etapa ${prepIndex + 1}, ${ingName}: O preço por kg (R$ ${price}) parece excessivamente alto.`);
          }

          // 6. Validate Weights
          const weights = [
            'weight_frozen', 'weight_thawed', 'weight_raw', 'weight_clean',
            'weight_pre_cooking', 'weight_cooked', 'weight_portioned'
          ];
          weights.forEach(weightField => {
            if (ing[weightField]) {
                const weightValue = parseFloat(String(ing[weightField]).replace(',', '.'));
                if (weightValue < 0) {
                    errors.push(`Etapa ${prepIndex + 1}, ${ingName}: O campo '${weightField}' não pode ser negativo.`);
                }
            }
          });
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
};