import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, Paperclip } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ChatInput({ onSend, disabled }) {
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

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

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            onSend(`I have uploaded a file: ${file_url}`, [file_url]);
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="border-t bg-card p-4">
            <div className="flex items-end gap-2 max-w-4xl mx-auto">
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.json,.html,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || uploading}
                >
                    <Paperclip className="h-4 w-4" />
                </Button>
                <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Paste text to score, describe what you need, or upload a document..."
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