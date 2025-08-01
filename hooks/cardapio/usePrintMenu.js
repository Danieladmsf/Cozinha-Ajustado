import { useCallback } from 'react';
import { format, addDays, startOfWeek, endOfWeek, getWeek, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { renderFormattedRecipeName } from '@/lib/textHelpers';

export const usePrintMenu = () => {
  const getDayNames = () => ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

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

  const renderClientsForPrint = useCallback((locationIds, customers, locations) => {
    if (!locationIds || locationIds.length === 0) return '';
    
    const clientNames = locationIds
      .map(id => {
        const customer = customers?.find(c => c.id === id);
        const location = locations?.find(l => l.id === id);
        return customer?.name || customer?.razao_social || location?.name || 'Cliente não encontrado';
      })
      .sort();
    
    return `
      <div class="client-tags">
        ${clientNames.map(name => `<span class="client-tag">${name}</span>`).join('')}
      </div>
    `;
  }, []);

  const getCustomerName = useCallback((customerId, customers, locations) => {
    const customer = customers?.find(c => c.id === customerId);
    const location = locations?.find(l => l.id === customerId);
    return customer?.name || customer?.razao_social || location?.name || 'Cliente não encontrado';
  }, []);

  const getPrintStyles = useCallback(() => {
    return `
      @media print {
        body { margin: 0; padding: 0; }
        .no-print { display: none !important; }
      }
      
      * {
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.4;
        color: #333;
        background: white;
        padding: 20px;
      }
      
      .print-header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #2563eb;
        padding-bottom: 20px;
      }
      
      .print-header h1 {
        margin: 0 0 10px 0;
        font-size: 28px;
        color: #1f2937;
      }
      
      .week-info {
        font-size: 16px;
        color: #6b7280;
        margin-bottom: 10px;
      }
      
      .customer-info {
        font-size: 18px;
        font-weight: 600;
        color: #2563eb;
        margin-top: 10px;
      }
      
      .print-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 20px;
        margin-bottom: 30px;
      }
      
      .print-day-column {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
        background: white;
      }
      
      .print-day-header {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 12px;
        text-align: center;
      }
      
      .print-day-header h2 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .day-date {
        font-size: 12px;
        opacity: 0.9;
        margin-top: 4px;
      }
      
      .print-day-content {
        padding: 15px;
      }
      
      .print-category {
        margin-bottom: 20px;
      }
      
      .category-title {
        font-size: 14px;
        font-weight: 600;
        padding: 8px 12px;
        border-radius: 4px;
        margin: 0 0 8px 0;
        color: #374151;
      }
      
      .category-items {
        padding-left: 8px;
      }
      
      .menu-item {
        margin-bottom: 6px;
        font-size: 13px;
        line-height: 1.3;
      }
      
      .recipe-name {
        font-weight: 500;
        color: #1f2937;
      }
      
      .client-tags {
        margin-top: 3px;
        font-size: 11px;
      }
      
      .client-tag {
        display: inline-block;
        background: #f3f4f6;
        color: #6b7280;
        padding: 2px 6px;
        border-radius: 3px;
        margin-right: 4px;
        margin-bottom: 2px;
      }
      
      .print-footer {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #6b7280;
        border-top: 1px solid #e5e7eb;
        padding-top: 15px;
        margin-top: 30px;
      }
      
      @page {
        size: A4 landscape;
        margin: 15mm;
      }
      
      @media print {
        .print-grid {
          grid-template-columns: repeat(5, 1fr);
          gap: 15px;
          page-break-inside: avoid;
        }
        
        .print-day-column {
          break-inside: avoid;
        }
      }
    `;
  }, []);

  const generatePrintableMenu = useCallback((weeklyMenu, categories, recipes, customers, locations, customerId, currentDate, getCategoryColor) => {
    if (!weeklyMenu) return '';

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });
    const year = getYear(currentDate);
    
    // Cabeçalho
    let html = `
      <div class="print-header">
        <h1>Cardápio Semanal</h1>
        <div class="week-info">
          <span>Semana ${weekNumber}/${year}</span>
          <span>${format(weekStart, 'dd/MM/yyyy', { locale: ptBR })} - ${format(weekEnd, 'dd/MM/yyyy', { locale: ptBR })}</span>
        </div>
        ${customerId !== 'all' ? `<div class="customer-info">Cliente: ${getCustomerName(customerId, customers, locations)}</div>` : ''}
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
        <div class="print-day-column">
          <div class="print-day-header">
            <h2>${dayName}</h2>
            <div class="day-date">${format(dayDate, 'dd/MM', { locale: ptBR })}</div>
          </div>
          
          <div class="print-day-content">
      `;
      
      // Categorias do dia
      categories?.forEach(category => {
        const categoryItems = dayItems[category.id] || [];
        
        // Filtrar por cliente se necessário
        const filteredItems = customerId === 'all' 
          ? categoryItems 
          : categoryItems.filter(item => 
              !item.locations || 
              item.locations.length === 0 || 
              item.locations.includes(customerId)
            );
        
        if (filteredItems.length > 0) {
          const categoryColor = getCategoryColor ? getCategoryColor(category.id) : (category.color || '#f3f4f6');
          
          html += `
            <div class="print-category">
              <h3 class="category-title" style="background-color: ${categoryColor}15; border-left: 3px solid ${categoryColor};">
                ${category.name}
              </h3>
              <div class="category-items">
          `;
          
          filteredItems.forEach(item => {
            const recipe = recipes?.find(r => r.id === item.recipe_id);
            if (recipe) {
              html += `
                <div class="menu-item">
                  <span class="recipe-name">${renderFormattedRecipeName(recipe.name)}</span>
                  ${customerId === 'all' ? renderClientsForPrint(item.locations, customers, locations) : ''}
                </div>
              `;
            }
          });
          
          html += `
              </div>
            </div>
          `;
        }
      });
      
      html += `
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    // Rodapé
    html += `
      <div class="print-footer">
        <div>Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</div>
        <div>Cozinha & Afeto</div>
      </div>
    `;
    
    return html;
  }, [getDayNames, getCustomerName, renderClientsForPrint]);

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