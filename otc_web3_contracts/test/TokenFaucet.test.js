const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenFaucet", function () {
  let TestToken, testToken, TokenFaucet, tokenFaucet, owner, addr1;
  const DECIMALS = 18;
  // We will use faucet functions to set drip amount later, or test default if any

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy TokenFaucet (constructor takes no arguments)
    TokenFaucet = await ethers.getContractFactory("TokenFaucet");
    tokenFaucet = await TokenFaucet.deploy();
    await tokenFaucet.waitForDeployment();

    // Deploy a TestToken (needed for faucet functionality)
    TestToken = await ethers.getContractFactory("TestToken");
    testToken = await TestToken.deploy("Faucet Test Token", "FTT", DECIMALS, ethers.toBigInt("1000000"));
    await testToken.waitForDeployment();
    const testTokenAddress = await testToken.getAddress();

    // Add the deployed TestToken to the Faucet
    const faucetDripAmount = ethers.parseUnits("100", DECIMALS);
    const cooldown = 60 * 60; // 1 hour cooldown
    await tokenFaucet.connect(owner).addToken(testTokenAddress, faucetDripAmount, cooldown);

    // Transfer ownership of the specific TestToken to the TokenFaucet contract
    // so that TokenFaucet can call testToken.mint() as per its claimToken logic.
    await testToken.connect(owner).transferOwnership(await tokenFaucet.getAddress());

    // Mint some tokens to the Faucet contract itself for it to distribute via its claimToken logic
    // (Note: The current TokenFaucet.claimToken mints directly, so this might not be strictly needed unless testing an older version)
    // const faucetSupply = ethers.parseUnits("10000", DECIMALS);
    // await testToken.connect(owner).mint(await tokenFaucet.getAddress(), faucetSupply); 
  });

  it("Should deploy successfully", async function () {
    const tokenFaucetAddress = await tokenFaucet.getAddress();
    expect(tokenFaucetAddress).to.be.properAddress;
  });

  it("Should have added the TestToken correctly", async function () {
    const tokenInfo = await tokenFaucet.tokenList(0); // Assuming it's the first token added
    const testTokenAddress = await testToken.getAddress();
    const faucetDripAmount = ethers.parseUnits("100", DECIMALS);
    const cooldown = 60 * 60; 

    expect(tokenInfo.tokenAddress).to.equal(testTokenAddress);
    expect(tokenInfo.faucetAmount).to.equal(faucetDripAmount);
    expect(tokenInfo.cooldown).to.equal(cooldown);
    expect(tokenInfo.active).to.be.true;
  });

  it("Should allow a user to claim tokens", async function () {
    const testTokenAddress = await testToken.getAddress();
    const faucetDripAmount = ethers.parseUnits("100", DECIMALS);
    const initialAddr1Balance = await testToken.balanceOf(addr1.address);
    
    await expect(tokenFaucet.connect(addr1).claimToken(testTokenAddress))
      .to.emit(tokenFaucet, "TokenClaimed") // Event from TokenFaucet
      .withArgs(addr1.address, testTokenAddress, faucetDripAmount);

    expect(await testToken.balanceOf(addr1.address)).to.equal(initialAddr1Balance + faucetDripAmount);
  });

  it("Should not allow a user to claim tokens again before cooldown", async function () {
    const testTokenAddress = await testToken.getAddress();
    await tokenFaucet.connect(addr1).claimToken(testTokenAddress); // First claim
    await expect(tokenFaucet.connect(addr1).claimToken(testTokenAddress))
      .to.be.revertedWith("Cooldown period not passed");
  });

}); 