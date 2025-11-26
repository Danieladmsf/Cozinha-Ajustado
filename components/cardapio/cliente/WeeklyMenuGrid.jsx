'use client';

import React from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { renderFormattedRecipeName } from '@/lib/textHelpers';
import { useLocationSelection } from '@/hooks/cardapio/useLocationSelection';

const dayNames = {
  1: "Segunda-feira",
  2: "Terça-feira", 
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira"
};

export default function WeeklyMenuGrid({
  currentDate,
  weeklyMenu,
  activeCategories,
  recipes,
  selectedCustomer,
  getFilteredItemsForClient,
  getCategoryColor,
  customers,
  locations,
  getAllClientIds
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const locationSelection = useLocationSelection(getAllClientIds());

  // Log para debug
  console.log('📊 [WeeklyMenuGrid] Props recebidas:', {
    currentDate: currentDate.toLocaleDateString(),
    weeklyMenu: weeklyMenu ? {
      id: weeklyMenu.id,
      weekKey: weeklyMenu.week_key,
      menuData: weeklyMenu.menu_data ? 'presente' : 'ausente',
      diasComDados: weeklyMenu.menu_data ? Object.keys(weeklyMenu.menu_data).length : 0
    } : 'null',
    activeCategories: activeCategories?.length || 0,
    recipes: recipes?.length || 0,
    selectedCustomer: selectedCustomer ? selectedCustomer.name : 'null'
  });

  // Função para obter clientes desmarcados de uma receita
  const getUncheckedClients = (item) => {
    if (!item || !item.locations || !locations) return [];
    
    return locations.filter(location => {
      const isSelected = locationSelection.isLocationSelected(item.locations, location.id);
      return !isSelected; // Retorna apenas os NÃO selecionados
    });
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(5, 1fr)', 
      gap: '12px',
      minHeight: 'auto',
      padding: '0',
      width: '100%',
      overflow: 'visible'
    }}>
      {[1, 2, 3, 4, 5].map(day => {
        const dayDate = addDays(weekStart, day - 1);
        const dayItems = weeklyMenu?.menu_data[day] || {};

        console.log(`📅 [WeeklyMenuGrid] Dia ${day} (${dayNames[day]}):`, {
          temDados: !!weeklyMenu?.menu_data?.[day],
          categorias: Object.keys(dayItems).length,
          dayItems
        });

        return (
          <div key={day} style={{ 
            border: '2px solid #000', 
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 'auto',
            height: 'auto',
            overflow: 'visible'
          }}>
            <div style={{
              borderBottom: '1px solid #ccc',
              paddingBottom: '5px',
              marginBottom: '8px',
              flexShrink: 0
            }}>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0', textAlign: 'center' }}>{dayNames[day].toUpperCase().replace('-FEIRA', '')} - {format(dayDate, 'dd/MM/yyyy', { locale: ptBR })}</h2>
            </div>

            <div style={{ flex: 1, overflow: 'visible' }}>
              {activeCategories.map((category, categoryIndex) => {
                const items = dayItems[category.id] ? Object.values(dayItems[category.id]) : [];
                const filteredItems = selectedCustomer?.id === 'all'
                  ? items
                  : getFilteredItemsForClient(items, category.id, selectedCustomer?.id);

                return (
                  <div key={category.id} style={{ marginBottom: '8px' }}>
                    <h3 style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      margin: '0 0 4px 0',
                      backgroundColor: '#f0f0f0',
                      padding: '2px 4px',
                      borderBottom: '1px solid #ccc'
                    }}>{category.name}</h3>

                    <div>
                      {filteredItems.length > 0 ? (
                        <div>
                          {filteredItems.map((item, idx) => {
                            const recipe = recipes.find(r => r.id === item.recipe_id);
                            if (!recipe) return null;

                            return (
                              <div key={`${category.id}-${idx}`}>
                                <div style={{
                                  fontSize: '10px',
                                  marginBottom: '2px',
                                  lineHeight: '1.2'
                                }}>
                                  {renderFormattedRecipeName(recipe.name)}
                                </div>
                                {selectedCustomer?.id === 'all' && getUncheckedClients(item).length > 0 && (
                                  <div style={{
                                    fontSize: '8px',
                                    color: '#d00',
                                    textDecoration: 'line-through',
                                    marginLeft: '2px',
                                    lineHeight: '1.1'
                                  }}>
                                    {getUncheckedClients(item).map(client => client.name).join(', ')}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: '10px', color: '#999' }}>-</div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Estado vazio */}
              {!Object.keys(dayItems).some(categoryId => {
                const items = dayItems[categoryId] || [];
                const filteredItems = getFilteredItemsForClient(items, categoryId, selectedCustomer?.id);
                return filteredItems.length > 0;
              }) && (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#999', 
                  fontSize: '10px',
                  marginTop: '20px'
                }}>
                  <p>
                    {!selectedCustomer || selectedCustomer.id === 'all'
                      ? 'Nenhum item cadastrado'
                      : 'Sem itens para este cliente'
                    }
                  </p>
                  <p>neste dia</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}