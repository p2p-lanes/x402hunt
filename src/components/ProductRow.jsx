import React from 'react';
import Markdown from 'react-markdown';
import { ExternalLink } from 'lucide-react';

export default function ProductRow({ rank, product, onClick }) {
    return (
        <div
            className="product-row"
            onClick={onClick}
            style={{
                display: 'grid',
                gridTemplateColumns: '30px 120px 1fr 100px 80px',
                gap: '0.75rem',
                padding: '1.25rem 1rem',
                border: 'var(--border-width) solid var(--border-color)',
                backgroundColor: 'white',
                alignItems: 'center',
                transition: 'all 0.1s ease',
                cursor: 'pointer',
                marginBottom: '1rem',
                boxShadow: '4px 4px 0px 0px #000000'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translate(-2px, -2px)';
                e.currentTarget.style.boxShadow = '6px 6px 0px 0px #000000';
                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                e.currentTarget.style.color = 'white';
                // Change text colors on hover
                const textElements = e.currentTarget.querySelectorAll('.text-dynamic');
                textElements.forEach(el => el.style.color = 'white');
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translate(0, 0)';
                e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000000';
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.color = 'var(--text-primary)';
                // Reset text colors
                const textElements = e.currentTarget.querySelectorAll('.text-dynamic');
                textElements.forEach(el => el.style.color = '');
            }}
        >
            {/* Rank */}
            <div className="text-dynamic" style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-tertiary)',
                fontWeight: '900',
                fontSize: '1.2rem'
            }}>
                #{rank}
            </div>

            {/* Product Info */}
            <div>
                <h3 className="text-dynamic" style={{ fontSize: '1.1rem', fontWeight: '900', marginBottom: '0.25rem', fontFamily: 'var(--font-serif)' }}>
                    {product.title}
                </h3>
                <div className="text-dynamic" style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: 'var(--font-mono)'
                }}>
                    {product.domain}
                </div>
            </div>

            {/* Description Preview */}
            <div className="text-dynamic markdown-preview" style={{
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
                lineHeight: '1.5',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                textOverflow: 'ellipsis',
                fontFamily: 'var(--font-mono)',
                height: '6em' // Approximate height for 4 lines
            }}>
                <Markdown>{product.description}</Markdown>
            </div>

            {/* Metrics */}
            <div style={{ textAlign: 'right' }}>
                <div style={{
                    fontWeight: '900',
                    fontSize: '1.2rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'inherit' // Inherit from parent hover
                }}>
                    {product.relevanceScore}
                </div>
                <div className="text-dynamic" style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-tertiary)',
                    marginTop: '0.25rem',
                    textTransform: 'uppercase',
                    fontWeight: '700'
                }}>
                    Relevance
                </div>
            </div>

            {/* Price / Time */}
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '900', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
                    ${product.paidAmount}
                </div>
                {product.txHash ? (
                    <a
                        href={`https://basescan.org/tx/${product.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-dynamic"
                        style={{
                            fontSize: '0.7rem',
                            color: 'var(--accent-secondary)',
                            marginTop: '0.25rem',
                            fontFamily: 'var(--font-mono)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '0.25rem',
                            textDecoration: 'none'
                        }}
                    >
                        BaseScan <ExternalLink size={10} />
                    </a>
                ) : (
                    <div className="text-dynamic" style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-tertiary)',
                        marginTop: '0.25rem',
                        fontFamily: 'var(--font-mono)'
                    }}>
                        {product.timeAgo}
                    </div>
                )}
            </div>
        </div>
    );
}
