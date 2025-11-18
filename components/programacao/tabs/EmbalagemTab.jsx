'use client';

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { parseQuantity } from "@/components/utils/orderUtils";

// Utils
import { formatQuantityForDisplay } from "../ProgramacaoCozinhaTabs";
import { getCustomerOrder, sortClientesByOrder } from "../utils/customerOrderUtils";

const EmbalagemTab = ({
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

  // Função para extrair e consolidar itens de embalagem por categoria
  const consolidateEmbalagem = useMemo(() => {
    if (!orders.length || !recipes.length) return {};

    // Filtrar pedidos do dia selecionado
    const dayOrders = orders.filter(order => order.day_of_week === selectedDay);

    if (!dayOrders.length) return {};

    // Organizar por categoria
    const categorias = {
      'PADRÃO': {},
      'REFOGADO': {},
      'ACOMPANHAMENTO': {}
    };

    dayOrders.forEach(order => {
      // Processar cada item do pedido
      order.items?.forEach(item => {
        const recipe = recipes.find(r => r.id === item.recipe_id);

        // Verificar se é item das categorias de embalagem
        if (recipe) {
          const category = recipe.category?.toLowerCase();
          let targetCategory = null;

          if (category?.includes('padrão') || category?.includes('padrao')) {
            targetCategory = 'PADRÃO';
          } else if (category?.includes('refogado')) {
            targetCategory = 'REFOGADO';
          } else if (category?.includes('acompanhamento')) {
            targetCategory = 'ACOMPANHAMENTO';
          }

          if (targetCategory) {
            const recipeName = recipe.name;
            const quantity = parseQuantity(item.quantity); // Normalizar quantidade
            const unitType = item.unit_type || recipe.unit_type;

            // Inicializar receita na categoria se não existir
            if (!categorias[targetCategory][recipeName]) {
              categorias[targetCategory][recipeName] = {};
            }

            // Inicializar cliente se não existir
            const customerName = order.customer_name;
            if (!categorias[targetCategory][recipeName][customerName]) {
              categorias[targetCategory][recipeName][customerName] = {
                quantity: 0,
                unitType: unitType,
                items: []
              };
            }

            // CORRIGIDO: Somar quantidade ao invés de substituir
            categorias[targetCategory][recipeName][customerName].quantity += quantity;

            // Arredondar para evitar problemas de precisão flutuante
            categorias[targetCategory][recipeName][customerName].quantity =
              Math.round(categorias[targetCategory][recipeName][customerName].quantity * 100) / 100;

            categorias[targetCategory][recipeName][customerName].items.push({
              recipeName,
              quantity,
              unitType,
              notes: item.notes || ''
            });
          }
        }
      });
    });

    // Filtrar categorias vazias
    return Object.fromEntries(
      Object.entries(categorias).filter(([_, recipes]) => Object.keys(recipes).length > 0)
    );
  }, [orders, recipes, selectedDay, dataVersion]);

  // Calcular totais por receita
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

  // Obter a ordem dos clientes salva (carrega sempre do localStorage)
  const customerOrder = getCustomerOrder(orders);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Package2 className="w-6 h-6" />
              PROGRAMAÇÃO EMBALAGEM - {selectedDayInfo?.fullDate || format(currentDate, 'dd/MM')}
            </CardTitle>
          </div>
        </CardHeader>
      </Card>

      {/* Conteúdo de embalagem */}
      {Object.keys(consolidateEmbalagem).length === 0 ? (
        <Card className="border-2 border-dashed border-blue-300">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-blue-400" />
            <h3 className="font-semibold text-lg text-blue-700 mb-2">
              Nenhum Item de Embalagem Encontrado
            </h3>
            <p className="text-blue-600 text-sm">
              Não há receitas das categorias "Padrão", "Refogado" ou "Acompanhamento" para o dia selecionado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(consolidateEmbalagem).map(([categoria, receitas]) => (
            <Card key={categoria} className="border-2 border-blue-500 shadow-lg bg-white">
              <CardHeader className="bg-gradient-to-r from-blue-100 to-sky-100 border-b-2 border-blue-300">
                <CardTitle className="text-xl font-bold text-blue-900">
                  {categoria}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-8">
                  {Object.entries(receitas).map(([nomeReceita, clientes], index) => {
                    const { totalQuantity, unitType } = calcularTotais(clientes);

                    return (
                      <div key={nomeReceita}>
                        {/* Nome da receita */}
                        <div className="mb-4">
                          <h3 className="text-lg font-bold text-gray-900 mb-3">
                            {nomeReceita.toUpperCase()}
                          </h3>
                        </div>

                        {/* Lista de clientes - ordenados conforme configuração */}
                        <div className="space-y-2 ml-4">
                          {sortClientesByOrder(clientes, customerOrder).map(([customerName, data]) => {
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
                          <div className="mt-3 pt-2 border-t border-blue-200">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-blue-800 min-w-[80px]">
                                TOTAL:
                              </span>
                              <span className="font-bold text-blue-900 text-lg">
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
          ))}
        </div>
      )}
    </div>
  );
};

export default EmbalagemTab;