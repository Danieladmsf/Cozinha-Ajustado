# FLUXOS VISUAIS E DIAGRAMAS - COZINHA AFETO

## 1. ARQUITETURA GERAL DO SISTEMA

```
┌─────────────────────────────────────────────────────────────────┐
│                        COZINHA AFETO                             │
│                      Next.js 14 + Firebase                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
        ┌───────▼────┐ ┌─────▼──────┐ ┌────▼─────────┐
        │  Frontend   │ │ Firebase   │ │   API Routes │
        │  (Next.js)  │ │ (Firestore)│ │  (Backend)   │
        │ React + UI  │ │            │ │              │
        └─────────────┘ └────────────┘ └──────────────┘
                │              │              │
        ┌───────┴──────────────┴──────────────┴────────┐
        │                                               │
    ┌───▼─────────────────────────────────────────────▼────┐
    │     Real-time Listeners & CRUD Operations            │
    │     Collections: Recipe, Order, Customer, etc.       │
    └─────────────────────────────────────────────────────┘
```

---

## 2. ESTRUTURA DE PASTAS E MÓDULOS

```
app/
├── ficha-tecnica/              # Receitas e cálculos
│   └── page.jsx
├── receitas/                   # Listagem de receitas
│   └── page.jsx
├── cardapio/                   # Cardápio semanal
│   ├── cardapio-semanal.jsx
│   ├── tabela-nutricional.jsx
│   ├── cardapio-cliente.jsx
│   └── page.jsx
├── configurar-cardapio/        # Configuração do menu
│   └── page.jsx
├── programacao/                # Produção e compras
│   ├── consolidacao-pedidos.jsx
│   ├── lista-compras.js
│   └── page.jsx
├── portal/                     # Portal do cliente
│   └── [customer-id]/
├── ingredientes/               # Base de ingredientes
├── clientes/                   # Gestão de clientes
├── api/                        # Endpoints e entidades
│   └── entities.js            # CRUD abstrato
└── layout.jsx

components/
├── ficha-tecnica/             # Componentes de receita
│   ├── RecipeTechnical.jsx
│   ├── IngredientTable.jsx
│   ├── ProcessCreatorModal.jsx
│   ├── PreparationsList.jsx
│   ├── RecipeMetricsDashboard.jsx
│   └── ... (outros componentes)
├── cardapio/                  # Componentes de menu
│   ├── semanal/
│   ├── consolidacao/
│   ├── cliente/
│   └── nutricional/
├── programacao/               # Componentes de produção
│   ├── ProgramacaoCozinhaTabs.jsx
│   ├── ListaComprasTabs.jsx
│   ├── tabs/
│   │   ├── SaladaTab.jsx
│   │   ├── AcougueTab.jsx
│   │   └── EmbalagemTab.jsx
│   └── lista-compras/
│       └── IngredientesConsolidados.jsx
└── ui/                        # Componentes genéricos

hooks/
├── ficha-tecnica/            # Hooks de receita
│   ├── useRecipeState.js
│   ├── useRecipeCalculations.js
│   ├── useRecipeOperations.js
│   └── ... (outros)
├── cardapio/                 # Hooks de menu
│   ├── useMenuData.js
│   ├── useOrderConsolidation.js
│   └── ... (outros)
├── programacao/              # Hooks de produção
│   ├── useProgramacaoRealtimeData.js
│   └── ... (outros)
└── shared/                   # Hooks compartilhados

lib/
├── recipeCalculator.js       # Cálculos de receita (NÚCLEO)
├── recipeMetricsCalculator.js
├── cubaConversionUtils.js    # Conversão de unidades
├── firebase.js               # Config Firebase
├── textUtils.js              # Formatação de texto
└── ... (outros)
```

---

## 3. FLUXO DE CRIAÇÃO DE RECEITA

