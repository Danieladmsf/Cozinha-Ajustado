'use client';

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Package, Loader2, Check, X, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formattedQuantity as utilFormattedQuantity } from "@/components/utils/orderUtils";

const ReceivingTab = ({
  receivingLoading,
  existingOrders,
  selectedDay,
  receivingItems,
  receivingNotes,
  setReceivingNotes,
  updateReceivingItem,
  markAllAsReceived,
  saveReceivingData,
  showSuccessEffect,
  isEditMode,
  enableEditMode,
  existingReceiving,
  groupItemsByCategory,
  getOrderedCategories,
  generateCategoryStyles
}) => {
  console.log('🔷 [ReceivingTab] RENDERIZANDO', {
    receivingLoading,
    isEditMode,
    showSuccessEffect,
    receivingItemsLength: receivingItems.length,
    existingReceivingId: existingReceiving?.id,
    selectedDay
  });

  if (receivingLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-blue-600">Carregando dados de recebimento...</p>
        </CardContent>
      </Card>
    );
  }

  if (receivingItems.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="font-semibold text-lg text-gray-700 mb-2">Nenhum Item Disponível</h3>
          <p className="text-gray-500 text-sm">
            Não há itens disponíveis no cardápio para recebimento neste dia.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Efeito de Sucesso Overlay */}
      {showSuccessEffect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl p-8 shadow-2xl animate-in zoom-in duration-500">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-blue-600 mb-2">Recebimento Salvo!</h2>
              <p className="text-gray-600">Os dados foram salvos com sucesso</p>
              <div className="mt-4 flex items-center justify-center text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm">Processando...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status do Recebimento Enviado */}
      {!isEditMode && existingReceiving && !showSuccessEffect && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-700">Recebimento Salvo com Sucesso</h3>
                <p className="text-sm text-blue-600">Este recebimento já foi processado e salvo. Use o botão abaixo para editar.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão para marcar tudo como recebido - só aparece no modo de edição */}
      {isEditMode && (
        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-700">Pedido Completo OK</h3>
                <p className="text-sm text-green-600">Marcar todos os itens como recebidos corretamente</p>
              </div>
              <Button
                onClick={markAllAsReceived}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Tudo OK
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Recebimento por Categoria */}
      {getOrderedCategories(
        groupItemsByCategory(receivingItems, (item) => item.category)
      ).map(({ name: categoryName, data: categoryData }) => {
        const { headerStyle } = generateCategoryStyles(categoryData.categoryInfo.color);
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
                      <th className="text-left p-2 text-xs font-medium text-blue-700">Item</th>
                      <th className="text-center p-2 text-xs font-medium text-blue-700">Pedido</th>
                      <th className="text-center p-2 text-xs font-medium text-blue-700">Status</th>
                      <th className="text-center p-2 text-xs font-medium text-blue-700">Recebido</th>
                      <th className="text-left p-2 text-xs font-medium text-blue-700">Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.items.map((item, index) => {
                      const globalIndex = receivingItems.findIndex(ri => ri.unique_id === item.unique_id);
                      return (
                        <tr key={`receiving-${categoryName}-${item.unique_id}-${index}`} className="border-b border-blue-50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium text-blue-900 text-xs">{item.recipe_name}</p>
                              <p className="text-xs text-blue-600">
                                Pedido: {utilFormattedQuantity(item.ordered_quantity)} {item.ordered_unit_type}
                              </p>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <div className="text-xs font-medium text-blue-700">
                              {utilFormattedQuantity(item.ordered_quantity)} {item.ordered_unit_type}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex justify-center gap-1">
                              {/* Botão Verde - Recebido OK */}
                              <Button
                                variant={item.status === 'received' ? 'default' : 'outline'}
                                size="sm"
                                className={cn(
                                  "h-8 w-8 p-0",
                                  item.status === 'received' 
                                    ? "bg-green-600 hover:bg-green-700 text-white border-green-600" 
                                    : "border-green-300 text-green-600 hover:bg-green-50"
                                )}
                                onClick={() => isEditMode && updateReceivingItem(globalIndex, 'status', 'received')}
                                disabled={!isEditMode}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              {/* Botão Vermelho - Problema */}
                              <Button
                                variant={item.status === 'partial' || item.status === 'not_received' ? 'default' : 'outline'}
                                size="sm"
                                className={cn(
                                  "h-8 w-8 p-0",
                                  item.status === 'partial' || item.status === 'not_received'
                                    ? "bg-red-600 hover:bg-red-700 text-white border-red-600" 
                                    : "border-red-300 text-red-600 hover:bg-red-50"
                                )}
                                onClick={() => isEditMode && updateReceivingItem(globalIndex, 'status', 'partial')}
                                disabled={!isEditMode}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-2">
                            {item.status === 'partial' || item.status === 'not_received' ? (
                              <DecimalInput
                                value={item.received_quantity === 0 ? '' : item.received_quantity || ''}
                                onChange={(e) => {
                                  if (isEditMode) {
                                    updateReceivingItem(globalIndex, 'received_quantity', e.target.value);
                                  }
                                }}
                                className="text-center text-xs h-8 w-16 border-red-300 focus:border-red-500"
                                placeholder="0"
                                disabled={!isEditMode}
                              />
                            ) : (
                              <div className="text-center text-xs font-medium text-green-700">
                                {item.status === 'received' ? utilFormattedQuantity(item.received_quantity) : '-'}
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            {item.status === 'partial' || item.status === 'not_received' ? (
                              <Input
                                type="text"
                                value={item.notes || ''}
                                onChange={(e) => isEditMode && updateReceivingItem(globalIndex, 'notes', e.target.value)}
                                className="text-xs h-8 border-red-300 focus:border-red-500"
                                placeholder="Observações..."
                                disabled={!isEditMode}
                              />
                            ) : (
                              <div className="text-xs text-gray-500">
                                {item.notes || '-'}
                              </div>
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

      {/* Observações Gerais */}
      <Card className="border-blue-200">
        <CardContent className="p-4">
          <label className="block text-sm font-medium text-blue-700 mb-2">
            Observações Gerais sobre o Recebimento
          </label>
          <Textarea
            value={receivingNotes}
            onChange={(e) => isEditMode && setReceivingNotes(e.target.value)}
            placeholder="Observações gerais sobre o recebimento do dia..."
            className="min-h-[80px] border-blue-300 focus:border-blue-500"
            rows={3}
            disabled={!isEditMode}
          />
        </CardContent>
      </Card>

      {/* Botão de Salvar/Editar */}
      {isEditMode || showSuccessEffect ? (
        <Button 
          onClick={saveReceivingData}
          className={`w-full text-white transition-all duration-500 ${
            showSuccessEffect 
              ? 'bg-green-600 hover:bg-green-700 scale-105 shadow-lg' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          disabled={showSuccessEffect}
        >
          {showSuccessEffect ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2 animate-bounce" />
              Recebimento Salvo!
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              {existingReceiving ? 'Atualizar Recebimento' : 'Salvar Recebimento'}
            </>
          )}
        </Button>
      ) : (
        <Button 
          onClick={enableEditMode}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Send className="w-4 h-4 mr-2" />
          Editar Recebimento
        </Button>
      )}
    </div>
  );
};

export default ReceivingTab;