/**
 * Lógica centralizada para cálculos por categoria
 */

import { parseQuantity } from "./orderUtils";

export class CategoryLogic {
  
  /**
   * Verifica se é categoria carne
   * @param {string} categoryName - Nome da categoria
   * @returns {boolean}
   */
  static isCarneCategory(categoryName) {
    return categoryName && categoryName.toLowerCase().includes('carne');
  }

  /**
   * Calcula o Total Pedido para categoria carne
   * REGRA:
   * - Se Porcionamento vazio/zero: Total Pedido = Quantidade
   * - Se Porcionamento preenchido: Total Pedido = (Quantidade * 2) * Porcionamento
   * @param {number} baseQuantity - Quantidade base
   * @param {number} adjustmentPercentage - Porcentagem de ajuste (porcionamento)
   * @returns {number} Total pedido calculado
   */
  static calculateCarneTotal(baseQuantity, adjustmentPercentage) {
    const quantity = baseQuantity || 0;
    const percentage = parseQuantity(adjustmentPercentage) || 0;
    
    if (percentage === 0) {
      return quantity;
    }
    
    return (quantity * 2) * (percentage / 100);
  }

  /**
   * Calcula todos os valores de um item baseado na categoria
   * @param {Object} item - Item do pedido
   * @param {string} field - Campo sendo alterado
   * @param {any} value - Novo valor
   * @param {number} mealsExpected - Refeições esperadas
   * @returns {Object} Item atualizado
   */
  static calculateItemValues(item, field, value, mealsExpected) {
    const updatedItem = { ...item };
    const isCarneCategory = this.isCarneCategory(item.category);
    const unitType = (item.unit_type || '').toLowerCase();
    const isUnidType = unitType === 'unid' || unitType === 'unid.' || unitType === 'unidade';

    // Aplicar mudança no campo específico
    if (field === 'base_quantity') {
      const inputValue = parseQuantity(value);
      
      // Sempre usar o valor digitado pelo usuário (permite edição total)
      updatedItem.base_quantity = inputValue;
      
    } else if (field === 'adjustment_percentage') {
      updatedItem.adjustment_percentage = parseQuantity(value) || 0;
    } else if (field === 'notes') {
      updatedItem.notes = value;
      return updatedItem; // Observações não afetam cálculos
    } else {
      updatedItem[field] = value;
    }

    // Recalcular quantidade total baseado na categoria
    if (isCarneCategory) {
      // Para categoria carne: usar fórmula específica
      updatedItem.quantity = this.calculateCarneTotal(
        updatedItem.base_quantity,
        updatedItem.adjustment_percentage
      );
    } else {
      // Para outras categorias: quantidade = base_quantity
      updatedItem.quantity = updatedItem.base_quantity || 0;
    }

    // Recalcular preço total
    updatedItem.total_price = updatedItem.quantity * (updatedItem.unit_price || 0);

    // ✅ CORREÇÃO: Calcular peso total preservando campos de peso da receita
    updatedItem.total_weight = this.calculateItemTotalWeight(updatedItem);

    return updatedItem;
  }

  /**
   * Calcula o peso total de um item baseado na quantidade e tipo de unidade
   * @param {Object} item - Item do pedido
   * @returns {number} Peso total em kg
   */
  static calculateItemTotalWeight(item) {
    if (!item) return 0;
    
    // ✅ CORREÇÃO: Usar base_quantity como fallback quando quantity for zero
    let quantity = parseQuantity(item.quantity) || 0;
    if (quantity === 0 && item.base_quantity) {
      quantity = parseQuantity(item.base_quantity) || 0;
    }
    
    const unitType = (item.unit_type || '').toLowerCase();
    const cubaWeight = parseQuantity(item.cuba_weight) || 0;
    const yieldWeight = parseQuantity(item.yield_weight) || 0;
    
    let totalWeight = 0;
    
    if (unitType === 'cuba' || unitType === 'cuba-g') {
      // Para cuba, usar cuba_weight. Se zerado, tentar yield_weight como fallback
      totalWeight = cubaWeight > 0 ? cubaWeight * quantity : yieldWeight * quantity;
    } else if (unitType === 'kg') {
      // Para kg, a quantidade já é o peso
      totalWeight = quantity;
    } else if (unitType === 'unid' || unitType === 'unid.' || unitType === 'unidade') {
      // Para unidades, usar cuba_weight. Se zerado, tentar yield_weight como fallback
      totalWeight = cubaWeight > 0 ? cubaWeight * quantity : yieldWeight * quantity;
    } else {
      // Tipo de unidade não reconhecido
      totalWeight = 0;
    }
    
    return totalWeight;
  }

