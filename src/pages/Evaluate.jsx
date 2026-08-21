import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import EvalScreen1Units from '@/components/evaluate/EvalScreen1Units';
import EvalScreen2Upload from '@/components/evaluate/EvalScreen2Upload';
import EvalScreen3Learner from '@/components/evaluate/EvalScreen3Learner';
import EvalScreen4Progress from '@/components/evaluate/EvalScreen4Progress';
import EvalScreen5Report from '@/components/evaluate/EvalScreen5Report';
import {
    runUnitAudit, extractSections, collectGaps, runGapRecommendations, generateReportText,
    clusterKey,
} from '@/lib/evaluateAudit';

export default function Evaluate() {
    const navigate = useNavigate();
    const [screen, setScreen] = useState(1);
    const [units, setUnits] = useState([]);
    const [assessmentDoc, setAssessmentDoc] = useState(null);
    const [cohortProfile, setCohortProfile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [stageLabel, setStageLabel] = useState('Starting...');
    const [evalError, setEvalError] = useState(null);
    const [results, setResults] = useState({});
    const [reportText, setReportText] = useState('');
    const [previousEvaluation, setPreviousEvaluation] = useState(null);
    const [showComparison, setShowComparison] = useState(false);

    const handleScreen1Confirm = async (selectedUnits) => {
        setUnits(selectedUnits);
        const key = clusterKey(selectedUnits);
        try {
            const library = await base44.entities.WorkLibraryItem.filter({ task_type: 'evaluate', unit_code: key });
            if (library && library.length > 0) {
                const sorted = library.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
                const prev = sorted[0];
                let richData = null;
                try { richData = prev.notes ? JSON.parse(prev.notes) : null; } catch (e) { /* no rich data */ }
                setPreviousEvaluation({ ...prev, richData });
            } else {
                setPreviousEvaluation(null);
            }
        } catch (e) {
            setPreviousEvaluation(null);
        }
        setShowComparison(false);
        setScreen(2);
    };

    const handleScreen2Confirm = (doc) => {
        setAssessmentDoc(doc);
        setScreen(3);
    };

    const handleScreen3Confirm = async (cohort) => {
        setCohortProfile(cohort);
        setProgress(5);
        setStageLabel('Reading your assessment...');
        setEvalError(null);
        setScreen(4);

        const rawText = assessmentDoc.text;
        const assessableText = assessmentDoc.assessableText || rawText;

        try {
            // Step 1: Extract sections (once, full text)
            setProgress(8);
            setStageLabel('Identifying sections...');
            const sections = await extractSections(assessableText, assessmentDoc.wordCount);

            // Step 2: Per-unit audit
            const unitResults = [];
            for (let i = 0; i < units.length; i++) {
                const unit = units[i];
                const audit = await runUnitAudit(unit, i, units.length, assessableText, (pct, label) => {
                    if (label) setStageLabel(label);
                    if (pct) setProgress(pct);
                });
                unitResults.push({
                    unitCode: unit.code,
                    unitTitle: unit.title,
                    peResults: audit.peResults,
                    keResults: audit.keResults,
                    elementsResults: audit.elementsResults,
                    gaps: [],
                    unitVerdict: 'REQUIRES DEVELOPMENT',
                });
            }

            // Step 3: Collect gaps and run recommendations (chunked)
            setProgress(82);
            setStageLabel('Writing recommendations...');
            const allGaps = collectGaps(unitResults);
            const gapRecs = await runGapRecommendations(allGaps);

            // Assign gaps back to units and compute unit verdicts
            for (const unit of unitResults) {
                const unitGaps = gapRecs.filter(g => g.unitCode === unit.unitCode);
                unit.gaps = unitGaps;
                const hasGaps = unit.peResults.some(r => r.status !== 'COVERED')
                    || unit.keResults.some(r => r.status !== 'COVERED')
                    || unit.elementsResults.flatMap(e => e.performanceCriteria || []).some(pc => pc.status !== 'MAPPED');
                unit.unitVerdict = hasGaps ? 'REQUIRES DEVELOPMENT' : 'ADEQUATE';
            }

            const overallVerdict = unitResults.every(u => u.unitVerdict === 'ADEQUATE') ? 'ADEQUATE' : 'REQUIRES DEVELOPMENT';
            const summaryStatement = overallVerdict === 'ADEQUATE'
                ? `All ${units.length} unit${units.length !== 1 ? 's' : ''} in this cluster are adequately covered by the assessment.`
                : `${unitResults.filter(u => u.unitVerdict === 'REQUIRES DEVELOPMENT').length} of ${units.length} unit${units.length !== 1 ? 's' : ''} require development to achieve full coverage.`;

            // Step 4: Generate report text
            setProgress(95);
            setStageLabel('Writing report...');
            const report = await generateReportText(units, { sections, units: unitResults, overallVerdict, summaryStatement }, cohort);
            setReportText(report);

            setResults({ sections, units: unitResults, overallVerdict, summaryStatement });
            setProgress(100);
            setStageLabel('Done');
            setScreen(5);
        } catch (e) {
            console.error('Evaluation failed:', e);
            setEvalError('One evaluation step could not complete. The report may be incomplete. Try again or check your document.');
        }
    };

    const handleSave = async () => {
        const key = clusterKey(units);
        const richData = {
            verdict: results.overallVerdict,
            savedAt: new Date().toISOString(),
            cohort: cohortProfile,
            units: (results.units || []).map(u => ({
                unitCode: u.unitCode,
                unitTitle: u.unitTitle,
                unitVerdict: u.unitVerdict,
                ke: {
                    total: u.keResults.length,
                    covered: u.keResults.filter(r => r.status === 'COVERED').length,
                    partial: u.keResults.filter(r => r.status === 'PARTIALLY COVERED').length,
                    notCovered: u.keResults.filter(r => r.status !== 'COVERED' && r.status !== 'PARTIALLY COVERED').length,
                    items: u.keResults.map(r => ({ requirement: r.requirement, status: r.status })),
                },
                pe: {
                    total: u.peResults.length,
                    covered: u.peResults.filter(r => r.status === 'COVERED').length,
                    partial: u.peResults.filter(r => r.status === 'PARTIALLY COVERED').length,
                    notCovered: u.peResults.filter(r => r.status !== 'COVERED' && r.status !== 'PARTIALLY COVERED').length,
                    items: u.peResults.map(r => ({ requirement: r.requirement, status: r.status })),
                },
                pc: {
                    total: u.elementsResults.flatMap(e => e.performanceCriteria || []).length,
                    mapped: u.elementsResults.flatMap(e => e.performanceCriteria || []).filter(p => p.status === 'MAPPED').length,
                    partial: u.elementsResults.flatMap(e => e.performanceCriteria || []).filter(p => p.status === 'PARTIALLY MAPPED').length,
                    notMapped: u.elementsResults.flatMap(e => e.performanceCriteria || []).filter(p => p.status !== 'MAPPED' && p.status !== 'PARTIALLY MAPPED').length,
                    items: u.elementsResults.flatMap(e => e.performanceCriteria || []).map(p => ({ ref: p.ref, text: p.text, status: p.status })),
                },
                gapCount: u.gaps.length,
            })),
        };
        try {
            await base44.entities.WorkLibraryItem.create({
                title: `Evaluate: ${units.map(u => u.code).join(', ')}`,
                task_type: 'evaluate',
                unit_code: key,
                unit_title: units.map(u => u.title).join(', '),
                aqf_level: cohortProfile?.band || '',
                output_text: reportText,
                notes: JSON.stringify(richData),
            });
            navigate('/library');
        } catch (err) {
            console.error('Save error:', err);
            alert('Failed to save to library.');
        }
    };

    const handleReset = () => {
        setScreen(1);
        setUnits([]);
        setAssessmentDoc(null);
        setCohortProfile(null);
        setResults({});
        setReportText('');
        setEvalError(null);
        setProgress(0);
        setStageLabel('Starting...');
        setPreviousEvaluation(null);
        setShowComparison(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#ffffff' }}>
            <div className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={{ backgroundColor: '#0d2444' }}>
                <span style={{ color: '#c9a84c', letterSpacing: '2px', fontSize: '13px', fontWeight: 500 }}>CLEARPASS</span>
                <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 400 }}>Evaluate Assessment</span>
                <div style={{ width: '80px' }} />
            </div>

            {screen === 1 && <EvalScreen1Units onConfirm={handleScreen1Confirm} />}
            {screen === 2 && (
                <EvalScreen2Upload
                    units={units}
                    onBack={() => setScreen(1)}
                    onConfirm={handleScreen2Confirm}
                    previousEvaluation={previousEvaluation}
                    showComparison={showComparison}
                    onSetShowComparison={setShowComparison}
                />
            )}
            {screen === 3 && <EvalScreen3Learner units={units} onBack={() => setScreen(2)} onConfirm={handleScreen3Confirm} />}
            {screen === 4 && <EvalScreen4Progress progress={progress} stageLabel={stageLabel} evalError={evalError} />}
            {screen === 5 && (
                <EvalScreen5Report
                    units={units}
                    cohortProfile={cohortProfile}
                    results={results}
                    reportText={reportText}
                    onReset={handleReset}
                    onSave={handleSave}
                    previousEvaluation={previousEvaluation}
                    showComparison={showComparison}
                />
            )}
        </div>
    );
}