#!/bin/bash

# Lista das contas disponíveis
ACCOUNTS=(
    "admsfempresas@gmail.com"
    "cozinhaeafetorestaurante@gmail.com"
    "danielnotube@gmail.com"
)

LOG_FILE="/tmp/gemini_rotation.log"

# Função de log
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

# Função para selecionar conta aleatória
select_random_account() {
    local current_account=$(gcloud config get-value account 2>/dev/null)
    local available_accounts=()
    
    # Cria array com contas diferentes da atual
    for account in "${ACCOUNTS[@]}"; do
        if [ "$account" != "$current_account" ]; then
            available_accounts+=("$account")
        fi
    done
    
    # Se todas as contas são iguais à atual, usa qualquer uma
    if [ ${#available_accounts[@]} -eq 0 ]; then
        available_accounts=("${ACCOUNTS[@]}")
    fi
    
    # Seleciona aleatoriamente
    local random_index=$((RANDOM % ${#available_accounts[@]}))
    echo "${available_accounts[$random_index]}"
}

# Função para alternar conta
switch_to_account() {
    local account="$1"
    local current_account=$(gcloud config get-value account 2>/dev/null)
    
    if [ "$account" == "$current_account" ]; then
        log_message "👤 Já usando a conta: $account"
        return 0
    fi
    
    log_message "🔄 Alternando de [$current_account] para [$account]"
    
    if gcloud config set account "$account" 2>/dev/null; then
        log_message "✅ Alternado com sucesso para: $account"
        return 0
    else
        log_message "❌ Erro ao alternar para: $account"
        return 1
    fi
}

# Execução principal
main() {
    local random_account=$(select_random_account)
    switch_to_account "$random_account"
}

# Executa apenas se chamado diretamente
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi