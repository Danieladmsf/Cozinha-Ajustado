# Navegação por Dia na Lista de Compras

**Data:** 2025-10-23
**Funcionalidade:** Filtro por dia e modo semanal na Lista de Compras
**Status:** ✅ Implementado

---

## 🎯 Objetivo

Permitir que o usuário visualize a Lista de Compras de duas formas:
1. **Por dia específico**: Mostra apenas os ingredientes necessários para aquele dia
2. **Semana inteira**: Mostra todos os ingredientes da semana (comportamento anterior)

---

## 🔄 O Que Mudou

### Antes:
- ❌ Lista de compras sempre mostrava **TODOS** os ingredientes da semana
- ❌ Não havia como ver ingredientes de um dia específico
- ❌ Dias da semana eram apenas informativos (não clicáveis)
- ⚠️ Problema: Coxão duro mostrava 794 kg porque somava todos os dias

### Depois:
- ✅ **Toggle "Dia Selecionado / Semana Inteira"**
- ✅ **Dias da semana clicáveis** com feedback visual
- ✅ **Filtragem automática** por dia selecionado
- ✅ **Título dinâmico** mostra dia ou semana
- ✅ Valor correto de ingredientes por dia

---

## 📝 Arquivos Alterados

### 1. `/components/programacao/ListaComprasTabs.jsx`

**Mudanças:**
- ✅ Adicionado estado `selectedDay` (1-5)
- ✅ Adicionado estado `showWeekMode` (true/false)
- ✅ Criado toggle "Dia Selecionado / Semana Inteira"
- ✅ Dias da semana agora são botões clicáveis
- ✅ Estados passados para `IngredientesConsolidados`

**Código adicionado:**
```javascript
const [selectedDay, setSelectedDay] = useState(1);
const [showWeekMode, setShowWeekMode] = useState(true);

// Toggle entre modos
<Button onClick={() => setShowWeekMode(false)}>Dia Selecionado</Button>
<Button onClick={() => setShowWeekMode(true)}>Semana Inteira</Button>

// Dias clicáveis
<Button
  onClick={() => {
    setSelectedDay(day.dayNumber);
    setShowWeekMode(false);
  }}
  disabled={showWeekMode}
>
  {day.dayShort}
</Button>
```

### 2. `/components/programacao/lista-compras/IngredientesConsolidados.jsx`

**Mudanças:**
- ✅ Recebe props `selectedDay` e `showWeekMode`
- ✅ Filtra pedidos pelo dia quando `showWeekMode = false`
- ✅ Título dinâmico mostra dia ou semana

**Lógica de filtragem:**
```javascript
const filteredOrders = useMemo(() => {
  if (showWeekMode || !selectedDay) {
    return orders; // Modo semana: todos os pedidos
  }
  // Modo dia: filtrar pelo dia selecionado
  return orders.filter(order => order.day_of_week === selectedDay);
}, [orders, selectedDay, showWeekMode]);
```

**Título dinâmico:**
```javascript
{showWeekMode ? (
  `Resumo da Lista de Compras - Semana ${weekNumber}/${year}`
) : (
  `Resumo da Lista de Compras - ${dayName} (${fullDate})`
)}
```

### 3. `/components/programacao/tabs/PesoBrutoCalculator.jsx`

**Bug corrigido:**
- ❌ **Antes**: Substituía quantidades (`quantidade = value`)
- ✅ **Depois**: Soma quantidades (`quantidade += value`)

**Mudança:**
```javascript
// ANTES (ERRADO)
carnesConsolidadas[recipeName][customerName].quantidadePorcoes = quantity;
carnesConsolidadas[recipeName][customerName].pesoBrutoTotal = (quantity * pesoBrutoPorPorcao);

// DEPOIS (CORRETO)
carnesConsolidadas[recipeName][customerName].quantidadePorcoes += quantity;
carnesConsolidadas[recipeName][customerName].pesoBrutoTotal += (quantity * pesoBrutoPorPorcao);

// Arredondar para evitar problemas de precisão flutuante
carnesConsolidadas[recipeName][customerName].quantidadePorcoes =
  Math.round(carnesConsolidadas[recipeName][customerName].quantidadePorcoes * 100) / 100;
carnesConsolidadas[recipeName][customerName].pesoBrutoTotal =
  Math.round(carnesConsolidadas[recipeName][customerName].pesoBrutoTotal * 1000) / 1000;
```

---

## 🎨 Interface Visual

### Toggle de Modo
```
┌──────────────────┬──────────────────┐
│ Dia Selecionado  │ Semana Inteira   │
│   (verde ativo)  │   (cinza)        │
└──────────────────┴──────────────────┘
```

