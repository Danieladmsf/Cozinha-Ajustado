#!/bin/bash

# Lista das contas disponíveis
ACCOUNTS=(
    "admsfempresas@gmail.com"
    "cozinhaeafetorestaurante@gmail.com"
    "danielnotube@gmail.com"
)

LOG_FILE="/tmp/gemini_rotation.log"
INDEX_FILE="/tmp/gemini_account_index"

# Função de log
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

# Inicializa o índice se não existir
if [ ! -f "$INDEX_FILE" ]; then
    echo "0" > "$INDEX_FILE"
fi

# Função para testar se uma conta funciona (simulação)
test_account() {
    local account="$1"
    # Aqui você poderia fazer um teste real da API
    # Por enquanto, simula um teste básico
    gcloud config set account "$account" 2>/dev/null
    return $?
}

# Função para alternar para próxima conta
rotate_to_next() {
    local current_index=$(cat "$INDEX_FILE")
    local attempts=0
    
    while [ $attempts -lt ${#ACCOUNTS[@]} ]; do
        current_index=$(( (current_index + 1) % ${#ACCOUNTS[@]} ))
        local account="${ACCOUNTS[$current_index]}"
        
        log_message "Tentando conta: $account"
        
        if test_account "$account"; then
            echo "$current_index" > "$INDEX_FILE"
            log_message "✓ Alternado com sucesso para: $account"
            return 0
        else
            log_message "✗ Falha ao alternar para: $account"
        fi
        
        attempts=$((attempts + 1))
    done
    
    log_message "⚠ Todas as contas falharam!"
    return 1
}

# Função principal
main() {
    local current_account=$(gcloud config get-value account 2>/dev/null)
    log_message "Conta atual: $current_account"
    
    # Força rotação (pode ser modificado para detectar limites reais)
    rotate_to_next
}

# Executa apenas se chamado diretamente
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi