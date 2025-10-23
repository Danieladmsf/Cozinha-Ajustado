# 🔄 Atualização em Massa de Fichas Técnicas

## 📋 Resumo

Script para forçar a atualização de todas (ou de uma específica) fichas técnicas no Firestore. Isso força o recálculo de campos calculados como pesos, custos, rendimentos, etc.

## 🎯 Quando Usar

Use este script quando:
- ✅ Alterar a lógica de cálculo de peso/custo no sistema
- ✅ Adicionar novos campos calculados nas fichas
- ✅ Corrigir inconsistências em dados calculados
- ✅ Atualizar preços de ingredientes em lote
- ✅ Forçar recálculo após mudanças no banco de dados

## 📖 Como Usar

### 1️⃣ Primeiro: Simular (Dry Run)

**SEMPRE comece testando em modo simulação!**

```bash
cd /home/user/studio
node SCRIPTS/update-all-recipes.js --dry-run
```

**O que acontece:**
- ✅ Mostra relatório detalhado de todas as receitas
- ✅ Mostra quantas receitas serão atualizadas
- ✅ **NÃO atualiza nada** no banco

**Exemplo de saída:**
```
🔍 Buscando receitas...
📊 Total de receitas encontradas: 45

📋 RELATÓRIO DE RECEITAS:

📂 CARNES: 8 receitas
────────────────────────────────────────────
  1. Strogonoff de Carne
     ID: abc123
     Preparações: 3
     Peso Total: ✅ 3.687 kg
  2. Bife Acebolado
     ID: def456
     Preparações: 2
     Peso Total: ✅ 2.5 kg

📂 SALADAS: 5 receitas
────────────────────────────────────────────
  1. S. Alface
     ID: ghi789
     Preparações: 1
     Peso Total: ✅ 1.2 kg

📊 RESUMO:
   Total de receitas: 45
   Categorias: 6
```

### 2️⃣ Executar Atualização de Todas as Receitas

**Somente depois de confirmar o relatório:**

```bash
node SCRIPTS/update-all-recipes.js --execute
```

**O que acontece:**
1. Mostra o mesmo relatório
2. **Pede confirmação** (digite `SIM`)
3. **Atualiza** todas as receitas no Firestore
4. Mostra resumo final

**Exemplo de saída:**
```
🔴 MODO: EXECUÇÃO REAL
   ⚠️  Receitas serão atualizadas no Firestore!

[... relatório ...]

⚠️  ATENÇÃO: Esta ação irá atualizar as receitas no banco!
⚠️  Isso vai forçar o recálculo de pesos, custos, etc.

Tem certeza que deseja atualizar estas receitas? (digite 'SIM' para confirmar): SIM

🔄 Atualizando receitas...
   ✓ Atualizado: Strogonoff de Carne
   ✓ Atualizado: Bife Acebolado
   ✓ Atualizado: S. Alface
   ... (mais 42 receitas)

✅ 45 receitas atualizadas com sucesso!
```

### 3️⃣ Atualizar Apenas Uma Receita Específica

Se você quiser atualizar apenas uma receita:

```bash
node SCRIPTS/update-all-recipes.js --execute --id=RECIPE_ID
```

**Exemplo:**
```bash
node SCRIPTS/update-all-recipes.js --execute --id=abc123
```

**O que acontece:**
- Busca apenas a receita com o ID especificado
- Mostra relatório dela
- Atualiza apenas essa receita

## 🔧 Opções do Script

| Opção | Descrição |
|-------|-----------|
| `--dry-run` | Modo simulação (não atualiza nada) ✅ RECOMENDADO |
| `--execute` | Modo execução real (atualiza permanentemente) ⚠️ |
| `--id=RECIPE_ID` | Atualizar apenas receita específica (opcional) |

## 📝 O Que o Script Faz Exatamente

O script:
1. **Conecta no Firestore** na coleção `Recipe`
2. **Busca** todas as receitas (ou apenas a especificada)
3. **Atualiza** o campo `updatedAt` de cada receita
4. Isso **aciona o recálculo** de todos os campos calculados no frontend

### Campos Que Serão Recalculados

Quando a receita é atualizada, o sistema automaticamente recalcula:
- ✅ **Peso Total (Bruto)** - soma dos pesos brutos de todos ingredientes
- ✅ **Peso Total (Rendimento)** - peso final após processamento
- ✅ **Custo por Kg (Bruto)** - custo baseado em peso bruto
- ✅ **Custo por Kg (Rendimento)** - custo baseado em rendimento
- ✅ **Peso da Cuba** - peso padrão de uma cuba
- ✅ **Custo da Cuba** - custo total de uma cuba
- ✅ **Peso de Porção** - peso de cada porção individual

## ⚠️ Casos Especiais

### Se não encontrar receitas:
```
⚠️  Nenhuma receita encontrada!
```

