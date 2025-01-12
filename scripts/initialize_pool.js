const anchor = require('@coral-xyz/anchor');
const path = require('path');
const fs = require('fs');

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

    // Generate the program client from IDL.
    const program = new anchor.Program(idl, provider);

    // Get token mints from e2e_test files
    const mintAContent = fs.readFileSync('./e2e_test/tokens/output-spl_token_a.txt', 'utf8');
    const mintBContent = fs.readFileSync('./e2e_test/tokens/output-spl_token_b.txt', 'utf8');
    console.log(mintAContent);
    console.log(mintBContent);

    const mintA = new anchor.web3.PublicKey(mintAContent.match(/Address:\s+(\w+)/)[1]);
    const mintB = new anchor.web3.PublicKey(mintBContent.match(/Address:\s+(\w+)/)[1]);

    // Pool configuration
    const poolName = "solana-eth";  // Example pool name
    const initialSwapRate = new anchor.BN(2); // 2:1 swap rate
    
    const [poolPDA] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("pool"), Buffer.from(poolName)],
        program.programId
    );

    const [poolTokenA] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("pool_token_a"), Buffer.from(poolName)],
        program.programId
    );

    const [poolTokenB] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("pool_token_b"), Buffer.from(poolName)],
        program.programId
    );

    console.log("Pool Name:", poolName);
    console.log("Initial Swap Rate:", initialSwapRate.toString());
    console.log("Pool Authority:", provider.wallet.publicKey.toBase58());
    console.log("Pool PDA:", poolPDA.toBase58());
    console.log("Provider wallet:", provider.wallet.publicKey.toBase58()); 
    console.log("programId:", program.programId.toBase58());
    console.log("Pool Token A Account:", poolTokenA.toBase58());
    console.log("Pool Token B Account:", poolTokenB.toBase58());
    console.log("Mint A:", mintA.toBase58());
    console.log("Mint B:", mintB.toBase58());


    try {
        // Step 1: Initialize the pool with initial swap rate
        console.log("\nStep 1: Initializing pool...");
        const initPoolTx = await program.methods
            .initializePool(poolName, initialSwapRate)
            .accounts({
                pool: poolPDA,
                authority: provider.wallet.publicKey,
                payer: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
        console.log("Pool initialized. Transaction signature:", initPoolTx);

        // Step 2: Initialize the token accounts
        console.log("\nStep 2: Initializing pool token accounts...");
        const initTokensTx = await program.methods
            .initializePoolTokens()
            .accounts({
                pool: poolPDA,
                poolTokenA: poolTokenA,
                poolTokenB: poolTokenB,
                mintA: mintA,
                mintB: mintB,
                payer: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
                tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .rpc();
        console.log("Token accounts initialized. Transaction signature:", initTokensTx);

        // Save pool info for later use
        const poolInfo = {
            poolName,
            initialSwapRate: initialSwapRate.toString(),
            authority: provider.wallet.publicKey.toBase58(),
            poolPDA: poolPDA.toBase58(),
            poolTokenA: poolTokenA.toBase58(),
            poolTokenB: poolTokenB.toBase58(),
            mintA: mintA.toBase58(),
            mintB: mintB.toBase58(),
        };
        fs.writeFileSync('./e2e_test/pool-info.json', JSON.stringify(poolInfo, null, 2));
        console.log("\nPool information saved to e2e_test/pool-info.json");

    } catch (error) {
        console.error("Error:", error);
        // Log more details if it's an Anchor error
        if (error.logs) {
            console.error("Program logs:", error.logs);
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