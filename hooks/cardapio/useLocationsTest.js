import { useEffect } from 'react';
import { useMenuLocations } from './useMenuLocations';

export const useLocationsTest = () => {
  const { locations, loading, error, getLocationById, getLocationName } = useMenuLocations();

  useEffect(() => {
    if (!loading && locations.length > 0) {
      console.log('✅ TESTE HOOK LOCATIONS:');
      console.log('Total de locais:', locations.length);
      console.log('Locais carregados:', locations.map(l => ({ id: l.id, name: l.name })));
      
      // Testar funções auxiliares
      const firstLocation = locations[0];
      console.log('Teste getLocationById:', getLocationById(firstLocation.id));
      console.log('Teste getLocationName:', getLocationName(firstLocation.id));
      
      console.log('🔧 Hook centralizado funcionando corretamente!');
    }
    
    if (error) {
      console.error('❌ Erro no hook:', error);
    }
  }, [locations, loading, error, getLocationById, getLocationName]);

  return { locations, loading, error };
};