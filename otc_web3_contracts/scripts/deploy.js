const hre = require("hardhat");

async function main() {
  console.log("开始部署合约...");

  // 部署市场合约
  const OTCMarket = await hre.ethers.getContractFactory("OTCMarket");
  const market = await OTCMarket.deploy();
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log(`市场合约已部署到: ${marketAddress}`);

  // 部署托管合约
  const OTCEscrow = await hre.ethers.getContractFactory("OTCEscrow");
  const escrow = await OTCEscrow.deploy(marketAddress);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`托管合约已部署到: ${escrowAddress}`);
  console.log("托管合约已与市场合约关联");

  console.log("等待区块确认...");
  // 等待几个区块确认
  await market.deploymentTransaction().wait(5);
  await escrow.deploymentTransaction().wait(5);

  // 验证市场合约
  console.log("开始验证市场合约...");
  await hre.run("verify:verify", {
    address: marketAddress,
    constructorArguments: []
  });

  // 验证托管合约
  console.log("开始验证托管合约...");
  await hre.run("verify:verify", {
    address: escrowAddress,
    constructorArguments: [marketAddress]
  });

  console.log("合约部署和验证完成！");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});