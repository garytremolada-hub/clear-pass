import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
    Home, Ruler, Layers, ClipboardCheck, Library, PlayCircle, Settings,
    ChevronDown, ChevronUp, ArrowRight,
    Upload, Search, Cpu, Download, BarChart2, RotateCcw, Users, ClipboardList,
} from 'lucide-react';

const NAVY = '#0D2444';
const GOLD = '#C9A84C';
const GREY_TEXT = '#374151';
const BORDER = '#E5E7EB';

const BAND_COLORS = [
    '#4ADE80', '#86EFAC', '#FDE68A', '#FCD34D',
    '#FDBA74', '#FB923C', '#F87171', '#EF4444',
];

function FAQ({ q, a }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: '12px', marginBottom: '12px' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}
            >
                <span style={{ fontWeight: 700, color: NAVY, fontSize: '14px', lineHeight: 1.5 }}>{q}</span>
                {open
                    ? <ChevronUp style={{ color: GOLD, width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }} />
                    : <ChevronDown style={{ color: GOLD, width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }} />
                }
            </button>
            {open && <p style={{ color: GREY_TEXT, fontSize: '14px', lineHeight: 1.7, margin: '4px 0 8px', paddingRight: '24px' }}>{a}</p>}
        </div>
    );
}

function SectionHeading({ text }) {
    return <h2 style={{ color: NAVY, fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>{text}</h2>;
}

function FlowNode({ Icon, label, sublabel, iconBg }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '90px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', flexShrink: 0 }}>
                <Icon style={{ color: '#fff', width: '24px', height: '24px' }} />
            </div>
            <p style={{ fontWeight: 700, color: NAVY, fontSize: '12px', textAlign: 'center', margin: '0 0 3px', lineHeight: 1.3 }}>{label}</p>
            {sublabel && <p style={{ color: '#6B7280', fontSize: '11px', textAlign: 'center', margin: 0, lineHeight: 1.4 }}>{sublabel}</p>}
        </div>
    );
}

