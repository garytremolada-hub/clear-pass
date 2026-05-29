import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

export default function HelpIcon({ url, heading, description }) {
    const [open, setOpen] = useState(false);

    return (
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '6px' }}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
            >
                <HelpCircle style={{ width: '15px', height: '15px', color: '#9ca3af' }} />
            </button>

            {open && (
                <div style={{
                    position: 'absolute',
                    top: '24px',
                    left: '0',
                    zIndex: 50,
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px',
                    width: '260px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <p style={{ color: '#0d2444', fontSize: '13px', fontWeight: 500 }}>{heading}</p>
                        <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <X style={{ width: '14px', height: '14px', color: '#9ca3af' }} />
                        </button>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.5, marginBottom: '8px' }}>{description}</p>
                    {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#c9a84c', fontSize: '12px', textDecoration: 'underline' }}>
                            Open {heading} →
                        </a>
                    )}
                </div>
            )}
        </span>
    );
}