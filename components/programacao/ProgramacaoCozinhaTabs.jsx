'use client';

import React, { useState, useMemo, useEffect } from "react";
import '../cardapio/consolidacao/print-styles.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Calendar, 
  Users, 
  FileText, 
  Printer, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Search,
  Download,
  Loader2,
  ChefHat,
  Leaf,
  Package2,
  Utensils,
  RefreshCw
} from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// Hooks
import { useProgramacaoData } from '@/hooks/programacao/useProgramacaoData';
import { useOrderConsolidation } from "@/hooks/cardapio/useOrderConsolidation";
import { convertQuantityForKitchen } from "@/lib/cubaConversionUtils";

// Componentes das abas
import SaladaTab from './tabs/SaladaTab';
import AcougueTab from './tabs/AcougueTab';
import CozinhaTab from './tabs/CozinhaTab';
import EmbalagemTab from './tabs/EmbalagemTab';

// Função utilitária centralizada para formatação de quantidade
export const formatQuantityForDisplay = (quantity, unitType, useKitchenFormat) => {
  if (useKitchenFormat && unitType?.toLowerCase() === 'cuba-g') {
    return convertQuantityForKitchen(quantity, unitType);
  } else {
    // Formato padrão
    const formattedQty = quantity ? String(quantity).replace('.', ',') : '';
    return `${formattedQty}${unitType ? ` ${unitType}` : ''}`;
  }
};

