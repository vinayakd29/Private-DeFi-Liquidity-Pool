// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev BN254 scalar field order (same as Circom field).
uint256 constant FIELD =
    21888242871839275222246405745257275088548364400416034343698204186575808495617;

/// @dev Matches `SimpleHash2` in `circuits/private_lp.circom`: out = left * 131 + right * 137 + 17 (mod FIELD).
function fieldHash2(uint256 left, uint256 right) pure returns (uint256) {
    uint256 termL = mulmod(left, 131, FIELD);
    uint256 termR = mulmod(right, 137, FIELD);
    return addmod(addmod(termL, termR, FIELD), 17, FIELD);
}
