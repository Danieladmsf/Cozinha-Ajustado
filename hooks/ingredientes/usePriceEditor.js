import { useState, useCallback } from "react";
import { Ingredient, PriceHistory } from "@/app/api/entities";
import { toast } from "@/components/ui/use-toast";

export function usePriceEditor() {
  const [editingPrice, setEditingPrice] = useState(null);
  const [tempPrice, setTempPrice] = useState("");

  const handlePriceEdit = useCallback((ingredient) => {
    setEditingPrice(ingredient.id);
    setTempPrice(ingredient.current_price?.toString() || "0");
  }, []);

  // Função auxiliar para validar preço
  const validatePrice = (priceString) => {
    if (!priceString || typeof priceString !== 'string') {
      return { isValid: false, error: "Preço é obrigatório" };
    }

    const trimmedPrice = priceString.trim();
    if (trimmedPrice === '') {
      return { isValid: false, error: "Preço não pode estar vazio" };
    }

    const numericPrice = parseFloat(trimmedPrice);
    if (isNaN(numericPrice)) {
      return { isValid: false, error: "Preço deve ser um número válido" };
    }

    if (numericPrice < 0) {
      return { isValid: false, error: "Preço não pode ser negativo" };
    }

    if (numericPrice > 999999) {
      return { isValid: false, error: "Preço muito alto (máximo R$ 999.999,00)" };
    }

    return { isValid: true, value: numericPrice };
  };

  const handlePriceSave = useCallback(async (ingredient, onUpdate) => {
    // Validação robusta do preço
    const priceValidation = validatePrice(tempPrice);
    if (!priceValidation.isValid) {
      toast({
        variant: "destructive",
        title: "Erro de Validação",
        description: priceValidation.error
      });
      return;
    }

    const newPrice = priceValidation.value;
    const oldPrice = ingredient.current_price || 0;
    
    // Só prosseguir se o preço realmente mudou (tolerância de 1 centavo)
    if (Math.abs(newPrice - oldPrice) < 0.01) {
      setEditingPrice(null);
      setTempPrice("");
      toast({
        title: "Sem alterações",
        description: "O preço não foi alterado."
      });
      return;
    }

    // Transação atômica: implementar rollback em caso de erro
    let historyCreated = null;
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTimestamp = new Date().toISOString();

    try {
      // 1. Criar registro no histórico PRIMEIRO (para detectar falhas cedo)
      const historyPayload = {
        ingredient_id: ingredient.id,
        old_price: oldPrice,
        new_price: newPrice,
        date: currentDate,
        
        // Dados essenciais do fornecedor
        supplier: ingredient.main_supplier || '',
        supplier_id: ingredient.supplier_id || null,
        supplier_code: ingredient.supplier_code || '',
        
        // Dados essenciais da marca
        brand: ingredient.brand || '',
        brand_id: ingredient.brand_id || null,
        
        // Outros dados essenciais
        category: ingredient.category || '',
        unit: ingredient.unit || 'kg',
        ingredient_name: ingredient.name || ingredient.commercial_name || '',
        
        // Metadados da operação
        change_type: 'manual_update',
        change_source: 'price_editor_interface',
        user_id: 'mock-user-id', // Em produção, pegar do contexto de autenticação
        notes: `Atualização manual via interface - Preço alterado de R$ ${oldPrice.toFixed(2)} para R$ ${newPrice.toFixed(2)}`,
        
        // Timestamp mais preciso
        timestamp: currentTimestamp
      };

      historyCreated = await PriceHistory.create(historyPayload);
      
      console.log('✅ Histórico criado:', {
        id: historyCreated.id,
        ingredient: ingredient.name,
        old_price: oldPrice,
        new_price: newPrice,
        supplier: ingredient.main_supplier,
        brand: ingredient.brand
      });

      // 2. Atualizar o ingrediente no Firebase
      await Ingredient.update(ingredient.id, {
        current_price: newPrice,
        last_update: currentDate
      });

      // 3. Atualizar no estado local via callback (incluindo last_update)
      if (onUpdate) {
        onUpdate(ingredient.id, newPrice, currentDate);
      }

      setEditingPrice(null);
      setTempPrice("");

      const priceChange = newPrice - oldPrice;
      const percentChange = oldPrice > 0 ? (priceChange / oldPrice) * 100 : 0;
      const changeText = priceChange > 0 ? `+R$ ${priceChange.toFixed(2)}` : `R$ ${priceChange.toFixed(2)}`;
      const percentText = `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%`;

      toast({
        title: "💰 Preço atualizado com sucesso!",
        description: `${ingredient.name}: R$ ${oldPrice.toFixed(2).replace('.', ',')} → R$ ${newPrice.toFixed(2).replace('.', ',')} (${changeText} / ${percentText})`
      });

    } catch (err) {
      console.error('❌ Erro na transação de atualização de preço:', err);
      
      // Rollback: tentar remover histórico se foi criado mas falha na atualização do ingrediente
      if (historyCreated) {
        try {
          console.log('🔄 Tentando rollback do histórico...');
          await PriceHistory.delete(historyCreated.id);
          console.log('✅ Rollback do histórico realizado com sucesso');
        } catch (rollbackError) {
          console.error('❌ Erro no rollback do histórico:', rollbackError);
          // Log para monitoramento - histórico órfão detectado
          console.error('🚨 HISTÓRICO ÓRFÃO DETECTADO:', {
            historyId: historyCreated.id,
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            timestamp: currentTimestamp
          });
        }
      }

      toast({
        variant: "destructive",
        title: "Erro ao atualizar preço",
        description: `Falha na atualização: ${err.message}. Nenhuma alteração foi salva.`
      });
    }
  }, [tempPrice]);

  const handlePriceCancel = useCallback(() => {
    setEditingPrice(null);
    setTempPrice("");
  }, []);

  const handleKeyDown = useCallback((e, ingredient, onUpdate) => {
    if (e.key === 'Enter') {
      handlePriceSave(ingredient, onUpdate);
    }
    if (e.key === 'Escape') {
      handlePriceCancel();
    }
  }, [handlePriceSave, handlePriceCancel]);

  return {
    editingPrice,
    tempPrice,
    setTempPrice,
    handlePriceEdit,
    handlePriceSave,
    handlePriceCancel,
    handleKeyDown,
    isEditing: (ingredientId) => editingPrice === ingredientId
  };
}