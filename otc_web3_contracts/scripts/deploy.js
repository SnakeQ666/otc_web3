const hre = require("hardhat");

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

  console.log("Waiting for block confirmations...");
  // Wait for a few block confirmations
  await market.deploymentTransaction().wait(5);
  await escrow.deploymentTransaction().wait(5);

  // Verify market contract
  console.log("Starting market contract verification...");
  await hre.run("verify:verify", {
    address: marketAddress,
    constructorArguments: []
  });

  // Verify escrow contract
  console.log("Starting escrow contract verification...");
  await hre.run("verify:verify", {
    address: escrowAddress,
    constructorArguments: [marketAddress]
  });

  console.log("Contract deployment and verification complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});