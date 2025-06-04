const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TestToken", function () {
  let TestToken, testToken, owner, addr1, addr2;
  const DECIMALS = 18;
  const INITIAL_SUPPLY_UNSCALED = ethers.toBigInt("1000000"); // 1 Million tokens (without decimals)
  const INITIAL_SUPPLY_SCALED = INITIAL_SUPPLY_UNSCALED * (ethers.toBigInt(10) ** ethers.toBigInt(DECIMALS));

  beforeEach(async function () {
    TestToken = await ethers.getContractFactory("TestToken");
    [owner, addr1, addr2] = await ethers.getSigners();
    // Corrected constructor arguments: name, symbol, decimals, initialSupply (unscaled)
    testToken = await TestToken.deploy("Test Token", "TST", DECIMALS, INITIAL_SUPPLY_UNSCALED);
    await testToken.waitForDeployment();
  });

  it("Should deploy successfully with correct name, symbol, decimals and initial supply", async function () {
    expect(await testToken.name()).to.equal("Test Token");
    expect(await testToken.symbol()).to.equal("TST");
    expect(await testToken.decimals()).to.equal(DECIMALS);
    expect(await testToken.totalSupply()).to.equal(INITIAL_SUPPLY_SCALED);
    expect(await testToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY_SCALED);
  });

  it("Should allow owner to mint more tokens", async function () {
    const mintAmount = ethers.parseUnits("1000", DECIMALS); // Mint 1000 tokens considering decimals
    await expect(testToken.connect(owner).mint(addr1.address, mintAmount))
      .to.emit(testToken, "Transfer")
      .withArgs(ethers.ZeroAddress, addr1.address, mintAmount);
    expect(await testToken.balanceOf(addr1.address)).to.equal(mintAmount);
  });

  // Add more tests for transfer, approve, transferFrom etc. as needed
}); 