const STEPS = ['Upload UoC', 'Learners', 'Review', 'Done'];

export default function BuildProgress({ step, contextNote }) {
    return (
        <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                {STEPS.map((label, i) => {
                    const idx = i + 1;
                    const done = idx < step;
                    const active = idx === step;
                    return (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{
                                    width: '28px', height: '28px', borderRadius: '50%',
                                    backgroundColor: done ? '#0d2444' : active ? '#c9a84c' : '#e5e7eb',
                                    color: done ? '#c9a84c' : active ? '#0d2444' : '#9ca3af',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '12px', fontWeight: 600, flexShrink: 0,
                                }}>
                                    {done ? '✓' : idx}
                                </div>
                                <span style={{
                                    fontSize: '10px',
                                    color: active ? '#0d2444' : '#9ca3af',
                                    fontWeight: active ? 500 : 400,
                                    marginTop: '4px',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {label}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div style={{
                                    flex: 1,
                                    height: '2px',
                                    backgroundColor: done ? '#0d2444' : '#e5e7eb',
                                    margin: '0 4px',
                                    marginBottom: '18px',
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>
            {contextNote && (
                <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: 1.5 }}>{contextNote}</p>
            )}
        </div>
    );
}