```
┌────────────────────────────────────────────────────────────┐
│ 1. ACESSAR /ficha-tecnica                                  │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│ 2. PREENCHER INFORMAÇÕES BÁSICAS                           │
│    - Nome da receita                                        │
│    - Categoria (Carne, Salada, etc)                        │
│    - Tempo de preparo                                      │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│ 3. ADICIONAR PREPARAÇÕES                                   │
│    - Clique em "Adicionar Preparação"                      │
│    - Defina título (ex: "Marinada", "Cocção", "Montagem") │
│    - Selecione processos necessários:                      │
│      ☐ Descongelamento    ☐ Limpeza                        │
│      ☐ Cocção             ☐ Porcionamento                  │
│      ☐ Montagem                                            │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│ 4. PARA CADA PREPARAÇÃO - ADICIONAR INGREDIENTES           │
│                                                             │
│    Ingrediente: Frango Peito                               │
│    ├─ Preço: R$ 8,50/kg                                    │
│    └─ Pesos (conforme processos):                          │
│       ├─ Descongelamento:                                  │
│       │  └─ weight_frozen: 2.0 kg → weight_thawed: 1.95 kg│
│       ├─ Limpeza:                                          │
│       │  └─ weight_raw: 2.0 kg → weight_clean: 1.80 kg     │
│       ├─ Cocção:                                           │
│       │  └─ weight_pre_cooking: 1.80 kg → weight_cooked: 1.20 kg
│       └─ [Sistema calcula perdas automaticamente]          │
│                                                             │
│    Ingrediente: Azeite                                     │
│    ├─ Preço: R$ 25,00/kg                                   │
│    └─ weight_raw: 0.1 kg                                   │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│ 5. PARA PREPARAÇÃO COM MONTAGEM - CONFIGURAR ASSEMBLY      │
│                                                             │
│    Sub-componentes:                                         │
│    ├─ Arroz Cozido → assembly_weight_kg: 0.3 kg           │
│    ├─ Frango Marinado → assembly_weight_kg: 0.2 kg        │
│    └─ Salada → assembly_weight_kg: 0.1 kg                 │
│                                                             │
│    Configuração de Montagem:                               │
│    ├─ Container: cuba-g                                    │
│    └─ Unidades: 3 (para 3 porções/cubas)                  │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│ 6. SISTEMA CALCULA AUTOMATICAMENTE (recipeCalculator.js)   │
│                                                             │
│    Por Ingrediente (perda):                                │
│    ├─ Frango: 60% rendimento (2.0kg → 1.2kg)              │
│    ├─ Azeite: 100% rendimento (0.1kg → 0.1kg)             │
│    └─ Custo por ingrediente = peso_inicial × preço        │
│                                                             │
│    Por Preparação (soma):                                  │
│    ├─ Total bruto: 2.1 kg                                  │
│    ├─ Total rendimento: 1.3 kg                             │
│    ├─ Total custo: R$ 19,95                                │
│    └─ Rendimento %: 61,9%                                  │
│                                                             │
│    Para Receita (com assembly × units_quantity):           │
│    ├─ Total weight: 2.1 kg × 3 = 6.3 kg                   │
│    ├─ Yield weight: 1.3 kg × 3 = 3.9 kg (cuba final)      │
│    ├─ Total cost: R$ 59,85                                 │
│    ├─ Cost per kg raw: R$ 9,48                             │
│    └─ Cost per kg yield: R$ 15,35                          │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│ 7. REVISAR E SALVAR                                        │
│    - Dashboard com resumo de métricas                      │
│    - Validação de dados                                    │
│    - Botão SALVAR → Firebase (Recipe collection)           │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│ 8. OPÇÕES DE IMPRESSÃO                                     │
│    ✓ Ficha Técnica Completa (com cálculos)                │
│    ✓ Formulário de Coleta de Dados (vazio para preencher) │
│    ✓ Formato Simples                                       │
└────────────────────────────────────────────────────────────┘
```

---

## 4. FLUXO DE PEDIDO DO CLIENTE

