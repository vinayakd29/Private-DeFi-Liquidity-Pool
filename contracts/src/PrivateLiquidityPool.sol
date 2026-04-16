// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IUltraVerifier.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract PrivateLiquidityPool {
    error InvalidAmount();
    error CommitmentAlreadyUsed();
    error RootNotKnown();
    error NullifierAlreadyUsed();
    error InvalidProof();
    error TokenTransferFailed();

    event Deposited(address indexed depositor, address indexed token, uint256 amount, bytes32 commitment, bytes32 root);
    event Withdrawn(address indexed recipient, address indexed token, uint256 amount, bytes32 nullifierHash, bytes32 root);
    event RootUpdated(bytes32 indexed newRoot);

    uint32 public constant TREE_DEPTH = 20;

    IUltraVerifier public immutable verifier;
    uint32 public leafCount;

    mapping(bytes32 => bool) public knownRoots;
    mapping(bytes32 => bool) public nullifierSpent;
    mapping(bytes32 => bool) public commitmentUsed;

    bytes32 public latestRoot;
    bytes32[TREE_DEPTH] public filledSubtrees;
    bytes32[TREE_DEPTH] public zeros;

    constructor(address verifierAddress, bytes32 genesisRoot) {
        verifier = IUltraVerifier(verifierAddress);
        _initializeTree(genesisRoot);
    }

    function deposit(address token, uint256 amount, bytes32 commitment) external {
        if (amount == 0) revert InvalidAmount();
        if (commitmentUsed[commitment]) revert CommitmentAlreadyUsed();

        commitmentUsed[commitment] = true;
        if (leafCount >= uint32(1 << TREE_DEPTH)) revert InvalidAmount();

        bytes32 newRoot = _insert(commitment);
        latestRoot = newRoot;
        knownRoots[newRoot] = true;

        bool ok = IERC20(token).transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TokenTransferFailed();

        emit RootUpdated(newRoot);
        emit Deposited(msg.sender, token, amount, commitment, newRoot);
    }

    function withdraw(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address recipient,
        address token,
        uint256 amount
    ) external {
        if (!knownRoots[root]) revert RootNotKnown();
        if (nullifierSpent[nullifierHash]) revert NullifierAlreadyUsed();
        if (amount == 0) revert InvalidAmount();

        // Public input ordering must exactly match circuit output ordering.
        bytes32[] memory publicInputs = new bytes32[](5);
        publicInputs[0] = root;
        publicInputs[1] = nullifierHash;
        publicInputs[2] = bytes32(uint256(uint160(recipient)));
        publicInputs[3] = bytes32(uint256(uint160(token)));
        publicInputs[4] = bytes32(amount);

        bool valid = verifier.verify(proof, publicInputs);
        if (!valid) revert InvalidProof();

        nullifierSpent[nullifierHash] = true;

        bool ok = IERC20(token).transfer(recipient, amount);
        if (!ok) revert TokenTransferFailed();

        emit Withdrawn(recipient, token, amount, nullifierHash, root);
    }

    function _initializeTree(bytes32 initialRoot) internal {
        bytes32 current = bytes32(0);
        for (uint32 i = 0; i < TREE_DEPTH; i++) {
            zeros[i] = current;
            filledSubtrees[i] = current;
            current = keccak256(abi.encodePacked(current, current));
        }

        latestRoot = initialRoot == bytes32(0) ? current : initialRoot;
        knownRoots[latestRoot] = true;
    }

    function _insert(bytes32 leaf) internal returns (bytes32 newRoot) {
        uint32 index = leafCount;
        bytes32 currentHash = leaf;
        bytes32 left;
        bytes32 right;

        for (uint32 i = 0; i < TREE_DEPTH; i++) {
            if (index % 2 == 0) {
                left = currentHash;
                right = zeros[i];
                filledSubtrees[i] = currentHash;
            } else {
                left = filledSubtrees[i];
                right = currentHash;
            }

            currentHash = keccak256(abi.encodePacked(left, right));
            index /= 2;
        }

        leafCount += 1;
        return currentHash;
    }
}
