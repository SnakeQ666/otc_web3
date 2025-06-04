const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy LendingPool contract
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy();
  await lendingPool.waitForDeployment();

  const lendingPoolAddress = await lendingPool.getAddress();
  console.log("LendingPool deployed to:", lendingPoolAddress);

  // Update frontend contract address configuration
  const contractsPath = path.resolve(__dirname, '../../otc_web3_frontend/src/config/contracts.ts');
  let contractsContent = '';
  let tokenFaucetAddress = '';
  
  if (fs.existsSync(contractsPath)) {
    const raw = fs.readFileSync(contractsPath, 'utf-8');
    const marketMatch = raw.match(/export const MARKET_CONTRACT_ADDRESS_LOCAL = '([^']+)'/);
    const escrowMatch = raw.match(/export const ESCROW_CONTRACT_ADDRESS_LOCAL = '([^']+)'/);
    const faucetMatch = raw.match(/export const TOKEN_FAUCET_ADDRESS_LOCAL = '([^']+)'/);
    const market = marketMatch ? marketMatch[1] : '';
    const escrow = escrowMatch ? escrowMatch[1] : '';
    tokenFaucetAddress = faucetMatch ? faucetMatch[1] : '';
    contractsContent = `// Contract address configuration\nexport const MARKET_CONTRACT_ADDRESS_LOCAL = '${market}';\nexport const ESCROW_CONTRACT_ADDRESS_LOCAL = '${escrow}';\nexport const TOKEN_FAUCET_ADDRESS_LOCAL = '${tokenFaucetAddress}';\nexport const LENDING_POOL_ADDRESS_LOCAL = '${lendingPoolAddress}';\n`; // 合约地址配置
  } else {
    contractsContent = `// Contract address configuration\nexport const MARKET_CONTRACT_ADDRESS_LOCAL = '';\nexport const ESCROW_CONTRACT_ADDRESS_LOCAL = '';\nexport const TOKEN_FAUCET_ADDRESS_LOCAL = '';\nexport const LENDING_POOL_ADDRESS_LOCAL = '${lendingPoolAddress}';\n`; // 合约地址配置
  }
  fs.writeFileSync(contractsPath, contractsContent, 'utf-8');
  console.log(`LendingPool address automatically written to: ${contractsPath}`); // 已自动写入LendingPool地址到:

  if (!tokenFaucetAddress) {
    console.error("Error: TokenFaucet address not found in contracts.ts");
    process.exit(1);
  }

  // Get TokenFaucet contract instance
  const TokenFaucet = await hre.ethers.getContractFactory("TokenFaucet");
  const tokenFaucet = await TokenFaucet.attach(tokenFaucetAddress);
  console.log("Using TokenFaucet at address:", tokenFaucetAddress);

  // Get all tokens
  const allTokens = await tokenFaucet.getAllTokens();
  console.log("\nConfiguring token lending parameters..."); // 配置代币借贷参数...

  // Set lending parameters for each token
  for (const token of allTokens) {
    const tokenAddress = token[0];
    const tokenSymbol = token[1];
    const tokenDecimals = token[3];
    
    // Set token configuration
    // Collateral ratio: 80%
    // Borrowing interest rate: 5%
    // Maximum borrow amount: Set different values based on token type
    let maxBorrowAmount;
    switch(tokenSymbol) {
      case 'TUSDT':
        maxBorrowAmount = ethers.parseUnits('100000', 6); // 100,000 TUSDT
        break;
      case 'TLINK':
        maxBorrowAmount = ethers.parseUnits('10000', 18); // 10,000 TLINK
        break;
      case 'TUNI':
        maxBorrowAmount = ethers.parseUnits('10000', 18); // 10,000 TUNI
        break;
      case 'TWETH':
        maxBorrowAmount = ethers.parseUnits('100', 18); // 100 TWETH
        break;
      default:
        maxBorrowAmount = ethers.parseUnits('1000', 18);
    }

    const tx = await lendingPool.setTokenConfig(
      tokenAddress,
      true, // isSupported
      8000, // collateralRatio (80%)
      500,  // borrowRate (5%)
      maxBorrowAmount
    );
    await tx.wait();
    
    console.log(`Configured lending parameters for ${tokenSymbol}`); // 已配置 ${tokenSymbol} 的借贷参数

    // Mint 1 million to LendingPool contract
    const mintAmount = ethers.parseUnits('1000000', tokenDecimals);
    const mintTx = await tokenFaucet.mintTo(tokenAddress, lendingPoolAddress, mintAmount);
    await mintTx.wait();
    console.log(`Minted ${tokenSymbol} to LendingPool contract via TokenFaucet: ${mintAmount.toString()}`); // 已通过TokenFaucet给LendingPool合约mint ${tokenSymbol}：${mintAmount.toString()}
  }

  console.log("\nDeployment complete!"); // 部署完成！
  console.log("LendingPool address:", lendingPoolAddress);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 