'use client';

import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import MenuHeader from '@/components/shared/MenuHeader';
import SectionContainer from '@/components/shared/SectionContainer';
import { useSobrasData } from '@/hooks/sobras/useSobrasData';
import { 
  useSobrasInterface,
  useSobrasOperations,
  useSobrasHelpers
} from '@/hooks/sobras';

// Componentes UI separados
import WeekDaySelector from './WeekDaySelector';
import CustomerSelector from './CustomerSelector';
import SobrasWasteRegister from './SobrasWasteRegister';

export default function SobrasRegistroComponent() {
  // Hooks de estado e dados
  const sobrasInterface = useSobrasInterface();
  const sobrasOperations = useSobrasOperations();
  const sobrasHelpers = useSobrasHelpers();
  
  const {
    customers,
    recipes,
    weeklyMenus,
    orders,
    wasteHistory,
    loading,
    loadWeekData
  } = useSobrasData(sobrasInterface.currentDate);

  // Handlers e funções utilitárias
  const handleDateChange = (newDate) => {
    sobrasInterface.handleDateChange(newDate, loadWeekData);
  };

  const getAvailableDays = () => [1, 2, 3, 4, 5]; // Segunda a sexta

  const getMenuForDay = (day) => {
    if (!weeklyMenus || weeklyMenus.length === 0) return null;
    const menu = weeklyMenus[0]; // Assume que há apenas um menu por semana
    if (!menu?.menu_data || !menu.menu_data[day]) return null;
    return menu;
  };

  const getWasteRecord = (customerId, dayIndex) => {
    if (!customerId || !wasteHistory) return null;
    return wasteHistory.find(waste => 
      waste.customer_id === customerId &&
      waste.day_of_week === dayIndex &&
      waste.week_number === sobrasHelpers.getWeekNumber(sobrasInterface.currentDate) &&
      waste.year === sobrasHelpers.getYear(sobrasInterface.currentDate)
    );
  };

  const handleWasteChange = async (wasteData, dayIndex, customerId) => {
    try {
      await sobrasOperations.saveWasteRecord(
        wasteData, 
        dayIndex, 
        customerId, 
        sobrasInterface.currentDate
      );
      // Recarregar dados após salvar
      await loadWeekData(sobrasInterface.currentDate);
    } catch (error) {
      // Error saving leftovers data
    }
  };

  // Loading state
  if (loading || !customers || !recipes) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        <span className="ml-3 text-amber-700">Carregando dados...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar de Clientes */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-6">
              <SectionContainer 
                title="Clientes"
                subtitle="Selecione um cliente"
                variant="elevated"
                className="border-amber-200"
              >
                <CustomerSelector
                  customers={customers}
                  selectedCustomer={sobrasInterface.selectedCustomer}
                  onCustomerChange={sobrasInterface.setSelectedCustomer}
                  searchTerm={sobrasInterface.searchTerm}
                  onSearchChange={sobrasInterface.setSearchTerm}
                />
              </SectionContainer>
            </div>
          </div>
          
          {/* Área Principal */}
          <div className="flex-1 space-y-6">
            {/* Header Section */}
            <SectionContainer 
              variant="gradient"
              className="border-0 shadow-lg bg-gradient-to-r from-amber-100 to-orange-100"
            >
              <MenuHeader 
                currentDate={sobrasInterface.currentDate}
                onDateChange={handleDateChange}
                title="Registro de Sobras"
                subtitle="Gerencie as sobras por semana"
              />
            </SectionContainer>
            
            {/* Seletor de Dias Section */}
            <SectionContainer 
              title="Navegação Semanal"
              variant="elevated"
              className="border-amber-200"
            >
              <WeekDaySelector
                currentDate={sobrasInterface.currentDate}
                currentDayIndex={sobrasInterface.currentDayIndex}
                availableDays={getAvailableDays()}
                onDayChange={sobrasInterface.setCurrentDayIndex}
              />
            </SectionContainer>

            {/* Registro de Sobras Section */}
            {!sobrasInterface.selectedCustomer ? (
              <SectionContainer 
                title="Selecione um Cliente"
                variant="elevated"
                className="border-amber-200"
              >
                <div className="flex flex-col items-center justify-center py-12 text-amber-600">
                  <AlertTriangle className="h-16 w-16 mb-4 opacity-70" />
                  <p className="text-lg">Selecione um cliente para registrar sobras</p>
                  <p className="text-sm mt-2 opacity-75">
                    Use o painel lateral para escolher o cliente
                  </p>
                </div>
              </SectionContainer>
            ) : (
              <SectionContainer 
                title={`Sobras - ${sobrasInterface.selectedCustomer.name}`}
                subtitle={`${['', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'][sobrasInterface.currentDayIndex] || 'dia selecionado'}`}
                variant="gradient"
                className="bg-gradient-to-r from-amber-50 to-orange-50"
              >
                <SobrasWasteRegister
                  customer={sobrasInterface.selectedCustomer}
                  dayIndex={sobrasInterface.currentDayIndex}
                  currentDate={sobrasInterface.currentDate}
                  recipes={recipes}
                  menuData={getMenuForDay(sobrasInterface.currentDayIndex)?.menu_data?.[sobrasInterface.currentDayIndex]}
                  menu_id={getMenuForDay(sobrasInterface.currentDayIndex)?.id}
                  existingWaste={getWasteRecord(sobrasInterface.selectedCustomer.id, sobrasInterface.currentDayIndex)}
                  onWasteChange={(wasteData, dayIndex) => handleWasteChange(wasteData, dayIndex, sobrasInterface.selectedCustomer.id)}
                  orders={orders}
                />
              </SectionContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}