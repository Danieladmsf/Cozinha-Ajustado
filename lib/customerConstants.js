/**
 * Constantes para o módulo de clientes
 */

// Categorias de clientes
export const CUSTOMER_CATEGORIES = {
  RESTAURANTE: 'restaurante',
  EVENTO: 'evento',
  PESSOA_FISICA: 'pessoa_fisica',
  OUTRO: 'outro'
};

// Períodos de faturamento
export const BILLING_PERIODS = {
  DIARIO: 'diario',
  SEMANAL: 'semanal',
  QUINZENAL: 'quinzenal',
  MENSAL: 'mensal'
};

// Labels para exibição
export const CATEGORY_LABELS = {
  [CUSTOMER_CATEGORIES.RESTAURANTE]: 'Restaurante',
  [CUSTOMER_CATEGORIES.EVENTO]: 'Evento',
  [CUSTOMER_CATEGORIES.PESSOA_FISICA]: 'Pessoa Física',
  [CUSTOMER_CATEGORIES.OUTRO]: 'Outro'
};

export const BILLING_PERIOD_LABELS = {
  [BILLING_PERIODS.DIARIO]: 'Diário',
  [BILLING_PERIODS.SEMANAL]: 'Semanal',
  [BILLING_PERIODS.QUINZENAL]: 'Quinzenal',
  [BILLING_PERIODS.MENSAL]: 'Mensal'
};

// Opções de prazo de pagamento
export const PAYMENT_TERM_OPTIONS = {
  SEMANAL: [
    { value: 1, label: "1 dia após fechamento" },
    { value: 2, label: "2 dias após fechamento" },
    { value: 3, label: "3 dias após fechamento" },
    { value: 5, label: "5 dias após fechamento" },
    { value: 7, label: "7 dias após fechamento" }
  ],
  QUINZENAL: [
    { value: 1, label: "1 dia após fechamento" },
    { value: 2, label: "2 dias após fechamento" },
    { value: 3, label: "3 dias após fechamento" },
    { value: 5, label: "5 dias após fechamento" },
    { value: 7, label: "7 dias após fechamento" },
    { value: 10, label: "10 dias após fechamento" },
    { value: 15, label: "15 dias após fechamento" }
  ]
};

// Estados de cadastro
export const REGISTRATION_STATUS = {
  PENDING: true,
  COMPLETED: false
};

// Status de atividade
export const CUSTOMER_STATUS = {
  ACTIVE: true,
  INACTIVE: false
};

// Mensagens padrão
export const DEFAULT_MESSAGES = {
  PENDING_REGISTRATION_NOTES: "Cliente aguardando preenchimento via link",
  REGISTRATION_COMPLETED_NOTES: "Cadastro completado pelo cliente via portal",
  WHATSAPP_MESSAGE: (customerName) => `Olá ${customerName || 'cliente'}, tudo bem? Gostaria de falar sobre...`
};
