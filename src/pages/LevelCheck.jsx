import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, ArrowRight } from 'lucide-react';
import FeedbackButton from '@/components/feedback/FeedbackButton';
import FeedbackModal from '@/components/feedback/FeedbackModal';
import ThumbsRating from '@/components/feedback/ThumbsRating';
import { base44 } from '@/api/base44Client';
import { ResultCard, BeforeAfterCards } from '@/components/chat/ReadabilityResultCard';
import { getBandForFkgl } from '@/lib/parseReadabilityResult';
import { calculateReadability } from '@/lib/calculateReadability';
import { useNavigate } from 'react-router-dom';
import RewriteModal from '@/components/levelcheck/RewriteModal';

// ── Paragraph helpers (Step 2 from spec) ─────────────────────────────────────

function isProtected(text) {
    const patterns = [
        /^\d+\.\d+/,
        /^[A-Z]{3,}\d{3,}/,
        /S\s*\/\s*N[Ss]/,
        /[Ss]atisfactory/,
        /[Nn]ot [Yy]et [Ss]atisfactory/,
        /[Pp]erformance [Ee]vidence/,
        /[Kk]nowledge [Ee]vidence/,
        /[Aa]ssessment [Cc]onditions/,
        /[Ff]oundation [Ss]kills/,
        /^Element$/i,
        /^Performance Criteria$/i,
        /[Ii] declare/,
        /□/,
    ];
    return patterns.some(p => p.test(text));
}

function extractAndNumberParagraphs(extractedText) {
    const lines = extractedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    return lines.map((text, index) => ({ id: index + 1, text, protected: isProtected(text) }));
}

