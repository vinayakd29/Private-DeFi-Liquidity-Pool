# Architecture: Private DeFi Liquidity Pools

## Components

1. **Pool Contract (`PrivateLiquidityPool.sol`)**
   - Accepts private deposits with commitments.
   - Stores commitment tree root history.
   - Verifies withdrawal proofs with a verifier contract.
   - Tracks nullifiers to prevent double-withdraw.

2. **Verifier Contract (`IUltraVerifier.sol` compatible)**
   - Abstract verifier interface for Groth16/PLONK verifier.
   - Upgradable via constructor injection in prototype.

3. **ZK Circuit (`private_lp.circom`)**
   - Private inputs: secret, path elements, path indices.
   - Public outputs: root, nullifier, recipient hash, amount bucket.
   - Constraints guarantee membership + single-use nullifier logic.

4. **Backend Relayer**
   - Accepts signed withdrawal intents.
   - Validates proof input formatting.
   - Sends transaction on behalf of user (optional meta-tx model).

5. **Frontend**
   - Generates commitment from secret.
   - Builds witness + proof (client-side or delegated).
   - Submits deposit and withdrawal transactions.

## Trust Assumptions

- Verifier key generation (trusted setup) is done securely.
- Relayer does not censor all users (use multiple relayers).
- Pool owner/admin cannot arbitrarily steal funds (restrict admin powers).

## Threat Model

- **Front-running:** mitigated by nullifier and proof checks.
- **Replay attacks:** blocked via nullifier uniqueness.
- **Linkability attacks:** reduced by private proofs + recipient indirection.
- **MEV extraction:** still possible around token swaps; this design focuses on LP identity/strategy privacy.

## Data Model

- `commitment`: bytes32 leaf in Merkle tree.
- `root`: bytes32 valid historical root.
- `nullifierHash`: bytes32 unique per spent note.
- `token`: ERC20 pool token address.
- `amount`: canonical denomination bucket.

## Sequence

1. `deposit(token, amount, commitment)` stores commitment.
2. Off-chain indexer reconstructs tree and root snapshots.
3. User creates withdrawal proof against latest accepted root.
4. `withdraw(proof, root, nullifierHash, recipient, token, amount)` verifies and transfers.
