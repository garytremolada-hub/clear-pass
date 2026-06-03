import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
    FileText, Search, Layers, ShieldCheck, Target, Zap,
    Files, RefreshCw, Building2, ChevronDown, ChevronUp,
    Upload, Users, ClipboardList, Cpu, Download,
    BarChart2, ArrowRight, RotateCcw,
} from 'lucide-react';

const NAVY = '#0D2444';
const GOLD = '#C9A84C';
const GREY_TEXT = '#374151';
const BORDER = '#E5E7EB';

const BAND_COLORS = [
    '#4ADE80', // Very Easy — green
    '#86EFAC',
    '#FDE68A',
    '#FCD34D',
    '#FDBA74',
    '#FB923C',
    '#F87171',
    '#EF4444', // Very Difficult — red
];

// ── Accordion FAQ ─────────────────────────────────────────────────────────────
function FAQ({ q, a }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: '12px', marginBottom: '12px' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    width: '100%', textAlign: 'left', padding: '8px 0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px',
                }}
            >
                <span style={{ fontWeight: 700, color: NAVY, fontSize: '14px', lineHeight: 1.5 }}>{q}</span>
                {open
                    ? <ChevronUp style={{ color: GOLD, width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }} />
                    : <ChevronDown style={{ color: GOLD, width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }} />
                }
            </button>
            {open && (
                <p style={{ color: GREY_TEXT, fontSize: '14px', lineHeight: 1.7, margin: '4px 0 8px', paddingRight: '24px' }}>{a}</p>
            )}
        </div>
    );
}

// ── Grid item ─────────────────────────────────────────────────────────────────
function GridItem({ Icon, title, body }) {
    return (
        <div style={{
            backgroundColor: '#fff', border: `1px solid ${BORDER}`,
            borderRadius: '8px', padding: '20px',
        }}>
            <div style={{ marginBottom: '10px' }}>
                <Icon style={{ color: NAVY, width: '22px', height: '22px' }} />
            </div>
            <p style={{ fontWeight: 700, color: NAVY, fontSize: '14px', marginBottom: '6px' }}>{title}</p>
            <p style={{ color: GREY_TEXT, fontSize: '13px', lineHeight: 1.7, margin: 0 }}>{body}</p>
        </div>
    );
}

// ── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ Icon, title, body }) {
    return (
        <div style={{
            backgroundColor: '#fff',
            borderLeft: `4px solid ${GOLD}`,
            borderRadius: '8px',
            padding: '24px',
            flex: 1,
            minWidth: 0,
        }}>
            <div style={{ marginBottom: '10px' }}>
                <Icon style={{ color: GOLD, width: '24px', height: '24px' }} />
            </div>
            <p style={{ fontWeight: 700, color: NAVY, fontSize: '15px', marginBottom: '8px' }}>{title}</p>
            <p style={{ color: GREY_TEXT, fontSize: '14px', lineHeight: 1.7, margin: 0 }}>{body}</p>
        </div>
    );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ children }) {
    return <div style={{ marginBottom: '48px' }}>{children}</div>;
}

