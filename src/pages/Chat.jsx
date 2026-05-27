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
    { label: 'Score text', icon: BarChart3, prompt: 'I want to score some text for readability.', cohort: false },
    { label: 'Rewrite text', icon: PenLine, prompt: 'I want to rewrite some text to a target level.', cohort: false },
    { label: 'Evaluate assessment', icon: ClipboardCheck, prompt: 'I want to evaluate an existing assessment against a UoC.', cohort: true },
    { label: 'Build assessment', icon: Hammer, prompt: 'I want to build a new assessment from a UoC.', cohort: true },
];

export default function Chat() {
    const { onboardingDone, saveProfile, buildCohortMessage, profile, getLabel } = useCohort();

    const buildCohortProfile = () => {
        const inst = getLabel('institution_type', profile.institution_type);
        const mode = getLabel('delivery_mode', profile.delivery_mode);
        const lit  = getLabel('literacy_level', profile.literacy_level);
        const lang = getLabel('language_background', profile.language_background);
        const age  = getLabel('age_group', profile.age_group);
        return `Institution: ${inst}\n1. Delivery mode: ${mode}\n2. Literacy level: ${lit}\n3. Language background: ${lang}\n4. Age group: ${age}`;
    };
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [loading, setLoading] = useState(false);

    // Handle quick-action events fired from result cards
    useEffect(() => {
        const onRewrite = () => handleSend('Please rewrite this to a different level.');
        const onSave    = () => handleSend('Please save this result to the work library.');
        window.addEventListener('fk:rewrite-request', onRewrite);
        window.addEventListener('fk:save-to-library', onSave);
        return () => {
            window.removeEventListener('fk:rewrite-request', onRewrite);
            window.removeEventListener('fk:save-to-library', onSave);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversation]);

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

    const handleQuickAction = (prompt, includesCohort = false) => {
        if (includesCohort) {
            handleSend(`${prompt}\n\nCOHORT PROFILE:\n${buildCohortProfile()}`);
        } else {
            handleSend(prompt);
        }
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

    const handleDocumentUpload = (extracted, mode) => {
        const cohortBlock = buildCohortProfile();

        let message;

        if (mode === 'evaluate') {
            const uoc = extracted.uoc?.text || '';
            const assessment = extracted.assessment?.text || '';
            message =
`EVALUATE MODE — TWO DOCUMENTS PROVIDED

DOCUMENT 1 — UNIT OF COMPETENCY:
${uoc}

---

DOCUMENT 2 — ASSESSMENT INSTRUMENT:
${assessment}

---

COHORT PROFILE:
${cohortBlock}

Please proceed directly with the EVALUATE workflow. Do not ask what mode to use. Do not ask for the cohort profile. Both documents and the cohort profile are provided above.`;

        } else if (mode === 'build') {
            const uoc = extracted.uoc?.text || '';
            message =
`BUILD MODE — UOC PROVIDED

DOCUMENT 1 — UNIT OF COMPETENCY:
${uoc}

---

COHORT PROFILE:
${cohortBlock}

Please proceed directly with the BUILD workflow. Do not ask what mode to use. Do not ask for the cohort profile. The UoC and cohort profile are provided above.`;

        } else {
            // score / rewrite — single doc, no cohort injection needed
            const doc = extracted.doc || Object.values(extracted)[0];
            message = `DOCUMENT (file: ${doc?.name || 'uploaded'})\n\n${doc?.text || ''}`;
        }

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
                                    onClick={() => handleQuickAction(action.prompt, action.cohort)}
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