### Dias da Semana (Clicáveis)
```
Modo Semana (disabled, opacidade 60%):
┌────┬────┬────┬────┬────┐
│SEG │TER │QUA │QUI │SEX │
│1/10│2/10│3/10│4/10│5/10│
└────┴────┴────┴────┴────┘

Modo Dia (clicável, hover effect):
┌────┬────┬────┬────┬────┐
│SEG │TER │QUA │QUI │SEX │ ← Terça selecionada (verde)
│1/10│2/10│3/10│4/10│5/10│
└────┴────┴────┴────┴────┘
```

---

## 📊 Exemplo de Uso

### Cenário: Bife Acebolado na Semana

**Pedidos da semana:**
- Segunda: 15 unid
- Terça: 96 unid
- Quarta: 60 unid
- Quinta: 96 unid
- Sexta: 96 unid
- **Total**: 363 unidades

**Ingrediente: Coxão duro** (0.85 kg/porção)

#### Modo "Semana Inteira" ✅
```
Coxão duro: 363 unid × 0.85 kg = 308.55 kg
```

#### Modo "Dia Selecionado" (Terça) ✅
```
Coxão duro: 96 unid × 0.85 kg = 81.60 kg
```

---

## ✅ Benefícios

1. **Compras mais precisas**: Sabe exatamente o que comprar para cada dia
2. **Menos desperdício**: Não precisa comprar tudo de uma vez
3. **Melhor planejamento**: Pode fazer compras diárias ou semanais
4. **Interface intuitiva**: Toggle claro entre os modos
5. **Feedback visual**: Dia selecionado fica destacado em verde

---

## 🧪 Como Testar

### 1. Acesse: Lista de Compras
Navegue para `/programacao` e vá para a aba "Lista de Compras"

### 2. Modo Padrão (Semana Inteira)
- ✅ Ver o toggle "Semana Inteira" ativo (verde)
- ✅ Dias da semana desabilitados (opacidade 60%)
- ✅ Título: "Resumo da Lista de Compras - Semana XX/YYYY"
- ✅ Todos os ingredientes da semana aparecem

### 3. Alternar para Modo Dia
- ✅ Clicar em "Dia Selecionado" ou em qualquer dia da semana
- ✅ Toggle "Dia Selecionado" fica verde
- ✅ Dias da semana ficam clicáveis (hover effect)
- ✅ Dia selecionado fica destacado em verde

### 4. Verificar Filtragem
- ✅ Clicar em "Segunda-feira"
- ✅ Título muda para "Resumo da Lista de Compras - segunda-feira (01/10/2025)"
- ✅ Apenas ingredientes de pedidos da segunda aparecem
- ✅ Estatísticas (total ingredientes, peso) refletem apenas o dia

### 5. Voltar para Semana
- ✅ Clicar em "Semana Inteira"
- ✅ Lista volta a mostrar todos os ingredientes
- ✅ Dias ficam desabilitados novamente

---

## 📦 Estatísticas da Mudança

- **Linhas adicionadas**: ~93
- **Linhas removidas**: ~23
- **Arquivos alterados**: 3
- **Novos estados**: 2 (`selectedDay`, `showWeekMode`)
- **Bugs corrigidos**: 1 (soma de quantidades em PesoBrutoCalculator)

---

## 🔗 Relacionado

- Conversão de cuba-g: `/lib/cubaConversionUtils.js`
- Consolidador de ingredientes: `/components/programacao/lista-compras/utils/ingredientConsolidatorFixed.js`
- Remoção do botão formato: `remocao-botao-formato-cozinha.md`

---

## 💡 Nota Técnica

A filtragem é feita **antes** da consolidação de ingredientes, garantindo que:
1. Os pedidos são filtrados por `day_of_week === selectedDay`
2. A consolidação de ingredientes acontece **apenas** com os pedidos filtrados
3. Os multiplicadores são calculados corretamente para o dia
4. Não há sobrecarga de processamento (usa `useMemo`)

**Fluxo:**
```
orders → filteredOrders → consolidateIngredientsFromRecipes → ingredientesConsolidados
           ↑
      selectedDay
      showWeekMode
```

---

## 🐛 Bug Corrigido: PesoBrutoCalculator

**Problema anterior:**
- Quando um cliente tinha **múltiplos pedidos** do mesmo item no mesmo dia, apenas o último era contabilizado
- Exemplo: Cliente A pede 50 porções de Bife, depois mais 50 porções → mostrava apenas 50

**Solução:**
- Mudou de `quantidade = value` para `quantidade += value`
- Agora soma todas as quantidades corretamente
- Consistente com os outros tabs (Salada, Açougue, Cozinha)

---

## 🚀 Próximos Passos Possíveis

1. **Persistir preferência**: Salvar `showWeekMode` no localStorage
2. **Exportação por dia**: PDF/Excel apenas do dia selecionado
3. **Comparação de dias**: Ver diferenças entre dias da semana
4. **Sugestão automática**: "Dia com mais ingredientes: Quarta"
