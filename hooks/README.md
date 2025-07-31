# Hooks Organization

Esta pasta contém todos os hooks customizados organizados por módulos, seguindo a estrutura dos componentes.

## Estrutura

```
hooks/
├── cardapio/           # Hooks relacionados ao módulo Cardápio
│   ├── useMenuLocations.js
│   ├── useWeeklyMenuOperations.js
│   ├── useMenuInterface.js
│   ├── useMenuNotes.js
│   ├── useMenuHelpers.js
│   └── index.js
├── ficha-tecnica/      # Hooks para módulo Ficha Técnica
│   ├── useRecipeOperations.js
│   ├── useRecipeCalculations.js
│   ├── useRecipeInterface.js
│   ├── useRecipeConfig.js
│   └── index.js
├── analise-de-receitas/ # Hooks para módulo Análise de Receitas
│   ├── useRecipeAnalysisData.js
│   ├── useRecipeAnalysisCalculations.js
│   ├── useRecipeAnalysisInterface.js
│   ├── useRecipeFilters.js
│   └── index.js
├── receitas/           # Hooks para módulo Receitas (futuro)
├── ingredientes/       # Hooks para módulo Ingredientes (futuro)
├── pedidos/           # Hooks para módulo Pedidos (futuro)
├── shared/            # Hooks compartilhados entre módulos
├── index.js           # Exportações centrais
└── README.md          # Este arquivo
```

## Como usar

### Importação direta de um módulo:
```javascript
import { useMenuLocations, useWeeklyMenuOperations } from '@/hooks/cardapio';
```

### Importação central (todos os hooks):
```javascript
import { useMenuLocations, useWeeklyMenuOperations } from '@/hooks';
```

## Convenções

1. **Naming**: Todos os hooks começam com `use`
2. **Responsabilidade única**: Cada hook tem uma responsabilidade específica
3. **Modularity**: Hooks são organizados por domínio/módulo
4. **Reusability**: Lógica compartilhada vai na pasta `shared`

## Hooks do Cardápio

- **useMenuLocations**: Gerencia locais de servimento baseados em clientes
- **useWeeklyMenuOperations**: Operações CRUD do menu semanal
- **useMenuInterface**: Estados da interface do usuário
- **useMenuNotes**: Gerenciamento de notas do menu
- **useMenuHelpers**: Funções utilitárias do menu

## Hooks da Ficha Técnica

- **useRecipeOperations**: Operações CRUD de receitas (criar, salvar, carregar, deletar)
- **useRecipeCalculations**: Cálculos de peso, custo, perdas e rendimentos
- **useRecipeInterface**: Estados da interface (modais, busca, navegação)
- **useRecipeConfig**: Configurações do usuário para receitas

## Hooks da Análise de Receitas

- **useRecipeAnalysisData**: Carregamento e gestão de dados (receitas, ingredientes, histórico de preços)
- **useRecipeAnalysisCalculations**: Cálculos financeiros, volatilidade e análises de custo
- **useRecipeAnalysisInterface**: Estados da interface (tabs, filtros, gráficos, comparações)
- **useRecipeFilters**: Filtros avançados, busca e ordenação de receitas