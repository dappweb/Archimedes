const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// BSC Mainnet USDT Address
const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

async function main() {
  console.log("🚀 Starting BSC Mainnet Deployment");
  console.log("=".repeat(70));

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    console.error("❌ Error: No deployer account found!");
    process.exit(1);
  }

  console.log("📍 Deploying with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "BNB");
  console.log("");

  // 1. Check USDT
  // On mainnet, we don't deploy USDT, we use the existing one.
  const usdtAddress = BSC_USDT_ADDRESS;
  console.log("✅ Using existing USDT at:", usdtAddress);

  // 2. Deploy ARC Token
  console.log("Deploying ARC...");
  const ARC = await hre.ethers.getContractFactory("ARC");
  const arc = await ARC.deploy(deployer.address);
  await arc.waitForDeployment();
  const arcAddress = await arc.getAddress();
  console.log("✅ ARC deployed to:", arcAddress);

  // 3. Deploy DES Token
  console.log("Deploying DES...");
  const DES = await hre.ethers.getContractFactory("DES");
  const des = await DES.deploy(deployer.address);
  await des.waitForDeployment();
  const desAddress = await des.getAddress();
  console.log("✅ DES deployed to:", desAddress);

  // 4. Deploy Protocol
  // Define wallet addresses (using deployer for initial setup, should be transferred later)
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
  console.log("✅ ArchimedesProtocol deployed to:", protocolAddress);

  // 5. Setup Permissions (Optional but recommended)
  console.log("\n⚙️ Setting up permissions...");
  
  // Set Protocol in ARC and DES
  console.log("Setting protocol address in ARC...");
  await arc.setProtocol(protocolAddress);
  
  console.log("Setting protocol address in DES...");
  await des.setProtocol(protocolAddress);

  console.log("✅ Permissions set.");

  // 6. Update Frontend Config
  console.log("\n📝 Updating frontend config...");
  const configPath = path.join(__dirname, "../src/config.ts");
  let configContent = fs.readFileSync(configPath, "utf8");

  // Update addresses using regex
  configContent = configContent.replace(
    /USDT_TOKEN: "0x[a-fA-F0-9]+"/,
    `USDT_TOKEN: "${usdtAddress}"`
  );
  configContent = configContent.replace(
    /ARC_TOKEN: "0x[a-fA-F0-9]+"/,
    `ARC_TOKEN: "${arcAddress}"`
  );
  configContent = configContent.replace(
    /DES_TOKEN: "0x[a-fA-F0-9]+"/,
    `DES_TOKEN: "${desAddress}"`
  );
  configContent = configContent.replace(
    /PROTOCOL: "0x[a-fA-F0-9]+"/,
    `PROTOCOL: "${protocolAddress}"`
  );

  fs.writeFileSync(configPath, configContent);
  console.log("✅ src/config.ts updated with new addresses.");

  console.log("\n🎉 Deployment Complete!");
  console.log("=".repeat(70));
  console.log(`USDT:     ${usdtAddress}`);
  console.log(`ARC:      ${arcAddress}`);
  console.log(`DES:      ${desAddress}`);
  console.log(`Protocol: ${protocolAddress}`);
  console.log("=".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
