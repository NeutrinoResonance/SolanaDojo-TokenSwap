import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenSwap } from "../target/types/token_swap";

describe("token_swap", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.TokenSwap as Program<TokenSwap>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initializePool().rpc();
    console.log("Your transaction signature", tx);
  });
});
