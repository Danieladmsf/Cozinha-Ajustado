'use client';

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Leaf, Calendar, ChefHat } from "lucide-react";
import { format } from "date-fns";
import { parseQuantity } from "@/components/utils/orderUtils";

// Utils
import { formatQuantityForDisplay } from "../ProgramacaoCozinhaTabs";

const SaladaTab = ({
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

  // Função para extrair e consolidar saladas por ingrediente
  const consolidateSaladas = useMemo(() => {
    if (!orders.length || !recipes.length) return {};

    // Filtrar pedidos do dia selecionado
    const dayOrders = orders.filter(order => order.day_of_week === selectedDay);
    
    if (!dayOrders.length) return {};

    // Consolidar por ingrediente
    const saladaIngredientes = {};

    dayOrders.forEach(order => {
      // Processar cada item do pedido
      order.items?.forEach(item => {
        const recipe = recipes.find(r => r.id === item.recipe_id);

        if (recipe && recipe.category?.toLowerCase().includes('salada')) {
          const recipeName = recipe.name;
          const quantity = parseQuantity(item.quantity); // Normalizar quantidade
          const unitType = item.unit_type || recipe.unit_type;

          // Usar o nome da receita diretamente (totalmente dinâmico)
          if (!saladaIngredientes[recipeName]) {
            saladaIngredientes[recipeName] = {};
          }

          // Inicializar cliente se não existir
          const customerName = order.customer_name;
          if (!saladaIngredientes[recipeName][customerName]) {
            saladaIngredientes[recipeName][customerName] = {
              quantity: 0,
              unitType: unitType,
              items: []
            };
          }

          // CORRIGIDO: Somar quantidade ao invés de substituir
          saladaIngredientes[recipeName][customerName].quantity += quantity;

          // Arredondar para evitar problemas de precisão flutuante
          saladaIngredientes[recipeName][customerName].quantity =
            Math.round(saladaIngredientes[recipeName][customerName].quantity * 100) / 100;

          saladaIngredientes[recipeName][customerName].items.push({
            recipeName,
            quantity,
            unitType,
            notes: item.notes || '' // Capturar observações do item
          });
        }
      });
    });

    return saladaIngredientes;
  }, [orders, recipes, selectedDay, dataVersion]);

  const selectedDayInfo = weekDays?.find(d => d.dayNumber === selectedDay);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Leaf className="w-6 h-6" />
              SALADAS - {selectedDayInfo?.fullDate || format(currentDate, 'dd/MM')}
            </CardTitle>
          </div>
        </CardHeader>
      </Card>

      {/* Conteúdo das saladas */}
      {Object.keys(consolidateSaladas).length === 0 ? (
        <Card className="border-2 border-dashed border-green-300">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-green-400" />
            <h3 className="font-semibold text-lg text-green-700 mb-2">
              Nenhum Item de Salada Encontrado
            </h3>
            <p className="text-green-600 text-sm">
              Não há receitas da categoria "Saladas" para o dia selecionado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-green-500 shadow-lg bg-white">
          <CardContent className="p-8">
            <div className="space-y-8">
              {Object.entries(consolidateSaladas).map(([nomeReceita, clientes], index) => (
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
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SaladaTab;