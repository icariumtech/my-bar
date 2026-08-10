#!/bin/bash
# My Bar - Setup Script
# Run this script once after cloning the repository

set -e

echo "========================================"
echo "MY BAR SETUP"
echo "========================================"
echo ""

echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js 22 or higher"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "Found Node.js $NODE_VERSION"
echo ""

echo "Checking pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "pnpm not found — installing via corepack..."
    corepack enable pnpm
fi
PNPM_VERSION=$(pnpm --version)
echo "Found pnpm $PNPM_VERSION"
echo ""

echo "Step 1/4: Installing dependencies..."
pnpm install
echo "✓ Dependencies installed"
echo ""

echo "Step 2/4: Building shared package, server, and Barback app..."
pnpm build
echo "✓ Build complete"
echo ""

echo "Step 3/4: Applying database schema..."
pnpm --filter server db:push
echo "✓ Database schema applied"
echo ""

echo "Step 4/4: Example data seed (optional)..."
read -p "Seed the database with example ingredients/categories? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pnpm --filter server db:seed
    echo "✓ Example data seeded"
else
    echo "Skipped seeding — run 'pnpm --filter server db:seed' later if you want it"
fi
echo ""

echo "========================================"
echo "SETUP COMPLETE!"
echo "========================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the server:"
echo "   ./start_server.sh"
echo ""
echo "2. Access the Barback screen from this machine or any device on the LAN"
echo "   (start_server.sh prints the exact URLs)"
echo ""
