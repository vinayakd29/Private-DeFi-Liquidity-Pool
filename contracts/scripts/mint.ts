import { ethers } from "hardhat";

async function main() {
  // Replace these with your actual deployed MockToken address and MetaMask address
  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "UPDATE_ME";
  const METAMASK_ADDRESS = process.env.METAMASK_ADDRESS || "UPDATE_ME";

  if (TOKEN_ADDRESS === "UPDATE_ME" || METAMASK_ADDRESS === "UPDATE_ME") {
    console.error("Please set TOKEN_ADDRESS and METAMASK_ADDRESS in the script or via environment variables.");
    process.exitCode = 1;
    return;
  }

  console.log(`Minting 1000 MockTokens to ${METAMASK_ADDRESS}...`);
  const token = await ethers.getContractAt("MockToken", TOKEN_ADDRESS);
  
  const tx = await token.mint(METAMASK_ADDRESS, ethers.parseEther("1000"));
  await tx.wait();

  console.log("Tokens minted successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
