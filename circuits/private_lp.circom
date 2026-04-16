pragma circom 2.1.6;

template BinarySwitch() {
    signal input in0;
    signal input in1;
    signal input sel;
    signal output left;
    signal output right;
    signal diff;
    signal diff2;

    sel * (sel - 1) === 0;
    diff <== in1 - in0;
    left <== in0 + sel * diff;

    diff2 <== in0 - in1;
    right <== in1 + sel * diff2;
}

template SimpleHash2() {
    signal input left;
    signal input right;
    signal output out;

    // Educational placeholder hash. Replace with Poseidon for production-grade privacy.
    out <== left * 131 + right * 137 + 17;
}

template PrivateLPWithdraw(depth) {
    signal input secret;
    signal input pathElements[depth];
    signal input pathIndices[depth];

    signal input root;
    signal input recipient;
    signal input token;
    signal input amount;

    signal output pubRoot;
    signal output nullifier;
    signal output pubRecipient;
    signal output pubToken;
    signal output pubAmount;

    // Note commitment from private note secret + public withdrawal metadata.
    component commitmentHash = SimpleHash2();
    commitmentHash.left <== secret;
    commitmentHash.right <== amount;

    // Nullifier binds secret to token to avoid cross-token note reuse.
    component nullifierHash = SimpleHash2();
    nullifierHash.left <== secret;
    nullifierHash.right <== token;
    nullifier <== nullifierHash.out;

    signal levelHash[depth + 1];
    component sw[depth];
    component parent[depth];
    levelHash[0] <== commitmentHash.out;

    for (var i = 0; i < depth; i++) {
        sw[i] = BinarySwitch();
        sw[i].in0 <== levelHash[i];
        sw[i].in1 <== pathElements[i];
        sw[i].sel <== pathIndices[i];

        parent[i] = SimpleHash2();
        parent[i].left <== sw[i].left;
        parent[i].right <== sw[i].right;
        levelHash[i + 1] <== parent[i].out;
    }

    pubRoot <== levelHash[depth];
    pubRoot === root;

    // These outputs become public signals for contract verification.
    pubRecipient <== recipient;
    pubToken <== token;
    pubAmount <== amount;
}

// Public output order:
// [pubRoot, nullifier, pubRecipient, pubToken, pubAmount]
component main = PrivateLPWithdraw(20);
