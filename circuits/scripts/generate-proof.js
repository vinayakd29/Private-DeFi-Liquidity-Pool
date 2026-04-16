/* eslint-disable no-console */
const { groth16 } = require("snarkjs");
const fs = require("fs");
const path = require("path");

async function main() {
  const buildDir = path.join(__dirname, "..", "build");
  const inputPath = path.join(buildDir, "input.json");
  const wasmPath = path.join(buildDir, "private_lp_js", "private_lp.wasm");
  const zkeyPath = path.join(buildDir, "private_lp_final.zkey");

  if (!fs.existsSync(inputPath)) {
    throw new Error("Missing build/input.json. Create it from input.example.json.");
  }

  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const { proof, publicSignals } = await groth16.fullProve(input, wasmPath, zkeyPath);

  fs.writeFileSync(path.join(buildDir, "proof.json"), JSON.stringify(proof, null, 2));
  fs.writeFileSync(path.join(buildDir, "public.json"), JSON.stringify(publicSignals, null, 2));
  console.log("Generated build/proof.json and build/public.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
