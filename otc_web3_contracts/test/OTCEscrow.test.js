const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OTCEscrow", function () {
  let OTCMarket, otcMarket, OTCEscrow, otcEscrow, owner, partyA, partyB, arbiter;
  let TestToken, testToken;
  const DECIMALS = 18;

  beforeEach(async function () {
    [owner, partyA, partyB, arbiter] = await ethers.getSigners();

    // Deploy OTCMarket first
    OTCMarket = await ethers.getContractFactory("OTCMarket");
    otcMarket = await OTCMarket.deploy();
    await otcMarket.waitForDeployment();
    const otcMarketAddress = await otcMarket.getAddress();

    // Deploy TestToken (needed for some OTCEscrow functions, though not for deployment itself here)
    TestToken = await ethers.getContractFactory("TestToken");
    testToken = await TestToken.deploy("Escrow Token", "ESC", DECIMALS, ethers.toBigInt("1000000"));
    await testToken.waitForDeployment();
    // const testTokenAddress = await testToken.getAddress(); // Not directly used for escrow deployment

    OTCEscrow = await ethers.getContractFactory("OTCEscrow");
    otcEscrow = await OTCEscrow.deploy(otcMarketAddress); 
    await otcEscrow.waitForDeployment();
  });

  it("Should deploy successfully and set the OTCMarket address", async function () {
    const otcEscrowAddress = await otcEscrow.getAddress();
    expect(otcEscrowAddress).to.be.properAddress;
    expect(await otcEscrow.otcMarket()).to.equal(await otcMarket.getAddress());
  });

  // Add functional tests for OTCEscrow features like createEscrow, lockEscrow, etc.
}); 