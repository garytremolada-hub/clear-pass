import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

const BP_STEPS = ['Upload UoC', 'Learners', 'Review', 'Done'];

function BuildProgress({ step }) {
    return (
        <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                {BP_STEPS.map((label, i) => {
                    const idx = i + 1;
                    const done = idx < step;
                    const active = idx === step;
                    return (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < BP_STEPS.length - 1 ? 1 : 'none' }}>
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
                                <span style={{ fontSize: '10px', color: active ? '#0d2444' : '#9ca3af', fontWeight: active ? 500 : 400, marginTop: '4px', whiteSpace: 'nowrap' }}>
                                    {label}
                                </span>
                            </div>
                            {i < BP_STEPS.length - 1 && (
                                <div style={{ flex: 1, height: '2px', backgroundColor: done ? '#0d2444' : '#e5e7eb', margin: '0 4px', marginBottom: '18px' }} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function Screen3Structure({ unitInfo, cohortInfo, structureProposal, onBack, onBuild }) {
    const required = structureProposal?.required || [];
    const optional = structureProposal?.optional || [];

    // Track which optional sections are toggled on
    const [enabledOptional, setEnabledOptional] = useState({});
    // Track format selections per section
    const [formats, setFormats] = useState(() => {
        const init = {};
        (structureProposal?.required || []).forEach(s => { if (s.format) init[s.id] = s.format; });
        return init;
    });

    const toggleOptional = (id) => setEnabledOptional(prev => ({ ...prev, [id]: !prev[id] }));
    const setFormat = (id, fmt) => setFormats(prev => ({ ...prev, [id]: fmt }));

    const activeSections = [
        ...required.map(s => ({ ...s, format: formats[s.id] || s.format })),
        ...optional.filter(s => enabledOptional[s.id]).map(s => ({ ...s })),
    ];

    const handleBuild = () => onBuild(activeSections);

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '540px', margin: '0 auto', padding: '32px 24px' }}>
                <BuildProgress step={3} />

                <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '6px' }}>
                    Review your assessment structure
                </h2>
                <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px' }}>
                    Based on {unitInfo?.code} and your learner profile, we recommend these sections.
                </p>

                {/* Required sections */}
                {required.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <p style={{ color: '#0d2444', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                            Required sections
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {required.map(section => (
                                <div key={section.id} style={{
                                    border: '1px solid #22c55e',
                                    borderRadius: '10px',
                                    padding: '14px 16px',
                                    backgroundColor: '#f0fdf4',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <CheckCircle style={{ color: '#22c55e', width: '18px', height: '18px', flexShrink: 0, marginTop: '1px' }} />
                                        <div style={{ flex: 1 }}>
                                            <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
                                                {section.name}
                                            </p>
                                            <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: section.uocRequirement ? '6px' : 0 }}>
                                                {section.description}
                                            </p>
                                            {section.uocRequirement && (
                                                <p style={{ color: '#166534', fontSize: '11px', fontStyle: 'italic' }}>
                                                    {section.uocRequirement}
                                                </p>
                                            )}
                                            {/* Format selector */}
                                            {section.formatOptions && !section.formatLocked && (
                                                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                                    {section.formatOptions.map(fmt => (
                                                        <button
                                                            key={fmt}
                                                            onClick={() => setFormat(section.id, fmt)}
                                                            style={{
                                                                padding: '3px 10px',
                                                                borderRadius: '4px',
                                                                fontSize: '12px',
                                                                border: `1px solid ${(formats[section.id] || section.format) === fmt ? '#0d2444' : '#d1d5db'}`,
                                                                backgroundColor: (formats[section.id] || section.format) === fmt ? '#0d2444' : 'transparent',
                                                                color: (formats[section.id] || section.format) === fmt ? '#ffffff' : '#6b7280',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            {fmt}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {section.formatNote && (
                                                <p style={{ color: '#6b7280', fontSize: '11px', fontStyle: 'italic', marginTop: '4px' }}>
                                                    {section.formatNote}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Optional sections */}
                {optional.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <p style={{ color: '#0d2444', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                            Optional sections
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {optional.map(section => {
                                const enabled = !!enabledOptional[section.id];
                                return (
                                    <div key={section.id} style={{
                                        border: `1px solid ${enabled ? '#c9a84c' : '#e5e7eb'}`,
                                        borderRadius: '10px',
                                        padding: '14px 16px',
                                        backgroundColor: enabled ? '#fffbeb' : '#f9fafb',
                                        cursor: 'pointer',
                                    }} onClick={() => toggleOptional(section.id)}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                            <div style={{
                                                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                                                border: `2px solid ${enabled ? '#c9a84c' : '#d1d5db'}`,
                                                backgroundColor: enabled ? '#c9a84c' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {enabled && <span style={{ color: '#0d2444', fontSize: '10px', fontWeight: 700 }}>✓</span>}
                                            </div>
                                            <div>
                                                <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
                                                    {section.name}
                                                </p>
                                                <p style={{ color: '#6b7280', fontSize: '12px' }}>
                                                    {section.reason || section.description}
                                                </p>
                                                {section.addedNote && enabled && (
                                                    <div style={{ marginTop: '6px' }}>
                                                        {section.addedNote.map((note, i) => (
                                                            <p key={i} style={{ color: '#6b7280', fontSize: '11px', fontStyle: i === 0 ? 'normal' : 'italic' }}>{note}</p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                        onClick={onBack}
                        style={{ flex: 1, height: '44px', border: '1px solid #0d2444', borderRadius: '8px', backgroundColor: 'transparent', color: '#0d2444', fontSize: '14px', cursor: 'pointer' }}
                    >
                        ← Back
                    </button>
                    <button
                        onClick={handleBuild}
                        style={{
                            flex: 2, height: '44px', borderRadius: '8px',
                            backgroundColor: '#c9a84c', color: '#0d2444',
                            fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer',
                        }}
                    >
                        Build assessment →
                    </button>
                </div>
            </div>
        </div>
    );
}