'use client';

import React, { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Utensils, CheckCircle } from "lucide-react";
import {
  parseQuantity as utilParseQuantity,
  formattedQuantity as utilFormattedQuantity,
  formatCurrency as utilFormatCurrency,
  formatWeight as utilFormatWeight
} from "@/components/utils/orderUtils";
import { convertCubaGToKitchenFormat } from "@/lib/cubaConversionUtils";
import NoteViewer from '@/components/shared/NoteViewer';
import { CategoryLogic } from "@/components/utils/categoryLogic";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

const OrdersTab = ({
  currentOrder,
  orderItems,
  orderTotals,
  mealsExpected,
  setMealsExpected,
  generalNotes,
  setGeneralNotes,
  updateOrderItem,
  submitOrder,
  enableEditMode,
  isEditMode,
  showSuccessEffect,
  existingOrder,
  wasteItems,
  existingWaste,
  groupItemsByCategory,
  getOrderedCategories,
  generateCategoryStyles
}) => {
  const { registerInput, handleKeyDown } = useKeyboardNavigation();
  
  // Função para formatar peso baseado na unidade
  const formatWeightByUnit = (item) => {
    const pesoFinal = item.total_weight || item.calculated_total_weight || (item.recipe_cuba_weight * (item.quantity || item.base_quantity || 0)) || 0;
    const unitType = (item.unit_type || '').toLowerCase();
    
    if (unitType === 'unid' || unitType === 'unid.' || unitType === 'unidade') {
      return `${utilFormattedQuantity(item.quantity || item.base_quantity || 0)} Unid.`;
    }
    
    return utilFormatWeight(pesoFinal);
  };
  

  if (!currentOrder?.items || currentOrder.items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="font-semibold text-lg text-gray-700 mb-2">Nenhum Item Disponível</h3>
          <p className="text-gray-500 text-sm">
            Não há itens disponíveis no cardápio para este dia.
          </p>
        </CardContent>
      </Card>
    );
  }

  const itemsToGroup = currentOrder?.items || [];
  const groupedItems = groupItemsByCategory(itemsToGroup, (item) => item.category);
  const orderedCategories = getOrderedCategories(groupedItems);

  return (
    <div className="space-y-4">
      {/* Efeito de Sucesso Overlay */}
      {showSuccessEffect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl p-8 shadow-2xl animate-in zoom-in duration-500">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Pedido Enviado!</h2>
              <p className="text-gray-600">Seu pedido foi enviado com sucesso</p>
              <div className="mt-4 flex items-center justify-center text-green-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                <span className="ml-2 text-sm">Processando...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status do Pedido Enviado */}
      {!isEditMode && existingOrder && !showSuccessEffect && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-700">Pedido Enviado com Sucesso</h3>
                  <p className="text-sm text-green-600">Este pedido já foi processado e enviado. Clique em "Editar" para fazer alterações.</p>
                </div>
              </div>
              <Button 
                onClick={enableEditMode}
                variant="outline"
                size="sm"
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                Editar Pedido
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campo Refeições Esperadas */}
      <Card className="border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">
                Refeições Esperadas <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                inputMode="decimal"
                value={mealsExpected === 0 ? '' : mealsExpected || ''}
                onChange={(e) => {
                  if (isEditMode) {
                    const rawValue = e.target.value;
                    // Apenas permitir números e vírgula/ponto
                    const sanitizedValue = rawValue.replace(/[^0-9,.]/g, '');
                    const parsedValue = utilParseQuantity(sanitizedValue);
                    setMealsExpected(parsedValue || 0);
                  }
                }}
                onFocus={(e) => e.target.select()} // Adicionado para selecionar o texto ao focar
                className={`border-blue-300 focus:border-blue-500 ${
                  (!mealsExpected || mealsExpected <= 0) && isEditMode 
                    ? 'border-red-300 bg-red-50' 
                    : ''
                }`}
                placeholder="Número de refeições esperadas (obrigatório)"
                disabled={!isEditMode}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabelas de Pedido por Categoria */}
      {orderedCategories.map(({ name: categoryName, data: categoryData }) => {
        const { headerStyle } = generateCategoryStyles(categoryData.categoryInfo.color);
        
        // Obter configuração das colunas baseada na categoria
        const columnConfig = CategoryLogic.getCategoryColumnConfig(categoryName);
        const tableHeaders = CategoryLogic.getTableHeaders(columnConfig.isCarneCategory);
        
        return (
          <div key={categoryName} className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden hover:shadow-md transition-all duration-300">
            <div 
              className="py-4 px-6 relative border-b border-gray-100/50" 
              style={headerStyle}
            >
              <div className="flex items-center">
                <div 
                  className="w-5 h-5 rounded-full mr-3 shadow-sm border-2 border-white/30 ring-2 ring-white/20" 
                  style={{ backgroundColor: categoryData.categoryInfo.color }}
                />
                <h3 className="text-lg font-semibold text-gray-800">{categoryName}</h3>
              </div>
            </div>
            <div className="p-6 bg-gradient-to-b from-white to-gray-50/30">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-100 bg-blue-50">
                      {tableHeaders.map((header) => (
                        <th key={header.key} className={header.className}>
                          {header.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.items.map((item, index) => {
                      const categoryIndex = orderedCategories.findIndex(cat => cat.name === categoryName);
                      const baseInputId = `qty-${categoryIndex}-${index}`;
                      const percentInputId = `pct-${categoryIndex}-${index}`;
                      const notesInputId = `notes-${categoryIndex}-${index}`;
                      
                      return (
                        <tr key={item.unique_id} className="border-b border-blue-50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium text-blue-900 text-xs">{item.recipe_name}</p>
                              <p className="text-xs text-blue-600">
                                {item.tech_sheet_units_quantity > 0 && item.tech_sheet_unit_weight > 0 && (() => {
                                  const isPorcao = item.unit_type && item.unit_type.toLowerCase() === 'porção';
                                  const unitText = isPorcao ? 'Unid.' : (item.unit_type && item.unit_type.toLowerCase() !== 'unid' && item.unit_type.toLowerCase() !== 'unidade' ? item.unit_type : (item.tech_sheet_units_quantity > 1 ? 'unidades' : 'unidade'));
                                  
                                  let weightInfo = '';
                                  if (isPorcao) {
                                    weightInfo = ` | Peso: ${utilFormatWeight((item.tech_sheet_units_quantity || 0) * (item.tech_sheet_unit_weight || 0))}`;
                                  }

                                  return (
                                    <>
                                      <span className="text-purple-600 text-[9px]">
                                        (Contém, {item.tech_sheet_units_quantity} {unitText} de {utilFormatWeight(item.tech_sheet_unit_weight)}){weightInfo}
                                      </span>
                                      <br />
                                    </>
                                  );
                                })()}
                                {(() => {
                                  return utilFormatCurrency(item.unit_price);
                                })()}/{item.unit_type}
                              </p>
                            </div>
                          </td>
                          {/* Coluna de Sugestão de Quantidade */}
                          <td className="p-2 text-center min-w-[100px]">
                            {item.suggestion?.has_suggestion ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-bold text-sm text-amber-700">
                                  {(() => {
                                    const originalValue = parseFloat(item.suggestion.suggested_base_quantity || 0);
                                    const value = utilFormattedQuantity(originalValue);
                                    return value;
                                  })()}
                                </span>
                                {item.unit_type?.toLowerCase() === 'cuba-g' && (
                                  <span className="text-xs text-amber-600 font-semibold">
                                    ({convertCubaGToKitchenFormat(parseFloat(item.suggestion.suggested_base_quantity || 0))})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          {/* Coluna de Input de Quantidade */}
                          <td className="p-2 text-center">
                            <DecimalInput
                              ref={(ref) => registerInput(baseInputId, ref)}
                              value={item.base_quantity === 0 ? '' : item.base_quantity || ''}
                              onChange={(e) => {
                                if (isEditMode) {
                                  updateOrderItem(item.unique_id, 'base_quantity', e.target.value);
                                }
                              }}
                              placeholder={item.unit_type && (item.unit_type.toLowerCase() === 'unid' || item.unit_type.toLowerCase() === 'unid.') ? 'Auto (Refeições)' : '0'}
                              onKeyDown={(e) => handleKeyDown(e, baseInputId)}
                              className="block mx-auto text-center text-xs h-8 max-w-[60px] border-blue-300 focus:border-blue-500"
                              placeholder="0"
                              disabled={!isEditMode}
                            />
                          </td>
                          <td className="p-2">
                            <div className="text-center text-xs font-medium">
                              {item.unit_type ? (
                                <span className="text-blue-700">
                                  {item.unit_type.charAt(0).toUpperCase() + item.unit_type.slice(1)}
                                </span>
                              ) : (
                                <span className="text-red-500">-</span>
                              )}
                            </div>
                          </td>
                          {columnConfig.showPorcionamento && (
                            <>
                              {/* Coluna de Input de Porcionamento */}
                              <td className="p-2 text-center">
                                <div className="flex items-center justify-center">
                                  <DecimalInput
                                    ref={(ref) => registerInput(percentInputId, ref)}
                                    value={item.adjustment_percentage === 0 ? '' : item.adjustment_percentage || ''}
                                    onChange={(e) => {
                                      if (isEditMode) {
                                        updateOrderItem(item.unique_id, 'adjustment_percentage', e.target.value);
                                      }
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, percentInputId)}
                                    className="text-center text-xs h-8 max-w-[60px] border-blue-300 focus:border-blue-500"
                                    placeholder="0"
                                    disabled={!isEditMode}
                                  />
                                  <span className="text-xs text-gray-500 ml-1">%</span>
                                </div>
                              </td>
                            </>
                          )}
                          {columnConfig.showTotalPedido && (
                            <td className="p-2">
                              <div className="text-center text-xs font-medium text-blue-700">
                                {utilFormattedQuantity(item.quantity)} {item.unit_type}
                              </div>
                            </td>
                          )}
                          <td className="p-2">
                            <div className="text-center text-xs font-medium text-blue-700">
                              {utilFormatCurrency(item.total_price)}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="text-center text-xs font-medium text-green-700">
                              {formatWeightByUnit(item)}
                            </div>
                          </td>
                          <td className="p-2">
                            {isEditMode ? (
                              <Input
                                ref={(ref) => registerInput(notesInputId, ref)}
                                type="text"
                                value={item.notes || ''}
                                onChange={(e) => isEditMode && updateOrderItem(item.unique_id, 'notes', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, notesInputId)}
                                className="text-xs h-8 w-full border-blue-300 focus:border-blue-500"
                                placeholder="Observações..."
                                disabled={!isEditMode}
                              />
                            ) : (
                              <NoteViewer note={item.notes} className="text-xs" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}

      {/* Aviso sobre Devoluções */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 mb-1">Valor Pode Ser Alterado</h3>
              <p className="text-sm text-amber-700">
                Se você devolver itens para a cozinha na aba "Sobras", o valor final será reduzido com 25% de depreciação sobre os itens devolvidos.
              </p>
              {orderTotals.depreciation?.hasReturns && (
                <div className="mt-2 p-2 bg-amber-100 rounded border border-amber-200">
                  <p className="text-xs font-medium text-amber-800 mb-1">Devoluções Registradas:</p>
                  {orderTotals.depreciation.returnedItems.map((item, index) => (
                    <div key={index} className="text-xs text-amber-700">
                      • {item.recipe_name}: {utilFormattedQuantity(item.returned_quantity)} {item.unit_type} 
                      <span className="text-red-600 ml-1">(-{utilFormatCurrency(item.depreciation_value)})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo do Pedido */}
      <Card className="border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">Refeições Esperadas</p>
              <p className="text-2xl font-bold text-blue-900">{mealsExpected || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">Total de Peso</p>
              <p className="text-2xl font-bold text-blue-900">{utilFormatWeight(orderTotals.totalWeight || 0)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">Valor por Refeição</p>
              <p className="text-2xl font-bold text-blue-900">
                {mealsExpected > 0 ? utilFormatCurrency(orderTotals.finalAmount / mealsExpected) : 'R$ 0,00'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">
                {(orderTotals.depreciationAmount > 0 || orderTotals.nonReceivedDiscountAmount > 0) ? 'Valor Original' : 'Valor Total'}
              </p>
              <p className="text-2xl font-bold text-blue-900">{utilFormatCurrency(orderTotals.totalAmount)}</p>
              {(orderTotals.depreciationAmount > 0 || orderTotals.nonReceivedDiscountAmount > 0) && (
                <div className="mt-2">
                  {orderTotals.depreciationAmount > 0 && (
                    <p className="text-xs text-red-600">Devolução (25%): -{utilFormatCurrency(orderTotals.depreciationAmount)}</p>
                  )}
                  {orderTotals.nonReceivedDiscountAmount > 0 && (
                    <p className="text-xs text-orange-600">Não recebido (100%): -{utilFormatCurrency(orderTotals.nonReceivedDiscountAmount)}</p>
                  )}
                  <p className="text-sm font-bold text-green-700">Valor Final: {utilFormatCurrency(orderTotals.finalAmount)}</p>
                </div>
              )}
            </div>
          </div>
          
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-blue-700 mb-2">
              Observações Gerais
            </label>
            <Textarea
              ref={(ref) => registerInput('general-notes', ref)}
              value={generalNotes}
              onChange={(e) => isEditMode && setGeneralNotes(e.target.value)}
              onKeyDown={(e) => {
                // Para Textarea, Enter não navega - só Tab
                if (e.key === 'Tab') {
                  handleKeyDown(e, 'general-notes');
                }
              }}
              placeholder="Observações gerais sobre o pedido..."
              className="min-h-[80px] border-blue-300 focus:border-blue-500"
              rows={3}
              disabled={!isEditMode}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersTab;