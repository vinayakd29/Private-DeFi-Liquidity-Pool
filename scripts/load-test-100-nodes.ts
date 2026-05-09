import hre from "hardhat";
import { parseEther, toHex, keccak256 } from "viem";
import fs from "fs";

async function main() {
    const clients = await hre.viem.getWalletClients();
    console.log(`Loaded ${clients.length} accounts (nodes).`);
    
    const publicClient = await hre.viem.getPublicClient();

    // Deploy Mock Verifier
    const verifier = await hre.viem.deployContract("MockVerifier");
    const genesisRoot = toHex(0, { size: 32 });
    
    // Deploy Pool
    const pool = await hre.viem.deployContract("PrivateLiquidityPool", [
        verifier.address,
        genesisRoot
    ]);
    
    // Deploy Token
    const token = await hre.viem.deployContract("MockToken");
    
    const amountToDeposit = parseEther("10");

    console.log("Starting Load Test with Nodes...");
    const results: string[] = [];
    results.push("NodeIndex,DepositGasUsed,DepositTimeMs");

    // Mint tokens to all accounts
    console.log("Minting mock tokens to all accounts...");
    for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        await token.write.mint([client.account.address, amountToDeposit]);
    }

    console.log("Executing concurrent/sequential deposits...");
    let i = 0;
    for (const client of clients) {
        const startTime = Date.now();
        
        // Using viem contract instances for the specific client
        const tokenContractAsClient = await hre.viem.getContractAt(
            "MockToken", 
            token.address,
            { client: { wallet: client } }
        );

        const poolContractAsClient = await hre.viem.getContractAt(
            "PrivateLiquidityPool", 
            pool.address,
            { client: { wallet: client } }
        );

        // 1. Approve
        const approveTx = await tokenContractAsClient.write.approve([pool.address, amountToDeposit]);
        await publicClient.waitForTransactionReceipt({ hash: approveTx });

        // Generate a pseudo-random commitment for the sake of the test
        const secretString = toHex(`node-secret-${i}`, { size: 32 });
        const commitment = keccak256(secretString);

        // 2. Deposit
        const depositTx = await poolContractAsClient.write.deposit([token.address, amountToDeposit, commitment]);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: depositTx });
        
        const endTime = Date.now();
        const timeMs = endTime - startTime;
        
        results.push(`${i + 1},${receipt.gasUsed},${timeMs}`);
        
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
