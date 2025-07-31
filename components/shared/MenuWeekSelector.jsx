import React from 'react';
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { format, getWeek, getYear, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function MenuWeekSelector({ currentDate, onDateChange }) {
  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });
  const year = getYear(currentDate);
  
  const handlePrevWeek = () => {
    onDateChange(subWeeks(currentDate, 1));
  };
  
  const handleNextWeek = () => {
    onDateChange(addWeeks(currentDate, 1));
  };

  // Lidar com a seleção de data do calendário
  const handleCalendarSelect = (date) => {
    // Usar a data exatamente como foi selecionada, sem ajustar para segunda-feira
    onDateChange(date);
  };

  // Formatar intervalo de datas da semana (Segunda a Sexta)
  const formatWeekRange = () => {
    const weekStartDay = startOfWeek(currentDate, { weekStartsOn: 1 });
    const firstDay = weekStartDay; // Segunda
    const lastDay = addDays(weekStartDay, 4); // Sexta
    return `${format(firstDay, 'dd/MM')} - ${format(lastDay, 'dd/MM')}`;
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-4">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevWeek}
          className="h-11 w-11 flex-shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline"
              className="flex-1 px-4 py-2 h-11 flex flex-col items-center justify-center min-w-[200px]"
            >
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Semana {weekNumber}</span>
              </div>
              <span className="text-sm text-gray-500">{formatWeekRange()}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={handleCalendarSelect}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        <Button 
          variant="outline"
          size="icon"
          onClick={handleNextWeek}
          className="h-11 w-11 flex-shrink-0"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}