function validateRewriteJson(jsonString) {
    const clean = jsonString.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const items = JSON.parse(clean);
    if (!Array.isArray(items)) throw new Error('AI response was not a list.');
    items.forEach((item, i) => {
        if (typeof item.id !== 'number') throw new Error(`Item ${i} missing id`);
        if (typeof item.rewritten !== 'string') throw new Error(`Item ${i} missing rewritten`);
    });
    return items;
}

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
    const [showFeedback, setShowFeedback] = useState(false);
    const [rewriting, setRewriting] = useState(false);
    const [rewritingLabel, setRewritingLabel] = useState('');
    const [rewritingProgress, setRewritingProgress] = useState('');
    const [rewriteResult, setRewriteResult] = useState(null); // { before, after }
    const [rewrittenText, setRewrittenText] = useState(null);
    const [originalFileBase64, setOriginalFileBase64] = useState(null);
    const [numberedParagraphs, setNumberedParagraphs] = useState(null); // [{id, text, protected}]
    const [aiRewriteJson, setAiRewriteJson] = useState(null); // raw JSON string from AI
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
        setOriginalFileBase64(null);
        setNumberedParagraphs(null);
        setAiRewriteJson(null);
        setError(null);
        clearPersisted();
        
        // Store original file as base64
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result.split(',')[1];
            setOriginalFileBase64(base64);
        };
        reader.readAsDataURL(f);
        
        if (autoCheck) {
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
            
            // Use JavaScript calculator instead of AI
            const scoreResult = calculateReadability(text);
            if (!scoreResult) throw new Error('Could not calculate readability.');
            
            // Build result object matching the old AI-parsed format
            const band = getBandForFkgl(scoreResult.fkgl);
            const bandDescriptions = {
                'Very Easy':         'suitable for early primary school readers',
                'Easy':              'suitable for upper primary school readers',
                'Fairly Easy':       'suitable for junior secondary students',
                'Cert I/II · Yr 10': 'suitable for Year 10 or foundation learners',
                'Cert III/IV':       'suitable for most apprentices and working adults',
                'Diploma':           'suitable for diploma and higher VET learners',
                'Degree / Grad Dip': 'suitable for undergraduate students',
                'Very Difficult':    'suitable for a postgraduate or specialist professional audience',
            };
            const desc = band ? bandDescriptions[band.name] : null;
            const summary = band && desc
                ? `This document reads at ${band.name} level. It is ${desc}.`
                : `This document is at ${band?.name || 'an unknown'} reading level.`;
            
            const parsed = {
                fkgl: scoreResult.fkgl,
                fre: scoreResult.fre,
                words: scoreResult.wordCount,
                sentences: scoreResult.sentenceCount,
                syllables: scoreResult.syllables,
                summary,
                benchmark: null,
                trafficLight: null,
            };
            
            const paragraphs = extractAndNumberParagraphs(text);
            setNumberedParagraphs(paragraphs);
            setResult(parsed);
            setFileName(f.name);
            setExtractedText(text);
            setWordCount(scoreResult.wordCount);
            persistResult(parsed, f.name, text, scoreResult.wordCount);
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

    // Rewrite modal confirm — paragraph-based rewrite (Steps 3–5 from spec)
    const handleRewriteConfirm = async ({ targetFkgl, learnerLabel, learnerDesc, support }) => {
        setShowRewriteModal(false);
        setRewriting(true);
        const currentBand = getBandForFkgl(result?.fkgl)?.name || '?';
        const targetBandObj = targetFkgl != null ? getBandForFkgl(targetFkgl) : null;
        const targetBandName = targetBandObj?.name || '?';
        setRewritingLabel(`${currentBand} to ${targetBandName}`);
        setRewritingProgress('');
        setRewriteResult(null);
        setRewrittenText(null);
        setAiRewriteJson(null);
        setError(null);

        const allParagraphs = numberedParagraphs || extractAndNumberParagraphs(extractedText || '');
        if (!allParagraphs.length) {
            setError('No document text found. Please re-upload the document.');
            setRewriting(false);
            return;
        }

        // Filter to only unprotected paragraphs with meaningful content
        const toRewrite = allParagraphs.filter(p => !p.protected && p.text.length > 20);
        const paragraphsText = toRewrite.map(p => `${p.id}. ${p.text}`).join('\n');

        // Split into batches of ~150 paragraphs to stay within LLM context
        const BATCH_SIZE = 150;
        const batches = [];
        for (let i = 0; i < toRewrite.length; i += BATCH_SIZE) {
            batches.push(toRewrite.slice(i, i + BATCH_SIZE));
        }

        const buildPrompt = (batchParagraphs) => {
            const batchText = batchParagraphs.map(p => `${p.id}. ${p.text}`).join('\n');
            return `Rewrite these paragraphs to FKGL ${targetFkgl}.
Learner type: ${learnerDesc}
Support needs: ${support}

Rules:
- Return a JSON array only. No explanation. No commentary.
- Each element must have: "id" (original number as integer), "rewritten" (new text as string)
- Shorten sentences to maximum 12 words each
- Replace complex words with simpler ones:
  demonstrate → show
  implement → use
  identify → find or name
  organisational → workplace
  utilise → use
  facilitate → help
  collaborate → work together
  communicate → share or tell
  requirements → rules or needs
  procedures → steps
  documentation → records
  undertake → do or complete
  prior to → before
  in accordance with → following
  in order to → to
- Keep all numbers, dates, and proper nouns unchanged
- Keep all question numbers unchanged (Q1, Q2 etc)
- Do NOT add information that was not in the original
- Do NOT remove information from the original

Return ONLY valid JSON. No markdown. No code fences.
Start your response with [ and end with ]

Paragraphs to rewrite:
${batchText}`;
        };

        try {
            const allRewrittenItems = [];

            for (let i = 0; i < batches.length; i++) {
                setRewritingProgress(`Rewriting section ${i + 1} of ${batches.length}…`);
                const raw = await base44.integrations.Core.InvokeLLM({
                    prompt: buildPrompt(batches[i]),
                    model: 'claude_sonnet_4_6',
                });
                const items = validateRewriteJson(raw);
                allRewrittenItems.push(...items);
            }

            const jsonString = JSON.stringify(allRewrittenItems);
            setAiRewriteJson(jsonString);

            // Build a plain-text version for scoring (merge rewrites into original order)
            const rewriteMap = {};
            allRewrittenItems.forEach(item => { rewriteMap[item.id] = item.rewritten; });
            const fullRewritten = allParagraphs
                .map(p => rewriteMap[p.id] || p.text)
                .join('\n');
            setRewrittenText(fullRewritten);

            // Score using JS calculator
            setRewritingProgress('Scoring rewritten document…');
            const afterScore = calculateReadability(fullRewritten);
            if (!afterScore) throw new Error('Could not score the rewritten document.');

            const afterBand = getBandForFkgl(afterScore.fkgl);
            const afterResult = {
                fkgl: afterScore.fkgl,
                fre: afterScore.fre,
                words: afterScore.wordCount,
                sentences: afterScore.sentenceCount,
                syllables: afterScore.syllables,
                summary: `This document reads at ${afterBand?.name || 'an unknown'} level.`,
                benchmark: null,
                trafficLight: null,
            };

            setRewriteResult({ before: result, after: afterResult });
        } catch (err) {
            setError(err.message || 'Rewrite failed. Please try again.');
        } finally {
            setRewriting(false);
            setRewritingProgress('');
        }
    };

    // Download: formatted student-booklet-style .docx
    const handleDownloadRewrite = async () => {
        if (!rewrittenText || !fileName) return;
        try {
            setRewritingProgress('Preparing download…');

            if (!originalFileBase64) {
                throw new Error('Original document not found. Please re-upload and run the rewrite again.');
            }
            const paragraphs = numberedParagraphs || extractAndNumberParagraphs(extractedText || '');
            const res = await base44.functions.invoke('rewriteDocumentInPlace', {
                file_base64: originalFileBase64,
                original_paragraphs: paragraphs,
                rewrite_json: aiRewriteJson,
                filename: fileName,
            });
            if (res?.data?.error) throw new Error(res.data.error);
            const outB64 = res.data.file_base64;
            const bytes = atob(outB64);
            const buf = new Uint8Array(bytes.length);
            for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const baseName = fileName.replace(/\.[^.]+$/, '');
            a.download = `${baseName}-rewritten.docx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError('Download failed: ' + err.message);
        } finally {
            setRewritingProgress('');
        }
    };

    const handleDownloadOriginal = () => {
        if (!originalFileBase64 || !fileName) return;
        const bytes = atob(originalFileBase64);
        const buf = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
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

    const handleSave = async () => {
        if (!result) return;
        const band = getBandForFkgl(result?.fkgl);
        try {
            if (rewriteResult) {
                const afterBand = getBandForFkgl(rewriteResult.after?.fkgl);
                await base44.entities.WorkLibraryItem.create({
                    title: fileName || 'Rewritten document',
                    task_type: 'rewrite',
                    fkgl: rewriteResult.after?.fkgl,
                    fre: rewriteResult.after?.fre,
                    band: afterBand?.name,
                    original_text: extractedText || '',
                    output_text: rewrittenText || '',
                });
            } else {
                await base44.entities.WorkLibraryItem.create({
                    title: fileName || 'Level Check result',
                    task_type: 'score',
                    fkgl: result.fkgl,
                    fre: result.fre,
                    band: band?.name,
                    original_text: extractedText || '',
                });
            }
            navigate('/library');
        } catch (err) {
            setError('Could not save to library. Please try again.');
        }
    };

    const handleCheckAnother = () => {
        setResult(null);
        setFile(null);
        setFileName(null);
        setExtractedText(null);
        setRewriteResult(null);
        setNumberedParagraphs(null);
        setAiRewriteJson(null);
        setRewrittenText(null);
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
            <div className="mx-auto px-14 py-10 space-y-8" style={{ maxWidth: '1060px' }}>

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
                            Showing result for: <span className="font-medium" style={{ color: '#0d2444' }}>{fileName}</span>
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

                        {/* Download buttons */}
                        <div className="space-y-2">
                            <button
                                onClick={handleDownloadRewrite}
                                disabled={!rewrittenText}
                                className="w-full py-3 px-6 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ backgroundColor: '#c9a84c', color: '#0d2444' }}
                            >
                                Download rewritten document (.docx) →
                            </button>
                            <p style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic', lineHeight: 1.5, textAlign: 'center', margin: '4px 0 0' }}>
                                Your original layout, tables and formatting are kept, with the language simplified throughout.
                                Apply your RTO template before submitting.
                            </p>
                            <button
                                onClick={handleDownloadOriginal}
                                className="w-full py-3 px-6 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                                style={{ border: '1px solid #0d2444', color: '#0d2444', backgroundColor: 'transparent' }}
                            >
                                Download original document
                            </button>
                        </div>

                        {/* Build at this level link */}
                        <button
                            onClick={handleBuild}
                            className="w-full text-sm font-medium text-center"
                            style={{ background: 'none', border: 'none', color: '#0d2444', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Build an assessment at this level →
                        </button>
                        <ThumbsRating flow="Level Check" context="Rewrite result" />
                        <div style={{ textAlign: 'center', marginTop: '4px' }}>
                            <FeedbackButton onClick={() => setShowFeedback(true)} />
                        </div>
                    </div>
                )}

                {/* Original result (only show when no rewrite yet) */}
                {result && !rewriteResult && !rewriting && (
                    <div className="space-y-4">
                        <button
                            onClick={handleBuild}
                            className="w-full py-3 px-6 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                            style={{ backgroundColor: '#c9a84c', color: '#0d2444' }}
                        >
                            Build an assessment for this level
                            <ArrowRight className="h-4 w-4" />
                        </button>

                        <ResultCard
                            result={result}
                            wordCount={wordCount}
                            onRewrite={() => setShowRewriteModal(true)}
                            onSaveToLibrary={handleSave}
                        />

                        <ThumbsRating flow="Level Check" context="Readability score" />
                        <div style={{ textAlign: 'center', marginTop: '4px' }}>
                            <FeedbackButton onClick={() => setShowFeedback(true)} />
                        </div>
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

            {/* Feedback modal */}
            {showFeedback && (
                <FeedbackModal flow="Level Check" unitCode={null} onClose={() => setShowFeedback(false)} />
            )}

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