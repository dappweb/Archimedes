// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IARC is IERC20 {
    function burn(uint256 amount) external;
}

contract ArchimedesProtocol is Ownable, ReentrancyGuard {
    
    struct UserInfo {
        address referrer;
        uint256 activeDirects; // Number of active direct referrals
        uint256 teamCount; // Total team size (simplified for this demo)
        uint256 totalRevenue; // Total earnings (dynamic + static)
        uint256 currentCap; // Current max cap (3x ticket)
        bool isActive;
    }

    struct ReferralData {
        address user;
        uint256 ticketAmount;
        uint256 joinTime;
    }

    struct Ticket {
        uint256 amount; // USDT Amount
        uint256 requiredLiquidity; // USDT Amount
        uint256 purchaseTime;
        bool liquidityProvided;
        uint256 liquidityAmount;
        uint256 startTime;
        uint256 cycleDays; // 7, 15, 30
        bool redeemed;
    }

    IERC20 public usdtToken;
    IARC public arcToken; // Represents ARC
    IERC20 public desToken; // Represents DES
    
    // Wallets
    address public platformWallet; // Official Platform Wallet
    address public lpWallet; // LP Wallet
    
    // Mappings
    mapping(address => bool) public isCommunityOffice;
    mapping(address => bool) public isWhitelist; // For buying ARC

    // Constants
    uint256 public constant SECONDS_IN_DAY = 86400;
    
    // Allocation Percents (USDT Inflow - Section 4)
    uint256 public constant NODE_DIVIDEND_PERCENT = 5; // V3+ Nodes
    uint256 public constant ARC_POOL_PERCENT = 65; // ARC Contract Pool (Buyback/Burn)
    uint256 public constant OFFICE_REWARD_PERCENT = 10; // Community Office
    uint256 public constant PLATFORM_PERCENT = 10; // Platform Wallet
    uint256 public constant DES_BUY_BURN_PERCENT = 10; // Buy DES & Burn

    // Swap Taxes (Section 3)
    uint256 public arcBuyTax = 0;
    uint256 public arcSellTax = 5; // 5% Total
    // Breakdown of Sell Tax: 1.5% Node, 1.5% Small Node, 2.0% Burn. 
    // Simplified for contract: 3% to Nodes/LP, 2% Burn? 
    // Requirement says: 1.5% V3, 1.5% V2, 2.0% Burn.
    // We will just burn 2% and send 3% to platform/dividend pool for distribution.

    // Redemption/Claim Config
    uint256 public desFeeFixed = 3 ether; // 3 DES
    uint256 public desFeeRate = 5; // 5% value

    // State
    mapping(address => UserInfo) public userInfo;
    mapping(address => Ticket) public userTicket;
    mapping(address => address[]) public directReferrals; // Stores list of direct referrals for each user
    
    // Daily Burn
    uint256 public lastBurnTime;

    // Events
    event BoundReferrer(address indexed user, address indexed referrer);
    event TicketPurchased(address indexed user, uint256 amount);
    event LiquidityStaked(address indexed user, uint256 amount, uint256 cycleDays);
    event RewardClaimed(address indexed user, uint256 usdtAmount, uint256 arcAmount);
    event Redeemed(address indexed user, uint256 principal, uint256 fee);
    event SwappedUSDTToARC(address indexed user, uint256 usdtAmount, uint256 arcAmount, uint256 tax);
    event SwappedARCToUSDT(address indexed user, uint256 arcAmount, uint256 usdtAmount, uint256 tax);
    event DailyBurn(uint256 amount);

    constructor(
        address _usdtToken, 
        address _arcToken,
        address _desToken,
        address _platformWallet,
        address _lpWallet
    ) Ownable(msg.sender) {
        usdtToken = IERC20(_usdtToken);
        arcToken = IARC(_arcToken);
        desToken = IERC20(_desToken);
        platformWallet = _platformWallet;
        lpWallet = _lpWallet;
    }

    // --- Admin Functions ---

    function setWallets(
        address _platform,
        address _lp
    ) external onlyOwner {
        platformWallet = _platform;
        lpWallet = _lp;
    }

    function setCommunityOffice(address office, bool status) external onlyOwner {
        isCommunityOffice[office] = status;
    }

    function setWhitelist(address user, bool status) external onlyOwner {
        isWhitelist[user] = status;
    }
    
    // Helper to find nearest office
    function findNearestOffice(address startUser) public view returns (address) {
        address current = userInfo[startUser].referrer;
        // Limit depth to avoid gas issues, e.g., 20 levels
        for (uint256 i = 0; i < 20; i++) {
            if (current == address(0)) return address(0);
            if (isCommunityOffice[current]) return current;
            current = userInfo[current].referrer;
        }
        return address(0);
    }

    // --- Admin User Management ---

    function adminSetUserStats(address user, uint256 _activeDirects, uint256 _teamCount) external onlyOwner {
        userInfo[user].activeDirects = _activeDirects;
        userInfo[user].teamCount = _teamCount;
    }

    function adminSetReferrer(address user, address newReferrer) external onlyOwner {
        require(user != newReferrer, "Cannot bind self");
        address oldReferrer = userInfo[user].referrer;
        
        // Update mapping
        userInfo[user].referrer = newReferrer;
        
        // Update arrays
        // 1. Remove from old referrer's list
        if (oldReferrer != address(0)) {
            address[] storage oldList = directReferrals[oldReferrer];
            for (uint256 i = 0; i < oldList.length; i++) {
                if (oldList[i] == user) {
                    oldList[i] = oldList[oldList.length - 1];
                    oldList.pop();
                    break;
                }
            }
        }
        
        // 2. Add to new referrer's list
        if (newReferrer != address(0)) {
            directReferrals[newReferrer].push(user);
        }
    }

    // --- Referral System ---

    function bindReferrer(address _referrer) external {
        require(userInfo[msg.sender].referrer == address(0), "Already bound");
        require(_referrer != msg.sender, "Cannot bind self");
        require(_referrer != address(0), "Invalid referrer");
        
        userInfo[msg.sender].referrer = _referrer;
        directReferrals[_referrer].push(msg.sender); // Add to referrer's list
        
        emit BoundReferrer(msg.sender, _referrer);
    }

    function getDirectReferrals(address _user) external view returns (address[] memory) {
        return directReferrals[_user];
    }

    function getDirectReferralsData(address _user) external view returns (ReferralData[] memory) {
        address[] memory directs = directReferrals[_user];
        ReferralData[] memory data = new ReferralData[](directs.length);
        
        for (uint256 i = 0; i < directs.length; i++) {
            data[i] = ReferralData({
                user: directs[i],
                ticketAmount: userTicket[directs[i]].amount,
                joinTime: userTicket[directs[i]].purchaseTime
            });
        }
        return data;
    }

    // --- Ticket Purchase ---

    function buyTicket(uint256 amount) external nonReentrant {
        require(amount == 100 ether || amount == 300 ether || amount == 500 ether || amount == 1000 ether, "Invalid ticket tier");
        require(!userTicket[msg.sender].liquidityProvided || userTicket[msg.sender].redeemed, "Active ticket exists");

        // Transfer USDT from user
        usdtToken.transferFrom(msg.sender, address(this), amount);

        // Distribute Funds (Section 4)
        
        // 1. 5% to V3+ Nodes (Sent to Platform for manual distribution or Dividend Contract)
        usdtToken.transfer(platformWallet, (amount * NODE_DIVIDEND_PERCENT) / 100);

        // 2. 65% to ARC Contract Pool (Stay in contract)
        // No transfer needed, it stays in address(this) for buyback/rewards
        
        // 3. 10% Community Office
        address office = findNearestOffice(msg.sender);
        if (office != address(0)) {
            usdtToken.transfer(office, (amount * OFFICE_REWARD_PERCENT) / 100);
        } else {
            // If no office found, send to Platform
            usdtToken.transfer(platformWallet, (amount * OFFICE_REWARD_PERCENT) / 100);
        }

        // 4. 10% Platform Wallet
        usdtToken.transfer(platformWallet, (amount * PLATFORM_PERCENT) / 100);

        // 5. 10% Buy DES & Burn
        // Using lpWallet as placeholder for "Burn Operations"
        usdtToken.transfer(lpWallet, (amount * DES_BUY_BURN_PERCENT) / 100);

        // Init Ticket
        userTicket[msg.sender] = Ticket({
            amount: amount,
            requiredLiquidity: (amount * 150) / 100, // 1.5x
            purchaseTime: block.timestamp,
            liquidityProvided: false,
            liquidityAmount: 0,
            startTime: 0,
            cycleDays: 0,
            redeemed: false
        });

        // Set Cap (3x)
        userInfo[msg.sender].currentCap = amount * 3;
        userInfo[msg.sender].totalRevenue = 0; // Reset revenue for new cycle

        emit TicketPurchased(msg.sender, amount);
    }

    // --- Provide Liquidity ---

    function stakeLiquidity(uint256 cycleDays) external nonReentrant {
        Ticket storage ticket = userTicket[msg.sender];
        require(ticket.amount > 0 && !ticket.liquidityProvided, "No valid ticket");
        require(block.timestamp <= ticket.purchaseTime + 72 hours, "Ticket expired");
        require(cycleDays == 7 || cycleDays == 15 || cycleDays == 30, "Invalid cycle");

        uint256 reqAmount = ticket.requiredLiquidity;
        usdtToken.transferFrom(msg.sender, address(this), reqAmount);

        ticket.liquidityProvided = true;
        ticket.liquidityAmount = reqAmount;
        ticket.startTime = block.timestamp;
        ticket.cycleDays = cycleDays;

        // Activate referrer count
        address referrer = userInfo[msg.sender].referrer;
        if (referrer != address(0) && !userInfo[msg.sender].isActive) {
            userInfo[referrer].activeDirects++;
            userInfo[msg.sender].isActive = true;
        }

        emit LiquidityStaked(msg.sender, reqAmount, cycleDays);
    }

    // --- Redemption & Claims ---

    function claimRewards() external nonReentrant {
        Ticket storage ticket = userTicket[msg.sender];
        require(ticket.liquidityProvided && !ticket.redeemed, "Not active");

        // Calculate Rate
        uint256 dailyRate = 0;
        if (ticket.cycleDays == 7) dailyRate = 20; // 2.0% (div 1000)
        else if (ticket.cycleDays == 15) dailyRate = 25; // 2.5%
        else if (ticket.cycleDays == 30) dailyRate = 30; // 3.0%

        uint256 daysPassed = (block.timestamp - ticket.startTime) / SECONDS_IN_DAY;
        require(daysPassed > 0, "No rewards yet");

        // Limit to cycle days
        if (daysPassed > ticket.cycleDays) {
            daysPassed = ticket.cycleDays;
        }

        uint256 rewardAmount = (ticket.amount * dailyRate * daysPassed) / 1000;
        
        // Cap Check (3x)
        if (userInfo[msg.sender].totalRevenue + rewardAmount > userInfo[msg.sender].currentCap) {
            rewardAmount = userInfo[msg.sender].currentCap - userInfo[msg.sender].totalRevenue;
        }

        require(rewardAmount > 0, "No rewards to claim");

        // FEE CHECK (Section 6)
        // Formula: (ClaimValue * 5% / DES_Price) + 3 DES
        
        uint256 desPrice = getDesPrice();
        require(desPrice > 0, "Invalid DES price");

        // Fee Value in USDT = rewardAmount * 5%
        uint256 feeValueUSDT = (rewardAmount * desFeeRate) / 100;
        
        // Fee in DES = (feeValueUSDT * 1e18) / desPrice
        uint256 variableFeeDES = (feeValueUSDT * 1e18) / desPrice;
        uint256 totalFeeDES = variableFeeDES + desFeeFixed;

        // Check DES Balance
        require(desToken.balanceOf(msg.sender) >= totalFeeDES, "Insufficient DES for fee");

        // Deduct Fee (Send to platform wallet)
        desToken.transferFrom(msg.sender, platformWallet, totalFeeDES);

        // Update State
        userInfo[msg.sender].totalRevenue += rewardAmount;

        // Split 50/50
        uint256 usdtPart = rewardAmount / 2;
        uint256 arcValuePart = rewardAmount / 2;

        require(usdtToken.balanceOf(address(this)) >= usdtPart, "Insufficient USDT in pool");
        usdtToken.transfer(msg.sender, usdtPart);

        // ARC Transfer
        uint256 arcPrice = getARCPrice();
        if (arcPrice == 0) arcPrice = 1 ether; // Fallback
        uint256 arcAmount = (arcValuePart * 1 ether) / arcPrice;
        
        require(arcToken.balanceOf(address(this)) >= arcAmount, "Insufficient ARC in pool");
        arcToken.transfer(msg.sender, arcAmount);

        emit RewardClaimed(msg.sender, usdtPart, arcAmount);
    }

    function getARCPrice() public view returns (uint256) {
        uint256 usdtBal = usdtToken.balanceOf(address(this));
        uint256 arcBal = arcToken.balanceOf(address(this));
        if (arcBal == 0) return 0;
        return (usdtBal * 1e18) / arcBal; // Price in USDT (1e18 scale)
    }

    // AMM Helper
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
        require(amountIn > 0, "Insufficient input amount");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        // x * y = k
        uint256 numerator = amountIn * reserveOut;
        uint256 denominator = reserveIn + amountIn;
        return numerator / denominator;
    }

    // --- Swap System ---

    // Buy ARC with USDT (Tax)
    function swapUSDTToARC(uint256 usdtAmount) external nonReentrant {
        require(usdtAmount > 0, "Invalid amount");
        require(isWhitelist[msg.sender], "Not whitelisted");
        
        // 1. Transfer USDT from user to contract
        usdtToken.transferFrom(msg.sender, address(this), usdtAmount);

        uint256 usdtReserve = usdtToken.balanceOf(address(this)) - usdtAmount;
        uint256 arcReserve = arcToken.balanceOf(address(this));
        
        // 2. Calculate ARC Output (Pre-tax)
        uint256 arcOutput = getAmountOut(usdtAmount, usdtReserve, arcReserve);
        
        // 3. Apply Tax
        uint256 tax = (arcOutput * arcBuyTax) / 100;
        uint256 amountToUser = arcOutput - tax;
        
        // 4. Check liquidity
        require(arcToken.balanceOf(address(this)) >= arcOutput, "Insufficient ARC liquidity");
        
        // 5. Burn Tax
        if (tax > 0) arcToken.burn(tax);
        
        // 6. Transfer remaining ARC to user
        arcToken.transfer(msg.sender, amountToUser);
        
        emit SwappedUSDTToARC(msg.sender, usdtAmount, amountToUser, tax);
    }

    // Sell ARC for USDT (Tax)
    function swapARCToUSDT(uint256 arcAmount) external nonReentrant {
        require(arcAmount > 0, "Invalid amount");
        
        // 1. Transfer ARC from user to contract
        arcToken.transferFrom(msg.sender, address(this), arcAmount);

        uint256 tax = (arcAmount * arcSellTax) / 100;
        uint256 amountToSwap = arcAmount - tax;
        
        // Tax Distribution:
        // Requirement: 1.5% V3, 1.5% V2, 2.0% Burn (Total 5%)
        // We will burn 2/5 of the tax, and send 3/5 to Platform for distribution
        uint256 burnPart = (tax * 2) / 5;
        uint256 distPart = tax - burnPart;
        
        arcToken.burn(burnPart);
        arcToken.transfer(platformWallet, distPart);
        
        // Now calculate Swap
        uint256 arcReserve = arcToken.balanceOf(address(this)) - amountToSwap; 
        uint256 usdtReserve = usdtToken.balanceOf(address(this));
        
        uint256 usdtOutput = getAmountOut(amountToSwap, arcReserve, usdtReserve);
        
        // Check liquidity
        require(usdtToken.balanceOf(address(this)) >= usdtOutput, "Insufficient USDT liquidity");
        
        // Transfer USDT to user
        usdtToken.transfer(msg.sender, usdtOutput);
        
        emit SwappedARCToUSDT(msg.sender, arcAmount, usdtOutput, tax);
    }

    function redeem() external nonReentrant {
        Ticket storage ticket = userTicket[msg.sender];
        require(ticket.liquidityProvided && !ticket.redeemed, "Cannot redeem");
        require(block.timestamp >= ticket.startTime + (ticket.cycleDays * 1 days), "Cycle not finished");

        // Return Principal
        usdtToken.transfer(msg.sender, ticket.liquidityAmount);
        
        ticket.redeemed = true;
        userInfo[msg.sender].isActive = false;

        emit Redeemed(msg.sender, ticket.liquidityAmount, 0);
    }
    
    // Price Helpers
    function getDesPrice() public view returns (uint256) {
        // Mock: If we had a pair, we'd query it. 
        // For now return 1 USDT = 1 DES (1e18) to allow testing
        return 1 ether; 
    }
}
