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
  WeeklyMenu,
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

export default function FechamentoPage() {
  const [loading, setLoading] = useState(true);
  const [customersData, setCustomersData] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [weeklyMenus, setWeeklyMenus] = useState([]);
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

        const customersList = await Customer.list();
        const allRecipes = await Recipe.list();
        const allWeeklyMenus = await WeeklyMenu.list();

        setRecipes(allRecipes);
        setWeeklyMenus(allWeeklyMenus);

        const processedCustomers = await Promise.all(customersList.map(async customer => {
          const customerOrders = await Order.query([
            { field: 'customer_id', operator: '==', value: customer.id },
            { field: 'week_number', operator: '==', value: weekNumber },
            { field: 'year', operator: '==', value: year }
          ]);
          const customerWaste = await OrderWaste.query([
            { field: 'customer_id', operator: '==', value: customer.id },
            { field: 'week_number', operator: '==', value: weekNumber },
            { field: 'year', operator: '==', value: year }
          ]);
          const customerReceiving = await OrderReceiving.query([
            { field: 'customer_id', operator: '==', value: customer.id },
            { field: 'week_number', operator: '==', value: weekNumber },
            { field: 'year', operator: '==', value: year }
          ]);

          let totalMeals = 0;
          let originalTotalAmount = 0;
          let totalDepreciation = 0;
          let totalNonReceivedDiscount = 0;
          let totalWeight = 0;
          let ordersCount = 0;

          customerOrders.forEach(order => {
            totalMeals += order.total_meals_expected || 0;
            ordersCount += 1;

            const itemsWithCorrectPrices = order.items ? order.items.map(item => {
              const recipe = allRecipes.find(r => r.id === item.recipe_id);
              if (recipe) {
                const newItem = { ...item };
                newItem.unit_price = PortalPricingSystem.recalculateItemUnitPrice(item, recipe);
                newItem.total_price = newItem.unit_price * (item.quantity || 0);
                return newItem;
              }
              return item;
            }) : [];

            const dayWeight = calculateTotalWeight(itemsWithCorrectPrices);
            totalWeight += dayWeight;

            const originalDayAmount = utilSumCurrency(itemsWithCorrectPrices.map(item => item.total_price || 0));
            originalTotalAmount += originalDayAmount;

            const wasteDataForOrder = customerWaste.find(waste => 
              waste.day_of_week === order.day_of_week && waste.week_number === order.week_number && waste.year === order.year
            );
            let currentDepreciation = 0;
            if (wasteDataForOrder && wasteDataForOrder.items && itemsWithCorrectPrices.length > 0) {
              const depreciationData = calculateTotalDepreciation(wasteDataForOrder.items, itemsWithCorrectPrices);
              currentDepreciation = depreciationData.totalDepreciation;
              totalDepreciation += currentDepreciation;
            }

            const receivingDataForOrder = customerReceiving.find(receiving => 
              receiving.day_of_week === order.day_of_week && receiving.week_number === order.week_number && receiving.year === order.year
            );
            let currentNonReceivedDiscount = 0;
            if (receivingDataForOrder && receivingDataForOrder.items && itemsWithCorrectPrices.length > 0) {
              const nonReceivedDiscountsData = calculateNonReceivedDiscounts(receivingDataForOrder.items, itemsWithCorrectPrices);
              currentNonReceivedDiscount = nonReceivedDiscountsData.totalNonReceivedDiscount;
              totalNonReceivedDiscount += currentNonReceivedDiscount;
            }
          });

          const finalTotalAmount = calculateFinalOrderValue(
            originalTotalAmount,
            totalDepreciation,
            totalNonReceivedDiscount
          ).finalTotal;

          const averageMealCost = totalMeals > 0 ? finalTotalAmount / totalMeals : 0;

          const processedCustomer = {
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
          return processedCustomer;
        }));

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

  useEffect(() => {
    console.log("[FechamentoPage] customersData updated:", customersData);
  }, [customersData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="ml-3 text-lg text-gray-700">Carregando dados de fechamento...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Fechamento Semanal por Cliente</h1>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Semana {weekNumber}/{year} ({format(weekStart, "dd/MM", { locale: ptBR })} - {format(addDays(weekStart, 6), "dd/MM", { locale: ptBR })})
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Refeições</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{consolidatedTotals.totalMeals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peso Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatWeightDisplay(consolidatedTotals.totalWeight)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Original</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{utilFormatCurrency(consolidatedTotals.originalTotalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Final</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{utilFormatCurrency(consolidatedTotals.finalTotalAmount)}</div>
            {consolidatedTotals.totalDiscountAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                -{utilFormatCurrency(consolidatedTotals.totalDiscountAmount)} em descontos
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resumo por Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Refeições</TableHead>
                <TableHead className="text-right">Peso Total</TableHead>
                <TableHead className="text-right">Valor Original</TableHead>
                <TableHead className="text-right">Devolução/Desc.</TableHead>
                <TableHead className="text-right">Valor Final</TableHead>
                <TableHead className="text-right">Custo Médio/Ref.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersData.map(customer => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-right">{customer.totalMeals}</TableCell>
                  <TableCell className="text-right">{formatWeightDisplay(customer.totalWeight)}</TableCell>
                  <TableCell className="text-right">{utilFormatCurrency(customer.originalTotalAmount)}</TableCell>
                  <TableCell className="text-right text-red-600">
                    -{utilFormatCurrency(customer.totalDepreciation + customer.totalNonReceivedDiscount)}
                  </TableCell>
                  <TableCell className="text-right font-bold">{utilFormatCurrency(customer.finalTotalAmount)}</TableCell>
                  <TableCell className="text-right">{utilFormatCurrency(customer.averageMealCost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Adicionar detalhes por cliente ou gráficos aqui se necessário */}
    </div>
  );
}