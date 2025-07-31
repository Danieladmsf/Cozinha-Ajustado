import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Circle } from "lucide-react";

const OrderHeader = React.memo(({
  weekNumber,
  year,
  isDirty,
  saving,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek
}) => {
  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={onPreviousWeek}
        className="hover:bg-blue-50 hover:text-blue-700 border-blue-200"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Anterior
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onCurrentWeek}
        className="hover:bg-blue-50 hover:text-blue-700 border-blue-200"
      >
        <Calendar className="h-4 w-4 mr-1" />
        Hoje
      </Button>
      
      <div className="relative px-4 py-2 bg-blue-50 border border-blue-100 rounded-md text-sm font-medium text-blue-800 shadow-sm">
        Semana {weekNumber}/{year}
        {(isDirty || saving) && (
          <div className="absolute -top-1 -right-1">
            {saving ? (
              <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full bg-white"></div>
            ) : (
              <Circle className="w-3 h-3 fill-blue-500 text-blue-500" />
            )}
          </div>
        )}
      </div>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={onNextWeek}
        className="hover:bg-blue-50 hover:text-blue-700 border-blue-200"
      >
        Próxima
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
});

OrderHeader.displayName = 'OrderHeader';

export default OrderHeader;