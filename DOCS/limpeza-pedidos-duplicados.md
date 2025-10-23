# 🧹 Limpeza de Pedidos Duplicados no Firestore

## 📋 Resumo

Script seguro para remover pedidos duplicados do banco de dados, mantendo apenas o registro mais recente de cada cliente por dia.

## 🔴 ATENÇÃO

**Este script deleta dados permanentemente do Firestore!**

- ✅ Sempre execute em modo **simulação** primeiro
- ✅ Verifique o relatório antes de executar
- ✅ Um backup automático é criado antes da exclusão
- ⚠️ Operação é **irreversível** após executar

## 🎯 O que o Script Faz

### Identifica Duplicados

Agrupa pedidos por:
- `customer_name` (nome do cliente)
- `day_of_week` (dia da semana)
- `week_number` (número da semana)
- `year` (ano)

### Mantém Apenas o Mais Recente

Critérios de seleção (em ordem de prioridade):
1. **`updated_at`** - data de atualização (se disponível)
2. **`id`** - ID do documento (maior = mais recente)

### Remove Duplicados Antigos

Deleta todos os pedidos duplicados **exceto** o mais recente.

## 📖 Como Usar

### 1️⃣ Primeiro: Simular (Dry Run)

**SEMPRE comece testando em modo simulação!**

```bash
cd /home/user/studio
node SCRIPTS/cleanup-duplicate-orders.js --dry-run
```

**O que acontece:**
- ✅ Mostra relatório detalhado de duplicados
- ✅ Mostra quais pedidos seriam deletados
- ✅ **NÃO deleta nada** do banco

**Exemplo de saída:**
```
🔍 Buscando pedidos duplicados...
📊 Total de pedidos no banco: 145

📋 RELATÓRIO DE DUPLICADOS:

🏢 Cliente: Faap
📅 Dia: 2 | Semana: 43 | Ano: 2025
📦 Total de pedidos: 5
────────────────────────────────────────────
  1. ❌ DELETAR
     ID: abc123
     Items: 12
     Updated: 2025-10-20T10:00:00
  2. ❌ DELETAR
     ID: abc124
     Items: 12
     Updated: 2025-10-21T11:00:00
  3. ❌ DELETAR
     ID: abc125
     Items: 12
     Updated: 2025-10-22T12:00:00
  4. ❌ DELETAR
     ID: abc126
     Items: 12
     Updated: 2025-10-22T14:00:00
  5. ✅ MANTER
     ID: abc127
     Items: 12
     Updated: 2025-10-23T09:00:00

📊 RESUMO:
   Pedidos a manter: 1 ✅
   Pedidos a deletar: 4 ❌

🔵 MODO SIMULAÇÃO - Nenhum pedido foi deletado
```

### 2️⃣ Verificar o Relatório

**Revise cuidadosamente:**
- ✅ Número de duplicados encontrados
- ✅ Quais pedidos serão mantidos (✅ MANTER)
- ✅ Quais pedidos serão deletados (❌ DELETAR)
- ✅ Se o pedido mais recente está marcado para manter

### 3️⃣ Executar Limpeza Real

**Somente depois de confirmar o relatório:**

```bash
node SCRIPTS/cleanup-duplicate-orders.js --execute
```

**O que acontece:**
1. Mostra o mesmo relatório
2. **Pede confirmação** (digite `SIM`)
3. Cria **backup automático** em `SCRIPTS/backup-orders-deleted-*.json`
4. **Deleta** os pedidos duplicados
5. Mostra resumo final

**Exemplo de saída:**
```
🔴 MODO: EXECUÇÃO REAL
   ⚠️  Pedidos serão permanentemente deletados!

[... relatório ...]

⚠️  ATENÇÃO: Esta ação é IRREVERSÍVEL!
⚠️  Um backup será criado antes da exclusão.

Tem certeza que deseja deletar estes pedidos? (digite 'SIM' para confirmar): SIM

📦 Backup salvo em: SCRIPTS/backup-orders-deleted-2025-10-23T17-30-00.json

🗑️  Deletando pedidos...
   ✓ Deletado: Faap - abc123
   ✓ Deletado: Faap - abc124
   ✓ Deletado: Faap - abc125
   ✓ Deletado: Faap - abc126

✅ 4 pedidos deletados com sucesso!
```

