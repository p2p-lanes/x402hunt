import { ethers } from 'ethers'
import * as crypto from 'crypto'
import * as dotenv from 'dotenv'

dotenv.config()

const FUNCTION_URL = 'http://localhost:54321/functions/v1/advertise'
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || ''

if (!TEST_PRIVATE_KEY) {
    console.error('ERROR: TEST_PRIVATE_KEY not set in .env file')
    process.exit(1)
}

async function main() {
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const wallet = new ethers.Wallet(TEST_PRIVATE_KEY, provider);

    console.log(`\n--- Starting Minimal x402 PoC (Ethers) ---`)
    console.log(`Client Address: ${wallet.address}`)

    // 1. Fetch Requirements
    console.log(`\n[1] Fetching requirements...`)
    const reqResponse = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });

    if (reqResponse.status !== 402) {
        console.error(`Unexpected status: ${reqResponse.status}`);
        process.exit(1);
    }

    const reqData = await reqResponse.json();
    const requirements = reqData.accepts[0]; // x402scan-compatible format
    console.log('Requirements:', requirements);

    // 2. Sign Payment
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

    const amount = requirements.maxAmountRequired; // string
    const validBefore = Math.floor(Date.now() / 1000) + 3600;
    const nonce = '0x' + crypto.randomBytes(32).toString('hex');

    const value = {
        from: wallet.address,
        to: requirements.payTo,
        value: amount,
        validAfter: 0,
        validBefore: validBefore,
        nonce: nonce
    };

    const signature = await wallet.signTypedData(domain, types, value);
    console.log(`Signature: ${signature}`);

    // Verify locally
    const recovered = ethers.verifyTypedData(domain, types, value, signature);
    console.log(`Recovered: ${recovered}`);
    console.log(`Match: ${recovered === wallet.address}`);

    // 3. Submit Proof
    console.log(`\n[3] Submitting payment proof...`)
    // paymentPayload should contain signature and authorization DIRECTLY
    // NOT wrapped in a 'payload' field
    const paymentProof = {
        signature,
        authorization: {
            from: wallet.address,
            to: requirements.payTo,
            value: amount,
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
            ad_data: {
                title: 'Test Ad from PoC Script',
                description: 'This is a test advertisement submitted via the x402 payment flow.',
                link: 'https://example.com/test-product'
            }
        })
    });

    const verifyData = await verifyResponse.json();
    console.log(`\nStatus: ${verifyResponse.status}`);
    console.log(`Response:`, verifyData);
}

main().catch(console.error)
