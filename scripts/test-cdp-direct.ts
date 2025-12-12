import { ethers } from 'ethers'
import * as crypto from 'crypto'
import * as dotenv from 'dotenv'
import * as jose from 'jose'

dotenv.config()

const CDP_API_KEY_NAME = process.env.CDP_API_KEY_NAME || ''
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET || ''
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || ''

// Payment config
const RECIPIENT_ADDRESS = '0x4628c99Bbd18620B68B0927Af714AEDa7FAb967F'
const USDC_BASE_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const PAYMENT_AMOUNT_ATOMIC = '1000' // 0.001 USDC - minimum amount

async function generateCdpToken(endpoint: string) {
    const algorithm = 'EdDSA'

    // Decode base64 secret - CDP provides 64 bytes: 32 private + 32 public
    const bytes = Buffer.from(CDP_API_KEY_SECRET, 'base64')
    console.log(`Key length: ${bytes.length} bytes`)

    // Convert to base64url for JWK
    const toBase64Url = (buf: Buffer) => {
        return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    }

    // First 32 bytes = private key (d), last 32 bytes = public key (x)
    const d = toBase64Url(bytes.subarray(0, 32))
    const x = toBase64Url(bytes.subarray(32, 64))

    const jwk = { kty: 'OKP', crv: 'Ed25519', d, x }
    const privateKey = await jose.importJWK(jwk, algorithm)

    const keyId = CDP_API_KEY_NAME.split('/').pop() || CDP_API_KEY_NAME

    const jwt = await new jose.SignJWT({
        uri: `POST api.cdp.coinbase.com${endpoint}`,
        iss: 'coinbase-cloud',
        nbf: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 120,
        sub: keyId,
    })
        .setProtectedHeader({ alg: algorithm, kid: keyId, nonce: crypto.randomUUID() })
        .setIssuedAt()
        .setExpirationTime('2m')
        .sign(privateKey)

    return jwt
}

