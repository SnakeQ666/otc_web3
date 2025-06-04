// Deploy TokenFaucet contract and add initial tokens
const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy TokenFaucet contract
  const TokenFaucet = await hre.ethers.getContractFactory("TokenFaucet");
  const tokenFaucet = await TokenFaucet.deploy();
  await tokenFaucet.waitForDeployment();

  const tokenFaucetAddress = await tokenFaucet.getAddress();
  console.log("TokenFaucet deployed to:", tokenFaucetAddress);

  // === Automatically write to frontend contracts.ts ===
  const contractsPath = path.resolve(__dirname, '../../otc_web3_frontend/src/config/contracts.ts');
  let contractsContent = '';
  if (fs.existsSync(contractsPath)) {
    // Read existing content, retain MARKET_CONTRACT_ADDRESS_LOCAL and ESCROW_CONTRACT_ADDRESS_LOCAL
    const raw = fs.readFileSync(contractsPath, 'utf-8');
    const marketMatch = raw.match(/export const MARKET_CONTRACT_ADDRESS_LOCAL = '([^']*)'/);
    const escrowMatch = raw.match(/export const ESCROW_CONTRACT_ADDRESS_LOCAL = '([^']*)'/);
    const market = marketMatch ? marketMatch[1] : '';
    const escrow = escrowMatch ? escrowMatch[1] : '';
    contractsContent = `// Contract address configuration\nexport const MARKET_CONTRACT_ADDRESS_LOCAL = '${market}';\nexport const ESCROW_CONTRACT_ADDRESS_LOCAL = '${escrow}';\nexport const TOKEN_FAUCET_ADDRESS_LOCAL = '${tokenFaucetAddress}';\n`;
  } else {
    contractsContent = `// Contract address configuration\nexport const MARKET_CONTRACT_ADDRESS_LOCAL = '';\nexport const ESCROW_CONTRACT_ADDRESS_LOCAL = '';\nexport const TOKEN_FAUCET_ADDRESS_LOCAL = '${tokenFaucetAddress}';\n`;
  }
  fs.writeFileSync(contractsPath, contractsContent, 'utf-8');
  console.log(`TokenFaucet address automatically written to: ${contractsPath}`); // 已自动写入TokenFaucet地址到:

  // Create tokens matching frontend tokenList.ts
  const initialTokens = [
    {
      name: "Test Tether USD",
      symbol: "TUSDT",
      decimals: 6,
      initialSupply: 10000000, // 10 million
      faucetAmount: 1000,      // Claim 1000 TUSDT each time
      cooldown: 3600,          // 1 hour cooldown
      icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png"
    },
    {
      name: "Test Chainlink Token",
      symbol: "TLINK",
      decimals: 18,
      initialSupply: 1000000,  // 1 million
      faucetAmount: 100,        // Claim 100 TLINK each time
      cooldown: 3600,          // 1 hour cooldown
      icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png"
    },
    {
      name: "Test Uniswap",
      symbol: "TUNI",
      decimals: 18,
      initialSupply: 1000000,  // 1 million
      faucetAmount: 1000,       // Claim 1000 TUNI each time
      cooldown: 3600,          // 1 hour cooldown
      icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png"
    },
    {
      name: "Test Wrapped Ether",
      symbol: "TWETH",
      decimals: 18,
      initialSupply: 10000,    // 10 thousand
      faucetAmount: 10,         // Claim 10 TWETH each time
      cooldown: 3600,          // 1 hour cooldown
      icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png"
    }
  ];

  // Create an object to record deployed tokens
  const deployedTokens = [];

  // Deploy initial tokens and add to TokenFaucet
  for (const tokenConfig of initialTokens) {
    console.log(`Deploying ${tokenConfig.name} (${tokenConfig.symbol})...`);
    
    // Calculate amount with decimals
    const faucetAmount = ethers.parseUnits(
      tokenConfig.faucetAmount.toString(), 
      tokenConfig.decimals
    );
    
    // Deploy and add token
    const tx = await tokenFaucet.deployAndAddToken(
      tokenConfig.name,
      tokenConfig.symbol,
      tokenConfig.decimals,
      tokenConfig.initialSupply,
      faucetAmount,
      tokenConfig.cooldown
    );
    
    const receipt = await tx.wait();
    
    // Get token address from event
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
  
  // Output token list, can be used to update frontend configuration
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

  // Output token list, can be used to update frontend configuration
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

  const tokenListContent = `export const token = ${JSON.stringify(frontendTokenList, null, 2)};\n`; // Added semicolon

  const frontendTokenListPath = path.resolve(__dirname, '../../otc_web3_frontend/src/config/tokenList.ts');
  fs.writeFileSync(frontendTokenListPath, tokenListContent, 'utf-8');
  console.log(`\nLatest tokenList automatically written to: ${frontendTokenListPath}`); // 已自动写入最新tokenList到:

  // ====== ADDED: Directly call getAllTokens and print result ======
  const TokenFaucetABI = TokenFaucet.interface.fragments;
  const tokenFaucetInstance = await hre.ethers.getContractAt("TokenFaucet", tokenFaucetAddress);
  const allTokens = await tokenFaucetInstance.getAllTokens();
  console.log("\nDirect call to getAllTokens() returns:"); // 直接调用getAllTokens()返回:
  console.dir(allTokens, { depth: null });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 