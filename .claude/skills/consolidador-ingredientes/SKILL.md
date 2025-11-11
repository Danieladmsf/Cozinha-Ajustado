# Consolidador de Ingredientes Duplicados

**Skill cirúrgica para consolidar ingredientes duplicados no sistema Cozinha Afeto**

## Objetivo
Consolidar ingredientes duplicados de forma segura, migrando receitas e removendo duplicatas sem perder dados.

## Contexto
O sistema possui 25 grupos de ingredientes duplicados, totalizando 33 IDs duplicados que afetam 474 receitas. Esta skill permite fazer a consolidação de forma controlada e auditável.

## Dados de Referência

Os dados completos estão em:
- `/tmp/DUPLICADOS_JSON.json` - Estrutura completa dos duplicados
- `/tmp/all_recipes.json` - Todas as receitas (formato: {data: {success: true, data: [...]}})
- `/tmp/all_ingredients.json` - Todos os ingredientes

### Estrutura de Receitas
```javascript
{
  "data": [
    {
      "id": "recipe_id",
      "name": "Nome da Receita",
      "preparations": [
        {
          "ingredients": [
            {
              "ingredient_id": "id_do_ingrediente",
              "name": "Nome do ingrediente",
              // outros campos...
            }
          ]
        }
      ]
    }
  ]
}
```

## Capacidades

### 1. Análise de Grupo Específico
Quando o usuário pedir para analisar um grupo específico:
- Busque os dados em `/tmp/DUPLICADOS_JSON.json`
- Mostre detalhes do grupo (IDs, receitas afetadas, prioridade)
- Liste todas as receitas que usam cada ID do grupo

### 2. Migração de Ingrediente (OPERAÇÃO CRÍTICA)
**MUITO IMPORTANTE: Esta operação modifica o banco de dados!**

Quando o usuário pedir para migrar um ingrediente:

#### Passo 1: Validação Pré-Migração
```bash
# 1. Confirmar com o usuário
echo "⚠️  OPERAÇÃO CRÍTICA: Migração de Ingrediente"
echo "Origem: [ID_ORIGEM]"
echo "Destino: [ID_DESTINO]"
echo "Receitas afetadas: [N]"
echo ""
echo "Deseja continuar? Esta ação é IRREVERSÍVEL após salvar."
```

#### Passo 2: Buscar Receitas Afetadas
```bash
jq --arg id_old "ID_ORIGEM" --arg id_new "ID_DESTINO" '
  [.data[] |
   select(.preparations[]?.ingredients[]?.ingredient_id == $id_old) |
   {
     id: .id,
     name: .name,
     preparations: [.preparations[] |
       {
         ingredients: [.ingredients[] |
           if .ingredient_id == $id_old then
             .ingredient_id = $id_new
           else
             .
           end
         ]
       }
     ]
   }
  ]
' /tmp/all_recipes.json > /tmp/recipes_to_update.json
```

#### Passo 3: Atualizar Cada Receita
Para cada receita em `/tmp/recipes_to_update.json`:
```bash
# Fazer backup da receita original
curl -s "https://cozinha-ajustado.vercel.app/api/recipes?id=[RECIPE_ID]" > /tmp/backup_[RECIPE_ID].json

# Atualizar receita
curl -X PUT "https://cozinha-ajustado.vercel.app/api/recipes?id=[RECIPE_ID]" \
  -H "Content-Type: application/json" \
  -d @/tmp/recipes_to_update.json
```

#### Passo 4: Validação Pós-Migração
```bash
# Verificar se a migração funcionou
curl -s "https://cozinha-ajustado.vercel.app/api/recipes?id=[RECIPE_ID]" | \
  jq '.preparations[]?.ingredients[]? | select(.ingredient_id == "[ID_DESTINO]")'
```

#### Passo 5: Log de Auditoria
```bash
cat >> /tmp/migration_log.txt << EOF
[$(date)] MIGRAÇÃO REALIZADA
- Grupo: [NOME_GRUPO]
- ID Origem: [ID_ORIGEM]
- ID Destino: [ID_DESTINO]
- Receitas migradas: [N]
- Status: [SUCESSO/FALHA]
EOF
```

### 3. Remoção de Ingrediente Não Utilizado
**IMPORTANTE: Só remover ingredientes com 0 receitas!**

Quando o usuário pedir para remover um ingrediente:

#### Validação
```bash
# 1. Verificar que não está em uso
count=$(jq --arg id "ID" '[.data[] | select(.preparations[]?.ingredients[]?.ingredient_id == $id)] | length' /tmp/all_recipes.json)

if [ "$count" -eq 0 ]; then
  echo "✅ Ingrediente não está em uso. Seguro para remover."
else
  echo "❌ ERRO: Ingrediente está em uso em $count receita(s). ABORTAR!"
  exit 1
fi

# 2. Fazer backup
curl -s "https://cozinha-ajustado.vercel.app/api/ingredients?id=[ID]" > /tmp/backup_ingredient_[ID].json

# 3. Remover
curl -X DELETE "https://cozinha-ajustado.vercel.app/api/ingredients?id=[ID]"
```

