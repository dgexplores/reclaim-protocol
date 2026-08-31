const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const net = hre.network.name;
  console.log(`Network: ${net}`);
  console.log("Deployer:", deployer.address);
  console.log("Balance :", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  const Token = await hre.ethers.getContractFactory("ReClaimToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("ReClaimToken:", tokenAddr);

  const NFT = await hre.ethers.getContractFactory("ReceiptNFT");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  const nftAddr = await nft.getAddress();
  console.log("ReceiptNFT:", nftAddr);

  const ReClaim = await hre.ethers.getContractFactory("ReClaim");
  const reclaim = await ReClaim.deploy(tokenAddr, nftAddr);
  await reclaim.waitForDeployment();
  const reclaimAddr = await reclaim.getAddress();
  console.log("ReClaim:", reclaimAddr);

  await (await token.setMinter(reclaimAddr)).wait();
  await (await nft.setMinter(reclaimAddr)).wait();
  console.log("Minters set.");

  // Fail loudly rather than shipping a half-wired deployment.
  if ((await token.minter()) !== reclaimAddr || (await nft.minter()) !== reclaimAddr) {
    throw new Error("Minter wiring failed. Do not use this deployment.");
  }

  const out = {
    network: net,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: { ReClaim: reclaimAddr, ReClaimToken: tokenAddr, ReceiptNFT: nftAddr },
  };
  const file = path.join(__dirname, "..", "deployments.json");
  const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  all[net] = out;
  fs.writeFileSync(file, JSON.stringify(all, null, 2) + "\n");
  console.log(`\nWrote deployments.json`);
  console.log(`\nPut this in frontend/.env.local:\n  NEXT_PUBLIC_CONTRACT_ADDRESS=${reclaimAddr}`);
  console.log(`\nVerify with:\n  npx hardhat verify --network ${net} ${reclaimAddr} ${tokenAddr} ${nftAddr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
