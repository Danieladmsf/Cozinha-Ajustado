import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";

const Clientes = ({
  categories,
  customers,
  clientCategorySettings,
  setClientCategorySettings,
  categoryColors,
  fixedDropdowns,
  getFilteredCategories
}) => {
  const [selectedClient, setSelectedClient] = useState(null);

  const getClientCategorySetting = (clientId, categoryId) => {
    const setting = clientCategorySettings[clientId]?.[categoryId];
    if (!setting) {
      return { visible: true, dropdowns: null };
    }
    return setting;
  };

  const updateClientCategorySetting = (clientId, categoryId, setting, value) => {
    setClientCategorySettings(prev => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        [categoryId]: {
          ...prev[clientId]?.[categoryId],
          [setting]: value
        }
      }
    }));
  };

  const getDefaultDropdownsForCategory = (categoryId) => {
    if (fixedDropdowns[categoryId] !== undefined) {
      return fixedDropdowns[categoryId];
    }
    return 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Configurações por Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-6">
          Configure quais categorias cada cliente vê e quantos dropdowns recebe por categoria.
        </p>

        {/* Seletor de Cliente */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Selecionar Cliente</label>
          <Select value={selectedClient || ""} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Selecione um cliente para configurar..." />
            </SelectTrigger>
            <SelectContent>
              {customers.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name || client.razao_social || `Cliente ${client.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedClient ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <h3 className="font-medium text-blue-900">
                  Configurando: {customers.find(c => c.id === selectedClient)?.name || 
                               customers.find(c => c.id === selectedClient)?.razao_social || 
                               'Cliente selecionado'}
                </h3>
                <p className="text-sm text-blue-700">
                  Configure quais categorias este cliente vê e quantos dropdowns recebe
                </p>
              </div>
            </div>

            {getFilteredCategories().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">Nenhuma categoria disponível</p>
                <p className="text-sm">Selecione tipos de categoria na aba "Categorias" primeiro</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                        Visível para Cliente
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                        Faixa de Opções
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                        Qtd. Dropdowns Cliente
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredCategories().map((category, index) => {
                      const clientSetting = getClientCategorySetting(selectedClient, category.id);
                      const defaultDropdowns = getDefaultDropdownsForCategory(category.id);
                      const clientDropdowns = clientSetting.dropdowns !== null && clientSetting.dropdowns !== undefined ? clientSetting.dropdowns : defaultDropdowns;
                      const isCustomized = clientSetting.dropdowns !== null && clientSetting.dropdowns !== undefined;
                      
                      return (
                        <tr key={category.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded-full border"
                                style={{ 
                                  backgroundColor: categoryColors[category.id] || category.color || '#808080'
                                }}
                              />
                              <span className="font-medium text-gray-900">
                                {category.name}
                              </span>
                            </div>
                          </td>
                          
                          <td className="px-4 py-3 text-center">
                            <Switch
                              checked={clientSetting.visible}
                              onCheckedChange={(checked) => 
                                updateClientCategorySetting(selectedClient, category.id, 'visible', checked)
                              }
                              className={`${clientSetting.visible 
                                ? 'data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500' 
                                : 'bg-red-100 border-red-300'
                              }`}
                            />
                          </td>
                          
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2 text-sm">
                              <span className={`px-2 py-1 rounded font-mono ${
                                isCustomized
                                  ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {clientDropdowns > 0 ? `1 - ${clientDropdowns}` : '0'}
                              </span>
                              {isCustomized && (
                                <span className="text-xs text-orange-600 font-medium">
                                  personalizado
                                </span>
                              )}
                            </div>
                          </td>
                          
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                className="w-20 text-center"
                                value={clientDropdowns}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  updateClientCategorySetting(selectedClient, category.id, 'dropdowns', Math.max(0, Math.min(10, value)));
                                }}
                                disabled={!clientSetting.visible}
                                placeholder={defaultDropdowns.toString()}
                              />
                              {clientDropdowns !== defaultDropdowns && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="px-2 py-1 h-8 text-xs"
                                  onClick={() => updateClientCategorySetting(selectedClient, category.id, 'dropdowns', defaultDropdowns)}
                                  title="Resetar para padrão global"
                                >
                                  ↺
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Legenda */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">Configurações por Cliente:</h4>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span><strong>Visível:</strong> Cliente vê esta categoria no cardápio</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span><strong>Dropdowns:</strong> Quantidade específica para este cliente</span>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">Exemplo de Uso:</h4>
                <div className="text-xs text-gray-600">
                  <p>• Categoria "Sobremesas" com 4 dropdowns padrão</p>
                  <p>• Cliente "João" recebe apenas 2 dropdowns (1ª e 2ª opções)</p>
                  <p>• Cliente "Maria" não vê a categoria "Sobremesas"</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium mb-2">Selecione um cliente</p>
            <p className="text-sm">Escolha um cliente acima para configurar suas categorias personalizadas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Clientes;