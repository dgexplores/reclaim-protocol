const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReClaim", () => {
  let token, nft, reclaim, owner, user, auditor;

  beforeEach(async () => {
    [owner, user, auditor] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("ReClaimToken");
    token = await Token.deploy(); await token.waitForDeployment();
    const NFT = await ethers.getContractFactory("ReceiptNFT");
    nft = await NFT.deploy(); await nft.waitForDeployment();
    const ReClaim = await ethers.getContractFactory("ReClaim");
    reclaim = await ReClaim.deploy(await token.getAddress(), await nft.getAddress());
    await reclaim.waitForDeployment();
    await (await token.setMinter(await reclaim.getAddress())).wait();
    await (await nft.setMinter(await reclaim.getAddress())).wait();
  });

  it("mints NFT + tokens on valid proof", async () => {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("image1"));
    await reclaim.connect(user).submitProof(2, 90, "QmTestCID", hash);
    expect(await nft.balanceOf(user.address)).to.equal(1);
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("50")); // Aluminum
  });

  it("rejects low confidence", async () => {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("low"));
    await expect(reclaim.connect(user).submitProof(0, 70, "QmCID", hash)).to.be.revertedWithCustomError(reclaim, "LowConfidence");
  });

  it("rejects duplicate image hash", async () => {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("dup"));
    await reclaim.connect(user).submitProof(0, 90, "QmCID", hash);
    await expect(reclaim.connect(user).submitProof(0, 90, "QmCID2", hash)).to.be.revertedWithCustomError(reclaim, "DuplicateImage");
  });

  it("allows owner to update reward", async () => {
    await reclaim.setReward(2, ethers.parseEther("99"));
    expect(await reclaim.rewardTable(2)).to.equal(ethers.parseEther("99"));
  });

  it("staking requires tokens", async () => {
    // mint some to auditor via a proof first
    const hash = ethers.keccak256(ethers.toUtf8Bytes("stake"));
    await reclaim.connect(auditor).submitProof(3, 90, "QmCID", hash); // 30 tokens
    // need 100, will fail
    await expect(reclaim.connect(auditor).stakeAuditor()).to.be.reverted;
  });
});
