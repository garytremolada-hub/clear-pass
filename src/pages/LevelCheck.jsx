import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { downloadAsDocx } from '@/lib/downloadDocx';
import { ResultCard, BeforeAfterCards } from '@/components/chat/ReadabilityResultCard';
import { parseReadabilityResult, getBandForFkgl } from '@/lib/parseReadabilityResult';
import { useNavigate } from 'react-router-dom';
import RewriteModal from '@/components/levelcheck/RewriteModal';

const LS_KEY = 'clearpass_last_level_check';

export default function LevelCheck() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [fileName, setFileName] = useState(null);
    const [extractedText, setExtractedText] = useState(null); // stored for rewrite
    const [wordCount, setWordCount] = useState(null); // authoritative count from extracted text
    const [error, setError] = useState(null);
    const [showRewriteModal, setShowRewriteModal] = useState(false);
    const [rewriting, setRewriting] = useState(false);
    const [rewritingLabel, setRewritingLabel] = useState('');
    const [rewritingProgress, setRewritingProgress] = useState('');
    const [rewriteResult, setRewriteResult] = useState(null); // { before, after }
    const [rewrittenText, setRewrittenText] = useState(null);
    const inputRef = useRef(null);
    const secondaryInputRef = useRef(null);
    const navigate = useNavigate();

    // Load persisted result on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved) {
                const { result: r, fileName: n, extractedText: t, wordCount: wc } = JSON.parse(saved);
                if (r) { setResult(r); setFileName(n); setExtractedText(t || null); setWordCount(wc || null); }
            }
        } catch (_) {}
    }, []);

    const persistResult = (r, name, text, wc) => {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify({ result: r, fileName: name, extractedText: text, wordCount: wc }));
        } catch (_) {}
    };

    const clearPersisted = () => {
        try { localStorage.removeItem(LS_KEY); } catch (_) {}
    };

    const handleFile = (f, autoCheck = false) => {
        if (!f) return;
        setFile(f);
        setResult(null);
        setFileName(null);
        setExtractedText(null);
        setWordCount(null);
        setRewriteResult(null);
        setError(null);
        clearPersisted();
        if (autoCheck) {
            // Run check immediately after state settles
            setTimeout(() => runCheck(f), 0);
        }
    };

    const runCheck = async (f) => {
        setLoading(true);
        setError(null);
        try {
            const uploadResult = await base44.integrations.Core.UploadFile({ file: f });
            const fileUrl = uploadResult.file_url;
            const payload = { file_url: fileUrl, file_name: f.name, label: 'Level Check document' };
            const res = await base44.functions.invoke('extractDocumentText', payload);
            const text = res?.data?.text || '';
            if (!text) throw new Error('Could not extract text from this document.');
            const wc = text.trim().split(/\s+/).filter(w => w.length > 0).length;
            const prompt = `Score the following text for readability using FKGL and FRE formulas.

Return ONLY this exact format (no extra commentary):
FKGL: [number]
FRE: [number]
Words: [number]
Sentences: [number]
Syllables: [number]
Summary: [one sentence describing the readability level]
Benchmark: [nearest AQF level or year level]

Text to score:
${text.slice(0, 4000)}`;
            const raw = await base44.integrations.Core.InvokeLLM({ prompt });
            const parsed = parseReadabilityResult(raw);
            if (!parsed) throw new Error('Could not parse readability result.');
            setResult(parsed);
            setFileName(f.name);
            setExtractedText(text);
            setWordCount(wc);
            persistResult(parsed, f.name, text, wc);
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
    };

    const handleCheck = () => {
        if (!file) return;
        runCheck(file);
    };

    // Split text into ~2000-word chunks on paragraph boundaries
    const splitIntoChunks = (text, wordsPerChunk = 2000) => {
        const paragraphs = text.split(/\n\n+/);
        const chunks = [];
        let current = [];
        let wordCount = 0;
        for (const para of paragraphs) {
            const paraWords = para.split(/\s+/).length;
            if (wordCount + paraWords > wordsPerChunk && current.length > 0) {
                chunks.push(current.join('\n\n'));
                current = [para];
                wordCount = paraWords;
            } else {
                current.push(para);
                wordCount += paraWords;
            }
        }
        if (current.length > 0) chunks.push(current.join('\n\n'));
        return chunks;
    };

    // Rewrite modal confirm — chunk-based rewrite then score
    const handleRewriteConfirm = async ({ targetFkgl, learnerLabel, learnerDesc, support }) => {
        setShowRewriteModal(false);
        setRewriting(true);
        const currentGrade = result?.fkgl != null ? Math.round(result.fkgl) : '?';
        const targetGrade = targetFkgl != null ? Math.round(targetFkgl) : '?';
        setRewritingLabel(`Grade ${currentGrade} to Grade ${targetGrade}`);
        setRewritingProgress('');
        setRewriteResult(null);
        setRewrittenText(null);
        setError(null);

        const text = extractedText || '';
        if (!text) {
            setError('No document text found. Please re-upload the document.');
            setRewriting(false);
            return;
        }

        const gradeReduction = result?.fkgl != null && targetFkgl != null 
            ? (result.fkgl - targetFkgl).toFixed(1) 
            : 'significant';
        
        const buildPrompt = (chunkText) => `You are rewriting an assessment document to make it much simpler.

CURRENT READING LEVEL: FKGL ${result?.fkgl != null ? result.fkgl.toFixed(1) : 'unknown'}
TARGET READING LEVEL: FKGL ${targetFkgl}
YOU MUST REDUCE COMPLEXITY BY APPROXIMATELY ${gradeReduction} GRADE LEVELS.

This is a large reduction. You must make dramatic changes to sentence length and word complexity.

MANDATORY RULES — every single one:

SENTENCE LENGTH:
- Break every sentence longer than 12 words into two or more sentences
- Target average sentence length: 8-10 words per sentence
- No sentence may exceed 15 words
- Count words as you write each sentence. If over 12 words — split it.

WORD SIMPLIFICATION — replace every complex word:
demonstrate → show
implement → use / put in place
identify → find / name / list
organisational → workplace / your
utilise → use
facilitate → help / support
collaborate → work together
communicate → share / tell / discuss
requirements → rules / needs / steps
procedures → steps / process
documentation → forms / records
assessment → test / task / check
satisfactory → passed / good enough
undertake → do / complete
prior to → before
in accordance with → following / using / as per
in relation to → about / for
in order to → to
regarding → about
sufficient → enough
relevant → right / needed

STRUCTURE RULES:
- Keep all headings exactly as they are
- Keep all table structures intact
- Keep all form fields and blank lines
- Keep all S/NS decision fields
- Keep all assessor sections unchanged
- Keep all Performance Criteria text word for word — never simplify these
- Keep all Element names unchanged
- Keep unit codes unchanged

WHAT TO SIMPLIFY:
- All student-facing instructions
- All question text
- All scenario descriptions
- All overview paragraphs
- All submission instructions
- All declaration text

DO NOT simplify:
- Performance Criteria text
- Element names
- Knowledge Evidence text
- Performance Evidence text
- Assessment Conditions text
- Unit codes or unit titles

OUTPUT: Return only the rewritten text. No explanations. No commentary. No scoring. Just the document.

Document section to rewrite:
${chunkText}`;

        try {
            const chunks = splitIntoChunks(text, 2000);
            const rewrittenChunks = [];

            for (let i = 0; i < chunks.length; i++) {
                setRewritingProgress(`Rewriting section ${i + 1} of ${chunks.length}…`);
                const rewritten = await base44.integrations.Core.InvokeLLM({
                    prompt: buildPrompt(chunks[i]),
                    model: 'claude_sonnet_4_6',
                });
                if (!rewritten || rewritten.trim().length < 10) {
                    throw new Error(`Section ${i + 1} could not be rewritten. Please try again.`);
                }
                rewrittenChunks.push(rewritten.trim());
            }

            const fullRewritten = rewrittenChunks.join('\n\n');
            setRewrittenText(fullRewritten);

            // Score the rewritten text (first 4000 chars is representative)
            setRewritingProgress('Scoring rewritten document…');
            const scorePrompt = `Score the following text for readability using FKGL and FRE formulas.

Return ONLY this exact format (no extra commentary):
FKGL: [number]
FRE: [number]
Words: [number]
Sentences: [number]
Syllables: [number]
Summary: [one sentence describing the readability level]
Benchmark: [nearest AQF level or year level]

Text to score:
${fullRewritten.slice(0, 4000)}`;

            const scoreRaw = await base44.integrations.Core.InvokeLLM({ prompt: scorePrompt });
            const afterResult = parseReadabilityResult(scoreRaw);
            if (!afterResult) throw new Error('Could not score the rewritten document.');

            setRewriteResult({ before: result, after: afterResult });
        } catch (err) {
            setError(err.message || 'Rewrite failed. Please try again.');
        } finally {
            setRewriting(false);
            setRewritingProgress('');
        }
    };

    const handleDownloadRewrite = () => {
        if (!rewrittenText) return;
        const baseName = (fileName || 'document').replace(/\.(docx?|pdf)$/i, '');
        downloadAsDocx(rewrittenText, `${baseName}-rewritten`);
    };

    const handleBuild = () => {
        const band = getBandForFkgl(result?.fkgl);
        const bandName = band?.name || 'this level';
        const fkglStr = result?.fkgl != null ? result.fkgl.toFixed(1) : '—';
        navigate('/chat', {
            state: {
                quickPrompt: `I want to build an assessment at ${bandName} level (FKGL ${fkglStr}). Please ask me for the UoC.`,
                cohort: true,
            },
        });
    };

    const handleSave = () => {
        if (!result) return;
        const band = getBandForFkgl(result?.fkgl);
        navigate('/library', {
            state: {
                prefill: {
                    title: fileName || 'Level Check result',
                    task_type: 'score',
                    fkgl: result.fkgl,
                    fre: result.fre,
                    band: band?.name,
                    original_text: fileName || '',
                },
            },
        });
    };

    const handleCheckAnother = () => {
        setResult(null);
        setFile(null);
        setFileName(null);
        setExtractedText(null);
        setRewriteResult(null);
        clearPersisted();
    };

    const band = getBandForFkgl(result?.fkgl);
    const bandName = band?.name || '—';
    const fkglStr = result?.fkgl != null ? result.fkgl.toFixed(1) : '—';

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            {/* Header */}
            <div className="flex items-center px-6 py-4" style={{ backgroundColor: '#0d2444', borderBottom: '1px solid #162d50' }}>
                <span style={{ color: '#c9a84c', letterSpacing: '2px', fontSize: '13px', fontWeight: 500, marginRight: '24px' }}>
                    CLEARPASS
                </span>
                <h1 className="text-base font-medium" style={{ color: '#ffffff' }}>Level Check</h1>
            </div>

            {/* Main content */}
            <div className="mx-auto px-6 py-10 space-y-8" style={{ maxWidth: '600px' }}>

                {/* Heading */}
                <div className="space-y-1.5">
                    <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, lineHeight: 1.3 }}>
                        Where does your document sit?
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6 }}>
                        Upload any document and we'll show you its readability level on the scale — instantly.
                    </p>
                </div>

                {/* Upload area */}
                {!result && (
                    <div>
                        <div
                            onDrop={handleDrop}
                            onDragOver={e => e.preventDefault()}
                            onClick={() => inputRef.current?.click()}
                            className="cursor-pointer transition-colors"
                            style={{
                                border: '2px dashed #e5e7eb',
                                borderRadius: '12px',
                                padding: '40px 24px',
                                backgroundColor: '#f9fafb',
                                textAlign: 'center',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".pdf,.docx"
                                className="hidden"
                                onChange={e => handleFile(e.target.files?.[0])}
                            />
                            {file ? (
                                <div className="flex flex-col items-center gap-2">
                                    <CheckCircle className="h-8 w-8" style={{ color: '#22c55e' }} />
                                    <p className="text-sm font-medium" style={{ color: '#0d2444' }}>{file.name}</p>
                                    <p className="text-xs" style={{ color: '#6b7280' }}>Click to change file</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="h-8 w-8" style={{ color: '#c9a84c' }} />
                                    <p className="text-sm" style={{ color: '#6b7280' }}>Drop your document here or click to browse</p>
                                    <p className="text-xs" style={{ color: '#9ca3af' }}>Accepts .pdf and .docx files</p>
                                </div>
                            )}
                        </div>

                        {file && !loading && (
                            <button
                                onClick={handleCheck}
                                className="w-full mt-4 py-3 px-6 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                                style={{ backgroundColor: '#c9a84c', color: '#0d2444' }}
                            >
                                Check the level
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        )}

                        {loading && (
                            <div className="w-full mt-4 py-3 px-6 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                                style={{ backgroundColor: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                                <div className="h-4 w-4 border-2 border-gray-300 border-t-[#c9a84c] rounded-full animate-spin" />
                                Analysing document…
                            </div>
                        )}

                        {error && (
                            <p className="mt-3 text-sm text-center" style={{ color: '#ef4444' }}>{error}</p>
                        )}
                    </div>
                )}

                {/* Sticky result banner */}
                {result && fileName && (
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-lg" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
                        <span className="text-sm" style={{ color: '#6b7280' }}>
                            Showing result for — <span className="font-medium" style={{ color: '#0d2444' }}>{fileName}</span>
                        </span>
                        <button
                            onClick={handleCheckAnother}
                            style={{
                                marginLeft: '12px',
                                whiteSpace: 'nowrap',
                                fontSize: '12px',
                                fontWeight: 500,
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #c9a84c',
                                color: '#c9a84c',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                            }}
                        >
                            Check another document
                        </button>
                    </div>
                )}

                {/* Rewrite in progress */}
                {rewriting && (
                    <div className="flex flex-col items-center justify-center gap-3 py-10">
                        <div className="h-6 w-6 border-2 border-gray-200 border-t-[#c9a84c] rounded-full animate-spin" />
                        <p style={{ color: '#0d2444', fontSize: '14px' }}>
                            Rewriting to <span className="font-medium">{rewritingLabel}</span> level…
                        </p>
                        {rewritingProgress && (
                            <p style={{ color: '#6b7280', fontSize: '13px' }}>{rewritingProgress}</p>
                        )}
                    </div>
                )}

                {/* Before/After rewrite result */}
                {rewriteResult && !rewriting && (
                    <div className="space-y-4">
                        <BeforeAfterCards
                            before={rewriteResult.before}
                            after={rewriteResult.after}
                            originalWordCount={wordCount}
                            onRewrite={() => setShowRewriteModal(true)}
                            onSaveToLibrary={handleSave}
                        />

                        {/* Download rewritten doc */}
                        <button
                            onClick={handleDownloadRewrite}
                            className="w-full py-3 px-6 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                            style={{ backgroundColor: '#c9a84c', color: '#0d2444' }}
                        >
                            Download rewritten document →
                        </button>

                        {/* Build at this level link */}
                        <button
                            onClick={handleBuild}
                            className="w-full text-sm font-medium text-center"
                            style={{ background: 'none', border: 'none', color: '#0d2444', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Build an assessment at this level →
                        </button>
                    </div>
                )}

                {/* Original result (only show when no rewrite yet) */}
                {result && !rewriteResult && !rewriting && (
                    <div className="space-y-4">
                        <ResultCard
                            result={result}
                            wordCount={wordCount}
                            onRewrite={() => setShowRewriteModal(true)}
                            onSaveToLibrary={handleSave}
                        />

                        <button
                            onClick={handleBuild}
                            className="w-full py-3 px-6 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                            style={{ backgroundColor: '#c9a84c', color: '#0d2444' }}
                        >
                            Build an assessment for this level
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {error && result && (
                    <p className="text-sm text-center" style={{ color: '#ef4444' }}>{error}</p>
                )}

                {/* Secondary upload area — always visible when a result is showing */}
                {result && !rewriting && (
                    <div>
                        <input
                            ref={secondaryInputRef}
                            type="file"
                            accept=".pdf,.docx"
                            className="hidden"
                            onChange={e => handleFile(e.target.files?.[0], true)}
                        />
                        <div
                            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0], true); }}
                            onDragOver={e => e.preventDefault()}
                            onClick={() => secondaryInputRef.current?.click()}
                            className="cursor-pointer transition-colors"
                            style={{
                                border: '2px dashed #e5e7eb',
                                borderRadius: '8px',
                                padding: '16px',
                                marginTop: '16px',
                                backgroundColor: '#f9fafb',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                        >
                            <Upload className="h-5 w-5" style={{ color: '#c9a84c' }} />
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                                Drop a new document here or click to browse
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Rewrite modal */}
            {showRewriteModal && (
                <RewriteModal
                    bandName={bandName}
                    fkglStr={fkglStr}
                    onConfirm={handleRewriteConfirm}
                    onCancel={() => setShowRewriteModal(false)}
                />
            )}
        </div>
    );
}