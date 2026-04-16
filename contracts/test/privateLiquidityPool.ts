import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateLiquidityPool", function () {
  async function deployFixture() {
    const [deployer, alice, bob] = await ethers.getSigners();

    const verifier = await ethers.deployContract("MockVerifier");
    const token = await ethers.deployContract("MockToken");
    const pool = await ethers.deployContract("PrivateLiquidityPool", [await verifier.getAddress(), ethers.ZeroHash]);

    const oneToken = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("100");

    await token.mint(alice.address, depositAmount);
    await token.connect(alice).approve(await pool.getAddress(), depositAmount);

    return { deployer, alice, bob, verifier, token, pool, depositAmount, oneToken };
  }

  it("accepts deposit and updates root", async function () {
    const { alice, token, pool, depositAmount } = await deployFixture();
    const commitment = ethers.keccak256(ethers.toUtf8Bytes("note-1"));

    await expect(pool.connect(alice).deposit(await token.getAddress(), depositAmount, commitment)).to.emit(pool, "Deposited");

    expect(await pool.leafCount()).to.eq(1);
    const root = await pool.latestRoot();
    expect(root).to.not.eq(ethers.ZeroHash);
    expect(await pool.knownRoots(root)).to.eq(true);
  });

  it("rejects reused commitment", async function () {
    const { alice, token, pool, depositAmount } = await deployFixture();
    const commitment = ethers.keccak256(ethers.toUtf8Bytes("reused-note"));

    await pool.connect(alice).deposit(await token.getAddress(), depositAmount, commitment);
    await expect(pool.connect(alice).deposit(await token.getAddress(), depositAmount, commitment)).to.be.revertedWithCustomError(
      pool,
      "CommitmentAlreadyUsed"
    );
  });

  it("allows withdraw with valid proof and blocks nullifier replay", async function () {
    const { alice, bob, token, pool, depositAmount } = await deployFixture();
    const commitment = ethers.keccak256(ethers.toUtf8Bytes("withdraw-note"));

    await pool.connect(alice).deposit(await token.getAddress(), depositAmount, commitment);

    const root = await pool.latestRoot();
    const nullifierHash = ethers.keccak256(ethers.toUtf8Bytes("nullifier-1"));
    const proof = "0x1234";

    await expect(
      pool.connect(bob).withdraw(proof, root, nullifierHash, bob.address, await token.getAddress(), ethers.parseEther("40"))
    ).to.emit(pool, "Withdrawn");

    expect(await pool.nullifierSpent(nullifierHash)).to.eq(true);

    await expect(
      pool.connect(bob).withdraw(proof, root, nullifierHash, bob.address, await token.getAddress(), ethers.parseEther("10"))
    ).to.be.revertedWithCustomError(pool, "NullifierAlreadyUsed");
  });

  it("rejects withdraw when verifier fails", async function () {
    const { alice, bob, verifier, token, pool, depositAmount } = await deployFixture();
    const commitment = ethers.keccak256(ethers.toUtf8Bytes("invalid-proof-note"));
    await pool.connect(alice).deposit(await token.getAddress(), depositAmount, commitment);

    await verifier.setForceValid(false);

    const root = await pool.latestRoot();
    const nullifierHash = ethers.keccak256(ethers.toUtf8Bytes("nullifier-invalid"));
    const proof = "0x1234";

    await expect(
      pool.connect(bob).withdraw(proof, root, nullifierHash, bob.address, await token.getAddress(), ethers.parseEther("5"))
    ).to.be.revertedWithCustomError(pool, "InvalidProof");
  });
});