## 🔧 Opções do Script

| Opção | Descrição |
|-------|-----------|
| `--dry-run` | Modo simulação (não deleta nada) ✅ RECOMENDADO |
| `--execute` | Modo execução real (deleta permanentemente) ⚠️ |

## 📦 Backup Automático

Antes de deletar, o script cria um backup JSON com:
- ID do pedido deletado
- Nome do cliente
- Dia, semana, ano
- Datas de criação/atualização
- Número de itens

**Localização:** `SCRIPTS/backup-orders-deleted-[timestamp].json`

## ⚠️ Casos Especiais

### Se não encontrar duplicados:
```
✅ Nenhum pedido duplicado encontrado!
```

### Se cancelar a execução:
```
Tem certeza que deseja deletar estes pedidos? (digite 'SIM' para confirmar): nao
❌ Operação cancelada pelo usuário.
```

### Se houver erro ao deletar:
```
✗ Erro ao deletar abc123: Permission denied
```

## 🧪 Testando

### 1. Verificar duplicados atuais:
```bash
node SCRIPTS/cleanup-duplicate-orders.js --dry-run
```

### 2. Verificar logs no console do código:
Os logs adicionados anteriormente devem desaparecer após a limpeza:
```javascript
// Antes: Faap: 5 pedidos
// Depois: Faap: 1 pedido ✅
```

### 3. Verificar interface:
Após limpeza, recarregar `/programacao` e verificar:
- FAAP Bife Acebolado: **104 unid.** (não 488) ✅

## 🔄 Restaurar Backup (se necessário)

Se precisar restaurar pedidos deletados:

```bash
# Ver backup
cat SCRIPTS/backup-orders-deleted-2025-10-23T17-30-00.json

# Script de restauração (criar se necessário)
# node SCRIPTS/restore-orders-from-backup.js backup-orders-deleted-*.json
```

## 📝 Logs e Diagnóstico

O script mostra informações detalhadas:
- Número total de pedidos
- Grupos de duplicados por cliente/dia
- ID de cada pedido
- Data de atualização
- Número de itens em cada pedido

## ⚡ Performance

- **Tempo estimado:** ~5-10 segundos para 150 pedidos
- **Operações:** Leitura completa + Deleções individuais
- **Network:** Depende da conexão com Firestore

## 🛡️ Segurança

- ✅ Modo dry-run padrão
- ✅ Confirmação manual obrigatória
- ✅ Backup automático antes de deletar
- ✅ Logs detalhados de cada operação
- ✅ Tratamento de erros

## ❓ FAQ

### Por que há pedidos duplicados?

Podem ocorrer quando:
1. Cliente edita o pedido múltiplas vezes
2. Sistema cria nova versão ao invés de atualizar
3. Bugs em versões antigas do código

### O script pode deletar o pedido errado?

Não, se:
- ✅ Sempre executa em dry-run primeiro
- ✅ Revisa o relatório antes de confirmar
- ✅ Critério de seleção está correto (mais recente)

### E se eu cancelar no meio?

- Até confirmar com "SIM", nada é deletado
- Após iniciar deleção, ele continua até o fim
- Backup é criado antes de iniciar deleções

### Preciso fazer backup manual?

Não necessário, o script cria backup automático.
Mas se quiser segurança extra:
```bash
# Exportar todos os pedidos
firebase firestore:export gs://backup-bucket/orders-backup
```

## 🎯 Próximos Passos Recomendados

Após limpar duplicados:

1. ✅ **Recarregar interface** - verificar se consolidação está correta
2. ✅ **Aplicar correção em outras tabs** (Salada, Cozinha, etc.)
3. ✅ **Prevenir duplicados futuros**:
   - Usar `setDoc()` ao invés de `addDoc()`
   - Adicionar índice único no Firestore
   - Marcar pedidos antigos como `archived: true`

---

**Criado:** 2025-10-23
**Versão:** 1.0
**Status:** ✅ Pronto para uso
**Autor:** Claude Code
