const anchor = require('@coral-xyz/anchor');
const path = require('path');
const fs = require('fs');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');

async function main() {
    // Configure the client
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Load the program IDL.
    const idlPath = path.resolve(__dirname, '../target/idl/token_swap.json');
    if (!fs.existsSync(idlPath)) {
        throw new Error(`IDL file not found at ${idlPath}`);
    }

    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
    const program = new anchor.Program(idl, provider);

    // Load pool info from the JSON file
    const poolInfo = JSON.parse(fs.readFileSync('./e2e_test/pool-info.json', 'utf8'));
    const poolPDA = new anchor.web3.PublicKey(poolInfo.poolPDA);
    const poolTokenA = new anchor.web3.PublicKey(poolInfo.poolTokenA);
    const poolTokenB = new anchor.web3.PublicKey(poolInfo.poolTokenB);
    const mintA = new anchor.web3.PublicKey(poolInfo.mintA);
    const mintB = new anchor.web3.PublicKey(poolInfo.mintB);

    // Get the depositor's token accounts from the e2e_test files
    const accountAContent = fs.readFileSync('./e2e_test/tokens/account_token_a.txt', 'utf8');
    const accountBContent = fs.readFileSync('./e2e_test/tokens/account_token_b.txt', 'utf8');
    const depositorTokenA = new anchor.web3.PublicKey(accountAContent.match(/Creating\saccount\s+(\w+)/)[1]);
    const depositorTokenB = new anchor.web3.PublicKey(accountBContent.match(/Creating\saccount\s+(\w+)/)[1]);

    // Amount to deposit (in smallest units)
    const amountA = new anchor.BN(1000000); // 1 token A
    const amountB = new anchor.BN(1000000); // 1 token B

    async function getTokenBalance(tokenAccount) {
        try {
            const account = await provider.connection.getTokenAccountBalance(tokenAccount);
            return account.value.amount;
        } catch (error) {
            console.error('Error getting token balance:', error);
            return '0';
        }
    }

    try {
        // Get initial balances
        console.log("\nInitial balances:");
        console.log("Pool Token A:", await getTokenBalance(poolTokenA));
        console.log("Pool Token B:", await getTokenBalance(poolTokenB));
        console.log("Depositor Token A:", await getTokenBalance(depositorTokenA));
        console.log("Depositor Token B:", await getTokenBalance(depositorTokenB));

        // Perform deposit
        console.log("\nDepositing tokens...");
        console.log(`Amount A: ${amountA.toString()}`);
        console.log(`Amount B: ${amountB.toString()}`);

        const depositTx = await program.methods
            .deposit(amountA, amountB)
            .accounts({
                pool: poolPDA,
                poolTokenA: poolTokenA,
                poolTokenB: poolTokenB,
                mintA: mintA,
                mintB: mintB,
                depositorTokenA: depositorTokenA,
                depositorTokenB: depositorTokenB,
                depositor: provider.wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();

        console.log("Deposit transaction signature:", depositTx);

        // Get final balances
        console.log("\nFinal balances:");
        console.log("Pool Token A:", await getTokenBalance(poolTokenA));
        console.log("Pool Token B:", await getTokenBalance(poolTokenB));
        console.log("Depositor Token A:", await getTokenBalance(depositorTokenA));
        console.log("Depositor Token B:", await getTokenBalance(depositorTokenB));

        console.log("\n✅ Deposit test completed successfully!");

    } catch (error) {
        console.error("\n❌ Error during deposit test:");
        console.error(error);
        if (error.logs) {
            console.error("\nProgram logs:");
            console.error(error.logs);
        }
        throw error;
    }
}

main().then(
    () => process.exit(),
    err => {
        console.error(err);
        process.exit(-1);
    },
);
