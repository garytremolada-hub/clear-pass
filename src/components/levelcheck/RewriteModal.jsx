import { useState } from 'react';
import { X } from 'lucide-react';

const TARGET_LEVELS = [
    'Year 7–8 — junior secondary',
    'Year 9–10 — middle secondary',
    'Certificate I/II — AQF 1–2',
    'Certificate III/IV — AQF 3–4',
    'Diploma — AQF 5–6',
    'Degree / Grad Dip — AQF 7–8',
    'Postgraduate',
];

export default function RewriteModal({ bandName, fkglStr, onConfirm, onCancel }) {
    const [target, setTarget] = useState('');

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
        >
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                maxWidth: '480px',
                width: '100%',
                margin: '0 16px',
                padding: '28px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}>
                {/* Header */}
                <div className="flex items-start justify-between" style={{ marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#0d2444', marginBottom: '4px' }}>
                            Rewrite to a different level
                        </h2>
                        <p style={{ fontSize: '13px', color: '#6b7280' }}>
                            Current level: {bandName} — FKGL {fkglStr}
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#0d2444', marginBottom: '8px' }}>
                    Who are you writing for?
                </label>
                <select
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    style={{
                        width: '100%',
                        height: '44px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '0 12px',
                        fontSize: '14px',
                        color: target ? '#0d2444' : '#9ca3af',
                        backgroundColor: '#ffffff',
                        outline: 'none',
                        cursor: 'pointer',
                    }}
                >
                    <option value="" disabled>Select a target level...</option>
                    {TARGET_LEVELS.map(lvl => (
                        <option key={lvl} value={lvl} style={{ color: '#0d2444' }}>{lvl}</option>
                    ))}
                </select>

                {/* Footer */}
                <div className="flex gap-3" style={{ marginTop: '24px' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1,
                            height: '44px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 500,
                            border: '1px solid #0d2444',
                            color: '#0d2444',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => target && onConfirm(target)}
                        disabled={!target}
                        style={{
                            flex: 1,
                            height: '44px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 500,
                            backgroundColor: target ? '#c9a84c' : '#e5e7eb',
                            color: target ? '#0d2444' : '#9ca3af',
                            border: 'none',
                            cursor: target ? 'pointer' : 'not-allowed',
                            transition: 'background-color 0.15s',
                        }}
                    >
                        Rewrite to this level →
                    </button>
                </div>
            </div>
        </div>
    );
}