async function main() {
    console.log('\n========================================')
    console.log('  CDP Direct Test')
    console.log('========================================')

    if (!CDP_API_KEY_NAME || !CDP_API_KEY_SECRET) {
        console.error('ERROR: CDP_API_KEY_NAME and CDP_API_KEY_SECRET must be set')
        process.exit(1)
    }

    if (!TEST_PRIVATE_KEY) {
        console.error('ERROR: TEST_PRIVATE_KEY must be set')
        process.exit(1)
    }

    console.log(`CDP Key: ${CDP_API_KEY_NAME.substring(0, 50)}...`)

    // Setup wallet
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
    const wallet = new ethers.Wallet(TEST_PRIVATE_KEY, provider)
    console.log(`Wallet: ${wallet.address}`)

    // Check USDC balance
    const usdc = new ethers.Contract(USDC_BASE_MAINNET, ['function balanceOf(address) view returns (uint256)'], provider)
    const balance = await usdc.balanceOf(wallet.address)
    console.log(`USDC Balance: ${Number(balance) / 1e6} USDC`)

    if (Number(balance) < Number(PAYMENT_AMOUNT_ATOMIC)) {
        console.error('ERROR: Insufficient USDC balance')
        process.exit(1)
    }

    // Create EIP-712 signature
    console.log('\n[1] Creating EIP-712 signature...')

    const domain = {
        name: 'USD Coin',
        version: '2',
        chainId: 8453,
        verifyingContract: USDC_BASE_MAINNET
    }

    const types = {
        TransferWithAuthorization: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
        ]
    }

    const validBefore = Math.floor(Date.now() / 1000) + 3600
    const nonce = '0x' + crypto.randomBytes(32).toString('hex')

    const value = {
        from: wallet.address,
        to: RECIPIENT_ADDRESS,
        value: PAYMENT_AMOUNT_ATOMIC,
        validAfter: 0,
        validBefore: validBefore,
        nonce: nonce
    }

    const signature = await wallet.signTypedData(domain, types, value)
    console.log(`Signature: ${signature.substring(0, 30)}...`)

    // Build payment payload
    const paymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'base',
        payload: {
            signature,
            authorization: {
                from: wallet.address,
                to: RECIPIENT_ADDRESS,
                value: PAYMENT_AMOUNT_ATOMIC,
                validAfter: '0',
                validBefore: validBefore.toString(),
                nonce,
            }
        }
    }

    const paymentRequirements = {
        x402Version: 1,
        scheme: 'exact',
        network: 'base',
        chainId: 8453,
        asset: USDC_BASE_MAINNET,
        payTo: RECIPIENT_ADDRESS,
        maxAmountRequired: PAYMENT_AMOUNT_ATOMIC,
        resource: 'https://x402hunt.xyz/advertise',
        description: 'Test payment',
        mimeType: 'application/json',
        maxTimeoutSeconds: 7200,
        extra: {
            name: 'USD Coin',
            version: '2'
        }
    }

    // CDP API format requires x402Version at the top level
    const cdpPayload = {
        x402Version: 1,
        paymentPayload,
        paymentRequirements
    }

    console.log('\n[2] CDP Payload:')
    console.log(JSON.stringify(cdpPayload, null, 2))

    // Test verify endpoint
    console.log('\n[3] Testing CDP /verify endpoint...')
    const verifyToken = await generateCdpToken('/platform/v2/x402/verify')

    const verifyResponse = await fetch('https://api.cdp.coinbase.com/platform/v2/x402/verify', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${verifyToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(cdpPayload)
    })

    const verifyText = await verifyResponse.text()
    console.log(`Verify Status: ${verifyResponse.status}`)
    console.log(`Verify Response: ${verifyText}`)

    let verifyResult
    try {
        verifyResult = JSON.parse(verifyText)
    } catch {
        console.error('Failed to parse verify response as JSON')
        process.exit(1)
    }

    if (!verifyResult.isValid) {
        console.error('Verification failed:', verifyResult.invalidReason)
        process.exit(1)
    }

    console.log('✓ Verification passed!')

    // Check CDP /supported endpoint first
    console.log('\n[4] Checking CDP /supported endpoint...')
    const supportedToken = await generateCdpToken('/platform/v2/x402/supported')
    const supportedResponse = await fetch('https://api.cdp.coinbase.com/platform/v2/x402/supported', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${supportedToken}`,
        }
    })
    console.log(`Supported Status: ${supportedResponse.status}`)
    const supportedText = await supportedResponse.text()
    console.log(`Supported Response: ${supportedText.substring(0, 1000)}`)

    // Test settle endpoint
    console.log('\n[5] Testing CDP /settle endpoint...')
    const settleToken = await generateCdpToken('/platform/v2/x402/settle')

    console.log('Sending settle request...')
    const startTime = Date.now()

    const settleResponse = await fetch('https://api.cdp.coinbase.com/platform/v2/x402/settle', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${settleToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(cdpPayload)
    })

    const settleTime = Date.now() - startTime
    const settleText = await settleResponse.text()

    console.log(`Settle Status: ${settleResponse.status}`)
    console.log(`Settle Time: ${settleTime}ms`)
    console.log(`Settle Response Headers:`)
    settleResponse.headers.forEach((value, key) => {
        console.log(`  ${key}: ${value}`)
    })
    console.log(`Settle Response Body: ${settleText.substring(0, 1000)}`)

    try {
        const settleResult = JSON.parse(settleText)
        console.log('\nParsed Settle Result:')
        console.log(JSON.stringify(settleResult, null, 2))

        if (settleResult.success) {
            console.log(`\n✓ Settlement successful!`)
            console.log(`Transaction: ${settleResult.transaction}`)
            console.log(`View on BaseScan: https://basescan.org/tx/${settleResult.transaction}`)
        } else {
            console.log(`\n✗ Settlement failed:`, settleResult)
        }
    } catch {
        console.error('\nFailed to parse settle response as JSON')
        console.log('Raw response:', settleText)
    }
}

main().catch(console.error)
