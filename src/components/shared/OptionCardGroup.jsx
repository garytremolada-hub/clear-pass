import { Check } from 'lucide-react';

export default function OptionCardGroup({ heading, hint, options, value, onChange, helpIcon }) {
    return (
        <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: hint ? '2px' : '12px' }}>
                <h3 style={{ color: '#0d2444', fontSize: '16px', fontWeight: 600, margin: 0 }}>{heading}</h3>
                {helpIcon}
            </div>
            {hint && <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 12px' }}>{hint}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {options.map(o => {
                    const selected = value === o.value;
                    return (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => onChange(o.value)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                textAlign: 'left', width: '100%',
                                padding: '14px 16px', borderRadius: '8px', cursor: 'pointer',
                                border: `2px solid ${selected ? '#c9a84c' : '#e5e7eb'}`,
                                backgroundColor: selected ? '#fdf8ec' : '#ffffff',
                                color: '#0d2444', fontSize: '14px', fontWeight: selected ? 600 : 400,
                            }}
                        >
                            <span style={{
                                width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: `2px solid ${selected ? '#c9a84c' : '#d1d5db'}`,
                                backgroundColor: selected ? '#c9a84c' : 'transparent',
                            }}>
                                {selected && <Check style={{ width: '12px', height: '12px', color: '#0d2444' }} />}
                            </span>
                            {o.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}