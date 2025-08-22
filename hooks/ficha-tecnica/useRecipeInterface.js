import { useCallback, useEffect } from 'react';
import { RecipeCalculator } from '@/lib/recipeCalculator';

/**
 * Hook para gerenciar lógicas de interface da Ficha Técnica
 * Extraído automaticamente de RecipeTechnicall.jsx
 */
export function useRecipeInterface({ recipeData, preparationsData, updateRecipeData }) {
  
  
  
  // Handlers de navegação
  const handleTabChange = useCallback((setActiveTab, newTab) => {
    setActiveTab(newTab);
  }, []);

  const handleSearchFocus = useCallback((setSearchOpen) => {
    setSearchOpen(true);
  }, []);

  const handleSearchBlur = useCallback((setSearchOpen) => {
    setTimeout(() => setSearchOpen(false), 200);
  }, []);

  // Handlers de modais
  const openModal = useCallback((setModalOpen) => {
    setModalOpen(true);
  }, []);

  const closeModal = useCallback((setModalOpen, resetFunction = null) => {
    setModalOpen(false);
    if (resetFunction) {
      resetFunction();
    }
  }, []);

  const openProcessCreatorModal = useCallback((setIsProcessCreatorOpen, setSelectedProcesses) => {
    setSelectedProcesses([]);
    setIsProcessCreatorOpen(true);
  }, []);

  const closeProcessCreatorModal = useCallback((setIsProcessCreatorOpen, setSelectedProcesses) => {
    setIsProcessCreatorOpen(false);
    setSelectedProcesses([]);
  }, []);

  // Handlers de formulário
  const handleInputChange = useCallback((setRecipeData, e) => {
    const { name, value } = e.target;
    
    // Ignorar mudanças no campo cuba_weight pois é calculado automaticamente
    if (name === 'cuba_weight') {
      return;
    }
    
    setRecipeData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleSelectChange = useCallback((setRecipeData, field, value) => {
    setRecipeData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleNumberInputChange = useCallback((setRecipeData, field, value) => {
    const numValue = parseInt(value) || 0;
    setRecipeData(prev => ({
      ...prev,
      [field]: numValue
    }));
  }, []);

  // Handlers de processo
  const handleProcessSelection = useCallback((setSelectedProcesses, processId, checked) => {
    setSelectedProcesses(prev => 
      checked 
        ? [...prev, processId]
        : prev.filter(p => p !== processId)
    );
  }, []);

  // Handlers de ações
  const handleSave = useCallback(async (
    setSaving, 
    recipeData, 
    preparationsData, 
    saveRecipe
  ) => {
    setSaving(true);
    
    try {
      const result = await saveRecipe(recipeData, preparationsData);
      return result;
    } finally {
      setSaving(false);
    }
  }, []);

  const handleClear = useCallback((resetRecipeData, resetModals, setActiveTab) => {
    resetRecipeData();
    resetModals();
    setActiveTab("ficha-tecnica");
  }, []);

  // Utilitários de interface
  const formatDisplayValue = useCallback((value, type = 'text') => {
    if (type === 'currency') {
      const num = parseFloat(value) || 0;
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(num);
    }
    
    if (type === 'weight') {
      const num = parseFloat(value) || 0;
      return num.toFixed(3).replace('.', ',');
    }
    
    if (type === 'percentage') {
      const num = parseFloat(value) || 0;
      return num.toFixed(2).replace('.', ',') + '%';
    }
    
    return value;
  }, []);

  return {
    handleTabChange,
    handleSearchFocus,
    handleSearchBlur,
    openModal,
    closeModal,
    openProcessCreatorModal,
    closeProcessCreatorModal,
    handleInputChange,
    handleSelectChange,
    handleNumberInputChange,
    handleProcessSelection,
    handleSave,
    handleClear,
    formatDisplayValue
  };
}