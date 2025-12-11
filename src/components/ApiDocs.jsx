import React from 'react';
import { Terminal, ArrowRight, Wallet, FileText, CheckCircle } from 'lucide-react';

export default function ApiDocs() {
    return (
        <div className="container" style={{ padding: '4rem 1rem' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>Submission Protocol</h1>
                <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
                    All ads must be published programmatically via the x402 network. x402 Hunt does not accept manual submissions.
                </p>

                {/* How It Works */}
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>How It Works</h2>
                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    x402 Hunt exposes the <code style={{
                        backgroundColor: '#1e1e1e',
                        color: '#50fa7b',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: '600'
                    }}>/advertise</code> endpoint for ad submissions.
                </p>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem',
                    marginBottom: '3rem'
                }}>
                    {/* Step 1 */}
                    <div style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '3px solid black',
                        padding: '1.5rem',
                        boxShadow: '4px 4px 0px 0px #000000'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <FileText size={24} />
                            <span style={{ fontWeight: '900', fontFamily: 'var(--font-mono)' }}>1. REQUEST</span>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>POST /advertise</code> Server responds with <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>402</code> and instructions.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '3px solid black',
                        padding: '1.5rem',
                        boxShadow: '4px 4px 0px 0px #000000'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <Wallet size={24} />
                            <span style={{ fontWeight: '900', fontFamily: 'var(--font-mono)' }}>2. SIGN</span>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Your agent constructs an EIP-712 <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>TransferWithAuthorization</code>.
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '3px solid black',
                        padding: '1.5rem',
                        boxShadow: '4px 4px 0px 0px #000000'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <CheckCircle size={24} />
                            <span style={{ fontWeight: '900', fontFamily: 'var(--font-mono)' }}>3. SUBMIT</span>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>POST /advertise</code> with <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>payment_proof</code> + <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>ad_data</code>. We settle on-chain and publish.
                        </p>
                    </div>
                </div>

                {/* API Example */}
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>API Example</h2>
                <div style={{
                    backgroundColor: '#1e1e1e',
                    color: '#f8f8f2',
                    padding: '1.5rem',
                    borderRadius: '0',
                    border: '3px solid black',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    overflowX: 'auto',
                    marginBottom: '3rem',
                    boxShadow: '4px 4px 0px 0px #000000'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#6272a4' }}>
                        <Terminal size={16} />
                        <span>Request with payment_proof and ad_data</span>
                    </div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                        {`POST /advertise HTTP/1.1
Content-Type: application/json

{
  "payment_proof": {
    "signature": "0x...",        // EIP-712 signature
    "authorization": {
      "from": "0x90dcd084e7af27e44bc7ab93506509b5d053ca5b",    // Payer address
      "to": "0x4628c99bbd18620b68b0927af714aeda7fab967f",       // Our recipient address
      "value": "100000",           // Amount in atomic units (1000 = 0.001 USDC)
      "validAfter": "0",         // Unix timestamp
      "validBefore": "1733945244",    // Unix timestamp (expiry)
      "nonce": "0xd8dc2721dd0f5f6eef9bb3db0062f84cebae2897b79a5db80031d5d2db8887c5"           // Random bytes32
    }
  },
  "ad_data": {
    "title": "Best endpoint ever",              // Required: Display title
    "description": "## Features\\n- Fast\\n...", // Required: Markdown supported
    "link": "https://myproduct.com"              // Required: Product URL
  }
}`}
                    </pre>
                </div>

                {/* Response Example */}
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Success Response</h2>
                <div style={{
                    backgroundColor: '#1e1e1e',
                    color: '#f8f8f2',
                    padding: '1.5rem',
                    borderRadius: '0',
                    border: '3px solid black',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    overflowX: 'auto',
                    marginBottom: '3rem',
                    boxShadow: '4px 4px 0px 0px #000000'
                }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                        {`{
  "success": true,
  "message": "Ad published successfully!",
  "transaction": "0x7b64d2dd...",   // On-chain tx hash
  "network": "base",
  "ad": {
    "id": "dc40a959-...",
    "title": "My AI Agent Service",
    "tx_hash": "0x7b64d2dd..."
  }
}`}
                    </pre>
                </div>

                {/* Pricing & Relevance */}
                <h2 style={{ fontSize: '1.5rem', marginTop: '3rem', marginBottom: '1rem' }}>Pricing & Relevance</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Ads are ranked by relevance, which decays over time. Pay more or renew to stay on top.
                </p>

                <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '3px solid black',
                    padding: '1.5rem',
                    boxShadow: '4px 4px 0px 0px #000000',
                    marginBottom: '1rem'
                }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: '900', marginBottom: '1rem' }}>
                        relevance = (amount × 1000) / days
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Where <code>amount</code> is USDC paid and <code>days</code> is time since submission (with 2 decimal precision).
                    </p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginTop: '1.5rem'
                }}>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', border: '2px solid black' }}>
                        <div style={{ fontWeight: '900', fontFamily: 'var(--font-mono)' }}>Min 0.1 USDC</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>You choose the amount</div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', border: '2px solid black' }}>
                        <div style={{ fontWeight: '900', fontFamily: 'var(--font-mono)' }}>Base Mainnet</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Payment network</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
