use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

declare_id!("6sicUYhh37rpGdLWQSrxRMshaUCgsteAHXcwn1jLmwUa");

#[program]
pub mod token_swap {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>, pool_number: u64) -> Result<()> {
        ctx.accounts.pool.pool_number = pool_number;
        Ok(())
    }

    pub fn initialize_pool_tokens(ctx: Context<InitializePoolTokens>) -> Result<()> {
        Ok(())
    }

    pub fn swap(ctx: Context<Swap>, amount: u64, swap_rate: u64) -> Result<()> {
        // Calculate amount of token B to receive
        let amount_b = amount.checked_mul(swap_rate).ok_or(ErrorCode::NumericalOverflow)?;

        // Transfer token A from user to pool
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_a.to_account_info(),
                    to: ctx.accounts.pool_token_a.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                }
            ),
            amount
        )?;

        // Transfer token B from pool to user using PDA signing
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_token_b.to_account_info(),
                    to: ctx.accounts.user_token_b.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                &[&[
                    b"pool",
                    &ctx.accounts.pool.pool_number.to_le_bytes(),
                    &[ctx.bumps.pool]
                ]]
            ),
            amount_b
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(pool_number: u64)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"pool", pool_number.to_le_bytes().as_ref()],
        bump,
        space = 8 + 8  // discriminator + pool_number
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializePoolTokens<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,

    #[account(
        init,
        payer = payer,
        seeds = [b"pool_token_a", pool.pool_number.to_le_bytes().as_ref()],
        bump,
        token::mint = mint_a,
        token::authority = pool
    )]
    pub pool_token_a: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = payer,
        seeds = [b"pool_token_b", pool.pool_number.to_le_bytes().as_ref()],
        bump,
        token::mint = mint_b,
        token::authority = pool
    )]
    pub pool_token_b: Account<'info, TokenAccount>,

    pub mint_a: Account<'info, Mint>,
    pub mint_b: Account<'info, Mint>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(
        seeds = [b"pool", pool.pool_number.to_le_bytes().as_ref()],
        bump,
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"pool_token_a", pool.pool_number.to_le_bytes().as_ref()],
        bump,
        token::mint = mint_a,
        token::authority = pool
    )]
    pub pool_token_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"pool_token_b", pool.pool_number.to_le_bytes().as_ref()],
        bump,
        token::mint = mint_b,
        token::authority = pool
    )]
    pub pool_token_b: Account<'info, TokenAccount>,

    pub mint_a: Account<'info, Mint>,
    pub mint_b: Account<'info, Mint>,

    #[account(mut)]
    pub user_token_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_b: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Pool {
    pub pool_number: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Numerical overflow")]
    NumericalOverflow,
}