```
┌─────────────────────────────────────────────────────┐
│ 1. CLIENTE ACESSA: /portal/[cliente-id]             │
│    [Sistema obtém dados do cliente no Firebase]     │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ 2. VISUALIZAR CARDÁPIO DA SEMANA                    │
│    Filtra apenas receitas disponíveis para cliente  │
│    (baseado em MenuConfig e localizações)           │
└─────────────────────────────────────────────────────┘
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    ▼                   ▼                   ▼
 SEGUNDA             TERÇA               QUARTA
    │                   │                   │
    ├─ Salada Verde    ├─ Salada Grega    ├─ Salada de Beterraba
    ├─ Frango          ├─ Peixe           ├─ Carne
    │  Grelhado        │  Assado           │  Refogada
    ├─ Arroz           ├─ Batata           ├─ Batata Doce
    └─ R$ 25,00        └─ R$ 28,00         └─ R$ 22,00
                        │
    ┌───────────────────┴───────────────────┐
    │                                       │
    ▼                                       ▼
QUINTA                                SEXTA
    │                                       │
    ├─ Salada de Abacate                   ├─ Ceviche
    ├─ Camarão                             ├─ Polvo
    │  ao Molho                            │  à Lagarteña
    ├─ Arroz                               ├─ Milho
    └─ R$ 32,00                            └─ R$ 35,00


┌─────────────────────────────────────────────────────┐
│ 3. FAZER PEDIDOS (por dia)                          │
│                                                     │
│    SEGUNDA:                                         │
│    ☐ Salada Verde        Qtd: [2] cubas            │
│    ☑ Frango Grelhado     Qtd: [3] cubas            │
│      └─ Notas: Sem sal                              │
│    ☐ Arroz               Qtd: [ ] cubas            │
│                                                     │
│    → [Próximo Dia] → TERÇA ...                      │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ 4. REVISAR CONSOLIDAÇÃO SEMANAL                     │
│                                                     │
│    Resumo de Pedidos:                               │
│    ├─ Segunda:  3 cubas Frango = R$ 75,00          │
│    ├─ Terça:    2 cubas Peixe + 1 Batata = R$ 30   │
│    ├─ Quarta:   2 cubas Carne = R$ 44,00           │
│    ├─ Quinta:   3 cubas Camarão = R$ 96,00         │
│    ├─ Sexta:    1 cuba Polvo = R$ 35,00            │
│    │                                                │
│    └─ TOTAL: R$ 280,00                              │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ 5. SUBMETER PEDIDO                                  │
│    [Clique em "Confirmar Pedido"]                   │
│    → Salva em Firebase: Order collection             │
│    → week_number, year, customer_id, items[]       │
│    → Status: confirmed                              │
└─────────────────────────────────────────────────────┘
```

---

## 5. FLUXO DE CONSOLIDAÇÃO PARA PRODUÇÃO

