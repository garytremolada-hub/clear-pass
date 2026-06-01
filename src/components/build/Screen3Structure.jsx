import { useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

// ── Inlined: HelpIcon ─────────────────────────────────────────────────────────
function HelpIcon({ url, heading, description }) {
    const [helpOpen, setHelpOpen] = useState(false);
    return (
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '6px' }}>
            <button type="button" onClick={() => setHelpOpen(o => !o)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
            </button>
            {helpOpen && (
                <div style={{ position: 'absolute', top: '24px', left: '0', zIndex: 50, backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', width: '260px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <p style={{ color: '#0d2444', fontSize: '13px', fontWeight: 500 }}>{heading}</p>
                        <button type="button" onClick={() => setHelpOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '16px', color: '#9ca3af', lineHeight: 1 }}>×</button>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.5, marginBottom: '8px' }}>{description}</p>
                    {url && <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#c9a84c', fontSize: '12px', textDecoration: 'underline' }}>Open {heading} →</a>}
                </div>
            )}
        </span>
    );
}

// ── Progress component ────────────────────────────────────────────────────────
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
        const sections = (structureProposal?.required || []).filter(s => selectedSections.includes(s.id))
            .concat((structureProposal?.optional || []).filter(s => selectedSections.includes(s.id)));
        onBuild(sections);
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
                    Based on {unitInfo.code}, we recommend the following structure:
                </p>

                {/* Required sections */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: '#0d2444', fontSize: '16px', fontWeight: 500, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle style={{ color: '#22c55e', width: '18px', height: '18px' }} />
                        Required sections
                        <HelpIcon
                            url="https://training.gov.au/Training/Details/help"
                            heading="Required sections"
                            description="These sections are mandatory based on your UoC requirements. They cover all Knowledge Evidence, Performance Evidence, and Performance Criteria."
                        />
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
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <p style={{ color: '#0d2444', fontSize: '11px', fontWeight: 500 }}>Why required:</p>
                                        <p style={{ color: '#6b7280', fontSize: '11px', fontStyle: 'italic' }}>{section.justification}</p>
                                        <p style={{ color: '#0d2444', fontSize: '11px', fontWeight: 500 }}>UoC requirement:</p>
                                        <p style={{ color: '#6b7280', fontSize: '11px', fontStyle: 'italic' }}>{section.uocRequirement}</p>
                                    </div>
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
                            <HelpIcon
                                url="https://training.gov.au/Training/Details/help"
                                heading="Optional sections"
                                description="These sections are not mandatory but may be useful for your specific cohort or delivery mode. Select any that apply to your learners."
                            />
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
                                        <p style={{ color: '#6b7280', fontSize: '11px', fontStyle: 'italic', marginTop: '6px' }}>Reason: {section.reason}</p>
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
                        ← Back
                    </button>
                    <button
                        onClick={handleBuild}
                        style={{
                            flex: 1, height: '44px', borderRadius: '8px',
                            backgroundColor: '#c9a84c', color: '#0d2444',
                            fontSize: '14px', fontWeight: 500,
                            border: 'none', cursor: 'pointer',
                            transition: 'all 0.15s',
                        }}
                    >
                        Build assessment →
                    </button>
                </div>

                {/* Info note */}
                <div style={{
                    backgroundColor: '#f9fafb',
                    borderLeft: '3px solid #c9a84c',
                    borderRadius: '4px',
                    padding: '10px 14px',
                    marginTop: '16px',
                }}>
                    <p style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.6 }}>
                        You can adjust the reading level after downloading if needed. All content is AI-generated and should be reviewed with a qualified assessor.
                    </p>
                </div>
            </div>
        </div>
    );
}