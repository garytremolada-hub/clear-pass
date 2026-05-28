import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Copy, Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock, FileText } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { parseReadabilityResult, parseBeforeAfter } from '@/lib/parseReadabilityResult';
import { ResultCard, BeforeAfterCards } from './ReadabilityResultCard';
import BuildOutputViewer from './BuildOutputViewer';

const FunctionDisplay = ({ toolCall }) => {
    const [expanded, setExpanded] = useState(false);
    const name = toolCall?.name || 'Function';
    const status = toolCall?.status || 'pending';
    const results = toolCall?.results;
    const displayProjection = toolCall?.display_projection;
    const hideDetails = !!displayProjection?.hide_details && !!displayProjection?.details_redacted;

    const parsedResults = (() => {
        if (!results) return null;
        try { return typeof results === 'string' ? JSON.parse(results) : results; } catch { return results; }
    })();

    const isError = results && (
        (typeof results === 'string' && /error|failed/i.test(results)) ||
        (parsedResults?.success === false)
    );

    const statusConfig = {
        pending: { icon: Clock, color: 'text-muted-foreground', text: 'Pending' },
        running: { icon: Loader2, color: 'text-primary', text: 'Running...', spin: true },
        in_progress: { icon: Loader2, color: 'text-primary', text: 'Running...', spin: true },
        completed: isError
            ? { icon: AlertCircle, color: 'text-destructive', text: 'Failed' }
            : { icon: CheckCircle2, color: 'text-accent', text: 'Success' },
        success: { icon: CheckCircle2, color: 'text-accent', text: 'Success' },
        failed: { icon: AlertCircle, color: 'text-destructive', text: 'Failed' },
        error: { icon: AlertCircle, color: 'text-destructive', text: 'Failed' }
    }[status] || { icon: Zap, color: 'text-muted-foreground', text: '' };

    const Icon = statusConfig.icon;
    const formattedName = name.split('.').reverse().join(' ').toLowerCase();

    if (hideDetails) {
        const isActive = status === 'running' || status === 'pending' || status === 'in_progress';
        const isFailed = status === 'failed' || status === 'error' || isError;
        const StateIcon = isActive ? Loader2 : isFailed ? AlertCircle : CheckCircle2;
        const label = isActive ? displayProjection.active_label : isFailed ? displayProjection.error_label : displayProjection.label;

        return (
            <div className="mt-2 text-xs">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span className="text-card-foreground">{label || statusConfig.text || formattedName}</span>
                    <StateIcon className={cn("h-3 w-3", isActive && "animate-spin text-primary", isFailed && "text-destructive", !isActive && !isFailed && "text-accent")} />
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2 text-xs">
            <button onClick={() => setExpanded(!expanded)} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:bg-muted", expanded ? "bg-muted" : "bg-card")}>
                <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
                <span className="text-card-foreground">{formattedName}</span>
                {statusConfig.text && <span className={cn("text-muted-foreground", isError && "text-destructive")}>• {statusConfig.text}</span>}
                {!statusConfig.spin && (toolCall.arguments_string || results) && <ChevronRight className={cn("h-3 w-3 text-muted-foreground transition-transform ml-auto", expanded && "rotate-90")} />}
            </button>
            {expanded && !statusConfig.spin && (
                <div className="mt-1.5 ml-3 pl-3 border-l-2 border-border space-y-2">
                    {toolCall.arguments_string && (
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Parameters:</div>
                            <pre className="bg-muted rounded-md p-2 text-xs font-mono whitespace-pre-wrap">{(() => { try { return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2); } catch { return toolCall.arguments_string; } })()}</pre>
                        </div>
                    )}
                    {parsedResults && (
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Result:</div>
                            <pre className="bg-muted rounded-md p-2 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-auto">{typeof parsedResults === 'object' ? JSON.stringify(parsedResults, null, 2) : parsedResults}</pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

function isBuildOutput(text) {
    if (!text) return false;
    // Must have assessor section markers
    return /ASSESSOR\s*(PACK|SECTION)?\s*\n/i.test(text) || /^#+\s*ASSESSOR/im.test(text);
}

function AssistantContent({ content }) {
    const beforeAfter = parseBeforeAfter(content);
    const singleResult = !beforeAfter ? parseReadabilityResult(content) : null;
    const isBuild = !beforeAfter && !singleResult && isBuildOutput(content);

    const handleRewrite = useCallback(() => {
        // Dispatch a custom event that Chat.jsx can listen to
        window.dispatchEvent(new CustomEvent('fk:rewrite-request'));
    }, []);

    const handleSaveToLibrary = useCallback(() => {
        window.dispatchEvent(new CustomEvent('fk:save-to-library'));
    }, []);

    if (beforeAfter) {
        // Split prose above/below the scoring blocks for context
        const proseParts = content.split(/\n(?=\*{0,2}(?:BEFORE|TEXT ANALYSIS)\b)/i);
        const proseAbove = proseParts.length > 1 ? proseParts[0].trim() : null;
        return (
            <div className="space-y-3">
                {proseAbove && (
                    <div className="rounded-2xl px-4 py-3 bg-card border">
                        <MarkdownContent>{proseAbove}</MarkdownContent>
                    </div>
                )}
                <BeforeAfterCards
                    before={beforeAfter.before}
                    after={beforeAfter.after}
                    onRewrite={handleRewrite}
                    onSaveToLibrary={handleSaveToLibrary}
                />
            </div>
        );
    }

    if (isBuild) {
        return <BuildOutputViewer text={content} />;
    }

    if (singleResult) {
        // Split the message: prose before the scoring block, card, prose after
        const scoringStart = content.search(/TEXT ANALYSIS\b|FKGL:\s*[\d.]/i);
        const proseAbove = scoringStart > 0 ? content.slice(0, scoringStart).trim() : null;

        // Find where the scoring block ends (next ## or --- or bold heading)
        const afterScoring = scoringStart >= 0
            ? content.slice(scoringStart).replace(/TEXT ANALYSIS[\s\S]+/, '')
            : null;
        const proseBelow = content.slice(scoringStart >= 0 ? scoringStart : 0)
            .replace(/(?:SESSION STATE[\s\S]+?)(?=\n\n|\n(?=[A-Z]))/g, '')
            .match(/(?:FKGL[\s\S]+?\n\n)([\s\S]+)$/)?.[1]?.trim() || null;

        return (
            <div className="space-y-3">
                {proseAbove && (
                    <div className="rounded-2xl px-4 py-3 bg-card border">
                        <MarkdownContent>{proseAbove}</MarkdownContent>
                    </div>
                )}
                <ResultCard
                    result={singleResult}
                    onRewrite={handleRewrite}
                    onSaveToLibrary={handleSaveToLibrary}
                />
                {proseBelow && proseBelow.length > 30 && (
                    <div className="rounded-2xl px-4 py-3 bg-card border">
                        <MarkdownContent>{proseBelow}</MarkdownContent>
                    </div>
                )}
            </div>
        );
    }

    // Default: plain markdown
    return (
        <div className="rounded-2xl px-4 py-3 bg-card border">
            <MarkdownContent>{content}</MarkdownContent>
        </div>
    );
}

function MarkdownContent({ children }) {
    return (
        <ReactMarkdown
            className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
                code: ({ inline, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                        <div className="relative group/code">
                            <pre className="bg-foreground/5 rounded-lg p-3 overflow-x-auto my-2">
                                <code className={cn(className, "font-mono text-xs")} {...props}>{children}</code>
                            </pre>
                            <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100"
                                onClick={() => { navigator.clipboard.writeText(String(children).replace(/\n$/, '')); toast.success('Copied'); }}>
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                    ) : (
                        <code className="px-1 py-0.5 rounded bg-muted text-foreground text-xs font-mono">{children}</code>
                    );
                },
                a: ({ children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline">{children}</a>,
                p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="my-0.5">{children}</li>,
                h1: ({ children }) => <h1 className="text-lg font-semibold my-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold my-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold my-2">{children}</h3>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/30 pl-3 my-2 text-muted-foreground">{children}</blockquote>,
                table: ({ children }) => <div className="overflow-x-auto my-2"><table className="min-w-full text-xs border-collapse">{children}</table></div>,
                th: ({ children }) => <th className="border border-border px-2 py-1 bg-muted font-medium text-left">{children}</th>,
                td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
                pre: ({ children }) => <pre className="bg-muted rounded-lg p-3 overflow-x-auto my-2 font-mono text-xs whitespace-pre-wrap">{children}</pre>,
            }}
        >
            {children}
        </ReactMarkdown>
    );
}

export default function MessageBubble({ message }) {
    const isUser = message.role === 'user';

    return (
        <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5 shrink-0">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
            )}
            <div className={cn(isUser ? "max-w-[85%] flex flex-col items-end" : "w-full max-w-3xl")}>
                {message.content && (
                    isUser ? (
                        <div className="rounded-2xl px-4 py-3 bg-primary text-primary-foreground">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        </div>
                    ) : (
                        <AssistantContent content={message.content} />
                    )
                )}
                {message.tool_calls?.length > 0 && (
                    <div className="space-y-1 mt-1">
                        {message.tool_calls.map((toolCall, idx) => (
                            <FunctionDisplay key={idx} toolCall={toolCall} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}