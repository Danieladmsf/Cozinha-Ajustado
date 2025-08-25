#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROTATION_SCRIPT="$SCRIPT_DIR/random-gemini-rotation.sh"
PID_FILE="/tmp/gemini_rotation.pid"

start_daemon() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "❌ Daemon já está rodando (PID: $(cat "$PID_FILE"))"
        return 1
    fi
    
    echo "🚀 Iniciando daemon de rotação aleatória..."
    
    # Executa em background
    (
        while true; do
            "$ROTATION_SCRIPT"
            sleep 60  # Espera 1 minuto
        done
    ) &
    
    # Salva o PID
    echo $! > "$PID_FILE"
    echo "✅ Daemon iniciado com PID: $(cat "$PID_FILE")"
    echo "📝 Para parar: $0 stop"
}

stop_daemon() {
    if [ ! -f "$PID_FILE" ]; then
        echo "❌ Daemon não está rodando"
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    if kill "$pid" 2>/dev/null; then
        rm -f "$PID_FILE"
        echo "✅ Daemon parado (PID: $pid)"
    else
        echo "❌ Erro ao parar daemon (PID: $pid)"
        rm -f "$PID_FILE"
    fi
}

status_daemon() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "✅ Daemon rodando (PID: $(cat "$PID_FILE"))"
        echo "📊 Log: tail -f /tmp/gemini_rotation.log"
    else
        echo "❌ Daemon não está rodando"
        [ -f "$PID_FILE" ] && rm -f "$PID_FILE"
    fi
}

case "$1" in
    start)
        start_daemon
        ;;
    stop)
        stop_daemon
        ;;
    restart)
        stop_daemon
        sleep 2
        start_daemon
        ;;
    status)
        status_daemon
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|status}"
        echo ""
        echo "Comandos:"
        echo "  start   - Inicia rotação a cada minuto"
        echo "  stop    - Para a rotação"
        echo "  restart - Reinicia a rotação"
        echo "  status  - Verifica se está rodando"
        echo ""
        echo "Para ver logs: tail -f /tmp/gemini_rotation.log"
        ;;
esac