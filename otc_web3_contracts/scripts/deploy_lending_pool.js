const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 部署LendingPool合约
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy();
  await lendingPool.waitForDeployment();

  const lendingPoolAddress = await lendingPool.getAddress();
  console.log("LendingPool deployed to:", lendingPoolAddress);

  // 更新前端合约地址配置
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
    contractsContent = `// 合约地址配置\nexport const MARKET_CONTRACT_ADDRESS_LOCAL = '${market}';\nexport const ESCROW_CONTRACT_ADDRESS_LOCAL = '${escrow}';\nexport const TOKEN_FAUCET_ADDRESS_LOCAL = '${tokenFaucetAddress}';\nexport const LENDING_POOL_ADDRESS_LOCAL = '${lendingPoolAddress}';\n`;
  } else {
    contractsContent = `// 合约地址配置\nexport const MARKET_CONTRACT_ADDRESS_LOCAL = '';\nexport const ESCROW_CONTRACT_ADDRESS_LOCAL = '';\nexport const TOKEN_FAUCET_ADDRESS_LOCAL = '';\nexport const LENDING_POOL_ADDRESS_LOCAL = '${lendingPoolAddress}';\n`;
  }
  fs.writeFileSync(contractsPath, contractsContent, 'utf-8');
  console.log(`已自动写入LendingPool地址到: ${contractsPath}`);

  if (!tokenFaucetAddress) {
    console.error("Error: TokenFaucet address not found in contracts.ts");
    process.exit(1);
  }

  // 获取TokenFaucet合约实例
  const TokenFaucet = await hre.ethers.getContractFactory("TokenFaucet");
  const tokenFaucet = await TokenFaucet.attach(tokenFaucetAddress);
  console.log("Using TokenFaucet at address:", tokenFaucetAddress);

  // 获取所有代币
  const allTokens = await tokenFaucet.getAllTokens();
  console.log("\n配置代币借贷参数...");

  // 为每个代币设置借贷参数
  for (const token of allTokens) {
    const tokenAddress = token[0];
    const tokenSymbol = token[1];
    const tokenDecimals = token[3];
    
    // 设置代币配置
    // 质押率：80%
    // 借贷利率：5%
    // 最大借贷额度：根据代币类型设置不同值
    let maxBorrowAmount;
    switch(tokenSymbol) {
      case 'TUSDT':
        maxBorrowAmount = ethers.parseUnits('100000', 6); // 10万 TUSDT
        break;
      case 'TLINK':
        maxBorrowAmount = ethers.parseUnits('10000', 18); // 1万 TLINK
        break;
      case 'TUNI':
        maxBorrowAmount = ethers.parseUnits('10000', 18); // 1万 TUNI
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
    
    console.log(`已配置 ${tokenSymbol} 的借贷参数`);

    // mint 100万给 LendingPool 合约
    const mintAmount = ethers.parseUnits('1000000', tokenDecimals);
    const mintTx = await tokenFaucet.mintTo(tokenAddress, lendingPoolAddress, mintAmount);
    await mintTx.wait();
    console.log(`已通过TokenFaucet给LendingPool合约mint ${tokenSymbol}：${mintAmount.toString()}`);
  }

  console.log("\n部署完成！");
  console.log("LendingPool address:", lendingPoolAddress);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 