// Utility functions for date calculations
export const calculateWeekDates = (weekNumber, year) => {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysToAdd = (weekNumber - 1) * 7;
  const startDate = new Date(firstDayOfYear.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
  return { startDate, endDate };
};

// PDF generation functions (placeholder implementations)
export const exportRecipePDF = async (recipe) => {
  return { success: false, error: 'Function not implemented' };
};

export const generateRecipePDF = async (recipe) => {
  return { success: false, error: 'Function not implemented' };
};

export const generateSimplifiedRecipePDF = async (recipe) => {
  return { success: false, error: 'Function not implemented' };
};

// Period report generation
export const generatePeriodReport = async (data) => {
  try {
    const { startDate, endDate, customerName, orders, wastes, allRecipes } = data;

    let totalOrdersAmount = 0;
    let totalWasteAmount = 0;

    // Calculate total orders amount
    const ordersHtml = orders.length > 0 ? `
      <h2>Pedidos (${orders.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Refeições</th>
            <th>Valor Original</th>
            <th>Valor Final</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(order => {
            totalOrdersAmount += (order.final_amount || 0);
            return `
              <tr>
                <td>${new Date(order.date).toLocaleDateString('pt-BR')}</td>
                <td>${order.total_meals_expected || 0}</td>
                <td>${(order.original_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>${(order.final_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    ` : `<p>Nenhum pedido encontrado para o período.</p>`;

    // Calculate total waste amount
    const wastesHtml = wastes.length > 0 ? `
      <h2>Sobras (${wastes.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Peso Interno (kg)</th>
            <th>Peso Cliente (kg)</th>
            <th>Valor Original</th>
            <th>Valor Desconto</th>
            <th>Valor Final</th>
          </tr>
        </thead>
        <tbody>
          ${wastes.map(waste => {
            totalWasteAmount += (waste.final_value_after_discount || 0);
            return `
              <tr>
                <td>${new Date(waste.date).toLocaleDateString('pt-BR')}</td>
                <td>${(waste.total_internal_waste_weight_kg || 0).toFixed(2)}</td>
                <td>${(waste.total_client_returned_weight_kg || 0).toFixed(2)}</td>
                <td>${(waste.total_original_value_of_waste || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>${(waste.total_discount_value_applied || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>${(waste.final_value_after_discount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    ` : `<p>Nenhum registro de sobra encontrado para o período.</p>`;

    const netTotalAmount = totalOrdersAmount - totalWasteAmount;

    const reportHtml = `
      <html>
        <head>
          <title>Relatório do Período - ${customerName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; color: #333; }
            h1, h2 { color: #0056b3; border-bottom: 2px solid #0056b3; padding-bottom: 5px; margin-top: 30px; }
            p { margin-bottom: 10px; }
            table { border-collapse: collapse; width: 100%; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f2f2f2; color: #555; }
            .summary-box { background-color: #e9f7ef; border: 1px solid #d0e9d0; padding: 15px; margin-top: 20px; border-radius: 8px; }
            .summary-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #cce5cc; }
            .summary-item:last-child { border-bottom: none; }
            .summary-label { font-weight: bold; color: #28a745; }
            .summary-value { font-weight: bold; color: #007bff; }
            .net-value { font-size: 1.2em; color: ${netTotalAmount >= 0 ? '#28a745' : '#dc3545'}; }
          </style>
        </head>
        <body>
          <h1>Relatório de Pedidos e Sobras para ${customerName}</h1>
          <p>Período: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}</p>
          <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>

          <div class="summary-box">
            <h2>Resumo Financeiro do Período</h2>
            <div class="summary-item">
              <span class="summary-label">Total de Pedidos:</span>
              <span class="summary-value">${totalOrdersAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total de Sobras (Abatimento):</span>
              <span class="summary-value">-${totalWasteAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label net-value">Valor Líquido Total:</span>
              <span class="summary-value net-value">${netTotalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </div>

          ${ordersHtml}
          ${wastesHtml}
        </body>
      </html>
    `;
    return { data: reportHtml, error: null };
  } catch (error) {
    console.error("Erro ao gerar relatório de período:", error);
    return { data: null, error: `Erro ao gerar relatório: ${error.message}` };
  }
};

// Import functions (placeholder implementations)
export const importPriceHistory = async (data) => {
  return { success: false, error: 'Function not implemented' };
};

export const importIngredients = async (data) => {
  return { success: false, error: 'Function not implemented' };
};

