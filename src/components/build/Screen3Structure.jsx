import { useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

const BP_STEPS = ['Upload UoC', 'Learners', 'Review', 'Done'];
function BuildProgress({ step, contextNote }) {
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
            {contextNote && <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: 1.5 }}>{contextNote}</p>}
        </div>
    );
}

export default function Screen3Structure({ unitInfo, cohortInfo, structureProposal, onBack, onBuild }) {
    const [selectedSections, setSelectedSections] = useState(() => {
        const required = structureProposal?.required || [];
        return required.map(s => s.id);
    });

    const toggleSection = (id) => {
        setSelectedSections(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleBuild = () => {
        const required = (structureProposal?.required || []).filter(s => selectedSections.includes(s.id));
        const optional = (structureProposal?.optional || []).filter(s => selectedSections.includes(s.id));
        onBuild([...required, ...optional]);
    };

    const requiredSections = structureProposal?.required || [];
    const optionalSections = structureProposal?.optional || [];

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 24px' }}>
                <BuildProgress step={3} contextNote="Review your assessment structure — takes 2-3 minutes to build." />

                <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '8px' }}>
                    Your assessment structure
                </h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                    Based on {unitInfo?.code}, we recommend the following structure:
                </p>

                {/* Required sections */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: '#0d2444', fontSize: '16px', fontWeight: 500, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle style={{ color: '#22c55e', width: '18px', height: '18px' }} />
                        Required sections
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {requiredSections.map(section => (
                            <label key={section.id} style={{
                                display: 'flex', alignItems: 'flex-start', gap: '12px',
                                padding: '14px 16px', border: '1px solid #e5e7eb',
                                borderRadius: '8px', cursor: 'pointer',
                                backgroundColor: selectedSections.includes(section.id) ? '#f0f7ff' : '#ffffff',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={selectedSections.includes(section.id)}
                                    onChange={() => toggleSection(section.id)}
                                    style={{ marginTop: '2px', accentColor: '#c9a84c' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{section.name}</p>
                                    <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '6px' }}>{section.description}</p>
                                    {section.justification && (
                                        <p style={{ color: '#6b7280', fontSize: '11px', fontStyle: 'italic' }}>Why required: {section.justification}</p>
                                    )}
                                    {section.uocRequirement && (
                                        <p style={{ color: '#6b7280', fontSize: '11px', fontStyle: 'italic', marginTop: '4px' }}>{section.uocRequirement}</p>
                                    )}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Optional sections */}
                {optionalSections.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ color: '#0d2444', fontSize: '16px', fontWeight: 500, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertCircle style={{ color: '#c9a84c', width: '18px', height: '18px' }} />
                            Optional sections
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {optionalSections.map(section => (
                                <label key={section.id} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                                    padding: '14px 16px', border: '1px solid #e5e7eb',
                                    borderRadius: '8px', cursor: 'pointer',
                                    backgroundColor: selectedSections.includes(section.id) ? '#f0f7ff' : '#ffffff',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedSections.includes(section.id)}
                                        onChange={() => toggleSection(section.id)}
                                        style={{ marginTop: '2px', accentColor: '#c9a84c' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{section.name}</p>
                                        <p style={{ color: '#6b7280', fontSize: '12px' }}>{section.description}</p>
                                        {section.reason && (
                                            <p style={{ color: '#6b7280', fontSize: '11px', fontStyle: 'italic', marginTop: '4px' }}>Reason: {section.reason}</p>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button
                        onClick={onBack}
                        style={{ flex: 1, height: '44px', border: '1px solid #0d2444', borderRadius: '8px', backgroundColor: 'transparent', color: '#0d2444', fontSize: '14px', cursor: 'pointer' }}
                    >
                        Back
                    </button>
                    <button
                        onClick={handleBuild}
                        style={{
                            flex: 1, height: '44px', borderRadius: '8px',
                            backgroundColor: '#c9a84c', color: '#0d2444',
                            fontSize: '14px', fontWeight: 500,
                            border: 'none', cursor: 'pointer',
                        }}
                    >
                        Build assessment
                    </button>
                </div>

                <div style={{
                    backgroundColor: '#f9fafb', borderLeft: '3px solid #c9a84c',
                    borderRadius: '4px', padding: '10px 14px', marginTop: '16px',
                }}>
                    <p style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.6 }}>
                        All content is AI-generated and should be reviewed with a qualified assessor.
                    </p>
                </div>
            </div>
        </div>
    );
}