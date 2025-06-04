const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting contract deployment...");

  // Deploy market contract
  const OTCMarket = await hre.ethers.getContractFactory("OTCMarket");
  const market = await OTCMarket.deploy();
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log(`Market contract deployed to: ${marketAddress}`);

  // Deploy escrow contract
  const OTCEscrow = await hre.ethers.getContractFactory("OTCEscrow");
  const escrow = await OTCEscrow.deploy(marketAddress);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`Escrow contract deployed to: ${escrowAddress}`);
  console.log("Escrow contract associated with market contract");

  // Set up event listeners
  market.on("OrderCreated", (orderId, maker, tokenToSell, tokenToBuy, amountToSell, amountToBuy, event) => {
    console.log(`\nNew Order Created Event:`);
    console.log(`- Order ID: ${orderId}`);
    console.log(`- Creator: ${maker}`);
    console.log(`- Token to Sell: ${tokenToSell}`);
    console.log(`- Token to Buy: ${tokenToBuy}`);
    console.log(`- Amount to Sell: ${amountToSell}`);
    console.log(`- Amount to Buy: ${amountToBuy}`);
  });

  market.on("OrderCompleted", (orderId, event) => {
    console.log(`\nOrder Completed Event:`);
    console.log(`- Order ID: ${orderId}`);
  });

  market.on("OrderCancelled", (orderId, event) => {
    console.log(`\nOrder Cancelled Event:`);
    console.log(`- Order ID: ${orderId}`);
  });

  escrow.on("EscrowCreated", (orderId, maker, taker, event) => {
    console.log(`\nEscrow Created Event:`);
    console.log(`- Order ID: ${orderId}`);
    console.log(`- Creator: ${maker}`);
    console.log(`- Taker: ${taker}`);
  });

  escrow.on("EscrowLocked", (orderId, event) => {
    console.log(`\nEscrow Locked Event:`);
    console.log(`- Order ID: ${orderId}`);
  });

  escrow.on("EscrowCompleted", (orderId, event) => {
    console.log(`\nEscrow Completed Event:`);
    console.log(`- Order ID: ${orderId}`);
  });

  escrow.on("EscrowRefunded", (orderId, event) => {
    console.log(`\nEscrow Refunded Event:`);
    console.log(`- Order ID: ${orderId}`);
  });

  escrow.on("EscrowDisputed", (orderId, event) => {
    console.log(`\nEscrow Disputed Event:`);
    console.log(`- Order ID: ${orderId}`);
  });

//   // Save contract addresses to file
//   const addresses = {
//     market: marketAddress,
//     escrow: escrowAddress
//   };

  // Automatically write frontend contract address configuration
  const frontendContractsPath = path.resolve(__dirname, '../../otc_web3_frontend/src/config/contracts.ts');
  const contractsContent = `// Contract address configuration
export const MARKET_CONTRACT_ADDRESS_LOCAL = '${marketAddress}';
export const ESCROW_CONTRACT_ADDRESS_LOCAL = '${escrowAddress}';
`;

  fs.writeFileSync(frontendContractsPath, contractsContent, 'utf-8');
  console.log(`\nLatest contract addresses automatically written to: ${frontendContractsPath}`);

  console.log("\nContract deployment complete! Listening for events...");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});