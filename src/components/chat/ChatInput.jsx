import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, FileUp } from 'lucide-react';
import DocumentUploadPanel from './DocumentUploadPanel';

export default function ChatInput({ onSend, onDocumentUpload, disabled }) {
    const [message, setMessage] = useState('');
    const [showUploadPanel, setShowUploadPanel] = useState(false);
    const [uploadMode, setUploadMode] = useState(null);

    const handleSend = () => {
        const trimmed = message.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setMessage('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleUploadClick = () => {
        // Cycle through modes or show picker
        setUploadMode('pick');
        setShowUploadPanel(true);
    };

    const handleDocumentSubmit = (extracted) => {
        const submittedMode = uploadMode;
        setShowUploadPanel(false);
        setUploadMode(null);
        if (onDocumentUpload) onDocumentUpload(extracted, submittedMode);
    };

    // Detect active mode from panel state
    const activePanelMode = uploadMode !== 'pick' ? uploadMode : null;

    return (
        <div style={{ borderTop: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
            {showUploadPanel && uploadMode && uploadMode !== 'pick' && (
                <div className="p-4 pb-0">
                    <DocumentUploadPanel
                        mode={uploadMode}
                        onSubmit={handleDocumentSubmit}
                        onCancel={() => { setShowUploadPanel(false); setUploadMode(null); }}
                        disabled={disabled}
                    />
                </div>
            )}

            {showUploadPanel && uploadMode === 'pick' && (
                <div className="p-4 pb-0">
                    <div className="border rounded-xl bg-card p-4 max-w-4xl mx-auto">
                        <p className="text-sm font-medium mb-3">What are you uploading for?</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {[
                                { mode: 'score', label: 'Score text' },
                                { mode: 'rewrite', label: 'Rewrite text' },
                                { mode: 'evaluate', label: 'Evaluate assessment' },
                                { mode: 'build', label: 'Build assessment' },
                            ].map(item => (
                                <button
                                    key={item.mode}
                                    onClick={() => setUploadMode(item.mode)}
                                    className="p-3 rounded-lg border text-sm font-medium hover:bg-muted/60 hover:border-primary/50 transition-colors text-left"
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end mt-3">
                            <Button variant="ghost" size="sm" onClick={() => { setShowUploadPanel(false); setUploadMode(null); }}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-end gap-2 max-w-4xl mx-auto p-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={handleUploadClick}
                    disabled={disabled}
                    title="Upload .pdf or .docx file"
                >
                    <FileUp className="h-4 w-4" />
                </Button>
                <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Paste text, describe what you need, or upload a .pdf/.docx file..."
                    className="min-h-[44px] max-h-[200px] resize-none bg-background"
                    rows={1}
                    disabled={disabled}
                />
                <Button
                    onClick={handleSend}
                    disabled={!message.trim() || disabled}
                    size="icon"
                    className="shrink-0"
                >
                    <SendHorizontal className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}