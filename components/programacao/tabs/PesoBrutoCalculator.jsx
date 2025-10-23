'use client';

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { parseQuantity } from "@/components/utils/orderUtils";

const PesoBrutoCalculator = ({ 
  orders, 
  recipes, 
  selectedDay,
  weekDays,
  currentDate,
  globalKitchenFormat,
  dataVersion
}) => {
  // Função para extrair o peso bruto por porção da receita
  const getPesoBrutoPorPorcao = (recipe) => {
    try {
      // Usar os dados corretos da ficha técnica baseado na estrutura real
      // CORRIGIDO: Usar parseQuantity para converter vírgulas em pontos
      const pesoBrutoTotal = parseQuantity(recipe.total_weight);
      const pesoPorcao = parseQuantity(recipe.portion_weight_calculated);
      const rendimentoTotal = parseQuantity(recipe.yield_weight);

      if (!pesoBrutoTotal || !pesoPorcao || !rendimentoTotal) {
        return 0;
      }

      // Calcular quantas porções o rendimento produz
      const numeroPorcoes = rendimentoTotal / pesoPorcao;

      // Peso bruto necessário por porção
      const pesoBrutoPorPorcao = pesoBrutoTotal / numeroPorcoes;


      return pesoBrutoPorPorcao;

    } catch (error) {
      return 0;
    }
  };

  // Função para calcular peso bruto necessário para cada receita de carne
  const calculatePesoBruto = useMemo(() => {
    if (!orders.length || !recipes.length) return {};

    // Filtrar pedidos do dia selecionado
    const dayOrders = orders.filter(order => order.day_of_week === selectedDay);
    
    if (!dayOrders.length) return {};

    // Consolidar carnes por receita e cliente
    const carnesConsolidadas = {};

    dayOrders.forEach(order => {
      order.items?.forEach(item => {
        const recipe = recipes.find(r => r.id === item.recipe_id);
        
        if (recipe && recipe.category?.toLowerCase().includes('carne')) {
          const recipeName = recipe.name;
          const quantity = parseQuantity(item.quantity); // quantidade de porções - CORRIGIDO: usar parseQuantity

          // Buscar dados de peso bruto da receita
          const pesoBrutoPorPorcao = getPesoBrutoPorPorcao(recipe);
          
          if (pesoBrutoPorPorcao > 0) {
            if (!carnesConsolidadas[recipeName]) {
              carnesConsolidadas[recipeName] = {};
            }

            const customerName = order.customer_name;
            if (!carnesConsolidadas[recipeName][customerName]) {
              carnesConsolidadas[recipeName][customerName] = {
                quantidadePorcoes: 0,
                pesoBrutoTotal: 0,
                pesoBrutoPorPorcao: pesoBrutoPorPorcao
              };
            }

            // CORRIGIDO: Somar quantidades ao invés de substituir
            carnesConsolidadas[recipeName][customerName].quantidadePorcoes += quantity;
            carnesConsolidadas[recipeName][customerName].pesoBrutoTotal += (quantity * pesoBrutoPorPorcao);

            // Arredondar para evitar problemas de precisão flutuante
            carnesConsolidadas[recipeName][customerName].quantidadePorcoes =
              Math.round(carnesConsolidadas[recipeName][customerName].quantidadePorcoes * 100) / 100;
            carnesConsolidadas[recipeName][customerName].pesoBrutoTotal =
              Math.round(carnesConsolidadas[recipeName][customerName].pesoBrutoTotal * 1000) / 1000;
          }
        }
      });
    });

    return carnesConsolidadas;
  }, [orders, recipes, selectedDay, getPesoBrutoPorPorcao, dataVersion]);

  // Calcular totais por receita
  const calcularTotaisPesoBruto = (clientes) => {
    let totalPorcoes = 0;
    let totalPesoBruto = 0;
    
    Object.values(clientes).forEach(data => {
      totalPorcoes += data.quantidadePorcoes;
      totalPesoBruto += data.pesoBrutoTotal;
    });

    return { totalPorcoes, totalPesoBruto };
  };

  const selectedDayInfo = weekDays?.find(d => d.dayNumber === selectedDay);

  if (Object.keys(calculatePesoBruto).length === 0) {
    // Encontrar receitas de carne do dia sem dados de peso bruto
    const dayOrders = orders.filter(order => order.day_of_week === selectedDay);
    const receitasCarnes = [];
    
    dayOrders.forEach(order => {
      order.items?.forEach(item => {
        const recipe = recipes.find(r => r.id === item.recipe_id);
        if (recipe && recipe.category?.toLowerCase().includes('carne')) {
          if (!receitasCarnes.some(r => r.name === recipe.name)) {
            receitasCarnes.push({
              name: recipe.name,
              hasData: !!(recipe.total_weight && recipe.portion_weight_calculated && recipe.yield_weight)
            });
          }
        }
      });
    });

    return (
      <Card className="border-2 border-dashed border-orange-300 mt-8">
        <CardContent className="p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-orange-400" />
          <h3 className="font-semibold text-lg text-orange-700 mb-2">
            Dados de Peso Bruto Incompletos
          </h3>
          <p className="text-orange-600 text-sm mb-4">
            As seguintes receitas de carne precisam ter a ficha técnica completa:
          </p>
          <div className="bg-orange-50 p-4 rounded-lg">
            {receitasCarnes.length > 0 ? (
              <ul className="text-left space-y-2">
                {receitasCarnes.map((receita, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className={receita.hasData ? "text-green-600" : "text-red-600"}>
                      {receita.hasData ? "✅" : "❌"}
                    </span>
                    <span className="text-orange-800">
                      {receita.name}
                    </span>
                    {!receita.hasData && (
                      <span className="text-xs text-red-600">
                        (faltam dados de peso bruto)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-orange-600">Nenhuma receita de carne encontrada para este dia.</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-red-500 shadow-lg bg-white mt-8">
      <CardHeader className="bg-gradient-to-r from-red-100 to-rose-100 border-b-2 border-red-300">
        <CardTitle className="text-xl font-bold text-red-900 text-center">
          PROGRAMAÇÃO SEMANAL AÇOUGUE - {selectedDayInfo?.fullDate || format(currentDate, 'dd/MM')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <div className="space-y-8">
          {Object.entries(calculatePesoBruto).map(([nomeReceita, clientes]) => {
            const { totalPorcoes, totalPesoBruto } = calcularTotaisPesoBruto(clientes);
            
            return (
              <div key={nomeReceita}>
                {/* Nome da receita */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-red-800 mb-3 border-b border-red-200 pb-2">
                    {nomeReceita.toUpperCase()}
                  </h3>
                </div>
                
                {/* Tabela de clientes */}
                <div className="overflow-x-auto">
                  <table className="w-full border border-red-300">
                    <thead>
                      <tr className="bg-red-100">
                        <th className="border border-red-300 px-4 py-2 text-left font-bold text-red-900">
                          CLIENTE
                        </th>
                        <th className="border border-red-300 px-4 py-2 text-center font-bold text-red-900">
                          PORÇÕES
                        </th>
                        <th className="border border-red-300 px-4 py-2 text-center font-bold text-red-900">
                          PESO BRUTO (kg)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(clientes).map(([customerName, data]) => (
                        <tr key={customerName} className="hover:bg-red-50">
                          <td className="border border-red-300 px-4 py-2 font-semibold text-gray-800">
                            {customerName.toUpperCase()}
                          </td>
                          <td className="border border-red-300 px-4 py-2 text-center font-bold text-gray-900">
                            {data.quantidadePorcoes}
                          </td>
                          <td className="border border-red-300 px-4 py-2 text-center font-bold text-gray-900">
                            {data.pesoBrutoTotal.toFixed(3)}kg
                          </td>
                        </tr>
                      ))}
                      {/* Linha de total */}
                      <tr className="bg-red-200 font-bold">
                        <td className="border border-red-300 px-4 py-2 font-bold text-red-900">
                          TOTAL
                        </td>
                        <td className="border border-red-300 px-4 py-2 text-center font-bold text-red-900">
                          {totalPorcoes}
                        </td>
                        <td className="border border-red-300 px-4 py-2 text-center font-bold text-red-900">
                          {totalPesoBruto.toFixed(3)}kg
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PesoBrutoCalculator;