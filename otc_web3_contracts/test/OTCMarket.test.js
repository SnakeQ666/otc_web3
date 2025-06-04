const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OTCMarket", function () {
  let OTCMarket, otcMarket, owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    OTCMarket = await ethers.getContractFactory("OTCMarket");
    // If constructor needs arguments, provide them here
    // Example: otcMarket = await OTCMarket.deploy(arg1, arg2);
    otcMarket = await OTCMarket.deploy(); 
    await otcMarket.waitForDeployment();
  });

  it("Should deploy successfully", async function () {
    const otcMarketAddress = await otcMarket.getAddress();
    expect(otcMarketAddress).to.be.properAddress;
    // Add more specific deployment checks if needed, e.g., initial state variables
    // expect(await otcMarket.someState()).to.equal(expectedValue);
  });

  // Add functional tests for OTCMarket features
}); 