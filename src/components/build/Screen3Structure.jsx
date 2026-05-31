import { useState } from 'react';

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tooltip({ text, children }) {
    const [show, setShow] = useState(false);
    return (
        <span
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {show && (
                <span style={{
                    position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: '#0d2444', color: '#ffffff', fontSize: '11px', borderRadius: '5px',
                    padding: '5px 9px', whiteSpace: 'nowrap', zIndex: 99, pointerEvents: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>
                    {text}
                </span>
            )}
        </span>
    );
}

// ── Format toggle (Written/Verbal, Workplace/Simulation, Project/Case Study) ──
function FormatToggle({ options, value, locked, lockedTooltip, onChange }) {
    if (locked) {
        return (
            <Tooltip text={lockedTooltip || 'Format specified by your Assessment Conditions'}>
                <span style={{
                    fontSize: '11px', color: '#9ca3af', backgroundColor: '#f3f4f6',
                    border: '1px solid #e5e7eb', borderRadius: '4px', padding: '3px 8px',
                    cursor: 'default', userSelect: 'none',
                }}>
                    🔒 {value}
                </span>
            </Tooltip>
        );
    }
    return (
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            {options.map(opt => (
                <button
                    key={opt}
                    onClick={() => onChange(opt)}
                    style={{
                        fontSize: '11px', padding: '3px 9px', borderRadius: '4px', cursor: 'pointer',
                        border: value === opt ? '1px solid #0d2444' : '1px solid #e5e7eb',
                        backgroundColor: value === opt ? '#0d2444' : '#ffffff',
                        color: value === opt ? '#ffffff' : '#6b7280',
                        fontWeight: value === opt ? 500 : 400,
                        transition: 'all 0.12s',
                    }}
                >
                    {opt}
                </button>
            ))}
        </div>
    );
}

// ── Required section card ─────────────────────────────────────────────────────
function RequiredCard({ section, onFormatChange }) {
    return (
        <div style={{
            backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px',
            padding: '12px 16px', marginBottom: '8px', display: 'flex',
            alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
        }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <Tooltip text="Required by your UoC — cannot be removed">
                        <span style={{ fontSize: '13px', color: '#9ca3af', cursor: 'default', flexShrink: 0 }}>🔒</span>
                    </Tooltip>
                    <span style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500 }}>
                        {section.name}
                    </span>
                </div>
                <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px', marginLeft: '20px' }}>
                    {section.description}
                </p>
                <p style={{ color: '#c9a84c', fontSize: '11px', fontStyle: 'italic', marginLeft: '20px' }}>
                    Required — {section.justification}
                </p>
                {section.formatNote && (
                    <p style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic', marginLeft: '20px', marginTop: '3px' }}>
                        {section.formatNote}
                    </p>
                )}
            </div>
            {section.formatOptions && (
                <div style={{ flexShrink: 0, paddingTop: '2px' }}>
                    <FormatToggle
                        options={section.formatOptions}
                        value={section.format}
                        locked={section.formatLocked}
                        lockedTooltip="Format specified by your Assessment Conditions"
                        onChange={(v) => onFormatChange(section.id, v)}
                    />
                </div>
            )}
        </div>
    );
}

// ── Optional section card ─────────────────────────────────────────────────────
function OptionalCard({ section, added, onAdd, onRemove }) {
    return (
        <div style={{
            backgroundColor: '#ffffff',
            border: added ? '1px solid #e5e7eb' : '1px dashed #e5e7eb',
            borderRadius: '8px', padding: '12px 16px', marginBottom: '8px',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
            opacity: added ? 1 : 0.75,
            transition: 'opacity 0.2s, border 0.2s',
        }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '13px', color: added ? '#22c55e' : '#9ca3af', flexShrink: 0 }}>
                        {added ? '✓' : '+'}
                    </span>
                    <span style={{ color: added ? '#0d2444' : '#6b7280', fontSize: '14px', fontWeight: added ? 500 : 400 }}>
                        {section.name}
                    </span>
                </div>
                <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px', marginLeft: '20px' }}>
                    {section.description}
                </p>
                <p style={{ color: '#c9a84c', fontSize: '11px', fontStyle: 'italic', marginLeft: '20px' }}>
                    {section.reason}
                </p>
                {added && section.addedNote && (
                    <div style={{
                        marginLeft: '20px', marginTop: '8px', backgroundColor: '#f8fafc',
                        borderLeft: '3px solid #c9a84c', padding: '8px 10px', borderRadius: '4px',
                    }}>
                        {section.addedNote.map((line, i) => (
                            <p key={i} style={{ color: '#6b7280', fontSize: '11px', marginBottom: i < section.addedNote.length - 1 ? '2px' : 0 }}>
                                {line}
                            </p>
                        ))}
                    </div>
                )}
            </div>
            <div style={{ flexShrink: 0, paddingTop: '2px' }}>
                {added ? (
                    <button
                        onClick={() => onRemove(section.id)}
                        style={{
                            height: '32px', padding: '0 12px', borderRadius: '6px', cursor: 'pointer',
                            border: '1px solid #dc2626', backgroundColor: 'transparent',
                            color: '#dc2626', fontSize: '12px',
                        }}
                    >
                        Remove
                    </button>
                ) : (
                    <button
                        onClick={() => onAdd(section.id)}
                        style={{
                            height: '32px', padding: '0 12px', borderRadius: '6px', cursor: 'pointer',
                            border: '1px solid #0d2444', backgroundColor: 'transparent',
                            color: '#0d2444', fontSize: '12px',
                        }}
                    >
                        Add this section
                    </button>
                )}
            </div>
        </div>
    );
}

