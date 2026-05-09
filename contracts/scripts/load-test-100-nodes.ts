import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
    const signers = await ethers.getSigners();
    console.log(`Loaded ${signers.length} accounts (nodes).`);

    // Deploy Mock Verifier
    const Verifier = await ethers.getContractFactory("MockVerifier");
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
    const verifierAddress = await verifier.getAddress();
    
    // Genesis Root
    const genesisRoot = ethers.ZeroHash;
    
    // Deploy Pool
    const Pool = await ethers.getContractFactory("PrivateLiquidityPool");
    const pool = await Pool.deploy(verifierAddress, genesisRoot);
    await pool.waitForDeployment();
    const poolAddress = await pool.getAddress();
    
    // Deploy Token
    const Token = await ethers.getContractFactory("MockToken");
    const token = await Token.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    
    const amountToDeposit = ethers.parseEther("10");

    console.log("Starting Load Test with Nodes...");
    const results: string[] = [];
    results.push("NodeIndex,DepositGasUsed,DepositTimeMs");

    // Mint tokens to all accounts
    console.log("Minting mock tokens to all accounts...");
    for (let i = 0; i < signers.length; i++) {
        const tx = await token.mint(signers[i].address, amountToDeposit);
        await tx.wait(); // Wait for mint to finish
    }

    console.log("Executing sequential deposits...");
    let i = 0;
    for (const signer of signers) {
        const startTime = Date.now();
        
        const tokenAsSigner = token.connect(signer) as any;
        const poolAsSigner = pool.connect(signer) as any;

        // 1. Approve
        const approveTx = await tokenAsSigner.approve(poolAddress, amountToDeposit);
        await approveTx.wait();

        // Generate a pseudo-random commitment
        const secretString = ethers.id(`node-secret-${i}`);
        const commitment = ethers.keccak256(secretString);

        // 2. Deposit
        const depositTx = await poolAsSigner.deposit(tokenAddress, amountToDeposit, commitment);
        const receipt = await depositTx.wait();
        
        const endTime = Date.now();
        const timeMs = endTime - startTime;
        
        results.push(`${i + 1},${receipt.gasUsed.toString()},${timeMs}`);
        
        if ((i + 1) % 10 === 0) {
            console.log(`Processed ${i + 1} nodes...`);
        }
        i++;
    }

    const csvContent = results.join("\n");
    fs.writeFileSync("load_test_results.csv", csvContent);
    console.log("Load test complete! Results saved to load_test_results.csv");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
