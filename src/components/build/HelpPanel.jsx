import { useEffect, useState } from 'react';

export default function HelpPanel({ url, heading, description, onClose }) {
    const [iframeError, setIframeError] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    zIndex: 999,
                }}
            />

            {/* Panel */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: '380px',
                maxWidth: '100vw',
                backgroundColor: '#ffffff',
                boxShadow: '-4px 0 16px rgba(0,0,0,0.12)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideInRight 250ms ease',
            }}>
                <style>{`
                    @keyframes slideInRight {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                    }
                `}</style>

                {/* Header */}
                <div style={{
                    backgroundColor: '#0d2444',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                }}>
                    <span style={{ color: '#c9a84c', fontSize: '12px', letterSpacing: '1px' }}>
                        training.gov.au
                    </span>
                    <button
                        onClick={onClose}
                        style={{ color: '#ffffff', fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    {!iframeError ? (
                        <iframe
                            src={url}
                            title="training.gov.au"
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            onError={() => setIframeError(true)}
                            onLoad={(e) => {
                                // Try to detect X-Frame-Options block
                                try {
                                    const doc = e.target.contentDocument;
                                    if (!doc || !doc.body) setIframeError(true);
                                } catch {
                                    setIframeError(true);
                                }
                            }}
                        />
                    ) : (
                        <div style={{ padding: '20px' }}>
                            <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>
                                {heading}
                            </p>
                            <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px' }}>
                                {description}
                            </p>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    height: '44px',
                                    backgroundColor: '#c9a84c',
                                    color: '#0d2444',
                                    textAlign: 'center',
                                    lineHeight: '44px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    textDecoration: 'none',
                                }}
                            >
                                Open training.gov.au in new tab →
                            </a>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 16px',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0,
                }}>
                    <span style={{ color: '#6b7280', fontSize: '11px' }}>Official Australian VET register</span>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#c9a84c', fontSize: '11px', textDecoration: 'none' }}
                    >
                        Open in new tab ↗
                    </a>
                </div>
            </div>
        </>
    );
}