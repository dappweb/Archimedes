# Archimedes Protocol Test Guide (Sepolia)

This guide provides step-by-step instructions to test the deployed Archimedes Protocol on the Sepolia testnet.

## 1. Prerequisites

- **Network**: Sepolia Testnet
- **Wallet**: Metamask (connected to Sepolia)
- **Account**: Ensure you have some Sepolia ETH for gas.

## 2. Initial Setup & Funding

Since this is a testnet deployment, you need test tokens (USDT, ARC, DES) to interact with the protocol.

1.  **Fund Protocol Pool**:
    - The deployment script has already funded the protocol with initial ARC and USDT.
    - If the pool is empty, use the **Admin Panel > Liquidity Management** to add more tokens.

2.  **Get Test Tokens for User**:
    - You may need to transfer some Mock USDT and Mock DES to your test account.
    - Ask the deployer (or use the deployer account) to send tokens to your test address.
    - **DES Token**: Required for paying claim fees.
    - **USDT Token**: Required for buying mining tickets.

## 3. Whitelist & Office Setup (Admin)

Before users can buy ARC or receive full rewards, the admin must set up the environment.

1.  **Connect as Admin** (Deployer account).
2.  Go to **Admin Panel**.
3.  **Whitelist User**:
    - Enter the user's address in "Whitelist Manager".
    - Click **Add Whitelist**.
    - *Why?* Users cannot buy ARC (Swap USDT -> ARC) unless whitelisted.
4.  **Set Community Office** (Optional):
    - Enter an address in "Community Office".
    - Click **Set Office**.
    - *Why?* Office nodes receive 10% of ticket sales.

## 4. Mining Flow

1.  **Bind Referrer**:
    - Connect with a new User wallet.
    - Go to **Mining Panel**.
    - Enter a referrer address (e.g., the Admin address) and click **Bind**.
    - *Requirement*: You must have a referrer to participate.

2.  **Buy Ticket**:
    - Select a Ticket Tier (e.g., 100 USDT).
    - Click **Approve USDT**.
    - Click **Buy Ticket**.
    - *Check*: Transaction should succeed, and you should see "Step 1 (Completed)".

3.  **Stake Liquidity**:
    - Select a Cycle (e.g., 7 Days).
    - Click **Approve USDT** (for the liquidity part).
    - Click **Stake**.
    - *Check*: UI updates to "Already Staked".

4.  **Claim Rewards** (After some time):
    - Wait for rewards to accumulate (or ask Admin/Dev to fast-forward time if using local node, but on Sepolia you must wait).
    - Click **Claim Rewards**.
    - **Fee Check**: The system will check if you have enough DES.
    - If needed, it will ask to **Approve DES**.
    - Confirm transaction.
    - *Result*: You receive USDT and ARC rewards; DES fee is deducted.

5.  **Redeem Principal** (After cycle ends):
    - Once the cycle days (e.g., 7 days) have passed.
    - Click **Redeem**.
    - *Result*: Principal USDT is returned to your wallet.

## 5. Swap Flow

1.  Go to **Swap Panel**.
2.  **Buy ARC (USDT -> ARC)**:
    - Ensure you are **Whitelisted**.
    - Enter USDT amount.
    - Click **Swap**.
    - *Note*: If not whitelisted, the button will show "Not Whitelisted".
3.  **Sell ARC (ARC -> USDT)**:
    - Click the arrow to switch direction.
    - Enter ARC amount.
    - Click **Swap**.
    - *Tax*: A 5% tax applies (burned/distributed).

## 6. Contract Addresses

- **USDT**: `0x7179d727f86f49a80d7774ad1B0Ebae2662A581E`
- **ARC**: `0x692e322262669677B55CF78e1EE543D121c16242`
- **DES**: `0xE4f775e08FFAf7889E4a7c4289DfCAf8EcD89360`
- **Protocol**: `0x88b4e335B66D2aEDDC3c3BfB3B0af05eD2F1Df79`

Good luck testing!
