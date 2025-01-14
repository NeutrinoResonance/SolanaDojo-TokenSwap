#!/bin/bash
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || {
  DIR=$(pwd)
  while [ "$DIR" != "/" ]; do
    if [ -e "$DIR/Cargo.toml" ]; then
      echo "$DIR"
      exit 0
    fi
    DIR=$(dirname "$DIR")
  done
  echo "Error: Could not determine project root." >&2
  exit 1
})

backup_if_exists() {
    local file_path="$1"
    if [ -f "$file_path" ]; then
        local dir=$(dirname "$file_path")
        local base=$(basename "$file_path")
        local name="${base%.*}"
        local ext="${base##*.}"
        local counter=1
        
        while [ -f "${dir}/${name}_backup${counter}.${ext}" ]; do
            ((counter++))
        done
        
        mv "$file_path" "${dir}/${name}_backup${counter}.${ext}"
        echo "Created backup: ${dir}/${name}_backup${counter}.${ext}"
    fi
}

extract_account_address() {
    local output_file="$1"
    
    # Extract address that comes after "Creating account"
    grep "Creating account" "$output_file" | awk '{print $3}'
}

extract_mint_address() {
  local output_file="$1"

  if [[ ! -f "$output_file" ]]; then
    echo "Error: File '$output_file' does not exist."
    return 1
  fi

  # Extract the mint address
  local mint_address
  mint_address=$(grep -Eo "Creating token [A-Za-z0-9]+" "$output_file" | awk '{print $3}')

  if [[ -n "$mint_address" ]]; then
    echo "$mint_address"
  else
    echo "Error: Mint address not found in '$output_file'."
    return 1
  fi
}

mkdir -p ./tokens
TOKEN_A_PATH=$PROJECT_ROOT/e2e_test/tokens/output-spl_token_a.txt
TOKEN_B_PATH=$PROJECT_ROOT/e2e_test/tokens/output-spl_token_b.txt

ACCOUNT_A_PATH=$PROJECT_ROOT/e2e_test/tokens/account_token_a.txt
ACCOUNT_B_PATH=$PROJECT_ROOT/e2e_test/tokens/account_token_b.txt

backup_if_exists $TOKEN_A_PATH
backup_if_exists $TOKEN_B_PATH

backup_if_exists $ACCOUNT_A_PATH
backup_if_exists $ACCOUNT_B_PATH


spl-token create-token > $TOKEN_A_PATH
spl-token create-token > $TOKEN_B_PATH

MINT_ADDRESS_A=$(extract_mint_address "$TOKEN_A_PATH")
MINT_ADDRESS_B=$(extract_mint_address "$TOKEN_B_PATH")

echo "Token A mint address: $MINT_ADDRESS_A"
echo "Token B mint address: $MINT_ADDRESS_B"

spl-token create-account $MINT_ADDRESS_A > $ACCOUNT_A_PATH
spl-token create-account $MINT_ADDRESS_B > $ACCOUNT_B_PATH


TOKEN_ACCOUNT_A=$(extract_account_address "$ACCOUNT_A_PATH")
TOKEN_ACCOUNT_B=$(extract_account_address "$ACCOUNT_B_PATH")

spl-token mint $MINT_ADDRESS_A 1000000000 $TOKEN_ACCOUNT_A
spl-token mint $MINT_ADDRESS_B 1000000000 $TOKEN_ACCOUNT_B
