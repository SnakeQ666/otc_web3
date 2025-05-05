# OTC-Web3 智能合约

这个文件夹包含OTC交易平台的智能合约代码。

## 项目结构

- `contracts/`: 智能合约源代码
  - `OTCMarket.sol`: 主要的OTC交易市场合约
  - `OTCEscrow.sol`: 交易托管合约
- `scripts/`: 部署脚本
  - `deploy.js`: 合约部署脚本
- `test/`: 合约测试代码
- `hardhat.config.js`: Hardhat配置文件

## 开发环境设置

### 前提条件

- Node.js v14+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 编译合约

```bash
npm run compile
```

### 运行测试

```bash
npm test
```

### 部署合约

#### 本地开发环境

启动本地节点：
```bash
npm run node
```

在新的终端窗口部署合约：
```bash
npm run deploy:local
```

#### 测试网络 (Sepolia)

创建 `.env` 文件并设置以下环境变量：
```
SEPOLIA_URL=你的Sepolia RPC URL
PRIVATE_KEY=你的钱包私钥
```

部署到Sepolia测试网：
```bash
npm run deploy:sepolia
```

## 合约功能

### OTCMarket.sol

- 创建买卖订单
- 查询可用订单
- 响应订单
- 取消订单

### OTCEscrow.sol

- 资金托管
- 确认交易完成
- 处理争议
- 退款机制