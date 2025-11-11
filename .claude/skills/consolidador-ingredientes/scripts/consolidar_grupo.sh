#!/bin/bash
# Script Template para Consolidação de Grupo de Ingredientes
# Este é um TEMPLATE - a skill deve customizar os valores antes de executar

set -e  # Parar em caso de erro

# ============================================================================
# CONFIGURAÇÃO (Será preenchido pela skill)
# ============================================================================
GRUPO_NOME="[NOME_DO_GRUPO]"
ID_MANTER="[ID_PRINCIPAL]"
IDS_MIGRAR="[ID1,ID2,ID3]"  # Separados por vírgula
IDS_REMOVER="[ID4,ID5]"     # Separados por vírgula
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="/tmp/consolidacao_logs"
BACKUP_DIR="/tmp/consolidacao_backups/${GRUPO_NOME}_${TIMESTAMP}"

# ============================================================================
# PREPARAÇÃO
# ============================================================================
echo "═══════════════════════════════════════════════════════════════"
echo "CONSOLIDAÇÃO DE INGREDIENTE: ${GRUPO_NOME}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Timestamp: ${TIMESTAMP}"
echo "ID a manter: ${ID_MANTER}"
echo "IDs a migrar: ${IDS_MIGRAR}"
echo "IDs a remover: ${IDS_REMOVER}"
echo ""

# Criar diretórios
mkdir -p "${LOG_DIR}"
mkdir -p "${BACKUP_DIR}"

# Arquivo de log
LOG_FILE="${LOG_DIR}/consolidacao_${GRUPO_NOME}_${TIMESTAMP}.log"
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "📋 Preparação completa"
echo "   Log: ${LOG_FILE}"
echo "   Backup: ${BACKUP_DIR}"
echo ""

