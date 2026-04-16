import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Starting full deployment and setup...");
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  console.log(`\nDeploying from account: ${deployer.address}`);

  // 1. Deploy Verifier
  const verifier = await ethers.deployContract("MockVerifier");
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();

  // 2. Deploy Pool
  const pool = await ethers.deployContract("PrivateLiquidityPool", [verifierAddress, ethers.ZeroHash]);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();

  // 3. Deploy Token
  const token = await ethers.deployContract("MockToken");
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  // 4. Mint tokens to all default Hardhat accounts
  console.log("\nMinting 10,000 MockTokens to all Hardhat test accounts...");
  const mintAmount = ethers.parseEther("10000");
  for (let i = 0; i < signers.length; i++) {
    await token.mint(signers[i].address, mintAmount);
  }

  // 5. Export configuration for frontend
  const config = {
    poolAddress,
    tokenAddress
  };
  const configPath = path.join(__dirname, "../../frontend/src/config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`\n✅ Generated frontend config at: ${configPath}`);

  console.log("\n========================================================");
  console.log("✅ DEPLOYMENT SUCCESSFUL! UI CONFIG UPDATED AUTOMATICALLY ✅");
  console.log("========================================================");
  console.log(`1. Pool address:   ${poolAddress}`);
  console.log(`2. Token address:  ${tokenAddress}`);
  console.log("========================================================\n");
  console.log("💡 The UI has been automatically updated. You don't need to paste anything!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

