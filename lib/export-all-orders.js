/**
 * Script para Exportar Todos os Pedidos do Banco
 *
 * Exporta em formato JSON para facilitar análise
 *
 * Uso:
 * node lib/export-all-orders.js
 */

import { Order, Customer, Recipe } from '../app/api/entities.js';
import fs from 'fs';

/**
 * Exporta todos os pedidos do banco
 */
async function exportAllOrders() {
  console.log('\n🔍 Iniciando exportação de pedidos...\n');

  try {
    // 1. Buscar todos os pedidos
    console.log('📥 Buscando pedidos...');
    const orders = await Order.getAll();
    console.log(`✅ ${orders.length} pedidos encontrados\n`);

    // 2. Buscar clientes para enriquecer dados
    console.log('📥 Buscando clientes...');
    const customers = await Customer.getAll();
    const customerMap = {};
    customers.forEach(c => customerMap[c.id] = c);
    console.log(`✅ ${customers.length} clientes carregados\n`);

    // 3. Buscar receitas para enriquecer dados
    console.log('📥 Buscando receitas...');
    const recipes = await Recipe.getAll();
    const recipeMap = {};
    recipes.forEach(r => recipeMap[r.id] = r);
    console.log(`✅ ${recipes.length} receitas carregadas\n`);

    // 4. Enriquecer dados dos pedidos
    console.log('🔄 Enriquecendo dados...');
    const enrichedOrders = orders.map(order => {
      const customer = customerMap[order.customer_id];

      // Enriquecer itens com informações de receita
      const enrichedItems = (order.items || []).map(item => {
        const recipe = recipeMap[item.recipe_id];
        return {
          ...item,
          recipe_name: item.recipe_name || recipe?.name || 'N/A',
          recipe_category: recipe?.category || 'N/A',
          recipe_unit_type: recipe?.unit_type || item.unit_type || 'N/A'
        };
      });

      return {
        id: order.id,
        customer_id: order.customer_id,
        customer_name: order.customer_name || customer?.name || 'N/A',
        week_number: order.week_number,
        year: order.year,
        day_of_week: order.day_of_week,
        date: order.date,
        total_meals_expected: order.total_meals_expected || 0,
        total_items: enrichedItems.length,
        items: enrichedItems,
        notes: order.notes || '',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };
    });

    // 5. Organizar por cliente
    const ordersByCustomer = {};
    enrichedOrders.forEach(order => {
      const customerId = order.customer_id;
      if (!ordersByCustomer[customerId]) {
        ordersByCustomer[customerId] = {
          customer_id: customerId,
          customer_name: order.customer_name,
          total_orders: 0,
          orders: []
        };
      }
      ordersByCustomer[customerId].total_orders++;
      ordersByCustomer[customerId].orders.push(order);
    });

    // Ordenar pedidos por data dentro de cada cliente
    Object.values(ordersByCustomer).forEach(customerData => {
      customerData.orders.sort((a, b) => {
        const dateA = new Date(a.date || '1970-01-01');
        const dateB = new Date(b.date || '1970-01-01');
        return dateB - dateA; // Mais recentes primeiro
      });
    });

    // 6. Criar estatísticas gerais
    const stats = {
      total_orders: orders.length,
      total_customers: Object.keys(ordersByCustomer).length,
      total_recipes: recipes.length,
      date_range: {
        oldest: null,
        newest: null
      },
      orders_by_week: {},
      orders_by_customer: {}
    };

    // Calcular range de datas
    const dates = orders
      .map(o => new Date(o.date || '1970-01-01'))
      .filter(d => d.getFullYear() > 1970)
      .sort((a, b) => a - b);

    if (dates.length > 0) {
      stats.date_range.oldest = dates[0].toISOString();
      stats.date_range.newest = dates[dates.length - 1].toISOString();
    }

    // Contar pedidos por semana
    orders.forEach(order => {
      const key = `${order.week_number}/${order.year}`;
      stats.orders_by_week[key] = (stats.orders_by_week[key] || 0) + 1;
    });

    // Contar pedidos por cliente
    Object.entries(ordersByCustomer).forEach(([customerId, data]) => {
      stats.orders_by_customer[data.customer_name] = data.total_orders;
    });

    // 7. Criar estrutura final
    const exportData = {
      metadata: {
        exported_at: new Date().toISOString(),
        total_orders: stats.total_orders,
        total_customers: stats.total_customers,
        date_range: stats.date_range,
        script_version: '1.0'
      },
      statistics: stats,
      orders_by_customer: ordersByCustomer,
      all_orders: enrichedOrders
    };

    // 8. Salvar arquivos
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

    // JSON completo
    const filenameComplete = `export-orders-complete-${timestamp}.json`;
    fs.writeFileSync(filenameComplete, JSON.stringify(exportData, null, 2));
    console.log(`\n✅ Exportação completa salva em: ${filenameComplete}`);

    // JSON simplificado (apenas pedidos)
    const filenameSimple = `export-orders-simple-${timestamp}.json`;
    fs.writeFileSync(filenameSimple, JSON.stringify(enrichedOrders, null, 2));
    console.log(`✅ Exportação simples salva em: ${filenameSimple}`);

    // Resumo em TXT
    const txtFilename = `export-orders-summary-${timestamp}.txt`;
    let txtContent = '';
    txtContent += '═══════════════════════════════════════════════════════\n';
    txtContent += '  EXPORTAÇÃO DE PEDIDOS - RESUMO\n';
    txtContent += '═══════════════════════════════════════════════════════\n\n';
    txtContent += `Data da exportação: ${new Date().toISOString()}\n`;
    txtContent += `Total de pedidos: ${stats.total_orders}\n`;
    txtContent += `Total de clientes: ${stats.total_customers}\n`;
    txtContent += `Total de receitas: ${stats.total_recipes}\n`;
    txtContent += `\n`;
    txtContent += `Período dos dados:\n`;
    txtContent += `  - Mais antigo: ${stats.date_range.oldest || 'N/A'}\n`;
    txtContent += `  - Mais recente: ${stats.date_range.newest || 'N/A'}\n`;
    txtContent += `\n`;
    txtContent += '───────────────────────────────────────────────────────\n';
    txtContent += 'PEDIDOS POR CLIENTE\n';
    txtContent += '───────────────────────────────────────────────────────\n\n';

    Object.entries(ordersByCustomer)
      .sort((a, b) => b[1].total_orders - a[1].total_orders)
      .forEach(([customerId, data]) => {
        txtContent += `${data.customer_name}: ${data.total_orders} pedidos\n`;
      });

    txtContent += '\n';
    txtContent += '───────────────────────────────────────────────────────\n';
    txtContent += 'PEDIDOS POR SEMANA (Top 10)\n';
    txtContent += '───────────────────────────────────────────────────────\n\n';

    Object.entries(stats.orders_by_week)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([week, count]) => {
        txtContent += `Semana ${week}: ${count} pedidos\n`;
      });

    txtContent += '\n';
    txtContent += '═══════════════════════════════════════════════════════\n';

    fs.writeFileSync(txtFilename, txtContent);
    console.log(`✅ Resumo TXT salvo em: ${txtFilename}`);

    // 9. Imprimir estatísticas
    console.log('\n───────────────────────────────────────────────────────');
    console.log('📊 ESTATÍSTICAS GERAIS');
    console.log('───────────────────────────────────────────────────────\n');
    console.log(`Total de pedidos: ${stats.total_orders}`);
    console.log(`Total de clientes: ${stats.total_customers}`);
    console.log(`Média de pedidos/cliente: ${(stats.total_orders / stats.total_customers).toFixed(1)}`);
    console.log(`\nTop 5 clientes com mais pedidos:`);
    Object.entries(stats.orders_by_customer)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([name, count], idx) => {
        console.log(`  ${idx + 1}. ${name}: ${count} pedidos`);
      });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Exportação concluída com sucesso!');
    console.log('═══════════════════════════════════════════════════════\n');

    return {
      success: true,
      files: [filenameComplete, filenameSimple, txtFilename],
      stats
    };

  } catch (error) {
    console.error('\n❌ Erro na exportação:', error);
    console.error('\nStack trace:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar
exportAllOrders()
  .then(result => {
    if (!result.success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
