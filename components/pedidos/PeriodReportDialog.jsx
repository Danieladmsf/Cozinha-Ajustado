import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import DatePicker from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { Loader2 } from "lucide-react";

export default function PeriodReportDialog({ open, onOpenChange, onSubmit, customerName, isGenerating }) {
  const [periodType, setPeriodType] = useState("current_month");
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customEndDate, setCustomEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const handleSubmit = () => {
    let startDate, endDate;
    const today = new Date();

    if (periodType === "current_month") {
      startDate = format(startOfMonth(today), "yyyy-MM-dd");
      endDate = format(endOfMonth(today), "yyyy-MM-dd");
    } else if (periodType === "previous_month") {
      const prevMonth = subMonths(today, 1);
      startDate = format(startOfMonth(prevMonth), "yyyy-MM-dd");
      endDate = format(endOfMonth(prevMonth), "yyyy-MM-dd");
    } else { // custom
      startDate = customStartDate;
      endDate = customEndDate;
    }
    onSubmit(startDate, endDate);
  };

  useEffect(() => {
    if (open) {
      setPeriodType("current_month");
      setCustomStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
      setCustomEndDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 space-y-3 pb-4">
          <DialogTitle className="text-lg font-semibold text-slate-900">
            Gerar Relatório Consolidado
          </DialogTitle>
          {customerName && (
            <DialogDescription className="text-sm text-slate-600">
              Cliente: <span className="font-medium text-slate-800">{customerName}</span>
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 py-2">
          <div className="space-y-3">
            <Label htmlFor="periodType" className="text-sm font-medium text-slate-700">
              Período do Relatório
            </Label>
            <Select value={periodType} onValueChange={setPeriodType} name="periodType">
              <SelectTrigger id="periodType" className="w-full">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Mês Atual</SelectItem>
                <SelectItem value="previous_month">Mês Anterior</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodType === "custom" && (
            <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customStartDate" className="text-sm font-medium text-slate-700">
                    Data de Início
                  </Label>
                  <DatePicker
                    selected={customStartDate}
                    onChange={setCustomStartDate}
                    className="w-full"
                    id="customStartDate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customEndDate" className="text-sm font-medium text-slate-700">
                    Data de Fim
                  </Label>
                  <DatePicker
                    selected={customEndDate}
                    onChange={setCustomEndDate}
                    className="w-full"
                    id="customEndDate"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex-shrink-0 flex flex-row justify-end gap-3 pt-6 border-t border-slate-200">
          <DialogClose asChild>
            <Button 
              type="button" 
              variant="outline"
              disabled={isGenerating}
              className="min-w-[80px]"
            >
              Cancelar
            </Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={!customerName || isGenerating}
            className="min-w-[120px] bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              "Gerar Relatório"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}