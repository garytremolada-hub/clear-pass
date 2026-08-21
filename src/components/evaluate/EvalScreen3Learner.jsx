import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import EvalProgress from './EvalProgress';
import { LEARNER_OPTIONS, SUPPORT_OPTIONS, getBand, BAND_FKGL, clusterLabel } from '@/lib/evaluateAudit';

export default function EvalScreen3Learner({ units, onBack, onConfirm }) {
    const [learner, setLearner] = useState('');
    const [support, setSupport] = useState('');

    const selectedLearner = LEARNER_OPTIONS.find(o => o.value === learner);
    const canContinue = learner && support;
    const band = canContinue ? getBand(learner, support) : null;
    const targetFKGL = band ? (BAND_FKGL[band] || 10.5) : null;

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 56px' }}>
                <EvalProgress step={3} />
                <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '8px' }}>
                    Who was this assessment written for?
                </h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                    This sets the reading level we compare the assessment against for {clusterLabel(units)}
                </p>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', color: '#0d2444', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                        Who are the learners?
                    </label>
                    <select
                        value={learner}
                        onChange={e => { setLearner(e.target.value); setSupport(''); }}
                        style={{ width: '100%', height: '44px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0 12px', fontSize: '14px', backgroundColor: '#ffffff', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="" disabled>Select your learners...</option>
                        {LEARNER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {selectedLearner && (
                        <p style={{ color: '#6b7280', fontSize: '12px', fontStyle: 'italic', marginTop: '6px' }}>{selectedLearner.feedback}</p>
                    )}
                </div>

                {learner && (
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: '#0d2444', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                            Do any learners need extra support?
                        </label>
                        <select
                            value={support}
                            onChange={e => setSupport(e.target.value)}
                            style={{ width: '100%', height: '44px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0 12px', fontSize: '14px', backgroundColor: '#ffffff', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="" disabled>Select support needs...</option>
                            {SUPPORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                )}

                {canContinue && (
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <CheckCircle style={{ color: '#22c55e', width: '18px', height: '18px', flexShrink: 0, marginTop: '1px' }} />
                        <div>
                            <p style={{ color: '#0d2444', fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>
                                Target readability: {band}
                            </p>
                            <p style={{ color: '#6b7280', fontSize: '12px' }}>
                                We'll compare the assessment against this reading level.
                            </p>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button onClick={onBack} style={{ flex: 1, height: '44px', border: '1px solid #0d2444', borderRadius: '8px', backgroundColor: 'transparent', color: '#0d2444', fontSize: '14px', cursor: 'pointer' }}>
                        ← Back
                    </button>
                    <button
                        onClick={() => onConfirm({ learner, support, band, targetFKGL })}
                        disabled={!canContinue}
                        style={{
                            flex: 1, height: '44px', borderRadius: '8px',
                            backgroundColor: canContinue ? '#c9a84c' : '#e5e7eb',
                            color: canContinue ? '#0d2444' : '#9ca3af',
                            fontSize: '14px', fontWeight: 500, border: 'none',
                            cursor: canContinue ? 'pointer' : 'not-allowed',
                        }}
                    >
                        Start evaluation →
                    </button>
                </div>
            </div>
        </div>
    );
}