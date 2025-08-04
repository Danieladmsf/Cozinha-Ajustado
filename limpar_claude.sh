#!/bin/bash
# Este script remove os diretórios de configuração e cache do Claude a cada 30 segundos.

PIDFILE="/tmp/limpar_claude.pid"
LOGFILE="/tmp/limpar_claude.log"

# Verifica se já está rodando
if [ -f "$PIDFILE" ]; then
    if ps -p $(cat "$PIDFILE") > /dev/null 2>&1; then
        echo "Script já está rodando (PID: $(cat $PIDFILE))"
        exit 1
    else
        rm -f "$PIDFILE"
    fi
fi

# Salva o PID
echo $$ > "$PIDFILE"

echo "$(date): Iniciando limpeza contínua do Claude em segundo plano..." >> "$LOGFILE"
echo "PID: $$" >> "$LOGFILE"

while true; do
    echo "$(date): Executando limpeza..." >> "$LOGFILE"
    
    # Remove o diretório de configuração principal
    rm -rf "/home/user/.claude/"
    mkdir -p "/home/user/.claude/"
    rm -rf "/home/user/.claude/"

    # Remove o diretório de cache
    rm -rf "/home/user/.cache/claude-cli-nodejs/"
    mkdir -p "/home/user/.cache/claude-cli-nodejs/"
    rm -rf "/home/user/.cache/claude-cli-nodejs/"

    # Força remoção de qualquer arquivo restante
    find /home/user -name "*claude*" -type d 2>/dev/null | grep -E "(\.claude|claude-cli)" | xargs rm -rf 2>/dev/null

    echo "$(date): Limpeza concluída. Aguardando 30 segundos..." >> "$LOGFILE"
    sleep 30
done