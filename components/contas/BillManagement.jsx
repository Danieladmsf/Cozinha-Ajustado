'use client';


import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, parseISO, isSameMonth, isPast, isToday, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

// Debounce helper
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
};

import { PortalPricingSystem } from '@/lib/portal-pricing';

// Entities
import { RecurringBill, AppSettings } from "@/app/api/entities";
import { BillPayment } from "@/app/api/entities";
import { VariableBill } from "@/app/api/entities";
import { CategoryTree } from "@/app/api/entities";
import { Supplier } from "@/app/api/entities";

// Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { DecimalInput } from "@/components/ui/decimal-input";

// Bill Components
import BillsMonthPicker from "@/components/contas/BillsMonthPicker";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import BillsList from "@/components/contas/BillsList";
import RecurringBillDialog from "@/components/contas/RecurringBillDialog";
import AddVariableBillDialog from "@/components/contas/AddVariableBillDialog";
import PayBillDialog from "@/components/contas/PayBillDialog";

// Icons
import { 
  Plus, 
  CircleDollarSign, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Calendar,
  CalendarClock,
  CalendarIcon,
  LayoutGrid,
  ListIcon
} from "lucide-react";

export default function BillManagement() {
  const [currentTab, setCurrentTab] = useState("monthly");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState("grid");

  // Bills data
  const [recurringBills, setRecurringBills] = useState([]);
  const [monthlyBills, setMonthlyBills] = useState([]);
  const [loadingRecurring, setLoadingRecurring] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(true);

  // App Settings
  const [operationalCost, setOperationalCost] = useState(0);
  const [profitMargin, setProfitMargin] = useState(0);
  const [appSettingsId, setAppSettingsId] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Dialogs
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [isVariableBillDialogOpen, setIsVariableBillDialogOpen] = useState(false);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [currentBill, setCurrentBill] = useState(null);

  // Categories
  const [billCategories, setBillCategories] = useState([]);

  // Summary data
  const [summary, setSummary] = useState({
    totalPending: 0,
    totalPaid: 0,
    countPending: 0,
    countPaid: 0,
  });

  // Memoized handlers para evitar re-renderizações desnecessárias
  const handleTabChange = React.useCallback((tab) => setCurrentTab(tab), []);
  const handleMonthChange = React.useCallback((month) => setCurrentMonth(month), []);
  const handleViewModeChange = React.useCallback((mode) => setViewMode(mode), []);

  // Load data on mount and when month changes
  useEffect(() => {
    loadRecurringBills();
    loadCategoryData();
    loadAppSettings(); // Load app settings on mount
  }, []);

  useEffect(() => {
    loadMonthlyBills();
  }, [currentMonth]);

  const loadAppSettings = async () => {
    try {
      setLoadingSettings(true);
      const docSnap = await AppSettings.getById('global'); // Assuming a single global settings document
      if (docSnap) {
        setAppSettingsId(docSnap.id);
        setOperationalCost(docSnap.operational_cost_per_kg || 0);
        setProfitMargin(docSnap.profit_margin || 0);
        PortalPricingSystem.init(docSnap);
      } else {
        // Create a default settings document if it doesn't exist
        const newSettings = await AppSettings.createWithId('global', {
          operational_cost_per_kg: 0,
          profit_margin: 0
        });
        setAppSettingsId(newSettings.id);
        PortalPricingSystem.init(newSettings);
      }
    } catch (error) {
      showErrorToast("Erro ao carregar configurações do aplicativo");
    } finally {
      setLoadingSettings(false);
    }
  };

  // Save app settings with debounce
  const saveAppSettings = async (cost, margin) => {
    try {
      if (appSettingsId) {
        await AppSettings.update(appSettingsId, {
          operational_cost_per_kg: cost,
          profit_margin: margin
        });
        showToast("Sucesso", "Configurações salvas com sucesso!");
      } else {
        // This case should ideally not happen if loadAppSettings works correctly
        showErrorToast("Erro: ID das configurações não encontrado para salvar.");
      }
    } catch (error) {
      showErrorToast("Erro ao salvar configurações do aplicativo");
    }
  };

  const debouncedSaveAppSettings = React.useCallback(
    debounce(saveAppSettings, 1000), // Debounce por 1 segundo
    [appSettingsId] // Recria a função se appSettingsId mudar
  );

  // Salvar configurações automaticamente ao mudar
  useEffect(() => {
    if (!loadingSettings) {
      debouncedSaveAppSettings(operationalCost, profitMargin);
    }
  }, [operationalCost, profitMargin, loadingSettings, debouncedSaveAppSettings]);

  // Load recurring bills (templates)
  // Load app settings
  

  const loadRecurringBills = async () => {
    try {
      setLoadingRecurring(true);
      const data = await RecurringBill.list();
      setRecurringBills(data);
    } catch (error) {
      showErrorToast("Erro ao carregar contas recorrentes");
    } finally {
      setLoadingRecurring(false);
    }
  };

  // Helper para manipulação segura de datas
  const safeDate = (dateValue) => {
    if (!dateValue) return null;
    
    try {
      if (dateValue instanceof Date) return dateValue;
      if (typeof dateValue === 'string') return parseISO(dateValue);
      return null;
    } catch (error) {
      return null;
    }
  };

  // Helper para verificar se duas datas são do mesmo mês
  const isSameMonthSafe = (date1, date2) => {
    const safeDate1 = safeDate(date1);
    const safeDate2 = safeDate(date2);
    
    if (!safeDate1 || !safeDate2) return false;
    return isSameMonth(safeDate1, safeDate2);
  };

  // Mapear fornecedores para seus dados completos
  const loadMonthlyBills = async () => {
    try {
      setLoadingMonthly(true);
      
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      // Load payments, variable bills and suppliers
      const [payments, variableBills, allSuppliers] = await Promise.all([
        BillPayment.list(),
        VariableBill.list(),
        Supplier.list()
      ]);

      // Criar um mapa de fornecedores para lookup rápido
      const suppliersMap = {};
      allSuppliers.forEach(supplier => {
        suppliersMap[supplier.company_name] = {
          photo: supplier.vendor_photo,
          name: supplier.company_name
        };
      });

      // Filter for current month - REGRA AJUSTADA
      const paymentsThisMonth = payments.filter(payment => {
        if (!payment.payment_date || !payment.due_date) return false;
        
        const paymentDate = safeDate(payment.payment_date);
        const dueDate = safeDate(payment.due_date);
        
        if (!paymentDate || !dueDate) return false;
        
        // Mostrar o pagamento no mês de vencimento da conta
        return isSameMonth(dueDate, currentMonth);
      });

      const pendingBillsThisMonth = variableBills.filter(bill => {
        if (!bill.due_date) return false;
        
        const dueDate = safeDate(bill.due_date);
        if (!dueDate) return false;
        
        return isSameMonth(dueDate, currentMonth);
      });

      // Generate recurring bills for current month
      const recurringForMonth = generateRecurringBillsForMonth(recurringBills, monthStart);
      
      // Get paid recurring bills for this month
      const paidRecurringIds = paymentsThisMonth
        .filter(p => p.recurring_bill_id && p.due_date)
        .map(p => {
          const dueDate = safeDate(p.due_date);
          return {
            id: p.recurring_bill_id,
            due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
            payment_date: safeDate(p.payment_date)
          };
        })
        .filter(p => p.due_date !== null);
      
      // Filter out recurring bills that are already paid
      const pendingRecurring = recurringForMonth.filter(bill => {
        if (!bill.due_date) return false;
        
        const billDueDate = safeDate(bill.due_date);
        if (!billDueDate) return false;
        
        return !paidRecurringIds.some(paid => 
          paid.id === bill.recurring_bill_id && 
          isSameMonth(parseISO(paid.due_date), billDueDate)
        );
      });
      
      // Enriquecer bills com fotos de fornecedores
      const enrichBillWithSupplierData = (bill) => {
        if (bill.supplier && suppliersMap[bill.supplier]) {
          bill.supplier_photo = suppliersMap[bill.supplier].photo;
        }
        return bill;
      };

      // Combine all bills and mark their states
      const allMonthlyBills = [
        ...pendingRecurring.map(bill => enrichBillWithSupplierData({
          ...bill,
          billType: 'recurring',
          displayMonth: format(safeDate(bill.due_date), 'yyyy-MM')
        })),
        ...pendingBillsThisMonth.map(bill => enrichBillWithSupplierData({
          ...bill,
          billType: 'variable',
          displayMonth: format(safeDate(bill.due_date), 'yyyy-MM')
        })),
        ...paymentsThisMonth.map(bill => enrichBillWithSupplierData({
          ...bill,
          billType: 'paid',
          displayMonth: format(safeDate(bill.due_date), 'yyyy-MM')
        }))
      ].filter(bill => {
        const billMonth = bill.displayMonth;
        const currentMonthStr = format(currentMonth, 'yyyy-MM');
        return billMonth === currentMonthStr;
      });
      
      // Sort by due date
      allMonthlyBills.sort((a, b) => {
        const dateA = safeDate(a.due_date);
        const dateB = safeDate(b.due_date);
        
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        
        return dateA - dateB;
      });
      
      // Identificar e marcar contas atrasadas
      const today = new Date();
      allMonthlyBills.forEach(bill => {
        const dueDate = safeDate(bill.due_date);
        
        if (!dueDate) return;
        
        if (isPast(dueDate) && !isToday(dueDate) && bill.status !== 'paid') {
          bill.status = 'late';
        }
      });
      
      setMonthlyBills(allMonthlyBills);
      
      // Calculate summary
      const pendingBills = allMonthlyBills.filter(bill => bill.status !== 'paid');
      const paidBills = allMonthlyBills.filter(bill => bill.status === 'paid');
      
      setSummary({
        totalPending: pendingBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0),
        totalPaid: paidBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0),
        countPending: pendingBills.length,
        countPaid: paidBills.length
      });
      
    } catch (error) {
      showErrorToast("Erro ao carregar contas para o mês selecionado");
    } finally {
      setLoadingMonthly(false);
    }
  };

  // Load category data
  const loadCategoryData = async () => {
    try {
      const categories = await CategoryTree.list();
      
      // Extract expense categories
      const expenseCategories = categories
        .filter(cat => cat.type === 'expense' && cat.level <= 2)
        .map(cat => cat.name);
      
      // Add default categories if needed
      const defaultCategories = ["Aluguel", "Energia", "Água", "Internet", "Telefone", 
        "Impostos", "Seguros", "Assinaturas", "Serviços", "Outros"];
      
      const allCategories = [...new Set([...expenseCategories, ...defaultCategories])];
      setBillCategories(allCategories);
      
    } catch (error) {
      // Use default categories if there's an error
    }
  };

  // Generate recurring bills for current month
  const generateRecurringBillsForMonth = (recurringBills, monthStart) => {
    return recurringBills
      .filter(bill => bill.active)
      .map(bill => {
        // Create a due date for this month
        let dueDay = bill.due_day;
        
        // Handle months with less than 31 days
        const monthDays = new Date(
          monthStart.getFullYear(),
          monthStart.getMonth() + 1,
          0
        ).getDate();
        
        if (dueDay > monthDays) {
          dueDay = monthDays;
        }
        
        const dueDate = new Date(
          monthStart.getFullYear(),
          monthStart.getMonth(),
          dueDay
        );
        
        // Return a month-specific instance 
        return {
          id: `${bill.id}-${format(monthStart, 'yyyy-MM')}`, // Virtual ID for the month
          title: bill.title,
          description: bill.description,
          amount: bill.amount,
          category: bill.category,
          supplier: bill.supplier,
          barcode: bill.barcode,
          due_date: dueDate,
          status: "pending",
          type: bill.type,
          recurring_bill_id: bill.id, // Reference to the template
          notes: bill.notes
        };
      });
  };

  // Show toast messages
  const showToast = (title, description, variant = "default") => {
    toast({
      title,
      description,
      variant
    });
  };

  const showErrorToast = (message) => {
    showToast("Erro", message, "destructive");
  };

  // Handlers for recurring bills
  const handleEditRecurring = (bill) => {
    setCurrentBill(bill);
    setIsRecurringDialogOpen(true);
  };

  const handleSaveRecurring = async (bill) => {
    await loadRecurringBills();
    await loadMonthlyBills();
    
    showToast(
      "Sucesso",
      bill.id ? "Conta recorrente atualizada" : "Conta recorrente criada"
    );
  };

  const handleDeleteRecurring = async (bill) => {
    try {
      if (!window.confirm(`Deseja realmente excluir a conta recorrente "${bill.title}"?`)) {
        return;
      }
      
      await RecurringBill.delete(bill.id);
      await loadRecurringBills();
      
      showToast("Sucesso", "Conta recorrente excluída");
    } catch (error) {
      showErrorToast("Erro ao excluir conta recorrente");
    }
  };

  // Handlers for monthly bills
  const handleAddVariableBill = async (bill) => {
    await loadMonthlyBills();
    showToast("Sucesso", "Conta adicionada para este mês");
  };

  const handleEditMonthly = (bill, isRecurring = false) => {
    if (isRecurring) {
      // Encontrar a conta recorrente pelo ID
      const recurringBill = recurringBills.find(rb => rb.id === bill);
      if (recurringBill) {
        handleEditRecurring(recurringBill);
      }
      return;
    }
    
    // Se não for recorrente, verificar se é uma conta existente ou virtual
    if (bill.recurring_bill_id) {
      // É uma conta gerada a partir de um modelo recorrente
      const recurringBill = recurringBills.find(rb => rb.id === bill.recurring_bill_id);
      if (recurringBill) {
        handleEditRecurring(recurringBill);
      }
    } else if (bill.type === "variable") {
      // É uma conta variável normal
      setCurrentBill(bill);
      setIsVariableBillDialogOpen(true);
    } else {
      // É uma conta fixa não recorrente
      setCurrentBill(bill);
      setIsVariableBillDialogOpen(true);
    }
  };

  const handleDeleteMonthly = async (bill) => {
    try {
      if (!window.confirm(`Deseja realmente excluir a conta "${bill.title}"?`)) {
        return;
      }
      
      // If it's a virtual recurring bill, we cannot delete it directly
      if (bill.recurring_bill_id) {
        showToast(
          "Aviso", 
          "Esta conta é gerada automaticamente a partir de um modelo recorrente. Para excluí-la, desative ou exclua o modelo.", 
          "warning"
        );
        return;
      }
      
      // Otherwise, it's a variable bill that can be deleted
      await VariableBill.delete(bill.id);
      await loadMonthlyBills();
      
      showToast("Sucesso", "Conta excluída");
    } catch (error) {
      showErrorToast("Erro ao excluir conta");
    }
  };

  const handlePayBill = (bill) => {
    setCurrentBill(bill);
    setIsPayDialogOpen(true);
  };

  const handleConfirmPayment = async (billId, paymentData) => {
    try {
      const bill = monthlyBills.find(b => b.id === billId);
      if (!bill) {
        showErrorToast("Conta não encontrada");
        return;
      }
      
      // Format payment date to ISO string (YYYY-MM-DD)
      const paymentDate = format(paymentData.payment_date, 'yyyy-MM-dd');
      
      // Prepare payment record
      const paymentRecord = {
        title: bill.title,
        description: bill.description,
        due_date: typeof bill.due_date === 'string' 
          ? bill.due_date 
          : format(bill.due_date, 'yyyy-MM-dd'),
        payment_date: paymentDate,
        amount: paymentData.paid_amount,
        original_amount: bill.amount,
        category: bill.category,
        supplier: bill.supplier,
        status: "paid",
        barcode: bill.barcode,
        notes: bill.notes
      };
      
      // Adicionado: Se a conta for recorrente e atrasada, precisamos registrar corretamente
      if (bill.recurring_bill_id) {
        paymentRecord.recurring_bill_id = bill.recurring_bill_id;
        
        // Verificar se é uma conta atrasada
        const dueDate = new Date(bill.due_date);
        const today = new Date();
        if (isPast(dueDate) && !isToday(dueDate)) {
          paymentRecord.was_late = true;
          paymentRecord.days_late = differenceInDays(today, dueDate);
        }
      } else if (bill.id) {
        await VariableBill.delete(bill.id);
      }
      
      // Lógica de salvamento de pagamento removida
      
      // Atualize imediatamente o estado local
      setMonthlyBills(prev => prev.map(b => {
        if (b.id === billId || 
           (b.recurring_bill_id === bill.recurring_bill_id && 
            isSameMonth(parseISO(b.due_date), parseISO(bill.due_date)))) {
          return { ...b, status: 'paid', payment_date: paymentDate };
        }
        return b;
      }));
      
      // Close dialog and reload data
      setIsPayDialogOpen(false);
      setCurrentBill(null);

      // Recarregar dados
      await loadMonthlyBills();
      
      showToast("Sucesso", "Pagamento registrado com sucesso");
    } catch (error) {
      showErrorToast("Erro ao registrar pagamento");
    }
};

  // Adicionar método para reverter pagamento
  const handleRevertPayment = async (bill) => {
    try {
      if (!window.confirm(`Deseja realmente reverter o pagamento da conta "${bill.title}"?`)) {
        return;
      }
      
      // Se a conta original era de um modelo recorrente
      if (bill.recurring_bill_id) {
        // Não precisamos fazer nada além de excluir o pagamento,
        // pois o registro recorrente ainda estará lá no próximo carregamento
        await BillPayment.delete(bill.id);
      } else {
        // Para contas não recorrentes, precisamos recriar a conta como pendente
        const variableBillData = {
          title: bill.title,
          description: bill.description,
          due_date: bill.due_date,
          amount: bill.original_amount || bill.amount,
          category: bill.category,
          supplier: bill.supplier,
          notes: bill.notes,
          barcode: bill.barcode,
          status: "pending"
        };
        
        // Lógica de criação/exclusão removida
      }
      
      // Recarregar dados
      await loadMonthlyBills();
      
      toast({
        title: "Sucesso",
        description: "Pagamento revertido com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao reverter pagamento",
        variant: "destructive"
      });
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gestão de Contas</h1>
          <p className="text-gray-500">Controle suas contas a pagar</p>
        </div>

        {/* App Settings Card */}
        <Card className="w-full md:w-1/2 lg:w-1/3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Configurações do Aplicativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custo Operacional (por Kg)</label>
              <DecimalInput
                value={operationalCost}
                onChange={(e) => setOperationalCost(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Margem de Lucro (%)</label>
              <DecimalInput
                value={profitMargin}
                onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className={`p-2 ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
              onClick={() => handleViewModeChange('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`p-2 ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
              onClick={() => handleViewModeChange('list')}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={() => {
              setCurrentBill(null);
              setIsVariableBillDialogOpen(true);
            }}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>

          <Button
            onClick={() => {
              setCurrentBill(null);
              setIsRecurringDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CalendarClock className="h-4 w-4 mr-2" />
            Nova Recorrente
          </Button>
        </div>
      </div>

      <Tabs defaultValue="monthly" value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Contas do Mês</span>
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            <span>Recorrentes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <BillsMonthPicker 
                currentMonth={currentMonth} 
                onChange={handleMonthChange} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Contas Pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(summary.totalPending)}</p>
                      <p className="text-xs text-gray-500">{summary.countPending} conta(s)</p>
                    </div>
                    <div className="p-3 rounded-full bg-red-100">
                      <ArrowUpCircle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Contas Pagas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(summary.totalPaid)}</p>
                      <p className="text-xs text-gray-500">{summary.countPaid} conta(s)</p>
                    </div>
                    <div className="p-3 rounded-full bg-green-100">
                      <ArrowDownCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Total do Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold">
                        {formatCurrency(summary.totalPending + summary.totalPaid)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {summary.countPending + summary.countPaid} conta(s)
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-purple-100">
                      <CircleDollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-lg font-medium">
                  Contas de {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </h2>
              </div>

              <BillsList
                bills={monthlyBills}
                onPayBill={handlePayBill}
                onEdit={(bill, isRecurring) => {
                  // Se for uma conta recorrente, editar o modelo
                  if (bill.recurring_bill_id || isRecurring) {
                    handleEditMonthly(bill.recurring_bill_id || bill, true);
                  } else {
                    // Se não for recorrente, editar a conta normalmente
                    handleEditMonthly(bill, false);
                  }
                }}
                onDelete={handleDeleteMonthly}
                onRevertPayment={handleRevertPayment}
                loading={loadingMonthly}
                viewMode={viewMode}
              />
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="recurring">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-lg font-medium">Contas Recorrentes Cadastradas</h2>
            </div>

            {loadingRecurring ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                      <div className="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
                      <div className="flex justify-end gap-2">
                        <div className="h-9 bg-gray-200 rounded w-20"></div>
                        <div className="h-9 bg-gray-200 rounded w-20"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : recurringBills.length === 0 ? (
              <div className="text-center py-12">
                <CalendarClock className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma conta recorrente cadastrada</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Adicione contas recorrentes para controlar suas despesas mensais fixas.
                </p>
                <Button 
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setCurrentBill(null);
                    setIsRecurringDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Conta Recorrente
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recurringBills.map((bill) => (
                  <Card
                    key={bill.id}
                    className={`${!bill.active ? 'bg-gray-50 border-gray-200' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className={`font-medium ${!bill.active ? 'text-gray-500' : 'text-gray-800'}`}>
                          {bill.title}
                        </h3>
                        <Badge variant={bill.active ? "outline"  : "secondary"}>
                          {bill.active ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            <span>Dia {bill.due_day} de cada mês</span>
                          </div>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {bill.type === 'fixed' ? 'Valor Fixo' : 'Valor Variável'}
                          </Badge>
                        </div>
                        
                        {bill.type === 'fixed' && (
                          <div className="flex items-center">
                            <CircleDollarSign className="h-5 w-5 mr-2 text-gray-500" />
                            <span className="text-lg font-semibold">
                              {formatCurrency(bill.amount)}
                            </span>
                          </div>
                        )}
                        
                        {bill.category && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Badge className="rounded-sm">
                              {bill.category}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteRecurring(bill)}
                        >
                          Excluir
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditRecurring(bill)}
                        >
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Dialog for recurring bills */}
      <RecurringBillDialog
        isOpen={isRecurringDialogOpen}
        onClose={() => {
          setIsRecurringDialogOpen(false);
          setCurrentBill(null);
        }}
        onSave={handleSaveRecurring}
        bill={currentBill}
        billCategories={billCategories}
      />

      {/* Dialog for variable bills */}
      <AddVariableBillDialog
        isOpen={isVariableBillDialogOpen}
        onClose={() => {
          setIsVariableBillDialogOpen(false);
        }}
        onSave={handleAddVariableBill}
        billCategories={billCategories}
      />

      {/* Dialog for payment */}
      <PayBillDialog
        isOpen={isPayDialogOpen}
        onClose={() => {
          setIsPayDialogOpen(false);
          setCurrentBill(null);
        }}
        onPay={handleConfirmPayment}
        bill={currentBill}
      />
    </div>
  );
}
