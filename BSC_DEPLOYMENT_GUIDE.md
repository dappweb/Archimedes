# BSC (币安智能链) 部署指南

## 概述
本文档详细说明了如何将 Archimedes 项目部署到 BSC (Binance Smart Chain) 主网和测试网。

## 前置要求

### 1. 环境准备
- Node.js (v18 或更高版本)
- npm 或 yarn
- Git
- MetaMask 钱包
- BNB 代币 (用于支付 gas 费用)

### 2. 安装依赖
```bash
npm install
```

### 3. 配置钱包
确保 MetaMask 已配置 BSC 网络：

**BSC 主网配置：**
- 网络名称：BSC Mainnet
- RPC URL：https://bsc-dataseed.binance.org/
- 链ID：56
- 符号：BNB
- 区块浏览器：https://bscscan.com

**BSC 测试网配置：**
- 网络名称：BSC Testnet
- RPC URL：https://data-seed-prebsc-1-s1.binance.org:8545/
- 链ID：97
- 符号：tBNB
- 区块浏览器：https://testnet.bscscan.com

## 智能合约部署

### 1. 获取测试网 BNB
访问 [BSC 测试网水龙头](https://testnet.binance.org/faucet-smart) 获取测试 BNB。

### 2. 配置环境变量
在项目根目录创建 `.env` 文件：

```env
# BSC 主网配置
BSC_MAINNET_RPC_URL=https://bsc-dataseed.binance.org/
BSC_MAINNET_PRIVATE_KEY=你的主网私钥
BSC_MAINNET_API_KEY=BSCScan API 密钥

# BSC 测试网配置
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
BSC_TESTNET_PRIVATE_KEY=你的测试网私钥
BSC_TESTNET_API_KEY=BSCScan API 密钥
```

### 3. 更新配置文件
修改 `hardhat.config.js` 或 `truffle-config.js` 添加 BSC 网络配置：

```javascript
module.exports = {
  networks: {
    bsc_mainnet: {
      url: process.env.BSC_MAINNET_RPC_URL,
      accounts: [process.env.BSC_MAINNET_PRIVATE_KEY],
      chainId: 56,
      gasPrice: 5000000000, // 5 Gwei
    },
    bsc_testnet: {
      url: process.env.BSC_TESTNET_RPC_URL,
      accounts: [process.env.BSC_TESTNET_PRIVATE_KEY],
      chainId: 97,
      gasPrice: 10000000000, // 10 Gwei
    }
  },
  etherscan: {
    apiKey: {
      bsc: process.env.BSC_MAINNET_API_KEY,
      bscTestnet: process.env.BSC_TESTNET_API_KEY
    }
  }
};
```

### 4. 部署合约

**部署到测试网：**
```bash
npx hardhat run scripts/deploy.js --network bsc_testnet
```

**部署到主网：**
```bash
npx hardhat run scripts/deploy.js --network bsc_mainnet
```

## 合约地址记录

部署完成后，记录以下合约地址：

```javascript
// BSC 测试网合约地址（示例）
const BSC_TESTNET_CONTRACTS = {
  USDT_TOKEN: "0x...",      // USDT 代币地址
  ARC_TOKEN: "0x...",       // ARC 代币地址
  DES_TOKEN: "0x...",       // DES 代币地址
  PROTOCOL: "0x..."         // 协议合约地址
};

// BSC 主网合约地址（示例）
const BSC_MAINNET_CONTRACTS = {
  USDT_TOKEN: "0x...",      // USDT 代币地址
  ARC_TOKEN: "0x...",       // ARC 代币地址
  DES_TOKEN: "0x...",       // DES 代币地址
  PROTOCOL: "0x..."         // 协议合约地址
};
```

## 前端配置更新

### 1. 更新配置文件
修改 `src/config.ts` 添加 BSC 网络配置：

```typescript
export const CHAIN_CONFIG = {
  56: { // BSC 主网
    name: "BSC Mainnet",
    rpcUrl: "https://bsc-dataseed.binance.org/",
    blockExplorer: "https://bscscan.com",
    contracts: {
      USDT_TOKEN: "0x55d398326f99059fF775485246999027B3197955",
      ARC_TOKEN: "0x...", // 主网 ARC 地址
      DES_TOKEN: "0x...", // 主网 DES 地址
      PROTOCOL: "0x..."   // 主网协议地址
    }
  },
  97: { // BSC 测试网
    name: "BSC Testnet",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    blockExplorer: "https://testnet.bscscan.com",
    contracts: {
      USDT_TOKEN: "0x...", // 测试网 USDT 地址
      ARC_TOKEN: "0x...",  // 测试网 ARC 地址
      DES_TOKEN: "0x...", // 测试网 DES 地址
      PROTOCOL: "0x..."   // 测试网协议地址
    }
  }
};
```

### 2. 更新钱包连接配置
修改 `src/main.jsx` 添加 BSC 链支持：

```typescript
import { bsc, bscTestnet } from 'wagmi/chains';

const config = getDefaultConfig({
  appName: 'Archimedes',
  projectId: 'YOUR_PROJECT_ID',
  chains: [mainnet, polygon, optimism, arbitrum, base, sepolia, bsc, bscTestnet],
  // ... 其他配置
});
```

## 部署验证

### 1. 验证合约
在区块浏览器上验证已部署的合约：

**测试网：**
访问 https://testnet.bscscan.com，搜索合约地址，点击"验证并发布"

**主网：**
访问 https://bscscan.com，搜索合约地址，点击"验证并发布"

### 2. 测试功能
1. 连接钱包到 BSC 网络
2. 测试代币购买功能
3. 验证挖矿功能
4. 测试提取功能

## 注意事项

### 1. Gas 费用
- BSC 主网 Gas 费用相对较低
- 建议 Gas Price：5-10 Gwei
- 确保钱包有足够的 BNB 支付 Gas 费用

### 2. 安全性
- 在主网部署前，务必在测试网充分测试
- 使用多签钱包管理重要合约
- 部署后验证所有合约
- 保存好私钥和助记词

### 3. 常见问题

**Q: 交易失败怎么办？**
A: 检查以下几点：
- 钱包是否有足够的 BNB
- Gas Price 是否设置合理
- 合约地址是否正确
- 网络连接是否正常

**Q: 如何切换网络？**
A: 在 MetaMask 中手动添加 BSC 网络配置，或使用 Chainlist 一键添加。

**Q: 合约验证失败？**
A: 确保：
- 使用正确的编译器版本
- 源代码与部署字节码匹配
- 构造函数参数正确

## 相关资源

- [BSC 官方文档](https://docs.binance.org/)
- [BSCScan](https://bscscan.com/)
- [BSC 测试网水龙头](https://testnet.binance.org/faucet-smart)
- [Chainlist](https://chainlist.org/)

## 技术支持

如遇到部署问题，请检查：
1. 网络连接状态
2. 合约编译是否正确
3. 环境变量配置
4. 钱包余额是否充足

---

*最后更新：2024年12月*
*版本：v1.0*