#!/bin/bash
# Claude Port Balancer - Explora múltiplas sessões SSE para aumentar throughput

set -euo pipefail

SCRIPT_DIR="/home/user/studio"
CLI_PATH="/home/user/.global_modules/lib/node_modules/@anthropic-ai/claude-code/cli.js"
PORT_SESSIONS_DIR="/tmp/claude_port_sessions"

mkdir -p "$PORT_SESSIONS_DIR"

# Detectar sessões Claude ativas com portas diferentes
detect_active_sessions() {
    local active_sessions=()
    
    echo "🔍 Detectando sessões Claude ativas..."
    
    # Buscar todos os processos Claude
    local pids=$(pgrep -f "claude" | grep -v $$ || true)
    
    if [[ -z "$pids" ]]; then
        echo "❌ Nenhuma sessão Claude ativa encontrada"
        return 1
    fi
    
    for pid in $pids; do
        if [[ -d "/proc/$pid" ]]; then
            local port=$(cat /proc/$pid/environ 2>/dev/null | tr '\0' '\n' | grep "CLAUDE_CODE_SSE_PORT" | cut -d'=' -f2 || echo "default")
            local home=$(cat /proc/$pid/environ 2>/dev/null | tr '\0' '\n' | grep "^HOME=" | cut -d'=' -f2 || echo "unknown")
            local cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || echo "unknown")
            
            # Verificar se é uma sessão válida (não script)
            local cmdline=$(cat /proc/$pid/cmdline 2>/dev/null | tr '\0' ' ' | head -c 100)
            if [[ "$cmdline" =~ "cli.js" ]] || [[ "$cmdline" =~ "claude" ]]; then
                echo "✅ Sessão encontrada: PID=$pid, PORT=$port, HOME=$home"
                echo "   📁 CWD=$cwd"
                
                # Salvar informações da sessão
                echo "$pid:$port:$home:$cwd" >> "$PORT_SESSIONS_DIR/active_sessions.txt"
            fi
        fi
    done
    
    if [[ -f "$PORT_SESSIONS_DIR/active_sessions.txt" ]]; then
        local session_count=$(wc -l < "$PORT_SESSIONS_DIR/active_sessions.txt")
        echo "📊 Total de sessões ativas: $session_count"
        return 0
    else
        echo "❌ Nenhuma sessão válida encontrada"
        return 1
    fi
}

# Executar requisição em sessão específica
execute_on_session() {
    local session_info=$1
    local prompt=$2
    local session_id=$3
    
    IFS=':' read -r pid port home cwd <<< "$session_info"
    
    echo "🚀 Executando na sessão $session_id (PID: $pid, PORT: $port)"
    
    # Criar ambiente isolado para esta sessão
    local temp_env="/tmp/claude_session_${session_id}_env"
    cat > "$temp_env" << EOF
#!/bin/bash
export HOME="$home"
export CLAUDE_CODE_SSE_PORT="$port"
cd "$cwd"
exec node "$CLI_PATH" "\$@"
EOF
    chmod +x "$temp_env"
    
    # Executar com timeout
    local start_time=$(date +%s)
    if timeout 60s "$temp_env" "$prompt" 2>/dev/null; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo "✅ Sessão $session_id concluída em ${duration}s"
        rm -f "$temp_env"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo "❌ Sessão $session_id falhou/timeout em ${duration}s"
        rm -f "$temp_env"
        return 1
    fi
}

