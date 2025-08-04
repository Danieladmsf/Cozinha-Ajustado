import { useState, useCallback } from 'react';

export const useMenuInterface = () => {
  // Estados de navegação
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentDayIndex, setCurrentDayIndex] = useState(1);

  // Estados de dropdowns e buscas
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [searchTerms, setSearchTerms] = useState({});

  // Estados de visibilidade
  const [visibleLocations, setVisibleLocations] = useState({});

  // Estados de notas
  const [addingNote, setAddingNote] = useState(false);
  const [currentNoteCategoryId, setCurrentNoteCategoryId] = useState(null);
  const [currentNoteItemIndex, setCurrentNoteItemIndex] = useState(null);

  // Handlers de navegação
  const handleDateChange = useCallback((newDate, loadWeeklyMenuFn) => {
    setCurrentDate(newDate);
    if (loadWeeklyMenuFn) {
      loadWeeklyMenuFn(newDate);
    }
  }, []);

  // Handlers de dropdowns
  const handleOpenChange = useCallback((categoryId, itemIndex, open) => {
    const key = `${categoryId}-${itemIndex}`;
    setOpenDropdowns(prev => ({
      ...prev,
      [key]: open
    }));
  }, []);

  const clearSearchTerm = useCallback((categoryId, itemIndex) => {
    const searchKey = `${categoryId}-${itemIndex}-search`;
    setSearchTerms(prev => ({
      ...prev,
      [searchKey]: ''
    }));
  }, []);

  const updateSearchTerm = useCallback((categoryId, itemIndex, value) => {
    const searchKey = `${categoryId}-${itemIndex}-search`;
    setSearchTerms(prev => ({
      ...prev,
      [searchKey]: value
    }));
  }, []);

  const getSearchTerm = useCallback((categoryId, itemIndex) => {
    const searchKey = `${categoryId}-${itemIndex}-search`;
    return searchTerms[searchKey] || '';
  }, [searchTerms]);

  const isDropdownOpen = useCallback((categoryId, itemIndex) => {
    const key = `${categoryId}-${itemIndex}`;
    return openDropdowns[key] || false;
  }, [openDropdowns]);

  // Handlers de visibilidade de locais
  const toggleLocationVisibility = useCallback((categoryId) => {
    setVisibleLocations(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  }, []);

  const isLocationVisible = useCallback((categoryId) => {
    return visibleLocations[categoryId] !== undefined ? visibleLocations[categoryId] : false;
  }, [visibleLocations]);

  // Handlers de notas
  const startAddingNote = useCallback((categoryId, itemIndex) => {
    setAddingNote(true);
    setCurrentNoteCategoryId(categoryId);
    setCurrentNoteItemIndex(itemIndex);
  }, []);

  const stopAddingNote = useCallback(() => {
    setAddingNote(false);
    setCurrentNoteCategoryId(null);
    setCurrentNoteItemIndex(null);
  }, []);

  // Função para resetar estados quando trocar de página/contexto
  const resetInterface = useCallback(() => {
    setOpenDropdowns({});
    setSearchTerms({});
    setVisibleLocations({});
    setAddingNote(false);
    setCurrentNoteCategoryId(null);
    setCurrentNoteItemIndex(null);
  }, []);

  return {
    // Estados
    currentDate,
    currentDayIndex,
    addingNote,
    currentNoteCategoryId,
    currentNoteItemIndex,

    // Setters diretos
    setCurrentDate,
    setCurrentDayIndex,

    // Handlers de navegação
    handleDateChange,

    // Handlers de dropdowns
    handleOpenChange,
    clearSearchTerm,
    updateSearchTerm,
    getSearchTerm,
    isDropdownOpen,

    // Handlers de visibilidade
    toggleLocationVisibility,
    isLocationVisible,

    // Handlers de notas
    startAddingNote,
    stopAddingNote,

    // Utilitários
    resetInterface
  };
};