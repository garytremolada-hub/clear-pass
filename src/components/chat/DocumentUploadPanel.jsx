import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FileUp, X, CheckCircle2, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

function FileDropZone({ label, description, file, onFile, disabled }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
    };

    return (
        <div
            className={cn(
                "relative border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40",
                file ? "border-accent/60 bg-accent/5" : "",
                disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={disabled ? undefined : handleDrop}
        >
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx"
                disabled={disabled}
                onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
            />
            {file ? (
                <div className="flex items-center justify-center gap-2 text-accent">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-medium truncate max-w-[160px]">{file.name}</span>
                </div>
            ) : (
                <div className="space-y-1">
                    <FileUp className="h-5 w-5 mx-auto text-muted-foreground" />
                    <p className="text-xs font-medium text-foreground/70">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{description}</p>
                    <p className="text-[10px] text-muted-foreground">.pdf or .docx</p>
                </div>
            )}
        </div>
    );
}

const MODE_CONFIG = {
    evaluate: {
        title: 'Upload documents for Evaluate mode',
        slots: [
            { key: 'uoc', label: 'Unit of Competency', description: 'Upload your UoC document' },
            { key: 'assessment', label: 'Assessment document', description: 'Upload your existing assessment' },
        ]
    },
    build: {
        title: 'Upload document for Build mode',
        slots: [
            { key: 'uoc', label: 'Unit of Competency', description: 'Upload your UoC document' },
        ]
    },
    score: {
        title: 'Upload document to score',
        slots: [
            { key: 'doc', label: 'Document to score', description: 'Upload the text you want scored' },
        ]
    },
    rewrite: {
        title: 'Upload document to rewrite',
        slots: [
            { key: 'doc', label: 'Document to rewrite', description: 'Upload the text you want rewritten' },
        ]
    },
};

export default function DocumentUploadPanel({ mode, onSubmit, onCancel, disabled }) {
    const config = MODE_CONFIG[mode];
    const [files, setFiles] = useState({});
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const allFilled = config.slots.every(slot => files[slot.key]);

    const handleSubmit = async () => {
        setProcessing(true);
        setError(null);
        try {
            const extracted = {};
            // Process each slot strictly sequentially with isolated variables
            for (let i = 0; i < config.slots.length; i++) {
                const slot = config.slots[i];
                const file = files[slot.key];
                if (!file) throw new Error(`Missing file for slot: ${slot.key}`);

                console.log(`[DocumentUpload] Uploading slot "${slot.key}" — file: ${file.name}, size: ${file.size} bytes`);

                // Upload to get a unique URL for this specific file
                const uploadResult = await base44.integrations.Core.UploadFile({ file });
                const fileUrl = uploadResult.file_url;

                console.log(`[DocumentUpload] Uploaded slot "${slot.key}" → URL: ${fileUrl}`);

                // Extract text from this specific file URL
                const res = await base44.functions.invoke('extractDocumentText', {
                    file_url: fileUrl,
                    file_name: file.name,
                    label: slot.label,
                });

                const extractedText = res.data.text;
                console.log(`[DocumentUpload] Extracted slot "${slot.key}" — ${extractedText?.length ?? 0} chars — preview: ${extractedText?.slice(0, 120)}`);

                extracted[slot.key] = { text: extractedText, name: file.name, label: slot.label };
            }
            onSubmit(extracted);
        } catch (err) {
            setError(err.message || 'Extraction failed. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="border rounded-xl bg-card p-4 space-y-4 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">{config.title}</p>
                </div>
                <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className={cn("grid gap-3", config.slots.length > 1 ? "grid-cols-2" : "grid-cols-1 max-w-xs mx-auto w-full")}>
                {config.slots.map(slot => (
                    <FileDropZone
                        key={slot.key}
                        label={slot.label}
                        description={slot.description}
                        file={files[slot.key] || null}
                        onFile={(f) => setFiles(prev => ({ ...prev, [slot.key]: f }))}
                        disabled={processing || disabled}
                    />
                ))}
            </div>

            {error && <p className="text-xs text-destructive text-center">{error}</p>}

            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onCancel} disabled={processing}>Cancel</Button>
                <Button size="sm" onClick={handleSubmit} disabled={!allFilled || processing || disabled}>
                    {processing ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Analysing documents…</>
                    ) : (
                        <><FileUp className="h-3.5 w-3.5 mr-1.5" /> Analyse documents</>
                    )}
                </Button>
            </div>
        </div>
    );
}