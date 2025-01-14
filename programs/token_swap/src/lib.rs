use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

declare_id!("6sicUYhh37rpGdLWQSrxRMshaUCgsteAHXcwn1jLmwUa");

#[program]
pub mod token_swap {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>, pool_name: String, initial_swap_rate: u64) -> Result<()> {
        ctx.accounts.pool.pool_name = pool_name;
        ctx.accounts.pool.swap_rate = initial_swap_rate;
        ctx.accounts.pool.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn initialize_pool_tokens(ctx: Context<InitializePoolTokens>) -> Result<()> {
        Ok(())
    }

    pub fn update_swap_rate(ctx: Context<UpdateSwapRate>, new_swap_rate: u64) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.pool.authority,
            ErrorCode::UnauthorizedPoolAccess
        );
        ctx.accounts.pool.swap_rate = new_swap_rate;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount_a: u64, amount_b: u64) -> Result<()> {
        // Transfer token A from depositor to pool
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.depositor_token_a.to_account_info(),
                    to: ctx.accounts.pool_token_a.to_account_info(),
                    authority: ctx.accounts.depositor.to_account_info(),
                }
            ),
            amount_a
        )?;

        // Transfer token B from depositor to pool
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.depositor_token_b.to_account_info(),
                    to: ctx.accounts.pool_token_b.to_account_info(),
                    authority: ctx.accounts.depositor.to_account_info(),
                }
            ),
            amount_b
        )?;

        Ok(())
    }

    pub fn swap(ctx: Context<Swap>, amount: u64) -> Result<()> {
        // Calculate amount of token B to receive using pool's swap rate
        let amount_b = amount
            .checked_mul(ctx.accounts.pool.swap_rate)
            .ok_or(ErrorCode::NumericalOverflow)?;

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
                    ctx.accounts.pool.pool_name.as_bytes(),
                    &[ctx.bumps.pool]
                ]]
            ),
            amount_b
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(pool_name: String)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"pool", pool_name.as_bytes()],
        bump,
        space = 8 + Pool::INIT_SPACE
    )]
    pub pool: Account<'info, Pool>,
    
    /// The authority that can update the swap rate
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateSwapRate<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    
    /// CHECK: Authority is checked in the instruction
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializePoolTokens<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,

    #[account(
        init,
        payer = payer,
        seeds = [b"pool_token_a", pool.pool_name.as_bytes()],
        bump,
        token::mint = mint_a,
        token::authority = pool
    )]
    pub pool_token_a: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = payer,
        seeds = [b"pool_token_b", pool.pool_name.as_bytes()],
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
pub struct Deposit<'info> {
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"pool_token_a", pool.pool_name.as_bytes()],
        bump,
        token::mint = mint_a,
        token::authority = pool
    )]
    pub pool_token_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"pool_token_b", pool.pool_name.as_bytes()],
        bump,
        token::mint = mint_b,
        token::authority = pool
    )]
    pub pool_token_b: Account<'info, TokenAccount>,

    pub mint_a: Account<'info, Mint>,
    pub mint_b: Account<'info, Mint>,

    #[account(mut)]
    pub depositor_token_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub depositor_token_b: Account<'info, TokenAccount>,

    pub depositor: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(
        seeds = [b"pool", pool.pool_name.as_bytes()],
        bump,
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"pool_token_a", pool.pool_name.as_bytes()],
        bump,
        token::mint = mint_a,
        token::authority = pool
    )]
    pub pool_token_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"pool_token_b", pool.pool_name.as_bytes()],
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
#[derive(InitSpace)]
pub struct Pool {
    #[max_len(32)]
    pub pool_name: String,
    pub swap_rate: u64,
    pub authority: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Numerical overflow")]
    NumericalOverflow,
    #[msg("Unauthorized access to pool")]
    UnauthorizedPoolAccess,
    #[msg("Pool name must be 32 characters or less")]
    PoolNameTooLong,
}
