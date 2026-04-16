# Private DeFi Liquidity Pools via ZK-SNARKs

A capstone-ready project starter for building **privacy-preserving DeFi liquidity pools** where LP positions, allocations, and entry/exit details are hidden using ZK-SNARK proofs.

## Problem Statement

Public DeFi pools reveal:
- who deposited/withdrew,
- when they acted,
- and often enough data to infer strategy.

This project demonstrates a private pool design where users prove they are allowed to act **without revealing their identity or strategy details**.

## High-Level Goals

- Support private LP deposits into a pool contract.
- Support private withdrawals using zk proofs.
- Prevent double-spend with nullifiers.
- Keep verifiable auditability without exposing user strategy.

## Project Structure

- `contracts/` - Solidity contracts for pool logic and verifier integration.
- `circuits/` - Circom circuit templates for commitments and withdrawal proofs.
- `backend/` - Relayer + proof verification API starter.
- `frontend/` - React frontend starter for deposit/withdraw UX.
- `docs/` - Architecture, milestones, and deployment plan.

## Tech Stack

- Smart contracts: Solidity (`0.8.x`)
- ZK circuits: Circom + Groth16 (snarkjs flow)
- Backend: Node.js + Express + ethers
- Frontend: React + ethers
- Optional chain: Ethereum Sepolia / Polygon Amoy

## Core Privacy Flow

1. User generates secret `s` and commitment `C = Poseidon(s, amountBucket, tokenId)`.
2. User submits `deposit(commitment)` to the pool.
3. Merkle tree root is updated on-chain.
4. For withdrawal, user creates proof showing:
   - knowledge of leaf secret in the tree,
   - valid Merkle path to a known root,
   - nullifier is derived correctly from secret.
5. Contract verifies proof and marks nullifier as spent.

No direct link between deposit address and withdrawal address is revealed in plaintext logic.

## Quick Start (Local Development)

1. Install dependencies in each package:
   - `cd contracts && npm install`
   - `cd ../backend && npm install`
   - `cd ../frontend && npm install`
   - `cd ../circuits && npm install`
2. Read `docs/ARCHITECTURE.md` and `docs/ROADMAP.md`.
3. Run contract tests:
   - `cd contracts && npm test`
4. Configure backend relayer env:
   - `cp backend/.env.example backend/.env`
   - set `RPC_URL`, `RELAYER_PRIVATE_KEY`, `POOL_ADDRESS`
5. Start backend + frontend:
   - `cd backend && npm run dev`
   - `cd frontend && npm run dev`
6. Build proof assets in `circuits/`:
   - follow `circuits/README.md` flow (`compile`, `ptau`, `setup`, `proof`, `verify`)
7. Replace mock verifier with generated Groth16 verifier.

## Contract Deployment

- Local deployment:
  - `cd contracts`
  - `npm run deploy:local`
- Sepolia deployment:
  - `cp contracts/.env.example contracts/.env`
  - set `SEPOLIA_RPC_URL` and `PRIVATE_KEY`
  - `cd contracts && npm run deploy:sepolia`

## Running Full Demo

1. Deploy contracts and copy `PrivateLiquidityPool` and `MockToken` addresses.
2. Start backend with relayer config:
   - `cp backend/.env.example backend/.env`
   - set `RPC_URL`, `RELAYER_PRIVATE_KEY`, `POOL_ADDRESS`
   - `cd backend && npm run dev`
3. Start frontend:
   - `cd frontend && npm run dev`
   - set pool/token fields in UI and connect wallet.
4. Deposit from frontend, then produce proof in `circuits/` and submit withdraw via frontend.

## Suggested Final Year Deliverables

- Working testnet demo (private deposit + private withdraw).
- Threat model and privacy analysis report.
- Gas + proving time benchmarks.
- Comparison with public pool behavior.
- Future scope: private rebalancing, cross-chain privacy pools.

## Important Notes

- This starter is educational and not production-ready.
- Circuit currently uses an educational placeholder hash. Replace with Poseidon before publishing results.
- Always perform formal audits before mainnet deployment.
