import React from 'react';
import { Button } from "@/components/ui/button";

const DaySelector = ({ weekDays, selectedDay, onDayChange }) => {
  return (
    <div className="flex justify-center gap-2 mb-6">
      {weekDays.map((day) => (
        <Button
          key={day.dayNumber}
          variant={selectedDay === day.dayNumber ? "default" : "outline"}
          size="sm"
          onClick={() => onDayChange(day.dayNumber)}
          className="flex flex-col h-16 w-16 p-1 text-xs hover:bg-blue-50"
        >
          <span className="font-medium">{day.dayShort}</span>
          <span className="text-xs opacity-80">{day.dayDate}</span>
        </Button>
      ))}
    </div>
  );
};

export default DaySelector;