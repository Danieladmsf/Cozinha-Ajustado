#!/bin/bash
# Gemini Smart Wrapper - Usa o Gemini existente com balanceamento inteligente

set -euo pipefail

CLI_PATH="/google/idx/builtins/bin/gemini"
WRAPPER_DIR="/tmp/gemini_smart"
SESSION_DIR="$WRAPPER_DIR/sessions"
CONTEXT_CACHE="$WRAPPER_DIR/context_cache"
SESSION_POOL_SIZE=4

mkdir -p "$WRAPPER_DIR" "$SESSION_DIR" "$CONTEXT_CACHE"

# Pool de sessões para reutilização
declare -A SESSION_LAST_USED

# Gerenciar pool de sessões
get_available_session() {
    local current_time=$(date +%s)
    local best_session=""
    local oldest_time=$current_time
    
    # Procurar sessão disponível ou menos usada recentemente
    for session_id in $(seq 1 $SESSION_POOL_SIZE); do
        local last_used=${SESSION_LAST_USED[$session_id]:-0}
        if [[ $last_used -lt $oldest_time ]]; then
            oldest_time=$last_used
            best_session=$session_id
        fi
    done
    
    echo "${best_session:-1}"
}

# Comprimir prompt para economizar tokens
compress_prompt() {
    local prompt="$1"
    local compressed="$prompt"
    
    # Remover espaços extras
    compressed=$(echo "$compressed" | sed 's/[[:space:]]\+/ /g' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    
    # Comprimir padrões comuns
    compressed=$(echo "$compressed" | sed 's/por favor/pf/gi')
    compressed=$(echo "$compressed" | sed 's/você pode/vc pode/gi')
    compressed=$(echo "$compressed" | sed 's/me ajuda/ajude/gi')
    
    # Se ainda muito longo, truncar preservando essencial
    if [[ ${#compressed} -gt 1000 ]]; then
        compressed="${compressed:0:1000}... [prompt truncado para economia]"
    fi
    
    echo "$compressed"
}

# Cache de contexto simples
save_context() {
    local session_id="$1"
    local context="$2"
    local context_file="$CONTEXT_CACHE/context_${session_id}.txt"
    
    # Salvar apenas últimos 3 contextos
    {
        echo "$(date +%s): $context"
        if [[ -f "$context_file" ]]; then
            head -2 "$context_file"
        fi
    } > "$context_file.tmp" && mv "$context_file.tmp" "$context_file"
}

load_context() {
    local session_id="$1"
    local context_file="$CONTEXT_CACHE/context_${session_id}.txt"
    
    if [[ -f "$context_file" ]]; then
        echo "Contexto anterior:"
        cat "$context_file" | sed 's/^[0-9]*: /- /'
        echo ""
    fi
}

# Limpar cache quando há problemas
clear_gemini_cache() {
    echo "🧹 Limpando cache do Gemini..."
    
    # Limpar configurações temporárias
    if [[ -d "$WRAPPER_DIR" ]]; then
        rm -rf "$WRAPPER_DIR"
        mkdir -p "$WRAPPER_DIR" "$SESSION_DIR" "$CONTEXT_CACHE"
        echo "✅ Cache do wrapper limpo"
    fi
}

# Verificar se Gemini está funcionando
check_gemini_status() {
    echo "🔍 Verificando status do Gemini..."
    
    if [[ ! -x "$CLI_PATH" ]]; then
        echo "❌ CLI do Gemini não encontrado em: $CLI_PATH"
        return 1
    fi
    
    echo "✅ CLI encontrado"
    return 0
}

# Executar com API externa via curl quando quota esgotada
execute_with_external_api() {
    local prompt="$1"
    
    echo "🌐 Tentando API externa do Google AI..."
    
    if [[ -z "$GOOGLE_API_KEY" ]]; then
        echo "❌ GOOGLE_API_KEY não configurada"
        echo "💡 Configure: export GOOGLE_API_KEY='sua-chave'"
        echo "💡 Obtenha em: https://aistudio.google.com/"
        return 1
    fi
    
    local api_url="https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
    
    local json_payload=$(cat <<EOF
{
  "contents": [{
    "parts":[{"text": "$prompt"}]
  }]
}
EOF
)
    
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "x-goog-api-key: $GOOGLE_API_KEY" \
        -d "$json_payload" \
        "$api_url" | \
        jq -r '.candidates[0].content.parts[0].text // "Erro na resposta da API"'
}

# Iniciar sessão interativa persistente do Gemini CLI
start_interactive_gemini() {
    local session_id="$1"
    echo "🚀 Iniciando sessão interativa do Gemini CLI..."
    echo "💡 Use comandos normais do Gemini + comandos especiais do wrapper:"
    echo "   /quit    - Sair"
    echo "   /clear   - Limpar cache do wrapper"
    echo "   /status  - Status da sessão"
    echo ""
    
    # Executar Gemini CLI em modo interativo com fallback
    if ! "$CLI_PATH" --model gemini-2.5-pro 2>/dev/null; then
        if ! "$CLI_PATH" --model gemini-2.5-flash 2>/dev/null; then
            echo "⚠️ CLI local falhou, tentando API externa..."
            start_external_interactive_session
        fi
    fi
}

# Sessão interativa com API externa (fallback)
start_external_interactive_session() {
    if [[ -z "$GOOGLE_API_KEY" ]]; then
        echo "❌ GOOGLE_API_KEY não configurada para fallback"
        echo "💡 Configure: export GOOGLE_API_KEY='sua-chave'"
        echo "💡 Obtenha em: https://aistudio.google.com/"
        return 1
    fi
    
    echo "🌐 Sessão interativa com API externa"
    echo "💡 Digite suas perguntas normalmente, /quit para sair"
    echo ""
    
    while true; do
        read -p "gemini-api> " input
        
        case "$input" in
            "/quit"|"exit"|"")
                echo "👋 Encerrando sessão..."
                break
                ;;
            "/clear")
                clear_gemini_cache
                echo "✅ Cache limpo"
                ;;
            "/status")
                echo "📊 Status: Usando API externa do Google AI"
                echo "🔑 API Key: ${GOOGLE_API_KEY:0:10}..."
                ;;
            *)
                if [[ -n "$input" ]]; then
                    execute_with_external_api "$input"
                fi
                ;;
        esac
        echo ""
    done
}

