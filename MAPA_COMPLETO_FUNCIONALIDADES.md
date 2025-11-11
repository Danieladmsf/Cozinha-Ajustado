# MAPA COMPLETO DE FUNCIONALIDADES - COZINHA AFETO

## VISÃO GERAL DO SISTEMA

O Cozinha Afeto é um sistema completo de gestão para cozinha comercial construído em Next.js 14 com Firebase Firestore. O sistema gerencia desde a criação de receitas até a consolidação de pedidos e programação de produção.

**Stack Tecnológico:**
- Frontend: Next.js 14 (App Router) + React
- Banco de Dados: Firebase Firestore
- UI: Radix UI + Tailwind CSS
- Autenticação: Firebase Auth
- Deploy: Vercel

---

## MÓDULOS PRINCIPAIS

### 1. FICHAS TÉCNICAS (Receitas) - `/app/ficha-tecnica`

**Propósito:** Gerenciar todas as receitas do sistema com cálculos precisos de custos, rendimentos e processos.

**Componentes Principais:**
- `RecipeTechnical.jsx` - Interface principal da ficha técnica
- `IngredientTable.jsx` - Tabela de ingredientes com processos
- `ProcessCreatorModal.jsx` - Modal para criar novos processos
- `PreparationsList.jsx` - Lista de preparações da receita
- `RecipeMetricsDashboard.jsx` - Dashboard com métricas da receita
- `RecipeTechnicalPrintDialog.jsx` - Diálogo para imprimir ficha técnica completa
- `RecipeCollectDialog.jsx` - Diálogo para coleta de dados técnicos
- `RecipeSimplePrintDialog.jsx` - Diálogo de impressão simplificada

**Hooks Associados** (`/hooks/ficha-tecnica/`):
- `useRecipeState.js` - Gerencia todos os estados da ficha técnica
- `useRecipeCalculations.js` - Cálculos de métricas de receitas
- `useRecipeOperations.js` - Operações CRUD na receita
- `useRecipeValidation.js` - Validações de dados de receita
- `useRecipeStore.js` - Estado global da receita
- `useRecipeSearch.js` - Busca e filtro de receitas
- `useIngredientSearch.js` - Busca de ingredientes

**Fluxo de Dados:**

```
FICHA TÉCNICA
│
├─ 1. Informações Básicas
│  └─ Nome, categoria, tempo de preparo
│
├─ 2. Preparações (1 a N)
│  │
│  ├─ Título da Preparação
│  │
│  ├─ Ingredientes (1 a N) com Processos
│  │  │
│  │  ├─ Descongelamento
│  │  │  └─ weight_frozen → weight_thawed
│  │  │
│  │  ├─ Limpeza
│  │  │  └─ weight_raw → weight_clean
│  │  │
│  │  ├─ Cocção
│  │  │  └─ weight_pre_cooking → weight_cooked
│  │  │
│  │  └─ Porcionamento
│  │     └─ weight_cooked → weight_portioned
│  │
│  ├─ Sub-Componentes (Ingredientes da Montagem)
│  │  └─ assembly_weight_kg (peso final de cada componente)
│  │
│  └─ Configuração de Montagem (Assembly)
│     ├─ container_type (cuba-g, cuba-p, etc)
│     └─ units_quantity (quantidade de unidades)
│
└─ 3. Cálculos Automáticos
   ├─ total_weight (peso bruto total)
   ├─ yield_weight (peso de rendimento/cuba)
   ├─ total_cost (custo total)
   ├─ cost_per_kg_raw (custo por kg bruto)
   └─ cost_per_kg_yield (custo por kg de rendimento)
```

**Cálculos Principais** (`/lib/recipeCalculator.js`):

```javascript
// PESOS
- getInitialWeight() - Extrai peso inicial inteligente
- getFinalWeight() - Extrai peso final inteligente
- calculateLoss() - Calcula % de perda entre dois pesos
- calculateYield() - Calcula % de rendimento

// CUSTOS
- calculateIngredientCost() = weight_inicial × preço_unitário
- calculatePreparationMetrics() - Soma todos os ingredientes da preparação
- calculateRecipeMetrics() - Soma de TODAS as preparações

// RENDERIMENTO
- Se tem preparação com assembly/portioning → usa última como final
- Soma recursiva de preparações → peso_bruto + peso_rendimento + custo
- Multiplica por units_quantity se houver múltiplas unidades
```

