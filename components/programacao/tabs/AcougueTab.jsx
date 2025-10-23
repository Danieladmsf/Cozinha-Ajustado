'use client';

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Utensils, ChefHat, Calendar } from "lucide-react";
import { format } from "date-fns";
import { parseQuantity } from "@/components/utils/orderUtils";

// Utils
import { formatQuantityForDisplay } from "../ProgramacaoCozinhaTabs";

// Components
import PesoBrutoCalculator from "./PesoBrutoCalculator";

const AcougueTab = ({
  currentDate,
  selectedDay,
  weekNumber,
  year,
  weekDays,
  orders = [],
  recipes = [],
  dataVersion,
  globalKitchenFormat
}) => {
  // Função para formatar quantidade usando estado centralizado
  const formatQuantity = (quantity, unitType) => {
    return formatQuantityForDisplay(quantity, unitType, globalKitchenFormat);
  };

  // Função para extrair e consolidar carnes por tipo
  const consolidateCarnes = useMemo(() => {
    if (!orders.length || !recipes.length) return {};

    // Filtrar pedidos do dia selecionado
    const dayOrders = orders.filter(order => order.day_of_week === selectedDay);
    
    if (!dayOrders.length) return {};

    // Consolidar por receita de carne
    const carnesPorReceita = {};

    dayOrders.forEach(order => {
      // Processar cada item do pedido
      order.items?.forEach(item => {
        const recipe = recipes.find(r => r.id === item.recipe_id);

        // Verificar se é item de carne pela categoria
        if (recipe && recipe.category?.toLowerCase().includes('carne')) {
          const recipeName = recipe.name;
          const quantity = parseQuantity(item.quantity); // Normalizar quantidade
          const unitType = item.unit_type || recipe.unit_type;

          // Usar o nome da receita como chave (dinâmico)
          if (!carnesPorReceita[recipeName]) {
            carnesPorReceita[recipeName] = {};
          }

          // Inicializar cliente se não existir
          const customerName = order.customer_name;
          if (!carnesPorReceita[recipeName][customerName]) {
            carnesPorReceita[recipeName][customerName] = {
              quantity: 0,
              unitType: unitType,
              items: []
            };
          }

          // CORRIGIDO: Somar quantidade ao invés de substituir
          carnesPorReceita[recipeName][customerName].quantity += quantity;

          // Arredondar para evitar problemas de precisão flutuante
          carnesPorReceita[recipeName][customerName].quantity =
            Math.round(carnesPorReceita[recipeName][customerName].quantity * 100) / 100;

          carnesPorReceita[recipeName][customerName].items.push({
            recipeName,
            quantity,
            unitType,
            notes: item.notes || ''
          });
        }
      });
    });

    return carnesPorReceita;
  }, [orders, recipes, selectedDay, dataVersion]);

  // Calcular totais por tipo de carne
  const calcularTotais = (clientes) => {
    let totalQuantity = 0;
    let unitType = '';

    Object.values(clientes).forEach(data => {
      totalQuantity += data.quantity;
      if (!unitType) unitType = data.unitType;
    });

    // Arredondar para evitar problemas de precisão flutuante (ex: 2.8000000000000003)
    totalQuantity = Math.round(totalQuantity * 100) / 100;

    return { totalQuantity, unitType };
  };

  const selectedDayInfo = weekDays?.find(d => d.dayNumber === selectedDay);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Utensils className="w-6 h-6" />
              PORCIONAMENTO CARNES - {selectedDayInfo?.fullDate || format(currentDate, 'dd/MM')}
            </CardTitle>
          </div>
        </CardHeader>
      </Card>

      {/* Conteúdo das carnes */}
      {Object.keys(consolidateCarnes).length === 0 ? (
        <Card className="border-2 border-dashed border-red-300">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h3 className="font-semibold text-lg text-red-700 mb-2">
              Nenhum Item de Carne Encontrado
            </h3>
            <p className="text-red-600 text-sm">
              Não há receitas da categoria "Carnes" para o dia selecionado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-red-500 shadow-lg bg-white">
          <CardContent className="p-8">
            <div className="space-y-8">
              {Object.entries(consolidateCarnes).map(([nomeReceita, clientes], index) => {
                const { totalQuantity, unitType } = calcularTotais(clientes);
                
                return (
                  <div key={nomeReceita}>
                    {/* Número e nome da receita */}
                    <div className="mb-4">
                      <h2 className="text-xl font-bold text-gray-900 mb-3">
                        {index + 1}. {nomeReceita.toUpperCase()}
                      </h2>
                    </div>
                    
                    {/* Lista de clientes */}
                    <div className="space-y-2 ml-4">
                      {Object.entries(clientes).map(([customerName, data]) => {
                        const hasNotes = data.items.some(item => item.notes && item.notes.trim());
                        
                        return (
                          <div key={customerName} className="flex items-center gap-3">
                            <span className="font-semibold text-gray-800 min-w-[80px] text-left">
                              {customerName.toUpperCase()}
                            </span>
                            <span className="text-gray-500">→</span>
                            <span className="font-bold text-gray-900 min-w-[100px]">
                              {formatQuantity(data.quantity, data.unitType)}
                            </span>
                            {hasNotes && (
                              <div className="text-sm text-gray-600 italic">
                                {data.items
                                  .filter(item => item.notes && item.notes.trim())
                                  .map((item, idx) => (
                                    <span key={idx}>({item.notes.trim()})</span>
                                  ))
                                }
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Total por receita */}
                      <div className="mt-3 pt-2 border-t border-red-200">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-red-800 min-w-[80px]">
                            TOTAL:
                          </span>
                          <span className="font-bold text-red-900 text-lg">
                            {formatQuantity(totalQuantity, unitType)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Peso Bruto */}
      <PesoBrutoCalculator 
        orders={orders}
        recipes={recipes}
        selectedDay={selectedDay}
        weekDays={weekDays}
        currentDate={currentDate}
        globalKitchenFormat={globalKitchenFormat}
        dataVersion={dataVersion}
      />
    </div>
  );
};

export default AcougueTab;