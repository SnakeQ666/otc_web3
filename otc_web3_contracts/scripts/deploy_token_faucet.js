// 部署TokenFaucet合约并添加初始代币
const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 部署TokenFaucet合约
  const TokenFaucet = await hre.ethers.getContractFactory("TokenFaucet");
  const tokenFaucet = await TokenFaucet.deploy();
  await tokenFaucet.waitForDeployment();

  const tokenFaucetAddress = await tokenFaucet.getAddress();
  console.log("TokenFaucet deployed to:", tokenFaucetAddress);

  // 创建与前端tokenList.ts匹配的代币
  const initialTokens = [
    {
      name: "Test Tether USD",
      symbol: "TUSDT",
      decimals: 6,
      initialSupply: 10000000, // 1000万
      faucetAmount: 1000,      // 每次领取1000 TUSDT
      cooldown: 3600,          // 1小时冷却时间
      icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png"
    },
    {
      name: "Test Chainlink Token",
      symbol: "TLINK",
      decimals: 18,
      initialSupply: 1000000,  // 100万
      faucetAmount: 100,        // 每次领取10 TLINK
      cooldown: 3600,          // 1小时冷却时间
      icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png"
    },
    {
      name: "Test Uniswap",
      symbol: "TUNI",
      decimals: 18,
      initialSupply: 1000000,  // 100万
      faucetAmount: 1000,       // 每次领取100 TUNI
      cooldown: 3600,          // 1小时冷却时间
      icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png"
    },
    {
      name: "Test Wrapped Ether",
      symbol: "TWETH",
      decimals: 18,
      initialSupply: 10000,    // 1万
      faucetAmount: 10,         // 每次领取1 TWETH
      cooldown: 3600,          // 1小时冷却时间
      icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png"
    }
  ];

  // 创建一个用于记录部署的代币的对象
  const deployedTokens = [];

  // 部署初始代币并添加到TokenFaucet
  for (const tokenConfig of initialTokens) {
    console.log(`Deploying ${tokenConfig.name} (${tokenConfig.symbol})...`);
    
    // 计算带精度的金额
    const faucetAmount = ethers.parseUnits(
      tokenConfig.faucetAmount.toString(), 
      tokenConfig.decimals
    );
    
    // 部署并添加代币
    const tx = await tokenFaucet.deployAndAddToken(
      tokenConfig.name,
      tokenConfig.symbol,
      tokenConfig.decimals,
      tokenConfig.initialSupply,
      faucetAmount,
      tokenConfig.cooldown
    );
    
    const receipt = await tx.wait();
    
    // 从事件中获取代币地址
    const tokenAddedEvent = receipt.logs
      .filter(log => log.fragment && log.fragment.name === 'TokenAdded')
      .map(log => log.args)[0];
    
    const tokenAddress = tokenAddedEvent ? tokenAddedEvent[0] : null;
    
    deployedTokens.push({
      name: tokenConfig.name,
      symbol: tokenConfig.symbol,
      address: tokenAddress,
      decimals: tokenConfig.decimals,
      icon: tokenConfig.icon
    });
    
    console.log(`${tokenConfig.symbol} deployed and added to TokenFaucet at address: ${tokenAddress}`);
  }

  console.log("All tokens deployed and added to TokenFaucet");
  console.log("TokenFaucet address:", tokenFaucetAddress);
  
  // 输出代币列表，可以用于更新前端配置
  console.log("\nToken List for Frontend (tokenList.ts):");
  console.log("export const token = [");
  console.log("  {");
  console.log('    "name": "Ethereum",');
  console.log('    "symbol": "ETH",');
  console.log('    "address": "0x0000000000000000000000000000000000000000",');
  console.log('    "decimals": 18,');
  console.log('    "icon": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png"');
  console.log("  },");
  
  deployedTokens.forEach((token, index) => {
    console.log("  {");
    console.log(`    "name": "${token.name}",`);
    console.log(`    "symbol": "${token.symbol}",`);
    console.log(`    "address": "${token.address}",`);
    console.log(`    "decimals": ${token.decimals},`);
    console.log(`    "icon": "${token.icon}"`);
    console.log("  }" + (index < deployedTokens.length - 1 ? "," : ""));
  });
  
  console.log("];");

  // 输出代币列表，可以用于更新前端配置
  const frontendTokenList = [
    {
      name: "Ethereum",
      symbol: "ETH",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png"
    },
    ...deployedTokens
  ];

  const tokenListContent = `export const token = ${JSON.stringify(frontendTokenList, null, 2)}\n`;

  const frontendTokenListPath = path.resolve(__dirname, '../../otc_web3_frontend/src/config/tokenList.ts');
  fs.writeFileSync(frontendTokenListPath, tokenListContent, 'utf-8');
  console.log(`\n已自动写入最新tokenList到: ${frontendTokenListPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 