function Flowchart({ accentColor, nodes }) {
    return (
        <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', border: `1px solid ${BORDER}`, borderTop: `4px solid ${accentColor}`, padding: '24px 16px 20px', overflowX: 'auto', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: '440px' }}>
                {nodes.map((node, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: i < nodes.length - 1 ? 1 : 'none' }}>
                        <FlowNode {...node} />
                        {i < nodes.length - 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0, marginBottom: '28px' }}>
                                <ArrowRight style={{ color: GOLD, width: '18px', height: '18px' }} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Menu item card
function MenuCard({ Icon, iconColor, label, path, description, steps, navigate }) {
    return (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
            {/* Header */}
            <div style={{ backgroundColor: NAVY, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon style={{ color: '#fff', width: '18px', height: '18px' }} />
                </div>
                <div>
                    <p style={{ color: GOLD, fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>Menu item</p>
                    <p style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0 }}>{label}</p>
                </div>
                {path && (
                    <button
                        onClick={() => navigate(path)}
                        style={{ marginLeft: 'auto', backgroundColor: GOLD, color: NAVY, border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                    >
                        Open →
                    </button>
                )}
            </div>
            {/* Body */}
            <div style={{ padding: '20px', backgroundColor: '#fff' }}>
                <p style={{ color: GREY_TEXT, fontSize: '14px', lineHeight: 1.7, marginBottom: steps ? '16px' : 0 }}>{description}</p>
                {steps && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {steps.map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: GOLD, color: NAVY, fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
                                <p style={{ color: GREY_TEXT, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{s}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function HowItWorks() {
    const navigate = useNavigate();

    const buildNodes = [
        { Icon: Search,        label: 'Find your unit',     sublabel: 'Search by code',       iconBg: '#3B82F6' },
        { Icon: Users,         label: 'Set your cohort',    sublabel: 'Learner type + support', iconBg: '#8B5CF6' },
        { Icon: ClipboardList, label: 'Review structure',   sublabel: 'Confirm sections',      iconBg: '#F59E0B' },
        { Icon: Cpu,           label: 'AI builds it',       sublabel: '~3 minutes',            iconBg: '#EF4444' },
        { Icon: Download,      label: 'Download files',     sublabel: 'Booklet · Map · Record', iconBg: '#10B981' },
    ];

    const levelCheckNodes = [
        { Icon: Upload,    label: 'Upload document',   sublabel: '.docx or PDF',       iconBg: '#3B82F6' },
        { Icon: BarChart2, label: 'Get your scores',   sublabel: 'FKGL · FRE · Words', iconBg: '#8B5CF6' },
        { Icon: RotateCcw, label: 'Rewrite if needed', sublabel: 'Pick target level',   iconBg: '#F59E0B' },
        { Icon: Download,  label: 'Download',          sublabel: 'Formatted Word file', iconBg: '#10B981' },
    ];

    const evaluateNodes = [
        { Icon: Search,    label: 'Find unit',          sublabel: 'Search by code',         iconBg: '#3B82F6' },
        { Icon: Upload,    label: 'Upload assessment',  sublabel: '.docx or PDF',            iconBg: '#8B5CF6' },
        { Icon: Users,     label: 'Set your cohort',    sublabel: 'Learner type + support',  iconBg: '#F59E0B' },
        { Icon: Cpu,       label: 'AI evaluates',       sublabel: 'PE, KE, PC coverage',     iconBg: '#EF4444' },
        { Icon: Download,  label: 'Download report',    sublabel: 'Audit-ready Word doc',    iconBg: '#10B981' },
    ];

    return (
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>

            {/* Header */}
            <div style={{ backgroundColor: NAVY, padding: '40px 24px' }}>
                <div style={{ maxWidth: '780px', margin: '0 auto' }}>
                    <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 700, marginBottom: '8px' }}>How It Works</h1>
                    <p style={{ color: '#C8D6E8', fontSize: '15px', margin: 0 }}>
                        A guide to every tool in Clearpass and what each one does
                    </p>
                </div>
            </div>

            <div style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 24px' }}>

                {/* ── What is Clearpass ── */}
                <div style={{ marginBottom: '48px' }}>
                    <SectionHeading text="What is Clearpass?" />
                    <p style={{ color: GREY_TEXT, fontSize: '14px', lineHeight: 1.7, marginBottom: '16px' }}>
                        Clearpass is a compliance and assessment tool built specifically for RTOs, TAFEs, and training providers operating under the Standards for RTOs. It has three core jobs:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { num: '1', title: 'Build assessments from scratch', body: 'Search for any unit on training.gov.au, tell Clearpass who your learners are, and it builds a complete, audit-ready assessment instrument in about three minutes.' },
                            { num: '2', title: 'Check and fix readability', body: 'Upload any existing document to see its reading level. If it is too complex for your cohort, rewrite it at the right level and download the updated file.' },
                            { num: '3', title: 'Evaluate existing assessments', body: 'Upload an existing assessment and a unit code. Clearpass audits it for coverage gaps against PE, KE, and PC requirements and produces a compliance report.' },
                        ].map(({ num, title, body }) => (
                            <div key={num} style={{ border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '18px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: GOLD, color: NAVY, fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>{num}</div>
                                <p style={{ color: NAVY, fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>{title}</p>
                                <p style={{ color: GREY_TEXT, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{body}</p>
                            </div>
                        ))}
                    </div>
                    <div style={{ backgroundColor: '#FEF3C7', borderLeft: '4px solid #F59E0B', borderRadius: '8px', padding: '16px 20px' }}>
                        <p style={{ color: NAVY, fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>Readability is an accessibility issue, not a rigour issue</p>
                        <p style={{ color: GREY_TEXT, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                            Rigour comes from the Unit of Competency. The performance criteria and evidence requirements set the standard. If a learner cannot understand the question, you are assessing their reading ability, not their competency. Clearpass keeps all requirements fully covered while matching the language to your learners.
                        </p>
                    </div>
                </div>

                {/* ── Menu guide ── */}
                <div style={{ marginBottom: '48px' }}>
                    <SectionHeading text="What each menu item does" />

                    <MenuCard
                        Icon={Home}
                        iconColor="#0D2444"
                        label="Home"
                        path="/"
                        description="Your starting point. Shows a summary of your recent work and quick-access buttons to start a new build, level check, or evaluation. If you are not sure where to go, start here."
                        navigate={navigate}
                    />

                    <MenuCard
                        Icon={Ruler}
                        iconColor="#8B5CF6"
                        label="Level Check"
                        path="/level-check"
                        description="Upload any document (Word or PDF) to measure its reading level. Clearpass calculates the FKGL grade level and Reading Ease score, then tells you whether it is appropriate for your learner cohort. If it is not, you can rewrite it to the right level and download the corrected version as a formatted Word file."
                        steps={[
                            'Upload a Word or PDF file.',
                            'See the FKGL and FRE scores and which band the document sits in.',
                            'Choose a target reading level if a rewrite is needed.',
                            'Download the rewritten document as a Word file.',
                        ]}
                        navigate={navigate}
                    />

                    <div style={{ marginBottom: '8px' }}>
                        <Flowchart accentColor="#8B5CF6" nodes={levelCheckNodes} />
                    </div>

                    <MenuCard
                        Icon={Layers}
                        iconColor="#3B82F6"
                        label="Build Assessment"
                        path="/build"
                        description="Build a complete assessment instrument from any Unit of Competency. Search for the unit by code, answer two questions about your learners, and Clearpass writes the full assessment at the right reading level. You can download the student booklet, assessor marking guide, competency mapping, and validation record as Word documents."
                        steps={[
                            'Search for your unit code and load it from training.gov.au.',
                            'Select your learner type and any support needs.',
                            'Review and confirm the assessment structure (sections and types).',
                            'Wait about three minutes while the AI builds the content.',
                            'Download the student booklet, competency mapping, and validation record.',
                        ]}
                        navigate={navigate}
                    />

                    <div style={{ marginBottom: '8px' }}>
                        <Flowchart accentColor="#3B82F6" nodes={buildNodes} />
                    </div>

                    <MenuCard
                        Icon={ClipboardCheck}
                        iconColor="#D97706"
                        label="Evaluate"
                        path="/evaluate"
                        description="Upload an existing assessment to check whether it covers all the requirements of a specific unit. Clearpass audits it against the Performance Evidence, Knowledge Evidence, and Performance Criteria from the unit, then produces a detailed compliance report with gap recommendations. Each gap recommendation includes a ready-to-use example question or task you can adapt directly."
                        steps={[
                            'Search for the unit the assessment is designed for.',
                            'Upload the existing assessment document.',
                            'Select your learner cohort to set the readability target.',
                            'Wait while Clearpass audits each PE, KE, and PC requirement.',
                            'Download the compliance audit report as a Word document.',
                        ]}
                        navigate={navigate}
                    />

                    <div style={{ marginBottom: '8px' }}>
                        <Flowchart accentColor="#D97706" nodes={evaluateNodes} />
                    </div>

                    <MenuCard
                        Icon={Library}
                        iconColor="#10B981"
                        label="Work Library"
                        path="/library"
                        description="Every assessment you build, document you check, or evaluation you run is saved here automatically when you choose to save it. You can browse, search, and re-download anything in the library. Use it to keep a record of completed work or to share outputs with your team."
                        navigate={navigate}
                    />

                    <MenuCard
                        Icon={PlayCircle}
                        iconColor="#6B7280"
                        label="How It Works"
                        path={null}
                        description="This page. A guide to every feature and menu item in Clearpass. Come back here whenever you need a reminder of what something does or how a workflow runs."
                        navigate={navigate}
                    />

                    <MenuCard
                        Icon={Settings}
                        iconColor="#374151"
                        label="Settings"
                        path="/settings"
                        description="Manage your subscription and account. From here you can view your current plan, access billing, or sign out of the app."
                        navigate={navigate}
                    />
                </div>

                {/* ── Reading level reference ── */}
                <div style={{ marginBottom: '48px' }}>
                    <SectionHeading text="Reading level reference" />
                    <p style={{ color: GREY_TEXT, fontSize: '14px', lineHeight: 1.7, marginBottom: '16px' }}>
                        Clearpass uses two scores: <strong>FKGL</strong> (Flesch-Kincaid Grade Level) maps to school year — Grade 10 means a Year 10 student can read it comfortably. <strong>FRE</strong> (Flesch Reading Ease) runs the opposite way — a higher score means easier reading. Both scores map to the eight bands below, which align with Australian AQF levels.
                    </p>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '540px' }}>
                            <thead>
                                <tr style={{ backgroundColor: NAVY, color: '#fff' }}>
                                    {['Band', 'FKGL', 'FRE', 'AQF level', 'Typical reader'].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { band: 'Very Easy',         fkgl: '≤ 3',  fre: '90–100', aqf: 'Pre-vocational',               reader: 'Early primary school' },
                                    { band: 'Easy',              fkgl: '4–5',  fre: '80–90',  aqf: 'Pre-vocational / Cert I',       reader: 'Upper primary school' },
                                    { band: 'Fairly Easy',       fkgl: '6–7',  fre: '70–80',  aqf: 'Certificate I / II',            reader: 'Year 7–8 student' },
                                    { band: 'Cert I/II · Yr 10', fkgl: '8–9',  fre: '60–70',  aqf: 'Certificate II / III',          reader: 'Year 9–10 student' },
                                    { band: 'Cert III/IV',       fkgl: '10–11',fre: '50–60',  aqf: 'Certificate III / IV',          reader: 'Working adult' },
                                    { band: 'Diploma',           fkgl: '12–13',fre: '30–50',  aqf: 'Diploma / Advanced Diploma',    reader: 'VET diploma student' },
                                    { band: 'Degree / Grad Dip', fkgl: '14–16',fre: '10–30',  aqf: 'Bachelor / Graduate Diploma',   reader: 'University student' },
                                    { band: 'Very Difficult',    fkgl: '17+',  fre: '< 10',   aqf: 'Postgraduate / Specialist',     reader: 'Academic or specialist' },
                                ].map(({ band, fkgl, fre, aqf, reader }, idx) => (
                                    <tr key={band} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                                        <td style={{ padding: '9px 12px', borderBottom: `1px solid ${BORDER}` }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: BAND_COLORS[idx], flexShrink: 0 }} />
                                                <span style={{ color: NAVY, fontWeight: 600 }}>{band}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '9px 12px', color: GREY_TEXT, borderBottom: `1px solid ${BORDER}` }}>{fkgl}</td>
                                        <td style={{ padding: '9px 12px', color: GREY_TEXT, borderBottom: `1px solid ${BORDER}` }}>{fre}</td>
                                        <td style={{ padding: '9px 12px', color: GREY_TEXT, borderBottom: `1px solid ${BORDER}` }}>{aqf}</td>
                                        <td style={{ padding: '9px 12px', color: GREY_TEXT, borderBottom: `1px solid ${BORDER}` }}>{reader}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic', marginTop: '10px' }}>
                        Scores are calculated using the Flesch-Kincaid formula on extracted text. Scanned PDFs and heavily formatted documents may produce less accurate scores.
                    </p>
                </div>

                {/* ── FAQ ── */}
                <div style={{ marginBottom: '48px' }}>
                    <SectionHeading text="Common questions" />
                    <FAQ q="Does Clearpass replace a qualified assessor?" a="No. Clearpass writes the assessment or produces the report. A qualified assessor still needs to review and validate the tool before it is used for delivery or submitted for audit. Clearpass produces the draft. You provide the professional judgement." />
                    <FAQ q="Is the assessment compliant with the Standards for RTOs?" a="Clearpass builds assessments that map to the unit requirements and are written at an appropriate reading level. Your assessor and your RTO decide whether the tool meets the Standards for RTOs. Use the competency mapping document as evidence in your validation process." />
                    <FAQ q="What file types can I upload?" a="Word documents (.docx) and PDF files. For best results, upload a text-based PDF rather than a scanned image. Scanned documents may not extract correctly." />
                    <FAQ q="Can I edit the output after downloading?" a="Yes. All outputs download as Word files. Open them in Microsoft Word and edit as needed. The formatting, tables, and answer boxes are all editable." />
                    <FAQ q="What is the competency mapping document?" a="A Word document that shows which question or task covers which performance criterion, knowledge evidence, and performance evidence requirement from the UoC. It gives auditors a direct line of sight from the assessment to the unit requirements." />
                    <FAQ q="What does the Evaluate tool check?" a="It checks every Performance Evidence item, every Knowledge Evidence item, and every Performance Criteria reference against the uploaded assessment. It reports each as COVERED, PARTIALLY COVERED, or NOT COVERED, then generates specific gap recommendations with example questions or tasks you can adapt." />
                    <FAQ q="Does making an assessment easier to read reduce its rigour?" a="No. Rigour comes from the Unit of Competency. If a learner cannot understand the question, you are assessing their reading ability, not their competency. Clearpass keeps all UoC requirements fully covered and only changes the language used to ask the questions." />
                    <FAQ q="Can I use Clearpass for multiple RTOs or qualifications?" a="Yes. Clearpass works with any UoC from any endorsed training package. You can build and evaluate assessments from Certificate I through to Advanced Diploma level." />
                </div>

            </div>

            {/* Footer CTA */}
            <div style={{ backgroundColor: NAVY, padding: '48px 24px' }}>
                <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>Ready to get started?</h2>
                    <p style={{ color: '#C8D6E8', fontSize: '15px', marginBottom: '28px' }}>
                        Build an assessment, check a document, or evaluate an existing tool.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => navigate('/build')} style={{ backgroundColor: GOLD, color: NAVY, border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                            Build assessment
                        </button>
                        <button onClick={() => navigate('/evaluate')} style={{ backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                            Evaluate assessment
                        </button>
                        <button onClick={() => navigate('/level-check')} style={{ backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                            Check reading level
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}