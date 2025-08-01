import { useState, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { OrderWaste } from "@/app/api/entities";
import { getWeekInfo } from "../shared/weekUtils";

export const useSobrasOperations = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const saveWasteRecord = useCallback(async (wasteData, dayIndex, customerId, currentDate) => {
    try {
      setLoading(true);
      const { weekStart, weekNumber, year } = getWeekInfo(currentDate);

      // Buscar registro existente
      const existingWastes = await OrderWaste.query([
        { field: 'customer_id', operator: '==', value: customerId },
        { field: 'week_number', operator: '==', value: weekNumber },
        { field: 'year', operator: '==', value: year },
        { field: 'day_of_week', operator: '==', value: dayIndex }
      ]);

      const existingWaste = existingWastes.length > 0 ? existingWastes[0] : null;

      // Verificar se é um registro vazio (para deletar)
      const isEmpty = (
        !wasteData.items ||
        wasteData.items.every(item => 
          (item.internal_waste_quantity || 0) === 0 && 
          (item.client_returned_quantity || 0) === 0
        )
      ) && (!wasteData.notes || wasteData.notes.trim() === '');

      if (existingWaste) {
        if (isEmpty) {
          // Deletar registro vazio
          await OrderWaste.delete(existingWaste.id);
          toast({ 
            description: "Registro de sobra vazio foi removido.",
            className: "border-amber-200 bg-amber-50 text-amber-800"
          });
        } else {
          // Atualizar registro existente
          await OrderWaste.update(existingWaste.id, {
            ...wasteData,
            customer_id: customerId,
            week_number: weekNumber,
            year: year,
            day_of_week: dayIndex,
            date: new Date(weekStart.getTime() + (dayIndex - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          });
          toast({ 
            description: "Sobras atualizadas com sucesso!",
            className: "border-green-200 bg-green-50 text-green-800"
          });
        }
      } else {
        if (!isEmpty) {
          // Criar novo registro
          await OrderWaste.create({
            ...wasteData,
            customer_id: customerId,
            week_number: weekNumber,
            year: year,
            day_of_week: dayIndex,
            date: new Date(weekStart.getTime() + (dayIndex - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          });
          toast({ 
            description: "Sobras registradas com sucesso!",
            className: "border-green-200 bg-green-50 text-green-800"
          });
        }
      }

      return { success: true };
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Erro ao Salvar Sobras", 
        description: error.message 
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteWasteRecord = useCallback(async (wasteId) => {
    try {
      setLoading(true);
      await OrderWaste.delete(wasteId);
      toast({ 
        description: "Registro de sobra removido com sucesso!",
        className: "border-green-200 bg-green-50 text-green-800"
      });
      return { success: true };
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Erro ao Deletar Sobra", 
        description: error.message 
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    saveWasteRecord,
    deleteWasteRecord
  };
};