### Se cancelar a execução:
```
Tem certeza que deseja atualizar estas receitas? (digite 'SIM' para confirmar): nao
❌ Operação cancelada pelo usuário.
```

### Se houver erro ao atualizar:
```
✗ Erro ao atualizar abc123: Permission denied
⚠️  1 erros durante atualização
```

### Se especificar ID inexistente:
```
⚠️ Receita com ID "xyz999" não encontrada!
⚠️  Nenhuma receita encontrada!
```

## 🧪 Testando

### 1. Verificar antes e depois:
```bash
# ANTES: Ver relatório atual
node SCRIPTS/update-all-recipes.js --dry-run

# EXECUTAR: Atualizar
node SCRIPTS/update-all-recipes.js --execute

# DEPOIS: Verificar mudanças na interface
# Abrir /ficha-tecnica e verificar se os cálculos estão corretos
```

### 2. Testar com uma receita apenas:
```bash
# Simular atualização de uma receita
node SCRIPTS/update-all-recipes.js --dry-run --id=abc123

# Executar atualização
node SCRIPTS/update-all-recipes.js --execute --id=abc123
```

## 🔄 Diferença Entre Este Script e o Frontend

### Frontend (Interface):
- Recalcula campos quando você **edita** a receita
- Recalcula quando você **clica em "Salvar Ficha"**
- Funciona uma receita por vez

### Script (Automação):
- Recalcula **todas as receitas de uma vez**
- **Não precisa abrir** a interface
- Ideal para atualizações em **massa**

## 💡 Casos de Uso Reais

### Caso 1: Atualizar Preços de Ingredientes
```bash
# 1. Atualizar preços dos ingredientes manualmente na interface
# 2. Executar script para recalcular custos de todas as receitas
node SCRIPTS/update-all-recipes.js --execute
```

### Caso 2: Corrigir Problema em Peso Bruto
```bash
# Você corrigiu a lógica de cálculo de weight_raw no código
# Agora precisa forçar recálculo em todas as receitas
node SCRIPTS/update-all-recipes.js --execute
```

### Caso 3: Adicionar Novo Campo Calculado
```bash
# Você adicionou um novo campo "custo_por_porcao" na ficha
# Precisa calcular para todas as receitas existentes
node SCRIPTS/update-all-recipes.js --execute
```

### Caso 4: Atualizar Apenas Receitas de Carne
```bash
# Infelizmente o script não filtra por categoria ainda
# Você teria que:
# 1. Rodar dry-run
# 2. Anotar IDs das receitas de carne
# 3. Executar para cada ID:

node SCRIPTS/update-all-recipes.js --execute --id=strogonoff-id
node SCRIPTS/update-all-recipes.js --execute --id=bife-acebolado-id
```

## ⚡ Performance

- **Tempo estimado:** ~2-3 segundos por receita
- **45 receitas:** ~90-135 segundos (1,5 a 2 minutos)
- **100 receitas:** ~3-5 minutos

## 🛡️ Segurança

- ✅ Modo dry-run padrão
- ✅ Confirmação manual obrigatória
- ✅ Atualiza apenas `updatedAt` (não modifica dados estruturais)
- ✅ Logs detalhados de cada operação
- ✅ Tratamento de erros

## ❓ FAQ

### Por que atualizar todas as receitas?

Quando você muda a **lógica de cálculo** no código (por exemplo, correção na prioridade de `weight_frozen`), as receitas **já salvas** continuam com os valores antigos. Atualizar força o **recálculo** com a nova lógica.

### O script deleta algum dado?

**NÃO!** O script apenas atualiza o timestamp `updatedAt`. Todos os dados permanecem intactos.

### E se algo der errado?

- O script só atualiza timestamps, não modifica dados
- Se houver erro, ele mostra e continua com as próximas
- Você pode re-executar sem problemas

### Posso executar durante o horário de uso?

Sim, mas **recomenda-se** executar fora do horário de pico:
- ✅ Melhor: Durante a madrugada ou fim de semana
- ⚠️ Pode executar: Durante o dia, mas pode ser mais lento

### Preciso fazer backup manual?

Não é necessário, pois o script **não deleta nem modifica** dados estruturais. Mas se quiser segurança extra:
```bash
# Exportar todas as receitas (via Firebase CLI)
firebase firestore:export gs://backup-bucket/recipes-backup
```

## 🎯 Próximos Passos Recomendados

Após atualizar receitas:

1. ✅ **Verificar na interface** - abrir algumas receitas e confirmar cálculos
2. ✅ **Testar lista de compras** - verificar se pesos estão corretos
3. ✅ **Verificar programação** - confirmar consolidações

---

**Criado:** 2025-10-23
**Versão:** 1.0
**Status:** ✅ Pronto para uso
**Autor:** Claude Code
