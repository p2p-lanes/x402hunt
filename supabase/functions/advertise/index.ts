import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-payment',
    'Access-Control-Expose-Headers': 'x-payment-response',
}

// Configuration
const CDP_API_KEY_NAME = Deno.env.get('CDP_API_KEY_NAME') || '';
const CDP_API_KEY_SECRET = Deno.env.get('CDP_API_KEY_SECRET') || '';
const SUPABASE_URL = Deno.env.get('REMOTE_SUPABASE_URL') || '';
const SUPABASE_KEY = Deno.env.get('REMOTE_SUPABASE_ANON_KEY') || '';

// Pricing
const RECIPIENT_ADDRESS = '0x4628c99Bbd18620B68B0927Af714AEDa7FAb967F';
const USDC_BASE_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const MIN_AMOUNT_USDC = 0.001; // Minimum 0.001 USDC
const MIN_AMOUNT_ATOMIC = Math.floor(MIN_AMOUNT_USDC * 1000000); // 1000

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateCdpToken(endpoint: string) {
    const algorithm = 'EdDSA';
    const binaryString = atob(CDP_API_KEY_SECRET);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const toBase64Url = (arr: Uint8Array) => {
        return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };
    const d = toBase64Url(bytes.slice(0, 32));
    const jwk = { kty: 'OKP', crv: 'Ed25519', d: d, x: '' };
    const privateKey = await jose.importJWK(jwk, algorithm);
    const keyId = CDP_API_KEY_NAME.split('/').pop() || CDP_API_KEY_NAME;
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
        .sign(privateKey);
    return jwt;
}