### 4. Consolidação Completa de Grupo
Quando o usuário pedir para consolidar um grupo completo:

```bash
# Processo em ordem:
# 1. Listar ações do grupo
# 2. Confirmar com usuário
# 3. Executar migrações (se houver)
# 4. Remover IDs não utilizados
# 5. Gerar relatório de consolidação
```

### 5. Validação de Integridade
Verificar se as consolidações não causaram problemas:

```bash
# Para cada receita modificada:
# 1. Verificar se ingredient_id existe nos ingredientes
# 2. Verificar se custos continuam calculados
# 3. Verificar se estrutura JSON está válida
```

## Modos de Operação

### Modo 1: Análise (Somente Leitura)
```
Usuário: "analise o grupo Cebola"
Skill: Mostra detalhes sem modificar nada
```

### Modo 2: Simulação (Dry-Run)
```
Usuário: "simule a consolidação de Cebola"
Skill: Mostra o que seria feito, sem executar
```

### Modo 3: Execução (Modificação Real)
```
Usuário: "consolide o grupo Cebola"
Skill: Executa as mudanças após confirmação
```

## Ordem de Prioridade Recomendada

1. **Crítica**: Cebola (165 receitas), Azeite Extra Virgem (80 receitas)
2. **Alta**: Sal Refinado (53 receitas), Páprica Doce (34 receitas)
3. **Média**: Creme de leite, Extrato de Tomate, Couve-flor, Parmesão, Vinagre, Açúcar Cristal
4. **Baixa**: Demais grupos
5. **Remoção Direta**: Grupos sem receitas (Peito de Frango, Ketchup, Pão francês)

## Proteções de Segurança

### Checklist Pré-Execução
- [ ] Backup do banco de dados foi feito?
- [ ] Usuário confirmou a operação?
- [ ] IDs de origem e destino estão corretos?
- [ ] Receitas afetadas foram identificadas?

### Checklist Pós-Execução
- [ ] Todas as receitas foram atualizadas?
- [ ] Validação de integridade passou?
- [ ] Log de auditoria foi criado?
- [ ] Usuário foi notificado do resultado?

## Comandos Úteis

### Buscar receitas que usam um ingrediente específico
```bash
jq --arg id "ID_INGREDIENTE" '
  [.data[] |
   select(.preparations[]?.ingredients[]?.ingredient_id == $id) |
   .name
  ]
' /tmp/all_recipes.json
```

### Contar uso de um ingrediente
```bash
jq --arg id "ID" '[.data[] | select(.preparations[]?.ingredients[]?.ingredient_id == $id)] | length' /tmp/all_recipes.json
```

### Ver dados de um grupo específico
```bash
jq --arg name "Cebola" '.grupos[] | select(.nome == $name)' /tmp/DUPLICADOS_JSON.json
```

## Formato de Resposta

Sempre use este formato ao executar operações:

```
═══════════════════════════════════════════════════════════════
CONSOLIDAÇÃO DE INGREDIENTE: [NOME]
═══════════════════════════════════════════════════════════════

📋 DETALHES:
- Grupo: [NOME]
- Prioridade: [CRÍTICA/ALTA/MÉDIA/BAIXA]
- ID a manter: [ID]
- IDs a remover: [ID1, ID2, ...]
- Receitas afetadas: [N]

⚙️  OPERAÇÕES REALIZADAS:
✓ [operação 1]
✓ [operação 2]
...

📊 RESULTADO:
- Receitas migradas: [N]
- Ingredientes removidos: [N]
- Erros: [N]

📄 LOG: /tmp/migration_log.txt
═══════════════════════════════════════════════════════════════
```

## Tratamento de Erros

### Se API retornar erro:
1. Salvar erro em `/tmp/consolidation_errors.log`
2. Fazer rollback se possível (usar backup)
3. Notificar usuário com detalhes
4. Não continuar com próximas operações

### Se ingrediente não existir:
1. Verificar se ID está correto
2. Verificar se já foi removido anteriormente
3. Sugerir atualizar cache (`/tmp/all_ingredients.json`)

### Se receita não puder ser atualizada:
1. Pular para próxima
2. Registrar no log
3. Continuar com outras receitas
4. Relatar falhas no final

## Observações Importantes

1. **SEMPRE** confirme com o usuário antes de modificar dados
2. **SEMPRE** faça backup antes de modificações
3. **NUNCA** remova ingredientes que estejam em uso
4. **SEMPRE** valide após cada operação
5. **SEMPRE** registre em log todas as ações

## Casos Especiais

### Grupo Couve-flor
⚠️ ID `684bfe28943203651ae5a925` precisa ser verificado manualmente antes da migração - pode não ser couve-flor!

### ID Inválido (Quinoa)
ID `ewrfewfwefewf` é inválido - remover diretamente sem validação extra.

### Grupos sem uso
Peito de Frango, Ketchup, Pão francês - todos IDs podem ser removidos diretamente.

---

**Uso da Skill:**
- "analise o grupo Cebola"
- "simule a consolidação de Azeite Extra Virgem"
- "consolide o grupo Sal Refinado"
- "remova ingredientes não utilizados do grupo Ketchup"
- "valide a integridade das consolidações"
