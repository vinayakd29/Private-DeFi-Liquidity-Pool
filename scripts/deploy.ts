import { ethers } from "hardhat";

async function main() {
  const Pool = await ethers.getContractFactory("PrivateLiquidityPool");
  const pool = await Pool.deploy();

  await pool.waitForDeployment();

  console.log("Pool deployed at:", await pool.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
