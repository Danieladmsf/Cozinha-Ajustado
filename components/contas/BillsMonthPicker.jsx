import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BillsMonthPicker({ currentMonth, onChange }) {
  const handlePreviousMonth = () => {
    onChange(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    onChange(addMonths(currentMonth, 1));
  };

  return (
    <div className="flex items-center gap-2 justify-center md:justify-start">
      <Button 
        variant="outline" 
        size="icon"
        onClick={handlePreviousMonth}
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center bg-white border rounded-md px-3 py-1.5 gap-2">
        <Calendar className="h-4 w-4 text-blue-500" />
        <span className="font-medium">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
      </div>
      
      <Button 
        variant="outline" 
        size="icon"
        onClick={handleNextMonth}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}