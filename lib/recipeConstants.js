/**
 * Configurações e constantes da Ficha Técnica
 * Extraído automaticamente de RecipeTechnicall.jsx
 */

// Tipos de processos disponíveis
export const processTypes = {
  defrosting: {
    id: 'defrosting',
    label: 'Descongelamento',
    color: 'blue',
    order: 1
  },
  cleaning: {
    id: 'cleaning',
    label: 'Limpeza',
    color: 'green',
    order: 2
  },
  cooking: {
    id: 'cooking',
    label: 'Cocção',
    color: 'orange',
    order: 3
  },
  portioning: {
    id: 'portioning',
    label: 'Porcionamento',
    color: 'teal',
    order: 4
  },
  assembly: {
    id: 'assembly',
    label: 'Montagem',
    color: 'indigo',
    order: 5
  },
  recipe: {
    id: 'recipe',
    label: 'Receita',
    color: 'emerald',
    order: 6
  }
};

// Configurações padrão
export const defaultConfig = {
  preparation: "Preparo",
  group: "Grupo"
};

// Validações
export const validationRules = {
  recipeName: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  prepTime: {
    required: false,
    min: 0,
    max: 1440
  },
  cubaWeight: {
    required: false,
    min: 0,
    max: 100
  }
};

// Constantes de interface
export const UI_CONSTANTS = {
  SEARCH_DELAY: 300,
  SAVE_DELAY: 1000,
  ANIMATION_DURATION: 200,
  MAX_INGREDIENTS_PER_PREP: 50,
  MAX_PREPARATIONS: 20
};

// Mensagens
export const MESSAGES = {
  SUCCESS: {
    SAVED: 'Dados salvos com sucesso',
    LOADED: 'Dados carregados com sucesso',
    DELETED: 'Item removido com sucesso'
  },
  ERROR: {
    REQUIRED_FIELD: 'Este campo é obrigatório',
    INVALID_NUMBER: 'Valor numérico inválido',
    SAVE_ERROR: 'Erro ao salvar os dados',
    LOAD_ERROR: 'Erro ao carregar os dados'
  }
};
