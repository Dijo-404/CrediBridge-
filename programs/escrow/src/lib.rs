use anchor_lang::prelude::*;
use anchor_spl::token_2022::{self, Token2022, TransferChecked};
use anchor_spl::token_interface::{Mint, TokenAccount};

declare_id!("11111111111111111111111111111111"); // Replace with deployed program ID

#[program]
pub mod credbridge_escrow {
	use super::*;

	pub fn initialize_vault(
		ctx: Context<InitializeVault>,
		vendor_id: [u8; 32],
		purpose_code: String,
	) -> Result<()> {
		require!(purpose_code.len() <= 8, EscrowError::PurposeCodeTooLong);

		let vault = &mut ctx.accounts.vault;
		vault.vendor_id = vendor_id;
		vault.purpose_code = purpose_code.clone();
		vault.authority = ctx.accounts.authority.key();
		vault.mint = ctx.accounts.mint.key();
		vault.bump = ctx.bumps.vault;
		vault.amount = 0;
		vault.is_active = true;

		emit!(VaultInitialized {
			vault: vault.key(),
			vendor_id,
			purpose_code,
		});
		Ok(())
	}

	pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
		require!(ctx.accounts.vault.is_active, EscrowError::VaultInactive);
		require!(amount > 0, EscrowError::ZeroAmount);

		let cpi_accounts = TransferChecked {
			from: ctx.accounts.payer_token.to_account_info(),
			mint: ctx.accounts.mint.to_account_info(),
			to: ctx.accounts.vault_token.to_account_info(),
			authority: ctx.accounts.payer.to_account_info(),
		};
		let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts)
			.with_remaining_accounts(ctx.remaining_accounts.to_vec());

		// Token-2022 extensions like Confidential Transfer and Transfer Hook
		// are enforced by the mint and any program-owned hooks.
		token_2022::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

		let vault = &mut ctx.accounts.vault;
		vault.amount = vault.amount.checked_add(amount).ok_or(EscrowError::Overflow)?;

		emit!(DepositEvent {
			vault: vault.key(),
			amount,
			timestamp: Clock::get()?.unix_timestamp,
		});
		Ok(())
	}

	pub fn release_to_offramp(ctx: Context<Release>, amount: u64) -> Result<()> {
		require!(ctx.accounts.vault.is_active, EscrowError::VaultInactive);
		require!(amount > 0, EscrowError::ZeroAmount);
		require!(
			ctx.accounts.vault.amount >= amount,
			EscrowError::InsufficientFunds
		);

		let vendor_id = ctx.accounts.vault.vendor_id;
		let bump = ctx.accounts.vault.bump;
		let seeds: &[&[u8]] = &[b"vault", vendor_id.as_ref(), &[bump]];
		let signer_seeds: &[&[&[u8]]] = &[seeds];

		let cpi_accounts = TransferChecked {
			from: ctx.accounts.vault_token.to_account_info(),
			mint: ctx.accounts.mint.to_account_info(),
			to: ctx.accounts.offramp_token.to_account_info(),
			authority: ctx.accounts.vault.to_account_info(),
		};
		let cpi_ctx = CpiContext::new_with_signer(
			ctx.accounts.token_program.to_account_info(),
			cpi_accounts,
			signer_seeds,
		)
		.with_remaining_accounts(ctx.remaining_accounts.to_vec());

		token_2022::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

		let vault = &mut ctx.accounts.vault;
		vault.amount = vault.amount.checked_sub(amount).ok_or(EscrowError::Overflow)?;

		emit!(ReleaseEvent {
			vault: vault.key(),
			amount,
			timestamp: Clock::get()?.unix_timestamp,
		});
		Ok(())
	}

	pub fn deactivate_vault(ctx: Context<Deactivate>) -> Result<()> {
		ctx.accounts.vault.is_active = false;
		Ok(())
	}
}

#[derive(Accounts)]
#[instruction(vendor_id: [u8; 32])]
pub struct InitializeVault<'info> {
	#[account(
		init,
		payer = authority,
		space = 8 + EscrowVault::MAX_SIZE,
		seeds = [b"vault", vendor_id.as_ref()],
		bump
	)]
	pub vault: Account<'info, EscrowVault>,
	pub mint: InterfaceAccount<'info, Mint>,
	#[account(mut)]
	pub authority: Signer<'info>,
	pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
	#[account(
		mut,
		seeds = [b"vault", vault.vendor_id.as_ref()],
		bump = vault.bump,
		has_one = mint,
	)]
	pub vault: Account<'info, EscrowVault>,
	#[account(mut)]
	pub payer: Signer<'info>,
	#[account(mut)]
	pub payer_token: InterfaceAccount<'info, TokenAccount>,
	#[account(mut)]
	pub vault_token: InterfaceAccount<'info, TokenAccount>,
	pub mint: InterfaceAccount<'info, Mint>,
	pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct Release<'info> {
	#[account(
		mut,
		seeds = [b"vault", vault.vendor_id.as_ref()],
		bump = vault.bump,
		has_one = mint,
		has_one = authority,
	)]
	pub vault: Account<'info, EscrowVault>,
	pub authority: Signer<'info>,
	#[account(mut)]
	pub vault_token: InterfaceAccount<'info, TokenAccount>,
	#[account(mut)]
	pub offramp_token: InterfaceAccount<'info, TokenAccount>,
	pub mint: InterfaceAccount<'info, Mint>,
	pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct Deactivate<'info> {
	#[account(mut, has_one = authority)]
	pub vault: Account<'info, EscrowVault>,
	pub authority: Signer<'info>,
}

#[account]
pub struct EscrowVault {
	pub vendor_id: [u8; 32],
	pub purpose_code: String,
	pub authority: Pubkey,
	pub mint: Pubkey,
	pub amount: u64,
	pub bump: u8,
	pub is_active: bool,
}

impl EscrowVault {
	// vendor_id (32) + String prefix (4) + max 8 chars + authority (32)
	// + mint (32) + amount (8) + bump (1) + is_active (1)
	pub const MAX_SIZE: usize = 32 + 4 + 8 + 32 + 32 + 8 + 1 + 1;
}

#[event]
pub struct VaultInitialized {
	pub vault: Pubkey,
	pub vendor_id: [u8; 32],
	pub purpose_code: String,
}

#[event]
pub struct DepositEvent {
	pub vault: Pubkey,
	pub amount: u64,
	pub timestamp: i64,
}

#[event]
pub struct ReleaseEvent {
	pub vault: Pubkey,
	pub amount: u64,
	pub timestamp: i64,
}

#[error_code]
pub enum EscrowError {
	#[msg("Insufficient funds in vault")]
	InsufficientFunds,
	#[msg("Vault is inactive")]
	VaultInactive,
	#[msg("Amount must be greater than zero")]
	ZeroAmount,
	#[msg("Purpose code exceeds 8 characters")]
	PurposeCodeTooLong,
	#[msg("Arithmetic overflow")]
	Overflow,
}
