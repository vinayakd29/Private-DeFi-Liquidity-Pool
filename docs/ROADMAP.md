# Roadmap and Milestones

## Phase 1: Foundation (Week 1-2)

- Set up contracts, circuits, backend, and frontend skeleton.
- Implement pool storage and event schema.
- Finalize denomination strategy (fixed buckets recommended).

## Phase 2: ZK Circuit MVP (Week 3-5)

- Implement Merkle inclusion constraints.
- Implement nullifier derivation constraints.
- Generate proving/verifying keys.
- Add local proof generation scripts.

## Phase 3: Smart Contract Integration (Week 6-7)

- Integrate verifier contract.
- Add root history and nullifier checks.
- Write Hardhat tests for:
  - valid withdraw,
  - invalid proof,
  - reused nullifier.

## Phase 4: Full Stack Demo (Week 8-9)

- Frontend deposit/withdraw flows.
- Backend relayer and root sync endpoint.
- Testnet deployment and demo recording.

## Phase 5: Final Year Report (Week 10+)

- Benchmark proving time and gas.
- Compare with public AMM LP transparency model.
- Discuss compliance and privacy trade-offs.

## Stretch Goals

- Multi-asset private pool.
- Anonymous LP share accounting.
- Cross-chain privacy bridge support.
