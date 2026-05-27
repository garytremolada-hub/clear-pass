import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { Loader2 } from 'lucide-react';

export default function ChatMessages({ messages, isStreaming }) {
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isStreaming]);

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-4xl mx-auto space-y-4">
                {messages.map((msg, idx) => (
                    <MessageBubble key={idx} message={msg} />
                ))}
                {isStreaming && messages.length > 0 && !messages[messages.length - 1]?.content && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm pl-11">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Analysing...</span>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}