import { ethers } from "hardhat";

async function main() {
  console.log("InvalidAmount:", ethers.id("InvalidAmount()").substring(0, 10));
  console.log("CommitmentAlreadyUsed:", ethers.id("CommitmentAlreadyUsed()").substring(0, 10));
  console.log("RootNotKnown:", ethers.id("RootNotKnown()").substring(0, 10));
  console.log("NullifierAlreadyUsed:", ethers.id("NullifierAlreadyUsed()").substring(0, 10));
  console.log("TokenTransferFailed:", ethers.id("TokenTransferFailed()").substring(0, 10));
}

main().catch(console.error);
