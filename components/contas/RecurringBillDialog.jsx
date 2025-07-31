import React, { useState, useEffect } from "react";
import Image from "next/image";
import { RecurringBill } from "@/app/api/entities";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  FileText, 
  DollarSign, 
  Clock, 
  Tag, 
  Building, 
  CircleDollarSign,
  Barcode,
  Copy,
  Loader2,
  AlertCircle
} from "lucide-react";
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBarcodeProcessor } from "./BarcodeProcessor";
import { Supplier } from "@/app/api/entities";

export default function RecurringBillDialog({ 
  isOpen, 
  onClose, 
  onSave, 
  bill = null,
  billCategories = []
}) {
  const [formData, setFormData] = useState({
    description: bill?.description || "",
    due_day: bill?.due_day || 10,
    amount: bill?.amount || "",
    type: bill?.type || "fixed",
    category: bill?.category || "outros",
    supplier: bill?.supplier || "",
    active: bill?.active ?? true,
    color: bill?.color || "#4f46e5",
    notes: bill?.notes || "",
    barcode: bill?.barcode || ""
  });
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // Carregar fornecedores ao abrir o diálogo
  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
    }
  }, [isOpen]);

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      const data = await Supplier.list();
      // Filtrar apenas fornecedores ativos e ordenar por nome
      const activeSuppliers = data
        .filter(s => s.active)
        .sort((a, b) => a.company_name.localeCompare(b.company_name));
      setSuppliers(activeSuppliers);
    } catch (error) {} finally {
      setLoadingSuppliers(false);
    }
  };

  // Usar o processador de código de barras
  const {
    barcode,
    setBarcode,
    barcodeError,
    barcodeProcessing,
    extractedDueDate,
    extractedValue,
    delayInfo,
    handleBarcodeInput,
    processBarcode,
    copyToClipboard
  } = useBarcodeProcessor();

  // Atualizar o código de barras do formulário quando o formulário for aberto
  useEffect(() => {
    if (isOpen && bill?.barcode) {
      setBarcode(bill.barcode);
    } else if (isOpen) {
      setBarcode("");
    }
  }, [isOpen, bill]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    // Aceita apenas números
    const numericValue = value.replace(/[^0-9]/g, '');
    
    if (name === 'due_day') {
      // Limita o dia entre 1 e 31
      let day = parseInt(numericValue, 10);
      if (isNaN(day)) day = "";
      else if (day < 1) day = 1;
      else if (day > 31) day = 31;
      
      setFormData(prev => ({ ...prev, [name]: day }));
    } else {
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    }
  };

  const handleAmountChange = (e) => {
    const { value } = e.target;
    // Remove caracteres não numéricos
    const numericValue = value.replace(/[^\d,.-]/g, '');
    
    // Converte para formato numérico
    let parsedValue = numericValue.replace(',', '.');
    if (parsedValue === '') {
      setFormData(prev => ({ ...prev, amount: '' }));
    } else {
      const floatValue = parseFloat(parsedValue);
      if (!isNaN(floatValue)) {
        setFormData(prev => ({ ...prev, amount: floatValue }));
      }
    }
  };

  const handleBarcodeProcess = () => {
    const result = processBarcode();
    if (result.value !== null && result.date) {
      // Atualizar o formulário com os dados extraídos
      setFormData(prev => ({
        ...prev,
        amount: result.value,
        due_day: result.date.getDate(),
        barcode: barcode
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Formatando os dados para salvar
      const billData = {
        ...formData,
        // Usar o fornecedor como título
        title: formData.supplier,
        // Garante que amount seja número para contas fixas
        amount: formData.type === 'fixed' ? Number(formData.amount) : (formData.amount || null),
        barcode: barcode || formData.barcode
      };
      
      let savedBill;
      
      if (bill?.id) {
        savedBill = await RecurringBill.update(bill.id, billData);
      } else {
        savedBill = await RecurringBill.create(billData);
      }
      
      onSave(savedBill);
      onClose();
    } catch (error) {// Adicionar toast de erro aqui
    }
  };

  const defaultCategories = [
    "Aluguel", "Energia", "Água", "Internet", "Telefone", 
    "Impostos", "Seguros", "Assinaturas", "Serviços", "Outros"
  ];

  const allCategories = billCategories.length > 0 
    ? billCategories 
    : defaultCategories;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-blue-500" />
            {bill ? "Editar Conta Recorrente" : "Nova Conta Recorrente"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coluna da esquerda */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Barcode className="h-4 w-4" />
                    Código de Barras
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={barcode}
                      onChange={handleBarcodeInput}
                      placeholder="Digite ou cole o código de barras"
                    />
                    <Button type="button" onClick={copyToClipboard} size="icon" variant="outline">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button 
                    type="button" 
                    onClick={handleBarcodeProcess}
                    disabled={barcodeProcessing || !barcode}
                    variant="secondary"
                    className="w-full"
                  >
                    {barcodeProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando
                      </>
                    ) : (
                      'Extrair Dados'
                    )}
                  </Button>
                  {barcodeError && (
                    <p className="text-sm text-red-500">{barcodeError}</p>
                  )}
                  {delayInfo.delayed && (
                    <Alert variant="destructive" className="mt-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Atenção</AlertTitle>
                      <AlertDescription>
                        Esta conta está atrasada por {delayInfo.days} dias.
                      </AlertDescription>
                    </Alert>
                  )}
                  {extractedValue !== null && extractedDueDate && !barcodeError && (
                    <Alert variant="default" className="mt-3 bg-blue-50">
                      <AlertTitle>Dados Extraídos</AlertTitle>
                      <AlertDescription>
                        <div>Valor: R$ {extractedValue.toFixed(2)}</div>
                        <div>Vencimento: {extractedDueDate.toLocaleDateString('pt-BR')}</div>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="supplier" className="flex gap-2 items-center">
                  <Building className="h-4 w-4 text-gray-500" />
                  Fornecedor/Beneficiário
                </Label>
                <Select
                  value={formData.supplier}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, supplier: value }))}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingSuppliers ? (
                      <SelectItem value={null} disabled>
                        Carregando fornecedores...
                      </SelectItem>
                    ) : (
                      <>
                        <SelectItem value={null}>Selecione um fornecedor</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem 
                            key={supplier.id} 
                            value={supplier.company_name}
                            className="flex items-center gap-2"
                          >
                            <div className="flex items-center gap-2">
                              {supplier.vendor_photo && (
                                <Image 
                                  src={supplier.vendor_photo} 
                                  alt={supplier.company_name || 'Fornecedor'}
                                  width={24}
                                  height={24}
                                  className="w-6 h-6 rounded-full object-cover"
                                  unoptimized
                                />
                              )}
                              {supplier.company_name}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex gap-2 items-center">
                  <Clock className="h-4 w-4 text-gray-500" />
                  Tipo de Recorrência
                </Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed">Data e Valor Fixos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="variable" id="variable" />
                    <Label htmlFor="variable">Data Fixa e Valor Variável</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Coluna da direita */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_day" className="flex gap-2 items-center">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    Dia de Vencimento
                  </Label>
                  <Input
                    id="due_day"
                    name="due_day"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.due_day}
                    onChange={handleNumberChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category" className="flex gap-2 items-center">
                    <Tag className="h-4 w-4 text-gray-500" />
                    Categoria
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map((category) => (
                        <SelectItem key={category} value={category.toLowerCase()}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.type === 'fixed' && (
                <div className="space-y-2">
                  <Label htmlFor="amount" className="flex gap-2 items-center">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    Valor Fixo (R$)
                  </Label>
                  <Input
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleAmountChange}
                    placeholder="0,00"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description" className="flex gap-2 items-center">
                  Descrição (opcional)
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Detalhes adicionais sobre esta conta"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, active: checked }))
                  }
                />
                <Label htmlFor="active">Conta Ativa</Label>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {bill ? "Salvar Alterações" : "Criar Conta Recorrente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}