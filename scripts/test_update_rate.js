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
    const program = new anchor.Program(idl, provider);

    // Load pool info from the JSON file
    const poolInfo = JSON.parse(fs.readFileSync('./e2e_test/pool-info.json', 'utf8'));
    const poolPDA = new anchor.web3.PublicKey(poolInfo.poolPDA);

    // Fetch current pool data
    const poolAccount = await program.account.pool.fetch(poolPDA);
    console.log("\nCurrent pool state:");
    console.log("Pool Name:", poolAccount.poolName);
    console.log("Current Swap Rate:", poolAccount.swapRate.toString());
    console.log("Authority:", poolAccount.authority.toBase58());

    // Test updating the swap rate
    const newSwapRate = new anchor.BN(3); // Change rate from 2:1 to 3:1
    
    try {
        console.log("\nUpdating swap rate to:", newSwapRate.toString());
        
        const updateTx = await program.methods
            .updateSwapRate(newSwapRate)
            .accounts({
                pool: poolPDA,
                authority: provider.wallet.publicKey,
            })
            .rpc();
            
        console.log("Update transaction signature:", updateTx);

        // Fetch and verify the updated pool data
        const updatedPool = await program.account.pool.fetch(poolPDA);
        console.log("\nUpdated pool state:");
        console.log("Pool Name:", updatedPool.poolName);
        console.log("New Swap Rate:", updatedPool.swapRate.toString());
        console.log("Authority:", updatedPool.authority.toBase58());

        // Verify the update
        if (updatedPool.swapRate.eq(newSwapRate)) {
            console.log("\n✅ Swap rate successfully updated!");
        } else {
            console.log("\n❌ Swap rate update failed! Rate did not change as expected.");
        }

    } catch (error) {
        console.error("\n❌ Error updating swap rate:");
        console.error(error);
        // Log more details if it's an Anchor error
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
