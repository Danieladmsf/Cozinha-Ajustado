import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, CircleDollarSign } from "lucide-react";
import DatePicker from "@/components/ui/date-picker";
import { format } from "date-fns";

export default function PayBillDialog({ 
  isOpen, 
  onClose, 
  onPay, 
  bill 
}) {
  const [amount, setAmount] = useState(bill?.amount?.toString() || "");
  const [paymentDate, setPaymentDate] = useState(new Date());

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen && bill) {
      setAmount(bill.amount?.toString() || "");
      setPaymentDate(new Date());
    }
  }, [isOpen, bill]);

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Remove caracteres não numéricos
    const numericValue = value.replace(/[^\d,.-]/g, '');
    
    // Converte para formato numérico
    const formattedValue = numericValue.replace(',', '.');
    setAmount(formattedValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    onPay(bill?.id, {
      paid_amount: parseFloat(amount),
      payment_date: format(paymentDate, 'yyyy-MM-dd') // Formato ISO string sem timezone
    });
  };

  // Helper para garantir data válida
  const getFormattedDate = (dateString) => {
    try {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return ''; // Data inválida
      return format(date, 'dd/MM/yyyy');
    } catch (error) {return '';
    }
  };

  const formatCurrency = (value) => {
    try {
      if (!value || isNaN(value)) return 'R$ 0,00';
      return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(value);
    } catch (error) {return 'R$ 0,00';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-green-500" />
            Registrar Pagamento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="rounded-md bg-gray-50 p-4">
            <h3 className="font-medium">{bill?.title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Vencimento: {getFormattedDate(bill?.due_date)}
            </p>
            <p className="text-sm font-medium mt-1">
              Valor: {formatCurrency(bill?.amount)}
            </p>
            {bill?.type === 'fixed' && (
              <div className="mt-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Data e Valor Fixos
                </Badge>
              </div>
            )}
          </div>

          {/* Campo de valor só aparece se a conta NÃO for do tipo fixed */}
          {bill?.type !== 'fixed' && (
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex gap-2 items-center">
                <DollarSign className="h-4 w-4 text-gray-500" />
                Valor Pago (R$)
              </Label>
              <Input
                id="amount"
                name="amount"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0,00"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="payment_date" className="flex gap-2 items-center">
              <Calendar className="h-4 w-4 text-gray-500" />
              Data de Pagamento
            </Label>
            <DatePicker
              id="payment_date"
              selected={paymentDate}
              onChange={(date) => setPaymentDate(date)}
              placeholder="Selecione a data"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}