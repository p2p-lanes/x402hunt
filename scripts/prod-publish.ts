import { ethers } from 'ethers'
import * as crypto from 'crypto'
import * as dotenv from 'dotenv'

dotenv.config()

const FUNCTION_URL = 'https://x402hunt.xyz/advertise'
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || ''

if (!TEST_PRIVATE_KEY) {
    console.error('ERROR: TEST_PRIVATE_KEY not set in .env file')
    process.exit(1)
}

async function main() {
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const wallet = new ethers.Wallet(TEST_PRIVATE_KEY, provider);

    console.log(`\n--- Production Ad Campaign: x402hunt advertising itself ---`)
    console.log(`Client Address: ${wallet.address}`)
    console.log(`Target URL: ${FUNCTION_URL}`)

    // 1. Fetch Requirements
    console.log(`\n[1] Fetching requirements...`)
    const reqResponse = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });

    if (reqResponse.status !== 402) {
        console.error(`Unexpected status: ${reqResponse.status}`);
        const text = await reqResponse.text();
        console.error(`Response: ${text}`);
        process.exit(1);
    }

    const reqData = await reqResponse.json();
    const requirements = reqData.accepts[0]; // x402scan-compatible format
    console.log('Requirements:', requirements);

    // 2. Adjust Amount (Pay 0.001 USDC for the ad)
    // We can pay any amount between min and max. Let's pay 0.001 USDC (1000 atomic)
    const amountToPay = '1000'; // 0.001 USDC
    console.log(`\nAmount to pay: ${amountToPay} atomic units (0.001 USDC)`)

    // 3. Sign Payment
    console.log(`\n[2] Signing payment...`)
    const chainId = 8453;
    const domain = {
        name: 'USD Coin',
        version: '2',
        chainId: chainId,
        verifyingContract: requirements.asset
    };

    const types = {
        TransferWithAuthorization: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
        ]
    };

    const validBefore = Math.floor(Date.now() / 1000) + 3600;
    const nonce = '0x' + crypto.randomBytes(32).toString('hex');

    const value = {
        from: wallet.address,
        to: requirements.payTo,
        value: amountToPay,
        validAfter: 0,
        validBefore: validBefore,
        nonce: nonce
    };

    const signature = await wallet.signTypedData(domain, types, value);
    console.log(`Signature: ${signature}`);

    // 4. Submit Proof + Ad Data
    console.log(`\n[3] Submitting payment proof & ad...`)

    // Ad Content for x402hunt itself
    const adData = {
        title: "x402 Hunt - The Agentic Ad Board",
        description: `## The First Machine-to-Machine Ad Platform
Submit ads programmatically using pure crypto payments. 

- **No Accounts**: Just sign and pay
- **No Approvals**: Instant publication
- **Agent Friendly**: REST API + EIP-712 support

Build your agent's marketing strategy on x402 Hunt today.`,
        link: "https://x402hunt.xyz"
    };

    const paymentProof = {
        signature,
        authorization: {
            from: wallet.address,
            to: requirements.payTo,
            value: amountToPay,
            validAfter: '0',
            validBefore: validBefore.toString(),
            nonce,
        }
    }

    const verifyResponse = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            payment_proof: paymentProof,
            ad_data: adData
        })
    });

    const verifyData = await verifyResponse.json();
    console.log(`\nStatus: ${verifyResponse.status}`);
    console.log(`Response:`, JSON.stringify(verifyData, null, 2));
}

main().catch(console.error)
