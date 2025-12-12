import { ethers } from 'ethers'
import * as crypto from 'crypto'
import * as dotenv from 'dotenv'

dotenv.config()

const FUNCTION_URL = 'http://localhost:54321/functions/v1/advertise'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || ''

// Payment amount: 0.01 USDC = 10,000 atomic units (USDC has 6 decimals)
const PAYMENT_AMOUNT_USDC = 0.01
const PAYMENT_AMOUNT_ATOMIC = String(Math.floor(PAYMENT_AMOUNT_USDC * 1_000_000)) // "10000"

// x402Hunt ad content
const AD_DATA = {
    title: 'x402 Hunt - Machine-to-Machine Advertising Board',
    description: `**The first advertising platform built for AI agents.**

x402 Hunt enables autonomous agents to programmatically submit and pay for advertisements using USDC on Base. No accounts, no approvals - just cryptographic payments.

### Features
- **Trustless payments** via x402 protocol
- **Agent-first API** - designed for programmatic use
- **Instant publishing** - ads go live immediately after payment
- **On-chain verification** - all transactions visible on BaseScan

Build the agentic economy. Let your agents advertise.`,
    link: 'https://x402hunt.xyz'
}

if (!TEST_PRIVATE_KEY) {
    console.error('ERROR: TEST_PRIVATE_KEY not set in .env file')
    process.exit(1)
}

async function main() {
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const wallet = new ethers.Wallet(TEST_PRIVATE_KEY, provider);

    console.log(`\n========================================`)
    console.log(`  x402 Hunt - Local Test (0.1 USDC)`)
    console.log(`========================================`)
    console.log(`Client Address: ${wallet.address}`)
    console.log(`Payment Amount: ${PAYMENT_AMOUNT_USDC} USDC (${PAYMENT_AMOUNT_ATOMIC} atomic)`)

    // 1. Fetch Requirements
    console.log(`\n[1] Fetching payment requirements...`)
    const reqResponse = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({})
    });

    if (reqResponse.status !== 402) {
        console.error(`Unexpected status: ${reqResponse.status}`);
        const body = await reqResponse.text();
        console.error(`Body: ${body}`);
        process.exit(1);
    }

    const reqData = await reqResponse.json();
    const requirements = reqData.accepts[0];
    console.log('Payment Requirements:');
    console.log(`  - Network: ${requirements.network} (chainId: ${requirements.chainId})`);
    console.log(`  - Asset: ${requirements.asset}`);
    console.log(`  - Pay To: ${requirements.payTo}`);
    console.log(`  - Min Amount: ${requirements.minAmountRequired} atomic`);
    console.log(`  - Max Amount: ${requirements.maxAmountRequired} atomic`);

    // 2. Sign Payment
    console.log(`\n[2] Signing EIP-712 payment authorization...`)
    const chainId = requirements.chainId || 8453;
    const domain = {
        name: requirements.extra.name,
        version: requirements.extra.version,
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

    const validBefore = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const nonce = '0x' + crypto.randomBytes(32).toString('hex');

    const value = {
        from: wallet.address,
        to: requirements.payTo,
        value: PAYMENT_AMOUNT_ATOMIC,
        validAfter: 0,
        validBefore: validBefore,
        nonce: nonce
    };

    const signature = await wallet.signTypedData(domain, types, value);
    console.log(`Signature: ${signature.substring(0, 20)}...${signature.substring(signature.length - 10)}`);

    // Verify locally
    const recovered = ethers.verifyTypedData(domain, types, value, signature);
    console.log(`Local verification: ${recovered === wallet.address ? 'PASSED' : 'FAILED'}`);

    // 3. Submit via X-PAYMENT header (x402 standard)
    console.log(`\n[3] Submitting ad via X-PAYMENT header...`)

    const paymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'base',
        payload: {
            signature,
            authorization: {
                from: wallet.address,
                to: requirements.payTo,
                value: PAYMENT_AMOUNT_ATOMIC,
                validAfter: '0',
                validBefore: validBefore.toString(),
                nonce,
            }
        }
    };

    const xPaymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

    console.log(`\nAd Content:`)
    console.log(`  Title: ${AD_DATA.title}`)
    console.log(`  Link: ${AD_DATA.link}`)
    console.log(`  Description: ${AD_DATA.description.substring(0, 100)}...`)

    const submitResponse = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'X-PAYMENT': xPaymentHeader
        },
        body: JSON.stringify({ ad_data: AD_DATA })
    });

    const submitData = await submitResponse.json();
    console.log(`\n========================================`)
    console.log(`  Result: ${submitResponse.status === 200 ? 'SUCCESS' : 'FAILED'}`)
    console.log(`========================================`)
    console.log(`Status: ${submitResponse.status}`);
    console.log(`Response:`, JSON.stringify(submitData, null, 2));

    // Check for X-PAYMENT-RESPONSE header
    const paymentResponseHeader = submitResponse.headers.get('x-payment-response');
    if (paymentResponseHeader) {
        const decoded = JSON.parse(Buffer.from(paymentResponseHeader, 'base64').toString());
        console.log(`\nX-PAYMENT-RESPONSE header:`);
        console.log(JSON.stringify(decoded, null, 2));
    }

    if (submitData.transaction) {
        console.log(`\nView on BaseScan: https://basescan.org/tx/${submitData.transaction}`);
    }
}

main().catch(console.error)
