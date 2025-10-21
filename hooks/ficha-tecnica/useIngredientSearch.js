import { useState, useEffect, useCallback } from 'react';
import { Ingredient } from '@/app/api/entities';
import { useToast } from '@/components/ui';

/**
 * Hook para gerenciar busca e seleção de ingredientes
 * Carrega ingredientes da coleção Ingredient para uso nas preparações
 */
export function useIngredientSearch() {
  const { toast } = useToast();
  
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredIngredients, setFilteredIngredients] = useState([]);

  // Carregar todos os ingredientes via API
  const loadIngredients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ingredients?active=true');
      const allIngredients = await response.json();
      
      if (!response.ok) {
        throw new Error(allIngredients.error || 'Erro ao carregar ingredientes');
      }
      
      setIngredients(allIngredients);
    } catch (error) {
      toast({
        title: "Erro ao carregar ingredientes",
        description: "Não foi possível carregar a lista de ingredientes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Filtrar ingredientes baseado no termo de busca
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredIngredients([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = ingredients.filter(ingredient => {
      const name = ingredient.name?.toLowerCase() || '';
      const brand = ingredient.brand?.toLowerCase() || '';
      const category = ingredient.category?.toLowerCase() || '';
      
      return name.includes(term) || 
             brand.includes(term) || 
             category.includes(term);
    });

    // Ordenar por relevância (nome primeiro, depois marca, depois categoria)
    filtered.sort((a, b) => {
      const aName = a.name?.toLowerCase() || '';
      const bName = b.name?.toLowerCase() || '';
      
      // Prioridade para ingredientes que começam com o termo
      if (aName.startsWith(term) && !bName.startsWith(term)) return -1;
      if (!aName.startsWith(term) && bName.startsWith(term)) return 1;
      
      // Ordem alfabética
      return aName.localeCompare(bName, 'pt-BR');
    });

    setFilteredIngredients(filtered);
  }, [searchTerm, ingredients]);

  // Buscar ingrediente por ID
  const getIngredientById = useCallback((id) => {
    return ingredients.find(ingredient => ingredient.id === id);
  }, [ingredients]);

  // Atualizar termo de busca
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  // Carregar ingredientes ao montar o componente
  useEffect(() => {
    loadIngredients();
  }, [loadIngredients]);

  return {
    // Estado
    ingredients,
    loading,
    searchTerm,
    filteredIngredients,
    
    // Ações
    handleSearchChange,
    loadIngredients,
    getIngredientById,
    
    // Utilitários
    clearSearch: () => setSearchTerm('')
  };
}