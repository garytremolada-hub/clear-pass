import { ExternalLink } from 'lucide-react';

export default function TgaLink({ unitCode }) {
    const code = (unitCode || '').trim().toUpperCase();
    const href = code
        ? `https://training.gov.au/Training/Details/${code}`
        : 'https://training.gov.au';
    return (
        <div style={{ marginBottom: '16px' }}>
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', border: '1px solid #0d2444', borderRadius: '8px',
                    color: '#0d2444', fontSize: '13px', fontWeight: 500, textDecoration: 'none',
                }}
            >
                <ExternalLink style={{ width: '14px', height: '14px' }} />
                {code ? `Open ${code} on training.gov.au` : 'Open training.gov.au'}
            </a>
            <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '6px' }}>
                Unit not loading? Open it on training.gov.au to download the unit files yourself.
            </p>
        </div>
    );
}