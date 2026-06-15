import { useState } from 'react';
import { X } from 'lucide-react';
import { getBandForFkgl } from '@/lib/parseReadabilityResult';

const LEARNER_OPTIONS = [
    { value: 'high_school', label: 'High school students' },
    { value: 'apprentices', label: 'Apprentices and trainees' },
    { value: 'working_adults', label: 'Working adults' },
    { value: 'university', label: 'University students' },
];

const SUPPORT_OPTIONS = [
    { value: 'none',     label: 'No — most learners read English comfortably' },
    { value: 'esl',      label: 'Yes — some learners speak English as a second language (ESL)' },
    { value: 'literacy', label: 'Yes — some learners need extra literacy support' },
    { value: 'both',     label: 'Yes — ESL and literacy support needed' },
];

const FKGL_MAP = {
    high_school:    { none: 8.0,  esl: 7.0,  literacy: 6.0,  both: 5.0 },
    apprentices:    { none: 11.0, esl: 9.0,  literacy: 8.0,  both: 7.0 },
    working_adults: { none: 11.0, esl: 9.0,  literacy: 8.0,  both: 7.0 },
    university:     { none: 14.0, esl: 12.0, literacy: 11.0, both: 10.0 },
};

const LEARNER_DESCRIPTIONS = {
    high_school:    'high school students',
    apprentices:    'apprentices and trainees',
    working_adults: 'working adults',
    university:     'university students',
};

const SUPPORT_SUFFIXES = {
    none:     '',
    esl:      ' with ESL support',
    literacy: ' with literacy support',
    both:     ' with ESL and literacy support',
};

export default function RewriteModal({ bandName, fkglStr, onConfirm, onCancel }) {
    const [learner, setLearner] = useState('');
    const [support, setSupport] = useState('');

    const targetFkgl = learner && support ? FKGL_MAP[learner]?.[support] : null;
    const targetBand = targetFkgl != null ? getBandForFkgl(targetFkgl) : null;
    const bothSelected = !!(learner && support);

    const handleConfirm = (e) => {
        e.stopPropagation();
        if (!bothSelected) return;
        const learnerDesc = LEARNER_DESCRIPTIONS[learner];
        const supportSuffix = SUPPORT_SUFFIXES[support];
        console.log('[RewriteModal] handleConfirm fired', { learner, support, targetFkgl });
        onConfirm({
            targetFkgl,
            learnerLabel: LEARNER_OPTIONS.find(o => o.value === learner)?.label || learnerDesc,
            learnerDesc,
            support,
        });
    };

    const selectStyle = {
        width: '100%',
        height: '44px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '0 12px',
        fontSize: '14px',
        backgroundColor: '#ffffff',
        outline: 'none',
        cursor: 'pointer',
        color: '#0d2444',
        appearance: 'auto',
    };

    return (
        /* Overlay — clicking backdrop calls onCancel */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={onCancel}
        >
            {/* Card — stop ALL clicks from reaching the overlay */}
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    maxWidth: '480px',
                    width: '100%',
                    margin: '0 16px',
                    padding: '28px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}
            >
                {/* Header */}
                <div className="flex items-start justify-between" style={{ marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#0d2444', marginBottom: '4px' }}>
                            Rewrite for your learners
                        </h2>
                        <p style={{ fontSize: '13px', color: '#6b7280' }}>
                            Current level: {bandName}
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Question 1 */}
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#0d2444', marginBottom: '8px' }}>
                    Who will be reading this?
                </label>
                <select
                    value={learner}
                    onChange={e => setLearner(e.target.value)}
                    style={selectStyle}
                >
                    <option value="" disabled>Select your learners...</option>
                    {LEARNER_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                {/* Question 2 */}
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#0d2444', marginTop: '16px', marginBottom: '8px' }}>
                    Do any of your learners need extra support?
                </label>
                <select
                    value={support}
                    onChange={e => setSupport(e.target.value)}
                    style={selectStyle}
                >
                    <option value="" disabled>Select support needs...</option>
                    {SUPPORT_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                {/* Live confirmation */}
                {bothSelected && targetBand && (
                    <p style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic', marginTop: '12px' }}>
                        We'll rewrite this to approximately{' '}
                        <strong style={{ fontStyle: 'normal', color: '#0d2444' }}>{targetBand.name}</strong>{' '}
                        level — suitable for {LEARNER_DESCRIPTIONS[learner]}{SUPPORT_SUFFIXES[support]}.
                    </p>
                )}

                {/* Footer */}
                <div className="flex gap-3" style={{ marginTop: '24px' }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            flex: 1, height: '44px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
                            border: '1px solid #0d2444', color: '#0d2444', backgroundColor: 'transparent', cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        style={{
                            flex: 1, height: '44px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
                            backgroundColor: bothSelected ? '#c9a84c' : '#e5e7eb',
                            color: bothSelected ? '#0d2444' : '#9ca3af',
                            border: 'none',
                            cursor: bothSelected ? 'pointer' : 'not-allowed',
                            opacity: bothSelected ? 1 : 0.6,
                            transition: 'background-color 0.15s',
                        }}
                    >
                        Rewrite for my learners →
                    </button>
                </div>
            </div>
        </div>
    );
}