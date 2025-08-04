import { useState, useCallback } from 'react';

export const useSobrasInterface = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentDayIndex, setCurrentDayIndex] = useState(1); // 1 = Segunda-feira
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleDateChange = useCallback((newDate, loadDataCallback) => {
    setCurrentDate(newDate);
    if (loadDataCallback) {
      loadDataCallback(newDate);
    }
  }, []);

  const handleCustomerChange = useCallback((customer) => {
    setSelectedCustomer(customer);
  }, []);

  const handleDayChange = useCallback((dayIndex) => {
    setCurrentDayIndex(dayIndex);
  }, []);

  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  return {
    currentDate,
    setCurrentDate,
    currentDayIndex,
    setCurrentDayIndex: handleDayChange,
    selectedCustomer,
    setSelectedCustomer: handleCustomerChange,
    searchTerm,
    setSearchTerm: handleSearchChange,
    handleDateChange,
  };
};