**Estrutura de um Ingrediente:**

```javascript
{
  id: "uuid",
  name: "Nome do ingrediente",
  
  // Preços
  price_per_kg_bruto: 5.50,        // Preço por kg bruto
  current_price: 5.50,             // Preço atual
  
  // Pesos (em kg) - podem ser preenchidos ou deixados em branco
  weight_frozen: 2.0,              // Peso congelado (entrada)
  weight_raw: 2.0,                 // Peso bruto
  weight_thawed: 1.95,             // Peso descongelado (após descongelar)
  weight_clean: 1.80,              // Peso limpo (após limpeza)
  weight_pre_cooking: 1.80,        // Peso pré-cocção
  weight_cooked: 1.20,             // Peso cozido (após cocção)
  weight_portioned: 1.20,          // Peso porcionado
  
  // Cálculos derivados (automáticos)
  perda_descongelamento: 2.5%,
  perda_limpeza: 7.7%,
  perda_coccao: 33.3%,
  rendimento_total: 60%
}
```

**Características Especiais:**
- Validação automática de pesos (devem ser decrescentes)
- Cálculos de perda por processo
- Suporte a múltiplas unidades de container
- Impressão formatada para coleta de dados
- Busca rápida de ingredientes

---

### 2. CARDÁPIO SEMANAL - `/app/cardapio`

**Propósito:** Gerenciar o cardápio semanal por localização e configurar receitas disponíveis por dia.

**Componentes Principais:**
- `CardapioSemanal.jsx` (em `/components/cardapio/semanal/`) - Visualiza cardápio semanal
- `TabelaNutricional.jsx` - Análise nutricional do cardápio
- `CardapioCliente.jsx` - Visualização por cliente
- `WeeklyMenuComponent.jsx` - Componente de renderização semanal
- `CategoryMenuCard.jsx` - Cards de categorias do menu
- `LocationCheckboxGroup.jsx` - Seleção de localizações

**Hooks Associados** (`/hooks/cardapio/`):
- `useMenuData.js` - Carrega dados do menu
- `useWeeklyMenuOperations.js` - Operações de menu (CRUD)
- `useMenuHelpers.js` - Funções auxiliares
- `useMenuLocations.js` - Gerenciamento de localizações
- `usePrintMenu.js` - Formatação para impressão
- `useOrderConsolidation.js` - Consolidação de pedidos

**Fluxo de Cardápio:**

```
CARDÁPIO SEMANAL
│
├─ Seleção de Localização
│  └─ Menu pode variar por cliente/localização
│
├─ Dias da Semana (2ª à 6ª)
│  │
│  └─ Por Dia
│     │
│     ├─ Categorias de Receitas
│     │  └─ Salada, Carne, Acompanhamento, etc.
│     │
│     └─ Receitas Disponíveis
│        ├─ Nome e descrição
│        ├─ Preço
│        └─ Informações nutricionais
│
└─ Operações
   ├─ Adicionar receita ao dia
   ├─ Remover receita
   ├─ Editar preço/localização
   └─ Visualizar por cliente
```

**Configuração do Menu:**

Através da página `/configurar-cardapio`:
- Definir quais receitas aparecem em cada dia
- Ajustar preços por localização
- Configurar notas especiais
- Definir disponibilidade por cliente

---

### 3. PORTAL DO CLIENTE - `/app/portal`

**Propósito:** Interface de pedidos para clientes (integrado em página dinâmica).

**Componentes Principais:**
- `portal-dynamic/` - Rota dinâmica para acesso de clientes
- Visualiza cardápio disponível para o cliente
- Permite fazer pedidos por dia da semana
- Mostra consolidação de pedidos da semana

**Fluxo de Pedido do Cliente:**

```
PORTAL DO CLIENTE
│
├─ Autenticação (pode ser por link ou token)
│  └─ Carrega dados do cliente específico
│
├─ Visualização do Cardápio
│  └─ Mostra APENAS receitas disponíveis para esse cliente
│
├─ Seleção de Pedidos
│  │
│  └─ Por dia da semana (2ª à 6ª)
│     ├─ Quantidade de cada receita
│     ├─ Adição de notas
│     └─ Visualização de preço
│
├─ Consolidação Semanal
│  └─ Resumo de todos os pedidos da semana
│
└─ Submissão
   └─ Salva pedidos no banco de dados
```