// ── BuildProgress (inlined copy to avoid prop-drilling) ───────────────────────
const BP_STEPS = ['Upload UoC', 'Learners', 'Review', 'Done'];
function BuildProgress({ step }) {
    return (
        <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
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

// ── Main Screen3 component ────────────────────────────────────────────────────

export default function Screen3Structure({ unitInfo, cohortInfo, structureProposal, onBack, onBuild }) {
    const proposal = structureProposal || {};

    // Build initial required sections from proposal
    const initRequired = (proposal.required || []).map(s => ({ ...s }));

    // Build initial optional sections from proposal
    const initOptional = (proposal.optional || []).map(s => ({ ...s }));

    const [requiredSections, setRequiredSections] = useState(initRequired);
    const [optionalSections, setOptionalSections] = useState(initOptional);
    const [addedOptional, setAddedOptional] = useState([]);

    const handleFormatChange = (id, newFormat) => {
        setRequiredSections(prev => prev.map(s => s.id === id ? { ...s, format: newFormat } : s));
    };

    const handleAdd = (id) => {
        setAddedOptional(prev => [...prev, id]);
    };

    const handleRemove = (id) => {
        setAddedOptional(prev => prev.filter(x => x !== id));
    };

    // Sections passed to handleBuild — required + added optional
    const handleBuildClick = () => {
        const addedSections = optionalSections.filter(s => addedOptional.includes(s.id));
        const allSections = [...requiredSections, ...addedSections];
        onBuild(allSections);
    };

    const addedOptionalSections = optionalSections.filter(s => addedOptional.includes(s.id));
    const pendingOptionalSections = optionalSections.filter(s => !addedOptional.includes(s.id));

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '540px', margin: '0 auto', padding: '32px 24px' }}>
                <BuildProgress step={3} />
                <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px', marginTop: '-12px' }}>
                    Based on your UoC, here's what we recommend. Click Build when ready.
                </p>

                <h2 style={{ color: '#0d2444', fontSize: '22px', fontWeight: 500, marginBottom: '16px' }}>
                    Here's what we'll build
                </h2>

                {/* Unit bar */}
                <div style={{ backgroundColor: '#162d50', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
                    <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
                        {unitInfo.code} — {unitInfo.title}
                    </p>
                    <p style={{ color: '#c9a84c', fontSize: '12px' }}>
                        Reading level: {cohortInfo.band} · Target aligned to {cohortInfo.learnerDesc}
                    </p>
                </div>

                {/* Group 1 — Required */}
                <p style={{ color: '#0d2444', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                    Required by your UoC
                </p>
                {requiredSections.map(s => (
                    <RequiredCard key={s.id} section={s} onFormatChange={handleFormatChange} />
                ))}

                {/* Added optional sections appear in the required area */}
                {addedOptionalSections.map(s => (
                    <OptionalCard key={s.id} section={s} added={true} onAdd={handleAdd} onRemove={handleRemove} />
                ))}

                {/* Group 2 — Optional */}
                {pendingOptionalSections.length > 0 && (
                    <>
                        <p style={{ color: '#0d2444', fontSize: '13px', fontWeight: 500, marginTop: '16px', marginBottom: '8px' }}>
                            Optional additions
                        </p>
                        {pendingOptionalSections.map(s => (
                            <OptionalCard key={s.id} section={s} added={false} onAdd={handleAdd} onRemove={handleRemove} />
                        ))}
                    </>
                )}

                {/* Coverage summary */}
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', marginBottom: '20px' }}>
                    <p style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                        Coverage at a glance:
                    </p>
                    {[
                        '✓ All practical tasks covered',
                        '✓ All knowledge questions covered',
                        '✓ All learning outcomes mapped',
                    ].map(line => (
                        <p key={line} style={{ color: '#6b7280', fontSize: '13px', marginBottom: '4px' }}>{line}</p>
                    ))}
                    <p style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic', marginTop: '6px' }}>
                        You can edit question counts and content after downloading.
                    </p>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onBack}
                        style={{ flex: 1, height: '44px', border: '1px solid #0d2444', borderRadius: '8px', backgroundColor: 'transparent', color: '#0d2444', fontSize: '14px', cursor: 'pointer' }}
                    >
                        ← Back
                    </button>
                    <button
                        onClick={handleBuildClick}
                        style={{ flex: 1, height: '44px', backgroundColor: '#c9a84c', color: '#0d2444', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                    >
                        Build my assessment →
                    </button>
                </div>
            </div>
        </div>
    );
}