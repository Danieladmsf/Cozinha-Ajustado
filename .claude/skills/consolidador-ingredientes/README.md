# Consolidador de Ingredientes - Guia Rápido

## O que é?

Esta skill automatiza a consolidação de ingredientes duplicados no sistema Cozinha Afeto de forma segura e auditável.

## Análise Completa Disponível

Antes de usar esta skill, revise os relatórios completos em:
- `/tmp/RELATORIO_DUPLICADOS.txt` - Relatório detalhado
- `/tmp/PLANO_ACAO_CONSOLIDACAO.txt` - Plano de ação
- `/tmp/DUPLICADOS_JSON.json` - Dados estruturados

## Comandos Disponíveis

### Análise (Somente Leitura)
```
"analise o grupo Cebola"
"mostre detalhes do grupo Sal Refinado"
"quais receitas usam o ingrediente [ID]"
```

### Simulação (Dry-Run)
```
"simule a consolidação de Azeite Extra Virgem"
"simule remover ingredientes não utilizados"
"o que aconteceria se consolidar Cebola?"
```

### Execução (MODIFICAÇÃO REAL)
```
"consolide o grupo Sal Refinado"
"migre receitas de [ID_ORIGEM] para [ID_DESTINO]"
"remova ingredientes não utilizados do grupo Ketchup"
```

### Validação
```
"valide a integridade das consolidações"
"verifique se há erros nas migrações"
"mostre o log de auditoria"
```

## Fluxo Recomendado

### 1. Começar pelos Grupos de Baixa Prioridade
Teste com grupos pequenos para ganhar confiança:
```
"analise o grupo Quinoa"
"simule a consolidação de Quinoa"
"consolide o grupo Quinoa"
```

### 2. Remover Ingredientes Não Utilizados
Operação mais segura (0 receitas afetadas):
```
"remova ingredientes não utilizados do grupo Ketchup"
"remova ingredientes não utilizados do grupo Peito de Frango"
```

### 3. Grupos de Prioridade Média
```
"consolide o grupo Creme de leite"
"consolide o grupo Parmesão"
```

### 4. Grupos de Alta Prioridade
Atenção redobrada - muitas receitas afetadas:
```
"consolide o grupo Sal Refinado"  # 53 receitas
"consolide o grupo Páprica Doce"  # 34 receitas
```

### 5. Grupos Críticos
MÁXIMA ATENÇÃO - centenas de receitas:
```
"consolide o grupo Azeite Extra Virgem"  # 80 receitas
"consolide o grupo Cebola"  # 165 receitas
```

## Níveis de Prioridade

### 🔴 CRÍTICA (fazer por último, com máximo cuidado)
- **Cebola** - 165 receitas
- **Azeite Extra Virgem** - 80 receitas

### 🟠 ALTA (fazer depois das médias)
- **Sal Refinado** - 53 receitas
- **Páprica Doce** - 34 receitas

### 🟡 MÉDIA (fazer depois das baixas)
- Creme de leite (26 receitas)
- Açúcar Cristal (19 receitas)
- Couve-flor (16 receitas)
- Vinagre (15 receitas)
- Extrato de Tomate (12 receitas)
- Parmesão (11 receitas)

### 🟢 BAIXA (começar por aqui!)
- Todos os outros grupos (≤ 9 receitas)

### ⚪ SEM USO (remover diretamente)
- Peito de Frango (0 receitas) - 3 IDs
- Ketchup (0 receitas) - 2 IDs
- Pão francês (0 receitas) - 2 IDs

## Segurança

### ✅ Proteções Automáticas
- Confirma antes de modificar
- Faz backup automático
- Valida após cada operação
- Registra tudo em log
- Não remove ingredientes em uso

### ⚠️ O que VOCÊ deve fazer
- Revisar os relatórios antes
- Começar pelos grupos pequenos
- Fazer backup manual do banco antes de grupos críticos
- Validar algumas receitas manualmente após consolidações grandes
- Manter os logs salvos

## Casos Especiais

### ⚠️ Couve-flor
ID `684bfe28943203651ae5a925` precisa verificação manual!
```
"verifique o ingrediente 684bfe28943203651ae5a925"
```

### ⚠️ Quinoa
ID `ewrfewfwefewf` é inválido - remover sem medo

### ⚠️ Pão francês
IDs estão concatenados - verificar antes

## Logs e Auditoria

Todos os logs são salvos em:
- `/tmp/migration_log.txt` - Log de todas migrações
- `/tmp/consolidation_errors.log` - Erros encontrados
- `/tmp/backup_[ID].json` - Backups individuais

## Exemplo de Uso Completo

```
1. Usuário: "analise o grupo Mostarda"
   → Skill mostra: 9 receitas, 1 ID em uso, 2 IDs não utilizados

2. Usuário: "simule a consolidação de Mostarda"
   → Skill mostra: nenhuma migração necessária, apenas remover 2 IDs

3. Usuário: "consolide o grupo Mostarda"
   → Skill executa: remove 2 IDs não utilizados, gera log

4. Usuário: "valide a consolidação de Mostarda"
   → Skill confirma: consolidação bem-sucedida, 9 receitas intactas
```

## Estatísticas do Projeto

- **Total de ingredientes**: 241
- **Ingredientes únicos**: 208
- **Duplicados a eliminar**: 33
- **Grupos a consolidar**: 25
- **Receitas impactadas**: 474

## Contato

Para dúvidas ou problemas durante a consolidação, consulte:
- Relatório: `/tmp/RELATORIO_DUPLICADOS.txt`
- Plano: `/tmp/PLANO_ACAO_CONSOLIDACAO.txt`
- JSON: `/tmp/DUPLICADOS_JSON.json`

---

**LEMBRE-SE**: Operações de consolidação são IRREVERSÍVEIS após executadas e salvas na API!
