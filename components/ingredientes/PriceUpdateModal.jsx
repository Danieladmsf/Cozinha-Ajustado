import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  AlertTriangle, 
  Save, 
  X, 
  TrendingUp, 
  TrendingDown,
  Package,
  Store,
  Tag,
  Calendar,
  Info
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { formatPrice } from "@/lib/formatUtils";
import { Ingredient, PriceHistory, Supplier, Brand } from "@/app/api/entities";

export default function PriceUpdateModal({ 
  ingredient, 
  isOpen, 
  onClose, 
  onUpdate 
}) {
  // Função para forçar fechamento do modal
  const forceClose = () => {
    setSaving(false);
    setLoading(false);
    setError(null);
    if (onClose) {
      onClose();
    }
  };
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    new_price: '',
    supplier: '',
    supplier_id: '',
    brand: '',
    brand_id: '',
    category: '',
    notes: '',
    update_date: new Date().toISOString().split('T')[0]
  });

  // Dropdown options
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);

  // Reset form when ingredient changes or modal opens
  useEffect(() => {
    if (ingredient && isOpen) {
      setFormData({
        new_price: ingredient.current_price?.toString() || '',
        supplier: ingredient.main_supplier || '',
        supplier_id: ingredient.supplier_id || '',
        brand: ingredient.brand || '',
        brand_id: ingredient.brand_id || '',
        category: ingredient.category || '',
        notes: '',
        update_date: new Date().toISOString().split('T')[0]
      });
      loadDropdownData();
      setError(null);
      setSaving(false); // Garantir que não está em estado de salvamento
    }
  }, [ingredient, isOpen]);

  // Reset estados quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSaving(false);
      setLoading(false);
    }
  }, [isOpen]);

  const loadDropdownData = async () => {
    try {
      setLoading(true);
      const [suppliersData, brandsData] = await Promise.all([
        Supplier.list().catch(() => []),
        Brand.list().catch(() => [])
      ]);
      
      setSuppliers(Array.isArray(suppliersData) ? suppliersData.filter(s => s.active) : []);
      setBrands(Array.isArray(brandsData) ? brandsData.filter(b => b.active) : []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSupplierSelect = (supplierId) => {
    const selectedSupplier = suppliers.find(s => s.id === supplierId);
    if (selectedSupplier) {
      handleInputChange('supplier', selectedSupplier.company_name || selectedSupplier.name);
      handleInputChange('supplier_id', selectedSupplier.id);
    }
  };

  const handleBrandSelect = (brandId) => {
    const selectedBrand = brands.find(b => b.id === brandId);
    if (selectedBrand) {
      handleInputChange('brand', selectedBrand.name);
      handleInputChange('brand_id', selectedBrand.id);
    }
  };

  const validateForm = () => {
    const errors = [];
    
    // Validar preço
    const price = parseFloat(formData.new_price);
    if (!formData.new_price || isNaN(price)) {
      errors.push("Preço é obrigatório e deve ser um número válido");
    } else if (price < 0) {
      errors.push("Preço não pode ser negativo");
    } else if (price > 999999) {
      errors.push("Preço muito alto (máximo R$ 999.999,00)");
    }

    // Validar fornecedor
    if (!formData.supplier.trim()) {
      errors.push("Fornecedor é obrigatório");
    }

    // Validar categoria
    if (!formData.category.trim()) {
      errors.push("Categoria é obrigatória");
    }

    // Validar data
    if (!formData.update_date) {
      errors.push("Data é obrigatória");
    }

    return errors;
  };

  const calculatePriceChange = () => {
    const oldPrice = ingredient?.current_price || 0;
    const newPrice = parseFloat(formData.new_price) || 0;
    const change = newPrice - oldPrice;
    const percentChange = oldPrice > 0 ? (change / oldPrice) * 100 : 0;
    
    return {
      oldPrice,
      newPrice,
      change,
      percentChange,
      hasChange: Math.abs(change) >= 0.01
    };
  };

  const handleSave = async () => {
    setError(null);
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(", "));
      return;
    }

    const priceCalc = calculatePriceChange();
    if (!priceCalc.hasChange) {
      setError("O preço não foi alterado. Insira um valor diferente do atual.");
      return;
    }

    try {
      setSaving(true);
      
      const currentTimestamp = new Date().toISOString();
      
      // Criar histórico PRIMEIRO
      const historyPayload = {
        ingredient_id: ingredient.id,
        old_price: priceCalc.oldPrice,
        new_price: priceCalc.newPrice,
        date: formData.update_date,
        
        // Dados atualizados
        supplier: formData.supplier,
        supplier_id: formData.supplier_id || null,
        brand: formData.brand,
        brand_id: formData.brand_id || null,
        category: formData.category,
        unit: ingredient.unit || 'kg',
        ingredient_name: ingredient.name,
        
        // Metadados
        change_type: 'manual_price_update',
        change_source: 'price_update_modal',
        user_id: 'mock-user-id',
        notes: formData.notes || `Atualização manual: R$ ${priceCalc.oldPrice.toFixed(2)} → R$ ${priceCalc.newPrice.toFixed(2)}`,
        timestamp: currentTimestamp
      };

      const historyRecord = await PriceHistory.create(historyPayload);
      
      // Atualizar ingrediente
      await Ingredient.update(ingredient.id, {
        current_price: priceCalc.newPrice,
        main_supplier: formData.supplier,
        supplier_id: formData.supplier_id || null,
        brand: formData.brand,
        brand_id: formData.brand_id || null,
        category: formData.category,
        last_update: formData.update_date
      });

      // Atualizar estado local com dados completos
      if (onUpdate) {
        const updatedData = {
          current_price: priceCalc.newPrice,
          main_supplier: formData.supplier,
          supplier_id: formData.supplier_id || null,
          brand: formData.brand,
          brand_id: formData.brand_id || null,
          category: formData.category,
          last_update: formData.update_date
        };
        onUpdate(ingredient.id, updatedData);
      }

      const changeText = priceCalc.change > 0 ? `+R$ ${priceCalc.change.toFixed(2)}` : `R$ ${priceCalc.change.toFixed(2)}`;
      const percentText = `${priceCalc.percentChange > 0 ? '+' : ''}${priceCalc.percentChange.toFixed(1)}%`;

      toast({
        title: "💰 Preço atualizado com sucesso!",
        description: `${ingredient.name}: R$ ${priceCalc.oldPrice.toFixed(2).replace('.', ',')} → R$ ${priceCalc.newPrice.toFixed(2).replace('.', ',')} (${changeText} / ${percentText})`
      });

      // Garantir que o modal feche após salvar com sucesso
      
      // Aguardar um pequeno delay para o toast aparecer, depois fechar
      setTimeout(() => {
        forceClose();
      }, 500);

    } catch (err) {
      setError(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!ingredient) return null;

  const priceCalc = calculatePriceChange();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl">Atualizar Preço</div>
              <div className="text-sm text-slate-600 font-normal">{ingredient.name}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preço Atual vs Novo */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Alteração de Preço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <Label className="text-sm text-slate-600">Preço Atual</Label>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {formatPrice(ingredient.current_price)}
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Label className="text-sm text-blue-600">Novo Preço</Label>
                  <div className="text-2xl font-bold text-blue-800 mt-1">
                    {formatPrice(formData.new_price)}
                  </div>
                </div>
              </div>
              
              {priceCalc.hasChange && (
                <div className="flex items-center justify-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
                  {priceCalc.change > 0 ? (
                    <TrendingUp className="w-5 h-5 text-red-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-green-600" />
                  )}
                  <div className={`text-lg font-bold ${priceCalc.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {priceCalc.change > 0 ? '+' : ''}R$ {priceCalc.change.toFixed(2)} 
                    ({priceCalc.percentChange > 0 ? '+' : ''}{priceCalc.percentChange.toFixed(1)}%)
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulário */}
          <div className="grid gap-6">
            {/* Preço */}
            <div>
              <Label htmlFor="new_price" className="text-sm font-medium">
                Novo Preço (R$) *
              </Label>
              <Input
                id="new_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.new_price}
                onChange={(e) => handleInputChange('new_price', e.target.value)}
                className="mt-1"
                placeholder="0.00"
                required
              />
            </div>

            {/* Fornecedor */}
            <div>
              <Label className="text-sm font-medium">Fornecedor *</Label>
              <Select 
                value={formData.supplier_id} 
                onValueChange={handleSupplierSelect}
                disabled={loading}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.company_name || supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.supplier && !formData.supplier_id && (
                <div className="mt-1 text-sm text-amber-600 flex items-center gap-1">
                  <Info className="w-4 h-4" />
                  Fornecedor personalizado: {formData.supplier}
                </div>
              )}
            </div>

            {/* Marca */}
            <div>
              <Label className="text-sm font-medium">Marca</Label>
              <Select 
                value={formData.brand_id} 
                onValueChange={handleBrandSelect}
                disabled={loading}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a marca (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categoria */}
            <div>
              <Label htmlFor="category" className="text-sm font-medium">
                Categoria *
              </Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="mt-1"
                placeholder="Ex: Laticínios, Carnes, etc."
                required
              />
            </div>

            {/* Data */}
            <div>
              <Label htmlFor="update_date" className="text-sm font-medium">
                Data da Atualização *
              </Label>
              <Input
                id="update_date"
                type="date"
                value={formData.update_date}
                onChange={(e) => handleInputChange('update_date', e.target.value)}
                className="mt-1"
                required
              />
            </div>

            {/* Observações */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium">
                Observações
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="mt-1 resize-none"
                rows={3}
                placeholder="Motivo da alteração, notas adicionais..."
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={forceClose}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                try {
                  await handleSave();
                } catch (error) {
                }
              }}
              disabled={saving || loading}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alteração
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}