---

### 4. CONSOLIDAÇÃO DE PEDIDOS - `/app/programacao`

**Propósito:** Consolidar pedidos de múltiplos clientes para produção.

**Componentes Principais:**
- `ProgramacaoCozinhaTabs.jsx` - Tab principal com consolidação
- `SaladaTab.jsx` - Separação de receitas de salada
- `AcougueTab.jsx` - Separação de receitas de carne/açougue
- `EmbalagemTab.jsx` - Separação de outras receitas
- `PrintPreviewEditor/` - Editor de pré-visualização para impressão

**Hook Associado:**
- `useProgramacaoRealtimeData.js` - Carrega dados em tempo real (Firebase listeners)
- `useOrderConsolidation.js` - Consolida pedidos por cliente/categoria

**Fluxo de Consolidação:**

```
CONSOLIDAÇÃO DE PEDIDOS
│
├─ Seleção de Semana
│  └─ Navegação por semana (anterior/próxima)
│
├─ Seleção de Dia (2ª à 6ª)
│  └─ Escolhe qual dia visualizar
│
├─ Filtros Opcionais
│  ├─ Cliente específico
│  └─ Busca por nome
│
└─ Visualização em 4 Abas
   │
   ├─ 1. POR EMPRESA
   │  ├─ Agrupa por cliente
   │  ├─ Agrupa itens por categoria
   │  └─ Mostra quantidade de cada receita
   │     (Pronto para entregar para cada cliente)
   │
   ├─ 2. SALADA
   │  ├─ Consolida TODAS as receitas de salada
   │  ├─ Agrupa por receita
   │  └─ Mostra cliente → quantidade
   │     (Pronto para montagem em linha de salada)
   │
   ├─ 3. AÇOUGUE
   │  ├─ Consolida TODAS as receitas de carne
   │  ├─ Agrupa por receita
   │  └─ Mostra cliente → quantidade
   │     (Pronto para preparação no açougue)
   │
   └─ 4. EMBALAGEM
      ├─ Consolida TODAS as outras receitas
      ├─ Agrupa por receita
      └─ Mostra cliente → quantidade
         (Pronto para embalagem e entrega)
```

**Formato de Quantidade (Conversão Cuba):**

O sistema converte automaticamente de `cuba-g` (unidade padrão) para formato da cozinha:

```javascript
// Exemplos de conversão:
2.5 cuba-g → "2 cubas G + 1 cuba P"
0.5 cuba-g → "1 cuba P"
1.0 cuba-g → "1 cuba G"
0.3 cuba-g → "½ cuba P" (arredonda para mais próximo)

// Regra: 1 cuba-g = 2 cubas-p
// Conversão automática usando: convertQuantityForKitchen()
```

**Modo de Impressão:**

- Calcula tamanho de fonte otimizado para cada página
- Divide em múltiplas páginas A4
- Usa busca binária para encontrar melhor tamanho
- Adiciona debug badges com tamanho da fonte usado
- Suporta impressão colorida para diferentes seções

---

### 5. LISTA DE COMPRAS - `/app/programacao/lista-compras`

**Propósito:** Gerar lista consolidada de ingredientes de toda a semana ou dia.

**Componentes Principais:**
- `ListaComprasTabs.jsx` - Interface principal
- `IngredientesConsolidados.jsx` - Tabela de ingredientes consolidados
- `utils/ingredientConsolidatorFixed.js` - Lógica de consolidação

**Fluxo de Lista de Compras:**

```
LISTA DE COMPRAS
│
├─ Seleção de Modo
│  ├─ Modo Semana (todos os 5 dias)
│  └─ Modo Dia (seleção individual)
│
├─ Seleção de Semana
│  └─ Navegação por semana
│
├─ Filtro (em modo dia)
│  └─ Seleciona qual dia visualizar
│
└─ Tabela de Ingredientes
   │
   ├─ Agrupado por Categoria
   │  └─ Ordenado alfabeticamente
   │
   └─ Por Ingrediente (linha)
      ├─ Nome do ingrediente
      ├─ Quantidade total consolidada
      ├─ Unidade de medida
      ├─ Peso total (kg)
      └─ Receitas que usam (contador)
```

