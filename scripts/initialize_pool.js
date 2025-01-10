const anchor = require('@coral-xyz/anchor');
const path = require('path');
const fs = require('fs');
const { PublicKey } = require("@solana/web3.js");
// const { TokenSwap } = require(path.resolve(__dirname, "../target/types/token_swap"));

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
    const mintA = new anchor.web3.PublicKey(mintAContent.match(/Address:\s+(\w+)/)[1]);
    const mintB = new anchor.web3.PublicKey(mintBContent.match(/Address:\s+(\w+)/)[1]);

    // Generate pool number and find PDAs
    const poolNumber = Date.now() % 1000000; // Use timestamp as a unique number
    const [poolPDA] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("pool"), new anchor.BN(poolNumber).toArrayLike(Buffer, 'le', 8)],
        program.programId
    );

    const [poolTokenA] = await PublicKey.findProgramAddress(
        [Buffer.from("pool_token_a"), new anchor.BN(poolNumber).toArrayLike(Buffer, 'le', 8)],
        program.programId
    );

    const [poolTokenB] = await PublicKey.findProgramAddress(
        [Buffer.from("pool_token_b"), new anchor.BN(poolNumber).toArrayLike(Buffer, 'le', 8)],
        program.programId
    );

    console.log("Pool Number:", poolNumber);
    console.log("Pool PDA:", poolPDA.toBase58());
    console.log("Provider wallet:", provider.wallet.publicKey.toBase58()); 
    console.log("programId:", program.programId.toBase58());
    console.log("Pool Token A Account:", poolTokenA.toBase58());
    console.log("Pool Token B Account:", poolTokenB.toBase58());
    console.log("Mint A:", mintA.toBase58());
    console.log("Mint B:", mintB.toBase58());

    // Initialize the pool with PDA token accounts
    const tx = await program.methods
        .initializePool(new anchor.BN(poolNumber))
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

    console.log("Transaction signature:", tx);
}

main().then(
    () => process.exit(),
    err => {
        console.error(err);
        process.exit(-1);
    },
);