  /**
   * Verifica se deve mostrar colunas especiais para a categoria
   * @param {string} categoryName - Nome da categoria
   * @returns {Object} Configuração de colunas
   */
  static getCategoryColumnConfig(categoryName) {
    const isCarneCategory = this.isCarneCategory(categoryName);
    
    return {
      showPorcionamento: isCarneCategory,
      showTotalPedido: isCarneCategory,
      isCarneCategory: isCarneCategory
    };
  }

  /**
   * Gera cabeçalhos da tabela baseado na categoria
   * @param {boolean} isCarneCategory - Se é categoria carne
   * @returns {Array} Array de objetos com configuração dos cabeçalhos
   */
  static getTableHeaders(isCarneCategory) {
    const baseHeaders = [
      { key: 'item', label: 'Item', className: 'text-left p-2 text-xs font-medium text-blue-700 w-1/4' },
      { key: 'quantity', label: 'Quantidade', className: 'text-center p-2 text-xs font-medium text-blue-700 w-16' },
      { key: 'unit', label: 'Unidade', className: 'text-center p-2 text-xs font-medium text-blue-700 w-16' }
    ];

    const carneHeaders = [
      { key: 'porcionamento', label: 'Porcionamento', className: 'text-center p-2 text-xs font-medium text-blue-700 w-16' },
      { key: 'total_pedido', label: 'Total Pedido', className: 'text-center p-2 text-xs font-medium text-blue-700 w-16' }
    ];

    const endHeaders = [
      { key: 'subtotal', label: 'Subtotal', className: 'text-center p-2 text-xs font-medium text-blue-700 w-20' },
      { key: 'peso_total', label: 'Peso Total', className: 'text-center p-2 text-xs font-medium text-blue-700 w-20' },
      { key: 'notes', label: 'Observações', className: 'text-left p-2 text-xs font-medium text-blue-700 w-1/4' }
    ];

    if (isCarneCategory) {
      return [...baseHeaders, ...carneHeaders, ...endHeaders];
    }
    
    return [...baseHeaders, ...endHeaders];
  }

  /**
   * Formata linha da tabela para exportação
   * @param {Object} item - Item do pedido
   * @param {boolean} isCarneCategory - Se é categoria carne
   * @param {Function} formatCurrency - Função para formatar moeda
   * @param {Function} formattedQuantity - Função para formatar quantidade
   * @param {Function} formatWeight - Função para formatar peso
   * @returns {string} Linha formatada
   */
  static formatExportRow(item, isCarneCategory, formatCurrency, formattedQuantity, formatWeight) {
    const baseQty = formattedQuantity(item.base_quantity || 0);
    const unitType = (item.unit_type || '').charAt(0).toUpperCase() + (item.unit_type || '').slice(1);
    const subtotal = formatCurrency(item.total_price || 0);
    const pesoTotal = formatWeight ? formatWeight(item.total_weight || 0) : '0 kg';
    const notes = item.notes || '';
    const unitPrice = formatCurrency(item.unit_price || 0);
    const itemHeader = `${item.recipe_name}\n${unitPrice}/${item.unit_type}`;

    if (isCarneCategory) {
      const adjustmentPct = formattedQuantity(item.adjustment_percentage || 0);
      const totalQty = formattedQuantity(item.quantity || 0);
      
      return `${itemHeader} | ${baseQty} | ${unitType} | ${adjustmentPct}% | ${totalQty} ${item.unit_type} | ${subtotal} | ${pesoTotal} | ${notes}`;
    } else {
      return `${itemHeader} | ${baseQty} | ${unitType} | ${subtotal} | ${pesoTotal} | ${notes}`;
    }
  }

  /**
   * Gera cabeçalho da tabela para exportação
   * @param {boolean} isCarneCategory - Se é categoria carne
   * @returns {string} Cabeçalho formatado
   */
  static getExportHeader(isCarneCategory) {
    if (isCarneCategory) {
      return "Item | Quantidade | Unidade | Porcionamento | Total Pedido | Subtotal | Peso Total | Observações";
    } else {
      return "Item | Quantidade | Unidade | Subtotal | Peso Total | Observações";
    }
  }
}