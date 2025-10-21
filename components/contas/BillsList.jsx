
import React, { useMemo } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isPast, differenceInDays, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CircleDollarSign,
  Calendar,
  DollarSign,
  Check,
  Building,
  AlertTriangle,
  FileText,
  RefreshCcw,
  Clock,
} from "lucide-react";

const BillsList = React.memo(function BillsList({
  bills,
  onPayBill,
  onEdit,
  onDelete,
  onRevertPayment,
  loading,
  viewMode = "grid"
}) {
  // Memoize currency formatter
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    []
  );

  // Memoize date formatter
  const formatDate = (date) => {
    if (typeof date === "string") {
      try {
        date = parseISO(date);
      } catch {
        return "Data inválida";
      }
    }
    if (!(date instanceof Date) || isNaN(date)) return "Data inválida";
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  // Status badge - ajustando cor do "Vence hoje"
  const renderStatus = (bill) => {
    if (bill.status === "paid") {
      return (
        <Badge
          variant="outline"
          className="bg-green-100 text-green-800 border-green-200"
          aria-label="Conta paga"
        >
          <Check className="h-3 w-3 mr-1" />
          Pago
        </Badge>
      );
    }

    const dueDate = typeof bill.due_date === "string"
      ? parseISO(bill.due_date)
      : bill.due_date;

    if (isPast(dueDate) && !isToday(dueDate)) {
      const daysLate = differenceInDays(new Date(), dueDate);
      return (
        <Badge
          variant="outline"
          className="bg-red-100 text-red-800 border-red-200"
          aria-label="Conta atrasada"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          {daysLate} {daysLate === 1 ? "dia" : "dias"} atrasado
        </Badge>
      );
    }

    if (isToday(dueDate)) {
      return (
        <Badge
          variant="outline"
          className="bg-orange-100 text-orange-800 border-orange-200 animate-pulse"
          aria-label="Vence hoje"
        >
          <Clock className="h-3 w-3 mr-1" />
          Vence hoje
        </Badge>
      );
    }

    const daysLeft = differenceInDays(dueDate, new Date());
    return (
      <Badge
        variant="outline"
        className="bg-blue-100 text-blue-800 border-blue-200"
        aria-label="Conta a vencer"
      >
        Vence em {daysLeft} {daysLeft === 1 ? "dia" : "dias"}
      </Badge>
    );
  };
  
  // Renderizar valor da conta, se for tipo variável e valor for 0, mostrar mensagem
  const renderBillAmount = (bill) => {
    if (bill.type === "variable" && (!bill.amount || bill.amount === 0)) {
      return (
        <div className="flex items-center text-amber-600">
          <Clock className="h-4 w-4 mr-1" />
          <span className="italic">Aguardando fatura</span>
        </div>
      );
    }
    return currencyFormatter.format(bill.amount || 0);
  };

  // Skeleton loading
  if (loading) {
    return (
      <section
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        aria-label="Carregando contas"
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse shadow-lg rounded-xl">
            <CardContent className="p-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="flex justify-end gap-2">
                <div className="h-9 bg-gray-200 rounded w-20"></div>
                <div className="h-9 bg-gray-200 rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    );
  }

  // Empty state
  if (!bills || bills.length === 0) {
    return (
      <section className="text-center py-16" aria-label="Nenhuma conta">
        <CircleDollarSign className="mx-auto h-14 w-14 text-gray-300" />
        <h3 className="mt-4 text-xl font-semibold text-gray-900">
          Nenhuma conta para este mês
        </h3>
        <p className="mt-1 text-base text-gray-500">
          Não há contas pendentes ou pagas para o mês selecionado.
        </p>
      </section>
    );
  }

  // Atualizar renderização do botão de edição para passar o tipo correto
  const renderEditButton = (bill) => {
    if (bill.recurring_bill_id) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(bill, true)}
          className="whitespace-nowrap"
        >
          Editar Recorrente
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(bill, false)}
      >
        Editar
      </Button>
    );
  };

  // Helper para determinar a cor do card baseado no status
  const getCardStyle = (bill) => {
    const dueDate = typeof bill.due_date === "string"
      ? parseISO(bill.due_date)
      : bill.due_date;

    if (bill.status === "paid") {
      return "bg-gradient-to-br from-green-50 to-green-100 border-green-200";
    }
    
    if (isToday(dueDate)) {
      return "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 animate-pulse-slow";
    }
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      return "bg-gradient-to-br from-red-50 to-red-100 border-red-300 ring-2 ring-red-200";
    }
    
    return "bg-gradient-to-br from-white to-blue-50 border-blue-200 ring-1 ring-blue-100";
  };

  // Grid view
  if (viewMode === "grid") {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bills.map((bill) => {
          const isPaidBill = bill.status === "paid";
          const dueDate = typeof bill.due_date === "string" ? parseISO(bill.due_date) : bill.due_date;
          const isOverdue = isPast(dueDate) && !isToday(dueDate) && !isPaidBill;
          const isDueToday = isToday(dueDate) && !isPaidBill;

          return (
            <Card
              key={bill.id}
              className={`group relative overflow-hidden rounded-xl transition-all duration-300
                ${getCardStyle(bill)}
                hover:scale-[1.02] hover:shadow-lg focus-within:ring-2 focus-within:ring-blue-300
              `}
            >
              {/* Status bar no topo */}
              <div 
                className={`absolute top-0 left-0 right-0 h-1
                  ${isPaidBill ? "bg-green-500" : 
                    isOverdue ? "bg-red-500" : 
                    isDueToday ? "bg-orange-500" :
                    "bg-blue-500"}
                `}
              />

              <CardContent className="p-6">
                {/* Cabeçalho com fornecedor e status */}
                <div className="space-y-4">
                  {/* Fornecedor com foto */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-20 h-20 rounded-full bg-gray-200 overflow-hidden border border-gray-200 shadow-sm">
                        {bill.supplier_photo ? (
                          <Image 
                            src={bill.supplier_photo} 
                            alt={bill.supplier || 'Fornecedor'} 
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building className="h-10 w-10 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 
                          className={`font-semibold text-xl leading-tight group-hover:text-blue-700 transition-colors
                            ${isPaidBill ? "text-gray-600" : "text-gray-800"}
                          `}
                        >
                          {bill.supplier || bill.title}
                        </h3>
                        {/* Descrição (se houver) */}
                        {bill.description && (
                          <p className="text-sm text-gray-500 mt-1">{bill.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status e Categoria */}
                  <div className="flex items-center justify-between">
                    {/* Categoria */}
                    {bill.category && (
                      <Badge 
                        variant="outline"
                        className={`text-sm px-3 py-1 capitalize
                          ${isPaidBill ? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-700 border-blue-200"}
                        `}
                      >
                        {bill.category}
                      </Badge>
                    )}
                    {/* Status Badge */}
                    {renderStatus(bill)}
                  </div>

                  {/* Informações de Valor e Data */}
                  <div className="bg-white/50 rounded-lg p-4 space-y-3 border border-gray-100">
                    {/* Data de Vencimento */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>Vencimento:</span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {formatDate(dueDate)}
                        {bill.type === "fixed" && !isPaidBill && (
                          <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                            Mensal
                          </span>
                        )}
                        {bill.type === "variable" && !isPaidBill && (
                          <span className="ml-2 text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded">
                            Valor Variável
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Valor */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <DollarSign className="h-4 w-4" />
                        <span>Valor:</span>
                      </div>
                      <span className="text-xl font-bold text-gray-900">
                        {bill.type === "variable" && (!bill.amount || bill.amount === 0) ? (
                          <div className="flex items-center text-amber-600 text-base">
                            <Clock className="h-4 w-4 mr-1" />
                            <span className="italic">Aguardando fatura</span>
                          </div>
                        ) : (
                          currencyFormatter.format(bill.amount || 0)
                        )}
                      </span>
                    </div>

                    {/* Data de Pagamento (se pago) */}
                    {isPaidBill && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Check className="h-4 w-4" />
                          <span>Pago em:</span>
                        </div>
                        <span className="font-medium text-green-600">
                          {formatDate(bill.payment_date)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <footer className="flex flex-wrap justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                  {!isPaidBill ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(bill)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Excluir
                      </Button>

                      {renderEditButton(bill)}

                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => onPayBill(bill)}
                      >
                        Pagar
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRevertPayment(bill)}
                      className="flex items-center gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    >
                      <RefreshCcw className="h-3 w-3" />
                      Reverter Pagamento
                    </Button>
                  )}
                </footer>
              </CardContent>
            </Card>
          );
        })}
      </section>
    );
  }

  // List view
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fornecedor
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Categoria
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Vencimento
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Valor
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {bills.map((bill) => {
            const isPaidBill = bill.status === "paid";
            const dueDate = typeof bill.due_date === "string" ? parseISO(bill.due_date) : bill.due_date;
            const isOverdue = isPast(dueDate) && !isToday(dueDate) && !isPaidBill;
            const isDueToday = isToday(dueDate) && !isPaidBill;

            return (
              <tr 
                key={bill.id} 
                className={`hover:bg-gray-50 transition-colors
                  ${isPaidBill ? 'bg-green-50' : 
                    isOverdue ? 'bg-red-50' :
                    isDueToday ? 'bg-orange-50' :
                    ''}
                `}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
                      {bill.supplier_photo ? (
                        <Image 
                          src={bill.supplier_photo} 
                          alt={bill.supplier || 'Fornecedor'} 
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{bill.supplier || bill.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-[200px]">{bill.description || ""}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {bill.category}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatDate(dueDate)}</div>
                  {bill.type === "fixed" && !isPaidBill && (
                    <div className="text-xs text-blue-600">Mensal</div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  {renderBillAmount(bill)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {renderStatus(bill)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  {!isPaidBill ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(bill)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Excluir
                      </Button>

                      {renderEditButton(bill)}

                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => onPayBill(bill)}
                      >
                        Pagar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRevertPayment(bill)}
                      className="flex items-center gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    >
                      <RefreshCcw className="h-3 w-3" />
                      Reverter
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

export default BillsList;
