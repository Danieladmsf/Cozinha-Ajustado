import React from 'react';
import MenuWeekSelector from "@/components/shared/MenuWeekSelector";
import { getWeek, getYear } from "date-fns";

const MenuHeader = ({ 
  currentDate, 
  onDateChange, 
  rightContent = null 
}) => {
  return (
    <div className="px-6 py-4">
      <div className="flex justify-center items-center relative">
        {/* Centered Week Navigation */}
        <MenuWeekSelector 
          currentDate={currentDate}
          onDateChange={onDateChange}
          weekNumber={getWeek(currentDate, { weekStartsOn: 1 })}
          year={getYear(currentDate)}
          compact={true}
        />

        {/* Additional content positioned on the right */}
        {rightContent && (
          <div className="absolute right-0 flex items-center">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuHeader;