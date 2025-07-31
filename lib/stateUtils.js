import { useCallback } from 'react';

export const createGenericUpdater = (setState, setIsDirty) => {
  return useCallback((id, updater) => {
    setState(prev => prev.map(item => 
      item.id === id ? updater(item) : item
    ));
    if (setIsDirty) {
      setIsDirty(true);
    }
  }, [setState, setIsDirty]);
};

export const createPreparationUpdater = (setPreparationsData, setIsDirty) => {
  return useCallback((prepId, updater) => {
    setPreparationsData(prev => prev.map(prep => 
      prep.id === prepId ? updater(prep) : prep
    ));
    setIsDirty(true);
  }, [setPreparationsData, setIsDirty]);
};

export const createIngredientUpdater = (setIngredientsData, setIsDirty) => {
  return useCallback((ingId, updater) => {
    setIngredientsData(prev => prev.map(ing => 
      ing.id === ingId ? updater(ing) : ing
    ));
    setIsDirty(true);
  }, [setIngredientsData, setIsDirty]);
};

export const createSubComponentUpdater = (setSubComponentsData, setIsDirty) => {
  return useCallback((scId, updater) => {
    setSubComponentsData(prev => prev.map(sc => 
      sc.id === scId ? updater(sc) : sc
    ));
    setIsDirty(true);
  }, [setSubComponentsData, setIsDirty]);
};

export const useGenericArrayUpdater = (setState, setIsDirty) => {
  const updateItem = useCallback((id, updater) => {
    setState(prev => prev.map(item => 
      item.id === id ? updater(item) : item
    ));
    if (setIsDirty) {
      setIsDirty(true);
    }
  }, [setState, setIsDirty]);

  const addItem = useCallback((newItem) => {
    setState(prev => [...prev, newItem]);
    if (setIsDirty) {
      setIsDirty(true);
    }
  }, [setState, setIsDirty]);

  const removeItem = useCallback((id) => {
    setState(prev => prev.filter(item => item.id !== id));
    if (setIsDirty) {
      setIsDirty(true);
    }
  }, [setState, setIsDirty]);

  return { updateItem, addItem, removeItem };
};