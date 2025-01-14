const anchor = require("@coral-xyz/anchor");
const fs = require("fs");

async function main() {
    // Configure the client
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Read the IDL
    const idlPath = './target/idl/token_swap.json';
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
    const programId = new anchor.web3.PublicKey(idl.account);

    // Get all accounts owned by the program
    const accounts = await provider.connection.getProgramAccounts(programId);
    
    console.log(`Found ${accounts.length} account(s):`);
    
    for (let account of accounts) {
        console.log("\nAccount:", account.pubkey.toString());
        console.log("Data length:", account.account.data.length);
        
        // Try to decode the account data using the IDL
        try {
            // The first 8 bytes are typically the discriminator
            const discriminator = account.account.data.slice(0, 8);
            const accountData = account.account.data.slice(8);
            
            console.log("Discriminator:", Buffer.from(discriminator).toString('hex'));
            console.log("Account data:", Buffer.from(accountData).toString('hex'));
        } catch (e) {
            console.log("Could not decode account data:", e);
        }
    }
}

main().then(
    () => process.exit(),
    err => {
        console.error(err);
        process.exit(-1);
    },
);
