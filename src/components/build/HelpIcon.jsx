import { useState } from 'react';
import HelpPanel from './HelpPanel';

export default function HelpIcon({ url, heading, description }) {
    const [open, setOpen] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <>
            <span style={{ position: 'relative', display: 'inline-flex', marginLeft: '6px' }}>
                <button
                    onClick={() => setOpen(true)}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    style={{
                        width: '16px', height: '16px',
                        borderRadius: '50%',
                        border: '1px solid #8ba4c4',
                        backgroundColor: 'transparent',
                        color: '#8ba4c4',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                        padding: 0,
                    }}
                >
                    ?
                </button>
                {showTooltip && (
                    <span style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#0d2444',
                        color: '#ffffff',
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        zIndex: 10,
                    }}>
                        Learn more on training.gov.au
                    </span>
                )}
            </span>

            {open && (
                <HelpPanel
                    url={url}
                    heading={heading}
                    description={description}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
}