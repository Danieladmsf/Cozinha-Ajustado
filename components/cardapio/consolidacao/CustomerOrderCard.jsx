import React, { useMemo } from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formattedQuantity, formatCurrency } from "@/components/utils/orderUtils";
import { processConsolidatedItems } from "@/lib/categoryUtils";
import { useConsolidationFormatter } from "@/hooks/consolidacao/useConsolidationFormatter";

/**
 * Componente para renderizar informações do header do cliente
 */
const CustomerHeader = ({ customerData, selectedDayInfo }) => (
  <div className="mb-8">
    <div className="text-center border-b-2 border-gray-300 pb-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Cardápio dia {selectedDayInfo?.fullDate} - {customerData.customer_name}
      </h1>
      <div className="flex justify-center gap-6 text-sm text-gray-600">
        <span className="font-medium">
          Refeições: <span className="text-blue-700">{customerData.total_meals}</span>
        </span>
        <span className="font-medium">
          Total: <span className="text-green-700">{formatCurrency(customerData.total_amount || 0)}</span>
        </span>
      </div>
    </div>
  </div>
);

/**
 * Componente para renderizar um item individual do cardápio
 * Versão refatorada usando nova API de formatação
 */
const MenuItem = ({ item, index }) => {
  const { shouldHideItem, getFullDisplayText } = useConsolidationFormatter();
  
  // Verificar se item deve ser ocultado
  if (shouldHideItem(item.quantity, item.unit_type)) {
    return null;
  }

  // Obter texto completo formatado
  const displayText = getFullDisplayText(item.quantity, item.unit_type);
  
  return (
    <div key={`${item.unique_id || item.recipe_id}_${index}`} className="item-row">
      <span className="quantity font-semibold text-blue-700">
        {displayText} -
      </span>
      <span className="recipe-name text-gray-800 ml-2">
        {item.recipe_name}
      </span>
    </div>
  );
};

/**
 * Componente para renderizar uma seção de categoria
 */
const CategorySection = ({ category, items }) => (
  <div key={category.id} className="category-section mb-8">
    {/* Título da categoria */}
    <div className="mb-4">
      <h2 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-2">
        {category.name}
      </h2>
    </div>
    
    {/* Lista de itens */}
    <div className="items-list pl-4">
      {items.map((item, index) => (
        <MenuItem key={index} item={item} index={index} />
      ))}
    </div>
  </div>
);

/**
 * Componente para estado vazio (sem itens)
 */
const EmptyState = () => (
  <p className="text-center text-gray-500 py-8">
    Nenhum item no pedido deste cliente.
  </p>
);

/**
 * Componente para renderizar o footer da impressão
 */
const PrintFooter = () => (
  <div className="hidden print:block mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
    <p>Cozinha Afeto - Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
  </div>
);

/**
 * Hook personalizado para processar e ordenar itens consolidados
 */
const useOrderedCategories = (consolidatedItems, categories, menuHelpers, menuConfig) => {
  return useMemo(() => {
    // Validação de dados
    if (!consolidatedItems || Object.keys(consolidatedItems).length === 0) {
      return [];
    }
    
    if (!categories || !menuHelpers || !menuConfig) {
      return [];
    }

    try {
      // Obter categorias ativas na ordem configurada
      const activeCategories = menuHelpers.getActiveCategories(categories, menuConfig);
      
      // Processar itens usando utilitário centralizado
      return processConsolidatedItems(consolidatedItems, categories, activeCategories);
    } catch (error) {
      return [];
    }
  }, [consolidatedItems, categories, menuHelpers, menuConfig]);
};

const consolidateCustomerItems = (customerOrders, recipes) => {
    const consolidatedItems = {};
    const itemsMap = new Map();
    
    customerOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const key = item.unique_id || `${item.recipe_id}_${item.recipe_name}`;
          
          if (itemsMap.has(key)) {
            const existing = itemsMap.get(key);
            existing.quantity += item.quantity || 0;
            existing.total_price += item.total_price || 0;
          } else {
            const recipe = recipes.find(r => r.id === item.recipe_id);
            itemsMap.set(key, {
              ...item,
              category: recipe?.category || item.category || 'Outros',
              quantity: item.quantity || 0,
              total_price: item.total_price || 0
            });
          }
        });
      }
    });
    
    // Agrupar por categoria
    itemsMap.forEach(item => {
      const category = item.category;
      if (!consolidatedItems[category]) {
        consolidatedItems[category] = [];
      }
      consolidatedItems[category].push(item);
    });
    
    return consolidatedItems;
  };

/**
 * Componente principal para renderizar o card de pedido do cliente
 */
const CustomerOrderCard = ({ 
  customer, 
  orders, 
  recipes,
  selectedDayInfo,
  menuHelpers,
  categories,
  menuConfig
}) => {

  const consolidatedItems = useMemo(() => consolidateCustomerItems(orders, recipes), [orders, recipes]);

  // Processar e ordenar categorias
  const orderedCategories = useOrderedCategories(
    consolidatedItems, 
    categories, 
    menuHelpers, 
    menuConfig
  );

  return (
    <div className="customer-card">
      <CustomerHeader 
        customerData={customer} 
        selectedDayInfo={selectedDayInfo} 
      />

      {/* Conteúdo principal */}
      <div className="space-y-6">
        {orderedCategories.length === 0 ? (
          <EmptyState />
        ) : (
          orderedCategories.map(({ category, items }) => (
            <CategorySection 
              key={category.id}
              category={category} 
              items={items} 
            />
          ))
        )}
      </div>

      <PrintFooter />
    </div>
  );
};

export default CustomerOrderCard;