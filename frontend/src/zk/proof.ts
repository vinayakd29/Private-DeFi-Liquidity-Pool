import { AbiCoder, keccak256, toUtf8Bytes } from "ethers";

/** BN128 scalar field (same order circom uses for overflow semantics). */
export const SNARK_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export const TREE_DEPTH = 20;

export function circuitHash(left: bigint, right: bigint): bigint {
  return (left * 131n + right * 137n + 17n) % SNARK_FIELD;
}

/** Map an arbitrary string secret to a field element (deterministic). */
export function secretToField(secret: string): bigint {
  const h = BigInt(keccak256(toUtf8Bytes(secret)));
  return h % SNARK_FIELD;
}

/**
 * Demo witness: left-most path in the educational tree (all zero siblings),
 * matching `circuits/scripts/generate-sample-input.js`.
 */
export function buildDemoWithdrawInput(params: {
  secret: string;
  tokenAddress: string;
  amountWei: bigint;
  recipientAddress: string;
}): Record<string, string | string[]> {
  const secret = secretToField(params.secret);
  const token = BigInt(params.tokenAddress);
  const amount = params.amountWei % SNARK_FIELD;
  const recipient = BigInt(params.recipientAddress);

  const pathElements = Array<string>(TREE_DEPTH).fill("0");
  const pathIndices = Array<string>(TREE_DEPTH).fill("0");

  let current = circuitHash(secret, amount);
  for (let i = 0; i < TREE_DEPTH; i++) {
    current = circuitHash(current, 0n);
  }

  return {
    secret: secret.toString(),
    pathElements,
    pathIndices,
    root: current.toString(),
    recipient: recipient.toString(),
    token: token.toString(),
    amount: amount.toString()
  };
}

export type Groth16Proof = {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
  protocol: string;
  curve: string;
};

/** ABI-encode Groth16 proof for a `bytes proof` parameter (common verifier layout). */
export function encodeGroth16ProofBytes(proof: Groth16Proof): string {
  const a: [bigint, bigint] = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
  const b: [[bigint, bigint], [bigint, bigint]] = [
    [BigInt(proof.pi_b[0][0]), BigInt(proof.pi_b[0][1])],
    [BigInt(proof.pi_b[1][0]), BigInt(proof.pi_b[1][1])]
  ];
  const c: [bigint, bigint] = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];
  return AbiCoder.defaultAbiCoder().encode(
    ["uint256[2]", "uint256[2][2]", "uint256[2]"],
    [a, b, c]
  );
}

export function publicSignalToBytes32(signal: string): string {
  const v = BigInt(signal);
  const hex = "0x" + v.toString(16).padStart(64, "0").slice(-64);
  return hex;
}

export async function generateWithdrawProof(input: Record<string, string | string[]>): Promise<{
  proofBytes: string;
  publicSignals: string[];
}> {
  const { groth16 } = await import("snarkjs");
  const wasmPath = new URL("/zk/private_lp.wasm", window.location.origin).href;
  const zkeyPath = new URL("/zk/private_lp_final.zkey", window.location.origin).href;

  const { proof, publicSignals } = await groth16.fullProve(input, wasmPath, zkeyPath);
  const proofBytes = encodeGroth16ProofBytes(proof as Groth16Proof);
  return { proofBytes, publicSignals };
}
