const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Token = await hre.ethers.getContractFactory("ReClaimToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  console.log("ReClaimToken:", await token.getAddress());

  const NFT = await hre.ethers.getContractFactory("ReceiptNFT");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  console.log("ReceiptNFT:", await nft.getAddress());

  const ReClaim = await hre.ethers.getContractFactory("ReClaim");
  const reclaim = await ReClaim.deploy(await token.getAddress(), await nft.getAddress());
  await reclaim.waitForDeployment();
  console.log("ReClaim:", await reclaim.getAddress());

  await (await token.setMinter(await reclaim.getAddress())).wait();
  await (await nft.setMinter(await reclaim.getAddress())).wait();
  console.log("Minters set.");

  const deployments = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    token: await token.getAddress(),
    receiptNFT: await nft.getAddress(),
    reclaim: await reclaim.getAddress(),
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  console.log(JSON.stringify(deployments, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
