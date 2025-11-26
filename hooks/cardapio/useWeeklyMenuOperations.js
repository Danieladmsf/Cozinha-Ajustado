import { useState, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { WeeklyMenu as WeeklyMenuEntity } from "@/app/api/entities";
import { APP_CONSTANTS } from "@/lib/constants";
import { getWeekInfo } from "../shared/weekUtils";

export const useWeeklyMenuOperations = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createWeeklyMenu = useCallback(async (currentDate) => {
    try {
      setLoading(true);
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      const { weekStart, weekKey, weekNumber, year } = getWeekInfo(currentDate);

      // ✅ VERIFICAR SE JÁ EXISTE UM MENU PARA ESTA SEMANA
      console.log('🔍 [createWeeklyMenu] Verificando se já existe menu para semana:', weekKey);

      const existingMenus = await WeeklyMenuEntity.query([
        { field: 'user_id', operator: '==', value: mockUserId },
        { field: 'week_key', operator: '==', value: weekKey }
      ]);

      if (existingMenus && existingMenus.length > 0) {
        console.log('✅ [createWeeklyMenu] Menu já existe, retornando o existente:', existingMenus[0].id);
        return existingMenus[0];
      }

      // Só cria se não existir
      console.log('➕ [createWeeklyMenu] Criando novo menu para semana:', weekKey);

      const menuData = {
        user_id: mockUserId,
        week_key: weekKey,
        week_start: weekStart,
        menu_data: {}
      };

      const newMenu = await WeeklyMenuEntity.create(menuData);
      console.log('✅ [createWeeklyMenu] Menu criado com sucesso:', newMenu.id);

      return newMenu;
    } catch (error) {
      console.error('❌ [createWeeklyMenu] Erro ao criar menu:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMenuItem = useCallback(async (weeklyMenu, dayIndex, categoryId, itemIndex, newItem) => {
    try {

      const updatedMenu = { ...weeklyMenu };
      if (!updatedMenu.menu_data) updatedMenu.menu_data = {};
      if (!updatedMenu.menu_data[dayIndex]) updatedMenu.menu_data[dayIndex] = {};
      if (!updatedMenu.menu_data[dayIndex][categoryId]) updatedMenu.menu_data[dayIndex][categoryId] = [];

      const items = [...updatedMenu.menu_data[dayIndex][categoryId]];
      items[itemIndex] = { ...items[itemIndex], ...newItem };
      updatedMenu.menu_data[dayIndex][categoryId] = items;

      const result = await WeeklyMenuEntity.update(updatedMenu.id, { menu_data: updatedMenu.menu_data });
      
      toast({
        title: "Item atualizado",
        description: "O item do menu foi atualizado com sucesso.",
      });

      return updatedMenu;
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o item do menu.",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const addMenuItem = useCallback(async (weeklyMenu, dayIndex, categoryId, createWeeklyMenuFn, getActiveLocationIds = null) => {
    try {

      let currentMenu = weeklyMenu;
      
      if (!currentMenu) {
        currentMenu = await createWeeklyMenuFn();
      }

      const updatedMenu = { ...currentMenu };
      if (!updatedMenu.menu_data) updatedMenu.menu_data = {};
      if (!updatedMenu.menu_data[dayIndex]) updatedMenu.menu_data[dayIndex] = {};
      if (!updatedMenu.menu_data[dayIndex][categoryId]) updatedMenu.menu_data[dayIndex][categoryId] = [];

      // Selecionar todos os locais ativos por padrão para facilitar o uso
      const defaultLocations = getActiveLocationIds ? getActiveLocationIds() : [];
      
      
      const newItem = {
        recipe_id: null,
        locations: defaultLocations
      };

      updatedMenu.menu_data[dayIndex][categoryId].push(newItem);

      const result = await WeeklyMenuEntity.update(updatedMenu.id, { menu_data: updatedMenu.menu_data });
      
      toast({
        title: "Item adicionado",
        description: "O novo item foi adicionado ao menu.",
      });

      return updatedMenu;
    } catch (error) {
      throw error;
    }
  }, []);

  const removeMenuItem = useCallback(async (weeklyMenu, dayIndex, categoryId, itemIndex) => {
    try {
      if (!weeklyMenu) return null;

      const updatedMenu = { ...weeklyMenu };
      const items = [...(updatedMenu.menu_data[dayIndex]?.[categoryId] || [])];
      items.splice(itemIndex, 1);
      updatedMenu.menu_data[dayIndex][categoryId] = items;

      await WeeklyMenuEntity.update(updatedMenu.id, { menu_data: updatedMenu.menu_data });
      
      toast({
        title: "Item removido",
        description: "O item foi removido do menu.",
      });

      return updatedMenu;
    } catch (error) {
      throw error;
    }
  }, [toast]);

  const updateLocation = useCallback(async (weeklyMenu, dayIndex, categoryId, itemIndex, locationId, checked, updateMenuItemFn, getActiveLocationIds = null) => {
    try {
      if (!weeklyMenu) return null;

      const item = weeklyMenu.menu_data[dayIndex]?.[categoryId]?.[itemIndex];
      if (!item) return null;

      // Se item não tem locations, inicializar com todos os locais ativos
      let locations = item.locations;
      if (!locations || locations.length === 0) {
        locations = getActiveLocationIds ? getActiveLocationIds() : [];
      } else {
        locations = [...locations];
      }

      if (checked) {
        if (!locations.includes(locationId)) {
          locations.push(locationId);
        }
      } else {
        const index = locations.indexOf(locationId);
        if (index > -1) {
          locations.splice(index, 1);
        }
      }


      return await updateMenuItemFn(dayIndex, categoryId, itemIndex, { locations });
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    loading,
    createWeeklyMenu,
    updateMenuItem,
    addMenuItem,
    removeMenuItem,
    updateLocation
  };
};