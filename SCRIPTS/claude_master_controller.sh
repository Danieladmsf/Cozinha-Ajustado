#!/bin/bash
# Claude Master Controller - Controle total do Claude Code com balanceamento automático

set -euo pipefail

# Configurações
CLI_PATH="/home/user/.global_modules/lib/node_modules/@anthropic-ai/claude-code/cli.js"
CONTROLLER_DIR="/tmp/claude_master"
INSTANCES_DIR="$CONTROLLER_DIR/instances"
LOGS_DIR="$CONTROLLER_DIR/logs"
CONFIG_FILE="$CONTROLLER_DIR/config.json"

# Configurações padrão
DEFAULT_NUM_INSTANCES=4
DEFAULT_BASE_PORT=62500
DEFAULT_RESTART_THRESHOLD=50  # requests antes de restart preventivo
DEFAULT_ERROR_THRESHOLD=5     # erros consecutivos antes de restart

mkdir -p "$CONTROLLER_DIR" "$INSTANCES_DIR" "$LOGS_DIR"

# Estado global
ACTIVE_INSTANCES=()
INSTANCE_PIDS=()
INSTANCE_PORTS=()
INSTANCE_REQUEST_COUNT=()
INSTANCE_ERROR_COUNT=()
CURRENT_INSTANCE=0

# Inicializar configuração
init_config() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        cat > "$CONFIG_FILE" << EOF
{
    "num_instances": $DEFAULT_NUM_INSTANCES,
    "base_port": $DEFAULT_BASE_PORT,
    "restart_threshold": $DEFAULT_RESTART_THRESHOLD,
    "error_threshold": $DEFAULT_ERROR_THRESHOLD,
    "auto_restart": true,
    "load_balance": true,
    "health_check_interval": 10,
    "startup_delay": 2
}
EOF
        echo "📁 Configuração inicial criada: $CONFIG_FILE"
    fi
}

# Ler configuração
read_config() {
    local num_instances=$(jq -r '.num_instances // 4' "$CONFIG_FILE")
    local base_port=$(jq -r '.base_port // 62500' "$CONFIG_FILE")
    local restart_threshold=$(jq -r '.restart_threshold // 50' "$CONFIG_FILE")
    local error_threshold=$(jq -r '.error_threshold // 5' "$CONFIG_FILE")
    
    export MASTER_NUM_INSTANCES=$num_instances
    export MASTER_BASE_PORT=$base_port
    export MASTER_RESTART_THRESHOLD=$restart_threshold
    export MASTER_ERROR_THRESHOLD=$error_threshold
}

# Gerar porta única para instância
get_instance_port() {
    local instance_id=$1
    echo $(($MASTER_BASE_PORT + $instance_id))
}

