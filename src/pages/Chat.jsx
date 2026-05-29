import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import ChatMessages from '../components/chat/ChatMessages';
import ChatInput from '../components/chat/ChatInput';
import CohortOnboarding from '../components/chat/CohortOnboarding';
import CohortBar from '../components/chat/CohortBar';
import { useCohort } from '@/lib/CohortContext';
import { BarChart3, PenLine, ClipboardCheck, Hammer, Search, CheckSquare, FileEdit } from 'lucide-react';

const AGENT_NAME = 'fk_readability_tool';

const quickActions = [
    { label: 'Score text', icon: BarChart3, prompt: 'I want to score some text for readability.', cohort: false },
    { label: 'Rewrite text', icon: PenLine, prompt: 'I want to rewrite some text to a target level.', cohort: false },
    { label: 'Evaluate assessment', icon: ClipboardCheck, prompt: 'I want to evaluate an existing assessment against a UoC.', cohort: true },
    { label: 'Build assessment', icon: Hammer, prompt: 'I want to build a new assessment from a UoC.', cohort: true },
];

export default function Chat() {
    const location = useLocation();
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
        createConversation().then(conv => {
            // If navigated here with a quickPrompt from Dashboard, auto-send it
            const state = location.state;
            if (state?.quickPrompt && conv) {
                const prompt = state.cohort
                    ? `${state.quickPrompt}\n\nCOHORT PROFILE:\n${buildCohortProfile()}`
                    : state.quickPrompt;
                setIsStreaming(true);
                base44.agents.addMessage(conv, { role: 'user', content: prompt });
                // Clear state so refresh doesn't re-send
                window.history.replaceState({}, '', '/chat');
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            // Support single or multiple UoC files (clustered build)
            const uocKeys = Object.keys(extracted).filter(k => k === 'uoc' || k.startsWith('uoc'));
            const uocCount = uocKeys.length;

            if (uocCount === 1) {
                // Single UoC build
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
                // Clustered build — multiple UoCs
                const uocBlocks = uocKeys.map((key, i) => {
                    const text = extracted[key]?.text || '';
                    const name = extracted[key]?.name || `UoC ${i + 1}`;
                    return `DOCUMENT ${i + 1} — UNIT OF COMPETENCY (${name}):\n${text}`;
                }).join('\n\n---\n\n');

                message =
`BUILD MODE — CLUSTERED ASSESSMENT (${uocCount} UoCs provided)

${uocBlocks}

---

COHORT PROFILE:
${cohortBlock}

Please proceed with the BUILD workflow for a CLUSTERED assessment covering all ${uocCount} units above. Apply CLUSTERING RULES. Do not ask what mode to use. Do not ask for the cohort profile. All UoCs and the cohort profile are provided above.
After confirming the UoCs, silently analyse shared outcomes and announce: "Found [n] shared outcomes across ${uocCount} units — analysing..."`;
            }

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
                <div className="flex-1 overflow-y-auto bg-white dark:bg-background">
                    <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">

                        {/* Hero */}
                        <div className="text-center space-y-4">
                            <h1 className="text-4xl leading-tight" style={{ color: '#0d2444', fontWeight: 500 }}>
                                Are your assessments audit-ready?
                            </h1>
                            <p className="text-muted-foreground text-base leading-relaxed max-w-2xl mx-auto">
                                Upload your assessment and Unit of Competency. We'll check readability, evidence coverage, and compliance gaps — and tell you exactly what needs fixing before an ASQA or TEQSA audit.
                            </p>
                        </div>

                        {/* Task cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                            {/* Card 1 — Check readability */}
                            <div className="bg-white rounded-xl shadow-sm flex flex-col" style={{ border: '1px solid #e5e7eb', borderLeft: '4px solid #0d2444' }}>
                                <div className="p-5 flex flex-col flex-1 space-y-3">
                                    <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0d2444' }}>
                                        <Search className="h-5 w-5" style={{ color: '#c9a84c' }} />
                                    </div>
                                    <h3 className="text-base font-medium" style={{ color: '#0d2444' }}>Check readability</h3>
                                    <p className="text-sm leading-relaxed flex-1" style={{ color: '#6b7280' }}>
                                        Is your assessment written at the right level for your learners? Get an instant readability score mapped to AQF levels.
                                    </p>
                                    <button
                                        onClick={() => handleQuickAction('I want to score some text for readability.', false)}
                                        className="w-full mt-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                                        style={{ backgroundColor: '#c9a84c', color: '#0d2444' }}
                                    >
                                        Upload document
                                    </button>
                                </div>
                            </div>

                            {/* Card 2 — Audit assessment */}
                            <div className="bg-white rounded-xl shadow-sm flex flex-col" style={{ border: '1px solid #e5e7eb', borderLeft: '4px solid #162d50' }}>
                                <div className="p-5 flex flex-col flex-1 space-y-3">
                                    <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#162d50' }}>
                                        <CheckSquare className="h-5 w-5" style={{ color: '#c9a84c' }} />
                                    </div>
                                    <h3 className="text-base font-medium" style={{ color: '#0d2444' }}>Audit your assessment</h3>
                                    <p className="text-sm leading-relaxed flex-1" style={{ color: '#6b7280' }}>
                                        Upload your assessment and Unit of Competency. We'll check evidence coverage, readability compliance, and flag every gap before an auditor does.
                                    </p>
                                    <button
                                        onClick={() => handleQuickAction('I want to evaluate an existing assessment against a UoC.', true)}
                                        className="w-full mt-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                                        style={{ backgroundColor: '#c9a84c', color: '#0d2444' }}
                                    >
                                        Upload assessment + UoC
                                    </button>
                                </div>
                            </div>

                            {/* Card 3 — Build assessment */}
                            <div className="bg-white rounded-xl shadow-sm flex flex-col" style={{ border: '1px solid #e5e7eb', borderLeft: '4px solid #8ba4c4' }}>
                                <div className="p-5 flex flex-col flex-1 space-y-3">
                                    <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#8ba4c4' }}>
                                        <FileEdit className="h-5 w-5" style={{ color: '#0d2444' }} />
                                    </div>
                                    <h3 className="text-base font-medium" style={{ color: '#0d2444' }}>Build a new assessment</h3>
                                    <p className="text-sm leading-relaxed flex-1" style={{ color: '#6b7280' }}>
                                        Give us your Unit of Competency and we'll build a complete, audit-ready assessment from scratch — scored and mapped to your cohort.
                                    </p>
                                    <button
                                        onClick={() => handleQuickAction('I want to build a new assessment from a UoC.', true)}
                                        className="w-full mt-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                                        style={{ backgroundColor: '#c9a84c', color: '#0d2444' }}
                                    >
                                        Upload UoC
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Trust statement */}
                        <p className="text-center text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
                            Used by RTOs and universities across Australia. Results mapped to AQF levels 1–10.<br />
                            Scores are AI estimates — always review with a qualified assessor before submission.
                        </p>

                        {/* Metric definitions */}
                        <div className="rounded-xl p-5" style={{ border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                            <p className="text-xs font-medium mb-3" style={{ color: '#374151' }}>Metric definitions</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { abbr: 'FKGL', name: 'Flesch–Kincaid Grade Level', desc: 'Mapped to Australian year levels and AQF qualifications (AQF 1–10). Lower score = easier to read.' },
                                    { abbr: 'FRE',  name: 'Flesch Reading Ease',        desc: 'Score 0–100. Higher = easier to read. Plain English ≈ 60–70.' },
                                    { abbr: 'ASL',  name: 'Average Sentence Length',    desc: 'Mean number of words per sentence. Shorter sentences read easier.' },
                                    { abbr: 'ASW',  name: 'Average Syllables per Word', desc: 'Mean syllables per word. Fewer syllables = simpler vocabulary.' },
                                ].map(m => (
                                    <div key={m.abbr}>
                                        <p className="text-sm font-medium" style={{ color: '#0d2444' }}>{m.abbr}</p>
                                        <p className="text-[11px] font-medium mb-0.5" style={{ color: '#374151' }}>{m.name}</p>
                                        <p className="text-[11px] leading-relaxed" style={{ color: '#6b7280' }}>{m.desc}</p>
                                    </div>
                                ))}
                            </div>
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