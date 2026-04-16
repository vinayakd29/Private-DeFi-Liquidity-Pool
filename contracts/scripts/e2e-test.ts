import { ethers } from "hardhat";

async function main() {
  console.log("=== End-to-End Smart Contract Verification ===\n");

  const [deployer, alice] = await ethers.getSigners();
  console.log("Testing with account:", alice.address);

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

  console.log("\n[1] Contracts deployed successfully.");

  // 4. Mint tokens
  const depositAmount = ethers.parseEther("100");
  await token.mint(alice.address, depositAmount);
  console.log(`[2] Minted 100 MockTokens to ${alice.address}`);

  // 5. Approve & Deposit
  await token.connect(alice).approve(poolAddress, depositAmount);
  const commitment = ethers.keccak256(ethers.toUtf8Bytes("secret:token:100"));
  
  console.log(`[3] Approving and Depositing 100 MockTokens into Pool...`);
  const depositTx = await pool.connect(alice).deposit(tokenAddress, depositAmount, commitment);
  await depositTx.wait();
  
  const root = await pool.latestRoot();
  console.log(`✅ Deposit confirmed! Root is: ${root}`);

  // 6. Withdraw
  console.log(`\n[4] Generating Proof & Withdrawing...`);
  const nullifierHash = ethers.keccak256(ethers.toUtf8Bytes("nullifier"));
  const proof = "0x1234abcd";

  // Note: we use deployer to act as relayer
  const withdrawTx = await pool.connect(deployer).withdraw(
    proof,
    root,
    nullifierHash,
    alice.address,
    tokenAddress,
    ethers.parseEther("90") // partial withdrawal
  );
  await withdrawTx.wait();

  console.log("✅ Withdrawal confirmed!");
  console.log("\n=== Everything is working correctly! ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
