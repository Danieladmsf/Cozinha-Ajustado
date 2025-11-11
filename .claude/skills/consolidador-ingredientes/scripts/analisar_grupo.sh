#!/bin/bash
# Script para Análise de Grupo de Ingredientes (Somente Leitura)

GRUPO_NOME="$1"

if [ -z "${GRUPO_NOME}" ]; then
    echo "Uso: $0 \"Nome do Grupo\""
    echo "Exemplo: $0 \"Cebola\""
    exit 1
fi

echo "═══════════════════════════════════════════════════════════════"
echo "ANÁLISE DE GRUPO: ${GRUPO_NOME}"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Buscar dados do grupo
GRUPO_DATA=$(jq --arg name "${GRUPO_NOME}" '.grupos[] | select(.nome == $name)' /tmp/DUPLICADOS_JSON.json)

if [ -z "${GRUPO_DATA}" ]; then
    echo "❌ Grupo '${GRUPO_NOME}' não encontrado!"
    echo ""
    echo "Grupos disponíveis:"
    jq -r '.grupos[].nome' /tmp/DUPLICADOS_JSON.json | sort
    exit 1
fi

# Extrair informações
PRIORIDADE=$(echo "${GRUPO_DATA}" | jq -r '.prioridade')
ID_MANTER=$(echo "${GRUPO_DATA}" | jq -r '.id_manter')
IDS_MIGRAR=$(echo "${GRUPO_DATA}" | jq -r '.ids_migrar[]?' | tr '\n' ',' | sed 's/,$//')
IDS_REMOVER=$(echo "${GRUPO_DATA}" | jq -r '.ids_remover[]?' | tr '\n' ',' | sed 's/,$//')
RECEITAS_AFETADAS=$(echo "${GRUPO_DATA}" | jq -r '.receitas_afetadas')
RECEITAS_MIGRAR=$(echo "${GRUPO_DATA}" | jq -r '.receitas_migrar')
OBSERVACAO=$(echo "${GRUPO_DATA}" | jq -r '.observacao // empty')

# Exibir resumo
echo "📋 INFORMAÇÕES GERAIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Nome: ${GRUPO_NOME}"
echo "Prioridade: ${PRIORIDADE^^}"
echo "Total de receitas afetadas: ${RECEITAS_AFETADAS}"
echo "Receitas que precisam migração: ${RECEITAS_MIGRAR}"

if [ -n "${OBSERVACAO}" ]; then
    echo ""
    echo "⚠️  OBSERVAÇÃO IMPORTANTE:"
    echo "   ${OBSERVACAO}"
fi

echo ""
echo "🎯 PLANO DE CONSOLIDAÇÃO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ID a manter
if [ -n "${ID_MANTER}" ] && [ "${ID_MANTER}" != "null" ]; then
    echo ""
    echo "✓ ID A MANTER: ${ID_MANTER}"
    COUNT=$(jq --arg id "${ID_MANTER}" '[.data[] | select(.preparations[]?.ingredients[]?.ingredient_id == $id)] | length' /tmp/all_recipes.json)
    echo "  Atualmente usado em: ${COUNT} receita(s)"

    echo ""
    echo "  Receitas que usam este ID:"
    jq -r --arg id "${ID_MANTER}" '
        .data[] |
        select(.preparations[]?.ingredients[]?.ingredient_id == $id) |
        "    - \(.name)"
    ' /tmp/all_recipes.json | head -10

    TOTAL=$(jq --arg id "${ID_MANTER}" '[.data[] | select(.preparations[]?.ingredients[]?.ingredient_id == $id)] | length' /tmp/all_recipes.json)
    if [ "${TOTAL}" -gt 10 ]; then
        echo "    ... e mais $((TOTAL - 10)) receita(s)"
    fi
fi

# IDs a migrar
if [ -n "${IDS_MIGRAR}" ] && [ "${IDS_MIGRAR}" != "" ]; then
    echo ""
    echo "→ IDs A MIGRAR para ${ID_MANTER}:"
    IFS=',' read -ra MIGRAR_ARRAY <<< "${IDS_MIGRAR}"
    for ID in "${MIGRAR_ARRAY[@]}"; do
        COUNT=$(jq --arg id "${ID}" '[.data[] | select(.preparations[]?.ingredients[]?.ingredient_id == $id)] | length' /tmp/all_recipes.json)
        echo ""
        echo "  ID: ${ID}"
        echo "  Receitas: ${COUNT}"
        if [ "${COUNT}" -gt 0 ]; then
            echo "  Receitas afetadas:"
            jq -r --arg id "${ID}" '
                .data[] |
                select(.preparations[]?.ingredients[]?.ingredient_id == $id) |
                "    - \(.name)"
            ' /tmp/all_recipes.json | head -5
            if [ "${COUNT}" -gt 5 ]; then
                echo "    ... e mais $((COUNT - 5)) receita(s)"
            fi
        fi
    done
fi

