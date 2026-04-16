import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const verifier = await ethers.deployContract("MockVerifier");
  await verifier.waitForDeployment();

  const pool = await ethers.deployContract("PrivateLiquidityPool", [await verifier.getAddress(), ethers.ZeroHash]);
  await pool.waitForDeployment();

  const token = await ethers.deployContract("MockToken");
  await token.waitForDeployment();

  console.log("MockVerifier:", await verifier.getAddress());
  console.log("PrivateLiquidityPool:", await pool.getAddress());
  console.log("MockToken:", await token.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
