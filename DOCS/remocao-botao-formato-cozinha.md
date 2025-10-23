# Remoção do Botão "Formato Cozinha" - Conversão Ativa por Padrão

**Data:** 2025-10-23
**Mudança:** Remoção do botão toggle e conversão sempre ativa
**Status:** ✅ Implementado

---

## 🎯 Objetivo

Remover o botão "Formato Cozinha / Formato Padrão" e deixar a conversão de quantidades **sempre ativa** em todas as abas de programação.

---

## 🔄 O Que Mudou

### Antes:
- ❌ Botão toggle em cada aba e no cabeçalho principal
- ❌ Usuário podia alternar entre dois formatos:
  - **Formato Padrão**: "2,5 cuba-g"
  - **Formato Cozinha**: "8,25 kg"
- ❌ Badge "Formato Cozinha" nos cards de clientes
- ❌ Preferência salva no localStorage

### Depois:
- ✅ **Sem botão** toggle (removido)
- ✅ **Sempre** mostra o formato convertido: "8,25 kg"
- ✅ Interface mais limpa
- ✅ Comportamento consistente

---

## 📝 Arquivos Alterados

### 1. `/components/programacao/ProgramacaoCozinhaTabs.jsx`

**Mudanças:**
- ❌ Removido `useState` e `localStorage` para `globalKitchenFormat`
- ✅ Fixado `const globalKitchenFormat = true`
- ❌ Removida função `toggleGlobalKitchenFormat()`
- ❌ Removido botão toggle do header
- ❌ Removida badge condicional "Formato Cozinha"
- ❌ Removido prop `toggleGlobalKitchenFormat` passado para abas

**Antes:**
```javascript
const [globalKitchenFormat, setGlobalKitchenFormat] = useState(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('programacao-global-kitchen-format');
    return saved === 'true';
  }
  return false;
});

const toggleGlobalKitchenFormat = () => {
  const newFormat = !globalKitchenFormat;
  setGlobalKitchenFormat(newFormat);
  localStorage.setItem('programacao-global-kitchen-format', newFormat.toString());
};

// Botão toggle
<Button onClick={toggleGlobalKitchenFormat}>
  {globalKitchenFormat ? "Formato Padrão" : "Formato Cozinha"}
</Button>
```

**Depois:**
```javascript
// Formato de cozinha sempre ativado (removido toggle)
const globalKitchenFormat = true;

// Sem botão toggle
```

### 2. `/components/programacao/tabs/SaladaTab.jsx`

**Mudanças:**
- ❌ Removido prop `toggleGlobalKitchenFormat`
- ❌ Removido botão toggle do header
- ✅ Mantido `globalKitchenFormat` (sempre `true`)

### 3. `/components/programacao/tabs/AcougueTab.jsx`

**Mudanças:**
- ❌ Removido prop `toggleGlobalKitchenFormat`
- ❌ Removido botão toggle do header
- ✅ Mantido `globalKitchenFormat` (sempre `true`)

### 4. `/components/programacao/tabs/CozinhaTab.jsx`

**Mudanças:**
- ❌ Removido prop `toggleGlobalKitchenFormat`
- ❌ Removido botão toggle do header
- ✅ Mantido `globalKitchenFormat` (sempre `true`)

### 5. `/components/programacao/tabs/EmbalagemTab.jsx`

**Mudanças:**
- ❌ Removido prop `toggleGlobalKitchenFormat`
- ❌ Removido botão toggle do header
- ✅ Mantido `globalKitchenFormat` (sempre `true`)

---

## 🔄 Como a Conversão Funciona Agora

### Função de Conversão (inalterada):
```javascript
export const formatQuantityForDisplay = (quantity, unitType, useKitchenFormat) => {
  if (useKitchenFormat && unitType?.toLowerCase() === 'cuba-g') {
    return convertQuantityForKitchen(quantity, unitType);
  } else {
    // Formato padrão
    const formattedQty = String(quantity).replace('.', ',');
    return `${formattedQty} ${unitType || 'cuba-g'}`;
  }
};
```

### Agora sempre chamada com `true`:
```javascript
formatQuantityDisplay(item) // usa globalKitchenFormat = true
```

---

## 📊 Exemplo de Conversão

### Receita: Arroz Branco
- **Input do pedido**: 2,5 cuba-g
- **Cuba weight da receita**: 3,3 kg

### Cálculo:
```javascript
2,5 cubas × 3,3 kg/cuba = 8,25 kg
```

### Resultado Exibido:
- ✅ **Sempre**: "8,25 kg"
- ❌ **Nunca mais**: "2,5 cuba-g"

---

## ✅ Benefícios

1. **Interface mais limpa**: Menos botões = menos confusão
2. **Comportamento consistente**: Sempre mostra kg (formato cozinha)
3. **Menos código**: Removidas 80+ linhas de código
4. **Sem localStorage**: Não salva preferências desnecessárias
5. **Mais intuitivo**: Cozinheiros trabalham com kg, não com "cubas"

---

## 🧪 Como Testar

1. **Acesse**: Programação de Produção
2. **Navegue pelas abas**:
   - Por Empresa
   - Salada
   - Açougue
   - Cozinha
   - Embalagem

3. **Verifique**:
   - ✅ **Não há mais** botão "Formato Cozinha" em nenhuma aba
   - ✅ **Todas as quantidades** aparecem em kg (quando aplicável)
   - ✅ Exemplo: "8,25 kg" em vez de "2,5 cuba-g"

---

## 📦 Estatísticas da Mudança

- **Linhas removidas**: ~80
- **Linhas adicionadas**: ~20
- **Arquivos alterados**: 5
- **Botões removidos**: 5 (1 no header + 4 nas abas)
- **Funções removidas**: 1 (`toggleGlobalKitchenFormat`)
- **Estados removidos**: 1 (`globalKitchenFormat` useState)

---

## 🔗 Relacionado

- Sistema de conversão: `/lib/cubaConversionUtils.js`
- Correção de parseamento: `correcao-abas-programacao.md`
- Lista de compras: `correcao-lista-compras-ingredientes.md`

---

## 💡 Nota Técnica

A função `convertQuantityForKitchen()` continua funcionando normalmente, mas agora é **sempre chamada** para items com `unit_type = 'cuba-g'`. Não há mais a opção de exibir no formato padrão.

**Conversão automática para:**
- `cuba-g` → kg (baseado em `cuba_weight` da receita)
- `kg` → kg (sem conversão)
- `unid.` → unidades (sem conversão)
- `porção` → porções (sem conversão)

**Apenas receitas do tipo `cuba-g` são convertidas para kg!**
