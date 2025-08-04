#!/bin/bash
# Script para parar a limpeza contínua do Claude

PIDFILE="/tmp/limpar_claude.pid"
LOGFILE="/tmp/limpar_claude.log"

if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    
    if ps -p $PID > /dev/null 2>&1; then
        echo "Parando processo de limpeza (PID: $PID)..."
        kill $PID
        
        # Aguarda o processo terminar
        sleep 2
        
        if ps -p $PID > /dev/null 2>&1; then
            echo "Forçando parada do processo..."
            kill -9 $PID
        fi
        
        rm -f "$PIDFILE"
        echo "$(date): Processo de limpeza parado" >> "$LOGFILE"
        echo "Processo de limpeza parado com sucesso!"
    else
        echo "Processo não está rodando"
        rm -f "$PIDFILE"
    fi
else
    echo "Nenhum processo de limpeza encontrado"
fi