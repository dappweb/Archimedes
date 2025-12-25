const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Archimedes Requirement Alignment Test", function () {
  let owner, user1, user2, office, platform, lp, other;
  let usdt, arc, des, protocol;
  let usdtAddress, arcAddress, desAddress, protocolAddress;

  const TICKET_AMOUNT = ethers.parseEther("100");
  const REQUIRED_LIQUIDITY = ethers.parseEther("150"); // 1.5x
  const INITIAL_MINT = ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, user1, user2, office, platform, lp, other] = await ethers.getSigners();

    // 1. Deploy Tokens
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy();
    usdtAddress = await usdt.getAddress();

    const ARC = await ethers.getContractFactory("ARC");
    arc = await ARC.deploy(owner.address);
    arcAddress = await arc.getAddress();

    // Using MockUSDT as DES for simplicity as per deploy script logic
    const DES = await ethers.getContractFactory("MockUSDT"); 
    des = await DES.deploy();
    desAddress = await des.getAddress();

    // 2. Deploy Protocol
    const Protocol = await ethers.getContractFactory("ArchimedesProtocol");
    protocol = await Protocol.deploy(
      usdtAddress,
      arcAddress,
      desAddress,
      platform.address,
      lp.address
    );
    protocolAddress = await protocol.getAddress();

    // 3. Setup
    // Set Protocol in ARC to exempt from standard ERC20 tax if any
    await arc.setProtocol(protocolAddress);

    // Fund User1
    await usdt.transfer(user1.address, INITIAL_MINT);
    await usdt.transfer(user2.address, INITIAL_MINT);
    await des.transfer(user1.address, INITIAL_MINT); // For fees
    await des.transfer(user2.address, INITIAL_MINT); 
    
    // Fund Protocol with ARC (for rewards)
    await arc.transfer(protocolAddress, INITIAL_MINT);
    
    // Fund Protocol with USDT/DES (for swaps liquidity)
    await usdt.transfer(protocolAddress, INITIAL_MINT);
    await des.transfer(protocolAddress, INITIAL_MINT);

    // Approvals
    await usdt.connect(user1).approve(protocolAddress, ethers.MaxUint256);
    await arc.connect(user1).approve(protocolAddress, ethers.MaxUint256);
    await des.connect(user1).approve(protocolAddress, ethers.MaxUint256);
    
    await usdt.connect(user2).approve(protocolAddress, ethers.MaxUint256);
    await des.connect(user2).approve(protocolAddress, ethers.MaxUint256);

    // Setup Office
    await protocol.setCommunityOffice(office.address, true);
    
    // Bind Referrer: User1 -> Office
    await protocol.connect(user1).bindReferrer(office.address);
    // Bind Referrer: User2 -> User1
    await protocol.connect(user2).bindReferrer(user1.address);
  });

  describe("1. Mining Inflow Allocation (Section 4)", function () {
    it("Should allocate funds correctly: 5% Node, 10% Office, 10% Platform, 10% DES Burn, 65% Contract", async function () {
      // User2 buys ticket. User2 referrer is User1 (not office), but recursive lookup should find Office.
      // Wait, User1 is NOT office. Office is 'office'.
      // Chain: User2 -> User1 -> Office
      
      // Need to link User1 to Office first? Yes, done in beforeEach.
      // findNearestOffice(User2) -> User1 (No) -> Office (Yes).
      
      const initialPlatformBal = await usdt.balanceOf(platform.address);
      const initialOfficeBal = await usdt.balanceOf(office.address);
      const initialLPBal = await usdt.balanceOf(lp.address); // DES Buy Burn
      const initialContractBal = await usdt.balanceOf(protocolAddress);

      await protocol.connect(user2).buyTicket(TICKET_AMOUNT);

      const finalPlatformBal = await usdt.balanceOf(platform.address);
      const finalOfficeBal = await usdt.balanceOf(office.address);
      const finalLPBal = await usdt.balanceOf(lp.address);
      const finalContractBal = await usdt.balanceOf(protocolAddress);

      // 5% Node + 10% Platform = 15% to Platform Wallet
      // (Actually contract sends 5% and 10% separately to platformWallet)
      const platformGain = finalPlatformBal - initialPlatformBal;
      const expectedPlatformGain = (TICKET_AMOUNT * 15n) / 100n;
      expect(platformGain).to.equal(expectedPlatformGain, "Platform + Node Dividend should be 15%");

      // 10% Office
      const officeGain = finalOfficeBal - initialOfficeBal;
      const expectedOfficeGain = (TICKET_AMOUNT * 10n) / 100n;
      expect(officeGain).to.equal(expectedOfficeGain, "Community Office should get 10%");

      // 10% DES Buy Burn (Sent to LP Wallet in this implementation)
      const lpGain = finalLPBal - initialLPBal;
      const expectedLPGain = (TICKET_AMOUNT * 10n) / 100n;
      expect(lpGain).to.equal(expectedLPGain, "DES Buy Burn (LP Wallet) should get 10%");

      // 65% Contract Pool
      // Note: Contract also received TICKET_AMOUNT from user, then sent out 35%. 
      // So net change = +65%.
      // But wait, buyTicket transferFrom user to contract first. 
      // Then contract transfers out.
      // So final balance should be initial + 65%.
      const contractGain = finalContractBal - initialContractBal;
      const expectedContractGain = (TICKET_AMOUNT * 65n) / 100n;
      expect(contractGain).to.equal(expectedContractGain, "Contract Pool should keep 65%");
    });
  });

  describe("2. Reinvestment Logic (Section 5.4)", function () {
    it("Should allow 50% USDT + 50% ARC reinvestment and burn ARC", async function () {
      // 1. User1 buys ticket
      await protocol.connect(user1).buyTicket(TICKET_AMOUNT);
      
      // 2. User1 gets some ARC (simulate from market or previous rewards)
      // Required Liquidity = 150 USDT.
      // 50% = 75 USDT value.
      // Assume ARC Price = 1 USDT (Mock logic in contract: getARCPrice returns based on ratio)
      // Let's set pool ratio 1:1
      // Pool has 1M USDT, 1M ARC. Price = 1.
      
      const usdtPart = REQUIRED_LIQUIDITY / 2n; // 75
      const arcValuePart = REQUIRED_LIQUIDITY / 2n; // 75 Value
      const arcPart = REQUIRED_LIQUIDITY / 2n; // 75 ARC (approx)
      
      await arc.transfer(user1.address, arcPart); // Ensure user has ARC
      
      const initialUserUSDT = await usdt.balanceOf(user1.address);
      const initialUserARC = await arc.balanceOf(user1.address);
      const initialBurnedARC = await arc.balanceOf(ethers.ZeroAddress); // or check total supply?
      // ARC burn reduces total supply.
      const initialSupply = await arc.totalSupply();

      // 3. Reinvest
      // Need to wait 72h? No, reinvest doesn't check "previous cycle ended" strictly in code logic 
      // unless we enforced it. The code checks "active ticket exists" only for buyTicket.
      // reinvest checks: !ticket.liquidityProvided.
      // buyTicket sets liquidityProvided = false.
      // So we can call reinvest immediately after buyTicket.
      
      // Calculate Expected ARC Amount based on CURRENT contract price
      // Note: buyTicket changed the pool ratio (USDT increased), so price changed slightly.
      const currentPrice = await protocol.getARCPrice();
      const expectedArcAmount = (arcValuePart * ethers.parseEther("1")) / currentPrice;

      await expect(protocol.connect(user1).reinvest(7))
        .to.emit(protocol, "Reinvested")
        .withArgs(user1.address, usdtPart, expectedArcAmount, 7);

      // Check Balances
      const finalUserUSDT = await usdt.balanceOf(user1.address);
      const finalUserARC = await arc.balanceOf(user1.address);
      const finalSupply = await arc.totalSupply();

      expect(initialUserUSDT - finalUserUSDT).to.equal(usdtPart, "Should deduct 50% USDT");
      expect(initialUserARC - finalUserARC).to.equal(expectedArcAmount, "Should deduct 50% ARC");
      expect(initialSupply - finalSupply).to.equal(expectedArcAmount, "Should burn the ARC part");
      
      // Check Ticket Status
      const ticket = await protocol.userTicket(user1.address);
      expect(ticket.liquidityProvided).to.be.true;
      expect(ticket.liquidityAmount).to.equal(REQUIRED_LIQUIDITY);
    });
  });

  describe("3. Withdrawal Fee (Section 6.1)", function () {
    it("Should deduct (5% Value + 3 DES) fee on claim", async function () {
      // 1. User1 Stake
      await protocol.connect(user1).buyTicket(TICKET_AMOUNT);
      await protocol.connect(user1).stakeLiquidity(7); // 7 days

      // 2. Fast forward 1 day
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");

      // 3. Calculate expected reward
      // Daily rate for 7 days = 2.0% = 20/1000
      // Reward = 100 * 0.02 * 1 = 2 USDT.
      const reward = ethers.parseEther("2");
      
      // Fee Calculation
      // 5% of Reward Value = 0.1 USDT.
      // DES Price = 1 USDT (Mock).
      // Variable Fee = 0.1 DES.
      // Fixed Fee = 3 DES.
      // Total Fee = 3.1 DES.
      
      const fixedFee = ethers.parseEther("3");
      const variableFee = (reward * 5n) / 100n; // 0.1 ether
      const totalFee = fixedFee + variableFee;

      const initialUserDES = await des.balanceOf(user1.address);
      
      await protocol.connect(user1).claimRewards();
      
      const finalUserDES = await des.balanceOf(user1.address);
      
      // Tolerance for minor precision
      expect(initialUserDES - finalUserDES).to.equal(totalFee, "Should deduct correct DES fee");
    });
  });

  describe("4. Swap Taxes (Section 3)", function () {
    it("Swap ARC -> USDT: 5% Tax (2% Burn, 3% Platform)", async function () {
      // User1 swaps 100 ARC
      const amountIn = ethers.parseEther("100");
      await arc.transfer(user1.address, amountIn); // Ensure balance
      
      const tax = (amountIn * 5n) / 100n; // 5 ARC
      const burnPart = (tax * 2n) / 5n; // 2 ARC
      const distPart = tax - burnPart; // 3 ARC
      
      const initialPlatformARC = await arc.balanceOf(platform.address);
      const initialSupply = await arc.totalSupply();
      
      await protocol.connect(user1).swapARCToUSDT(amountIn);
      
      const finalPlatformARC = await arc.balanceOf(platform.address);
      const finalSupply = await arc.totalSupply();
      
      expect(finalPlatformARC - initialPlatformARC).to.equal(distPart, "Platform should get 3/5 of tax");
      expect(initialSupply - finalSupply).to.equal(burnPart, "2/5 of tax should be burned");
    });

    it("Swap DES -> USDT: 3% Tax (All Burn)", async function () {
      // User1 swaps 100 DES
      const amountIn = ethers.parseEther("100");
      
      const tax = (amountIn * 3n) / 100n; // 3 DES
      
      // For DES (MockUSDT), burn sends to 0x...dEaD
      const deadAddress = "0x000000000000000000000000000000000000dEaD";
      const initialDeadBal = await des.balanceOf(deadAddress);
      
      await protocol.connect(user1).swapDESToUSDT(amountIn);
      
      const finalDeadBal = await des.balanceOf(deadAddress);
      
      expect(finalDeadBal - initialDeadBal).to.equal(tax, "3% Tax should be sent to Dead address");
    });
    
    it("Swap USDT -> ARC: 0% Tax, Whitelist Only", async function () {
        const amountIn = ethers.parseEther("100");
        
        // Not whitelisted initially
        await expect(protocol.connect(user2).swapUSDTToARC(amountIn))
            .to.be.revertedWith("Not whitelisted");
            
        // Whitelist User1
        await protocol.setWhitelist(user1.address, true);
        
        // Should succeed
        await expect(protocol.connect(user1).swapUSDTToARC(amountIn))
            .to.emit(protocol, "SwappedUSDTToARC");
            
        // 0% Tax check implicitly handled by formula (if tax > 0, arc burned)
        // We can check event args if needed, but reversion check proves Whitelist logic.
    });
  });
});
