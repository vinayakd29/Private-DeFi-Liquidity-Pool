export const poolAbi = [
  "function withdraw(bytes proof, bytes32 root, bytes32 nullifierHash, address recipient, address token, uint256 amount) external",
  "function latestRoot() view returns (bytes32)",
  "error InvalidAmount()",
  "error CommitmentAlreadyUsed()",
  "error RootNotKnown()",
  "error NullifierAlreadyUsed()",
  "error InvalidProof()",
  "error TokenTransferFailed()"
];
