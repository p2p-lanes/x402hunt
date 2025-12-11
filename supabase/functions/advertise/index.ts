import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
        scheme: 'exact',
        network: 'base',
        asset: USDC_BASE_MAINNET,
        payTo: RECIPIENT_ADDRESS,
        minAmountRequired: String(MIN_AMOUNT_ATOMIC), // Minimum amount, clients can pay more
        resource: 'https://x402.hunt/advertise',
        description: 'Submit an advertisement (minimum $0.001 USDC)',
        mimeType: 'application/json',
        maxTimeoutSeconds: 7200,
        extra: {
            name: 'USD Coin',
            version: '2'
        }
    };
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const body = await req.json().catch(() => ({}));
        const { payment_proof, ad_data } = body;

        // If no payment proof, return 402 with requirements (x402scan-compatible format)
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

        const verifyToken = await generateCdpToken('/platform/v2/x402/verify');
        const cdpPayload = {
            x402Version: 1,
            paymentPayload: {
                x402Version: 1,
                scheme: 'exact',
                network: 'base',
                payload: payment_proof
            },
            paymentRequirements: buildPaymentRequirements()
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

        const settleToken = await generateCdpToken('/platform/v2/x402/settle');
        const settleResponse = await fetch('https://api.cdp.coinbase.com/platform/v2/x402/settle', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settleToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cdpPayload)
        });

        const settleResult = await settleResponse.json();
        console.log('CDP Settlement Result:', settleResult);

        if (!settleResult.success) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Payment settlement failed',
                    reason: settleResult.error
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Step 3: Insert ad into database
        console.log('Payment settled! Inserting ad into database...');

        const { data: insertedAd, error: insertError } = await supabase
            .from('ads')
            .insert({
                title: ad_data.title,
                description: ad_data.description,
                link: ad_data.link,
                bid_amount_usdc: paidAmountUsdc,
                tx_hash: settleResult.transaction,
                payer_address: verifyResult.payer,
                status: 'active',
                paid_at: new Date().toISOString()
            })
            .select()
            .single();

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
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Full success!
        return new Response(
            JSON.stringify({
                success: true,
                message: 'Ad published successfully!',
                transaction: settleResult.transaction,
                network: settleResult.network,
                ad: insertedAd
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
