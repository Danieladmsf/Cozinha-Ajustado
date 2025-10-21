import { useState, useEffect } from 'react';
import { NutritionFood } from '@/app/api/entities';

export function useNutritionCalculator() {
  const [nutritionFoods, setNutritionFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadNutritionData();
  }, []);

  const loadNutritionData = async () => {
    try {
      const foods = await NutritionFood.list();
      setNutritionFoods(foods);
      setLoading(false);
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  };

  // Função auxiliar para obter valor numérico seguro
  const safeNumericValue = (value) => {
    if (typeof value === 'string' && (value.trim() === '' || value.toLowerCase() === 'na' || value.toLowerCase() === 'tr')) {
      return 0;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Criar objeto padrão de valores nutricionais zerados
  const createEmptyTotals = () => ({
    energy_kcal: 0,
    protein_g: 0,
    carbohydrate_g: 0,
    lipid_g: 0,
    fiber_g: 0,
    calcium_mg: 0,
    iron_mg: 0,
    sodium_mg: 0,
    manganese_mg: 0,
    saturated_g: 0
  });

  // Calcula os valores nutricionais brutos de uma receita
  const calculateRecipeRawTotals = (recipe) => {
    if (!recipe?.ingredients || !nutritionFoods.length) {
      return { totals: createEmptyTotals(), totalWeightInGrams: 0 };
    }

    // Valores iniciais
    const totals = createEmptyTotals();
    let totalWeightInGrams = 0;

    // Somar contribuição de cada ingrediente
    recipe.ingredients.forEach(ingredient => {
      // Buscar dados nutricionais do ingrediente
      const nutritionData = nutritionFoods.find(food => 
        food.taco_id === ingredient.taco_id || 
        food.id === ingredient.taco_id
      );

      if (!nutritionData) {return;
      }

      // Converter quantidade para gramas
      let quantityInGrams = safeNumericValue(ingredient.quantity);
      if (ingredient.unit === 'kg') {
        quantityInGrams *= 1000;
      }

      // Adicionar ao peso total
      totalWeightInGrams += quantityInGrams;

      // Calcular contribuição do ingrediente para cada nutriente
      Object.keys(totals).forEach(nutrient => {
        if (nutritionData[nutrient] !== undefined) {
          const valuePerHundredGrams = safeNumericValue(nutritionData[nutrient]);
          const contribution = (valuePerHundredGrams * quantityInGrams) / 100;
          totals[nutrient] += contribution;
        }
      });
    });
    return { totals, totalWeightInGrams };
  };

  // Calcula nutrientes para uma porção específica da receita
  const calculateRecipeNutritionForPortion = (recipe, portionSize) => {
    const portionSizeInGrams = safeNumericValue(portionSize);
    
    if (portionSizeInGrams <= 0) {return createEmptyTotals();
    }

    // Obter valores brutos da receita
    const { totals: rawTotals, totalWeightInGrams } = calculateRecipeRawTotals(recipe);
    
    if (totalWeightInGrams <= 0) {return createEmptyTotals();
    }

    // Calcular valores para a porção
    const portionValues = createEmptyTotals();
    const scaleFactor = portionSizeInGrams / totalWeightInGrams;
    
    Object.keys(portionValues).forEach(nutrient => {
      portionValues[nutrient] = parseFloat((rawTotals[nutrient] * scaleFactor).toFixed(2));
    });
    return portionValues;
  };

  // Calcula nutrição diária baseada nas porções definidas nas receitas
  const calculateDayNutrition = (menuData, recipes) => {
    if (!menuData || !recipes || !recipes.length) {return createEmptyTotals();
    }

    const dayTotals = createEmptyTotals();

    // Para cada categoria no menu
    Object.values(menuData).forEach(categoryItems => {
      if (!Array.isArray(categoryItems)) return;
      
      categoryItems.forEach(item => {
        if (!item?.recipe_id) return;
        
        const recipe = recipes.find(r => r.id === item.recipe_id);
        if (!recipe) {return;
        }

        // Usar o tamanho da porção definido na receita
        const portionSize = safeNumericValue(recipe.portion_size) || 100;
        
        // Calcular nutrientes para a porção definida da receita
        const recipePortionNutrition = calculateRecipeNutritionForPortion(recipe, portionSize);
        
        // Somar ao total do dia
        Object.keys(dayTotals).forEach(nutrient => {
          dayTotals[nutrient] += recipePortionNutrition[nutrient] || 0;
        });
      });
    });

    // Arredondar valores finais
    Object.keys(dayTotals).forEach(key => {
      dayTotals[key] = parseFloat(dayTotals[key].toFixed(2));
    });

    return dayTotals;
  };

  // Calcula nutrição para um local específico
  const calculateLocationNutrition = (menuData, locationId, recipes) => {
    if (!menuData || !recipes || !recipes.length || !locationId) {return createEmptyTotals();
    }

    const locationTotals = createEmptyTotals();

    // Para cada categoria no menu
    Object.values(menuData).forEach(categoryItems => {
      if (!Array.isArray(categoryItems)) return;
      
      // Processar apenas itens destinados a este local
      categoryItems
        .filter(item => item.locations?.includes(locationId))
        .forEach(item => {
          if (!item?.recipe_id) return;
          
          const recipe = recipes.find(r => r.id === item.recipe_id);
          if (!recipe) return;
          
          // Usar o tamanho da porção definido na receita
          const portionSize = safeNumericValue(recipe.portion_size) || 100;
          
          // Calcular nutrientes para a porção definida da receita
          const recipePortionNutrition = calculateRecipeNutritionForPortion(recipe, portionSize);
          
          // Somar ao total do local
          Object.keys(locationTotals).forEach(nutrient => {
            locationTotals[nutrient] += recipePortionNutrition[nutrient] || 0;
          });
        });
    });

    // Arredondar valores finais
    Object.keys(locationTotals).forEach(key => {
      locationTotals[key] = parseFloat(locationTotals[key].toFixed(2));
    });

    return locationTotals;
  };

  // Escalador de porções
  const calculatePortion = (nutritionData, portionSize = 100) => {
    if (!nutritionData) return createEmptyTotals();
    
    const portionData = createEmptyTotals();
    const factor = safeNumericValue(portionSize) / 100;
    
    Object.keys(portionData).forEach(nutrient => {
      portionData[nutrient] = parseFloat((safeNumericValue(nutritionData[nutrient]) * factor).toFixed(2));
    });
    
    return portionData;
  };

  return {
    loading,
    error,
    calculateDayNutrition,
    calculateRecipeNutrition: calculateRecipeNutritionForPortion,
    calculateLocationNutrition,
    calculatePortion
  };
}