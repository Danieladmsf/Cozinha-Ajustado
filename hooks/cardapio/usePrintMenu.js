import { useCallback } from 'react';
import { format, addDays, startOfWeek, endOfWeek, getWeek, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { renderFormattedRecipeName } from '@/lib/textHelpers';
import { useLocationSelection } from './useLocationSelection';

export const usePrintMenu = () => {
  const getDayNames = () => ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
  
  // Função para obter clientes desmarcados de uma receita
  const getUncheckedClients = useCallback((item, locations, allClientIds) => {
    if (!item || !item.locations || !locations || !allClientIds) return [];
    
    // Simular o comportamento do useLocationSelection
    const isLocationSelected = (itemLocations, locationId) => {
      // Estado inicial: array vazio = todos selecionados
      if (!itemLocations || itemLocations.length === 0) {
        return true;
      }
      
      // Caso especial: marcador de "nenhum selecionado"
      if (itemLocations.includes('__NONE_SELECTED__')) {
        return false;
      }
      
      // Verificar se contém todos os IDs válidos
      const validIds = itemLocations.filter(id => allClientIds.includes(id));
      
      if (validIds.length === allClientIds.length) {
        return true; // Todos selecionados
      } else if (validIds.length === 0) {
        return false; // Nenhum selecionado
      } else {
        return itemLocations.includes(locationId); // Seleção parcial
      }
    };
    
    return locations.filter(location => {
      const isSelected = isLocationSelected(item.locations, location.id);
      return !isSelected; // Retorna apenas os NÃO selecionados
    });
  }, []);

  const formatRecipeName = useCallback((name) => {
    if (!name) return '';
    
    // Remover prefixos desnecessários
    const cleanName = name
      .replace(/^(Receita|Recipe)\s*[-:]?\s*/i, '')
      .replace(/\s*\(.*?\)\s*$/g, '') // Remove parênteses no final
      .trim();
    
    // Capitalizar primeira letra
    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  }, []);



  const getCustomerName = useCallback((customerId, customers, locations) => {
    const customer = customers?.find(c => c.id === customerId);
    const location = locations?.find(l => l.id === customerId);
    return customer?.name || customer?.razao_social || location?.name || 'Cliente não encontrado';
  }, []);

  const getPrintStyles = useCallback(() => {
    return `
      @page {
        size: A4 landscape;
        margin: 15mm;
      }
      
      * {
        box-sizing: border-box;
      }
      
      body {
        font-size: 11px;
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
      }
      
      .header {
        text-align: center;
        margin-bottom: 15px;
        flex-shrink: 0;
        padding: 10px 0;
      }
      
      .header-line {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 20px;
        margin-bottom: 10px;
      }
      
      .title {
        font-size: 18px;
        font-weight: bold;
      }
      
      h2 {
        font-size: 14px;
        font-weight: bold;
        margin: 0 0 5px 0;
        text-align: center;
      }
      
      h3 {
        font-size: 12px;
        font-weight: 600;
        margin: 0 0 4px 0;
        background-color: #f0f0f0;
        padding: 2px 4px;
        border-bottom: 1px solid #ccc;
      }
      
      .print-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 8px;
        flex: 1;
      }
      
      .print-day {
        border: 2px solid #000;
        padding: 4px;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      
      .day-header {
        border-bottom: 1px solid #ccc;
        padding-bottom: 5px;
        margin-bottom: 8px;
        flex-shrink: 0;
      }
      
      .day-content {
        flex: 1;
        overflow: hidden;
      }
      
      .category-section {
        margin-bottom: 8px;
      }
      
      .recipe-name {
        font-size: 10px;
        margin-bottom: 2px;
        line-height: 1.2;
      }
      
      .unchecked-clients {
        font-size: 8px;
        color: #d00;
        text-decoration: line-through;
        margin-left: 2px;
        line-height: 1.1;
      }
      
      
      
      .generation-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 9px;
        max-width: 800px;
        margin: 0 auto;
      }
      
      .brand {
        font-weight: 600;
        color: #333;
      }
      
      .week-number {
        font-size: 14px;
        font-weight: 600;
      }
      
      .date-range {
        font-size: 12px;
        color: #555;
      }
      
      .client-info {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 8px;
      }
    `;
  }, []);

  const calculateCategoryHeights = useCallback((weeklyMenu, categories, recipes, customers, locations, customerId) => {
    if (!weeklyMenu || !categories) return {};

    const dayNames = getDayNames();
    const categoryHeights = {};

    // Para cada categoria, calcular a altura necessária em cada dia
    categories.forEach((category, categoryIndex) => {
      let maxItemsInCategory = 0;
      
      dayNames.forEach((dayName, index) => {
        const dayIndex = index + 1;
        const dayItems = weeklyMenu?.menu_data?.[dayIndex] || {};
        const categoryItems = dayItems[category.id] || [];
        
        // Filtrar por cliente se necessário
        const filteredItems = customerId === 'all' 
          ? categoryItems 
          : categoryItems.filter(item => 
              !item.locations || 
              item.locations.length === 0 || 
              item.locations.includes(customerId)
            );

        // Contar total de linhas necessárias (receitas + tags de clientes)
        let totalLines = 0;
        filteredItems.forEach(item => {
          totalLines += 1; // linha da receita
          if (customerId === 'all' && item.locations && item.locations.length > 0) {
            // Estimar linhas de clientes (aprox 3 clientes por linha)
            const clientLines = Math.ceil(item.locations.length / 3);
            totalLines += clientLines;
          }
        });

        maxItemsInCategory = Math.max(maxItemsInCategory, totalLines);
      });

      // Calcular altura: título (15px) + items (cada item ~8px) + padding
      const titleHeight = 12;
      const itemHeight = 6;
      const padding = 5;
      const calculatedHeight = titleHeight + (maxItemsInCategory * itemHeight) + padding;
      
      // Altura mínima de 25px, máxima de 80px
      categoryHeights[categoryIndex] = Math.max(25, Math.min(80, calculatedHeight));
    });

    return categoryHeights;
  }, [getDayNames]);

  const generatePrintableMenu = useCallback((weeklyMenu, categories, recipes, customers, locations, customerId, currentDate, getCategoryColor) => {
    if (!weeklyMenu) return '';

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });
    const year = getYear(currentDate);
    
    // Obter todos os IDs de clientes para a função de clientes desmarcados
    const allClientIds = locations?.filter(loc => loc.active !== false).map(loc => loc.id) || [];
    
    // Calcular alturas das categorias
    const categoryHeights = calculateCategoryHeights(weeklyMenu, categories, recipes, customers, locations, customerId);
    
    // Cabeçalho
    let html = `
      <div class="header">
        <div class="header-line">
          <span class="title">Cardápio Semanal</span>
          <span class="week-number">Semana ${weekNumber}/${year}</span>
          <span class="date-range">${format(weekStart, 'dd/MM/yyyy', { locale: ptBR })} - ${format(weekEnd, 'dd/MM/yyyy', { locale: ptBR })}</span>
        </div>
        ${customerId !== 'all' ? `<div class="client-info">Cliente: ${getCustomerName(customerId, customers, locations)}</div>` : ''}
        <div class="generation-info" style="margin-top: 5px;">
          <span>Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
          <span class="brand">Cozinha & Afeto</span>
        </div>
      </div>
    `;

    // Grid de dias da semana
    html += '<div class="print-grid">';
    
    const dayNames = getDayNames();
    
    dayNames.forEach((dayName, index) => {
      const dayIndex = index + 1;
      const dayDate = addDays(weekStart, index);
      const dayItems = weeklyMenu?.menu_data?.[dayIndex] || {};
      
      html += `
      <div class="print-day">
      <div class="day-header">
      <h2>${dayName.toUpperCase()} - ${format(dayDate, 'dd/MM/yyyy', { locale: ptBR })}</h2>
      </div>
      
      <div class="day-content">
      `;
      
      // Categorias do dia (TODAS as categorias para manter alinhamento)
      categories?.forEach((category, categoryIndex) => {
        const categoryItems = dayItems[category.id] || [];
        
        // Filtrar por cliente se necessário
        const filteredItems = customerId === 'all' 
          ? categoryItems 
          : categoryItems.filter(item => 
              !item.locations || 
              item.locations.length === 0 || 
              item.locations.includes(customerId)
            );
        
        // SEMPRE mostrar a categoria (mesmo vazia) para manter alinhamento
        html += `
          <div class="category-section">
            <h3>${category.name}</h3>
            <div>
        `;
        
        if (filteredItems.length > 0) {
          filteredItems.forEach(item => {
            const recipe = recipes?.find(r => r.id === item.recipe_id);
            if (recipe) {
              // Obter clientes desmarcados apenas quando "Todos os Clientes" está selecionado
              const uncheckedClients = customerId === 'all' ? getUncheckedClients(item, locations, allClientIds) : [];
              
              html += `
                <div>
                  <div class="recipe-name">${renderFormattedRecipeName(recipe.name)}</div>
                  ${uncheckedClients.length > 0 ? `
                    <div class="unchecked-clients">${uncheckedClients.map(client => client.name).join(', ')}</div>
                  ` : ''}
                </div>
              `;
            }
          });
        } else {
          html += '<div>-</div>';
        }
        
        html += `
            </div>
          </div>
        `;
      });
      
      html += `
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    // Rodapé (moved to header)
    html += ``;
    
    return html;
  }, [getDayNames, getCustomerName, calculateCategoryHeights]);

  const handlePrintCardapio = useCallback((weeklyMenu, categories, recipes, customers, locations, customerId, currentDate, getCategoryColor) => {
    if (!weeklyMenu) {
      return;
    }

    // Gerar estrutura HTML para impressão
    const printContent = generatePrintableMenu(weeklyMenu, categories, recipes, customers, locations, customerId, currentDate, getCategoryColor);
    
    // Abrir janela de impressão
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cardápio Semanal</title>
          <style>
            ${getPrintStyles()}
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, [generatePrintableMenu, getPrintStyles]);

  return {
    handlePrintCardapio
  };
};