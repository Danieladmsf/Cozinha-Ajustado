'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const dayNames = {
  1: "Segunda",
  2: "Terça", 
  3: "Quarta",
  4: "Quinta",
  5: "Sexta"
};

export default function WeekDaySelector({ 
  currentDate, 
  currentDayIndex, 
  availableDays, 
  onDayChange 
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
      <div className={`grid divide-x divide-gray-100 ${
        availableDays.length <= 3 ? 'grid-cols-3' : 
        availableDays.length === 4 ? 'grid-cols-4' : 
        'grid-cols-5'
      }`}>
        {availableDays.map(day => {
          const isSelected = currentDayIndex === day;
          const dayDate = addDays(weekStart, day - 1);

          return (
            <button
              key={day}
              onClick={() => onDayChange(day)}
              className={cn(
                "py-6 px-4 relative group transition-all duration-200 hover:bg-gray-50",
                isSelected && "bg-blue-50"
              )}
            >
              <div className="flex flex-col items-center space-y-1">
                <span className={cn(
                  "text-sm font-medium transition-colors",
                  isSelected ? "text-blue-600" : "text-gray-600"
                )}>
                  {dayNames[day]}
                </span>
                
                <span className={cn(
                  "text-3xl font-bold transition-colors",
                  isSelected ? "text-blue-600" : "text-gray-900"
                )}>
                  {format(dayDate, 'dd')}
                </span>
                
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  {format(dayDate, 'MMM', { locale: ptBR })}
                </span>
              </div>
              
              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}