function buildPaymentRequirements() {
    return {
        x402Version: 1,
        scheme: 'exact',
        network: 'base',
        chainId: 8453,
        asset: USDC_BASE_MAINNET,
        payTo: RECIPIENT_ADDRESS,
        minAmountRequired: String(MIN_AMOUNT_ATOMIC),
        maxAmountRequired: '100000000000', // Max 100,000 USDC
        resource: 'https://x402hunt.xyz/advertise',
        description: 'Submit an advertisement',
        mimeType: 'application/json',
        maxTimeoutSeconds: 7200,
        extra: {
            name: 'USD Coin',
            version: '2'
        },
        requiredBodyFields: {
            ad_data: {
                title: { type: 'string', required: true, description: 'Ad headline' },
                description: { type: 'string', required: true, description: 'Ad body (markdown supported)' },
                link: { type: 'string', required: true, description: 'URL to advertised resource' }
            }
        }
    };
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        // x402 standard: Read payment from X-PAYMENT header (base64-encoded JSON)
        const xPaymentHeader = req.headers.get('x-payment');
        let paymentPayload = null;

        if (xPaymentHeader) {
            try {
                const decoded = atob(xPaymentHeader);
                paymentPayload = JSON.parse(decoded);
            } catch (_e) {
                return new Response(
                    JSON.stringify({ error: 'Invalid X-PAYMENT header format. Expected base64-encoded JSON.' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        // Get ad_data from request body
        const body = await req.json().catch(() => ({}));
        const { ad_data } = body;

        // x402 format: { x402Version, scheme, network, payload: { signature, authorization } }
        const payment_proof = paymentPayload?.payload;

        // If no payment proof, return 402 with requirements
        if (!payment_proof) {
            return new Response(
                JSON.stringify({
                    x402Version: 1,
                    error: 'Payment Required',
                    accepts: [buildPaymentRequirements()]
                }),
                { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Validate ad_data
        if (!ad_data || !ad_data.title || !ad_data.description || !ad_data.link) {
            return new Response(
                JSON.stringify({
                    error: 'Missing ad_data. Required: title, description, link'
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Validate minimum payment amount
        const paidAmountAtomic = parseInt(payment_proof.authorization?.value || '0');
        if (paidAmountAtomic < MIN_AMOUNT_ATOMIC) {
            return new Response(
                JSON.stringify({
                    error: `Insufficient payment. Minimum: ${MIN_AMOUNT_USDC} USDC (${MIN_AMOUNT_ATOMIC} atomic). Received: ${paidAmountAtomic} atomic`
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Calculate actual USDC amount from atomic units
        const paidAmountUsdc = paidAmountAtomic / 1000000;
        console.log(`Payment amount: ${paidAmountUsdc} USDC`);

        // Step 1: Verify payment with CDP
        console.log('Received payment proof, verifying with CDP...');

        // Build payment requirements with the actual payment amount for CDP verification
        // CDP's exact scheme validates authorization.value against maxAmountRequired
        const paymentRequirementsForCdp = {
            ...buildPaymentRequirements(),
            maxAmountRequired: String(paidAmountAtomic) // Use actual payment amount
        };

        const verifyToken = await generateCdpToken('/platform/v2/x402/verify');
        const cdpPayload = {
            x402Version: 1,
            paymentPayload: {
                x402Version: 1,
                scheme: 'exact',
                network: 'base',
                payload: payment_proof
            },
            paymentRequirements: paymentRequirementsForCdp
        };

        const verifyResponse = await fetch('https://api.cdp.coinbase.com/platform/v2/x402/verify', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${verifyToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cdpPayload)
        });

        const verifyResult = await verifyResponse.json();
        console.log('CDP Verification Result:', verifyResult);

        if (!verifyResult.isValid) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Payment verification failed',
                    reason: verifyResult.invalidReason
                }),
                { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Step 2: Settle payment with CDP (execute on-chain)
        console.log('Verification passed! Settling payment...');

        // Retry logic for CDP settle (on-chain transactions can be slow)
        const MAX_RETRIES = 3;
        let settleResult = null;
        let lastError = '';

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const settleToken = await generateCdpToken('/platform/v2/x402/settle');
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

                const settleResponse = await fetch('https://api.cdp.coinbase.com/platform/v2/x402/settle', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${settleToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(cdpPayload),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const settleText = await settleResponse.text();
                try {
                    settleResult = JSON.parse(settleText);
                    console.log(`CDP Settlement Result (attempt ${attempt}):`, settleResult);

                    // Only exit retry loop on actual success, not on internal errors
                    if (settleResult.success) {
                        break; // Success - exit retry loop
                    } else if (settleResult.errorType === 'internal_server_error') {
                        // CDP internal error - retry
                        lastError = `CDP internal error: ${settleResult.errorMessage}`;
                        console.error(`Attempt ${attempt}/${MAX_RETRIES}: ${lastError}`);
                        settleResult = null; // Clear so we retry
                    } else {
                        // Other errors (validation, etc.) - don't retry
                        break;
                    }
                } catch (_e) {
                    lastError = `CDP returned non-JSON (status ${settleResponse.status}): ${settleText.substring(0, 200)}`;
                    console.error(`Attempt ${attempt}/${MAX_RETRIES}: ${lastError}`);
                }
            } catch (err) {
                lastError = err instanceof Error ? err.message : 'Unknown error';
                console.error(`Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError}`);
            }

            if (attempt < MAX_RETRIES) {
                const delay = attempt * 2000; // 2s, 4s backoff
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }

        if (!settleResult) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'CDP settlement failed after retries',
                    details: lastError
                }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Require successful settlement - no optimistic inserts
        if (!settleResult.success) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Payment settlement failed',
                    errorType: settleResult.errorType,
                    errorMessage: settleResult.errorMessage,
                    correlationId: settleResult.correlationId,
                    reason: settleResult.error
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Step 3: Insert ad into database
        console.log('Payment settled! Inserting ad into database...');

        const txHash = settleResult.transaction;
        const txNetwork = settleResult.network;

        const { data: insertedAd, error: insertError } = await supabase
            .from('ads')
            .insert({
                title: ad_data.title,
                description: ad_data.description,
                link: ad_data.link,
                bid_amount_usdc: paidAmountUsdc,
                tx_hash: txHash,
                payer_address: verifyResult.payer,
                status: 'active',
                paid_at: new Date().toISOString()
            })
            .select()
            .single();

        // Build X-PAYMENT-RESPONSE header per x402 spec
        const paymentResponse = {
            x402Version: 1,
            success: true,
            transaction: txHash,
            network: txNetwork,
            chainId: 8453
        };
        const paymentResponseHeader = btoa(JSON.stringify(paymentResponse));

        if (insertError) {
            console.error('Database insert error:', insertError);
            // Payment was successful but DB insert failed - log but don't fail
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Payment completed! (Ad insert pending)',
                    transaction: settleResult.transaction,
                    network: settleResult.network,
                    warning: 'Ad was paid but database insert failed. Contact support.'
                }),
                {
                    status: 200,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                        'X-PAYMENT-RESPONSE': paymentResponseHeader
                    }
                }
            );
        }

        // Full success!
        return new Response(
            JSON.stringify({
                success: true,
                message: 'Ad published successfully!',
                transaction: txHash,
                network: txNetwork,
                ad: insertedAd
            }),
            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    'X-PAYMENT-RESPONSE': paymentResponseHeader
                }
            }
        );

    } catch (error: unknown) {
        console.error('Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
})
