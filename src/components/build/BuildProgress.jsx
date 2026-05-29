export default function BuildProgress({ step, contextNote }) {
    const steps = ['Upload', 'Learners', 'Review', 'Done'];

    return (
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            {/* Step circles */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: '8px' }}>
                {steps.map((label, i) => {
                    const active = i < step;
                    const current = i === step - 1;
                    return (
                        <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <div style={{
                                    width: '28px', height: '28px',
                                    borderRadius: '50%',
                                    backgroundColor: active ? '#c9a84c' : 'transparent',
                                    border: active ? 'none' : '2px solid #d1d5db',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '12px', fontWeight: 600,
                                    color: active ? '#0d2444' : '#9ca3af',
                                    transition: 'all 0.2s',
                                }}>
                                    {i + 1}
                                </div>
                                <span style={{ fontSize: '11px', color: active ? '#0d2444' : '#9ca3af', fontWeight: current ? 500 : 400 }}>
                                    {label}
                                </span>
                            </div>
                            {i < steps.length - 1 && (
                                <div style={{
                                    width: '40px', height: '2px',
                                    backgroundColor: i < step - 1 ? '#c9a84c' : '#e5e7eb',
                                    margin: '0 4px',
                                    marginBottom: '18px',
                                    transition: 'background-color 0.2s',
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Context note */}
            {contextNote && (
                <p style={{ color: '#6b7280', fontSize: '12px', fontStyle: 'italic', marginTop: '4px' }}>
                    {contextNote}
                </p>
            )}
        </div>
    );
}