function SectionHeading({ text }) {
    return <h2 style={{ color: NAVY, fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>{text}</h2>;
}

// ── Flowchart node ────────────────────────────────────────────────────────────
function FlowNode({ Icon, label, sublabel, color, iconBg }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '100px' }}>
            <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                backgroundColor: iconBg || color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 12px ${color}55`,
                marginBottom: '10px',
                flexShrink: 0,
            }}>
                <Icon style={{ color: '#fff', width: '26px', height: '26px' }} />
            </div>
            <p style={{ fontWeight: 700, color: NAVY, fontSize: '13px', textAlign: 'center', margin: '0 0 4px', lineHeight: 1.3 }}>{label}</p>
            {sublabel && <p style={{ color: '#6B7280', fontSize: '11px', textAlign: 'center', margin: 0, lineHeight: 1.4 }}>{sublabel}</p>}
        </div>
    );
}

function FlowArrow() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0, marginBottom: '28px' }}>
            <ArrowRight style={{ color: GOLD, width: '20px', height: '20px' }} />
        </div>
    );
}

function Flowchart({ accentColor, nodes }) {
    return (
        <div style={{
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: `1px solid ${BORDER}`,
            borderTop: `4px solid ${accentColor}`,
            padding: '28px 20px 24px',
            overflowX: 'auto',
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: '480px' }}>
                {nodes.map((node, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: i < nodes.length - 1 ? 1 : 'none' }}>
                        <FlowNode {...node} />
                        {i < nodes.length - 1 && <FlowArrow />}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HowItWorks() {
    const navigate = useNavigate();

    const buildNodes = [
        { Icon: Upload,       label: 'Upload UoC',         sublabel: '.docx or PDF',          iconBg: '#3B82F6' },
        { Icon: Users,        label: 'Set your cohort',    sublabel: 'Learner type + support', iconBg: '#8B5CF6' },
        { Icon: ClipboardList,label: 'Review structure',   sublabel: 'Confirm sections',       iconBg: '#F59E0B' },
        { Icon: Cpu,          label: 'AI builds it',       sublabel: '~3 minutes',             iconBg: '#EF4444' },
        { Icon: Download,     label: 'Download 4 files',   sublabel: 'Booklet · Map · Record', iconBg: '#10B981' },
    ];

    const levelCheckNodes = [
        { Icon: Upload,     label: 'Upload document',   sublabel: '.docx or PDF',          iconBg: '#3B82F6' },
        { Icon: BarChart2,  label: 'Get your scores',   sublabel: 'FKGL · FRE · Words',    iconBg: '#8B5CF6' },
        { Icon: RotateCcw,  label: 'Rewrite if needed', sublabel: 'Pick target level',      iconBg: '#F59E0B' },
        { Icon: Download,   label: 'Download',          sublabel: 'Formatted Word file',    iconBg: '#10B981' },
    ];

    return (
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>

            {/* Header */}
            <div style={{ backgroundColor: NAVY, padding: '40px 24px' }}>
                <div style={{ maxWidth: '780px', margin: '0 auto' }}>
                    <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 700, marginBottom: '8px' }}>How It Works</h1>
                    <p style={{ color: '#C8D6E8', fontSize: '15px', margin: 0 }}>
                        From unit of competency to audit-ready assessment in minutes
                    </p>
                </div>
            </div>

            {/* Body */}
            <div style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 24px' }}>

                {/* Section 1 — What Clearpass Does */}
                <Section>
                    <SectionHeading text="What is Clearpass?" />
                    <p style={{ color: GREY_TEXT, fontSize: '14px', lineHeight: 1.7, marginBottom: '24px' }}>
                        Clearpass is an assessment building tool for RTOs, TAFEs, and training providers. Upload a Unit of
                        Competency and get a complete assessment written at the right reading level for your learners.
                        It also checks whether documents you already have are written at the right level, and rewrites them
                        if they are not. There are two main tools:
                    </p>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <FeatureCard
                            Icon={Search}
                            title="Level Check"
                            body="Upload any document and instantly see its reading level. If it is too complex for your learners, rewrite it to the right level with one click. Download the rewritten document as a formatted Word file ready to use."
                        />
                        <FeatureCard
                            Icon={Layers}
                            title="Build Assessment"
                            body="Upload a Unit of Competency and answer two questions about your learners. Clearpass builds a complete assessment matched to your cohort. Download the student booklet, competency mapping, and validation record."
                        />
                    </div>
                </Section>

                {/* Section 2 — Reading Level Scale (moved to second) */}
                <Section>
                    <SectionHeading text="Understanding reading levels" />
                    <p style={{ color: GREY_TEXT, fontSize: '14px', lineHeight: 1.7, marginBottom: '20px' }}>
                        Clearpass measures two scores: <strong>FKGL</strong> (Flesch-Kincaid Grade Level) and <strong>FRE</strong> (Flesch Reading Ease).
                        FKGL maps directly to US school grade — Grade 10 means a Year 10 student can read it comfortably.
                        FRE runs the opposite way — a higher score means easier reading.
                        These map to the eight bands below, which align with Australian AQF levels.
                    </p>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '560px' }}>
                            <thead>
                                <tr style={{ backgroundColor: NAVY, color: '#fff' }}>
                                    {['Band', 'FKGL', 'FRE', 'AQF / qualification level', 'Typical reader'].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { band: 'Very Easy',        fkgl: '≤ 3',  fre: '90–100', aqf: 'Pre-vocational',              reader: 'Early primary school' },
                                    { band: 'Easy',             fkgl: '4–5',  fre: '80–90',  aqf: 'Pre-vocational / Certificate I',reader: 'Upper primary school' },
                                    { band: 'Fairly Easy',      fkgl: '6–7',  fre: '70–80',  aqf: 'Certificate I / II',           reader: 'Year 7–8 student' },
                                    { band: 'Cert I/II · Yr 10',fkgl: '8–9',  fre: '60–70',  aqf: 'Certificate II / III',         reader: 'Year 9–10 student' },
                                    { band: 'Cert III/IV',      fkgl: '10–11',fre: '50–60',  aqf: 'Certificate III / IV',         reader: 'Working adult' },
                                    { band: 'Diploma',          fkgl: '12–13',fre: '30–50',  aqf: 'Diploma / Advanced Diploma',   reader: 'VET diploma student' },
                                    { band: 'Degree / Grad Dip',fkgl: '14–16',fre: '10–30',  aqf: 'Bachelor / Graduate Diploma',  reader: 'University student' },
                                    { band: 'Very Difficult',   fkgl: '17+',  fre: '< 10',   aqf: 'Postgraduate / Specialist',    reader: 'Academic or specialist' },
                                ].map(({ band, fkgl, fre, aqf, reader }, idx) => (
                                    <tr key={band} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                                        <td style={{ padding: '9px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: BAND_COLORS[idx], flexShrink: 0 }} />
                                            <span style={{ color: NAVY, fontWeight: 600 }}>{band}</span>
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
                        Scores are calculated using the Flesch-Kincaid formula applied to extracted text. Scanned PDFs and documents with heavy formatting may produce less accurate scores.
                    </p>
                </Section>

                {/* Section 3 — Build Workflow flowchart */}
                <Section>
                    <SectionHeading text="How to build an assessment" />
                    <p style={{ color: GREY_TEXT, fontSize: '14px', lineHeight: 1.7, marginBottom: '20px' }}>
                        Upload a Unit of Competency, answer two questions about your learners, and Clearpass builds the complete assessment in about three minutes.
                    </p>
                    <Flowchart accentColor="#3B82F6" nodes={buildNodes} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '20px' }}>
                        {[
                            { color: '#3B82F6', title: 'Upload your UoC', body: 'Paste the text or upload a Word or PDF file. Clearpass reads the elements, performance criteria, and evidence requirements automatically.' },
                            { color: '#8B5CF6', title: 'Set your cohort', body: 'Who are your learners? Do any need ESL or literacy support? These two answers set the reading level target.' },
                            { color: '#F59E0B', title: 'Review structure', body: 'Clearpass proposes required and optional sections based on the UoC. Confirm what to include before building.' },
                            { color: '#EF4444', title: 'AI builds it', body: 'Knowledge questions, observation checklist, workplace project, and marking guide — all written at your target level.' },
                            { color: '#10B981', title: 'Download 4 files', body: 'Student Booklet, Assessor Guide, Competency Mapping, and Validation Record — ready for delivery and audit.' },
                        ].map(({ color, title, body }) => (
                            <div key={title} style={{ borderLeft: `3px solid ${color}`, paddingLeft: '12px' }}>
                                <p style={{ fontWeight: 700, color: NAVY, fontSize: '13px', marginBottom: '4px' }}>{title}</p>
                                <p style={{ color: GREY_TEXT, fontSize: '12px', lineHeight: 1.6, margin: 0 }}>{body}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Section 4 — Level Check Workflow flowchart */}
                <Section>
                    <SectionHeading text="How to use Level Check" />
                    <p style={{ color: GREY_TEXT, fontSize: '14px', lineHeight: 1.7, marginBottom: '20px' }}>
                        Upload any document and check its reading level instantly. Rewrite it to the right level for your learners and download the formatted result.
                    </p>
                    <Flowchart accentColor="#8B5CF6" nodes={levelCheckNodes} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '20px' }}>
                        {[
                            { color: '#3B82F6', title: 'Upload your document', body: 'Drop in any Word or PDF file. Clearpass extracts the text and calculates the reading level immediately.' },
                            { color: '#8B5CF6', title: 'Read your scores', body: 'FKGL (grade level), FRE (ease score), and word count. The eight-band scale shows exactly where your document sits.' },
                            { color: '#F59E0B', title: 'Rewrite if needed', body: 'Click Rewrite. Choose the target level for your cohort. Clearpass rewrites every paragraph to match.' },
                            { color: '#10B981', title: 'Download', body: 'The rewritten document downloads as a formatted Word file with answer boxes and result tables already included.' },
                        ].map(({ color, title, body }) => (
                            <div key={title} style={{ borderLeft: `3px solid ${color}`, paddingLeft: '12px' }}>
                                <p style={{ fontWeight: 700, color: NAVY, fontSize: '13px', marginBottom: '4px' }}>{title}</p>
                                <p style={{ color: GREY_TEXT, fontSize: '12px', lineHeight: 1.6, margin: 0 }}>{body}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Section 5 — What You Get */}
                <Section>
                    <SectionHeading text="What you get from every build" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                        <GridItem Icon={ShieldCheck} title="Audit-ready documents"
                            body="Every document includes a competency mapping and validation record. These show ASQA auditors exactly how your assessment covers the unit requirements." />
                        <GridItem Icon={Target} title="Right reading level"
                            body="Every assessment is written at the level your learners can actually read. Not the level of the UoC, which is often written for assessors, not students." />
                        <GridItem Icon={Zap} title="Minutes, not days"
                            body="A full assessment with mapping and validation record takes about three minutes to build. A manual build takes a qualified assessor one to two days." />
                        <GridItem Icon={Files} title="Four documents, one click"
                            body="Student booklet, assessor guide, competency mapping, and validation record. Everything needed for validation and delivery, downloaded in one step." />
                        <GridItem Icon={RefreshCw} title="Any unit, any cohort"
                            body="Upload any UoC from any training package. Set your cohort once and Clearpass adjusts the reading level, section types, and occasion requirements automatically." />
                        <GridItem Icon={Building2} title="Shared work library"
                            body="Every assessment you build is saved to a shared library. Your whole team can access, edit, export, and continue working on any saved document." />
                    </div>
                </Section>

                {/* Section 6 — FAQ */}
                <Section>
                    <SectionHeading text="Common questions" />
                    <FAQ
                        q="Does Clearpass replace a qualified assessor?"
                        a="No. Clearpass writes the assessment and checks the reading level. A qualified assessor still needs to review and validate the tool before it is used. Clearpass produces the draft. You provide the professional judgement."
                    />
                    <FAQ
                        q="Is the assessment compliant with the Standards for RTOs?"
                        a="Clearpass builds assessments that map to the unit requirements and are written at an appropriate reading level. Your assessor and your RTO decide whether the tool meets the Standards for RTOs. Use the competency mapping document as evidence in your validation process."
                    />
                    <FAQ
                        q="What file types can I upload?"
                        a="Word documents (.docx) and PDF files. For best results with Level Check, upload a clean text-based PDF rather than a scanned document."
                    />
                    <FAQ
                        q="Can I edit the assessment after downloading?"
                        a="Yes. All documents download as Word files. Open them in Microsoft Word and edit as needed. The formatting, tables, and answer boxes are all editable."
                    />
                    <FAQ
                        q="What is the competency mapping document?"
                        a="A Word document that shows which question or task covers which performance criterion, knowledge evidence, and performance evidence requirement from the UoC. It gives auditors a direct line of sight from the assessment to the unit requirements."
                    />
                    <FAQ
                        q="Can I use Clearpass for multiple RTOs or qualifications?"
                        a="Yes. Clearpass works with any UoC from any endorsed training package. You can build assessments for Certificate II through to Advanced Diploma level."
                    />
                </Section>

            </div>

            {/* Get Started (full width) */}
            <div style={{ backgroundColor: NAVY, padding: '48px 24px' }}>
                <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>
                        Ready to build your first assessment?
                    </h2>
                    <p style={{ color: '#C8D6E8', fontSize: '15px', marginBottom: '28px' }}>
                        Upload a Unit of Competency and have a complete assessment ready in three minutes.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => navigate('/build')}
                            style={{
                                backgroundColor: GOLD, color: NAVY,
                                border: 'none', borderRadius: '8px',
                                padding: '12px 28px', fontSize: '14px', fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            Build an assessment
                        </button>
                        <button
                            onClick={() => navigate('/level-check')}
                            style={{
                                backgroundColor: 'transparent', color: '#fff',
                                border: '1px solid rgba(255,255,255,0.4)', borderRadius: '8px',
                                padding: '12px 28px', fontSize: '14px', fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            Check a document
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}