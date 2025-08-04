#!/bin/bash
# Script para iniciar a limpeza em segundo plano

echo "Iniciando limpeza contínua do Claude em segundo plano..."

# Executa o script principal em segundo plano
nohup bash /home/user/studio/limpar_claude.sh > /dev/null 2>&1 &

echo "Limpeza iniciada! PID: $!"
echo "Use 'bash /home/user/studio/parar_limpeza.sh' para parar"
echo "Log em: /tmp/limpar_claude.log"