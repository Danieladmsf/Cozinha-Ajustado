import { startOfWeek, getWeek } from "date-fns";

export const generateWeekKey = (date) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekNumber = getWeek(date, { weekStartsOn: 1 });
  const year = weekStart.getFullYear();
  
  return `${year}-W${weekNumber}`;
};

export const getWeekStartDate = (date) => {
  return startOfWeek(date, { weekStartsOn: 1 });
};

export const getWeekInfo = (date) => {
  const weekStart = getWeekStartDate(date);
  const weekKey = generateWeekKey(date);
  const weekNumber = getWeek(date, { weekStartsOn: 1 });
  const year = weekStart.getFullYear();
  
  return {
    weekStart,
    weekKey,
    weekNumber,
    year
  };
};