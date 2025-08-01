import { useEffect } from 'react';
import { useMenuLocations } from './useMenuLocations';

export const useLocationsTest = () => {
  const { locations, loading, error, getLocationById, getLocationName } = useMenuLocations();

  useEffect(() => {
    if (!loading && locations.length > 0) {
    }
    
    if (error) {
      console.error('Erro no hook:', error);
    }
  }, [locations, loading, error, getLocationById, getLocationName]);

  return { locations, loading, error };
};