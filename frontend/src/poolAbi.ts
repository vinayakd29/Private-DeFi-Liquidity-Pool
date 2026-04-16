export const poolAbi = [
  "function deposit(address token, uint256 amount, bytes32 commitment) external",
  "function withdraw(bytes proof, bytes32 root, bytes32 nullifierHash, address recipient, address token, uint256 amount) external",
  "function latestRoot() view returns (bytes32)",
  "function leafCount() view returns (uint32)",
  "error InvalidAmount()",
  "error CommitmentAlreadyUsed()",
  "error RootNotKnown()",
  "error NullifierAlreadyUsed()",
  "error InvalidProof()",
  "error TokenTransferFailed()"
];

export const erc20Abi = [
  "function approve(address spender, uint256 value) external returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];
