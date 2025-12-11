import React, { useState } from 'react';
import ProductRow from './ProductRow';
import Modal from './Modal';
import Markdown from 'react-markdown';
import { ExternalLink } from 'lucide-react';

export default function ProductList({ products }) {
    const [selectedProduct, setSelectedProduct] = useState(null);

    return (
        <div className="container" style={{ marginTop: '2rem' }}>
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '3px solid black',
                boxShadow: 'var(--shadow-hard)',
                padding: '1rem'
            }}>
                {/* List Header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '30px 120px 1fr 100px 80px',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderBottom: '3px solid black',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontFamily: 'var(--font-mono)',
                    marginBottom: '1rem'
                }}>
                    <div>#</div>
                    <div>Product</div>
                    <div>Who this is for</div>
                    <div style={{ textAlign: 'right' }}>Relevance</div>
                    <div style={{ textAlign: 'right' }}>Paid</div>
                </div>

                {/* List Items */}
                <div className="product-list">
                    {products.map((product, index) => (
                        <ProductRow
                            key={product.id}
                            rank={index + 1}
                            product={product}
                            onClick={() => setSelectedProduct(product)}
                        />
                    ))}
                </div>
            </div>

            {/* Product Detail Modal */}
            <Modal
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                title={selectedProduct?.title}
            >
                {selectedProduct && (
                    <div>
                        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--text-tertiary)',
                                fontSize: '0.9rem'
                            }}>
                                {selectedProduct.domain}
                            </span>
                            <a
                                href={`https://${selectedProduct.domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center' }}
                            >
                                <ExternalLink size={14} />
                            </a>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1rem',
                            marginBottom: '2rem',
                            backgroundColor: 'var(--bg-tertiary)',
                            padding: '1rem',
                            border: '2px solid black',
                            boxShadow: '2px 2px 0px 0px #000000'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>Relevance Score</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>{selectedProduct.relevanceScore}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>Paid Amount</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '900', fontFamily: 'var(--font-mono)' }}>{selectedProduct.paidAmount} USDC</div>
                                {selectedProduct.txHash && (
                                    <a
                                        href={`https://basescan.org/tx/${selectedProduct.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            marginTop: '0.5rem',
                                            fontSize: '0.75rem',
                                            color: 'var(--accent-secondary)',
                                            fontFamily: 'var(--font-mono)',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        View on BaseScan <ExternalLink size={12} />
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="markdown-content" style={{ lineHeight: '1.7', fontFamily: 'var(--font-sans)' }}>
                            <Markdown>{selectedProduct.description}</Markdown>
                        </div>

                        <div style={{
                            marginTop: '2rem',
                            paddingTop: '1rem',
                            borderTop: '2px solid black',
                            fontSize: '0.8rem',
                            color: 'var(--text-tertiary)',
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono)'
                        }}>
                            Posted {selectedProduct.timeAgo}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
