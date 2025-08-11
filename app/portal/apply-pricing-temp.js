/**
 * SCRIPT TEMPORÁRIO - Aplicar Nova Precificação
 * Aplica 40% custo operacional + 50% lucro aos preços atuais
 */

import { TempPricingCalculator } from './temp-pricing-calculator.js';

const calculator = new TempPricingCalculator();

// Preços atuais extraídos do pedido
const currentPrices = [
  { item: 'Arroz Branco', currentPrice: 15.37, unit: 'cuba-g', quantity: 10 },
  { item: 'Feijão', currentPrice: 14.20, unit: 'cuba-g', quantity: 4 },
  { item: 'R. Milho e Ervilha', currentPrice: 40.34, unit: 'cuba-g', quantity: 0.5 },
  { item: 'Filé de Frango com cheddar e bacon', currentPrice: 1.96, unit: 'unid.', quantity: 252 },
  { item: 'Ovos fritos', currentPrice: 0.67, unit: 'unid.', quantity: 200 },
  { item: 'Macarrão ao Sugo', currentPrice: 7.41, unit: 'cuba-g', quantity: 8 },
  { item: 'S. Alface', currentPrice: 11.11, unit: 'cuba-g', quantity: 1.5 },
  { item: 'S. Cenoura Ralada', currentPrice: 2.99, unit: 'cuba-g', quantity: 1 }
];

// Aplicar nova precificação
const newPricing = currentPrices.map(item => {
  const newPrice = calculator.calculateFinalPrice(item.currentPrice);
  const newSubtotal = newPrice * item.quantity;
  const currentSubtotal = item.currentPrice * item.quantity;
  
  return {
    ...item,
    newPrice: Number(newPrice.toFixed(2)),
    newSubtotal: Number(newSubtotal.toFixed(2)),
    currentSubtotal: Number(currentSubtotal.toFixed(2)),
    difference: Number((newSubtotal - currentSubtotal).toFixed(2)),
    percentageIncrease: Number((((newPrice - item.currentPrice) / item.currentPrice) * 100).toFixed(1))
  };
});

// Calcular totais
const currentTotal = newPricing.reduce((sum, item) => sum + item.currentSubtotal, 0);
const newTotal = newPricing.reduce((sum, item) => sum + item.newSubtotal, 0);
const totalDifference = newTotal - currentTotal;

console.log('=== APLICAÇÃO TEMPORÁRIA DE NOVA PRECIFICAÇÃO ===\n');

console.log('COMPARATIVO DE PREÇOS:');
newPricing.forEach(item => {
  console.log(`\n${item.item}:`);
  console.log(`  Preço atual: R$ ${item.currentPrice.toFixed(2)}/${item.unit}`);
  console.log(`  Novo preço: R$ ${item.newPrice.toFixed(2)}/${item.unit} (+${item.percentageIncrease}%)`);
  console.log(`  Subtotal atual: R$ ${item.currentSubtotal.toFixed(2)}`);
  console.log(`  Novo subtotal: R$ ${item.newSubtotal.toFixed(2)} (+R$ ${item.difference.toFixed(2)})`);
});

console.log('\n=== RESUMO FINANCEIRO ===');
console.log(`Total atual: R$ ${currentTotal.toFixed(2)}`);
console.log(`Novo total: R$ ${newTotal.toFixed(2)}`);
console.log(`Diferença: +R$ ${totalDifference.toFixed(2)} (+${((totalDifference/currentTotal)*100).toFixed(1)}%)`);

// Para uso no portal
export const TEMP_NEW_PRICING = {
  items: newPricing,
  summary: {
    currentTotal,
    newTotal,
    difference: totalDifference,
    percentageIncrease: ((totalDifference/currentTotal)*100).toFixed(1)
  }
};

// Executar se chamado diretamente
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.TEMP_NEW_PRICING = TEMP_NEW_PRICING;
}