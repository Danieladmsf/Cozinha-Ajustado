// Constantes para o componente de Consolidação de Pedidos

export const WEEK_CONFIG = {
  WEEK_STARTS_ON: 1, // Segunda-feira
  WORKING_DAYS: 5,   // Segunda a sexta
  PRINT_DELAY: 100   // Delay para impressão em ms
};

export const DAY_NAMES = {
  1: 'Segunda-feira',
  2: 'Terça-feira', 
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira'
};

export const FILTER_OPTIONS = {
  ALL_CUSTOMERS: "all"
};

export const UI_MESSAGES = {
  LOADING: "Carregando pedidos...",
  NO_ORDERS: "Nenhum Pedido Encontrado",
  NO_ORDERS_DESCRIPTION: "Não há pedidos para o dia selecionado com os filtros aplicados.",
  NO_ORDERS_HINT: "Tente alterar os filtros ou selecionar outro dia.",
  NO_ITEMS: "Nenhum item no pedido deste cliente.",
  PRINT_ERROR: "Erro ao imprimir:",
  CUSTOMERS_WITH_ORDERS: "cliente(s) com pedidos"
};

export const LOADING_MESSAGES = {
  CUSTOMERS: "Clientes...",
  ORDERS: "Pedidos...", 
  RECIPES: "Receitas..."
};

export const DEFAULT_CATEGORY = 'Outros';