# Balanceador de carga round-robin
round_robin_execute() {
    local prompt=$1
    local sessions=()
    
    # Limpar arquivo de sessões ativas
    rm -f "$PORT_SESSIONS_DIR/active_sessions.txt"
    
    # Detectar sessões
    if ! detect_active_sessions; then
        echo "❌ Nenhuma sessão disponível para balanceamento"
        return 1
    fi
    
    # Carregar sessões
    while IFS= read -r session; do
        sessions+=("$session")
    done < "$PORT_SESSIONS_DIR/active_sessions.txt"
    
    if [[ ${#sessions[@]} -eq 0 ]]; then
        echo "❌ Nenhuma sessão carregada"
        return 1
    fi
    
    echo "🔄 Usando ${#sessions[@]} sessões para balanceamento de carga"
    
    # Escolher sessão (round-robin simples)
    local session_counter_file="$PORT_SESSIONS_DIR/session_counter"
    local current_session=0
    
    if [[ -f "$session_counter_file" ]]; then
        current_session=$(cat "$session_counter_file")
    fi
    
    # Próxima sessão
    current_session=$(( (current_session + 1) % ${#sessions[@]} ))
    echo "$current_session" > "$session_counter_file"
    
    # Executar na sessão selecionada
    local selected_session="${sessions[$current_session]}"
    execute_on_session "$selected_session" "$prompt" "$((current_session + 1))"
}

# Executar em paralelo em todas as sessões
parallel_execute() {
    local base_prompt=$1
    local sessions=()
    
    # Limpar arquivo de sessões ativas
    rm -f "$PORT_SESSIONS_DIR/active_sessions.txt"
    
    # Detectar sessões
    if ! detect_active_sessions; then
        echo "❌ Nenhuma sessão disponível para execução paralela"
        return 1
    fi
    
    # Carregar sessões
    while IFS= read -r session; do
        sessions+=("$session")
    done < "$PORT_SESSIONS_DIR/active_sessions.txt"
    
    if [[ ${#sessions[@]} -eq 0 ]]; then
        echo "❌ Nenhuma sessão carregada"
        return 1
    fi
    
    echo "⚡ Executando em paralelo em ${#sessions[@]} sessões"
    
    local pids=()
    
    # Iniciar todas as sessões em paralelo
    for i in "${!sessions[@]}"; do
        local session="${sessions[$i]}"
        local session_id=$((i + 1))
        local prompt="${base_prompt} (sessão ${session_id}/${#sessions[@]})"
        
        echo "🚀 Iniciando sessão paralela $session_id..."
        execute_on_session "$session" "$prompt" "$session_id" &
        pids+=($!)
        
        # Delay pequeno para evitar sobrecarga
        sleep 0.5
    done
    
    echo "⏳ Aguardando conclusão de ${#pids[@]} sessões paralelas..."
    
    # Aguardar todas as sessões
    local success_count=0
    for pid in "${pids[@]}"; do
        if wait "$pid"; then
            success_count=$((success_count + 1))
        fi
    done
    
    echo "📊 Resultado: $success_count/${#pids[@]} sessões bem-sucedidas"
    
    if [[ $success_count -gt 0 ]]; then
        return 0
    else
        return 1
    fi
}

# Mostrar estatísticas das sessões
show_session_stats() {
    echo "📊 Estatísticas das Sessões Claude"
    echo "=================================="
    
    detect_active_sessions >/dev/null 2>&1
    
    if [[ -f "$PORT_SESSIONS_DIR/active_sessions.txt" ]]; then
        echo ""
        echo "🔍 Sessões Ativas:"
        local counter=1
        while IFS=':' read -r pid port home cwd; do
            echo "  $counter. PID: $pid"
            echo "     🔌 Porta SSE: $port"
            echo "     🏠 HOME: $home"
            echo "     📁 CWD: $cwd"
            echo ""
            counter=$((counter + 1))
        done < "$PORT_SESSIONS_DIR/active_sessions.txt"
    else
        echo "❌ Nenhuma sessão ativa encontrada"
    fi
    
    # Mostrar uso de recursos
    echo "💻 Uso de Recursos:"
    echo "  🔧 Processos Claude ativos: $(pgrep -f claude | wc -l)"
    echo "  💾 Memória total Claude: $(ps -o pid,rss,comm -C node | grep claude | awk '{sum+=$2} END {printf "%.1f MB\n", sum/1024}' || echo "N/A")"
}

# Limpar sessões inativas
cleanup_dead_sessions() {
    echo "🧹 Limpando sessões inativas..."
    
    local cleaned=0
    rm -f "$PORT_SESSIONS_DIR/active_sessions.txt"
    
    # Re-detectar apenas sessões vivas
    local pids=$(pgrep -f "claude" | grep -v $$ || true)
    for pid in $pids; do
        if ! kill -0 "$pid" 2>/dev/null; then
            echo "🗑️ Removendo sessão morta: PID $pid"
            cleaned=$((cleaned + 1))
        fi
    done
    
    if [[ $cleaned -eq 0 ]]; then
        echo "✅ Nenhuma sessão inativa encontrada"
    else
        echo "✅ $cleaned sessões inativas removidas"
    fi
}

# Menu principal
main() {
    case "${1:-status}" in
        "balance"|"b")
            if [[ $# -lt 2 ]]; then
                echo "❌ Uso: $0 balance 'seu prompt aqui'"
                exit 1
            fi
            round_robin_execute "$2"
            ;;
        "parallel"|"p")
            if [[ $# -lt 2 ]]; then
                echo "❌ Uso: $0 parallel 'seu prompt aqui'"
                exit 1
            fi
            parallel_execute "$2"
            ;;
        "stats"|"s")
            show_session_stats
            ;;
        "cleanup"|"c")
            cleanup_dead_sessions
            ;;
        "detect"|"d")
            detect_active_sessions
            ;;
        "help"|"-h"|"--help")
            echo "Claude Port Balancer - Explora múltiplas sessões SSE"
            echo ""
            echo "Uso: $0 <comando> [argumentos]"
            echo ""
            echo "Comandos:"
            echo "  balance 'prompt'    - Executar com balanceamento round-robin"
            echo "  parallel 'prompt'   - Executar em paralelo em todas as sessões"
            echo "  stats               - Mostrar estatísticas das sessões"
            echo "  detect              - Detectar sessões ativas"
            echo "  cleanup             - Limpar sessões inativas"
            echo "  help                - Mostrar esta ajuda"
            echo ""
            echo "Exemplos:"
            echo "  $0 balance 'me ajude com código Python'"
            echo "  $0 parallel 'teste de múltiplas sessões'"
            echo "  $0 stats"
            ;;
        *)
            show_session_stats
            echo ""
            echo "💡 Comandos disponíveis:"
            echo "  $0 balance 'prompt'   - Balanceamento de carga"
            echo "  $0 parallel 'prompt'  - Execução paralela"  
            echo "  $0 stats              - Ver estatísticas"
            echo "  $0 help               - Ver ajuda completa"
            ;;
    esac
}

main "$@"