import { useEffect } from 'react';
import { useMenuLocations } from './useMenuLocations';

export const useLocationsTest = () => {
  const { locations, loading, error, getLocationById, getLocationName } = useMenuLocations();

  useEffect(() => {
    if (!loading && locations.length > 0) {
    }
    
    if (error) {
      // Error logged for development only
    }
  }, [locations, loading, error, getLocationById, getLocationName]);

  return { locations, loading, error };
};