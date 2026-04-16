# Contracts Package

## Files

- `src/IUltraVerifier.sol`: verifier interface.
- `src/PrivateLiquidityPool.sol`: private deposit/withdraw pool scaffold.

## TODOs Before Production

- Replace placeholder Merkle root update with proper incremental tree.
- Add denomination checks (fixed-size notes).
- Add reentrancy guard.
- Add pausable emergency controls with strict governance.
- Write full unit/integration tests.

## Suggested Tooling

Use Hardhat or Foundry for tests and deployment scripts.

## Commands

- `npm install`
- `npm test`
- `npm run deploy:local`
- `npm run deploy:sepolia`
