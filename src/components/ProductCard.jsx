import React from 'react';
import Markdown from 'react-markdown';
import { ExternalLink } from 'lucide-react';

export default function ProductCard({ product }) {
    return (
        <div className="product-card" style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s, box-shadow 0.2s'
        }}>
            {/* Header: Title + Relevance */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                        {product.title}
                    </h3>
                    <a href="#" style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'var(--font-mono)'
                    }}>
                        {product.domain} <ExternalLink size={12} />
                    </a>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div className="badge" style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        color: 'var(--accent-primary)',
                        fontSize: '1rem',
                        padding: '0.5rem 0.75rem'
                    }}>
                        R: {product.relevanceScore}
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-tertiary)',
                        marginTop: '0.25rem',
                        fontFamily: 'var(--font-mono)'
                    }}>
                        {product.paidAmount} USDC
                    </div>
                </div>
            </div>

            {/* Markdown Content */}
            <div className="markdown-content" style={{
                color: 'var(--text-secondary)',
                fontSize: '1rem',
                lineHeight: '1.7'
            }}>
                <Markdown>{product.description}</Markdown>
            </div>

            {/* Footer: Time */}
            <div style={{
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--bg-tertiary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.875rem',
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)'
            }}>
                <span>Posted {product.timeAgo}</span>
                <span>ID: {product.id.toString().padStart(4, '0')}</span>
            </div>
        </div>
    );
}
