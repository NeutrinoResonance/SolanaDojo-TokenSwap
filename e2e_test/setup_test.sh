#!/bin/bash

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

backup_if_exists ".env"

bash ./generate_wallets.sh
bash ./generate_tokens.sh
bash ./setup_anchor_env.sh

echo "++++ Test setup complete ++++"
echo "In Bash, run \"source .env\" to set environment variables"
