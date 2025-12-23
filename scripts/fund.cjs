const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Funding with account:", deployer.address);

  // Addresses from recent deployment
  const usdtAddress = "0xdBb003D94597fb8F81e968427568DD975c484A5e";
  const arcAddress = "0xb30CaeEac83C31A7119d3bbda8320257B3FeF2c0";
  const protocolAddress = "0x999b12586B7B360B008502f4f0cb83052565798D";

  const usdt = await hre.ethers.getContractAt("MockUSDT", usdtAddress);
  const arc = await hre.ethers.getContractAt("ARC", arcAddress);

  // Fund Protocol with ARC (for rewards)
  // console.log("Transferring ARC...");
  // const initialARCSupply = hre.ethers.parseEther("1000000"); // 1M ARC
  // try {
  //     const tx1 = await arc.transfer(protocolAddress, initialARCSupply);
  //     await tx1.wait();
  //     console.log("Transferred 1M ARC to Protocol");
  // } catch (e) {
  //     console.log("ARC transfer failed or already done:", e.message);
  // }

  // Fund Protocol with USDT (for rewards/withdrawals simulation)
  console.log("Transferring USDT...");
  const initialUSDTSupply = hre.ethers.parseEther("1000000"); // 1M USDT
  try {
      const tx2 = await usdt.transfer(protocolAddress, initialUSDTSupply);
      await tx2.wait();
      console.log("Transferred 1M USDT to Protocol");
  } catch (e) {
      console.log("USDT transfer failed or already done:", e.message);
  }

  console.log("Funding Complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});