**Lógica de Consolidação:**

```javascript
// Para cada pedido do dia:
//   Para cada receita no pedido:
//     Para cada ingrediente da receita:
//       quantidade_consolidada += quantidade × yield_weight_receita

// Resultado: Lista limpa com quantidade total por ingrediente
// Deduplicação automática (último pedido por cliente por dia)
```

**Estatísticas Exibidas:**
- Total de ingredientes únicos
- Número de categorias
- Peso total em kg

---

## FLUXO COMPLETO DO SISTEMA

### Fluxo 1: Criar uma Receita

```
1. Acessar: /ficha-tecnica
2. Criar nova receita
   - Informações básicas (nome, categoria, tempo)
3. Adicionar preparações (ex: "Marinada", "Cocção", "Montagem")
4. Para cada preparação:
   - Adicionar ingredientes
   - Definir processos (descongelamento, limpeza, cocção, etc)
   - Inserir pesos em cada estágio
   - Sistema calcula perdas automaticamente
5. Para preparação com assembly:
   - Adicionar sub-componentes
   - Definir peso de montagem
   - Definir container_type (cuba-g, unidade, kg)
6. Sistema calcula automaticamente:
   - Total weight (soma de tudo bruto)
   - Yield weight (peso final da receita)
   - Total cost (custo total)
   - Cost per kg (bruto e rendimento)
7. Salvar receita no Firebase
8. Opções de impressão:
   - Ficha técnica completa
   - Formulário para coleta de dados
   - Formato simples
```

### Fluxo 2: Configurar Cardápio Semanal

```
1. Acessar: /cardapio
2. Abrir aba "Cardápio Semanal"
3. Selecionar localização (se houver)
4. Para cada dia da semana:
   - Visualizar categorias (Salada, Carne, etc)
   - Ver receitas disponíveis naquele dia
5. (Opcional) Ir para /configurar-cardapio para:
   - Adicionar/remover receitas de cada dia
   - Ajustar preços por localização
   - Adicionar notas especiais
```

### Fluxo 3: Cliente Faz um Pedido

```
1. Cliente acessa: /portal/[cliente-id]
2. Visualiza cardápio disponível para ele (filtrado)
3. Para cada dia (2ª à 6ª):
   - Seleciona receitas e quantidades
   - Adiciona notas se necessário
4. Visualiza consolidação e preço total
5. Submete pedido
   - Salva no Firebase como "Order"
   - Associado à semana/cliente
```

### Fluxo 4: Programação de Produção

```
1. Acessar: /programacao → "Programação Cozinha"
2. Selecionar semana (navegação)
3. Selecionar dia específico (2ª à 6ª)
4. Visualizar em 4 abas:
   
   a) POR EMPRESA (padrão)
      - Ver pedido consolidado de cada cliente
      - Quantidades convertidas para formato cozinha (cuba)
      - Pronto para embalar e entregar
   
   b) SALADA
      - Ver TODAS as receitas de salada consolidadas
      - Cliente → Quantidade
      - Pronto para montar em linha de produção
   
   c) AÇOUGUE
      - Ver TODAS as receitas de carne consolidadas
      - Cliente → Quantidade
      - Pronto para processamento
   
   d) EMBALAGEM
      - Ver TODAS as outras receitas consolidadas
      - Cliente → Quantidade
      - Pronto para embalar

5. Opções de Impressão:
   - Abre editor de pré-visualização
   - Calcula fonte otimizada para cada página
   - Imprime cada seção em múltiplas páginas A4
   - Usa diferentes cores para diferentes seções
```

### Fluxo 5: Gerar Lista de Compras

```
1. Acessar: /programacao → "Lista de Compras"
2. Escolher modo:
   - Semana inteira (5 dias)
   - Um dia específico
3. Selecionar semana (navegação)
4. Resultado: Tabela de ingredientes
   - Agrupa por categoria
   - Mostra quantidade total consolidada
   - Mostra peso em kg
   - Ordena alfabeticamente

Exemplo de consolidação:
- Cliente A pediu 2 cubas de Frango Grelhado (550g cada = 1,1kg)
- Cliente B pediu 1 cuba de Frango Grelhado (550g = 0,55kg)
- Total: 1,65kg de Frango Grelhado (ou 3 cubas)
```