# Executar Gemini com sessão reutilizável (para comandos únicos)
execute_gemini_with_session() {
    local session_id="$1"
    local prompt="$2"
    
    echo "🎯 Executando com sessão $session_id..."
    
    # Comprimir prompt para economizar tokens
    local compressed_prompt=$(compress_prompt "$prompt")
    
    # Carregar contexto se disponível
    local context=$(load_context "$session_id")
    local full_prompt="$context$compressed_prompt"
    
    # Executar Gemini com prompt direto (não interativo)
    local result
    local output
    
    # Capturar output e código de retorno
    output=$("$CLI_PATH" --prompt "$full_prompt" --model gemini-2.5-pro 2>&1)
    result=$?
    
    # Verificar se houve erro de quota (429)
    if [[ $result -ne 0 ]] && echo "$output" | grep -q "429\|quota.*exceeded\|rateLimitExceeded"; then
        echo "⚠️ Quota esgotada, tentando API externa..."
        if execute_with_external_api "$compressed_prompt"; then
            # Salvar contexto mesmo com API externa
            save_context "$session_id" "$compressed_prompt"
            SESSION_LAST_USED[$session_id]=$(date +%s)
            return 0
        else
            echo "$output"
            return 1
        fi
    elif [[ $result -eq 0 ]]; then
        # Sucesso normal
        echo "$output"
        save_context "$session_id" "$compressed_prompt"
        SESSION_LAST_USED[$session_id]=$(date +%s)
        return 0
    else
        # Outros erros
        echo "$output"
        return 1
    fi
}

# Modo batch para múltiplas perguntas
execute_batch_prompts() {
    local prompts=("$@")
    local session_id=$(get_available_session)
    
    echo "🔄 Executando ${#prompts[@]} prompts em batch (sessão $session_id)..."
    
    # Combinar prompts com separadores
    local combined_prompt="Responda essas perguntas sequencialmente:"
    local i=1
    for prompt in "${prompts[@]}"; do
        combined_prompt="$combined_prompt\n\n$i. $(compress_prompt "$prompt")"
        ((i++))
    done
    
    execute_gemini_with_session "$session_id" "$combined_prompt"
}

# Executar com retry
smart_execute() {
    local prompt="$*"
    
    if [[ -z "$prompt" ]]; then
        echo "❌ Nenhum prompt fornecido"
        return 1
    fi
    
    echo "🚀 Gemini Smart Wrapper - Executando com balanceamento"
    
    # Verificar status primeiro
    if ! check_gemini_status; then
        echo "❌ Não foi possível verificar o Gemini. Operação cancelada."
        return 1
    fi
    
    echo ""
    echo "🎯 Iniciando execução do prompt..."
    
    # Tentar em até 3 tentativas
    local max_attempts=3
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        local session_id=$(get_available_session)
        
        echo "🔄 Tentativa $attempt/$max_attempts - Sessão $session_id"
        
        if execute_gemini_with_session "$session_id" "$prompt"; then
            echo "✅ Execução bem-sucedida na sessão $session_id"
            return 0
        else
            echo "⚠️ Falha na sessão $session_id, tentando novamente..."
            attempt=$((attempt + 1))
            sleep 1
        fi
    done
    
    echo "❌ Falha em todas as tentativas"
    echo "🛠️ Possíveis causas:"
    echo "   - Quota diária atingida (use API key)"
    echo "   - Problemas de conectividade"
    echo "   - Prompt muito complexo"
    echo "🛠️ Tente executar: $0 clear-cache"
    return 1
}

