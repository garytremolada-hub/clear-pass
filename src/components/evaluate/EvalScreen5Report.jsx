import { useState } from 'react';
import { Download } from 'lucide-react';
import EvalProgress from './EvalProgress';
import UnitReportBlock from './UnitReportBlock';
import ComparisonSection from './ComparisonSection';
import FeedbackButton from '@/components/feedback/FeedbackButton';
import FeedbackModal from '@/components/feedback/FeedbackModal';
import { generateAuditDocx } from '@/lib/evaluateReportDocx';
import { clusterLabel } from '@/lib/evaluateAudit';

const DISCLAIMER = 'This evaluation identifies potential coverage gaps and readability issues. Final compliance determination rests with the assessor, the RTO, and where applicable, the relevant regulatory authority (ASQA or VRQA). This report does not constitute a compliance ruling.';

export default function EvalScreen5Report({ units, cohortProfile, results, reportText, onReset, onSave, previousEvaluation, showComparison }) {
    const [downloading, setDownloading] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);

    const { sections = [], units: unitResults = [], overallVerdict = 'REQUIRES DEVELOPMENT', summaryStatement = '' } = results;
    const isAdequate = overallVerdict === 'ADEQUATE';
    const withinRange = sections.filter(s => s._readability && Math.abs((s._readability.fkgl || 0) - cohortProfile.targetFKGL) <= 1.5).length;
    const totalGaps = unitResults.reduce((sum, u) => sum + (u.gaps || []).length, 0);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const blob = await generateAuditDocx(units, results, cohortProfile, DISCLAIMER);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const fileBase = units.length === 1 ? units[0].code : `${units.length}-unit-cluster`;
            a.href = url;
            a.download = `${fileBase}-compliance-audit.docx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download error:', err);
            alert('Download failed: ' + err.message);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 56px' }}>
                <EvalProgress step={5} />

                {/* Combined summary header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    <div style={{
                        border: '1px solid #e5e7eb', borderLeftWidth: '4px',
                        borderLeftColor: isAdequate ? '#639922' : '#BA7517',
                        borderRadius: '8px', padding: '16px',
                    }}>
                        <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Overall verdict</p>
                        <p style={{ color: isAdequate ? '#3B6D11' : '#854F0B', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{overallVerdict}</p>
                        <p style={{ color: '#6b7280', fontSize: '12px' }}>{unitResults.length} unit{unitResults.length !== 1 ? 's' : ''} evaluated</p>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                        <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Readability</p>
                        <p style={{ color: '#0d2444', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{withinRange} / {sections.length}</p>
                        <p style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.4 }}>
                            {withinRange} of {sections.length} section{sections.length !== 1 ? 's' : ''} sit within the target reading level
                            {cohortProfile?.band ? ` (${cohortProfile.band})` : ''} for your learners.
                        </p>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                        <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Recommendations</p>
                        <p style={{ color: '#0d2444', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{totalGaps}</p>
                        <p style={{ color: '#6b7280', fontSize: '12px' }}>{totalGaps === 0 ? 'no gaps found' : 'gap' + (totalGaps !== 1 ? 's' : '') + ' to fix'}</p>
                    </div>
                </div>

                {/* Per-unit report blocks */}
                {unitResults.map(unit => (
                    <UnitReportBlock key={unit.unitCode} unit={unit} />
                ))}

                {/* Comparison section */}
                {showComparison && previousEvaluation?.richData && (
                    <ComparisonSection previous={previousEvaluation.richData} currentResults={results} />
                )}

                {/* Download buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        style={{
                            width: '100%', height: '48px',
                            backgroundColor: downloading ? '#e5e7eb' : '#0d2444',
                            color: downloading ? '#9ca3af' : '#ffffff',
                            borderRadius: '8px', border: 'none',
                            fontSize: '14px', fontWeight: 600,
                            cursor: downloading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}
                    >
                        <Download style={{ width: '16px', height: '16px' }} />
                        {downloading ? 'Preparing document...' : 'Download audit report (.docx)'}
                    </button>
                    <button
                        onClick={onSave}
                        style={{ width: '100%', height: '44px', backgroundColor: 'transparent', color: '#0d2444', borderRadius: '8px', border: '1px solid #0d2444', fontSize: '14px', cursor: 'pointer' }}
                    >
                        Save to library
                    </button>
                    <button
                        onClick={onReset}
                        style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', marginTop: '4px' }}
                    >
                        Evaluate another assessment
                    </button>
                </div>

                <p style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic', lineHeight: 1.6 }}>
                    {DISCLAIMER}
                </p>

                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <FeedbackButton onClick={() => setShowFeedback(true)} />
                </div>
            </div>

            {showFeedback && (
                <FeedbackModal flow="Evaluate" unitCode={clusterLabel(units)} onClose={() => setShowFeedback(false)} />
            )}
        </div>
    );
}