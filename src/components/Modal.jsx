import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEsc);
        }
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)', // Lighter, more opaque backdrop
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '3px solid black',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '8px 8px 0px 0px #000000', // Massive hard shadow
                position: 'relative',
                animation: 'modalSlideIn 0.2s ease-out'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '3px solid black',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: 'var(--bg-secondary)',
                    zIndex: 10
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'var(--font-serif)', fontWeight: '900' }}>{title}</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--accent-primary)',
                            border: '2px solid black',
                            cursor: 'pointer',
                            color: 'white',
                            padding: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '2px 2px 0px 0px #000000',
                            transition: 'all 0.1s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translate(-1px, -1px)';
                            e.currentTarget.style.boxShadow = '3px 3px 0px 0px #000000';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translate(0, 0)';
                            e.currentTarget.style.boxShadow = '2px 2px 0px 0px #000000';
                        }}
                    >
                        <X size={24} strokeWidth={3} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '2rem' }}>
                    {children}
                </div>
            </div>
            <style>{`
                @keyframes modalSlideIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