# Menu principal
if [[ $# -eq 0 ]]; then
    echo "Gemini Smart Wrapper - Balanceamento simples de sessões"
    echo ""
    echo "Uso: $0 [comando] 'prompt'"
    echo ""
    echo "Comandos:"
    echo "  'prompt direto'   - Executar prompt diretamente"
    echo "  exec 'prompt'     - Executar prompt com comando explícito"
    echo "  interactive       - Modo interativo"
    echo "  help              - Mostrar ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0 'me ajude com Python'"
    echo "  $0 exec 'analise este código'"
    echo "  $0 interactive"
    exit 0
fi

case "${1:-help}" in
    "clear-cache"|"cache-clear"|"cc")
        echo "🧹 Executando limpeza de cache..."
        clear_gemini_cache
        echo "✅ Limpeza concluída"
        ;;
    "diagnose"|"diag"|"check")
        echo "🔍 Executando diagnóstico completo..."
        check_gemini_status
        
        # Mostrar estatísticas de uso
        echo ""
        echo "📊 Estatísticas de sessões:"
        for session_id in $(seq 1 $SESSION_POOL_SIZE); do
            local context_file="$CONTEXT_CACHE/context_${session_id}.txt"
            if [[ -f "$context_file" ]]; then
                local count=$(wc -l < "$context_file")
                echo "  Sessão $session_id: $count interações"
            fi
        done
        ;;
    "batch")
        shift
        if [[ $# -lt 2 ]]; then
            echo "❌ Modo batch requer pelo menos 2 prompts"
            echo "Uso: $0 batch 'prompt1' 'prompt2' 'prompt3'"
            exit 1
        fi
        echo "🔄 Executando modo batch econômico..."
        if ! check_gemini_status; then
            echo "❌ Problemas com o Gemini. Operação cancelada."
            exit 1
        fi
        execute_batch_prompts "$@"
        ;;
    "economy"|"eco")
        shift
        echo "💰 Modo econômico ativo - prompt comprimido"
        if [[ -z "$*" ]]; then
            echo "❌ Nenhum prompt fornecido"
            exit 1
        fi
        # Usar compressão mais agressiva
        local compressed=$(compress_prompt "$*")
        echo "📝 Prompt original: ${#*} chars"
        echo "📝 Prompt comprimido: ${#compressed} chars"
        smart_execute "$compressed"
        ;;
    "exec")
        shift
        smart_execute "$@"
        ;;
    "interactive"|"i"|"cli")
        # Iniciar sessão interativa persistente do Gemini CLI
        local session_id=$(get_available_session)
        start_interactive_gemini "$session_id"
        ;;
    "help"|"-h"|"--help")
        echo "Gemini Smart Wrapper - Otimizado para economia de tokens"
        echo ""
        echo "Uso: $0 [comando] 'prompt'"
        echo ""
        echo "Comandos:"
        echo "  'prompt direto'   - Executar prompt com sessão reutilizável"
        echo "  exec 'prompt'     - Executar prompt com comando explícito"
        echo "  batch 'p1' 'p2'   - Executar múltiplos prompts em uma requisição"
        echo "  economy 'prompt'  - Executar com compressão agressiva"
        echo "  interactive/cli   - Iniciar sessão CLI persistente do Gemini"
        echo "  clear-cache       - Limpar cache e sessões"
        echo "  diagnose          - Verificar configuração e estatísticas"
        echo "  help              - Mostrar ajuda"
        echo ""
        echo "Exemplos de economia:"
        echo "  $0 'me ajude com Python'"
        echo "  $0 batch 'o que é React?' 'como usar hooks?' 'exemplo useState'"
        echo "  $0 economy 'explique machine learning por favor'"
        echo "  $0 interactive"
        echo ""
        echo "💡 Recursos de economia:"
        echo "  - Sessões reutilizáveis (menos overhead)"
        echo "  - Cache de contexto entre execuções"
        echo "  - Compressão automática de prompts longos"
        echo "  - Modo batch para múltiplas perguntas"
        echo "  - Usa gemini-2.5-pro por padrão (melhor qualidade)"
        ;;
    *)
        # Se apenas um argumento, perguntar se quer continuar interativo
        if [[ $# -eq 1 ]]; then
            smart_execute "$@"
            echo ""
            echo "💬 Deseja continuar a conversa? (y/n)"
            read -p "gemini> " continue_chat
            
            if [[ "$continue_chat" =~ ^[yYsS] ]]; then
                echo "🎮 Entrando no modo interativo..."
                echo "⚙️ Comandos: .quit para sair, .clear para limpar cache"
                echo ""
                
                while true; do
                    read -p "gemini> " input
                    
                    case "$input" in
                        ".quit"|".exit"|".q"|"")
                            echo "👋 Saindo..."
                            break
                            ;;
                        ".clear"|".cache")
                            clear_gemini_cache
                            ;;
                        *)
                            smart_execute "$input"
                            echo ""
                            ;;
                    esac
                done
            fi
        else
            # Múltiplos argumentos - executar diretamente
            smart_execute "$@"
        fi
        ;;
esac