#!/bin/bash

# Lista das contas disponíveis
ACCOUNTS=(
    "admsfempresas@gmail.com"
    "cozinhaeafetorestaurante@gmail.com"
    "danielnotube@gmail.com"
)

# Arquivo para salvar o índice da conta atual
INDEX_FILE="/tmp/gemini_account_index"

# Inicializa o índice se não existir
if [ ! -f "$INDEX_FILE" ]; then
    echo "0" > "$INDEX_FILE"
fi

# Função para obter a próxima conta
get_next_account() {
    local current_index=$(cat "$INDEX_FILE")
    local next_index=$(( (current_index + 1) % ${#ACCOUNTS[@]} ))
    echo "$next_index" > "$INDEX_FILE"
    echo "${ACCOUNTS[$next_index]}"
}

# Função para alternar conta
switch_account() {
    local account="$1"
    echo "$(date): Alternando para conta: $account"
    gcloud config set account "$account" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "$(date): Conta alternada com sucesso para: $account"
    else
        echo "$(date): Erro ao alternar para conta: $account"
    fi
}

# Função para verificar se precisa alternar (pode ser expandida)
should_rotate() {
    # Por enquanto, alterna a cada execução
    # Você pode adicionar lógica para detectar limite atingido
    return 0
}

# Execução principal
if should_rotate; then
    next_account=$(get_next_account)
    switch_account "$next_account"
else
    current_account=$(gcloud config get-value account 2>/dev/null)
    echo "$(date): Mantendo conta atual: $current_account"
fi