```
┌──────────────────────────────────────────────────────────┐
│ 1. ACESSAR: /programacao → "Programação Cozinha"        │
│    [Sistema escuta Firebase em tempo real]               │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│ 2. SELECIONAR SEMANA E DIA                               │
│    Semana: [◀ 45 ▶]  Ano: 2024                          │
│                                                          │
│    Dias: [SEG] [TER] [QUA] [QUI] [SEX]                  │
│            ☐     ☑    ☐    ☐    ☐                       │
│    (Selecionado: TERÇA)                                  │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│ 3. VISUALIZAR EM 4 ABAS                                  │
└──────────────────────────────────────────────────────────┘
         │          │          │          │
         ▼          ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
    │POR EMP │ │SALADA  │ │AÇOUGUE │ │EMBALAGEM │
    └────────┘ └────────┘ └────────┘ └──────────┘


╔═════════════════════════════════════════════════════════╗
║ ABA 1: POR EMPRESA (Cada cliente recebe um pacote)     ║
║═════════════════════════════════════════════════════════║
║                                                         ║
║ Cliente: Empresa A                                      ║
║ ├─ FRUTAS & VEGETAIS                                    ║
║ │  ├─ 2 cubas G Salada Verde                           ║
║ │  └─ 1 cuba P Cenoura Ralada                          ║
║ ├─ CARNES                                               ║
║ │  └─ 3 cubas G + 1 cuba P Frango Grelhado             ║
║ └─ ACOMPANHAMENTOS                                      ║
║    ├─ 2 cubas G Arroz                                  │
║    └─ 1 cuba G Batata Frita                            │
║                                                         ║
║ Cliente: Empresa B                                      ║
║ ├─ FRUTAS & VEGETAIS                                    ║
║ │  ├─ 1 cuba G Salada Grega                            │
║ │  └─ ½ cuba P Azeitonas                               │
║ └─ CARNES                                               ║
║    └─ 2 cubas G Peixe Assado                           │
║                                                         ║
║ → PRONTO PARA EMBALAR E ENTREGAR PARA CADA CLIENTE    ║
╚═════════════════════════════════════════════════════════╝


╔═════════════════════════════════════════════════════════╗
║ ABA 2: SALADA (Para montagem em linha)                 ║
║═════════════════════════════════════════════════════════║
║                                                         ║
║ SALADA VERDE:                                           ║
║ 1. Empresa A → 2 cubas G                               ║
║ 2. Empresa B → 1 cuba G                                ║
║ 3. Empresa C → 1½ cuba G                               ║
║ ─────────────────────────────────────────────────      ║
║ TOTAL: 4½ cubas G = 4 cubas G + 1 cuba P              ║
║                                                         ║
║ CENOURA RALADA:                                         ║
║ 1. Empresa A → ½ cuba P                                ║
║ 2. Empresa C → ½ cuba P                                ║
║ ─────────────────────────────────────────────────      ║
║ TOTAL: 1 cuba P                                         ║
║                                                         ║
║ → AGRUPA TODAS AS SALADAS POR RECEITA                  ║
║ → CADA RECEITA MOSTRA CLIENTE → QUANTIDADE            ║
║ → PRONTO PARA MONTAR EM LINHA DE PRODUÇÃO              ║
╚═════════════════════════════════════════════════════════╝


╔═════════════════════════════════════════════════════════╗
║ ABA 3: AÇOUGUE (Para processamento de carnes)          ║
║═════════════════════════════════════════════════════════║
║                                                         ║
║ FRANGO GRELHADO:                                        ║
║ 1. Empresa A → 3 cubas G + 1 cuba P                    ║
║ 2. Empresa D → 2 cubas G                               ║
║ ─────────────────────────────────────────────────      ║
║ TOTAL: 5 cubas G + 1 cuba P                            ║
║                                                         ║
║ PEIXE ASSADO:                                           ║
║ 1. Empresa B → 2 cubas G                               ║
║ 2. Empresa E → 1½ cuba G                               ║
║ ─────────────────────────────────────────────────      ║
║ TOTAL: 3½ cubas G = 3 cubas G + 1 cuba P              ║
║                                                         ║
║ CARNE REFOGADA:                                         ║
║ 1. Empresa C → 2 cubas G                               ║
║ ─────────────────────────────────────────────────      ║
║ TOTAL: 2 cubas G                                        ║
║                                                         ║
║ → AGRUPA TODAS AS CARNES POR RECEITA                   ║
║ → PRONTO PARA PROCESSAR NO AÇOUGUE                     ║
╚═════════════════════════════════════════════════════════╝


╔═════════════════════════════════════════════════════════╗
║ ABA 4: EMBALAGEM (Acompanhamentos e pratos finais)     ║
║═════════════════════════════════════════════════════════║
║                                                         ║
║ ARROZ:                                                  ║
║ 1. Empresa A → 2 cubas G                               ║
║ 2. Empresa B → 1 cuba G                                ║
║ 3. Empresa D → 2 cubas G                               ║
║ ─────────────────────────────────────────────────      ║
║ TOTAL: 5 cubas G                                        ║
║                                                         ║
║ BATATA FRITA:                                           ║
║ 1. Empresa A → 1 cuba G                                ║
║ 2. Empresa C → ½ cuba P                                ║
║ ─────────────────────────────────────────────────      ║
║ TOTAL: 1 cuba G + ½ cuba P                             ║
║                                                         ║
║ → AGRUPA TODOS OS ACOMPANHAMENTOS POR RECEITA          ║
║ → PRONTO PARA EMBALAR E FINALIZAR                      ║
╚═════════════════════════════════════════════════════════╝

                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│ 4. IMPRIMIR CONSOLIDAÇÃO                                 │
│    [Botão "Imprimir"]                                    │
│    → Abre editor de pré-visualização                     │
│    → Calcula fonte ótima para cada página               │
│    → Usa busca binária para melhor encaixe              │
│    → Imprime múltiplas páginas A4                       │
│    → Cada seção em cor diferente                        │
└──────────────────────────────────────────────────────────┘
```

