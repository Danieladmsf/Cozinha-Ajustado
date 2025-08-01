import { useState, useEffect } from 'react';
import { Customer } from "@/app/api/entities";
import { APP_CONSTANTS } from "@/lib/constants";

export const useMenuLocations = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar clientes ativos
      const customerData = await Customer.list();
      const activeCustomers = customerData
        .filter(customer => customer.active !== false) // Incluir clientes sem o campo 'active' definido
        .map(customer => ({
          id: customer.id,
          name: customer.name || customer.razao_social || `Cliente ${customer.id}`,
          order: customer.order || 0,
          active: true,
          photo: customer.photo
        }))
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

      // Se houver clientes, usar eles como locais (SEM "Todos os Clientes")
      if (activeCustomers.length > 0) {
        setLocations(activeCustomers);
      } else {
        // Fallback com locais padrão se não houver clientes (SEM "Todos os Clientes")
        setLocations([
          { id: "cliente_a", name: "Cliente A", order: 1, active: true },
          { id: "cliente_b", name: "Cliente B", order: 2, active: true },
          { id: "cliente_c", name: "Cliente C", order: 3, active: true }
        ]);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes/locais:", error);
      setError("Erro ao carregar locais de atendimento.");
      
      // Fallback em caso de erro (SEM "Todos os Clientes")
      setLocations([
        { id: "cliente_a", name: "Cliente A", order: 1, active: true },
        { id: "cliente_b", name: "Cliente B", order: 2, active: true },
        { id: "cliente_c", name: "Cliente C", order: 3, active: true }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getActiveLocationIds = () => {
    const activeIds = locations.filter(loc => loc.active).map(loc => loc.id);
    return activeIds;
  };

  const getLocationById = (id) => {
    return locations.find(loc => loc.id === id);
  };

  const getLocationName = (id) => {
    const location = getLocationById(id);
    return location ? location.name : `Local ${id}`;
  };

  const getAllClientIds = () => {
    return locations.filter(loc => loc.active).map(loc => loc.id);
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  return {
    locations,
    loading,
    error,
    fetchLocations,
    getActiveLocationIds,
    getLocationById,
    getLocationName,
    getAllClientIds,
    refreshLocations: fetchLocations
  };
};