---

## ESTRUTURA DE DADOS (Firebase Collections)

### Collection: Recipe
```javascript
{
  id: "uuid",
  name: "Nome da Receita",
  name_complement: "Complemento",
  category: "Carne",
  
  // Metadados
  prep_time: 30,              // minutos
  active: true,
  created_at: Timestamp,
  updated_at: Timestamp,
  
  // Medidas finais (calculadas)
  total_weight: 2.5,          // kg bruto total
  yield_weight: 1.5,          // kg rendimento (cuba)
  cuba_weight: 1.5,           // kg da cuba final
  
  // Custos
  total_cost: 15.50,          // R$ total
  cost_per_kg_raw: 6.20,      // R$ por kg bruto
  cost_per_kg_yield: 10.33,   // R$ por kg rendimento
  
  // Configuração de container
  container_type: "cuba-g",
  unit_type: "cuba-g",
  
  // Instruções gerais
  instructions: "Texto com instruções",
  
  // Preparações (array)
  preparations: [
    {
      id: "uuid",
      title: "Marinada",
      order: 1,
      
      // Processos desta preparação
      processes: ["defrosting", "cleaning"],
      
      // Ingredientes
      ingredients: [
        {
          id: "uuid",
          name: "Frango",
          price_per_kg_bruto: 8.50,
          weight_frozen: 2.0,
          weight_thawed: 1.95,
          weight_clean: 1.80,
          // ... outros pesos
        }
      ],
      
      // Receitas adicionadas como componentes
      recipes: [
        {
          id: "recipe-id",
          used_weight: 0.5,      // Peso usado desta receita
          cost_per_kg_yield: 10.33
        }
      ],
      
      // Componentes de montagem
      sub_components: [
        {
          id: "uuid",
          name: "Base de Arroz",
          assembly_weight_kg: 0.3,
          type: "ingredient"
        }
      ],
      
      // Configuração de montagem
      assembly_config: {
        container_type: "cuba-g",
        units_quantity: 3        // 3 unidades/porções
      }
    }
  ],
  
  // Configuração de pré-preparo
  pre_preparo: {}
}
```

