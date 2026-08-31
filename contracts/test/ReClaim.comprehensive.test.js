const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReClaim — Comprehensive / Competitive Audit", () => {
  let token, nft, reclaim, owner, user, user2, auditor;

  beforeEach(async () => {
    [owner, user, user2, auditor] = await ethers.getSigners();
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

  describe("Reward logic", () => {
    const rewards = {0:20,1:20,2:50,3:30,4:100,5:10};
    for (const [mat, exp] of Object.entries(rewards)) {
      it(`mints ${exp} for material ${mat}`, async () => {
        const hash = ethers.keccak256(ethers.toUtf8Bytes(`mat-${mat}-${Date.now()}-${Math.random()}`));
        await reclaim.connect(user).submitProof(Number(mat), 90, `QmCID${mat}`, hash);
        expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther(String(exp)));
      });
    }
    it("owner can update reward, non-owner cannot", async () => {
      await expect(reclaim.connect(user).setReward(2, ethers.parseEther("999"))).to.be.reverted;
      await reclaim.setReward(2, ethers.parseEther("999"));
      expect(await reclaim.rewardTable(2)).to.equal(ethers.parseEther("999"));
    });
  });

  describe("Validation", () => {
    it("reverts on low confidence (<85)", async () => {
      const h = ethers.keccak256(ethers.toUtf8Bytes("lowc"));
      await expect(reclaim.connect(user).submitProof(0,84,"Qm",h)).to.be.revertedWithCustomError(reclaim,"LowConfidence");
      await expect(reclaim.connect(user).submitProof(0,0,"Qm",h)).to.be.revertedWithCustomError(reclaim,"LowConfidence");
    });
    it("accepts boundary confidence 85", async () => {
      const h = ethers.keccak256(ethers.toUtf8Bytes("boundary"));
      await expect(reclaim.connect(user).submitProof(1,85,"Qm",h)).to.not.be.reverted;
    });
    it("reverts on duplicate hash even across users", async () => {
      const h = ethers.keccak256(ethers.toUtf8Bytes("dupX"));
      await reclaim.connect(user).submitProof(0,90,"QmA",h);
      await expect(reclaim.connect(user2).submitProof(0,90,"QmB",h)).to.be.revertedWithCustomError(reclaim,"DuplicateImage");
    });
    it("reverts on invalid material >5", async () => {
      const h = ethers.keccak256(ethers.toUtf8Bytes("invalidMat"));
      await expect(reclaim.connect(user).submitProof(6,90,"Qm",h)).to.be.revertedWithCustomError(reclaim,"InvalidMaterial");
    });
    it("emits ProofSubmitted with correct args", async () => {
      const h = ethers.keccak256(ethers.toUtf8Bytes("event"));
      await expect(reclaim.connect(user).submitProof(2,92,"QmEvent",h))
        .to.emit(reclaim,"ProofSubmitted")
        .withArgs(user.address,0,2,h,"QmEvent",await reclaim.auditFlagged(h));
    });
  });

  describe("NFT behavior", () => {
    it("mints sequential tokenIds", async () => {
      const h1 = ethers.keccak256(ethers.toUtf8Bytes("nft1"));
      const h2 = ethers.keccak256(ethers.toUtf8Bytes("nft2"));
      await reclaim.connect(user).submitProof(0,90,"Qm1",h1);
      await reclaim.connect(user).submitProof(1,90,"Qm2",h2);
      expect(await nft.ownerOf(0)).to.equal(user.address);
      expect(await nft.ownerOf(1)).to.equal(user.address);
      expect(await nft.balanceOf(user.address)).to.equal(2);
      expect(await nft.nextTokenId()).to.equal(2);
    });
    it("stores ipfs uri correctly", async () => {
      const h = ethers.keccak256(ethers.toUtf8Bytes("uri"));
      await reclaim.connect(user).submitProof(3,90,"QmMyCID123",h);
      expect(await nft.tokenURI(0)).to.equal("ipfs://QmMyCID123");
      expect(await reclaim.receiptHash(0)).to.equal(h);
      expect(await reclaim.usedImageHashes(h)).to.equal(true);
    });
    it("fraudulent receipt is burned and the reward clawed back", async () => {
      // stake an auditor (needs 100 RECLAIM -> one E-Waste proof)
      const hA = ethers.keccak256(ethers.toUtf8Bytes("auditorfund1"));
      await reclaim.connect(auditor).submitProof(4,90,"QmA",hA);
      await token.connect(auditor).approve(await reclaim.getAddress(), ethers.parseEther("100"));
      await reclaim.connect(auditor).stakeAuditor();

      const h = ethers.keccak256(ethers.toUtf8Bytes("fraud"));
      await reclaim.connect(user).submitProof(2,90,"Qm",h); // Aluminum, 50 RECLAIM
      const id = 1;
      expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("50"));

      await reclaim.connect(auditor).challenge(id);
      expect(await reclaim.lockedStake(auditor.address)).to.equal(ethers.parseEther("50"));

      await reclaim.resolveChallenge(id, true);

      await expect(nft.ownerOf(id)).to.be.reverted;          // receipt burned
      expect(await token.balanceOf(user.address)).to.equal(0); // reward clawed back
      expect(await reclaim.lockedStake(auditor.address)).to.equal(0); // bond released
      expect(await reclaim.usedImageHashes(h)).to.equal(true); // image can never be replayed
    });
    it("a wrong challenge forfeits the auditor's bond", async () => {
      const hA = ethers.keccak256(ethers.toUtf8Bytes("auditorfund2"));
      await reclaim.connect(auditor).submitProof(4,90,"QmA",hA);
      await token.connect(auditor).approve(await reclaim.getAddress(), ethers.parseEther("100"));
      await reclaim.connect(auditor).stakeAuditor();

      const h = ethers.keccak256(ethers.toUtf8Bytes("honest"));
      await reclaim.connect(user).submitProof(0,90,"Qm",h);
      const id = 1;

      await reclaim.connect(auditor).challenge(id);
      await reclaim.resolveChallenge(id, false);

      expect(await reclaim.auditorStake(auditor.address)).to.equal(ethers.parseEther("50")); // 100 - 50 bond
      expect(await reclaim.slashPool()).to.equal(ethers.parseEther("50"));
      expect(await nft.ownerOf(id)).to.equal(user.address); // honest receipt survives
    });
    it("locked bond cannot be withdrawn", async () => {
      const hA = ethers.keccak256(ethers.toUtf8Bytes("auditorfund3"));
      await reclaim.connect(auditor).submitProof(4,90,"QmA",hA);
      await token.connect(auditor).approve(await reclaim.getAddress(), ethers.parseEther("100"));
      await reclaim.connect(auditor).stakeAuditor();
      const h = ethers.keccak256(ethers.toUtf8Bytes("locked"));
      await reclaim.connect(user).submitProof(0,90,"Qm",h);
      await reclaim.connect(auditor).challenge(1);
      await expect(reclaim.connect(auditor).withdrawStake(ethers.parseEther("100")))
        .to.be.revertedWithCustomError(reclaim,"StakeLocked");
      await reclaim.connect(auditor).withdrawStake(ethers.parseEther("50")); // unlocked half is fine
    });
    it("audit flag is deterministic and publicly recomputable", async () => {
      const h = ethers.keccak256(ethers.toUtf8Bytes("flagcheck"));
      const onChain = await reclaim.auditFlagged(h);
      const offChain = BigInt(h) % 100n < 10n;
      expect(onChain).to.equal(offChain);
    });
    it("non-owner cannot resolve a challenge", async () => {
      const hA = ethers.keccak256(ethers.toUtf8Bytes("auditorfund4"));
      await reclaim.connect(auditor).submitProof(4,90,"QmA",hA);
      await token.connect(auditor).approve(await reclaim.getAddress(), ethers.parseEther("100"));
      await reclaim.connect(auditor).stakeAuditor();
      const h = ethers.keccak256(ethers.toUtf8Bytes("slash2"));
      await reclaim.connect(user).submitProof(0,90,"Qm",h);
      await reclaim.connect(auditor).challenge(1);
      await expect(reclaim.connect(user).resolveChallenge(1,true)).to.be.reverted;
    });
  });

  describe("Auditor & challenge", () => {
    it("reverts on empty CID", async () => {
      const h = ethers.keccak256(ethers.toUtf8Bytes("empty"));
      await expect(reclaim.connect(user).submitProof(0,90,"",h)).to.be.revertedWithCustomError(reclaim,"EmptyCID");
    });
    it("reverts on zero hash", async () => {
      await expect(reclaim.connect(user).submitProof(0,90,"Qm",ethers.ZeroHash)).to.be.revertedWithCustomError(reclaim,"ZeroHash");
    });
    it("challenge without stake reverts", async () => {
      const h = ethers.keccak256(ethers.toUtf8Bytes("chal"));
      await reclaim.connect(user).submitProof(0,90,"Qm",h);
      await expect(reclaim.connect(auditor).challenge(0)).to.be.revertedWithCustomError(reclaim,"NotStaked");
    });
    it("staked auditor can challenge", async () => {
      // fund auditor with 100+ tokens: submit two high-value proofs
      const hA1 = ethers.keccak256(ethers.toUtf8Bytes("a1"+Math.random()));
      const hA2 = ethers.keccak256(ethers.toUtf8Bytes("a2"+Math.random()));
      await reclaim.connect(auditor).submitProof(4,90,"Qm",hA1); // 100
      await reclaim.connect(auditor).submitProof(4,90,"Qm2",hA2); // +100 =200
      // approve and stake
      await token.connect(auditor).approve(await reclaim.getAddress(), ethers.parseEther("100"));
      await reclaim.connect(auditor).stakeAuditor();
      expect(await reclaim.auditorStake(auditor.address)).to.equal(ethers.parseEther("100"));
      const hU = ethers.keccak256(ethers.toUtf8Bytes("chalU"));
      await reclaim.connect(user).submitProof(0,90,"QmU",hU);
      await expect(reclaim.connect(auditor).challenge(0)).to.emit(reclaim,"Challenged").withArgs(0,auditor.address,ethers.parseEther("50"));
    });
  });

  describe("Token minter isolation", () => {
    it("only reclaim can mint token", async () => {
      await expect(token.connect(user).mint(user.address, 100)).to.be.revertedWithCustomError(token,"NotMinter");
    });
    it("only reclaim can mint NFT", async () => {
      await expect(nft.connect(user).mint(user.address,"ipfs://x")).to.be.revertedWithCustomError(nft,"NotMinter");
    });
    it("owner can rotate minter", async () => {
      await token.setMinter(user.address);
      expect(await token.minter()).to.equal(user.address);
      await token.connect(user).mint(user.address, 100);
      expect(await token.balanceOf(user.address)).to.equal(100);
    });
  });

  describe("Gas snapshots", () => {
    it("gas: submitProof", async () => {
      const h = ethers.keccak256(ethers.toUtf8Bytes("gas"+Math.random()));
      const tx = await reclaim.connect(user).submitProof(2,90,"QmGas",h);
      const rc = await tx.wait();
      console.log(`      ⛽ submitProof gas: ${rc.gasUsed.toString()}`);
      expect(rc.gasUsed).to.be.lt(260000); // must be cheap for hackathon
    });
  });
});
