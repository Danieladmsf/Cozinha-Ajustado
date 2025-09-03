import { useCallback } from 'react';

export const useGenericUpdater = (setState, setIsDirty) => {
  return useCallback((id, updater) => {
    setState(prev => prev.map(item => 
      item.id === id ? updater(item) : item
    ));
    if (setIsDirty) {
      setIsDirty(true);
    }
  }, [setState, setIsDirty]);
};

export const usePreparationUpdater = (setPreparationsData, setIsDirty) => {
  return useCallback((prepId, updater) => {
    setPreparationsData(prev => prev.map(prep => 
      prep.id === prepId ? updater(prep) : prep
    ));
    setIsDirty(true);
  }, [setPreparationsData, setIsDirty]);
};

export const useIngredientUpdater = (setIngredientsData, setIsDirty) => {
  return useCallback((ingId, updater) => {
    setIngredientsData(prev => prev.map(ing => 
      ing.id === ingId ? updater(ing) : ing
    ));
    setIsDirty(true);
  }, [setIngredientsData, setIsDirty]);
};

export const useSubComponentUpdater = (setSubComponentsData, setIsDirty) => {
  return useCallback((scId, updater) => {
    setSubComponentsData(prev => prev.map(sc => 
      sc.id === scId ? updater(sc) : sc
    ));
    setIsDirty(true);
  }, [setSubComponentsData, setIsDirty]);
};

