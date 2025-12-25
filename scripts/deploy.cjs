const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Network configurations
const NETWORK_CONFIGS = {
  mc: {
    name: "MC Chain",
    chainId: 88813,
    explorer: "https://mcerscan.com",
    currency: "MC"
  },
  sepolia: {
    name: "Ethereum Sepolia",
    chainId: 11155111,
    explorer: "https://sepolia.etherscan.io",
    currency: "SepoliaETH"
  },
  bscTestnet: {
    name: "BSC Testnet",
    chainId: 97,
    explorer: "https://testnet.bscscan.com",
    currency: "tBNB"
  },
  hardhat: {
    name: "Hardhat Local",
    chainId: 31337,
    explorer: "N/A",
    currency: "ETH"
  }
};

async function main() {
  const networkName = hre.network.name;
  const networkConfig = NETWORK_CONFIGS[networkName] || { name: networkName, chainId: "Unknown" };

  console.log("🚀 Starting Deployment");
  console.log("=".repeat(70));
  console.log(`📡 Network: ${networkConfig.name} (${networkName})`);
  console.log(`🔗 Chain ID: ${networkConfig.chainId}`);
  console.log(`🌐 Explorer: ${networkConfig.explorer}`);
  console.log("=".repeat(70));
  console.log("");

  const [deployer] = await hre.ethers.getSigners();

  if (!deployer) {
    console.error("❌ Error: No deployer account found!");
    console.error("   Please ensure your .env file exists and contains a valid PRIVATE_KEY.");
    console.error("   Check hardhat.config.cjs to verify network configuration.");
    process.exit(1);
  }

  console.log("📍 Deploying with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), networkConfig.currency);
  console.log("");

  // 1. Deploy Mock USDT (formerly MockMC)
  console.log("Deploying MockUSDT...");
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("MockUSDT deployed to:", usdtAddress);

  // 2. Deploy ARC Token (formerly JBC)
  console.log("Deploying ARC...");
  const ARC = await hre.ethers.getContractFactory("ARC");
  const arc = await ARC.deploy(deployer.address);
  await arc.waitForDeployment();
  const arcAddress = await arc.getAddress();
  console.log("ARC deployed to:", arcAddress);

  // 3. Deploy DES Token
  console.log("Deploying DES...");
  // Using MockUSDT as base for DES token for simplicity in this demo, 
  // in production should be a separate ERC20 implementation with specific DES logic if any
  const DES = await hre.ethers.getContractFactory("MockUSDT"); 
  const des = await DES.deploy();
  await des.waitForDeployment();
  const desAddress = await des.getAddress();
  console.log("DES deployed to:", desAddress);

  // 4. Deploy Protocol
  // Define wallet addresses (using deployer for all for simplicity in testnet)
  const platformWallet = deployer.address;
  const lpWallet = deployer.address;

  console.log("Deploying ArchimedesProtocol...");
  const Protocol = await hre.ethers.getContractFactory("ArchimedesProtocol");
  const protocol = await Protocol.deploy(
    usdtAddress,
    arcAddress,
    desAddress,
    platformWallet,
    lpWallet
  );
  await protocol.waitForDeployment();
  const protocolAddress = await protocol.getAddress();
  console.log("ArchimedesProtocol deployed to:", protocolAddress);

  // 5. Setup Permissions & Initial Funding
  console.log("Setting up permissions...");
  
  // Set Protocol address in ARC (to exempt from tax if needed, or set minter)
  try {
      const tx = await arc.setProtocol(protocolAddress);
      await tx.wait();
      console.log("Protocol address set in ARC token");
  } catch (e) {
      console.log("Skipping setProtocol for ARC (might not exist in contract):", e.message);
  }

  // Set Protocol address in DES
  try {
      const tx = await des.setProtocol(protocolAddress);
      await tx.wait();
      console.log("Protocol address set in DES token");
  } catch (e) {
      console.log("Skipping setProtocol for DES:", e.message);
  }

  // Funding Protocol with Tokens (Simulation)
  console.log("Funding protocol with initial tokens...");
  
  // Fund Protocol with ARC (for rewards)
  const initialARCSupply = hre.ethers.parseEther("1000000"); // 1M ARC
  await arc.transfer(protocolAddress, initialARCSupply);
  console.log("Transferred 1M ARC to Protocol");

  // Fund Protocol with USDT (for rewards/withdrawals simulation)
  const initialUSDTSupply = hre.ethers.parseEther("1000000"); // 1M USDT
  await usdt.transfer(protocolAddress, initialUSDTSupply);
  console.log("Transferred 1M USDT to Protocol");

  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId: networkConfig.chainId,
    date: new Date().toISOString(),
    contracts: {
      USDT: usdtAddress,
      ARC: arcAddress,
      DES: desAddress,
      Protocol: protocolAddress
    },
    wallets: {
        platform: platformWallet,
        lp: lpWallet
    }
  };

  const deployDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir);
  }

  fs.writeFileSync(
    path.join(deployDir, `deployment-${networkName}-${Date.now()}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  // Update latest.json
  fs.writeFileSync(
    path.join(deployDir, `latest-${networkName}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Update src/config.ts
  const configPath = path.join(__dirname, "../src/config.ts");
  if (fs.existsSync(configPath)) {
    let configContent = fs.readFileSync(configPath, "utf8");
    
    const newAddresses = `export const CONTRACT_ADDRESSES = {
  USDT_TOKEN: "${usdtAddress}",
  ARC_TOKEN: "${arcAddress}",
  DES_TOKEN: "${desAddress}",
  PROTOCOL: "${protocolAddress}"
};`;

    configContent = configContent.replace(
      /export const CONTRACT_ADDRESSES = \{[\s\S]*?\};/,
      newAddresses
    );
    
    fs.writeFileSync(configPath, configContent);
    console.log("✅ Updated src/config.ts with new addresses");
  } else {
    console.warn("⚠️ src/config.ts not found");
  }

  console.log("");
  console.log("✅ Deployment Complete!");
  console.log("----------------------------------");
  console.log("USDT (Mock):", usdtAddress);
  console.log("ARC:", arcAddress);
  console.log("DES (Mock):", desAddress);
  console.log("Protocol:", protocolAddress);
  console.log("----------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