---

## 6. FLUXO DE LISTA DE COMPRAS

```
┌────────────────────────────────────────────────────┐
│ 1. ACESSAR: /programacao → "Lista de Compras"     │
└────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────┐
│ 2. SELECIONAR MODO                                 │
│    ○ Semana Inteira (5 dias)                      │
│    ○ Dia Selecionado                              │
└────────────────────────────────────────────────────┘
                        │
            ┌───────────┴──────────┐
            │                      │
            ▼                      ▼
    ┌──────────────┐        ┌──────────────┐
    │SEMANA INTEIRA│        │DIA ESPECÍFICO│
    └──────────────┘        └──────────────┘
            │                      │
            └──────────┬───────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│ 3. SELECIONAR SEMANA                               │
│    Semana: [◀ 45 ▶]  2025-01-06 ~ 2025-01-10      │
└────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────┐
│ 4. CARREGAR PEDIDOS DA SEMANA                      │
│    [Busca no Firebase: Order collection]           │
│    - week_number = 45                              │
│    - year = 2025                                   │
│    - Filtra por dia (se em modo "dia específico")  │
└────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────┐
│ 5. CONSOLIDAR INGREDIENTES                         │
│    Para cada receita em cada pedido:               │
│    - Extrai todos os ingredientes                  │
│    - Multiplica: qtd_pedido × peso_receita        │
│    - Soma por ingrediente                          │
│    - Agrupa por categoria                          │
│    - Ordena alfabeticamente                        │
└────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│ 6. EXIBIR TABELA                                       │
│                                                        │
│ RESUMO:                                                │
│ ├─ 24 ingredientes únicos                              │
│ ├─ 8 categorias                                        │
│ └─ 125,45 kg peso total                                │
│                                                        │
│ TABELA DETALHADA:                                      │
│                                                        │
│ CARNES E AVES                                          │
│ ┌──────────────────┬────────┬────────┬─────────────┐   │
│ │ Ingrediente      │ Qtd    │ Unidade│ Peso (kg)   │   │
│ ├──────────────────┼────────┼────────┼─────────────┤   │
│ │ Frango Peito     │ 8.500  │ kg     │ 8.500       │   │
│ │ Peixe Inteiro    │ 5.250  │ kg     │ 5.250       │   │
│ │ Camarão          │ 3.750  │ kg     │ 3.750       │   │
│ │ Carne Vermelha   │ 12.000 │ kg     │ 12.000      │   │
│ └──────────────────┴────────┴────────┴─────────────┘   │
│                                                        │
│ VEGETAIS                                               │
│ ┌──────────────────┬────────┬────────┬─────────────┐   │
│ │ Alface           │ 6.250  │ kg     │ 6.250       │   │
│ │ Cenoura          │ 8.500  │ kg     │ 8.500       │   │
│ │ Batata           │ 15.000 │ kg     │ 15.000      │   │
│ │ Beterraba        │ 4.250  │ kg     │ 4.250       │   │
│ └──────────────────┴────────┴────────┴─────────────┘   │
│                                                        │
│ GRÃOS E CEREAIS                                        │
│ ┌──────────────────┬────────┬────────┬─────────────┐   │
│ │ Arroz Branco     │ 22.500 │ kg     │ 22.500      │   │
│ │ Aveia            │ 5.000  │ kg     │ 5.000       │   │
│ └──────────────────┴────────┴────────┴─────────────┘   │
│                                                        │
│ ... (outras categorias)                                │
└────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────┐
│ 7. IMPRIMIR OU EXPORTAR                            │
│    ✓ Imprimir (Ctrl+P)                            │
│    ✓ Exportar para Excel/PDF (em desenvolvimento) │
└────────────────────────────────────────────────────┘
```

---

## 7. FLUXO DE CÁLCULOS (recipeCalculator.js)

