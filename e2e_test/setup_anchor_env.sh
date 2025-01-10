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

echo "export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899" >> $PROJECT_ROOT/e2e_test/.env
echo "export ANCHOR_WALLET=$PROJECT_ROOT/e2e_test/keys/deployer-keypair.json" >> $PROJECT_ROOT/e2e_test/.env
echo "export ANCHOR_PROVIDER_WALLET=$PROJECT_ROOT/e2e_test/keys/deployer-keypair.json" >> $PROJECT_ROOT/e2e_test/.env
echo "export SOLANA_KEYPAIR=$PROJECT_ROOT/e2e_test/keys/deployer-keypair.json" >> $PROJECT_ROOT/e2e_test/.env