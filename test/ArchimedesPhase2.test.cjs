const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Archimedes Phase 2 Requirements", function () {
    let ARC, arc;
    let MockUSDT, usdt, des; // DES is also a MockUSDT for testing
    let Protocol, protocol;
    let owner, user1, user2, referrer, office, platform, lpWallet, lpPair;

    const TICKET_PRICE = ethers.parseEther("100");
    const DES_FEE_FIXED = ethers.parseEther("3");

    beforeEach(async function () {
        [owner, user1, user2, referrer, office, platform, lpWallet, lpPair] = await ethers.getSigners();

        // 1. Deploy Tokens
        MockUSDT = await ethers.getContractFactory("MockUSDT");
        usdt = await MockUSDT.deploy();
        await usdt.waitForDeployment();

        des = await MockUSDT.deploy(); // Deploy separate DES token
        await des.waitForDeployment();

        ARC = await ethers.getContractFactory("ARC");
        arc = await ARC.deploy(owner.address);
        await arc.waitForDeployment();

        // 2. Deploy Protocol
        Protocol = await ethers.getContractFactory("ArchimedesProtocol");
        protocol = await Protocol.deploy(
            await usdt.getAddress(),
            await arc.getAddress(),
            await des.getAddress(),
            platform.address,
            lpWallet.address
        );
        await protocol.waitForDeployment();

        // 3. Setup Permissions
        await arc.setProtocol(await protocol.getAddress());
        await arc.setPair(lpPair.address); // Mock Pair

        // 4. Fund Protocol
        // Fund ARC for rewards/swaps
        await arc.transfer(await protocol.getAddress(), ethers.parseEther("1000000"));
        // Fund USDT for swaps
        await usdt.transfer(await protocol.getAddress(), ethers.parseEther("1000000"));

        // 5. Fund User
        await usdt.mint(user1.address, ethers.parseEther("10000"));
        await des.mint(user1.address, ethers.parseEther("1000")); // Give user some DES
        
        // Approve Protocol
        await usdt.connect(user1).approve(await protocol.getAddress(), ethers.MaxUint256);
        await des.connect(user1).approve(await protocol.getAddress(), ethers.MaxUint256);
        await arc.connect(user1).approve(await protocol.getAddress(), ethers.MaxUint256);
    });

    describe("Requirement 4: Mining Inflow Logic (5/65/10/10/10)", function () {
        it("Should distribute USDT correctly when Office exists", async function () {
            // Setup Office
            await protocol.setCommunityOffice(office.address, true);
            
            // Bind Referrer (who is an office)
            await protocol.connect(user1).bindReferrer(office.address);

            const initialPlatformBal = await usdt.balanceOf(platform.address);
            const initialOfficeBal = await usdt.balanceOf(office.address);
            const initialLpBal = await usdt.balanceOf(lpWallet.address); // Represents DES Burn
            const initialContractBal = await usdt.balanceOf(await protocol.getAddress());

            // Buy Ticket (100 USDT)
            await protocol.connect(user1).buyTicket(TICKET_PRICE);

            // 1. Node Dividend (5%) -> Platform (as placeholder)
            // 2. Platform (10%) -> Platform
            // Total Platform = 15%
            expect(await usdt.balanceOf(platform.address)).to.equal(initialPlatformBal + ethers.parseEther("15"));

            // 3. Office (10%) -> Office
            expect(await usdt.balanceOf(office.address)).to.equal(initialOfficeBal + ethers.parseEther("10"));

            // 4. DES Burn (10%) -> LP Wallet
            expect(await usdt.balanceOf(lpWallet.address)).to.equal(initialLpBal + ethers.parseEther("10"));

            // 5. ARC Pool (65%) -> Contract
            // Note: Contract already had 1M, so +65
            expect(await usdt.balanceOf(await protocol.getAddress())).to.equal(initialContractBal + ethers.parseEther("65"));
        });
    });

    describe("Requirement 3: Swap Taxes", function () {
        it("Should have 0% Tax on Buy (Swap USDT -> ARC)", async function () {
            // Whitelist User
            await protocol.setWhitelist(user1.address, true);

            const amountIn = ethers.parseEther("100");
            
            // Get expected output (No Tax)
            const reserveIn = await usdt.balanceOf(await protocol.getAddress());
            const reserveOut = await arc.balanceOf(await protocol.getAddress());
            const expectedOut = await protocol.getAmountOut(amountIn, reserveIn, reserveOut);

            // Swap
            await expect(protocol.connect(user1).swapUSDTToARC(amountIn))
                .to.emit(protocol, "SwappedUSDTToARC")
                .withArgs(user1.address, amountIn, expectedOut, 0); // Tax should be 0

            // Verify User Balance
            expect(await arc.balanceOf(user1.address)).to.equal(expectedOut);
        });

        it("Should have 5% Tax on Sell (Swap ARC -> USDT)", async function () {
            // Give user some ARC first (bypass tax by using owner transfer)
            await arc.transfer(user1.address, ethers.parseEther("1000"));

            const amountIn = ethers.parseEther("100");
            
            // Tax = 5% = 5 ARC
            const tax = ethers.parseEther("5");
            const amountAfterTax = ethers.parseEther("95");

            // Calculate Swap
            // Note: Reserves change after transfer? No, transferFrom happens inside.
            // But we need to account for reserves *before* the swap logic runs but *after* tax distribution?
            // Let's check contract logic:
            // 1. Transfer ARC to Contract
            // 2. Distribute Tax (Burn 2%, Platform 3%)
            // 3. Calculate Swap with remaining ARC (95) vs Reserves
            
            // Initial Reserves
            const initialArcReserve = await arc.balanceOf(await protocol.getAddress());
            const initialUsdtReserve = await usdt.balanceOf(await protocol.getAddress());

            // User sells 100 ARC
            // Contract receives 100 ARC.
            // Tax 5 ARC. 2 Burned, 3 to Platform.
            // Remaining 95 ARC added to pool for swap? 
            // The code says: `uint256 arcReserve = arcToken.balanceOf(address(this)) - amountToSwap;`
            // `amountToSwap` is 95.
            // So reserve includes the 95?
            // `arcToken.transferFrom` adds 100 to contract.
            // `burn(2)` removes 2.
            // `transfer(platform, 3)` removes 3.
            // Net change to balance: +95.
            // `balanceOf(this)` = Initial + 95.
            // `arcReserve` = (Initial + 95) - 95 = Initial. Correct.
            
            const expectedUsdtOut = await protocol.getAmountOut(amountAfterTax, initialArcReserve, initialUsdtReserve);

            await protocol.connect(user1).swapARCToUSDT(amountIn);

            expect(await usdt.balanceOf(user1.address)).to.be.closeTo(ethers.parseEther("10000") + expectedUsdtOut, ethers.parseEther("0.1"));
        });
    });

    describe("Requirement 6: Withdrawal Fees", function () {
        it("Should deduct DES fees correctly", async function () {
            // 1. Buy Ticket
            await protocol.connect(user1).buyTicket(TICKET_PRICE);

            // 2. Stake Liquidity (Required 150)
            await usdt.connect(user1).approve(await protocol.getAddress(), ethers.MaxUint256);
            await protocol.connect(user1).stakeLiquidity(7); // 7 Days

            // 3. Fast Forward 1 Day
            await time.increase(86400);

            // 4. Claim
            // Daily Rate for 7 days = 2.0%
            // Reward = 100 * 2.0% * 1 day = 2 USDT Value
            // Fee Formula: (Value * 5% / DES_Price) + 3 DES
            // Value = 2 USDT. 5% = 0.1 USDT.
            // DES Price = 1 USDT.
            // Variable Fee = 0.1 DES.
            // Fixed Fee = 3 DES.
            // Total Fee = 3.1 DES.

            const initialDesBal = await des.balanceOf(user1.address);
            
            await protocol.connect(user1).claimRewards();

            const finalDesBal = await des.balanceOf(user1.address);
            const feePaid = initialDesBal - finalDesBal;
            
            expect(feePaid).to.equal(ethers.parseEther("3.1"));
        });
    });
});
