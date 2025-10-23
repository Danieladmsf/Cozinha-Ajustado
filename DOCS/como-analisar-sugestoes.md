# 🔍 Como Analisar Sugestões de Pedidos

## 📋 Script de Debug

Criamos um script especial que extrai e analisa todas as sugestões para um cliente específico.

**Localização:** `/lib/debug-suggestions.js`

---

## 🚀 Como Usar

### Método 1: Via linha de comando

```bash
node lib/debug-suggestions.js <customer_id> [meals_expected]
```

**Exemplos:**
```bash
# Análise com 100 refeições (padrão)
node lib/debug-suggestions.js abc123

# Análise com 150 refeições
node lib/debug-suggestions.js abc123 150
```

---

## 📄 O que o Script Gera

O script cria um arquivo `.txt` com:

### 1. **Informações Básicas**
- ID do cliente
- Data da análise
- Número de refeições esperadas

### 2. **Histórico de Pedidos**
- Todos os pedidos das últimas 8 semanas
- Data, semana, ano, dia da semana
- Número de refeições de cada pedido
- Quantidade de itens

### 3. **Análise por Receita**
Para cada receita no histórico:

#### a) Amostras Históricas
```
1. Semana 42/2024
   - Base Quantity: 4.0
   - Adjustment: 20%
   - Final Quantity: 4.8
   - Refeições: 100
   - Ratio/Refeição: 0.0480
```

#### b) Estatísticas Calculadas
```
- Média Base Quantity: 4.5
- Média Adjustment %: 18
- Média Ratio/Refeição: 0.0520
- Confiança: 75%
```

#### c) Cálculo da Sugestão
```
1. Calculado: 0.0520 × 100 = 5.2000
2. Arredondado: 5.25
3. Validação: 5.25 / 4.5 = 1.17
   ✅ Dentro do esperado (40%-250%)

╰─ Sugestão Final: 5.25 cuba-g
```

### 4. **Resumo Final**
- Total de receitas analisadas
- Receitas com alta confiança (≥70%)
- Receitas com baixa confiança (<25%)
- Receitas com possíveis problemas

---

## 🎯 Como Interpretar os Resultados

### ✅ Sugestão Boa
```
Calculado: 0.0480 × 110 = 5.28
Arredondado: 5.25
Validação: 5.25 / 5.0 = 1.05
✅ Dentro do esperado (40%-250%)
```
**Interpretação:** Sugestão está 5% acima da média histórica. Normal!

---

### ⚠️ Sugestão Baixa
```
Calculado: 0.0200 × 110 = 2.20
Arredondado: 2.25
Validação: 2.25 / 5.0 = 0.45
⚠️  Muito baixo (< 40%) → Usar média: 5.0
```
**Interpretação:** Algo está errado! Sugestão é apenas 45% da média. Sistema usará 5.0.

---

### ⚠️ Sugestão Alta
```
Calculado: 0.1200 × 110 = 13.20
Arredondado: 13.25
Validação: 13.25 / 5.0 = 2.65
⚠️  Muito alto (> 250%) → Usar média: 5.0
```
**Interpretação:** Sugestão é 265% da média. Muito alto! Sistema usará 5.0.

---

### ⚠️ Baixa Confiança
```
Amostras: 2 total, 2 recentes
Confiança: 50%
```
**Interpretação:** Menos de 4 amostras. Sugestão pode não ser confiável.

---

## 🔍 Checklist de Validação

Use este checklist para verificar se as sugestões estão corretas:

### 1. **Quantidade de Amostras**
- [ ] Pelo menos 4 amostras?
- [ ] Amostras recentes (últimas 4 semanas)?

### 2. **Ratio por Refeição**
- [ ] Ratio faz sentido? (ex: 0.05 = 5% de uma cuba por refeição)
- [ ] Ratios consistentes entre amostras?

### 3. **Cálculo de Sugestão**
- [ ] `Ratio × Refeições` está correto?
- [ ] Arredondamento para múltiplos de 0.25?

### 4. **Validação de Sanidade**
- [ ] Sugestão entre 40% e 250% da média?
- [ ] Se não, sistema está usando média?

### 5. **Ajuste de Porcionamento (Carnes)**
- [ ] `Final Quantity` inclui ajuste?
- [ ] Ratio calculado com `quantity` (não `base_quantity`)?

---

## 📊 Exemplo Real

### Cenário: Arroz Branco

```
━━━ Arroz Branco ━━━
Recipe ID: recipe123
Categoria: Padrão
Unidade: cuba-g

Amostras (5 total, 4 recentes):
  1. Semana 42/2024 (2024-10-14)
     - Base Quantity: 4.0
     - Adjustment: 0%
     - Final Quantity: 4.0
     - Refeições: 100
     - Ratio/Refeição: 0.0400

  2. Semana 43/2024 (2024-10-21)
     - Base Quantity: 4.5
     - Adjustment: 0%
     - Final Quantity: 4.5
     - Refeições: 110
     - Ratio/Refeição: 0.0409

  3. Semana 44/2024 (2024-10-28)
     - Base Quantity: 5.0
     - Adjustment: 0%
     - Final Quantity: 5.0
     - Refeições: 120
     - Ratio/Refeição: 0.0417

  4. Semana 45/2024 (2024-11-04)
     - Base Quantity: 5.0
     - Adjustment: 0%
     - Final Quantity: 5.0
     - Refeições: 115
     - Ratio/Refeição: 0.0435

Estatísticas Calculadas:
  - Média Base Quantity: 4.65
  - Média Adjustment %: 0
  - Média Ratio/Refeição: 0.0420
  - Confiança: 100%

Cálculo da Sugestão (para 100 refeições):
  1. Calculado: 0.0420 × 100 = 4.2000
  2. Arredondado: 4.25
  3. Validação: 4.25 / 4.65 = 0.91
     ✅ Dentro do esperado (40%-250%)

╰─ Sugestão Final: 4.25 cuba-g
```

**Análise:**
- ✅ 4 amostras recentes
- ✅ Confiança 100%
- ✅ Ratio consistente (~0.04)
- ✅ Sugestão 4.25 está 91% da média (4.65)
- ✅ Tudo correto!

---

## 🛠️ Troubleshooting

### Problema: "Nenhum pedido histórico encontrado"
**Solução:** Verifique se o `customer_id` está correto e se existem pedidos no banco.

### Problema: "Sugestão muito baixa"
**Causas possíveis:**
1. Pedidos antigos com valores muito baixos puxando média para baixo
2. Erro no cálculo de ratio (usando `base_quantity` ao invés de `quantity`)
3. Refeições esperadas muito diferentes do histórico

### Problema: "Baixa confiança"
**Solução:** Cliente precisa fazer mais pedidos (pelo menos 4) para aumentar confiança.

---

## 📝 Arquivo de Saída

O arquivo será salvo como:
```
suggestion-analysis-<customer_id>-<timestamp>.txt
```

Exemplo:
```
suggestion-analysis-abc123-2025-10-22T14-30-00-000Z.txt
```

---

**Criado em:** 2025-10-22
**Versão:** 1.0