# Iniciar uma instância Claude
start_instance() {
    local instance_id=$1
    local port=$(get_instance_port $instance_id)
    local instance_dir="$INSTANCES_DIR/instance_$instance_id"
    local log_file="$LOGS_DIR/instance_${instance_id}.log"
    local pid_file="$INSTANCES_DIR/instance_${instance_id}.pid"
    
    echo "🚀 Iniciando instância $instance_id na porta $port..."
    
    # Criar diretório da instância
    mkdir -p "$instance_dir"
    
    # Abordagem mais simples: criar processo que fica aguardando comandos
    cat > "$instance_dir/daemon.sh" << EOF
#!/bin/bash
export HOME="$HOME"
export PATH="$PATH"
export CLAUDE_CODE_SSE_PORT="$port"
export CLAUDE_INSTANCE_ID="$instance_id"

echo "\$(date): Daemon da instância $instance_id iniciado na porta $port" >> "$log_file"

# Processo daemon que fica vivo
while true; do
    # Verificar se deve parar (arquivo stop existe)
    if [[ -f "$instance_dir/stop" ]]; then
        echo "\$(date): Recebido sinal de parada para instância $instance_id" >> "$log_file"
        break
    fi
    
    # Ficar vivo e disponível para requisições
    sleep 5
done

echo "\$(date): Daemon da instância $instance_id finalizado" >> "$log_file"
EOF
    
    chmod +x "$instance_dir/daemon.sh"
    
    # Iniciar daemon em background
    nohup "$instance_dir/daemon.sh" >> "$log_file" 2>&1 &
    local daemon_pid=$!
    
    # Salvar PID
    echo "$daemon_pid" > "$pid_file"
    
    # Aguardar inicialização
    sleep 2
    
    # Verificar se iniciou corretamente
    if kill -0 "$daemon_pid" 2>/dev/null; then
        ACTIVE_INSTANCES+=($instance_id)
        INSTANCE_PIDS+=($daemon_pid)
        INSTANCE_PORTS+=($port)
        INSTANCE_REQUEST_COUNT+=(0)
        INSTANCE_ERROR_COUNT+=(0)
        
        echo "✅ Instância $instance_id iniciada com sucesso (PID: $daemon_pid, PORTA: $port)"
        echo "$(date): Instância $instance_id registrada com sucesso" >> "$log_file"
        return 0
    else
        echo "❌ Falha ao iniciar instância $instance_id"
        echo "$(date): Falha ao iniciar daemon da instância $instance_id" >> "$log_file"
        return 1
    fi
}

# Parar uma instância específica
stop_instance() {
    local instance_id=$1
    local instance_dir="$INSTANCES_DIR/instance_$instance_id"
    local pid_file="$INSTANCES_DIR/instance_${instance_id}.pid"
    local log_file="$LOGS_DIR/instance_${instance_id}.log"
    
    echo "🛑 Parando instância $instance_id..."
    
    # Criar arquivo de parada para parada suave
    touch "$instance_dir/stop"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        
        if kill -0 "$pid" 2>/dev/null; then
            # Aguardar parada suave
            sleep 3
            
            # Se ainda estiver rodando, forçar
            if kill -0 "$pid" 2>/dev/null; then
                echo "🔨 Forçando parada da instância $instance_id..."
                kill -9 "$pid" 2>/dev/null || true
            fi
            
            echo "$(date): Instância $instance_id parada" >> "$log_file"
        fi
        
        rm -f "$pid_file"
        rm -f "$instance_dir/stop"
        echo "✅ Instância $instance_id parada"
    else
        echo "⚠️ Instância $instance_id não encontrada"
    fi
}

# Reiniciar uma instância específica
restart_instance() {
    local instance_id=$1
    
    echo "🔄 Reiniciando instância $instance_id..."
    stop_instance $instance_id
    sleep 2
    start_instance $instance_id
}

# Inicializar todas as instâncias
start_all_instances() {
    echo "🚀 Iniciando $MASTER_NUM_INSTANCES instâncias Claude..."
    
    # Limpar estado anterior
    ACTIVE_INSTANCES=()
    INSTANCE_PIDS=()
    INSTANCE_PORTS=()
    INSTANCE_REQUEST_COUNT=()
    INSTANCE_ERROR_COUNT=()
    
    local success_count=0
    
    for i in $(seq 0 $((MASTER_NUM_INSTANCES - 1))); do
        if start_instance $i; then
            success_count=$((success_count + 1))
            sleep 1  # Delay entre inicializações
        fi
    done
    
    echo "📊 $success_count/$MASTER_NUM_INSTANCES instâncias iniciadas com sucesso"
    
    if [[ $success_count -eq 0 ]]; then
        echo "❌ Nenhuma instância pôde ser iniciada!"
        return 1
    fi
    
    return 0
}

# Parar todas as instâncias
stop_all_instances() {
    echo "🛑 Parando todas as instâncias..."
    
    for i in $(seq 0 $((MASTER_NUM_INSTANCES - 1))); do
        stop_instance $i
    done
    
    # Limpar processos restantes
    pkill -f "CLAUDE_INSTANCE_ID" 2>/dev/null || true
    
    echo "✅ Todas as instâncias paradas"
}