# ============================================================================
# FASE 1: MIGRAÇÕES
# ============================================================================
if [ -n "${IDS_MIGRAR}" ] && [ "${IDS_MIGRAR}" != "" ]; then
    echo "⚙️  FASE 1: MIGRAÇÕES"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    IFS=',' read -ra MIGRAR_ARRAY <<< "${IDS_MIGRAR}"

    for ID_ORIGEM in "${MIGRAR_ARRAY[@]}"; do
        echo ""
        echo "🔄 Migrando: ${ID_ORIGEM} → ${ID_MANTER}"

        # Buscar receitas que usam este ID
        RECEITAS=$(jq -r --arg id "${ID_ORIGEM}" '
            [.data[] |
             select(.preparations[]?.ingredients[]?.ingredient_id == $id) |
             .id] |
            .[]
        ' /tmp/all_recipes.json)

        TOTAL_RECEITAS=$(echo "${RECEITAS}" | wc -l)
        echo "   Receitas encontradas: ${TOTAL_RECEITAS}"

        if [ "${TOTAL_RECEITAS}" -eq 0 ]; then
            echo "   ⚠️  Nenhuma receita encontrada, pulando migração"
            continue
        fi

        COUNT=0
        SUCESSO=0
        FALHA=0

        # Processar cada receita
        while IFS= read -r RECIPE_ID; do
            COUNT=$((COUNT + 1))
            echo "   [$COUNT/$TOTAL_RECEITAS] Processando: ${RECIPE_ID}"

            # Backup da receita
            curl -s "https://cozinha-ajustado.vercel.app/api/recipes?id=${RECIPE_ID}" \
                > "${BACKUP_DIR}/recipe_${RECIPE_ID}_original.json"

            # Buscar receita completa
            RECEITA_ATUAL=$(cat "${BACKUP_DIR}/recipe_${RECIPE_ID}_original.json")

            # Substituir ingredient_id nas preparations
            RECEITA_ATUALIZADA=$(echo "${RECEITA_ATUAL}" | jq --arg old "${ID_ORIGEM}" --arg new "${ID_MANTER}" '
                .preparations |= map(
                    .ingredients |= map(
                        if .ingredient_id == $old then
                            .ingredient_id = $new
                        else
                            .
                        end
                    )
                )
            ')

            # Salvar versão atualizada
            echo "${RECEITA_ATUALIZADA}" > "${BACKUP_DIR}/recipe_${RECIPE_ID}_updated.json"

            # Atualizar na API
            RESPONSE=$(curl -s -X PUT \
                "https://cozinha-ajustado.vercel.app/api/recipes?id=${RECIPE_ID}" \
                -H "Content-Type: application/json" \
                -d "${RECEITA_ATUALIZADA}")

            # Verificar resposta
            if echo "${RESPONSE}" | jq -e '.success == true' > /dev/null 2>&1; then
                echo "      ✅ Atualizado com sucesso"
                SUCESSO=$((SUCESSO + 1))
            else
                echo "      ❌ Erro ao atualizar"
                echo "${RESPONSE}" > "${BACKUP_DIR}/error_${RECIPE_ID}.json"
                FALHA=$((FALHA + 1))
            fi

        done <<< "${RECEITAS}"

        echo ""
        echo "   📊 Resultado da migração ${ID_ORIGEM}:"
        echo "      Total: ${TOTAL_RECEITAS}"
        echo "      Sucesso: ${SUCESSO}"
        echo "      Falhas: ${FALHA}"

        # Registrar no log de auditoria
        cat >> /tmp/migration_log.txt << EOF
[${TIMESTAMP}] MIGRAÇÃO: ${GRUPO_NOME}
  ID Origem: ${ID_ORIGEM}
  ID Destino: ${ID_MANTER}
  Total: ${TOTAL_RECEITAS} | Sucesso: ${SUCESSO} | Falhas: ${FALHA}
EOF
    done

    echo ""
    echo "✅ Fase 1 completa: Migrações"
else
    echo "ℹ️  Nenhuma migração necessária"
fi

# ============================================================================
# FASE 2: REMOÇÕES
# ============================================================================
if [ -n "${IDS_REMOVER}" ] && [ "${IDS_REMOVER}" != "" ]; then
    echo ""
    echo "⚙️  FASE 2: REMOÇÕES"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    IFS=',' read -ra REMOVER_ARRAY <<< "${IDS_REMOVER}"

    for ID_REMOVER in "${REMOVER_ARRAY[@]}"; do
        echo ""
        echo "🗑️  Removendo: ${ID_REMOVER}"

        # Validar que não está em uso
        COUNT_USO=$(jq --arg id "${ID_REMOVER}" \
            '[.data[] | select(.preparations[]?.ingredients[]?.ingredient_id == $id)] | length' \
            /tmp/all_recipes.json)

        if [ "${COUNT_USO}" -ne 0 ]; then
            echo "   ❌ ERRO: Ingrediente ainda está em uso em ${COUNT_USO} receita(s)!"
            echo "   ⚠️  ABORTANDO REMOÇÃO (SEGURANÇA)"
            continue
        fi

        # Backup do ingrediente
        curl -s "https://cozinha-ajustado.vercel.app/api/ingredients?id=${ID_REMOVER}" \
            > "${BACKUP_DIR}/ingredient_${ID_REMOVER}.json"

        # Remover
        RESPONSE=$(curl -s -X DELETE \
            "https://cozinha-ajustado.vercel.app/api/ingredients?id=${ID_REMOVER}")

        if echo "${RESPONSE}" | jq -e '.success == true' > /dev/null 2>&1; then
            echo "   ✅ Removido com sucesso"
        else
            echo "   ❌ Erro ao remover"
            echo "${RESPONSE}" > "${BACKUP_DIR}/error_delete_${ID_REMOVER}.json"
        fi

        # Registrar no log
        cat >> /tmp/migration_log.txt << EOF
[${TIMESTAMP}] REMOÇÃO: ${GRUPO_NOME}
  ID Removido: ${ID_REMOVER}
  Status: $(echo "${RESPONSE}" | jq -r '.success')
EOF
    done

    echo ""
    echo "✅ Fase 2 completa: Remoções"
else
    echo "ℹ️  Nenhuma remoção necessária"
fi

# ============================================================================
# FASE 3: VALIDAÇÃO
# ============================================================================
echo ""
echo "⚙️  FASE 3: VALIDAÇÃO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Recarregar dados
echo "📥 Recarregando dados atualizados..."
curl -s "https://cozinha-ajustado.vercel.app/api/recipes" | jq '.' > /tmp/all_recipes_new.json
curl -s "https://cozinha-ajustado.vercel.app/api/ingredients" | jq '.' > /tmp/all_ingredients_new.json

# Validar ID principal
COUNT_PRINCIPAL=$(jq --arg id "${ID_MANTER}" \
    '[.data[] | select(.preparations[]?.ingredients[]?.ingredient_id == $id)] | length' \
    /tmp/all_recipes_new.json)
echo "✓ ID principal (${ID_MANTER}) usado em: ${COUNT_PRINCIPAL} receitas"

# Validar IDs migrados não existem mais
if [ -n "${IDS_MIGRAR}" ]; then
    IFS=',' read -ra MIGRAR_ARRAY <<< "${IDS_MIGRAR}"
    for ID_ORIGEM in "${MIGRAR_ARRAY[@]}"; do
        COUNT_ANTIGO=$(jq --arg id "${ID_ORIGEM}" \
            '[.data[] | select(.preparations[]?.ingredients[]?.ingredient_id == $id)] | length' \
            /tmp/all_recipes_new.json)
        if [ "${COUNT_ANTIGO}" -eq 0 ]; then
            echo "✓ ID migrado (${ID_ORIGEM}) não está mais em uso"
        else
            echo "⚠️  ATENÇÃO: ID migrado (${ID_ORIGEM}) ainda em ${COUNT_ANTIGO} receita(s)"
        fi
    done
fi

echo ""
echo "✅ Fase 3 completa: Validação"

# ============================================================================
# RESUMO FINAL
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "RESUMO FINAL - ${GRUPO_NOME}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "✅ Consolidação completa!"
echo ""
echo "📁 Arquivos gerados:"
echo "   Log completo: ${LOG_FILE}"
echo "   Backups: ${BACKUP_DIR}"
echo "   Auditoria: /tmp/migration_log.txt"
echo ""
echo "📊 Próximos passos:"
echo "   1. Revisar o log completo"
echo "   2. Testar algumas receitas manualmente"
echo "   3. Manter os backups por alguns dias"
echo "   4. Atualizar cache local se necessário"
echo ""
echo "═══════════════════════════════════════════════════════════════"
