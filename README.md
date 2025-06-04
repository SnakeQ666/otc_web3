# OTC-Web3 Project

This is a full-stack Web3 OTC (Over-The-Counter) trading platform project, comprising three main parts: frontend, backend, and smart contracts.

## Project Overview

*   **`otc_web3_frontend`**: A frontend application based on Next.js and React. Users can interact with the platform through this interface, for example, browsing the market, initiating trades, managing assets, etc.
*   **`otc_web3_backend`**: A backend service based on Node.js and Express. It handles user authentication, API requests, interaction with the database, and integration with Tencent Cloud Object Storage (COS).
*   **`otc_web3_contracts`**: Smart contracts based on Solidity and Hardhat. They are responsible for on-chain logic, such as token management, trade matching, fund escrow, etc.

## Getting Started

Before you begin, ensure you have Node.js (LTS version recommended) and npm (or yarn) installed.

### 1. Clone the Project (if not already cloned)

```bash
git clone <repository_url>
cd OTC-Web3
```

### 2. Backend (`otc_web3_backend`)

**Install Dependencies:**

```bash
cd otc_web3_backend
npm install
# or
# yarn install
```

**Configure Environment Variables:**

The backend service relies on environment variables. Create a `.env.development` file in the `otc_web3_backend` directory (refer to `.env.example` if it exists, or determine the required variables based on configuration files under `src/config/`).
At a minimum, you need to configure database connection information (e.g., PostgreSQL) and Tencent Cloud COS (if file upload functionality is needed).

Example `.env.development`:
```env
NODE_ENV=development
PORT=8080

# Database Configuration (PostgreSQL Example)
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=otc_dev_db

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1d

# Tencent Cloud COS (if used)
COS_SECRET_ID=your_cos_secret_id
COS_SECRET_KEY=your_cos_secret_key
COS_BUCKET=your_cos_bucket_name
COS_REGION=your_cos_region
```

**Start Development Server:**

```bash
npm run dev
# or
# yarn dev
```

The backend service will start on `http://localhost:8080` by default.

### 3. Smart Contracts (`otc_web3_contracts`)

**Install Dependencies:**

```bash
cd ../otc_web3_contracts  # Go back to the project root, then into the contracts directory
npm install
# or
# yarn install
```

**Configure Environment Variables (Optional):**

Some Hardhat plugins (like `hardhat-gas-reporter`) or deployment scripts may require environment variables. For example, you can create a `.env` file in the `otc_web3_contracts` directory to configure `COINMARKETCAP_API_KEY` or `PRIVATE_KEY` and `RPC_URL` for the Sepolia testnet.

Example `.env` for `hardhat.config.js`:
```env
SEPOLIA_RPC_URL="your_sepolia_rpc_url"
PRIVATE_KEY="your_private_key_for_deployment"
COINMARKETCAP_API_KEY="your_coinmarketcap_api_key" # for gas reporter
GAS_REPORT_FILE="gas-report.txt"
```

**Compile Contracts:**

```bash
npm run compile
# or
# yarn compile
```

**Run Tests (includes Gas Report):**

```bash
npm run test
# or
# yarn test
```
The gas report will be output to `gas-report.txt` (as configured in `hardhat.config.js`).

**Start Local Hardhat Node:**

```bash
npm run node
# or
# yarn node
```
This will start a local Ethereum node, with the default address `http://127.0.0.1:8545/`.

**Deploy to Local Node:**

Ensure the local Hardhat node is running. Then, open a new terminal:
```bash
npm run deploy:local # Deploys all base contracts
# Or deploy individually
# npm run deploy:token-faucet
# npm run deploy:lending-pool
```
Check the `scripts/` directory for details on deployment scripts.

### 4. Frontend (`otc_web3_frontend`)

**Install Dependencies:**

```bash
cd ../otc_web3_frontend # Go back to the project root, then into the frontend directory
npm install
# or
# yarn install
```

**Configure Environment Variables (if needed):**

The frontend may need to configure the backend API address or smart contract addresses. Create a `.env.local` file in the `otc_web3_frontend` directory.

Example `.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
NEXT_PUBLIC_MARKET_CONTRACT_ADDRESS=0x... (Address of the deployed OTCMarket contract)
NEXT_PUBLIC_CHAIN_ID=31337 # Hardhat local node Chain ID
```
Ensure these variables are consistent with your backend and smart contract deployment.

**Start Development Server:**

```bash
npm run dev
# or
# yarn dev
```

The frontend application will start on `http://localhost:3000` by default.

## Overall Functionality

*   **User Registration & Login**: Users can create accounts and log into the platform.
*   **KYC (Know Your Customer)**: Users may need to complete KYC verification to unlock certain features (specific implementation depends on backend logic).
*   **Token Issuance & Management (Smart Contracts)**:
    *   `TestToken.sol`: An ERC20 standard test token.
    *   `TokenFaucet.sol`: A faucet contract allowing users to claim test tokens.
*   **OTC Market (Smart Contracts & Backend)**:
    *   `OTCMarket.sol`: The core market contract for creating and managing OTC orders.
    *   `OTCEscrow.sol`: An escrow contract to securely hold assets during a trade.
    *   The frontend interface allows users to post buy/sell advertisements, browse existing ads, and trade with them.
    *   The backend handles off-chain logic like order matching, status updates, etc.
*   **Lending Pool (Smart Contracts)**:
    *   `LendingPool.sol`: A simple lending pool contract allowing users to deposit assets to earn interest or borrow assets (specific functionality requires further review of the contract implementation).
*   **Asset Management**: Users can view their token balances and transaction history on the frontend.
*   **Internationalization (i18n)**: The frontend supports multiple languages.

## Technology Stack

*   **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Ant Design, ethers.js / viem, wagmi, RainbowKit / Web3Modal, Zustand, i18next
*   **Backend**: Node.js, Express, Sequelize (with PostgreSQL), JWT, Multer (for file uploads), Tencent Cloud COS SDK
*   **Smart Contracts**: Solidity, Hardhat, OpenZeppelin Contracts
*   **Testing**:
    *   Frontend: Jest, React Testing Library
    *   Smart Contracts: Hardhat (Chai, Mocha), hardhat-gas-reporter
    *   Backend: (Not yet configured, can use k6, Artillery, Jest/Supertest, etc.)
*   **Database**: PostgreSQL (or other Sequelize-supported databases)

## Potential Future Extensions

*   More complex order types (limit orders, stop-loss orders).
*   Integration of more chains and tokens.
*   User reputation system.
*   Dispute resolution mechanism.
*   Advanced charts and analytics tools.

---

**Note**: The startup steps and environment variables above are based on the project structure and common practices. Please adjust them according to the specific configuration files (`*.config.js`, `*.json`, scripts in the `scripts/` directory, etc.) within your project. 