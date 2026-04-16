# Circuits Package

This folder contains ZK circuit definitions for proving private LP note ownership and authorized withdrawal.

## Next Implementation Steps

- Add Poseidon hash components.
- Build Merkle path verifier gadgets.
- Define public signal order exactly matching contract logic:
  - `root`
  - `nullifierHash`
  - `recipient`
  - `token`
  - `amount`
- Generate proving/verifying keys using snarkjs.
- Export verifier contract and wire it in deployment.

## CLI Flow

1. `npm install`
2. `npm run compile`
3. `npm run ptau:new`
4. `npm run ptau:contribute`
5. `npm run ptau:prepare`
6. `npm run setup`
7. `npm run contribute`
8. `npm run vkey`
9. `cp input.example.json build/input.json`
10. `npm run proof`
11. `npm run verify`

After generating real keys, replace the mock verifier in contracts with your generated verifier contract.
