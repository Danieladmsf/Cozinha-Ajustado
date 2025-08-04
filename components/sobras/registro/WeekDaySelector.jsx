import React from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function WeekDaySelector({ 
  currentDate, 
  currentDayIndex, 
  availableDays = [1, 2, 3, 4, 5], 
  onDayChange 
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  
  const weekDays = availableDays.map(dayNum => {
    const date = addDays(weekStart, dayNum - 1);
    return {
      dayNumber: dayNum,
      date,
      dayName: format(date, 'EEEE', { locale: ptBR }),
      shortDayName: format(date, 'EEE', { locale: ptBR }),
      formattedDate: format(date, 'dd/MM')
    };
  });

  return (
    <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
      {weekDays.map((day) => (
        <button
          key={day.dayNumber}
          onClick={() => onDayChange(day.dayNumber)}
          className={cn(
            "flex flex-col items-center py-3 px-4 rounded-lg border-2 transition-all duration-200 min-w-[100px]",
            currentDayIndex === day.dayNumber
              ? "border-amber-500 bg-amber-100 text-amber-900 shadow-md"
              : "border-amber-200 bg-white text-amber-700 hover:border-amber-300 hover:bg-amber-50"
          )}
        >
          <span className="text-sm font-medium">{day.shortDayName}</span>
          <span className="text-xs mt-1 opacity-75">{day.formattedDate}</span>
        </button>
      ))}
    </div>
  );
}