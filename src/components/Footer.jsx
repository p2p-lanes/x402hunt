import React from 'react';

export default function Footer() {
    return (
        <footer style={{
            borderTop: '3px solid black',
            padding: '2rem 0',
            marginTop: '4rem',
            textAlign: 'center',
            color: 'var(--text-tertiary)',
            fontSize: '0.9rem',
            backgroundColor: 'var(--bg-secondary)'
        }}>
            <div className="container">
                <p>&copy; {new Date().getFullYear()} x402 Hunt. Powering the Agentic Gig Economy.</p>
            </div>
        </footer>
    );
}
