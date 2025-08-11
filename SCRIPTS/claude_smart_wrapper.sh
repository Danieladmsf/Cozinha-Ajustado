#!/bin/bash
# Claude Smart Wrapper - Usa o Claude existente com balanceamento inteligente

set -euo pipefail

CLI_PATH="/home/user/.global_modules/lib/node_modules/@anthropic-ai/claude-code/cli.js"
WRAPPER_DIR="/tmp/claude_smart"
PORT_BASE=62600

mkdir -p "$WRAPPER_DIR"

# Pool de portas disponíveis
AVAILABLE_PORTS=(62600 62601 62602 62603)
CURRENT_PORT_INDEX=0

# Obter próxima porta
get_next_port() {
    local port=${AVAILABLE_PORTS[$CURRENT_PORT_INDEX]}
    CURRENT_PORT_INDEX=$(( (CURRENT_PORT_INDEX + 1) % ${#AVAILABLE_PORTS[@]} ))
    echo "$port"
}

# Verificar se está logado e fazer login se necessário
ensure_logged_in() {
    echo "🔍 Verificando autenticação..."
    
    # Testar se está logado com comando simples
    if env -i HOME="$HOME" PATH="$PATH" node "$CLI_PATH" auth status >/dev/null 2>&1; then
        echo "✅ Já autenticado"
        return 0
    else
        echo "❌ Claude não está logado"
        echo ""
        echo "🔑 AÇÃO NECESSÁRIA: Faça login do Claude"
        echo "============================================"
        echo "1️⃣ Execute em outro terminal:"
        echo "   claude auth login"
        echo ""
        echo "2️⃣ Depois execute novamente:"
        echo "   $0 'sua pergunta aqui'"
        echo ""
        echo "💡 O login precisa ser feito manualmente por segurança"
        return 1
    fi
}

# Executar Claude com porta específica
execute_claude_with_port() {
    local port=$1
    local prompt="$2"
    
    echo "🎯 Executando com porta $port..."
    
    # Executar com ambiente modificado
    env -i \
        HOME="$HOME" \
        PATH="$PATH" \
        CLAUDE_CODE_SSE_PORT="$port" \
        node "$CLI_PATH" "$prompt"
}

# Executar com retry em portas diferentes
smart_execute() {
    local prompt="$*"
    
    if [[ -z "$prompt" ]]; then
        echo "❌ Nenhum prompt fornecido"
        return 1
    fi
    
    echo "🚀 Claude Smart Wrapper - Executando com balanceamento"
    
    # Verificar autenticação primeiro
    if ! ensure_logged_in; then
        echo "❌ Não foi possível autenticar. Operação cancelada."
        return 1
    fi
    
    echo ""
    echo "🎯 Iniciando execução do prompt..."
    
    # Tentar em até 3 portas diferentes
    local max_attempts=3
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        local port=$(get_next_port)
        
        echo "🔄 Tentativa $attempt/$max_attempts - Porta $port"
        
        if execute_claude_with_port "$port" "$prompt"; then
            echo "✅ Execução bem-sucedida na porta $port"
            return 0
        else
            echo "⚠️ Falha na porta $port, tentando próxima..."
            attempt=$((attempt + 1))
            sleep 1
        fi
    done
    
    echo "❌ Falha em todas as tentativas"
    return 1
}

# Menu principal
if [[ $# -eq 0 ]]; then
    # Sem argumentos - mostrar ajuda
    echo "Claude Smart Wrapper - Balanceamento simples de portas"
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
    "exec")
        shift
        smart_execute "$@"
        ;;
    "interactive"|"i")
        echo "🎮 Modo Interativo Claude Smart Wrapper"
        echo "======================================"
        echo "💡 Digite seus prompts normalmente"
        echo "⚙️ Comando especial: .quit para sair"
        echo ""
        
        while true; do
            read -p "claude> " input
            
            case "$input" in
                ".quit"|".exit"|".q")
                    echo "👋 Saindo..."
                    break
                    ;;
                "")
                    continue
                    ;;
                *)
                    smart_execute "$input"
                    echo ""
                    ;;
            esac
        done
        ;;
    "help"|"-h"|"--help")
        echo "Claude Smart Wrapper - Balanceamento simples de portas"
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
        ;;
    *)
        # Tratar qualquer outro argumento como prompt direto
        smart_execute "$@"
        ;;
esac