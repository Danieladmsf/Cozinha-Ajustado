'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfWeek, getWeek, getYear, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, DollarSign, Users, Package, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Customer,
  Order,
  OrderWaste,
  OrderReceiving,
  Recipe,
  AppSettings
} from '@/app/api/entities';
import {
  formatCurrency as utilFormatCurrency,
  sumCurrency as utilSumCurrency
} from '@/components/utils/orderUtils';
import {
  calculateTotalDepreciation,
  calculateNonReceivedDiscounts,
  calculateFinalOrderValue
} from '@/lib/returnCalculator';
import { calculateTotalWeight, formatWeightDisplay } from '@/lib/weightCalculator';
import { PortalDataSync } from '@/lib/portal-data-sync';
import PortalPricingSystem from '@/lib/portal-pricing';
import { WEEK_CONFIG } from '@/components/cardapio/consolidacao/constants';

export default function FechamentoPage() {
  const [loading, setLoading] = useState(true);
  const [customersData, setCustomersData] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekNumber = useMemo(() => getWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const year = useMemo(() => getYear(currentDate), [currentDate]);
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  const handlePreviousWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, 7));
  };

  const consolidatedTotals = useMemo(() => {
    let totalMeals = 0;
    let originalTotalAmount = 0;
    let finalTotalAmount = 0;
    let totalWeight = 0;
    let totalDiscountAmount = 0;

    customersData.forEach(customer => {
      totalMeals += customer.totalMeals;
      originalTotalAmount += customer.originalTotalAmount;
      finalTotalAmount += customer.finalTotalAmount;
      totalWeight += customer.totalWeight;
      totalDiscountAmount += (customer.totalDepreciation + customer.totalNonReceivedDiscount);
    });

    return {
      totalMeals,
      originalTotalAmount,
      finalTotalAmount,
      totalWeight,
      totalDiscountAmount
    };
  }, [customersData]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const appSettings = await AppSettings.getById('global');
        if (appSettings) {
          await PortalPricingSystem.init(appSettings);
        }

        // Carregar dados em paralelo
        const [customersList, allRecipes] = await Promise.all([
          Customer.list(),
          Recipe.list()
        ]);

        // Criar Map de receitas para lookup O(1)
        const recipesMap = new Map(allRecipes.map(r => [r.id, r]));

        setRecipes(allRecipes);

        // Fazer todas as queries em batch
        const [allOrders, allWaste, allReceiving] = await Promise.all([
          Order.query([
            { field: 'week_number', operator: '==', value: weekNumber },
            { field: 'year', operator: '==', value: year }
          ]),
          OrderWaste.query([
            { field: 'week_number', operator: '==', value: weekNumber },
            { field: 'year', operator: '==', value: year }
          ]),
          OrderReceiving.query([
            { field: 'week_number', operator: '==', value: weekNumber },
            { field: 'year', operator: '==', value: year }
          ])
        ]);

        // Agrupar por cliente_id
        const ordersByCustomer = new Map();
        const wasteByCustomer = new Map();
        const receivingByCustomer = new Map();

        allOrders.forEach(order => {
          if (!ordersByCustomer.has(order.customer_id)) {
            ordersByCustomer.set(order.customer_id, []);
          }
          ordersByCustomer.get(order.customer_id).push(order);
        });

        allWaste.forEach(waste => {
          if (!wasteByCustomer.has(waste.customer_id)) {
            wasteByCustomer.set(waste.customer_id, []);
          }
          wasteByCustomer.get(waste.customer_id).push(waste);
        });

        allReceiving.forEach(receiving => {
          if (!receivingByCustomer.has(receiving.customer_id)) {
            receivingByCustomer.set(receiving.customer_id, []);
          }
          receivingByCustomer.get(receiving.customer_id).push(receiving);
        });

        // Processar clientes
        const processedCustomers = customersList.map(customer => {
          const customerOrders = ordersByCustomer.get(customer.id) || [];
          const customerWaste = wasteByCustomer.get(customer.id) || [];
          const customerReceiving = receivingByCustomer.get(customer.id) || [];

          // Criar Maps para lookup rápido por day_of_week
          const wasteByDay = new Map(customerWaste.map(w => [w.day_of_week, w]));
          const receivingByDay = new Map(customerReceiving.map(r => [r.day_of_week, r]));

          let totalMeals = 0;
          let originalTotalAmount = 0;
          let totalDepreciation = 0;
          let totalNonReceivedDiscount = 0;
          let totalWeight = 0;
          let ordersCount = 0;

          customerOrders.forEach(order => {
            // Validar que o pedido é de um dia de trabalho válido (segunda a sexta)
            if (!order.day_of_week || order.day_of_week < 1 || order.day_of_week > WEEK_CONFIG.WORKING_DAYS) {
              return; // Pular pedidos com day_of_week inválido
            }

            totalMeals += order.total_meals_expected || 0;
            ordersCount += 1;

            const itemsWithCorrectPrices = order.items ? order.items.map(item => {
              const recipe = recipesMap.get(item.recipe_id);
              if (recipe) {
                const syncedItem = PortalDataSync.syncItemSafely(item, recipe);
                syncedItem.unit_price = PortalPricingSystem.recalculateItemUnitPrice(item, recipe);
                syncedItem.total_price = syncedItem.unit_price * (item.quantity || 0);
                return syncedItem;
              }
              return item;
            }) : [];

            const dayWeight = calculateTotalWeight(itemsWithCorrectPrices);
            totalWeight += dayWeight;

            const originalDayAmount = utilSumCurrency(itemsWithCorrectPrices.map(item => item.total_price || 0));
            originalTotalAmount += originalDayAmount;

            const wasteDataForOrder = wasteByDay.get(order.day_of_week);
            if (wasteDataForOrder?.items && itemsWithCorrectPrices.length > 0) {
              const depreciationData = calculateTotalDepreciation(wasteDataForOrder.items, itemsWithCorrectPrices);
              totalDepreciation += depreciationData.totalDepreciation;
            }

            const receivingDataForOrder = receivingByDay.get(order.day_of_week);
            if (receivingDataForOrder?.items && itemsWithCorrectPrices.length > 0) {
              const nonReceivedDiscountsData = calculateNonReceivedDiscounts(receivingDataForOrder.items, itemsWithCorrectPrices);
              totalNonReceivedDiscount += nonReceivedDiscountsData.totalNonReceivedDiscount;
            }
          });

          const finalTotalAmount = calculateFinalOrderValue(
            originalTotalAmount,
            totalDepreciation,
            totalNonReceivedDiscount
          ).finalTotal;

          const averageMealCost = totalMeals > 0 ? finalTotalAmount / totalMeals : 0;

          return {
            ...customer,
            totalMeals,
            originalTotalAmount,
            totalDepreciation,
            totalNonReceivedDiscount,
            finalTotalAmount,
            totalWeight,
            ordersCount,
            averageMealCost,
            hasReturns: totalDepreciation > 0 || totalNonReceivedDiscount > 0
          };
        });

        setCustomersData(processedCustomers);
      } catch (error) {
        console.error("Erro ao carregar dados de fechamento:", error, error.stack);
        // TODO: Adicionar toast de erro
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [weekNumber, year]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="ml-3 text-lg text-gray-700">Carregando dados de fechamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Fechamento Semanal por Cliente
          </h1>
          <p className="text-gray-600">Resumo financeiro e operacional da semana</p>
        </div>

        {/* Week Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Semana {weekNumber}/{year}
                </h2>
                <p className="text-sm text-gray-600">
                  {format(weekStart, "dd/MM", { locale: ptBR })} - {format(addDays(weekStart, WEEK_CONFIG.WORKING_DAYS - 1), "dd/MM", { locale: ptBR })}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePreviousWeek} className="hover:bg-blue-50">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextWeek} className="hover:bg-blue-50">
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Refeições</CardTitle>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{consolidatedTotals.totalMeals.toLocaleString('pt-BR')}</div>
              <p className="text-xs text-gray-500 mt-1">refeições produzidas</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Peso Total</CardTitle>
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{formatWeightDisplay(consolidatedTotals.totalWeight)}</div>
              <p className="text-xs text-gray-500 mt-1">peso total produzido</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Bruto</CardTitle>
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{utilFormatCurrency(consolidatedTotals.originalTotalAmount)}</div>
              <p className="text-xs text-gray-500 mt-1">valor original sem descontos</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Líquido</CardTitle>
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{utilFormatCurrency(consolidatedTotals.finalTotalAmount)}</div>
              {consolidatedTotals.totalDiscountAmount > 0 && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  -{utilFormatCurrency(consolidatedTotals.totalDiscountAmount)} em descontos
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customer Summary Table */}
        <Card className="shadow-lg border-gray-200">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              Resumo por Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold text-gray-700">Cliente</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Refeições</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Peso Total</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Total Bruto</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Descontos</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Total Líquido</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Custo Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersData.map((customer, index) => (
                    <TableRow
                      key={customer.id}
                      className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <TableCell className="font-semibold text-gray-900 font-mono capitalize">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          {customer.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-gray-700 font-mono">
                        {customer.totalMeals.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right text-gray-700 font-mono">
                        {formatWeightDisplay(customer.totalWeight)}
                      </TableCell>
                      <TableCell className="text-right text-gray-700 font-mono">
                        {utilFormatCurrency(customer.originalTotalAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {customer.totalDepreciation + customer.totalNonReceivedDiscount > 0 ? (
                          <span className="text-red-700 font-semibold">
                            -{utilFormatCurrency(customer.totalDepreciation + customer.totalNonReceivedDiscount)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className="font-bold text-gray-900 text-lg">
                          {utilFormatCurrency(customer.finalTotalAmount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className="text-blue-700 font-semibold">
                          {utilFormatCurrency(customer.averageMealCost)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}