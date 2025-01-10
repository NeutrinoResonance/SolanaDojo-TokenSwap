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
TOKEN_A_PATH=$PROJECT_ROOT/e2e_test/tokens/token_a.txt
TOKEN_B_PATH=$PROJECT_ROOT/e2e_test/tokens/token_b.txt

ACCOUNT_A_PATH=$PROJECT_ROOT/e2e_test/tokens/account_token_a.txt
ACCOUNT_B_PATH=$PROJECT_ROOT/e2e_test/tokens/account_token_b.txt


spl-token create-token >> $TOKEN_A_PATH
spl-token create-token >> $TOKEN_B_PATH

spl-token create-account $(extract_mint_address "$TOKEN_A_PATH") >> $ACCOUNT_A_PATH
spl-token create-account $(extract_mint_address "$TOKEN_B_PATH") >> $ACCOUNT_B_PATH
