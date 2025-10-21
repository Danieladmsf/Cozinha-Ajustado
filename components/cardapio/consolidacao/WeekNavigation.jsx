import React from 'react';
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const WeekNavigation = ({ 
  weekStart, 
  weekNumber, 
  year, 
  onNavigateWeek 
}) => {
  return (
    <CardContent>
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigateWeek(-1)}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Semana Anterior
        </Button>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800">
            Semana {weekNumber}/{year}
          </h3>
          <p className="text-sm text-gray-600">
            {format(weekStart, "dd/MM")} - {format(addDays(weekStart, 6), "dd/MM/yyyy")}
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigateWeek(1)}
          className="flex items-center gap-2"
        >
          Próxima Semana
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </CardContent>
  );
};

export default WeekNavigation;