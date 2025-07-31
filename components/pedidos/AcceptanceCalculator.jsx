import { parseISO, subDays } from "date-fns";

/**
 * Calcula as estatísticas de aceitação de receitas para um cliente específico
 * 
 * @param {Array} orders - Lista completa de pedidos
 * @param {Array} wasteRecords - Lista completa de registros de sobras
 * @param {string} periodDays - Período de análise ("7", "30", "90", "all")
 * @param {string} customerId - ID do cliente selecionado
 * @param {Array} allRecipes - Lista completa de receitas
 * @returns {Object} Dados de aceitação organizados por dia da semana
 */
export const calculateRecipeAcceptance = (
  orders,
  wasteRecords,
  periodDays,
  customerId,
  allRecipes = []
) => {
  // Inicializa estrutura de retorno (dias 1-5, Segunda a Sexta)
  const acceptanceByDay = { 1: [], 2: [], 3: [], 4: [], 5: [] };

  // Define data de corte para o período selecionado
  let cutoffDate;
  if (periodDays === 'all') {
    cutoffDate = new Date(0); // Data muito antiga para incluir todos os registros
  } else {
    cutoffDate = subDays(new Date(), parseInt(periodDays, 10));
  }// Filtra pedidos pelo cliente e período
  const relevantOrders = orders.filter(order => {
    try {
      const orderDate = order.date ? parseISO(order.date) : null;
      return order.customer_id === customerId && orderDate && orderDate >= cutoffDate;
    } catch (error) {return false;
    }
  });// Filtra registros de sobras pelo cliente e período
  const relevantWaste = wasteRecords.filter(waste => {
    try {
      const wasteDate = waste.date ? parseISO(waste.date) : null;
      return waste.customer_id === customerId && wasteDate && wasteDate >= cutoffDate;
    } catch (error) {return false;
    }
  });// Estrutura para agregar dados de receitas por dia
  const recipeDataAggregated = {}; // Chave: `${dayOfWeek}-${recipe_id}`

  // Processa os pedidos
  relevantOrders.forEach(order => {
    const dayOfWeek = parseInt(order.day_of_week, 10);
    if (isNaN(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 5) return;

    // Garante que items é um array
    const orderItems = Array.isArray(order.items) ? order.items : [];
    
    orderItems.forEach(item => {
      if (!item.recipe_id) return;
      
      const key = `${dayOfWeek}-${item.recipe_id}`;

      // Inicializa dados da receita se for a primeira ocorrência
      if (!recipeDataAggregated[key]) {
        const recipeDetails = allRecipes.find(r => r.id === item.recipe_id);
        
        recipeDataAggregated[key] = {
          id: item.recipe_id,
          name: item.recipe_name || recipeDetails?.name || 'Receita desconhecida',
          category: item.category || recipeDetails?.category || 'Sem categoria',
          total_sent: 0,
          total_waste: 0,
          order_count: 0,
          dayOfWeek: dayOfWeek,
          orders_processed_for_count: new Set()
        };
      }

      // Processa quantidade enviada
      const quantity = parseFloat(String(item.quantity || '0').replace(',', '.')) || 0;
      if (quantity > 0) {
        recipeDataAggregated[key].total_sent += quantity;
        
        // Incrementa a contagem de pedidos distintos com esta receita
        if (!recipeDataAggregated[key].orders_processed_for_count.has(order.id)) {
          recipeDataAggregated[key].order_count += 1;
          recipeDataAggregated[key].orders_processed_for_count.add(order.id);
        }
      }
    });
  });

  // Processa os registros de sobras
  relevantWaste.forEach(waste => {
    const dayOfWeek = parseInt(waste.day_of_week, 10);
    if (isNaN(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 5) return;

    // Garante que items é um array
    const wasteItems = Array.isArray(waste.items) ? waste.items : [];
    
    wasteItems.forEach(item => {
      if (!item.recipe_id) return;
      
      const key = `${dayOfWeek}-${item.recipe_id}`;

      // Processa sobras apenas para receitas já registradas nos pedidos
      if (recipeDataAggregated[key]) {
        const wasteQuantity = parseFloat(String(item.waste_quantity || '0').replace(',', '.')) || 0;
        if (wasteQuantity > 0) {
          recipeDataAggregated[key].total_waste += wasteQuantity;
        }
      }
    });
  });

  // Calcula métricas finais e estrutura dados de retorno
  Object.values(recipeDataAggregated).forEach(data => {
    const { dayOfWeek, id, name, category, total_sent, total_waste, order_count } = data;

    // Ignora receitas sem envios
    if (order_count === 0 || total_sent === 0) {
      return;
    }

    // Calcula médias e percentual de aceitação
    const avgSent = total_sent / order_count;
    const avgWaste = total_waste / order_count;
    
    let acceptance = 0;
    if (total_sent > 0) {
      acceptance = ((total_sent - total_waste) / total_sent) * 100;
    }
    
    // Garante que a aceitação esteja entre 0% e 100%
    acceptance = Math.min(Math.max(acceptance, 0), 100);

    // Adiciona dados calculados ao dia correspondente
    acceptanceByDay[dayOfWeek].push({
      id,
      name,
      category,
      avgSent: parseFloat(avgSent.toFixed(1)),
      avgWaste: parseFloat(avgWaste.toFixed(1)), 
      totalSent: parseFloat(total_sent.toFixed(1)),
      totalWaste: parseFloat(total_waste.toFixed(1)),
      acceptance: parseFloat(acceptance.toFixed(1))
    });
  });

  // Ordena receitas por aceitação (maior primeiro) em cada dia
  Object.keys(acceptanceByDay).forEach(day => {
    acceptanceByDay[day].sort((a, b) => b.acceptance - a.acceptance);
  });

  return acceptanceByDay;
};