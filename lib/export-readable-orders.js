/**
 * Exporta pedidos em formato legível para análise
 */

import fs from 'fs';

// Ler o JSON exportado
const jsonData = JSON.parse(fs.readFileSync('export-orders-simple-2025-10-22T22-28-50.json', 'utf8'));

let output = '';
output += '═══════════════════════════════════════════════════════\n';
output += '  TODOS OS PEDIDOS - FORMATO LEGÍVEL\n';
output += '═══════════════════════════════════════════════════════\n\n';

// Agrupar por cliente
const byCustomer = {};
jsonData.forEach(order => {
  if (!byCustomer[order.customer_name]) {
    byCustomer[order.customer_name] = [];
  }
  byCustomer[order.customer_name].push(order);
});

// Para cada cliente
Object.entries(byCustomer).forEach(([customerName, orders]) => {
  output += `\n${'━'.repeat(55)}\n`;
  output += `CLIENTE: ${customerName.toUpperCase()}\n`;
  output += `Total de pedidos: ${orders.length}\n`;
  output += `${'━'.repeat(55)}\n\n`;

  // Ordenar por semana e dia
  orders.sort((a, b) => {
    if (a.week_number !== b.week_number) return a.week_number - b.week_number;
    return a.day_of_week - b.day_of_week;
  });

  // Para cada pedido
  orders.forEach((order, idx) => {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayName = dayNames[order.day_of_week] || order.day_of_week;

    output += `Pedido ${idx + 1}:\n`;
    output += `  Data: ${order.date || 'N/A'}\n`;
    output += `  Semana ${order.week_number}/${order.year} - ${dayName} (dia ${order.day_of_week})\n`;
    output += `  Refeições Esperadas: ${order.total_meals_expected || 0}\n`;
    output += `\n  Itens:\n`;

    // Filtrar apenas itens com quantidade > 0
    const activeItems = order.items.filter(item =>
      item.quantity > 0 || item.base_quantity > 0
    );

    if (activeItems.length === 0) {
      output += `    (Nenhum item pedido)\n`;
    } else {
      activeItems.forEach(item => {
        const qty = item.quantity || item.base_quantity || 0;
        const unit = item.unit_type || 'N/A';
        const adj = item.adjustment_percentage || 0;

        let line = `    - ${item.recipe_name}: ${qty} ${unit}`;

        if (adj > 0) {
          line += ` (base: ${item.base_quantity}, ajuste: ${adj}%)`;
        }

        output += line + '\n';
      });
    }

    output += '\n';
  });
});

output += '\n';
output += '═══════════════════════════════════════════════════════\n';
output += '  FIM DO RELATÓRIO\n';
output += '═══════════════════════════════════════════════════════\n';

// Salvar
const filename = 'export-orders-readable.txt';
fs.writeFileSync(filename, output);

console.log(`\n✅ Relatório legível salvo em: ${filename}`);
console.log(`📄 Total de ${jsonData.length} pedidos exportados\n`);