```
┌─────────────────────────────────────────────────────┐
│ ENTRADA: Preparação com Ingredientes                │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ PASSO 1: Para cada Ingrediente                      │
│                                                     │
│ Ingredient {                                        │
│   weight_frozen: 2.0,                               │
│   weight_thawed: 1.95,                              │
│   weight_clean: 1.80,                               │
│   weight_cooked: 1.20,                              │
│   price_per_kg_bruto: 8.50                          │
│ }                                                   │
│                                                     │
│ Calcular:                                           │
│ ├─ initialWeight = 2.0 kg (frozen)                 │
│ ├─ finalWeight = 1.20 kg (cooked)                  │
│ ├─ loss = (2.0 - 1.20) / 2.0 = 40%                 │
│ ├─ yield = 1.20 / 2.0 = 60%                        │
│ └─ cost = 2.0 × 8.50 = R$ 17.00                    │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ PASSO 2: Somar todos os ingredientes da preparação │
│                                                     │
│ Preparation {                                       │
│   totalRawWeight = 2.0 + 0.1 = 2.1 kg              │
│   totalYieldWeight = 1.2 + 0.1 = 1.3 kg            │
│   totalCost = 17.00 + 2.50 = R$ 19.50              │
│   yieldPercentage = 1.3 / 2.1 = 61.9%              │
│ }                                                   │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ PASSO 3: Se há assembly_config                      │
│                                                     │
│ assembly_config {                                   │
│   units_quantity: 3      # 3 cubas/porções         │
│   container_type: "cuba-g"                          │
│ }                                                   │
│                                                     │
│ Aplicar multiplicador:                              │
│ ├─ yield_weight = 1.3 × 3 = 3.9 kg                 │
│ ├─ total_cost = 19.50 × 3 = R$ 58.50               │
│ └─ totalRawWeight = 2.1 × 3 = 6.3 kg               │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ PASSO 4: Somar TODAS as preparações                │
│                                                     │
│ Recipe {                                            │
│   total_weight = 6.3 kg (soma de todas prep)       │
│   yield_weight = 3.9 kg                             │
│   total_cost = R$ 58.50                             │
│   cost_per_kg_raw = 58.50 / 6.3 = R$ 9.29         │
│   cost_per_kg_yield = 58.50 / 3.9 = R$ 15.00      │
│   yield_percentage = 3.9 / 6.3 = 61.9%             │
│ }                                                   │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ SAÍDA: Receita com métricas calculadas              │
└─────────────────────────────────────────────────────┘
```

---

## 8. FLUXO DE CONVERSÃO CUBA-G

```
Input: quantity = 2.5, unitType = "cuba-g"
            │
            ▼
┌────────────────────────────────┐
│ convertQuantityForKitchen()    │
└────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ Separar em:                            │
│ ├─ integerPart = 2 (cubas G)          │
│ └─ decimalPart = 0.5 (meia cuba-g)    │
└────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ Processar integerPart:                 │
│ └─ resultado += "2 cubas G"            │
└────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────┐
│ Processar decimalPart:                         │
│ ├─ decimalPart = 0.5                          │
│ ├─ arredondar para padrão [0.25, 0.5, 0.75]   │
│ ├─ utiliza roundToNearestCubaP()              │
│ └─ rounded = 0.5 (igual)                      │
└────────────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────┐
│ Converter para cubas-p:                        │
│ ├─ cubasPValue = 0.5 × 2 = 1.0                │
│ ├─ 1.0 cuba-p = "1 cuba P"                    │
│ └─ resultado += " + 1 cuba P"                 │
└────────────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ Output: "2 cubas G + 1 cuba P"         │
└────────────────────────────────────────┘


Exemplos de conversão:
─────────────────────
0.3 cuba-g    → arredonda para 0.25 → ½ cuba P
0.5 cuba-g    → ½ cuba-g × 2 = 1 cuba P
0.75 cuba-g   → ¾ cuba-g × 2 = 1½ cuba P
1.0 cuba-g    → 1.0 cuba-g
1.5 cuba-g    → 1 cuba-g + 1 cuba P
2.0 cuba-g    → 2 cubas G
2.5 cuba-g    → 2 cubas G + 1 cuba P
```

---

## 9. SINCRONIZAÇÃO EM TEMPO REAL (Firebase Listeners)

