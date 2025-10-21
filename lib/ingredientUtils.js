// Utilitários para manipulação e processamento de ingredientes

export const processIngredients = (rawIngredients) => {
  if (!Array.isArray(rawIngredients)) return [];
  
  return rawIngredients
    .filter(ing => ing && ing.id) // Filtrar válidos
    .map(ingredient => ({
      ...ingredient,
      displayName: ingredient.name,
      displayPrice: ingredient.current_price,
      displaySupplier: ingredient.main_supplier || 'N/A',
      displayBrand: ingredient.brand || 'N/A'
    }));
};

export const filterActiveIngredients = (ingredients) => {
  return ingredients.filter(ing => ing.active !== false);
};

export const calculateStats = (ingredients) => {
  const activeIngredients = filterActiveIngredients(ingredients);
  
  return {
    total: ingredients.length,
    active: activeIngredients.length,
    traditional: activeIngredients.filter(ing =>
      ing.ingredient_type === 'traditional' || ing.ingredient_type === 'both'
    ).length,
    commercial: activeIngredients.filter(ing =>
      ing.ingredient_type === 'commercial' || ing.ingredient_type === 'both'
    ).length
  };
};

export const validateIngredient = (ingredient) => {
  const errors = [];
  
  if (!ingredient.name || ingredient.name.trim().length === 0) {
    errors.push('Nome é obrigatório');
  }
  
  if (!ingredient.unit || ingredient.unit.trim().length === 0) {
    errors.push('Unidade é obrigatória');
  }
  
  if (ingredient.current_price !== null && ingredient.current_price < 0) {
    errors.push('Preço não pode ser negativo');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sortIngredients = (ingredients, sortBy = 'name', sortOrder = 'asc') => {
  return [...ingredients].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortOrder === 'asc' ? 1 : -1;
    if (bValue == null) return sortOrder === 'asc' ? -1 : 1;
    
    // Convert to string for comparison if needed
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
    }
    if (typeof bValue === 'string') {
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
};

export const getUniqueValues = (ingredients, field) => {
  return [...new Set(ingredients.map(ing => ing[field]).filter(Boolean))].sort();
};

export const searchIngredients = (ingredients, searchTerm) => {
  if (!searchTerm) return ingredients;
  
  const term = searchTerm.toLowerCase();
  return ingredients.filter(ingredient => 
    (ingredient.name?.toLowerCase() || '').includes(term) ||
    (ingredient.displaySupplier?.toLowerCase() || '').includes(term) ||
    (ingredient.displayBrand?.toLowerCase() || '').includes(term) ||
    (ingredient.category?.toLowerCase() || '').includes(term)
  );
};