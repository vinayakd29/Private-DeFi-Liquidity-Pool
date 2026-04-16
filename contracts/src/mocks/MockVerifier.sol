// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../IUltraVerifier.sol";

contract MockVerifier is IUltraVerifier {
    bool public forceValid = true;

    function setForceValid(bool value) external {
        forceValid = value;
    }

    function verify(bytes calldata, bytes32[] calldata) external view returns (bool) {
        return forceValid;
    }
}
