#!/bin/bash
mkdir -p ./keys

# Deployer wallet
solana-keygen new --outfile ./keys/deployer-keypair.json
echo export DEPLOYER_WALLET=$(solana-keygen pubkey ./keys/deployer-keypair.json) >> .env

# User wallet
solana-keygen new --no-bip39-passphrase --outfile ./keys/user1-keypair.json
solana-keygen new --no-bip39-passphrase --outfile ./keys/user2-keypair.json

echo export USER1_WALLET=$(solana-keygen pubkey ./keys/user1-keypair.json) >> .env
echo export USER2_WALLET=$(solana-keygen pubkey ./keys/user2-keypair.json) >> .env

solana airdrop 2 $DEPLOYER_WALLET
solana airdrop 2 $USER1_WALLET
solana airdrop 2 $USER2_WALLET