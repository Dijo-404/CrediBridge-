#!/usr/bin/env bash
# One-time setup: build and deploy the CrediBridge Anchor escrow program to devnet.
#
# Prerequisites:
#   - Rust toolchain: https://rustup.rs
#   - Solana CLI:     sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
#   - Anchor CLI:     cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
#                     avm install 0.30.1 && avm use 0.30.1
#   - Funded devnet wallet (run: solana airdrop 4 --url devnet)
#
# Usage:
#   bash scripts/deploy-program.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROGRAM_DIR="$REPO_ROOT/programs/escrow"
IDL_DEST="$REPO_ROOT/apps/backend/src/lib"

echo "==> Building Anchor program..."
cd "$PROGRAM_DIR"
anchor build

echo "==> Deploying to devnet..."
anchor deploy --provider.cluster devnet 2>&1 | tee /tmp/anchor-deploy.log

# Extract the program ID from the deploy output
PROGRAM_ID=$(grep "Program Id:" /tmp/anchor-deploy.log | awk '{print $3}')
if [ -z "$PROGRAM_ID" ]; then
  echo "ERROR: Could not extract program ID from deploy output"
  cat /tmp/anchor-deploy.log
  exit 1
fi

echo ""
echo "======================================================"
echo "  Program deployed successfully!"
echo "  Program ID: $PROGRAM_ID"
echo "======================================================"
echo ""
echo "Next steps:"
echo "  1. Update declare_id! in programs/escrow/src/lib.rs:"
echo "     declare_id!(\"$PROGRAM_ID\");"
echo ""
echo "  2. Update Anchor.toml:"
echo "     [programs.devnet]"
echo "     credbridge_escrow = \"$PROGRAM_ID\""
echo ""
echo "  3. Set env var in .env:"
echo "     SOLANA_PROGRAM_ID=$PROGRAM_ID"
echo ""
echo "  4. Copy IDL to backend..."
mkdir -p "$IDL_DEST"
cp "$PROGRAM_DIR/target/idl/credbridge_escrow.json" "$IDL_DEST/"
echo "     IDL copied to $IDL_DEST/credbridge_escrow.json"
echo ""
echo "  5. Run the devnet seed script:"
echo "     tsx scripts/seed-devnet.ts"
