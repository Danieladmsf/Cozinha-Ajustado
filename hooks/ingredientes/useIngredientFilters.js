import { useState, useMemo } from "react";

export function useIngredientFilters(ingredients = []) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");

  // Filtros únicos baseados nos ingredientes
  const uniqueCategories = useMemo(() => {
    return [...new Set(ingredients.map(ing => ing.category).filter(Boolean))];
  }, [ingredients]);

  const uniqueSuppliers = useMemo(() => {
    return [...new Set(ingredients.map(ing => ing.main_supplier).filter(Boolean))];
  }, [ingredients]);

  // Ingredientes filtrados
  const filteredIngredients = useMemo(() => {
    return ingredients.filter(ingredient => {
      const matchesSearch = (ingredient.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                           (ingredient.displaySupplier?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                           (ingredient.displayBrand?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || ingredient.category === categoryFilter;
      const matchesSupplier = supplierFilter === "all" || ingredient.main_supplier === supplierFilter;

      return matchesSearch && matchesCategory && matchesSupplier;
    });
  }, [ingredients, searchTerm, categoryFilter, supplierFilter]);

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setSupplierFilter("all");
  };

  return {
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    supplierFilter,
    setSupplierFilter,
    uniqueCategories,
    uniqueSuppliers,
    filteredIngredients,
    resetFilters,
    hasActiveFilters: searchTerm || categoryFilter !== "all" || supplierFilter !== "all"
  };
}