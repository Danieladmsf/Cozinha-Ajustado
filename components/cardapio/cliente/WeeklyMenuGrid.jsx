'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { renderFormattedRecipeName } from '@/lib/textHelpers';

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
  getCategoryColor
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {[1, 2, 3, 4, 5].map(day => {
        const dayDate = addDays(weekStart, day - 1);
        const dayItems = weeklyMenu?.menu_data[day] || {};

        return (
          <Card key={day} className="overflow-hidden border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
            <CardHeader className="bg-gradient-to-br from-blue-500 to-blue-600 py-5 text-center border-b border-blue-600/20">
              <CardTitle className="space-y-1">
                <div className="text-lg font-bold text-white">
                  {dayNames[day]}
                </div>
                <div className="text-sm text-blue-100 font-medium">
                  {format(dayDate, 'dd/MM', { locale: ptBR })}
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 min-h-[300px] bg-gradient-to-b from-white to-gray-50/30">
              {activeCategories.map(category => {
                const items = dayItems[category.id] || [];
                const filteredItems = getFilteredItemsForClient(items, category.id, selectedCustomer?.id);

                if (!filteredItems.length) return null;

                return (
                  <div 
                    key={category.id} 
                    className="mb-4 last:mb-0"
                  >
                    <div 
                      className="text-sm font-bold px-4 py-3 rounded-lg mb-4 border-l-4 shadow-sm"
                      style={{ 
                        backgroundColor: `${getCategoryColor(category.id)}15`,
                        borderLeftColor: getCategoryColor(category.id),
                        color: getCategoryColor(category.id)
                      }}
                    >
                      {category.name}
                    </div>

                    <div className="space-y-3">
                      {filteredItems.map((item, idx) => {
                        const recipe = recipes.find(r => r.id === item.recipe_id);
                        if (!recipe) return null;

                        return (
                          <div 
                            key={`${category.id}-${idx}`}
                            className="px-4 py-3 text-sm rounded-lg hover:bg-white hover:shadow-md transition-all duration-200 border border-gray-100 bg-gray-50/50"
                          >
                            <span className="text-gray-800 font-medium leading-relaxed">
                              {renderFormattedRecipeName(recipe.name)}
                            </span>
                          </div>
                        );
                      })}
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
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Package className="h-16 w-16 mb-4 text-gray-300" />
                  <p className="text-sm text-center leading-relaxed font-medium">
                    {!selectedCustomer || selectedCustomer.id === 'all'
                      ? 'Nenhum item cadastrado'
                      : 'Sem itens para este cliente'
                    }
                  </p>
                  <p className="text-xs text-gray-400 mt-1">neste dia</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}