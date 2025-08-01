'use client';

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Calendar, Users, DollarSign, CheckCircle, Clock, AlertCircle, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formattedQuantity as utilFormattedQuantity, formatCurrency as utilFormatCurrency } from "@/components/utils/orderUtils";
import { calculateTotalDepreciation, calculateFinalOrderValue } from "@/lib/returnCalculator";

const HistoryTab = ({
  existingOrders,
  weekDays,
  year,
  weekNumber,
  customer,
  existingWasteData = {}
}) => {
  // Calcular totais da semana considerando devoluções
  const weeklyTotals = React.useMemo(() => {
    let totalMeals = 0;
    let originalTotalAmount = 0;
    let totalDepreciation = 0;
    let ordersCount = 0;
    let totalItemsCount = 0;

    Object.entries(existingOrders).forEach(([dayIndex, order]) => {
      if (order) {
        totalMeals += order.total_meals_expected || 0;
        originalTotalAmount += order.total_amount || 0;
        totalItemsCount += order.total_items || 0;
        ordersCount += 1;

        // Calcular depreciação para este dia específico
        const wasteDataForDay = existingWasteData[dayIndex];
        if (wasteDataForDay && wasteDataForDay.items && order.items) {
          const depreciationData = calculateTotalDepreciation(wasteDataForDay.items, order.items);
          totalDepreciation += depreciationData.totalDepreciation;
        }
      }
    });

    const finalTotalAmount = originalTotalAmount - totalDepreciation;

    return { 
      totalMeals, 
      originalTotalAmount,
      totalDepreciation,
      finalTotalAmount,
      ordersCount,
      totalItemsCount,
      hasReturns: totalDepreciation > 0
    };
  }, [existingOrders, existingWasteData]);

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
      {/* Header com informações da semana */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <History className="w-5 h-5" />
            Histórico da Semana {weekNumber}/{year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pedidos Realizados</p>
                <p className="text-lg font-semibold text-gray-800">{weeklyTotals.ordersCount}/5 dias</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Refeições</p>
                <p className="text-lg font-semibold text-gray-800">{weeklyTotals.totalMeals}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-lg font-semibold text-gray-800">{utilFormatCurrency(weeklyTotals.finalTotalAmount)}</p>
                {weeklyTotals.hasReturns && (
                  <p className="text-xs text-gray-500">
                    Original: {utilFormatCurrency(weeklyTotals.originalTotalAmount)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo de devoluções se existirem */}
      {weeklyTotals.hasReturns && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Refeições Esperadas</p>
                  <p className="text-lg font-semibold text-gray-800">{weeklyTotals.totalMeals}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total de Itens</p>
                  <p className="text-lg font-semibold text-gray-800">{weeklyTotals.totalItemsCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valor Original</p>
                  <p className="text-lg font-semibold text-gray-800">{utilFormatCurrency(weeklyTotals.originalTotalAmount)}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-orange-200">
              <div className="flex justify-between items-center">
                <span className="text-orange-700 font-medium">Devolução: -{utilFormatCurrency(weeklyTotals.totalDepreciation)}</span>
                <span className="text-lg font-bold text-orange-800">Valor Final: {utilFormatCurrency(weeklyTotals.finalTotalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de pedidos por dia */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Pedidos por Dia</h3>
        
        {weekDays.map((day) => {
          const dayIndex = day.dayNumber;
          const order = existingOrders[dayIndex];
          const status = getDayStatus(dayIndex);
          
          return (
            <Card key={dayIndex} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-800">
                        {format(day.date, 'dd', { locale: ptBR })}
                      </p>
                      <p className="text-xs text-gray-500 uppercase">
                        {day.dayShort}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {format(day.date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(status)}
                        <Badge className={getStatusColor(status)}>
                          {getStatusText(status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {order && (
                    <div className="text-right">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Refeições</p>
                          <p className="font-semibold">{order.total_meals_expected || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Valor</p>
                          <p className="font-semibold">{utilFormatCurrency(order.total_amount || 0)}</p>
                        </div>
                      </div>
                      {order.total_items && (
                        <p className="text-xs text-gray-500 mt-1">
                          {utilFormattedQuantity(order.total_items)} itens pedidos
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                {order?.general_notes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                      <strong>Observações:</strong> {order.general_notes}
                    </p>
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
                  {weeklyTotals.hasReturns && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-green-700">Desconto por Devoluções:</span>
                        <span className="font-semibold">-{utilFormatCurrency(weeklyTotals.totalDepreciation)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-green-700 font-bold">Valor Final da Semana:</span>
                        <span className="font-bold">{utilFormatCurrency(weeklyTotals.finalTotalAmount)}</span>
                      </div>
                    </>
                  )}
                  {!weeklyTotals.hasReturns && (
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