# Obter próxima instância disponível (round-robin com health check)
get_next_instance() {
    if [[ ${#ACTIVE_INSTANCES[@]} -eq 0 ]]; then
        echo "❌ Nenhuma instância ativa disponível"
        return 1
    fi
    
    local attempts=0
    local max_attempts=${#ACTIVE_INSTANCES[@]}
    
    while [[ $attempts -lt $max_attempts ]]; do
        CURRENT_INSTANCE=$(( (CURRENT_INSTANCE + 1) % ${#ACTIVE_INSTANCES[@]} ))
        local instance_id=${ACTIVE_INSTANCES[$CURRENT_INSTANCE]}
        local instance_pid=${INSTANCE_PIDS[$CURRENT_INSTANCE]}
        
        # Verificar se a instância ainda está viva
        if kill -0 "$instance_pid" 2>/dev/null; then
            # Verificar se precisa de restart preventivo
            local request_count=${INSTANCE_REQUEST_COUNT[$CURRENT_INSTANCE]}
            if [[ $request_count -ge $MASTER_RESTART_THRESHOLD ]]; then
                echo "🔄 Instância $instance_id atingiu limite de requests ($request_count), reiniciando..."
                restart_instance $instance_id
                sleep 2
            fi
            
            echo "$CURRENT_INSTANCE:$instance_id:${INSTANCE_PORTS[$CURRENT_INSTANCE]}"
            return 0
        else
            echo "⚠️ Instância $instance_id morreu, removendo do pool..."
            # Remover instância morta do pool (implementação simplificada)
            restart_instance $instance_id
        fi
        
        attempts=$((attempts + 1))
    done
    
    echo "❌ Nenhuma instância saudável encontrada"
    return 1
}

# Executar comando em instância específica
execute_on_instance() {
    local instance_info=$1
    local prompt=$2
    
    IFS=':' read -r instance_index instance_id port <<< "$instance_info"
    
    echo "🎯 Executando na instância $instance_id (porta $port)..."
    
    # Incrementar contador de requests
    INSTANCE_REQUEST_COUNT[$instance_index]=$((${INSTANCE_REQUEST_COUNT[$instance_index]} + 1))
    
    local log_file="$LOGS_DIR/instance_${instance_id}.log"
    local start_time=$(date +%s)
    
    # Executar com timeout e captura de erro
    if timeout 60s env -i \
        HOME="$HOME" \
        PATH="$PATH" \
        CLAUDE_CODE_SSE_PORT="$port" \
        node "$CLI_PATH" "$prompt" 2>>"$log_file"; then
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        # Reset contador de erros em caso de sucesso
        INSTANCE_ERROR_COUNT[$instance_index]=0
        
        echo "✅ Executado com sucesso na instância $instance_id (${duration}s)"
        echo "$(date): REQUEST SUCCESS ($duration s): $prompt" >> "$log_file"
        
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        # Incrementar contador de erros
        INSTANCE_ERROR_COUNT[$instance_index]=$((${INSTANCE_ERROR_COUNT[$instance_index]} + 1))
        local error_count=${INSTANCE_ERROR_COUNT[$instance_index]}
        
        echo "❌ Falha na instância $instance_id após ${duration}s (erro $error_count/${MASTER_ERROR_THRESHOLD})"
        echo "$(date): REQUEST FAILED ($duration s): $prompt" >> "$log_file"
        
        # Restart se muitos erros consecutivos
        if [[ $error_count -ge $MASTER_ERROR_THRESHOLD ]]; then
            echo "🔄 Instância $instance_id com muitos erros, reiniciando..."
            restart_instance $instance_id
            INSTANCE_ERROR_COUNT[$instance_index]=0
        fi
        
        return 1
    fi
}

# Verificar autenticação
ensure_authenticated() {
    echo "🔍 Verificando autenticação Claude..."
    
    # Testar se está logado
    if node "$CLI_PATH" auth status >/dev/null 2>&1; then
        echo "✅ Autenticação confirmada"
        return 0
    else
        echo "❌ Claude não está logado"
        echo ""
        echo "🔑 AÇÃO NECESSÁRIA: Faça login do Claude"
        echo "============================================"
        echo "1️⃣ Execute em outro terminal:"
        echo "   claude auth login"
        echo ""
        echo "2️⃣ Depois execute novamente este comando"
        echo ""
        echo "💡 O login precisa ser feito manualmente por segurança"
        return 1
    fi
}

# Interface principal - executa prompt com balanceamento automático
claude_execute() {
    local prompt="$*"
    
    if [[ -z "$prompt" ]]; then
        echo "❌ Nenhum prompt fornecido"
        return 1
    fi
    
    # Verificar autenticação primeiro
    if ! ensure_authenticated; then
        echo "❌ Não foi possível autenticar. Operação cancelada."
        return 1
    fi
    
    # Verificar se há instâncias rodando, senão iniciar
    if [[ ${#ACTIVE_INSTANCES[@]} -eq 0 ]]; then
        echo "🔄 Nenhuma instância ativa, inicializando..."
        if ! start_all_instances; then
            echo "❌ Falha ao inicializar instâncias"
            return 1
        fi
    fi
    
    # Obter próxima instância disponível
    local instance_info
    if instance_info=$(get_next_instance); then
        execute_on_instance "$instance_info" "$prompt"
    else
        echo "❌ Nenhuma instância disponível para executar o prompt"
        return 1
    fi
}

# Modo interativo
interactive_mode() {
    echo "🎮 Claude Master Controller - Modo Interativo"
    echo "=============================================="
    echo "💡 Digite seus prompts normalmente"
    echo "⚙️ Comandos especiais: .status, .restart, .quit"
    echo ""
    
    while true; do
        read -p "claude> " input
        
        case "$input" in
            ".quit"|".exit"|".q")
                echo "👋 Saindo..."
                break
                ;;
            ".status"|".s")
                show_status
                ;;
            ".restart"|".r")
                echo "🔄 Reiniciando todas as instâncias..."
                stop_all_instances
                start_all_instances
                ;;
            ".help"|".h")
                echo "Comandos especiais:"
                echo "  .status  - Mostrar status das instâncias"
                echo "  .restart - Reiniciar todas as instâncias"
                echo "  .quit    - Sair do modo interativo"
                ;;
            "")
                continue
                ;;
            *)
                claude_execute "$input"
                ;;
        esac
    done
}

# Carregar estado das instâncias dos arquivos PID
load_instance_state() {
    ACTIVE_INSTANCES=()
    INSTANCE_PIDS=()
    INSTANCE_PORTS=()
    INSTANCE_REQUEST_COUNT=()
    INSTANCE_ERROR_COUNT=()
    
    for i in $(seq 0 $((MASTER_NUM_INSTANCES - 1))); do
        local pid_file="$INSTANCES_DIR/instance_${i}.pid"
        if [[ -f "$pid_file" ]]; then
            local pid=$(cat "$pid_file")
            if kill -0 "$pid" 2>/dev/null; then
                local port=$(get_instance_port $i)
                ACTIVE_INSTANCES+=($i)
                INSTANCE_PIDS+=($pid)
                INSTANCE_PORTS+=($port)
                INSTANCE_REQUEST_COUNT+=(0)  # Reset counter
                INSTANCE_ERROR_COUNT+=(0)   # Reset counter
            else
                # Remover PID file de processo morto
                rm -f "$pid_file"
            fi
        fi
    done
}

# Mostrar status das instâncias
show_status() {
    # Carregar estado atual dos arquivos
    load_instance_state
    
    echo "📊 Status do Claude Master Controller"
    echo "====================================="
    echo "📁 Diretório: $CONTROLLER_DIR"
    echo "⚙️ Instâncias configuradas: $MASTER_NUM_INSTANCES"
    echo "🚀 Instâncias ativas: ${#ACTIVE_INSTANCES[@]}"
    echo ""
    
    if [[ ${#ACTIVE_INSTANCES[@]} -gt 0 ]]; then
        echo "🔍 Detalhes das Instâncias:"
        for i in "${!ACTIVE_INSTANCES[@]}"; do
            local instance_id=${ACTIVE_INSTANCES[$i]}
            local pid=${INSTANCE_PIDS[$i]}
            local port=${INSTANCE_PORTS[$i]}
            local requests=${INSTANCE_REQUEST_COUNT[$i]}
            local errors=${INSTANCE_ERROR_COUNT[$i]}
            local status="🟢 Ativa"
            
            if ! kill -0 "$pid" 2>/dev/null; then
                status="🔴 Morta"
            fi
            
            echo "  $((i+1)). Instância $instance_id - $status"
            echo "     🔌 Porta: $port"
            echo "     🆔 PID: $pid"
            echo "     📊 Requests: $requests"
            echo "     ❌ Erros: $errors"
            echo ""
        done
    else
        echo "❌ Nenhuma instância ativa"
        echo ""
        echo "💡 Para iniciar instâncias:"
        echo "   $0 start"
    fi
    
    echo "💾 Logs disponíveis em: $LOGS_DIR"
}

# Health check contínuo (background)
health_check_daemon() {
    while true; do
        sleep 30
        
        # Verificar instâncias mortas e reiniciar
        for i in "${!ACTIVE_INSTANCES[@]}"; do
            local instance_id=${ACTIVE_INSTANCES[$i]}
            local pid=${INSTANCE_PIDS[$i]}
            
            if ! kill -0 "$pid" 2>/dev/null; then
                echo "🚨 Instância $instance_id morreu, reiniciando..."
                restart_instance $instance_id
            fi
        done
    done
}

# Limpeza ao sair
cleanup_on_exit() {
    echo ""
    echo "🧹 Limpando e parando todas as instâncias..."
    stop_all_instances
    
    # Matar health check daemon
    jobs -p | xargs -r kill 2>/dev/null || true
    
    echo "✅ Limpeza concluída"
    exit 0
}

trap cleanup_on_exit SIGINT SIGTERM

# Menu principal
main() {
    init_config
    read_config
    
    case "${1:-interactive}" in
        "start")
            start_all_instances
            ;;
        "stop")
            stop_all_instances
            ;;
        "restart")
            stop_all_instances
            sleep 2
            start_all_instances
            ;;
        "status")
            show_status
            ;;
        "exec")
            shift
            claude_execute "$@"
            ;;
        "interactive"|"i")
            # Iniciar health check daemon
            health_check_daemon &
            
            # Inicializar instâncias se necessário
            if [[ ${#ACTIVE_INSTANCES[@]} -eq 0 ]]; then
                start_all_instances
            fi
            
            interactive_mode
            ;;
        "daemon")
            echo "🤖 Iniciando Claude Master Controller em modo daemon..."
            start_all_instances
            health_check_daemon
            ;;
        "help"|"-h"|"--help")
            echo "Claude Master Controller - Controle total do Claude Code"
            echo ""
            echo "Uso: $0 <comando> [argumentos]"
            echo ""
            echo "Comandos:"
            echo "  start                - Iniciar todas as instâncias"
            echo "  stop                 - Parar todas as instâncias"
            echo "  restart              - Reiniciar todas as instâncias"
            echo "  status               - Mostrar status"
            echo "  exec 'prompt'        - Executar prompt único"
            echo "  interactive          - Modo interativo (padrão)"
            echo "  daemon               - Modo daemon (sem interação)"
            echo "  help                 - Mostrar ajuda"
            echo ""
            echo "Exemplos:"
            echo "  $0                           # Modo interativo"
            echo "  $0 exec 'me ajude com código' # Execução única"
            echo "  $0 status                    # Ver status"
            ;;
        *)
            # Tratar como prompt direto
            claude_execute "$@"
            ;;
    esac
}

main "$@"