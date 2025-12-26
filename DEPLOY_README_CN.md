# Archimedes 项目部署文档 (BSC 主网)

本文档详细说明了如何将 Archimedes 项目（智能合约 + 前端）部署到 BSC (Binance Smart Chain) 主网。

## 1. 准备工作

在开始之前，请确保您已经准备好以下环境：

*   **操作环境**: Windows / macOS / Linux
*   **Node.js**: 推荐 v18 或更高版本
*   **Git**: 用于代码管理
*   **部署钱包**: 一个拥有足够 BNB (建议至少 0.05 BNB) 的钱包私钥，用于支付部署 Gas 费。
*   **USDT**: 部署钱包中如果需要测试购买，需要少量 USDT (BEP20)。

## 2. 项目安装

1.  **拉取代码**:
    ```bash
    git clone https://github.com/dappweb/Archimedes.git
    cd Archimedes
    ```

2.  **安装依赖**:
    ```bash
    npm install
    ```

## 3. 智能合约部署

### 3.1 配置环境变量

1.  在项目根目录创建一个名为 `.env` 的文件（复制 `.env.example`）。
2.  在 `.env` 文件中填入您的部署钱包私钥：

    ```env
    # 部署者钱包私钥 (不带 0x 前缀)
    PRIVATE_KEY=您的私钥粘贴在这里
    ```

### 3.2 执行部署脚本

我们已经准备好了专门针对 BSC 主网的部署脚本。

1.  **运行部署命令**:
    ```bash
    npm run deploy:bsc
    ```
    *或者直接运行脚本:*
    ```bash
    npx hardhat run scripts/deploy-bsc-mainnet.cjs --network bsc
    ```

2.  **等待部署完成**:
    脚本会自动部署以下合约：
    *   `ARC` 代币
    *   `DES` 代币
    *   `ArchimedesProtocol` (主逻辑合约)

    *注意：如果遇到网络超时错误，请检查网络连接或稍后重试。*

3.  **记录合约地址**:
    部署成功后，终端会输出类似以下的信息，请**务必保存**：
    ```text
    ARC Token deployed to: 0x...
    DES Token deployed to: 0x...
    ArchimedesProtocol deployed to: 0x...
    ```

## 4. 前端配置更新

合约部署完成后，必须更新前端代码以连接到新部署的合约。

1.  打开文件: `src/config.ts`
2.  找到 `CONTRACT_ADDRESSES` 部分，填入上一步获得的真实地址：

    ```typescript
    export const CONTRACT_ADDRESSES = {
      USDT_TOKEN: "0x55d398326f99059fF775485246999027B3197955", // BSC 主网 USDT (通常不变)
      ARC_TOKEN: "0x...", // 填入部署的 ARC 地址
      DES_TOKEN: "0x...", // 填入部署的 DES 地址
      PROTOCOL: "0x..."   // 填入部署的 Protocol 地址
    };
    ```

3.  保存文件。

## 5. 前端构建与发布

### 5.1 本地测试 (可选)

在正式打包前，可以在本地启动前端进行测试：
```bash
npm run dev
```
打开浏览器访问显示的本地地址 (如 `http://localhost:5173`)，连接钱包并测试功能。

### 5.2 构建生产版本

运行构建命令生成静态文件：
```bash
npm run build
```

构建完成后，会生成一个 `dist` 目录。该目录包含了所有需要发布到服务器的静态文件（HTML, CSS, JS）。

### 5.3 发布到服务器

您可以将 `dist` 目录中的内容部署到任何静态网站托管服务，例如：

*   **Vercel / Netlify** (推荐，简单快速)
*   **Nginx / Apache** (传统服务器)
*   **GitHub Pages**

**Nginx 配置示例 (如果使用 Nginx):**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/your/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 6. 常见问题与故障排除

*   **部署时提示 "Insufficient funds"**:
    *   原因：钱包中的 BNB 不足。
    *   解决：向部署钱包充值更多 BNB。

*   **部署时提示 "ProviderError: execution reverted"**:
    *   原因：合约逻辑报错或 Gas 估算错误。
    *   解决：检查合约代码或尝试增加 Gas Limit。

*   **前端无法连接钱包**:
    *   解决：确保浏览器安装了 MetaMask 插件，并且网络已切换到 BSC 主网。

*   **购买算力失败**:
    *   解决：
        1. 确保钱包有足够的 USDT。
        2. 确保钱包有少量 BNB 用于支付 Gas 费。
        3. 检查控制台 (F12) 是否有具体的错误报错。