const ConsolidacaoContent = ({
  loading,
  ordersByCustomer,
  consolidateCustomerItems,
  weekDays,
  selectedDay,
  globalKitchenFormat,
  formatQuantityDisplay,
}) => (
    <>
      {loading.orders ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-600">Carregando pedidos...</p>
        </div>
      ) : (
        <div className="space-y-4 print:space-y-12">
          {ordersByCustomer.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-slate-100">
              <CardContent className="p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="font-semibold text-lg text-gray-700 mb-2">
                  Nenhum Pedido Encontrado
                </h3>
                <p className="text-gray-500 text-sm">
                  Não há pedidos para o dia selecionado com os filtros aplicados.
                </p>
              </CardContent>
            </Card>
          ) : (
            ordersByCustomer.map((customerData) => {
              const consolidatedItems = consolidateCustomerItems(customerData.orders);
              const selectedDayInfo = weekDays.find(d => d.dayNumber === selectedDay);
              
              return (
                <Card 
                  key={customerData.customer_id} 
                  className="print:break-after-page print:min-h-screen print:p-8 border-2 border-slate-200 shadow-lg bg-gradient-to-br from-white to-slate-50 hover:shadow-xl transition-shadow duration-200"
                >
                  <CardContent className="p-4 print:p-8">
                  <div className="mb-3 print:mb-12">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-2 print:pb-6">
                      <div className="flex-1">
                        <h1 className="text-lg print:text-3xl font-bold text-gray-900">
                          {customerData.customer_name}
                        </h1>
                        <p className="text-sm text-gray-600">
                          {selectedDayInfo?.fullDate} • {customerData.total_meals} refeições
                        </p>
                      </div>
                      {globalKitchenFormat && (
                        <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-md inline-block mt-1 sm:mt-0 print:hidden">
                          <ChefHat className="w-3 h-3 inline mr-1" />
                          Formato Cozinha
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 print:space-y-8">
                    {Object.keys(consolidatedItems).length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        Nenhum item no pedido deste cliente.
                      </p>
                    ) : (
                      Object.entries(consolidatedItems).map(([categoryName, items]) => (
                        <div key={categoryName} className="mb-3 print:mb-10">
                          <div className="mb-2 print:mb-6">
                            <h2 className="text-lg print:text-2xl font-bold text-gray-800 border-b border-gray-200 pb-1">
                              {categoryName}
                            </h2>
                          </div>
                          
                          <div className="space-y-1 print:space-y-3 pl-3 print:pl-6">
                            {items.map((item, index) => (
                              <div 
                                key={`${item.unique_id || item.recipe_id}_${index}`}
                                className="flex items-start gap-3 print:gap-6 text-sm print:text-lg"
                              >
                                <span className="font-semibold text-blue-700 min-w-[50px] print:min-w-[80px] text-sm">
                                  {formatQuantityDisplay(item)}
                                </span>
                                <span className="text-gray-800 flex-1">
                                  {item.recipe_name}
                                  {item.notes && item.notes.trim() && (
                                    <span className="text-gray-600 italic">
                                      {' '}({item.notes.trim()})
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="hidden print:block mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
                    <p>Cozinha Afeto - Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </>
);

const ProgramacaoCozinhaTabs = () => {
  const {
    currentDate,
    weekDays,
    weekNumber,
    year,
    loading,
    customers,
    recipes,
    orders,
    navigateWeek,
    loadOrdersForWeek,
    refreshData
  } = useProgramacaoData();

  // Estados principais
  const [selectedDay, setSelectedDay] = useState(1);
  const [printing, setPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState("por-empresa");
  
  // Filtros
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estado centralizado do formato cozinha para todas as abas
  const [globalKitchenFormat, setGlobalKitchenFormat] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('programacao-global-kitchen-format');
      return saved === 'true';
    }
    return false;
  });

  useEffect(() => {
    loadOrdersForWeek(weekNumber, year);
  }, [weekNumber, year, loadOrdersForWeek]);

  // Filtrar pedidos por dia e cliente
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const dayMatch = order.day_of_week === selectedDay;
      const customerMatch = selectedCustomer === "all" || order.customer_id === selectedCustomer;
      const searchMatch = searchTerm === "" || 
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return dayMatch && customerMatch && searchMatch;
    });
  }, [orders, selectedDay, selectedCustomer, searchTerm]);

  // Hook de consolidação (deve vir depois de filteredOrders)
  const { ordersByCustomer, consolidateCustomerItems } = useOrderConsolidation(filteredOrders, recipes);

  // Função centralizada para alternar formato em todas as abas
  const toggleGlobalKitchenFormat = () => {
    const newFormat = !globalKitchenFormat;
    setGlobalKitchenFormat(newFormat);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('programacao-global-kitchen-format', newFormat.toString());
    }
  };

  // Função para formatar quantidade baseada no modo selecionado
  const formatQuantityDisplay = (item) => {
    if (globalKitchenFormat && item.unit_type?.toLowerCase() === 'cuba-g') {
      const convertedQuantity = convertQuantityForKitchen(item.quantity, item.unit_type);
      return `${convertedQuantity} –`;
    } else {
      // Formato padrão
      return `${(item.quantity ? String(item.quantity).replace('.', ',') : '')}${item.unit_type ? ` ${item.unit_type}` : ''} –`;
    }
  };

  // Funções para extrair dados de cada aba - seguindo a lógica exata da UI
  const getSaladaData = () => {
    const dayOrders = orders.filter(order => order.day_of_week === selectedDay);
    const saladaIngredientes = {};

    dayOrders.forEach(order => {
      order.items?.forEach(item => {
        const recipe = recipes.find(r => r.id === item.recipe_id);
        
        if (recipe && recipe.category?.toLowerCase().includes('salada')) {
          const recipeName = recipe.name;
          const quantity = item.quantity;
          const unitType = item.unit_type || recipe.unit_type;

          if (!saladaIngredientes[recipeName]) {
            saladaIngredientes[recipeName] = {};
          }

          const customerName = order.customer_name;
          if (!saladaIngredientes[recipeName][customerName]) {
            saladaIngredientes[recipeName][customerName] = {
              quantity: 0,
              unitType: unitType,
              items: []
            };
          }

          saladaIngredientes[recipeName][customerName].quantity = quantity;
          saladaIngredientes[recipeName][customerName].items.push({
            recipeName,
            quantity,
            unitType,
            notes: item.notes || ''
          });
        }
      });
    });

    return saladaIngredientes;
  };

  const getAcougueData = () => {
    const dayOrders = orders.filter(order => order.day_of_week === selectedDay);
    const acougueItems = {};

    dayOrders.forEach(order => {
      order.items?.forEach(item => {
        const recipe = recipes.find(r => r.id === item.recipe_id);
        
        if (recipe && (recipe.category?.toLowerCase().includes('carne') || recipe.category?.toLowerCase().includes('açougue'))) {
          const recipeName = recipe.name;
          const quantity = item.quantity;
          const unitType = item.unit_type || recipe.unit_type;

          if (!acougueItems[recipeName]) {
            acougueItems[recipeName] = {};
          }

          const customerName = order.customer_name;
          if (!acougueItems[recipeName][customerName]) {
            acougueItems[recipeName][customerName] = {
              quantity: 0,
              unitType: unitType,
              items: []
            };
          }

          acougueItems[recipeName][customerName].quantity = quantity;
          acougueItems[recipeName][customerName].items.push({
            recipeName,
            quantity,
            unitType,
            notes: item.notes || ''
          });
        }
      });
    });

    return acougueItems;
  };

  const getCozinhaData = () => {
    const dayOrders = orders.filter(order => order.day_of_week === selectedDay);
    const cozinhaItems = {};

    dayOrders.forEach(order => {
      order.items?.forEach(item => {
        const recipe = recipes.find(r => r.id === item.recipe_id);
        
        if (recipe && !recipe.category?.toLowerCase().includes('salada') && 
            !recipe.category?.toLowerCase().includes('carne') && 
            !recipe.category?.toLowerCase().includes('açougue')) {
          const recipeName = recipe.name;
          const quantity = item.quantity;
          const unitType = item.unit_type || recipe.unit_type;

          if (!cozinhaItems[recipeName]) {
            cozinhaItems[recipeName] = {};
          }

          const customerName = order.customer_name;
          if (!cozinhaItems[recipeName][customerName]) {
            cozinhaItems[recipeName][customerName] = {
              quantity: 0,
              unitType: unitType,
              items: []
            };
          }

          cozinhaItems[recipeName][customerName].quantity = quantity;
          cozinhaItems[recipeName][customerName].items.push({
            recipeName,
            quantity,
            unitType,
            notes: item.notes || ''
          });
        }
      });
    });

    return cozinhaItems;
  };

  const getEmbalagemData = () => {
    return [];
  };

  const handlePrint = () => {
    setPrinting(true);
    
    try {
      const selectedDayInfo = weekDays.find(d => d.dayNumber === selectedDay);
      const porEmpresaData = ordersByCustomer;
      const saladaData = getSaladaData();
      const acougueData = getAcougueData();
      const cozinhaData = getCozinhaData();
      const embalagemData = getEmbalagemData();

      const printContent = generateCompletePrintContent({
        selectedDayInfo,
        weekNumber,
        year,
        porEmpresaData,
        saladaData,
        acougueData,
        cozinhaData,
        embalagemData
      });
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      
    } catch (error) {
      alert('Erro ao gerar impressão: ' + error.message);
    } finally {
      setPrinting(false);
    }
  };

  const generateCompletePrintContent = (data) => {
    const { selectedDayInfo, weekNumber, year, porEmpresaData, saladaData, acougueData, cozinhaData, embalagemData } = data;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Programacao de Producao - ${selectedDayInfo?.fullDate}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${getPrintStyles()}
          </style>
        </head>
        <body>
          ${generatePorEmpresaSection(porEmpresaData, selectedDayInfo)}
          ${generateSaladaSection(saladaData, selectedDayInfo)}
          ${generateAcougueSection(acougueData, selectedDayInfo)}
          ${generateCozinhaSection(cozinhaData, selectedDayInfo)}
          ${generateEmbalagemSection(embalagemData, selectedDayInfo)}
          ${getAutoFontSizeScript()}
        </body>
      </html>
    `;
  };

  const generatePorEmpresaSection = (data, dayInfo) => {
    if (!data || data.length === 0) return '';
    
    return data.map((customerData, index) => {
      const consolidatedItems = consolidateCustomerItems(customerData.orders);
      
      return `
        <div class="print-page">
          <div class="page-header">
            <h1>Por Empresa</h1>
            <div class="day-info">${dayInfo?.fullDate}</div>
          </div>
          
          <div class="company-section">
            <div class="client-header">
              <h2>${customerData.customer_name}</h2>
              <p class="meal-count">${dayInfo?.fullDate} - ${customerData.total_meals} refeicoes</p>
            </div>
            
            ${Object.keys(consolidatedItems).length === 0 ? `
              <p class="no-items">Nenhum item no pedido deste cliente.</p>
            ` : Object.entries(consolidatedItems).map(([categoryName, items]) => `
              <div class="category-section">
                <div class="category-header">
                  <h3 class="category-title">${categoryName}</h3>
                </div>
                
                <div class="items-container">
                  ${items.map((item, itemIndex) => `
                    <div class="item-line" key="${item.unique_id || item.recipe_id}_${itemIndex}">
                      <span class="quantity">${formatQuantityDisplay(item)}</span>
                      <span class="recipe-name">
                        ${item.recipe_name}${item.notes && item.notes.trim() ? ` <span class="notes">(${item.notes.trim()})</span>` : ''}
                      </span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="page-footer">
            <p>Cozinha Afeto - Gerado em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      `;
    }).join('');
  };

  const generateSaladaSection = (data, dayInfo) => {
    if (!data || Object.keys(data).length === 0) return '';
    
    return `
      <div class="print-page">
        <div class="page-header">
          <h1>Salada</h1>
          <div class="day-info">${dayInfo?.fullDate}</div>
        </div>
        
        <div class="section-content">
          <div class="recipe-sections">
            ${Object.entries(data).map(([nomeReceita, clientes], index) => `
              <div class="recipe-section">
                <div class="recipe-header">
                  <h2 class="recipe-title">${index + 1}. ${nomeReceita.toUpperCase()}</h2>
                </div>
                
                <div class="clients-list">
                  ${Object.entries(clientes).map(([customerName, dataCustomer]) => {
                    const hasNotes = dataCustomer.items.some(item => item.notes && item.notes.trim());
                    return `
                      <div class="client-line">
                        <span class="customer-name">${customerName.toUpperCase()}</span>
                        <span class="arrow">→</span>
                        <span class="quantity">${formatQuantityForDisplay(dataCustomer.quantity, dataCustomer.unitType, globalKitchenFormat)}</span>
                        ${hasNotes ? `
                          <div class="notes-section">
                            ${dataCustomer.items
                              .filter(item => item.notes && item.notes.trim())
                              .map(item => `<span class="note">(${item.notes.trim()})</span>`)
                              .join('')
                            }
                          </div>
                        ` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="page-footer">
          <p>Cozinha Afeto - Gerado em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>
    `;
  };

  const generateAcougueSection = (data, dayInfo) => {
    if (!data || Object.keys(data).length === 0) return '';
    
    return `
      <div class="print-page">
        <div class="page-header">
          <h1>Acougue</h1>
          <div class="day-info">${dayInfo?.fullDate}</div>
        </div>
        
        <div class="section-content">
          <div class="recipe-sections">
            ${Object.entries(data).map(([nomeReceita, clientes], index) => `
              <div class="recipe-section">
                <div class="recipe-header">
                  <h2 class="recipe-title">${index + 1}. ${nomeReceita.toUpperCase()}</h2>
                </div>
                
                <div class="clients-list">
                  ${Object.entries(clientes).map(([customerName, dataCustomer]) => {
                    const hasNotes = dataCustomer.items.some(item => item.notes && item.notes.trim());
                    return `
                      <div class="client-line">
                        <span class="customer-name">${customerName.toUpperCase()}</span>
                        <span class="arrow">→</span>
                        <span class="quantity">${formatQuantityForDisplay(dataCustomer.quantity, dataCustomer.unitType, globalKitchenFormat)}</span>
                        ${hasNotes ? `
                          <div class="notes-section">
                            ${dataCustomer.items
                              .filter(item => item.notes && item.notes.trim())
                              .map(item => `<span class="note">(${item.notes.trim()})</span>`)
                              .join('')
                            }
                          </div>
                        ` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="page-footer">
          <p>Cozinha Afeto - Gerado em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>
    `;
  };

  const generateCozinhaSection = (data, dayInfo) => {
    if (!data || Object.keys(data).length === 0) return '';
    
    return `
      <div class="print-page">
        <div class="page-header">
          <h1>Cozinha</h1>
          <div class="day-info">${dayInfo?.fullDate}</div>
        </div>
        
        <div class="section-content">
          <div class="recipe-sections">
            ${Object.entries(data).map(([nomeReceita, clientes], index) => `
              <div class="recipe-section">
                <div class="recipe-header">
                  <h2 class="recipe-title">${index + 1}. ${nomeReceita.toUpperCase()}</h2>
                </div>
                
                <div class="clients-list">
                  ${Object.entries(clientes).map(([customerName, dataCustomer]) => {
                    const hasNotes = dataCustomer.items.some(item => item.notes && item.notes.trim());
                    return `
                      <div class="client-line">
                        <span class="customer-name">${customerName.toUpperCase()}</span>
                        <span class="arrow">→</span>
                        <span class="quantity">${formatQuantityForDisplay(dataCustomer.quantity, dataCustomer.unitType, globalKitchenFormat)}</span>
                        ${hasNotes ? `
                          <div class="notes-section">
                            ${dataCustomer.items
                              .filter(item => item.notes && item.notes.trim())
                              .map(item => `<span class="note">(${item.notes.trim()})</span>`)
                              .join('')
                            }
                          </div>
                        ` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="page-footer">
          <p>Cozinha Afeto - Gerado em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>
    `;
  };

  const generateEmbalagemSection = (data, dayInfo) => {
    return '';
  };

  const getAutoFontSizeScript = () => {
    return `
      <script>
        function autoAdjustFontSize() {
          
          setTimeout(() => {
            const pages = document.querySelectorAll('.print-page');
            
            if (pages.length === 0) {
              const altPages = document.querySelectorAll('div, .page, .content');
              return;
            }
            
            pages.forEach((page, pageIndex) => {
              
              const pageTitle = page.querySelector('.page-header h1');
              const pageSubtitle = page.querySelector('.day-info');
              const clientName = page.querySelector('h2');
              
              
              const selectors = [
                '.company-section',
                '.section-content', 
                '.recipe-sections',
                '.items-container',
                '.category-section',
                '.clients-list'
              ];
              
              let content = null;
              let usedSelector = null;
              
              for (let selector of selectors) {
                const found = page.querySelector(selector);
                if (found && !content) {
                  content = found;
                  usedSelector = selector;
                }
              }
              
              if (!content) {
                content = page.children[1];
                if (content) {
                  usedSelector = 'fallback';
                } else {
                  return;
                }
              }
              
              
              const elementCounts = {
                h1: content.querySelectorAll('h1').length,
                h2: content.querySelectorAll('h2').length,
                h3: content.querySelectorAll('h3').length,
                quantity: content.querySelectorAll('.quantity').length,
                customerName: content.querySelectorAll('.customer-name').length,
                recipeName: content.querySelectorAll('.recipe-name').length,
                itemLine: content.querySelectorAll('.item-line, .client-line').length,
                notes: content.querySelectorAll('.notes, .note').length
              };
              
              Object.entries(elementCounts).forEach(([key, count]) => {
              });
              
              const allElements = page.querySelectorAll('*');
              let resetCount = 0;
              allElements.forEach(el => {
                if (el.style) {
                  if (el.style.fontSize) resetCount++;
                  el.style.fontSize = null;
                  el.style.lineHeight = null;
                  el.style.margin = null;
                  el.style.padding = null;
                }
              });
              
              page.offsetHeight;
              const afterReflow = performance.now();
              
              const PAGE_WIDTH = 794;
              const PAGE_HEIGHT = 1123;
              const MARGIN = 57;
              
              
              const pageRect = page.getBoundingClientRect();
              
              const header = page.querySelector('.page-header');
              const footer = page.querySelector('.page-footer');
              
              let headerHeight = 0;
              let footerHeight = 0;
              
              if (header) {
                const headerRect = header.getBoundingClientRect();
                headerHeight = headerRect.height;
              } else {
              }
              
              if (footer) {
                const footerRect = footer.getBoundingClientRect();
                footerHeight = footerRect.height;
              } else {
              }
              
              const availableHeight = PAGE_HEIGHT - headerHeight - footerHeight - (MARGIN * 2);
              const availableWidth = PAGE_WIDTH - (MARGIN * 2);
              
              
              const initialContentHeight = content.scrollHeight;
              const initialContentWidth = content.scrollWidth;
              
              let currentSize = 10;
              let maxTestedSize = 10;
              const MAX_FONT_SIZE = 48;
              const INCREMENT = 2;
              
              
              let testCount = 0;
              
              function measureContent(fontSize) {
                testCount++;
                const testStart = performance.now();
                
                content.style.fontSize = fontSize + 'px';
                content.style.lineHeight = '1.4';
                
                const ratio = fontSize / 12;
                let appliedStyles = {
                  h1: 0, h2: 0, h3: 0, quantity: 0, 
                  customerName: 0, recipeName: 0, notes: 0, spacing: 0
                };
                
                page.querySelectorAll('h1').forEach(h1 => {
                  const newSize = Math.max(fontSize * 1.8, 20);
                  h1.style.fontSize = newSize + 'px';
                  appliedStyles.h1++;
                });
                
                content.querySelectorAll('h2').forEach(h2 => {
                  const newSize = Math.max(fontSize * 1.5, 16);
                  const newMargin = Math.max(fontSize * 0.5, 6);
                  h2.style.fontSize = newSize + 'px';
                  h2.style.marginBottom = newMargin + 'px';
                  appliedStyles.h2++;
                });
                
                content.querySelectorAll('h3').forEach(h3 => {
                  const newSize = Math.max(fontSize * 1.2, 14);
                  const newMargin = Math.max(fontSize * 0.4, 5);
                  h3.style.fontSize = newSize + 'px';
                  h3.style.marginBottom = newMargin + 'px';
                  appliedStyles.h3++;
                });
                
                content.querySelectorAll('.quantity').forEach(qty => {
                  const newSize = Math.max(fontSize * 1.1, 12);
                  qty.style.fontSize = newSize + 'px';
                  qty.style.fontWeight = 'bold';
                  appliedStyles.quantity++;
                });
                
                content.querySelectorAll('.customer-name').forEach(name => {
                  const newSize = Math.max(fontSize, 10);
                  name.style.fontSize = newSize + 'px';
                  name.style.fontWeight = 'bold';
                  appliedStyles.customerName++;
                });
                
                content.querySelectorAll('.recipe-name, .meal-count').forEach(text => {
                  const newSize = Math.max(fontSize, 10);
                  text.style.fontSize = newSize + 'px';
                  appliedStyles.recipeName++;
                });
                
                content.querySelectorAll('.notes, .note').forEach(note => {
                  const newSize = Math.max(fontSize * 0.8, 8);
                  note.style.fontSize = newSize + 'px';
                  appliedStyles.notes++;
                });
                
                content.querySelectorAll('.item-line, .client-line').forEach(line => {
                  const newMargin = Math.max(fontSize * 0.3, 3);
                  line.style.marginBottom = newMargin + 'px';
                  appliedStyles.spacing++;
                });
                
                content.querySelectorAll('.category-section, .recipe-section').forEach(section => {
                  const newMargin = Math.max(fontSize * 0.8, 8);
                  section.style.marginBottom = newMargin + 'px';
                  appliedStyles.spacing++;
                });
                
                content.offsetHeight;
                
                const contentHeight = content.scrollHeight;
                const contentWidth = content.scrollWidth;
                const testEnd = performance.now();
                
                const fits = contentHeight <= availableHeight && contentWidth <= availableWidth;
                const utilization = Math.round((contentHeight / availableHeight) * 100);
                
                
                return fits;
              }
              
              
              const searchStart = performance.now();
              let searchResults = [];
              
              while (currentSize <= MAX_FONT_SIZE) {
                const testResult = {
                  fontSize: currentSize,
                  fits: measureContent(currentSize),
                  height: content.scrollHeight,
                  width: content.scrollWidth
                };
                
                searchResults.push(testResult);
                
                if (testResult.fits) {
                  maxTestedSize = currentSize;
                  currentSize += INCREMENT;
                } else {
                  break;
                }
              }
              
              const searchEnd = performance.now();
              
              
              measureContent(maxTestedSize);
              
              const finalHeight = content.scrollHeight;
              const finalWidth = content.scrollWidth;
              const utilization = Math.round((finalHeight / availableHeight) * 100);
              const improvement = maxTestedSize > 10 ? Math.round(((maxTestedSize - 10) / 10) * 100) : 0;
              
              
              if (utilization < 50) {
              } else if (utilization > 95) {
              } else {
              }
              
              if (maxTestedSize === 10) {
              }
            });
            
            
          }, 100);
        }
        
        function runMultipleTimes() {
          autoAdjustFontSize();
          setTimeout(autoAdjustFontSize, 300);
          setTimeout(autoAdjustFontSize, 700);
          setTimeout(autoAdjustFontSize, 1200);
        }
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', runMultipleTimes);
        }
        
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
          runMultipleTimes();
        }
        
        window.addEventListener('load', runMultipleTimes);
        
        window.addEventListener('beforeprint', () => {
          autoAdjustFontSize();
        });
        
      </script>
    `;
  };

  const getPrintStyles = () => {
    return `
      @page {
        size: A4;
        margin: 15mm;
      }
      
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      body {
        font-family: 'Arial', sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #333;
      }
      
      .print-page {
        page-break-after: always;
        height: 297mm;
        width: 210mm;
        display: flex;
        flex-direction: column;
        padding: 15mm;
        overflow: hidden;
        box-sizing: border-box;
      }
      
      .print-page:last-child {
        page-break-after: avoid;
      }
      
      .page-header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #333;
        padding-bottom: 15px;
      }
      
      .page-header h1 {
        font-size: 24px;
        font-weight: bold;
        color: #2563eb;
        margin-bottom: 8px;
      }
      
      .day-info {
        font-size: 16px;
        font-weight: 600;
        color: #666;
      }
      
      .company-section {
        flex: 1;
        margin-bottom: 20px;
        overflow: auto;
        min-height: 0;
      }
      
      .section-content {
        flex: 1;
        margin-bottom: 20px;
        overflow: auto;
        min-height: 0;
      }
      
      .client-header {
        margin-bottom: 20px;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 10px;
      }
      
      .client-header h2 {
        font-size: 20px;
        font-weight: bold;
        color: #1f2937;
        margin-bottom: 4px;
      }
      
      .meal-count {
        font-size: 14px;
        color: #6b7280;
        margin: 0;
      }
      
      .no-items {
        text-align: center;
        color: #6b7280;
        padding: 40px 0;
        font-style: italic;
      }
      
      .category-section {
        margin-bottom: 20px;
      }
      
      .category-header {
        margin-bottom: 10px;
      }
      
      .category-title {
        font-size: 18px;
        font-weight: bold;
        color: #1f2937;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 4px;
        margin: 0;
      }
      
      .items-container {
        padding-left: 15px;
      }
      
      .recipe-sections {
        padding: 10px 0;
      }
      
      .recipe-section {
        margin-bottom: 30px;
      }
      
      .recipe-header {
        margin-bottom: 15px;
      }
      
      .recipe-title {
        font-size: 20px;
        font-weight: bold;
        color: #1f2937;
        margin: 0;
      }
      
      .clients-list {
        padding-left: 20px;
      }
      
      .client-line {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      
      .customer-name {
        font-weight: bold;
        color: #1f2937;
        min-width: 120px;
        text-align: left;
      }
      
      .arrow {
        color: #6b7280;
        font-size: 14px;
      }
      
      .notes-section {
        margin-left: 10px;
      }
      
      .note {
        font-style: italic;
        color: #6b7280;
        font-size: 11px;
        margin-right: 5px;
      }
      
      .item-line {
        display: flex;
        align-items: flex-start;
        gap: 15px;
        margin-bottom: 6px;
        padding: 3px 0;
      }
      
      .quantity {
        font-weight: bold;
        color: #2563eb;
        min-width: 80px;
        font-size: 12px;
      }
      
      .recipe-name {
        flex: 1;
        color: #1f2937;
      }
      
      .notes {
        font-style: italic;
        color: #6b7280;
        font-size: 11px;
      }
      
      .customers {
        color: #6b7280;
        font-size: 10px;
        margin-left: 10px;
        font-style: italic;
      }
      
      .page-footer {
        margin-top: auto;
        text-align: center;
        border-top: 1px solid #e5e7eb;
        padding-top: 15px;
        font-size: 10px;
        color: #9ca3af;
      }
      
      .print-page:has(.page-header h1:contains("Por Empresa")) .page-header h1 {
        color: #6366f1;
      }
      
      .print-page:has(.page-header h1:contains("Salada")) .page-header h1 {
        color: #059669;
      }
      
      .print-page:has(.page-header h1:contains("Acougue")) .page-header h1 {
        color: #dc2626;
      }
      
      .print-page:has(.page-header h1:contains("Cozinha")) .page-header h1 {
        color: #ea580c;
      }
      
      .print-page:has(.page-header h1:contains("Embalagem")) .page-header h1 {
        color: #2563eb;
      }
      
      @media print {
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        
        .print-page {
          page-break-inside: avoid;
        }
        
        .category-block {
          page-break-inside: avoid;
        }
        
        .item-line {
          page-break-inside: avoid;
        }
      }
    `;
  };

  if (loading.initial) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-600">Carregando dados iniciais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 consolidacao-container">
      <Card className="print:hidden border-2 border-blue-200 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b-2 border-blue-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <FileText className="w-5 h-5" />
                Consolidação de Pedidos
              </CardTitle>
              <p className="text-blue-700 mt-1 font-medium">
                Visualize pedidos consolidados por cliente e categoria
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={loading.orders}
                className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading.orders ? 'animate-spin' : ''}`} />
                Atualizar Dados
              </Button>
              
              <Button
                variant={globalKitchenFormat ? "default" : "outline"}
                size="sm"
                onClick={toggleGlobalKitchenFormat}
                className="gap-2"
              >
                <ChefHat className="w-4 h-4" />
                {globalKitchenFormat ? "Formato Padrão" : "Formato Cozinha"}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={printing}
                className="gap-2"
              >
                {printing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Imprimir
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="bg-white">
          <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek(-1)}
              className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Semana Anterior
            </Button>
            
            <div className="text-center bg-white p-3 rounded-lg border-2 border-blue-200 shadow-sm">
              <h3 className="text-lg font-semibold text-blue-800">
                Semana {weekNumber}/{year}
              </h3>
              <p className="text-sm text-blue-600">
                {format(currentDate, "dd/MM")} - {format(addDays(currentDate, 4), "dd/MM/yyyy")}
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek(1)}
              className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              Próxima Semana
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex justify-center gap-3 mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
            {weekDays.map((day) => (
              <Button
                key={day.dayNumber}
                variant={selectedDay === day.dayNumber ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDay(day.dayNumber)}
                className={`flex flex-col h-16 w-16 p-1 text-xs transition-all duration-200 ${ 
                  selectedDay === day.dayNumber 
                    ? "bg-emerald-500 text-white border-emerald-600 shadow-lg transform scale-105" 
                    : "border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:scale-105"
                }`}
              >
                <span className="font-medium">{day.dayShort}</span>
                <span className="text-xs opacity-80">{day.dayDate}</span>
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Cliente
              </label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="border-purple-300 focus:border-purple-500 focus:ring-purple-200">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Clientes</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Buscar Cliente
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Digite o nome do cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-purple-300 focus:border-purple-500 focus:ring-purple-200"
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <Badge variant="secondary" className="h-fit bg-purple-100 text-purple-800 border border-purple-300">
                {ordersByCustomer.length} cliente(s) com pedidos
              </Badge>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
            <Tabs defaultValue="por-empresa" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 bg-white border-2 border-orange-200 p-2 rounded-lg">
                <TabsTrigger 
                  value="por-empresa" 
                  className="flex items-center gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:border-indigo-600 border-2 border-transparent hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200"
                >
                  <FileText className="w-4 h-4" />
                  Por Empresa
                </TabsTrigger>
                <TabsTrigger 
                  value="salada" 
                  className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:border-green-600 border-2 border-transparent hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                >
                  <Leaf className="w-4 h-4" />
                  Salada
                </TabsTrigger>
                <TabsTrigger 
                  value="acougue" 
                  className="flex items-center gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:border-red-600 border-2 border-transparent hover:border-red-300 hover:bg-red-50 transition-all duration-200"
                >
                  <Utensils className="w-4 h-4" />
                  Açougue
                </TabsTrigger>
                <TabsTrigger 
                  value="cozinha" 
                  className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-600 border-2 border-transparent hover:border-orange-300 hover:bg-orange-50 transition-all duration-200"
                >
                  <ChefHat className="w-4 h-4" />
                  Cozinha
                </TabsTrigger>
                <TabsTrigger 
                  value="embalagem" 
                  className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:border-blue-600 border-2 border-transparent hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                >
                  <Package2 className="w-4 h-4" />
                  Embalagem
                </TabsTrigger>
              </TabsList>

              <TabsContent value="por-empresa" className="mt-6">
                <ConsolidacaoContent
                    loading={loading}
                    ordersByCustomer={ordersByCustomer}
                    consolidateCustomerItems={consolidateCustomerItems}
                    weekDays={weekDays}
                    selectedDay={selectedDay}
                    globalKitchenFormat={globalKitchenFormat}
                    formatQuantityDisplay={formatQuantityDisplay}
                />
              </TabsContent>

              <TabsContent value="salada" className="mt-6">
                {activeTab === 'salada' && <SaladaTab 
                  currentDate={currentDate}
                  selectedDay={selectedDay}
                  weekNumber={weekNumber}
                  year={year}
                  weekDays={weekDays}
                  orders={orders}
                  recipes={recipes}
                  globalKitchenFormat={globalKitchenFormat}
                  toggleGlobalKitchenFormat={toggleGlobalKitchenFormat}
                />}
              </TabsContent>

              <TabsContent value="acougue" className="mt-6">
                {activeTab === 'acougue' && <AcougueTab 
                  currentDate={currentDate}
                  selectedDay={selectedDay}
                  weekNumber={weekNumber}
                  year={year}
                  weekDays={weekDays}
                  orders={orders}
                  recipes={recipes}
                  globalKitchenFormat={globalKitchenFormat}
                  toggleGlobalKitchenFormat={toggleGlobalKitchenFormat}
                />}
              </TabsContent>

              <TabsContent value="cozinha" className="mt-6">
                {activeTab === 'cozinha' && <CozinhaTab 
                  currentDate={currentDate}
                  selectedDay={selectedDay}
                  weekNumber={weekNumber}
                  year={year}
                  weekDays={weekDays}
                  orders={orders}
                  recipes={recipes}
                  globalKitchenFormat={globalKitchenFormat}
                  toggleGlobalKitchenFormat={toggleGlobalKitchenFormat}
                />}
              </TabsContent>

              <TabsContent value="embalagem" className="mt-6">
                {activeTab === 'embalagem' && <EmbalagemTab 
                  globalKitchenFormat={globalKitchenFormat}
                  toggleGlobalKitchenFormat={toggleGlobalKitchenFormat}
                />}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgramacaoCozinhaTabs;