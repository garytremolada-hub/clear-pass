import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Upload, CheckCircle, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Extracts text from a single file via backend
async function extractText(file) {
    const uploadResult = await base44.integrations.Core.UploadFile({ file });
    const res = await base44.functions.invoke('extractDocumentText', {
        file_url: uploadResult.file_url,
        file_name: file.name,
        label: file.name,
    });
    return res?.data?.text || '';
}

// ── Single file slot ──────────────────────────────────────────────────────────

function FileSlot({ label, file, onFileChange, onRemove, loading }) {
    const inputRef = useRef(null);

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) onFileChange(f);
    };

    return (
        <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => !file && inputRef.current?.click()}
            className="relative rounded-lg transition-colors"
            style={{
                border: file ? '1.5px solid #22c55e' : '1.5px dashed #d1d5db',
                backgroundColor: file ? '#f0fdf4' : '#f9fafb',
                padding: '12px',
                cursor: file ? 'default' : 'pointer',
                minHeight: '64px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
            }}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={e => onFileChange(e.target.files?.[0])}
            />
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" style={{ color: '#c9a84c' }} />
            ) : file ? (
                <CheckCircle className="h-4 w-4 shrink-0" style={{ color: '#22c55e' }} />
            ) : (
                <Upload className="h-4 w-4 shrink-0" style={{ color: '#9ca3af' }} />
            )}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: '#374151' }}>
                    {file ? file.name : label}
                </p>
                {!file && (
                    <p className="text-[11px]" style={{ color: '#9ca3af' }}>
                        Drop .pdf or .docx, or click to browse
                    </p>
                )}
            </div>
            {file && !loading && (
                <button
                    onClick={e => { e.stopPropagation(); onRemove(); }}
                    className="shrink-0 hover:opacity-70 transition-opacity"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                >
                    <X className="h-3.5 w-3.5" style={{ color: '#6b7280' }} />
                </button>
            )}
        </div>
    );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function DocumentUploadPanel({ mode, onSubmit, onCancel, disabled }) {
    // For evaluate: { uoc: File, assessment: File }
    // For build: array of File (up to 4)
    // For score/rewrite: single File
    const [uocFile, setUocFile] = useState(null);
    const [assessmentFile, setAssessmentFile] = useState(null);
    const [singleFile, setSingleFile] = useState(null);
    const [uocFiles, setUocFiles] = useState([null]); // for build mode
    const [loading, setLoading] = useState(false);
    const [loadingIndex, setLoadingIndex] = useState(null);

    const isReady = () => {
        if (mode === 'evaluate') return !!uocFile && !!assessmentFile;
        if (mode === 'build') return uocFiles.some(f => !!f);
        return !!singleFile;
    };

    const handleSubmit = async () => {
        if (!isReady() || loading || disabled) return;
        setLoading(true);

        try {
            if (mode === 'evaluate') {
                setLoadingIndex('uoc');
                const uocText = await extractText(uocFile);
                setLoadingIndex('assessment');
                const assessmentText = await extractText(assessmentFile);
                setLoadingIndex(null);
                onSubmit({
                    uoc: { text: uocText, name: uocFile.name },
                    assessment: { text: assessmentText, name: assessmentFile.name },
                });
            } else if (mode === 'build') {
                const filled = uocFiles.filter(Boolean);
                const extracted = {};
                for (let i = 0; i < filled.length; i++) {
                    setLoadingIndex(i);
                    const text = await extractText(filled[i]);
                    const key = i === 0 ? 'uoc' : `uoc${i + 1}`;
                    extracted[key] = { text, name: filled[i].name };
                }
                setLoadingIndex(null);
                onSubmit(extracted);
            } else {
                setLoadingIndex(0);
                const text = await extractText(singleFile);
                setLoadingIndex(null);
                onSubmit({ doc: { text, name: singleFile.name } });
            }
        } catch (err) {
            setLoading(false);
            setLoadingIndex(null);
        }
    };

    const addUocSlot = () => {
        if (uocFiles.length < 4) setUocFiles(prev => [...prev, null]);
    };

    const setUocAt = (i, file) => {
        setUocFiles(prev => prev.map((f, idx) => idx === i ? file : f));
    };

    const removeUocAt = (i) => {
        if (uocFiles.length === 1) {
            setUocFiles([null]);
        } else {
            setUocFiles(prev => prev.filter((_, idx) => idx !== i));
        }
    };

    const modeLabels = {
        score: 'Upload document to score',
        rewrite: 'Upload document to rewrite',
        evaluate: 'Upload documents to evaluate',
        build: 'Upload Unit(s) of Competency to build from',
    };

    return (
        <div className="rounded-xl border bg-white p-4 max-w-2xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: '#0d2444' }}>
                    {modeLabels[mode] || 'Upload document'}
                </p>
                <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#9ca3af' }}>
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Score / Rewrite — single file */}
            {(mode === 'score' || mode === 'rewrite') && (
                <FileSlot
                    label="Drop .pdf or .docx here"
                    file={singleFile}
                    onFileChange={setSingleFile}
                    onRemove={() => setSingleFile(null)}
                    loading={loading && loadingIndex === 0}
                />
            )}

            {/* Evaluate — two files */}
            {mode === 'evaluate' && (
                <div className="space-y-2">
                    <FileSlot
                        label="Unit of Competency (.pdf or .docx)"
                        file={uocFile}
                        onFileChange={setUocFile}
                        onRemove={() => setUocFile(null)}
                        loading={loading && loadingIndex === 'uoc'}
                    />
                    <FileSlot
                        label="Assessment instrument (.pdf or .docx)"
                        file={assessmentFile}
                        onFileChange={setAssessmentFile}
                        onRemove={() => setAssessmentFile(null)}
                        loading={loading && loadingIndex === 'assessment'}
                    />
                </div>
            )}

            {/* Build — 1 to 4 UoC files */}
            {mode === 'build' && (
                <div className="space-y-2">
                    {uocFiles.map((file, i) => (
                        <FileSlot
                            key={i}
                            label={uocFiles.length > 1 ? `Unit of Competency ${i + 1}` : 'Unit of Competency (.pdf or .docx)'}
                            file={file}
                            onFileChange={f => setUocAt(i, f)}
                            onRemove={() => removeUocAt(i)}
                            loading={loading && loadingIndex === i}
                        />
                    ))}
                    {uocFiles.length < 4 && !loading && (
                        <button
                            onClick={addUocSlot}
                            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c9a84c', padding: '4px 0' }}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add another UoC (clustered assessment)
                        </button>
                    )}
                </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>Cancel</Button>
                <button
                    onClick={handleSubmit}
                    disabled={!isReady() || loading || disabled}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#c9a84c', color: '#0d2444', border: 'none', cursor: isReady() && !loading ? 'pointer' : 'not-allowed' }}
                >
                    {loading ? (
                        <span className="flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Extracting…
                        </span>
                    ) : 'Submit'}
                </button>
            </div>
        </div>
    );
}