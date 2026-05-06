use anchor_lang::prelude::*;
use anchor_spl::token_2022::{self, Mint, Token2022, TokenAccount, TransferChecked};

declare_id!("11111111111111111111111111111111"); // Replace with deployed program ID

#[program]
pub mod credbridge_escrow {
	use super::*;

	pub fn initialize_vault(
		ctx: Context<InitializeVault>,
		vendor_id: [u8; 32],
		purpose_code: String,
	) -> Result<()> {
		let vault = &mut ctx.accounts.vault;
		vault.vendor_id = vendor_id;
		vault.purpose_code = purpose_code;
		vault.authority = ctx.accounts.authority.key();
		vault.amount = 0;
		vault.is_active = true;
		Ok(())
	}

	pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
		let cpi_accounts = TransferChecked {
			from: ctx.accounts.payer_token.to_account_info(),
			mint: ctx.accounts.mint.to_account_info(),
			to: ctx.accounts.vault_token.to_account_info(),
			authority: ctx.accounts.authority.to_account_info(),
		};
		let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts)
			.with_remaining_accounts(ctx.remaining_accounts.to_vec());

		// Token-2022 extensions like Confidential Transfer and Transfer Hook are enforced by the mint.
		token_2022::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

		ctx.accounts.vault.amount = ctx.accounts.vault.amount.saturating_add(amount);
		Ok(())
	}

	pub fn release_to_offramp(ctx: Context<Release>, amount: u64) -> Result<()> {
		require!(ctx.accounts.vault.amount >= amount, EscrowError::InsufficientFunds);

		let cpi_accounts = TransferChecked {
			from: ctx.accounts.vault_token.to_account_info(),
			mint: ctx.accounts.mint.to_account_info(),
			to: ctx.accounts.offramp_token.to_account_info(),
			authority: ctx.accounts.authority.to_account_info(),
		};
		let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts)
			.with_remaining_accounts(ctx.remaining_accounts.to_vec());

		token_2022::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;
		ctx.accounts.vault.amount = ctx.accounts.vault.amount.saturating_sub(amount);
		Ok(())
	}
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
	#[account(init, payer = authority, space = 8 + EscrowVault::MAX_SIZE)]
	pub vault: Account<'info, EscrowVault>,
	#[account(mut)]
	pub authority: Signer<'info>,
	pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
	#[account(mut, has_one = authority)]
	pub vault: Account<'info, EscrowVault>,
	pub authority: Signer<'info>,
	#[account(mut)]
	pub payer_token: Account<'info, TokenAccount>,
	#[account(mut)]
	pub vault_token: Account<'info, TokenAccount>,
	pub mint: Account<'info, Mint>,
	pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct Release<'info> {
	#[account(mut, has_one = authority)]
	pub vault: Account<'info, EscrowVault>,
	pub authority: Signer<'info>,
	#[account(mut)]
	pub vault_token: Account<'info, TokenAccount>,
	#[account(mut)]
	pub offramp_token: Account<'info, TokenAccount>,
	pub mint: Account<'info, Mint>,
	pub token_program: Program<'info, Token2022>,
}

#[account]
pub struct EscrowVault {
	pub vendor_id: [u8; 32],
	pub purpose_code: String,
	pub authority: Pubkey,
	pub amount: u64,
	pub is_active: bool,
}

impl EscrowVault {
	pub const MAX_SIZE: usize = 32 + 4 + 16 + 32 + 8 + 1;
}

#[error_code]
pub enum EscrowError {
	#[msg("Insufficient funds in vault")]
	InsufficientFunds,
}