# IDs a remover
if [ -n "${IDS_REMOVER}" ] && [ "${IDS_REMOVER}" != "" ]; then
    echo ""
    echo "✗ IDs A REMOVER (não utilizados):"
    IFS=',' read -ra REMOVER_ARRAY <<< "${IDS_REMOVER}"
    for ID in "${REMOVER_ARRAY[@]}"; do
        COUNT=$(jq --arg id "${ID}" '[.data[] | select(.preparations[]?.ingredients[]?.ingredient_id == $id)] | length' /tmp/all_recipes.json)
        echo "  - ${ID} (usado em ${COUNT} receita(s))"
        if [ "${COUNT}" -gt 0 ]; then
            echo "    ⚠️  ATENÇÃO: Este ID ainda está em uso!"
        fi
    done
fi

# Caso especial: nenhum ID para manter
if [ -z "${ID_MANTER}" ] || [ "${ID_MANTER}" == "null" ]; then
    echo ""
    echo "⚠️  CASO ESPECIAL: Nenhum ID em uso"
    echo "  Todos os IDs deste grupo podem ser removidos diretamente"
fi

echo ""
echo "📊 ESTIMATIVA DE IMPACTO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Calcular impacto
TOTAL_OPS=0
TOTAL_MIGRATIONS=0
TOTAL_DELETIONS=0

if [ -n "${IDS_MIGRAR}" ]; then
    IFS=',' read -ra MIGRAR_ARRAY <<< "${IDS_MIGRAR}"
    for ID in "${MIGRAR_ARRAY[@]}"; do
        COUNT=$(jq --arg id "${ID}" '[.data[] | select(.preparations[]?.ingredients[]?.ingredient_id == $id)] | length' /tmp/all_recipes.json)
        TOTAL_MIGRATIONS=$((TOTAL_MIGRATIONS + COUNT))
    done
    TOTAL_OPS=$((TOTAL_OPS + ${#MIGRAR_ARRAY[@]}))
fi

if [ -n "${IDS_REMOVER}" ]; then
    IFS=',' read -ra REMOVER_ARRAY <<< "${IDS_REMOVER}"
    TOTAL_DELETIONS=${#REMOVER_ARRAY[@]}
    TOTAL_OPS=$((TOTAL_OPS + TOTAL_DELETIONS))
fi

echo "Operações totais: ${TOTAL_OPS}"
echo "  - Migrações de receitas: ${TOTAL_MIGRATIONS}"
echo "  - Remoções de ingredientes: ${TOTAL_DELETIONS}"
echo ""

# Estimativa de tempo (baseado em ~2s por receita + 1s por ingrediente)
TEMPO_ESTIMADO=$((TOTAL_MIGRATIONS * 2 + TOTAL_DELETIONS))
MINUTOS=$((TEMPO_ESTIMADO / 60))
SEGUNDOS=$((TEMPO_ESTIMADO % 60))

echo "Tempo estimado: ~${MINUTOS}m ${SEGUNDOS}s"
echo ""

# Nível de risco
if [ "${RECEITAS_AFETADAS}" -gt 100 ]; then
    RISCO="🔴 ALTO"
elif [ "${RECEITAS_AFETADAS}" -gt 30 ]; then
    RISCO="🟠 MÉDIO"
elif [ "${RECEITAS_AFETADAS}" -gt 10 ]; then
    RISCO="🟡 BAIXO-MÉDIO"
elif [ "${RECEITAS_AFETADAS}" -gt 0 ]; then
    RISCO="🟢 BAIXO"
else
    RISCO="⚪ NENHUM"
fi

echo "Nível de risco: ${RISCO}"
echo ""

# Recomendações
echo "💡 RECOMENDAÇÕES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "${RECEITAS_AFETADAS}" -eq 0 ]; then
    echo "✓ Consolidação segura - nenhuma receita será afetada"
    echo "✓ Pode ser executada sem backup"
    echo "✓ Operação rápida"
elif [ "${RECEITAS_AFETADAS}" -lt 10 ]; then
    echo "✓ Grupo de baixo risco"
    echo "✓ Faça backup antes"
    echo "✓ Valide algumas receitas após consolidação"
elif [ "${RECEITAS_AFETADAS}" -lt 50 ]; then
    echo "⚠️  Grupo de médio risco"
    echo "⚠️  IMPORTANTE: Faça backup do banco antes"
    echo "⚠️  Valide várias receitas após consolidação"
    echo "⚠️  Considere fazer em horário de baixo uso"
else
    echo "🔴 Grupo de ALTO risco"
    echo "🔴 CRÍTICO: Faça backup completo do banco"
    echo "🔴 Considere testar em ambiente de staging primeiro"
    echo "🔴 Execute em horário de manutenção"
    echo "🔴 Valide extensivamente após consolidação"
    echo "🔴 Mantenha os backups por vários dias"
fi

echo ""
echo "📋 COMANDOS PARA EXECUTAR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Simulação (dry-run):"
echo "   \"simule a consolidação de ${GRUPO_NOME}\""
echo ""
echo "2. Execução:"
echo "   \"consolide o grupo ${GRUPO_NOME}\""
echo ""
echo "3. Validação pós-consolidação:"
echo "   \"valide a consolidação de ${GRUPO_NOME}\""
echo ""

echo "═══════════════════════════════════════════════════════════════"
