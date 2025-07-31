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
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {[1, 2, 3, 4, 5].map(day => {
        const dayDate = addDays(weekStart, day - 1);
        const dayItems = weeklyMenu?.menu_data[day] || {};

        return (
          <Card key={day} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-br from-blue-50 to-white py-4 text-center border-b">
              <CardTitle className="space-y-1">
                <div className="text-lg font-semibold text-gray-800">
                  {dayNames[day]}
                </div>
                <div className="text-sm text-gray-500 font-normal">
                  {format(dayDate, 'dd/MM', { locale: ptBR })}
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 min-h-[200px]">
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
                      className="text-sm font-semibold px-3 py-2 rounded-lg mb-3 border-l-4"
                      style={{ 
                        backgroundColor: `${getCategoryColor(category.id)}10`,
                        borderLeftColor: getCategoryColor(category.id),
                        color: getCategoryColor(category.id)
                      }}
                    >
                      {category.name}
                    </div>

                    <div className="space-y-2">
                      {filteredItems.map((item, idx) => {
                        const recipe = recipes.find(r => r.id === item.recipe_id);
                        if (!recipe) return null;

                        return (
                          <div 
                            key={`${category.id}-${idx}`}
                            className="px-3 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                          >
                            <span className="text-gray-700">
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
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Package className="h-12 w-12 mb-3 text-gray-300" />
                  <p className="text-sm text-center leading-relaxed">
                    {!selectedCustomer || selectedCustomer.id === 'all'
                      ? 'Nenhum item cadastrado para este dia'
                      : 'Nenhum item disponível para este cliente'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}