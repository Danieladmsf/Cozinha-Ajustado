'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DateSelector = ({ currentDate, onDateChange }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[240px] justify-start text-left font-normal">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {currentDate ? (
            format(currentDate, "MMMM yyyy", { locale: ptBR })
          ) : (
            "Selecione mês/ano"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={currentDate}
          onSelect={onDateChange}
          disabled={(date) => 
            date > new Date() || date < new Date(2020, 0, 1)
          }
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

export default DateSelector;
