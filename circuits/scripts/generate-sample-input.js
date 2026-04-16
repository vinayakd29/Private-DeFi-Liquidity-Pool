/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const DEPTH = 20;

function h(left, right) {
  return BigInt(left) * 131n + BigInt(right) * 137n + 17n;
}

function main() {
  const secret = 123456789n;
  const token = 1n;
  const amount = 1000000000000000000n;

  const pathElements = Array(DEPTH).fill("0");
  const pathIndices = Array(DEPTH).fill("0");

  let current = h(secret, amount);
  for (let i = 0; i < DEPTH; i++) {
    current = h(current, 0n);
  }

  const input = {
    secret: secret.toString(),
    pathElements,
    pathIndices,
    root: current.toString(),
    recipient: "1",
    token: token.toString(),
    amount: amount.toString()
  };

  const buildDir = path.join(__dirname, "..", "build");
  fs.mkdirSync(buildDir, { recursive: true });
  fs.writeFileSync(path.join(buildDir, "input.json"), JSON.stringify(input, null, 2));
  console.log("Generated build/input.json with consistent sample root.");
}

main();
