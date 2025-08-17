/**
 * Script para extrair pedidos do banco de dados
 * Similar ao extract-recipes.js mas para a coleção Order
 */

import { Order } from '../app/api/entities.js';
import fs from 'fs';
import path from 'path';

async function extractOrders() {
  try {
    console.log('🔍 Extraindo pedidos do banco de dados...');
    
    // Buscar todos os pedidos
    const orders = await Order.getAll();
    
    console.log(`📊 Encontrados ${orders.length} pedidos`);
    
    // Formatar dados de forma legível
    const readableData = orders.map((order, index) => ({
      index: index + 1,
      id: order.id,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      status: order.status,
      total_amount: order.total_amount,
      order_date: order.order_date,
      delivery_date: order.delivery_date,
      items: order.items,
      notes: order.notes,
      created_by: order.created_by,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      // Dados completos para análise
      ...order
    }));
    
    // Gerar timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `orders_readable_${timestamp}.txt`;
    const filepath = path.join('./SCRIPTS', filename);
    
    // Criar diretório se não existir
    if (!fs.existsSync('./SCRIPTS')) {
      fs.mkdirSync('./SCRIPTS', { recursive: true });
    }
    
    // Salvar arquivo
    const content = JSON.stringify(readableData, null, 2);
    fs.writeFileSync(filepath, content, 'utf8');
    
    console.log(`✅ Arquivo salvo: ${filepath}`);
    console.log(`📋 Total de pedidos extraídos: ${orders.length}`);
    
    // Estatísticas rápidas
    const byStatus = {};
    const byCustomer = {};
    orders.forEach(order => {
      if (order.status) {
        byStatus[order.status] = (byStatus[order.status] || 0) + 1;
      }
      if (order.customer_name) {
        byCustomer[order.customer_name] = (byCustomer[order.customer_name] || 0) + 1;
      }
    });
    
    console.log('📈 Por status:', byStatus);
    console.log('👥 Por cliente:', Object.keys(byCustomer).length, 'clientes únicos');
    
    return filepath;
    
  } catch (error) {
    console.error('❌ Erro ao extrair pedidos:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  extractOrders()
    .then(filepath => {
      console.log(`🎉 Extração concluída: ${filepath}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Falha na extração:', error);
      process.exit(1);
    });
}

export default extractOrders;