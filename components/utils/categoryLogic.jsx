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
   * Aplica condição global para o campo Quantidade
   * Condição: se Unidade = "Unid." então usar "Refeições Esperadas", senão usar valor informado
   * @param {Object} item - Item do pedido
   * @param {number} mealsExpected - Refeições esperadas
   * @param {number} inputValue - Valor informado pelo usuário
   * @returns {number} Quantidade calculada
   */
  static calculateQuantity(item, mealsExpected, inputValue) {
    const unitType = (item.unit_type || '').toLowerCase();
    
    // Condição global: se unidade é "unid" usar refeições esperadas
    if (unitType === 'unid' || unitType === 'unid.' || unitType === 'unidade') {
      return mealsExpected || 0;
    }
    
    // Caso contrário, usar valor informado
    return parseQuantity(inputValue) || 0;
  }

  /**
   * Calcula o Total Pedido para categoria carne
   * Condição: se "Porcionamento" <> "" então ((Quantidade*2)*"Porcionamento") senão Quantidade
   * @param {number} baseQuantity - Quantidade base
   * @param {number} adjustmentPercentage - Porcentagem de ajuste (porcionamento)
   * @returns {number} Total pedido calculado
   */
  static calculateCarneTotal(baseQuantity, adjustmentPercentage) {
    const quantity = baseQuantity || 0;
    const percentage = parseQuantity(adjustmentPercentage);
    
    // Se tem porcionamento, aplicar fórmula: (Quantidade * 2) * Porcionamento
    if (percentage !== null && percentage !== undefined && percentage !== 0) {
      return (quantity * 2) * (percentage / 100);
    }
    
    // Senão, usar quantidade base
    return quantity;
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

    // Aplicar mudança no campo específico
    if (field === 'base_quantity') {
      const inputValue = parseQuantity(value);
      
      // Aplicar condição global para quantidade
      updatedItem.base_quantity = this.calculateQuantity(item, mealsExpected, inputValue);
      
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

    return updatedItem;
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
   * @returns {string} Linha formatada
   */
  static formatExportRow(item, isCarneCategory, formatCurrency, formattedQuantity) {
    const baseQty = formattedQuantity(item.base_quantity || 0);
    const unitType = (item.unit_type || '').charAt(0).toUpperCase() + (item.unit_type || '').slice(1);
    const subtotal = formatCurrency(item.total_price || 0);
    const notes = item.notes || '';
    const unitPrice = formatCurrency(item.unit_price || 0);
    const itemHeader = `${item.recipe_name}\n${unitPrice}/${item.unit_type}`;

    if (isCarneCategory) {
      const adjustmentPct = formattedQuantity(item.adjustment_percentage || 0);
      const totalQty = formattedQuantity(item.quantity || 0);
      
      return `${itemHeader} | ${baseQty} | ${unitType} | ${adjustmentPct}% | ${totalQty} ${item.unit_type} | ${subtotal} | ${notes}`;
    } else {
      return `${itemHeader} | ${baseQty} | ${unitType} | ${subtotal} | ${notes}`;
    }
  }

  /**
   * Gera cabeçalho da tabela para exportação
   * @param {boolean} isCarneCategory - Se é categoria carne
   * @returns {string} Cabeçalho formatado
   */
  static getExportHeader(isCarneCategory) {
    if (isCarneCategory) {
      return "Item | Quantidade | Unidade | Porcionamento | Total Pedido | Subtotal | Observações";
    } else {
      return "Item | Quantidade | Unidade | Subtotal | Observações";
    }
  }
}