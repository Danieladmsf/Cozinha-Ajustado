'use client';

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { 
  formattedQuantity as utilFormattedQuantity,
  formatCurrency as utilFormatCurrency 
} from "@/components/utils/orderUtils";
import { formatUnitTypeForDisplay } from "@/lib/unitTypeUtils";

const WasteTab = ({
  wasteLoading,
  wasteItems,
  wasteNotes,
  setWasteNotes,
  updateWasteItem,
  saveWasteData,
  showSuccessEffect,
  isEditMode,
  enableEditMode,
  existingWaste,
  groupItemsByCategory,
  getOrderedCategories,
  generateCategoryStyles
}) => {
  if (wasteLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-amber-500 animate-spin" />
          <p className="text-amber-600">Carregando dados de sobras...</p>
        </CardContent>
      </Card>
    );
  }

  if (wasteItems.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-400" />
          <h3 className="font-semibold text-lg text-gray-700 mb-2">Nenhum Item Disponível</h3>
          <p className="text-gray-500 text-sm">
            Não há itens disponíveis no cardápio para registrar sobras neste dia.
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
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-amber-600 mb-2">Sobras Salvas!</h2>
              <p className="text-gray-600">Os dados foram salvos com sucesso</p>
              <div className="mt-4 flex items-center justify-center text-amber-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
                <span className="ml-2 text-sm">Processando...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status das Sobras Salvas */}
      {!isEditMode && existingWaste && !showSuccessEffect && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center mr-3">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-700">Sobras Salvas com Sucesso</h3>
                <p className="text-sm text-amber-600">Este registro de sobras já foi processado e salvo. Use o botão abaixo para editar.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Sobras por Categoria */}
      {getOrderedCategories(
        groupItemsByCategory(wasteItems, (item) => item.category)
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
                    <tr className="border-b border-amber-100 bg-amber-50">
                      <th className="text-left p-2 text-xs font-medium text-amber-700">Item</th>
                      <th className="text-center p-2 text-xs font-medium text-amber-700">Pedido</th>
                      <th className="text-center p-2 text-xs font-medium text-amber-700">Sobra Interna</th>
                      <th className="text-center p-2 text-xs font-medium text-amber-700">Cliente Devolveu</th>
                      <th className="text-center p-2 text-xs font-medium text-amber-700">Valor Devolução</th>
                      <th className="text-left p-2 text-xs font-medium text-amber-700">Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.items.map((item, index) => {
                      const globalIndex = wasteItems.findIndex(wi => wi.unique_id === item.unique_id);
                      return (
                        <tr key={`waste-${categoryName}-${item.unique_id}-${index}`} className="border-b border-amber-50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium text-amber-900 text-xs">{item.recipe_name}</p>
                              <p className="text-xs text-amber-600">
                                {utilFormatCurrency(item.unit_price || 0)}/{item.ordered_unit_type}
                              </p>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <div className="text-xs font-medium text-amber-700">
                              {utilFormattedQuantity(item.ordered_quantity)} {item.ordered_unit_type}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1 items-center justify-center">
                              <DecimalInput
                                value={item.internal_waste_quantity === 0 ? '' : item.internal_waste_quantity || ''}
                                onChange={(e) => {
                                  if (isEditMode) {
                                    updateWasteItem(globalIndex, 'internal_waste_quantity', e.target.value);
                                  }
                                }}
                                className="text-center text-xs h-8 w-12 border-amber-300 focus:border-amber-500"
                                placeholder="0"
                                disabled={!isEditMode}
                              />
                              <div className="text-xs h-8 w-12 flex items-center justify-center font-medium text-gray-700">
                                {formatUnitTypeForDisplay(item.ordered_unit_type || 'kg')}
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1 items-center justify-center">
                              <DecimalInput
                                value={item.client_returned_quantity === 0 ? '' : item.client_returned_quantity || ''}
                                onChange={(e) => {
                                  if (isEditMode) {
                                    updateWasteItem(globalIndex, 'client_returned_quantity', e.target.value);
                                  }
                                }}
                                className="text-center text-xs h-8 w-12 border-amber-300 focus:border-amber-500"
                                placeholder="0"
                                disabled={!isEditMode}
                              />
                              <div className="text-xs h-8 w-12 flex items-center justify-center font-medium text-gray-700">
                                {formatUnitTypeForDisplay(item.ordered_unit_type || 'kg')}
                              </div>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <div className="text-xs font-medium text-red-600">
                              {(item.client_returned_quantity || 0) > 0 && (item.unit_price || 0) > 0
                                ? utilFormatCurrency((item.client_returned_quantity || 0) * (item.unit_price || 0))
                                : '-'
                              }
                            </div>
                          </td>
                          <td className="p-2">
                            <Input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => isEditMode && updateWasteItem(globalIndex, 'notes', e.target.value)}
                              className="text-xs h-8 border-amber-300 focus:border-amber-500"
                              placeholder="Observações..."
                              disabled={!isEditMode}
                            />
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
      <Card className="border-amber-200">
        <CardContent className="p-4">
          <label className="block text-sm font-medium text-amber-700 mb-2">
            Observações Gerais sobre as Sobras
          </label>
          <Textarea
            value={wasteNotes}
            onChange={(e) => isEditMode && setWasteNotes(e.target.value)}
            placeholder="Observações gerais sobre as sobras do dia..."
            className="min-h-[80px] border-amber-300 focus:border-amber-500"
            rows={3}
            disabled={!isEditMode}
          />
        </CardContent>
      </Card>

      {/* Botão de Salvar/Editar */}
      {isEditMode || showSuccessEffect ? (
        <Button 
          onClick={saveWasteData}
          className={`w-full text-white transition-all duration-500 ${
            showSuccessEffect 
              ? 'bg-green-600 hover:bg-green-700 scale-105 shadow-lg' 
              : 'bg-amber-600 hover:bg-amber-700'
          }`}
          disabled={showSuccessEffect}
        >
          {showSuccessEffect ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2 animate-bounce" />
              Sobras Salvas!
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              {existingWaste ? 'Atualizar Sobras' : 'Salvar Sobras'}
            </>
          )}
        </Button>
      ) : (
        <Button 
          onClick={enableEditMode}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Send className="w-4 h-4 mr-2" />
          Editar Sobras
        </Button>
      )}
    </div>
  );
};

export default WasteTab;