```
┌──────────────────────────────────────┐
│ useProgramacaoRealtimeData Hook      │
└──────────────────────────────────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
 
SETUP 1:     SETUP 2:      SETUP 3:
Customers   Recipes       Orders
    │           │           │
    ├─ One      ├─ One      ├─ When week/year
    │  time     │  time     │  changes:
    │  setup    │  setup    │  - Clean old
    │           │           │  - Setup new
    ▼           ▼           ▼
Listen()    Listen()      Listen(
            Query())
    │           │           │
    └───────────┼───────────┘
                │
        ┌───────▼────────┐
        │                │
        ▼                ▼
    REAL-TIME        CALLBACK
    UPDATES          TRIGGERED
        │                │
        ├─ New data?    └─→ setState()
        │  → callback       │
        └──────────────────→ Re-render
                            │
                            ▼
                    UI ATUALIZADA
                    AUTOMATICAMENTE
```

---

## 10. ESTRUTURA DE ESTADO GLOBAL

```
useRecipeStore (Zustand/Context)
│
├─ recipeData {
│   name, category, prep_time,
│   total_weight, yield_weight, total_cost
│ }
│
├─ preparationsData [] {
│   title, processes, ingredients, sub_components
│ }
│
├─ Groups []
│
├─ Modals State {
│   isProcessCreatorOpen,
│   isIngredientSelectorOpen,
│   isPrintDialogOpen,
│   etc.
│ }
│
└─ Computed {
    calculateMetrics,
    calculateLoss,
    formatCurrency,
    etc.
  }


useOrderConsolidation (useMemo)
│
├─ ordersByCustomer []
├─ consolidateCustomerItems()
├─ statistics {
│   totalCustomers,
│   totalAmount,
│   totalMeals
│ }
└─ validateAmount()


useProgramacaoRealtimeData (Real-time)
│
├─ orders [] (escuta Firebase)
├─ recipes [] (escuta Firebase)
├─ customers [] (escuta Firebase)
├─ currentDate
├─ weekDays []
└─ navigateWeek()
```

---

**Diagrama Final: Fluxo Total do Sistema**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          COZINHA AFETO                                   │
│                         Fluxo Total                                      │
└─────────────────────────────────────────────────────────────────────────┘

RECEITA                CARDÁPIO               CLIENTE              PRODUÇÃO
   │                     │                       │                   │
   ├─ Criar Receita      │                       │                   │
   │  (ficha-tecnica)    │                       │                   │
   │    ├─ Preparações   │                       │                   │
   │    ├─ Ingredientes  │                       │                   │
   │    ├─ Cálculos      │                       │                   │
   │    └─ Salvar        │                       │                   │
   │         │           │                       │                   │
   │         └──────────→├─ Configurar Menu     │                   │
   │                     │  (cardapio config)    │                   │
   │                     │   ├─ Receitas         │                   │
   │                     │   ├─ Preços           │                   │
   │                     │   ├─ Localizações     │                   │
   │                     │   └─ Salvar           │                   │
   │                     │        │              │                   │
   │                     │        └─────────────→├─ Ver Cardápio    │
   │                     │                       │  (portal)         │
   │                     │                       │  ├─ Selecionar   │
   │                     │                       │  ├─ Pedidos      │
   │                     │                       │  └─ Salvar       │
   │                     │                       │       │           │
   │                     │                       │       └──────────→├─ Consolidação
   │                     │                       │                   │ (programacao)
   │                     │                       │                   │ ├─ Por Empresa
   │                     │                       │                   │ ├─ Salada
   │                     │                       │                   │ ├─ Açougue
   │                     │                       │                   │ ├─ Embalagem
   │                     │                       │                   │ └─ Imprimir
   │                     │                       │                   │
   └─────────────────────┴───────────────────────┴──────────────────→├─ Lista Compras
                                                                      │ (programacao)
                                                                      │ ├─ Ingredientes
                                                                      │ ├─ Consolidados
                                                                      │ └─ Imprimir

                        FIREBASE FIRESTORE
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
    Recipe           Order          Customer    Ingredient
  Collections      Collections     Collections  Collections
```

