# Setup
```
agave-install init 1.18.26
avm use 0.30.1
rustup override set 1.75.0-x86_64-apple-darwin
```

# Build
`anchor build`
`anchor deploy --provider.cluster localnet --provider.wallet #<ABSPATH(/e2e_test/keys/deployer-keypair.json)>`

# Test Environment Setup
## 
`
## 
`export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899`
`export ANCHOR_WALLET=`realpath ./e2e_test/keys/deployer-keypair.json``

