import { useState } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECTION_ICONS = {
    knowledge_questions:   '📝',
    practical_observation: '👁',
    workplace_project:     '📋',
    case_study:            '💬',
    supervisor_report:     '📄',
    work_documents:        '🗂',
    verbal_questions:      '🎙',
};

function RequirementLine({ section, isOptional }) {
    if (isOptional) {
        const reasonMap = {
            supervisor_report: 'Optional — add when direct observation is not always possible',
            work_documents:    'Optional — add when learners will submit existing workplace documents as evidence',
            verbal_questions:  'Optional — recommended for ESL learners or those needing literacy support',
        };
        const text = reasonMap[section.id] || (section.reason ? `Optional — ${section.reason}` : null);
        if (!text) return null;
        return (
            <p style={{ color: '#6b7280', fontSize: '11px', fontStyle: 'italic', marginTop: '4px', marginBottom: 0 }}>
                {text}
            </p>
        );
    }

    const req = section.uocRequirement;
    if (!req) return null;

    const isVerbal = section.id === 'verbal_questions';
    return (
        <>
            <p style={{ color: '#c9a84c', fontSize: '11px', fontStyle: 'italic', marginTop: '4px', marginBottom: 0 }}>
                {req}
            </p>
            {isVerbal && (
                <p style={{ color: '#9ca3af', fontSize: '10px', marginTop: '2px', marginBottom: 0 }}>
                    Assessor records responses — learner readability scoring not applicable
                </p>
            )}
        </>
    );
}

function RequiredCard({ section, onFormatChange }) {
    return (
        <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '14px 16px',
            backgroundColor: '#ffffff',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
        }}>
            <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>
                {SECTION_ICONS[section.id] || '📄'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500, margin: 0 }}>
                        {section.name}
                    </p>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }} title="Required by your UoC">🔒</span>
                </div>
                <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>
                    {section.description}
                </p>
                <RequirementLine section={section} isOptional={false} />

                {section.formatOptions && !section.formatLocked && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {section.formatOptions.map(opt => (
                            <button
                                key={opt}
                                onClick={() => onFormatChange(section.id, opt)}
                                style={{
                                    padding: '3px 10px',
                                    borderRadius: '20px',
                                    border: `1px solid ${section.format === opt ? '#c9a84c' : '#e5e7eb'}`,
                                    backgroundColor: section.format === opt ? '#fef9ec' : '#f9fafb',
                                    color: section.format === opt ? '#0d2444' : '#6b7280',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    fontWeight: section.format === opt ? 500 : 400,
                                    transition: 'all 0.1s',
                                }}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}
                {section.formatLocked && section.format && (
                    <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '6px', marginBottom: 0 }}>
                        Format: {section.format} (specified by UoC)
                    </p>
                )}
                {section.formatNote && (
                    <p style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic', marginTop: '4px', marginBottom: 0 }}>
                        {section.formatNote}
                    </p>
                )}
            </div>
        </div>
    );
}

function OptionalCard({ section, added, onToggle }) {
    return (
        <div style={{
            border: `1px dashed ${added ? '#c9a84c' : '#d1d5db'}`,
            borderRadius: '10px',
            padding: '14px 16px',
            backgroundColor: added ? '#fef9ec' : '#fafafa',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            transition: 'all 0.15s',
        }}>
            <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>
                {SECTION_ICONS[section.id] || '📄'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500, margin: '0 0 2px' }}>
                    {section.name}
                </p>
                <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>
                    {section.description}
                </p>
                <RequirementLine section={section} isOptional={true} />
                {section.addedNote && added && (
                    <div style={{ marginTop: '8px' }}>
                        {section.addedNote.map((line, i) => (
                            <p key={i} style={{ color: '#6b7280', fontSize: '11px', margin: '1px 0' }}>{line}</p>
                        ))}
                    </div>
                )}
            </div>
            <button
                onClick={() => onToggle(section.id)}
                style={{
                    flexShrink: 0,
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${added ? '#ef4444' : '#c9a84c'}`,
                    backgroundColor: 'transparent',
                    color: added ? '#ef4444' : '#c9a84c',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                }}
            >
                {added ? 'Remove' : '+ Add'}
            </button>
        </div>
    );
}

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
    const required = structureProposal?.required || [];
    const optional = structureProposal?.optional || [];

    const [sections, setSections] = useState(required);
    const [addedOptional, setAddedOptional] = useState([]);

    const handleFormatChange = (id, newFormat) => {
        setSections(prev => prev.map(s => s.id === id ? { ...s, format: newFormat } : s));
    };

    const handleToggleOptional = (id) => {
        setAddedOptional(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleBuild = () => {
        const addedSections = optional.filter(s => addedOptional.includes(s.id));
        onBuild([...sections, ...addedSections]);
    };

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '540px', margin: '0 auto', padding: '32px 24px' }}>
                <BuildProgress
                    step={3}
                    contextNote="Based on your UoC, here's what we'll build. Add optional sections if needed, then click Build."
                />

                <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '16px' }}>
                    Here's what we'll build
                </h2>

                <div style={{
                    backgroundColor: '#162d50', borderRadius: '8px',
                    padding: '12px 16px', marginBottom: '20px',
                }}>
                    <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
                        {unitInfo.code} — {unitInfo.title}
                    </p>
                    <p style={{ color: '#c9a84c', fontSize: '12px' }}>
                        Reading level: {cohortInfo.band} · Target aligned to {cohortInfo.learnerDesc}
                    </p>
                </div>

                {sections.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <p style={{ color: '#374151', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                            Required by your UoC
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {sections.map(s => (
                                <RequiredCard key={s.id} section={s} onFormatChange={handleFormatChange} />
                            ))}
                        </div>
                    </div>
                )}

                {optional.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <p style={{ color: '#374151', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                            Optional additions
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {optional.map(s => (
                                <OptionalCard
                                    key={s.id}
                                    section={s}
                                    added={addedOptional.includes(s.id)}
                                    onToggle={handleToggleOptional}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px' }}>
                    {['✓ All practical tasks covered', '✓ All knowledge questions covered', '✓ All learning outcomes mapped'].map(line => (
                        <p key={line} style={{ color: '#6b7280', fontSize: '13px', marginBottom: '4px' }}>{line}</p>
                    ))}
                    <p style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic', marginTop: '6px', marginBottom: 0 }}>
                        You can edit question counts and content after downloading.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onBack}
                        style={{ flex: 1, height: '44px', border: '1px solid #0d2444', borderRadius: '8px', backgroundColor: 'transparent', color: '#0d2444', fontSize: '14px', cursor: 'pointer' }}
                    >
                        ← Back
                    </button>
                    <button
                        onClick={handleBuild}
                        style={{ flex: 1, height: '44px', backgroundColor: '#c9a84c', color: '#0d2444', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                    >
                        Build my assessment →
                    </button>
                </div>
            </div>
        </div>
    );
}