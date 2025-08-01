'use client';

import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import MenuHeader from '@/components/shared/MenuHeader';
import MenuNotes from '@/components/shared/MenuNotes';
import MenuNoteDialog from '@/components/shared/MenuNoteDialog';
import SectionContainer, { Section } from '@/components/shared/SectionContainer';
import { useMenuData } from '@/hooks/cardapio/useMenuData';
import { 
  useMenuLocations,
  useLocationSelection,
  useWeeklyMenuOperations,
  useMenuInterface,
  useMenuNotes,
  useMenuNoteActions,
  useMenuHelpers
} from '@/hooks/cardapio';

// Componentes UI separados
import WeekDaySelector from './WeekDaySelector';
import CategoryMenuCard from './CategoryMenuCard';
import LocationCheckboxGroup from './LocationCheckboxGroup';

export default function WeeklyMenuComponent() {
  // Hooks de estado e dados
  const menuInterface = useMenuInterface();
  const { locations, loading: locationsLoading, getActiveLocationIds, getAllClientIds } = useMenuLocations();
  const locationSelection = useLocationSelection(getAllClientIds());
  const menuOperations = useWeeklyMenuOperations();
  const menuHelpers = useMenuHelpers();
  
  const {
    categories,
    recipes,
    weeklyMenu,
    customers,
    menuConfig,
    loading,
    setWeeklyMenu,
    loadWeeklyMenu
  } = useMenuData(menuInterface.currentDate);

  const menuNotes = useMenuNotes(menuInterface.currentDate);
  const noteActions = useMenuNoteActions(menuNotes, categories, recipes);

  // Effects para validação e configuração inicial
  useEffect(() => {
    if (menuConfig?.available_days && !menuConfig.available_days.includes(menuInterface.currentDayIndex)) {
      const firstAvailableDay = menuConfig.available_days[0];
      if (firstAvailableDay) {
        menuInterface.setCurrentDayIndex(firstAvailableDay);
      }
    }
  }, [menuConfig?.available_days, menuInterface.currentDayIndex]);

  // Estado para controlar se já aplicamos as configurações iniciais
  const [hasAppliedInitialConfig, setHasAppliedInitialConfig] = React.useState(false);

  useEffect(() => {
    if (menuConfig?.expanded_categories && menuConfig.expanded_categories.length > 0 && !hasAppliedInitialConfig) {
      menuConfig.expanded_categories.forEach(categoryId => {
        if (!menuInterface.isLocationVisible(categoryId)) {
          menuInterface.toggleLocationVisibility(categoryId);
        }
      });
      setHasAppliedInitialConfig(true);
    }
  }, [menuConfig?.expanded_categories, hasAppliedInitialConfig]);



  // Handlers e funções utilitárias
  const handleDateChange = (newDate) => {
    menuInterface.handleDateChange(newDate, loadWeeklyMenu);
  };

  const getActiveCategories = () => menuHelpers.getActiveCategories(categories, menuConfig);
  const getCategoryColor = (categoryId) => menuHelpers.getCategoryColor(categoryId, categories, menuConfig);
  const getAvailableDays = () => menuConfig?.available_days || [1, 2, 3, 4, 5];

  // Operações de menu
  const handleMenuItemChange = async (dayIndex, categoryId, itemIndex, newItem) => {
    try {
      let currentMenu = weeklyMenu;
      if (!currentMenu) {
        currentMenu = await menuOperations.createWeeklyMenu(menuInterface.currentDate);
        setWeeklyMenu(currentMenu);
      }
      
      const updatedMenu = await menuOperations.updateMenuItem(currentMenu, dayIndex, categoryId, itemIndex, newItem);
      setWeeklyMenu(updatedMenu);
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
    }
  };

  const createWeeklyMenu = async () => {
    const newMenu = await menuOperations.createWeeklyMenu(menuInterface.currentDate);
    setWeeklyMenu(newMenu);
    return newMenu;
  };

  const addMenuItem = async (dayIndex, categoryId) => {
    try {
      const updatedMenu = await menuOperations.addMenuItem(weeklyMenu, dayIndex, categoryId, createWeeklyMenu, getActiveLocationIds);
      if (updatedMenu) {
        setWeeklyMenu(updatedMenu);
      }
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
    }
  };

  const removeMenuItem = async (dayIndex, categoryId, itemIndex) => {
    try {
      const updatedMenu = await menuOperations.removeMenuItem(weeklyMenu, dayIndex, categoryId, itemIndex);
      if (updatedMenu) {
        setWeeklyMenu(updatedMenu);
      }
    } catch (error) {
      console.error('Erro ao remover item:', error);
    }
  };

  // Handlers de interface
  const handleOpenChange = (categoryId, itemIndex, open) => {
    menuInterface.handleOpenChange(categoryId, itemIndex, open);
    if (!open) {
      menuInterface.clearSearchTerm(categoryId, itemIndex);
    }
  };

  const toggleLocationVisibility = (categoryId) => {
    menuInterface.toggleLocationVisibility(categoryId);
  };

  const handleLocationChange = async (dayIndex, categoryId, itemIndex, locationId, checked) => {
    try {
      const currentItem = weeklyMenu?.menu_data[dayIndex]?.[categoryId]?.[itemIndex];
      const currentLocations = currentItem?.locations || [];
      
      let newLocations;
      
      if (locationId === 'select-all') {
        newLocations = checked ? locationSelection.selectAll() : locationSelection.unselectAll();
      } else {
        newLocations = locationSelection.toggleLocation(currentLocations, locationId, checked);
      }
      
      await handleMenuItemChange(dayIndex, categoryId, itemIndex, { locations: newLocations });
    } catch (error) {
      console.error('Erro ao alterar localização:', error);
    }
  };

  // Loading state
  if (loading || !categories || !recipes) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Menu Principal */}
          <div className="flex-1 space-y-6">
            {/* Header Section */}
            <SectionContainer 
              variant="gradient"
              className="border-0 shadow-lg"
            >
              <MenuHeader 
                currentDate={menuInterface.currentDate}
                onDateChange={handleDateChange}
              />
            </SectionContainer>
            
            {/* Seletor de Dias Section */}
            <SectionContainer 
              title="Navegação Semanal"
              variant="elevated"
              className="border-blue-200"
            >
              <WeekDaySelector
                currentDate={menuInterface.currentDate}
                currentDayIndex={menuInterface.currentDayIndex}
                availableDays={getAvailableDays()}
                onDayChange={menuInterface.setCurrentDayIndex}
              />
            </SectionContainer>

            {/* Cards de Categorias Section */}
            <SectionContainer 
              title="Itens do Cardápio"
              subtitle={`Configuração dos itens para ${['', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'][menuInterface.currentDayIndex] || 'dia selecionado'}`}
              variant="gradient"
            >
              <div className="space-y-6">
                {getActiveCategories().map(category => {
                  if (!category) return null;

                  const categoryItems = weeklyMenu?.menu_data[menuInterface.currentDayIndex]?.[category.id] || [];
                  const fixedDropdowns = menuConfig?.fixed_dropdowns?.[category.id] || 0;
                  const items = menuHelpers.ensureMinimumItems(categoryItems, fixedDropdowns);
                  const categoryColor = getCategoryColor(category.id);

                  return (
                    <div 
                      key={category.id}
                      className="p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <CategoryMenuCard
                        category={category}
                        items={items}
                        categoryColor={categoryColor}
                        isLocationVisible={menuInterface.isLocationVisible(category.id)}
                        onToggleLocationVisibility={() => toggleLocationVisibility(category.id)}
                        onMenuItemChange={handleMenuItemChange}
                        onAddMenuItem={() => addMenuItem(menuInterface.currentDayIndex, category.id)}
                        onRemoveMenuItem={(itemIndex) => removeMenuItem(menuInterface.currentDayIndex, category.id, itemIndex)}
                        recipes={recipes}
                        menuHelpers={menuHelpers}
                        menuInterface={menuInterface}
                        noteActions={noteActions}
                        currentDayIndex={menuInterface.currentDayIndex}
                        renderLocationCheckboxes={(itemIndex, item) => (
                          <div className="mt-3 p-3 bg-gray-50/50 rounded-lg border border-gray-200/30">
                            <LocationCheckboxGroup
                              locations={locations}
                              item={item}
                              locationSelection={locationSelection}
                              onLocationChange={(locationId, checked) => 
                                handleLocationChange(menuInterface.currentDayIndex, category.id, itemIndex, locationId, checked)
                              }
                              categoryId={category.id}
                              itemIndex={itemIndex}
                            />
                          </div>
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </SectionContainer>
          </div>
          
          {/* Sidebar de Observações */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-6">
              <SectionContainer 
                title="Observações"
                subtitle="Notas e lembretes do cardápio"
                variant="elevated"
                className="border-amber-200"
              >
                <MenuNotes
                  notes={menuNotes.notes}
                  currentDate={menuInterface.currentDate}
                  currentDayIndex={menuInterface.currentDayIndex}
                  onNotesChange={menuNotes.setNotes}
                  onEdit={noteActions.startEditingNote}
                  onDelete={noteActions.deleteNote}
                  onToggleImportant={noteActions.toggleNoteImportance}
                  categoryColors={categories?.reduce((acc, cat) => {
                    acc[cat.id] = menuHelpers.getCategoryColor(cat.id, categories, menuConfig);
                    return acc;
                  }, {}) || {}}
                />
              </SectionContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de Observações */}
      <MenuNoteDialog
        isOpen={noteActions.isAddingNote || noteActions.isEditingNote}
        onClose={noteActions.cancelNoteOperation}
        onSave={noteActions.saveNote}
        isEditing={noteActions.isEditingNote}
        noteData={noteActions.currentNoteData}
        formData={noteActions.noteForm}
        onContentChange={noteActions.updateNoteContent}
        onToggleImportant={noteActions.toggleNoteFormImportance}
      />
    </div>
  );
}