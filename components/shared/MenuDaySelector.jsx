import React, { useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function MenuDaySelector({ 
  currentDate,
  selectedDay,
  onDaySelect,
  availableDays = [1, 2, 3, 4, 5],
  loading = false
}) {
  // Mapear dias da semana
  const dayNames = {
    1: "Segunda",
    2: "Terça",
    3: "Quarta",
    4: "Quinta",
    5: "Sexta"
  };

  // Handler otimizado para seleção de dia
  const handleDaySelect = useCallback((day) => {
    if (!loading && onDaySelect) {
      onDaySelect(day);
    }
  }, [loading, onDaySelect]);

  return (
    <div className="flex justify-between border rounded-lg overflow-hidden">
      {availableDays.map(day => {
        const isSelected = selectedDay === day;
        const date = new Date(currentDate);
        date.setDate(date.getDate() + (day - 1));

        return (
          <Button
            key={day}
            variant="ghost"
            className={cn(
              "flex-1 py-4 px-6 border-r last:border-r-0",
              "transition-colors duration-200",
              isSelected 
                ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                : "hover:bg-gray-50",
              loading && "opacity-50 cursor-not-allowed"
            )}
            disabled={loading}
            onClick={() => handleDaySelect(day)}
          >
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium">{dayNames[day]}</span>
              <span className="text-xs text-gray-500">
                {format(date, "dd/MM", { locale: ptBR })}
              </span>
            </div>
          </Button>
        );
      })}
    </div>
  );
}