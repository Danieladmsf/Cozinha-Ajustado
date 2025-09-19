'use client';

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { History, Calendar, Users, DollarSign, CheckCircle, Clock, AlertCircle, Package, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formattedQuantity as utilFormattedQuantity, formatCurrency as utilFormatCurrency, sumCurrency as utilSumCurrency } from "@/components/utils/orderUtils";
import { calculateTotalDepreciation, calculateNonReceivedDiscounts, calculateFinalOrderValue } from "@/lib/returnCalculator";
import { calculateTotalWeight, formatWeightDisplay } from "@/lib/weightCalculator";
import { PortalDataSync } from "@/lib/portal-data-sync";

const HistoryTab = ({
  existingOrders,
  weekDays,
  year,
  weekNumber,
  customer,
  existingWasteData = {},
  existingReceivingData = {}, // NOVO PROP
  recipes = [],
  selectedDay
}) => {
  // Calcular totais da semana (FIXO)
  const weeklyTotals = React.useMemo(() => {
    let totalMeals = 0;
    let originalTotalAmount = 0;
    let totalDepreciation = 0;
    let totalNonReceivedDiscount = 0;
    let ordersCount = 0;
    let totalItemsCount = 0;
    let totalWeight = 0;

    Object.entries(existingOrders).forEach(([dayIndex, order]) => {
      if (order) {
        totalMeals += order.total_meals_expected || 0;
        let recalculatedTotal = 0;
        if (order.items && order.items.length > 0) {
          recalculatedTotal = utilSumCurrency(order.items.map(item => item.total_price || 0));
        } else {
          recalculatedTotal = order.total_amount || 0;
        }
        originalTotalAmount += recalculatedTotal;
        totalItemsCount += order.total_items || 0;
        ordersCount += 1;

        const syncedItems = order.items ? order.items.map(item => {
          const recipe = recipes.find(r => r.id === item.recipe_id);
          if (recipe) {
            return PortalDataSync.syncItemSafely(item, recipe);
          }
          return item;
        }) : [];
        
        const dayWeight = calculateTotalWeight(syncedItems);
        totalWeight += dayWeight;

        const wasteDataForDay = existingWasteData[dayIndex];
        if (wasteDataForDay && wasteDataForDay.items && order.items) {
          const depreciationData = calculateTotalDepreciation(wasteDataForDay.items, order.items);
          totalDepreciation += depreciationData.totalDepreciation;
        }

        const receivingDataForDay = existingReceivingData[dayIndex];
        if (receivingDataForDay && receivingDataForDay.items && order.items) {
          const nonReceivedData = calculateNonReceivedDiscounts(receivingDataForDay.items, order.items);
          totalNonReceivedDiscount += nonReceivedData.totalNonReceivedDiscount;
        }
      }
    });

    const { finalTotal: finalTotalAmount } = calculateFinalOrderValue(originalTotalAmount, totalDepreciation, totalNonReceivedDiscount);
    const averageMealCost = totalMeals > 0 ? finalTotalAmount / totalMeals : 0;
    const totalDiscounts = totalDepreciation + totalNonReceivedDiscount;

    return { 
      totalMeals, 
      originalTotalAmount,
      totalDepreciation,
      totalNonReceivedDiscount,
      totalDiscounts,
      finalTotalAmount,
      ordersCount,
      totalItemsCount,
      totalWeight,
      averageMealCost,
      hasDiscounts: totalDiscounts > 0
    };
  }, [existingOrders, existingWasteData, existingReceivingData, recipes]);

  // Calcular totais cumulativos (DINÂMICO)
  const cumulativeTotals = React.useMemo(() => {
    let totalMeals = 0;
    let originalTotalAmount = 0;
    let totalDepreciation = 0;
    let totalNonReceivedDiscount = 0;
    let ordersCount = 0;
    let totalItemsCount = 0;
    let totalWeight = 0;

    for (let day = 1; day <= selectedDay; day++) {
      const order = existingOrders[day];
      if (order) {
        totalMeals += order.total_meals_expected || 0;
        let recalculatedTotal = 0;
        if (order.items && order.items.length > 0) {
          recalculatedTotal = utilSumCurrency(order.items.map(item => item.total_price || 0));
        } else {
          recalculatedTotal = order.total_amount || 0;
        }
        originalTotalAmount += recalculatedTotal;
        totalItemsCount += order.total_items || 0;
        ordersCount += 1;

        const syncedItems = order.items ? order.items.map(item => {
          const recipe = recipes.find(r => r.id === item.recipe_id);
          if (recipe) {
            return PortalDataSync.syncItemSafely(item, recipe);
          }
          return item;
        }) : [];
        
        const dayWeight = calculateTotalWeight(syncedItems);
        totalWeight += dayWeight;

        const wasteDataForDay = existingWasteData[day];
        if (wasteDataForDay && wasteDataForDay.items && order.items) {
          const depreciationData = calculateTotalDepreciation(wasteDataForDay.items, order.items);
          totalDepreciation += depreciationData.totalDepreciation;
        }

        const receivingDataForDay = existingReceivingData[day];
        if (receivingDataForDay && receivingDataForDay.items && order.items) {
          const nonReceivedData = calculateNonReceivedDiscounts(receivingDataForDay.items, order.items);
          totalNonReceivedDiscount += nonReceivedData.totalNonReceivedDiscount;
        }
      }
    }

    const { finalTotal: finalTotalAmount } = calculateFinalOrderValue(originalTotalAmount, totalDepreciation, totalNonReceivedDiscount);
    const averageMealCost = totalMeals > 0 ? finalTotalAmount / totalMeals : 0;
    const totalDiscounts = totalDepreciation + totalNonReceivedDiscount;

    return { 
      totalMeals, 
      originalTotalAmount,
      totalDepreciation,
      totalNonReceivedDiscount,
      totalDiscounts,
      finalTotalAmount,
      ordersCount,
      totalItemsCount,
      totalWeight,
      averageMealCost,
      hasDiscounts: totalDiscounts > 0
    };
  }, [existingOrders, existingWasteData, existingReceivingData, recipes, selectedDay]);

  const getDayStatus = (dayIndex) => {
    const order = existingOrders[dayIndex];
    if (!order) return 'empty';
    return 'completed';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'empty':
        return <Clock className="w-4 h-4 text-gray-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Pedido Realizado';
      case 'empty':
        return 'Sem Pedido';
      default:
        return 'Pendente';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'empty':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Card Dinâmico (Progresso da Semana) */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <TrendingUp className="w-5 h-5" />
            Progresso da Semana (até {weekDays.find(d => d.dayNumber === selectedDay)?.dayName || ''})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-blue-700">Dia {selectedDay} de 5</span>
              <span className="text-sm font-bold text-blue-700">{((selectedDay / 5) * 100).toFixed(0)}%</span>
            </div>
            <Progress value={(selectedDay / 5) * 100} className="w-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"><Users className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-600">Refeições (Acumul.)</p>
                <p className="text-lg font-semibold text-gray-800">{cumulativeTotals.totalMeals}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center"><Package className="w-5 h-5 text-orange-600" /></div>
              <div>
                <p className="text-sm text-gray-600">Peso (Acumul.)</p>
                <p className="text-lg font-semibold text-gray-800">{formatWeightDisplay(cumulativeTotals.totalWeight)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center"><DollarSign className="w-5 h-5 text-teal-600" /></div>
              <div>
                <p className="text-sm text-gray-600">Média (Acumul.)</p>
                <p className="text-lg font-semibold text-gray-800">{utilFormatCurrency(cumulativeTotals.averageMealCost)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"><DollarSign className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-600">Valor (Acumul.)</p>
                <p className="text-lg font-semibold text-gray-800">{utilFormatCurrency(cumulativeTotals.finalTotalAmount)}</p>
                {cumulativeTotals.hasDiscounts && (
                  <p className="text-xs text-gray-500">
                    Original: {utilFormatCurrency(cumulativeTotals.originalTotalAmount)} | Descontos: -{utilFormatCurrency(cumulativeTotals.totalDiscounts)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Fixo (Total da Semana) */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <History className="w-5 h-5" />
            Resumo Total da Semana {weekNumber}/{year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><Calendar className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-600">Pedidos Realizados</p>
                <p className="text-lg font-semibold text-gray-800">{weeklyTotals.ordersCount}/5 dias</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"><Users className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-600">Total de Refeições</p>
                <p className="text-lg font-semibold text-gray-800">{weeklyTotals.totalMeals}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center"><Package className="w-5 h-5 text-orange-600" /></div>
              <div>
                <p className="text-sm text-gray-600">Peso Total</p>
                <p className="text-lg font-semibold text-gray-800">{formatWeightDisplay(weeklyTotals.totalWeight)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center"><DollarSign className="w-5 h-5 text-teal-600" /></div>
              <div>
                <p className="text-sm text-gray-600">Média por Refeição</p>
                <p className="text-lg font-semibold text-gray-800">{utilFormatCurrency(weeklyTotals.averageMealCost)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"><DollarSign className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-600">Valor Total Final</p>
                <p className="text-lg font-semibold text-gray-800">{utilFormatCurrency(weeklyTotals.finalTotalAmount)}</p>
                {weeklyTotals.hasDiscounts && (
                  <p className="text-xs text-gray-500">
                    Original: {utilFormatCurrency(weeklyTotals.originalTotalAmount)} | Total de Descontos: -{utilFormatCurrency(weeklyTotals.totalDiscounts)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de pedidos por dia */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Detalhes por Dia</h3>
        
        {weekDays.map((day) => {
          const dayIndex = day.dayNumber;
          const order = existingOrders[dayIndex];
          const status = getDayStatus(dayIndex);
          
          if (dayIndex === 1) { // Log específico para segunda-feira
            console.log(`[HistoryTab Debug] Dia ${dayIndex} - Dados para Cálculo de Desconto:`,
              {
                orderItems: order?.items,
                receivingItems: existingReceivingData[dayIndex]?.items
              }
            );
          }

          console.log(`Order for day ${dayIndex}:`, order);
          return (
            <Card key={dayIndex} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-800">{format(day.date, 'dd', { locale: ptBR })}</p>
                      <p className="text-xs text-gray-500 uppercase">{day.dayShort}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{format(day.date, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(status)}
                        <Badge className={getStatusColor(status)}>{getStatusText(status)}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  {order && (
                    <div className="text-right">
                      {/* Calcular os valores uma vez para reutilização */}
                      {(() => {
                        const originalDayAmount = utilSumCurrency(order.items ? order.items.map(item => item.total_price || 0) : (order.total_amount || 0));
                        
                        const wasteDataForDay = existingWasteData[dayIndex];
                        const receivingDataForDay = existingReceivingData[dayIndex];
                        
                        let depreciationAmount = 0;
                        if (wasteDataForDay && wasteDataForDay.items && order.items) {
                          const depreciationData = calculateTotalDepreciation(wasteDataForDay.items, order.items);
                          depreciationAmount = depreciationData.totalDepreciation;
                        }

                        let nonReceivedDiscountAmount = 0;
                        if (receivingDataForDay && receivingDataForDay.items && order.items) {
                          const nonReceivedDiscountsData = calculateNonReceivedDiscounts(receivingDataForDay.items, order.items);
                          nonReceivedDiscountAmount = nonReceivedDiscountsData.totalNonReceivedDiscount;
                        }

                        const finalDayAmount = calculateFinalOrderValue(
                          originalDayAmount,
                          depreciationAmount,
                          nonReceivedDiscountAmount
                        ).finalTotal;

                        const syncedItems = order.items ? order.items.map(item => {
                          const recipe = recipes.find(r => r.id === item.recipe_id);
                          if (recipe) {
                            return PortalDataSync.syncItemSafely(item, recipe);
                          }
                          return item;
                        }) : [];
                        const weight = calculateTotalWeight(syncedItems);

                        return (
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <p className="text-gray-600">Refeições:</p>
                              <p className="font-semibold">{order.total_meals_expected || 0}</p>
                            </div>
                            <div className="flex justify-between">
                              <p className="text-gray-600">Peso:</p>
                              <p className="font-semibold">{formatWeightDisplay(weight)}</p>
                            </div>
                            <div className="flex justify-between">
                              <p className="text-gray-600">Valor Bruto:</p>
                              <p className="font-semibold">{utilFormatCurrency(originalDayAmount)}</p>
                            </div>
                            
                            {depreciationAmount > 0 && (
                              <div className="flex justify-between">
                                <p className="text-gray-600">Devolução:</p>
                                <p className="font-semibold text-red-600">-{utilFormatCurrency(depreciationAmount)}</p>
                              </div>
                            )}
                            
                            {nonReceivedDiscountAmount > 0 && (
                              <div className="flex justify-between">
                                <p className="text-gray-600">Não recebido:</p>
                                <p className="font-semibold text-red-600">-{utilFormatCurrency(nonReceivedDiscountAmount)}</p>
                              </div>
                            )}
                            
                            <div className="flex justify-between border-t pt-2">
                              <p className="text-gray-600 font-bold whitespace-nowrap">Total Líquido:</p>
                              <p className="font-bold text-sm">{utilFormatCurrency(finalDayAmount)}</p>
                            </div>
                            
                            {order.total_items && (
                              <p className="text-xs text-gray-500 mt-1">{utilFormattedQuantity(order.total_items)} itens pedidos</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                
                {order?.general_notes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600"><strong>Observações:</strong> {order.general_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resumo de fechamento da semana */}
      {weeklyTotals.ordersCount === 5 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              Fechamento da Semana Completo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-800 mb-2">Resumo Final</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-green-700">Total de Refeições Esperadas:</span>
                    <span className="font-semibold">{weeklyTotals.totalMeals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Valor Original da Semana:</span>
                    <span className="font-semibold">{utilFormatCurrency(weeklyTotals.originalTotalAmount)}</span>
                  </div>
                  {weeklyTotals.hasDiscounts && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-green-700">Desconto Total:</span>
                        <span className="font-semibold">-{utilFormatCurrency(weeklyTotals.totalDiscounts)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-green-700 font-bold">Valor Final da Semana:</span>
                        <span className="font-bold">{utilFormatCurrency(weeklyTotals.finalTotalAmount)}</span>
                      </div>
                    </>
                  )}
                  {!weeklyTotals.hasDiscounts && (
                    <div className="flex justify-between">
                      <span className="text-green-700">Valor Total da Semana:</span>
                      <span className="font-semibold">{utilFormatCurrency(weeklyTotals.finalTotalAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-green-700">Dias com Pedidos:</span>
                    <span className="font-semibold">{weeklyTotals.ordersCount}/5</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-green-800 mb-2">Status</h4>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-700">Semana completa - Todos os pedidos realizados</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HistoryTab;