### Collection: Order
```javascript
{
  id: "uuid",
  
  // Identificação
  customer_id: "customer-id",
  customer_name: "Nome do Cliente",
  
  // Semana do pedido
  week_number: 45,
  year: 2024,
  
  // Dia específico
  day_of_week: 2,              // 1-5 (segunda a sexta)
  
  // Dados de pedido
  items: [
    {
      id: "uuid",
      recipe_id: "recipe-id",
      recipe_name: "Frango Grelhado",
      quantity: 2.5,           // Quantidade (em cubas, unidades, etc)
      unit_type: "cuba-g",     // Tipo de unidade
      notes: "Sem sal",
      total_price: 25.00
    }
  ],
  
  // Totais
  total_meals_expected: 10,
  total_items: 3,
  original_amount: 100.00,
  total_amount: 100.00,
  
  // Metadados
  status: "confirmed",
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### Collection: Ingredient
```javascript
{
  id: "uuid",
  name: "Frango Peito",
  category: "Carnes e Aves",
  
  // Preços
  current_price: 8.50,         // Preço atual
  price_per_kg_bruto: 8.50,
  
  // Informações nutricionais
  nutritional_info: {
    calories: 165,
    protein: 31,
    fat: 3.6,
    carbs: 0
  },
  
  active: true,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### Collection: WeeklyMenu
```javascript
{
  id: "uuid",
  week_number: 45,
  year: 2024,
  
  // Menu por localização
  by_location: {
    "location-1": {
      "1": [                     // Dia 1 (segunda)
        {
          recipe_id: "recipe-id",
          price: 25.00,
          available: true
        }
      ],
      "2": [...],                // Dia 2 (terça)
      // ... até dia 5
    }
  }
}
```

---

## CÁLCULOS PRINCIPAIS

### Cálculo 1: Rendimento de um Ingrediente

```javascript
Yield = (final_weight / initial_weight) × 100

Exemplo:
- Frango congelado: 2.0 kg
- Frango descongelado: 1.95 kg (perda: 2.5%)
- Frango limpo: 1.80 kg (perda: 7.7%)
- Frango cozido: 1.20 kg (perda: 33.3%)
- Rendimento total: 60%
```

### Cálculo 2: Custo de um Ingrediente

```javascript
cost = initial_weight × unit_price

Exemplo:
- Frango: 2.0 kg
- Preço por kg: R$ 8.50
- Custo total do ingrediente: R$ 17.00
```

### Cálculo 3: Métricas de uma Preparação

```javascript
// Soma de todos os ingredientes + receitas adicionadas + sub-componentes

total_raw_weight = Σ(weight_inicial) de cada ingrediente
total_yield_weight = Σ(weight_final) de cada ingrediente
total_cost = Σ(cost) de cada ingrediente

yield_percentage = (total_yield_weight / total_raw_weight) × 100
```

### Cálculo 4: Métricas da Receita Completa

```javascript
// Soma de TODAS as preparações

if (última_preparação é assembly/portioning) {
  // Usar apenas a última como referência
  final_yield = última_prep.yield_weight × units_quantity
} else {
  // Somar todas as preparações
  final_yield = Σ(yield_weight) de cada preparação
}

cost_per_kg_raw = total_cost / total_weight
cost_per_kg_yield = total_cost / final_yield
```

### Cálculo 5: Consolidação de Pedidos

```javascript
// Para cada ingrediente em todos os pedidos:

consolidated_quantity = Σ(item.quantity) onde item.recipe_id === mesmo_ingrediente

// Agrupado por categoria e receita
// Deduplica: último pedido por cliente por dia
```

---

## UTILITÁRIOS E HELPERS

### Conversão de Unidades (cubaConversionUtils.js)

```javascript
// Converte cuba-g para formato da cozinha:
convertQuantityForKitchen(2.5, "cuba-g")
// Retorna: "2 cubas G + 1 cuba P"

// Regras:
// 1 cuba-g = 2 cubas-p
// Arredonda decimais para o padrão mais próximo
// 0.25, 0.5, 0.75, 1.0
```

### Formatação de Texto (textUtils.js)

```javascript
formatCapitalize(text)      // "FRANGO GRELHADO"
formatCurrency(value)       // "R$ 15,50"
formatPercentage(value)     // "60,5%"
```

### Parsing Seguro (recipeCalculator.js)

```javascript
parseNumber(value)          // Aceita string/número, retorna número
// "1.5" → 1.5
// "1,5" → 1.5
// null → 0
```

---

## PÁGINAS PRINCIPAIS DO SISTEMA

| Página | Rota | Descrição | Função Principal |
|--------|------|-----------|-----------------|
| Dashboard | `/` | Página inicial | Visão geral do sistema |
| Ficha Técnica | `/ficha-tecnica` | Criar/editar receitas | Gerenciar receitas com cálculos |
| Receitas | `/receitas` | Listar receitas | Buscar e selecionar receitas |
| Cardápio | `/cardapio` | Gerenciar menu semanal | Configurar cardápio por localização |
| Configurar Cardápio | `/configurar-cardapio` | Ajustes de menu | Adicionar/remover receitas por dia |
| Programação | `/programacao` | Produção e compras | Consolidação, lista de compras |
| Ingredientes | `/ingredientes` | Base de ingredientes | Gerenciar ingredientes e preços |
| Clientes | `/clientes` | Gerenciar clientes | CRUD de clientes |
| Portal Cliente | `/portal/[id]` | Portal dinâmico | Clientes fazem pedidos |
| Categorias | `/categorias` | Categorias de receita | Gerenciar categorias |
| Análise Receitas | `/analise-de-receitas` | Análise de dados | Relatórios de receitas |
| Tabela Nutricional | `/tabela-nutricional` | Dados nutricionais | Análise nutricional |

---

## FLUXOS DE DADOS EM TEMPO REAL

### Real-time Listeners (Firebase)

```javascript
// useProgramacaoRealtimeData.js
// Escuta automaticamente:

1. Customers - Todas as mudanças em clientes
   unsubscribeCustomers = Customer.listen(callback)

2. Recipes - Todas as mudanças em receitas
   unsubscribeRecipes = Recipe.listen(callback)

3. Orders - Pedidos da semana atual
   unsubscribeOrders = Order.listen(callback, [
     { field: 'week_number', operator: '==', value: weekNumber },
     { field: 'year', operator: '==', value: year }
   ])

// Quando componente desmonta:
unsubscribe() // Remove listener
```

---

## VALIDAÇÕES DO SISTEMA

### Validações de Receita

```javascript
// useRecipeValidation.js

validateRecipeData():
- Preparações devem ter título
- Ingredientes devem ter nome
- Pesos devem ser decrescentes (lógica de perda)
- Preços não devem ser negativos
- Unit_type deve ser compatível
```

### Validações de Pedido

```javascript
// Em useOrderConsolidation.js

validateAmount():
- Quantidade deve ser número válido
- Quantidade não deve ser negativa
- Deduplica pedidos por cliente
```

---

## MELHORIAS IMPLEMENTADAS

### Otimizações de Performance

1. **Memoização de Cálculos**
   - `useMemo` para consolidação de pedidos
   - Cache de receitas filtradas
   - Listeners reais-time em vez de polling

2. **Normalização de Dados**
   - `parseNumber()` para segurança
   - Unit_type sincronizado com ficha técnica
   - Deduplicação de pedidos automática

3. **Impressão Inteligente**
   - Cálculo de fonte com busca binária
   - Múltiplas páginas A4
   - Debug badges com tamanho usado

### Recursos Especiais

1. **Conversão Inteligente de Cuba**
   - Automática quando unit_type = 'cuba-g'
   - Arredondamento inteligente
   - Suporte a frações (½, 1½, etc)

2. **Consolidação por Categoria**
   - Separação de salada, carne, outros
   - Cada seção otimizada para sua função
   - Formatação específica por processo

3. **Validação de Pesos**
   - Garante ordem lógica (bruto > final)
   - Calcula perdas automaticamente
   - Alerta sobre inconsistências

---

## CONEXÃO ENTRE MÓDULOS

```
RECEITAS (Ficha Técnica)
    ↓
    ├─→ CARDÁPIO SEMANAL (Quais receitas aparecem quando)
    │       ↓
    │       └─→ PORTAL CLIENTE (Cliente vê cardápio e pede)
    │               ↓
    │               └─→ PEDIDOS (Order no Firebase)
    │                       ↓
    ├─────────────────────→ CONSOLIDAÇÃO (Agrupa pedidos)
    │                           ├─→ Por Empresa (para entregar)
    │                           ├─→ Salada (para produzir)
    │                           ├─→ Açougue (para processar)
    │                           └─→ Embalagem (para embalar)
    │
    └─→ LISTA DE COMPRAS (Ingredientes necessários)
            └─→ Agrupa ingredientes de todas as receitas pedidas
                └─→ Gera lista consolidada por dia/semana
```

---

## RESUMO DE FUNCIONALIDADES

| Módulo | Funcionalidades | Status |
|--------|-----------------|--------|
| **Fichas Técnicas** | Criar receitas, cálculos automáticos, múltiplas preparações, validações | Completo |
| **Cardápio** | Menu semanal, por localização, visualização por cliente | Completo |
| **Portal Cliente** | Fazer pedidos, visualizar menu, consolidação semanal | Completo |
| **Consolidação** | 4 visualizações (empresa, salada, açougue, embalagem), impressão otimizada | Completo |
| **Lista de Compras** | Consolidação por ingrediente, modo dia/semana, estatísticas | Completo |
| **Ingredientes** | Base de dados, preços, categorias, nutricionais | Completo |
| **Clientes** | CRUD, categorias, bloqueios | Completo |
| **Programação** | Integração de todas as funções de produção | Completo |

---

## TECNOLOGIAS E PADRÕES

- **React Hooks** para lógica de estado
- **Firebase Firestore** para persistência
- **Firebase Real-time Listeners** para atualizações automáticas
- **Radix UI** para componentes acessíveis
- **Tailwind CSS** para estilo
- **Next.js App Router** para navegação
- **useMemo/useCallback** para otimização
- **Padrão de Entidades** para CRUD padronizado

---

**Última Atualização:** 2024-11-11
**Versão:** 2.0.0
**Status:** Completo e funcional
