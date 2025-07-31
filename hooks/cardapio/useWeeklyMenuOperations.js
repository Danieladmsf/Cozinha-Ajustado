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

      console.log("🆕 CRIANDO NOVO MENU SEMANAL:", {
        currentDate,
        weekStart,
        weekKey,
        weekNumber,
        year,
        mockUserId
      });

      const menuData = {
        user_id: mockUserId,
        week_key: weekKey,
        week_start: weekStart,
        menu_data: {}
      };

      console.log("📝 Dados que serão salvos:", menuData);

      const newMenu = await WeeklyMenuEntity.create(menuData);

      console.log("✅ MENU CRIADO COM SUCESSO:", newMenu);

      return newMenu;
    } catch (error) {
      console.error("❌ ERRO AO CRIAR MENU SEMANAL:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMenuItem = useCallback(async (weeklyMenu, dayIndex, categoryId, itemIndex, newItem) => {
    try {
      console.log("🔄 ATUALIZANDO ITEM DO MENU:", {
        weeklyMenuId: weeklyMenu?.id,
        dayIndex,
        categoryId,
        itemIndex,
        newItem,
        menuDataAntes: weeklyMenu?.menu_data
      });

      const updatedMenu = { ...weeklyMenu };
      if (!updatedMenu.menu_data) updatedMenu.menu_data = {};
      if (!updatedMenu.menu_data[dayIndex]) updatedMenu.menu_data[dayIndex] = {};
      if (!updatedMenu.menu_data[dayIndex][categoryId]) updatedMenu.menu_data[dayIndex][categoryId] = [];

      const items = [...updatedMenu.menu_data[dayIndex][categoryId]];
      items[itemIndex] = { ...items[itemIndex], ...newItem };
      updatedMenu.menu_data[dayIndex][categoryId] = items;

      console.log("📝 DADOS ATUALIZADOS QUE SERÃO SALVOS:", {
        menuId: updatedMenu.id,
        menuDataDepois: updatedMenu.menu_data,
        itemAtualizado: items[itemIndex]
      });

      const result = await WeeklyMenuEntity.update(updatedMenu.id, { menu_data: updatedMenu.menu_data });

      console.log("✅ ITEM ATUALIZADO NO BANCO:", {
        result,
        menuId: updatedMenu.id,
        dayIndex,
        categoryId,
        itemIndex
      });
      
      toast({
        title: "Item atualizado",
        description: "O item do menu foi atualizado com sucesso.",
      });

      return updatedMenu;
    } catch (error) {
      console.error("❌ ERRO AO ATUALIZAR ITEM:", error);
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
      console.log("➕ ADICIONANDO ITEM AO MENU:", {
        weeklyMenuExists: !!weeklyMenu,
        weeklyMenuId: weeklyMenu?.id,
        dayIndex,
        categoryId
      });

      let currentMenu = weeklyMenu;
      
      if (!currentMenu) {
        console.log("📝 Menu não existe, criando novo...");
        currentMenu = await createWeeklyMenuFn();
      }

      const updatedMenu = { ...currentMenu };
      if (!updatedMenu.menu_data) updatedMenu.menu_data = {};
      if (!updatedMenu.menu_data[dayIndex]) updatedMenu.menu_data[dayIndex] = {};
      if (!updatedMenu.menu_data[dayIndex][categoryId]) updatedMenu.menu_data[dayIndex][categoryId] = [];

      // Selecionar todos os locais ativos por padrão para facilitar o uso
      const defaultLocations = getActiveLocationIds ? getActiveLocationIds() : [];
      
      console.log("✅ SELEÇÃO AUTOMÁTICA DE LOCAIS:", {
        defaultLocations,
        totalLocais: defaultLocations.length,
        locaisIds: defaultLocations
      });
      
      const newItem = {
        recipe_id: null,
        locations: defaultLocations
      };

      updatedMenu.menu_data[dayIndex][categoryId].push(newItem);

      console.log("📝 ADICIONANDO ITEM - DADOS QUE SERÃO SALVOS:", {
        menuId: updatedMenu.id,
        menuData: updatedMenu.menu_data,
        newItem,
        totalItemsNaCategoria: updatedMenu.menu_data[dayIndex][categoryId].length
      });

      const result = await WeeklyMenuEntity.update(updatedMenu.id, { menu_data: updatedMenu.menu_data });

      console.log("✅ ITEM ADICIONADO NO BANCO:", {
        result,
        menuId: updatedMenu.id,
        dayIndex,
        categoryId,
        totalItems: updatedMenu.menu_data[dayIndex][categoryId].length
      });
      
      toast({
        title: "Item adicionado",
        description: "O novo item foi adicionado ao menu.",
      });

      return updatedMenu;
    } catch (error) {
      console.error("❌ ERRO AO ADICIONAR ITEM:", error);
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
      console.error("Erro ao remover item:", error);
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
        console.log("🔄 INICIALIZANDO LOCATIONS:", {
          itemIndex,
          locationId,
          allActiveLocations: locations,
          action: checked ? 'manter' : 'remover'
        });
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

      console.log("💾 SALVANDO LOCATIONS:", {
        itemIndex,
        locationId,
        checked,
        finalLocations: locations
      });

      return await updateMenuItemFn(dayIndex, categoryId, itemIndex, { locations });
    } catch (error) {
      console.error("Erro ao atualizar locais:", error);
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