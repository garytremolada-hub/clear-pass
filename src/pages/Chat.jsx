import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import ChatMessages from '../components/chat/ChatMessages';
import ChatInput from '../components/chat/ChatInput';
import CohortOnboarding from '../components/chat/CohortOnboarding';
import CohortBar from '../components/chat/CohortBar';
import { useCohort } from '@/lib/CohortContext';
import { BarChart3, PenLine, ClipboardCheck, Hammer } from 'lucide-react';

const AGENT_NAME = 'fk_readability_tool';

const quickActions = [
    { label: 'Score text', icon: BarChart3, prompt: 'I want to score some text for readability.' },
    { label: 'Rewrite text', icon: PenLine, prompt: 'I want to rewrite some text to a target level.' },
    { label: 'Evaluate assessment', icon: ClipboardCheck, prompt: 'I want to evaluate an existing assessment against a UoC.' },
    { label: 'Build assessment', icon: Hammer, prompt: 'I want to build a new assessment from a UoC.' },
];

export default function Chat() {
    const { onboardingDone, saveProfile, buildCohortMessage } = useCohort();
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [loading, setLoading] = useState(false);

    const createConversation = useCallback(async () => {
        setLoading(true);
        const conv = await base44.agents.createConversation({
            agent_name: AGENT_NAME,
            metadata: { name: 'New Session', description: 'FK Readability session' }
        });
        setConversation(conv);
        setMessages(conv.messages || []);
        setLoading(false);
        return conv;
    }, []);

    useEffect(() => {
        createConversation();
    }, [createConversation]);

    useEffect(() => {
        if (!conversation?.id) return;
        const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
            setMessages(data.messages || []);
            const lastMsg = data.messages?.[data.messages.length - 1];
            if (lastMsg?.role === 'assistant') {
                setIsStreaming(false);
            }
        });
        return () => unsubscribe();
    }, [conversation?.id]);

    const handleSend = async (text, fileUrls) => {
        let conv = conversation;
        if (!conv) {
            conv = await createConversation();
        }
        setIsStreaming(true);
        const msgPayload = { role: 'user', content: text };
        if (fileUrls?.length) msgPayload.file_urls = fileUrls;
        await base44.agents.addMessage(conv, msgPayload);
    };

    const handleQuickAction = (prompt) => {
        handleSend(prompt);
    };

    const handleOnboardingComplete = async (profile) => {
        saveProfile(profile);
        // Auto-send cohort profile to agent
        let conv = conversation;
        if (!conv) conv = await createConversation();
        setIsStreaming(true);
        await base44.agents.addMessage(conv, {
            role: 'user',
            content: buildCohortMessage(profile),
        });
    };

    const handleDocumentUpload = (extracted) => {
        // Map slot keys to clear numbered labels for the AI
        const SLOT_LABELS = {
            uoc: 'DOCUMENT 1 — UNIT OF COMPETENCY',
            assessment: 'DOCUMENT 2 — ASSESSMENT INSTRUMENT',
            doc: 'DOCUMENT',
        };

        const parts = Object.entries(extracted).map(([key, { name, text }]) => {
            const heading = SLOT_LABELS[key] || key.toUpperCase();
            return `${heading} (file: ${name})\n\n${text}`;
        });

        console.log('[Chat] Sending document blocks to agent:', parts.map((p, i) => `Block ${i+1}: ${p.slice(0, 100)}`));

        const message = parts.join('\n\n---\n\n');
        handleSend(message);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    const hasMessages = messages.length > 0;

    if (!onboardingDone) {
        return <CohortOnboarding onComplete={handleOnboardingComplete} />;
    }

    return (
        <div className="flex flex-col h-full">
            <CohortBar />
            {!hasMessages ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="max-w-lg text-center space-y-6">
                        <div className="inline-flex h-14 w-14 rounded-2xl bg-primary/10 items-center justify-center">
                            <BarChart3 className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight">FK Readability & AQF Tool</h2>
                            <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-md mx-auto">
                                Score text readability, rewrite to target levels, evaluate assessments against Units of Competency, or build new assessments from scratch.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {quickActions.map((action) => (
                                <button
                                    key={action.label}
                                    onClick={() => handleQuickAction(action.prompt)}
                                    className="flex items-center gap-2.5 p-3.5 rounded-xl border bg-card hover:bg-muted/60 transition-colors text-left group"
                                >
                                    <action.icon className="h-4 w-4 text-primary shrink-0" />
                                    <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <ChatMessages messages={messages} isStreaming={isStreaming} />
            )}
            <ChatInput onSend={handleSend} onDocumentUpload={handleDocumentUpload} disabled={isStreaming} />
        </div>
    );
}