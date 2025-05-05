const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

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

  // 设置事件监听器
  market.on("OrderCreated", (orderId, maker, tokenToSell, tokenToBuy, amountToSell, amountToBuy, event) => {
    console.log(`\n新订单创建事件：`);
    console.log(`- 订单ID: ${orderId}`);
    console.log(`- 创建者: ${maker}`);
    console.log(`- 出售代币: ${tokenToSell}`);
    console.log(`- 购买代币: ${tokenToBuy}`);
    console.log(`- 出售数量: ${amountToSell}`);
    console.log(`- 购买数量: ${amountToBuy}`);
  });

  market.on("OrderCompleted", (orderId, event) => {
    console.log(`\n订单完成事件：`);
    console.log(`- 订单ID: ${orderId}`);
  });

  market.on("OrderCancelled", (orderId, event) => {
    console.log(`\n订单取消事件：`);
    console.log(`- 订单ID: ${orderId}`);
  });

  escrow.on("EscrowCreated", (orderId, maker, taker, event) => {
    console.log(`\n托管创建事件：`);
    console.log(`- 订单ID: ${orderId}`);
    console.log(`- 创建者: ${maker}`);
    console.log(`- 接单者: ${taker}`);
  });

  escrow.on("EscrowLocked", (orderId, event) => {
    console.log(`\n托管锁定事件：`);
    console.log(`- 订单ID: ${orderId}`);
  });

  escrow.on("EscrowCompleted", (orderId, event) => {
    console.log(`\n托管完成事件：`);
    console.log(`- 订单ID: ${orderId}`);
  });

  escrow.on("EscrowRefunded", (orderId, event) => {
    console.log(`\n托管退款事件：`);
    console.log(`- 订单ID: ${orderId}`);
  });

  escrow.on("EscrowDisputed", (orderId, event) => {
    console.log(`\n托管争议事件：`);
    console.log(`- 订单ID: ${orderId}`);
  });

//   // 保存合约地址到文件
//   const addresses = {
//     market: marketAddress,
//     escrow: escrowAddress
//   };



  console.log("\n合约部署完成！监听事件中...");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});