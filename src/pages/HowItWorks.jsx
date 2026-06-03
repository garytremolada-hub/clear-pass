import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
    FileText, Search, Layers, ShieldCheck, Target, Zap,
    Files, RefreshCw, Building2, ChevronDown, ChevronUp,
} from 'lucide-react';

const NAVY = '#0D2444';
const GOLD = '#C9A84C';
const GREY_TEXT = '#374151';
const BORDER = '#E5E7EB';

// ── Step component ────────────────────────────────────────────────────────────
function Step({ num, title, description, last }) {
    return (
        <div style={{ display: 'flex', gap: '16px', marginBottom: last ? 0 : '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: NAVY, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '14px', flexShrink: 0,
                }}>
                    {num}
                </div>
                {!last && <div style={{ flex: 1, width: '2px', backgroundColor: BORDER, marginTop: '6px' }} />}
            </div>
            <div style={{ paddingBottom: last ? 0 : '24px' }}>
                <p style={{ fontWeight: 700, color: NAVY, fontSize: '15px', marginBottom: '4px', lineHeight: 1.4 }}>{title}</p>
                <p style={{ color: GREY_TEXT, fontSize: '14px', lineHeight: 1.7, margin: 0 }}>{description}</p>
            </div>
        </div>
    );
}

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

function WorkflowCard({ subtitle, children }) {
    return (
        <div style={{
            borderLeft: `4px solid ${GOLD}`,
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            padding: '24px',
        }}>
            <p style={{ color: GOLD, fontWeight: 600, fontSize: '13px', marginBottom: '20px' }}>{subtitle}</p>
            {children}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HowItWorks() {
    const navigate = useNavigate();

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

                {/* Section 2 — Build Workflow */}
                <Section>
                    <SectionHeading text="How to build an assessment" />
                    <WorkflowCard subtitle="It takes about three minutes.">
                        <Step num={1} title="Upload your Unit of Competency"
                            description="Paste the UoC text or upload a Word or PDF file. Clearpass reads the elements, performance criteria, knowledge evidence, and performance evidence automatically." />
                        <Step num={2} title="Tell us about your learners"
                            description="Answer two questions: who your learners are (high school students, apprentices, working adults, or university students) and whether any learners need extra support such as ESL or literacy assistance. This sets the reading level target for your assessment." />
                        <Step num={3} title="Review the assessment structure"
                            description="Clearpass shows you the sections it plans to build based on the UoC requirements. You can lock in required sections and choose optional ones. Confirm when you are ready." />
                        <Step num={4} title="Clearpass builds your assessment"
                            description="The assessment is built in stages. Knowledge questions, observation checklist, workplace project, and verbal questions are written at the reading level you confirmed. A progress bar shows each stage." />
                        <Step num={5} title="Download your documents" last
                            description="Four files are ready to download: Student Booklet (the assessment your learner completes), Assessor Guide (model answers and marking criteria), Competency Mapping (shows which question covers which requirement), and Validation Record (one-page sign-off for your audit folder)." />
                    </WorkflowCard>
                </Section>

                {/* Section 3 — Level Check Workflow */}
                <Section>
                    <SectionHeading text="How to use Level Check" />
                    <WorkflowCard subtitle="Check and fix any document in seconds.">
                        <Step num={1} title="Upload your document"
                            description="Drop in any Word or PDF file. Clearpass extracts the text and calculates its reading level instantly." />
                        <Step num={2} title="Read your scores"
                            description="You get three numbers: Reading Grade Level, Reading Ease Score, and Word Count. The scale shows you where your document sits across eight bands from Very Easy to Very Difficult." />
                        <Step num={3} title="Rewrite if needed"
                            description="If the reading level does not match your learners, click Rewrite to different level. Choose the target level and Clearpass rewrites the document to match." />
                        <Step num={4} title="Download the rewritten document" last
                            description="The rewritten document downloads as a professionally formatted Word file with answer boxes and result tables already included. Ready to use immediately." />
                    </WorkflowCard>
                </Section>

                {/* Section 3b — Reading Level Scale */}
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
                                    { band: 'Very Easy', fkgl: '≤ 3', fre: '90–100', aqf: 'Pre-vocational', reader: 'Early primary school', bg: '#ffffff' },
                                    { band: 'Easy', fkgl: '4–5', fre: '80–90', aqf: 'Pre-vocational / Certificate I', reader: 'Upper primary school', bg: '#f9fafb' },
                                    { band: 'Fairly Easy', fkgl: '6–7', fre: '70–80', aqf: 'Certificate I / II', reader: 'Year 7–8 student', bg: '#ffffff' },
                                    { band: 'Cert I/II · Yr 10', fkgl: '8–9', fre: '60–70', aqf: 'Certificate II / III', reader: 'Year 9–10 student', bg: '#f9fafb' },
                                    { band: 'Cert III/IV', fkgl: '10–11', fre: '50–60', aqf: 'Certificate III / IV', reader: 'Working adult', bg: '#ffffff' },
                                    { band: 'Diploma', fkgl: '12–13', fre: '30–50', aqf: 'Diploma / Advanced Diploma', reader: 'VET diploma student', bg: '#f9fafb' },
                                    { band: 'Degree / Grad Dip', fkgl: '14–16', fre: '10–30', aqf: 'Bachelor / Graduate Diploma', reader: 'University student', bg: '#ffffff' },
                                    { band: 'Very Difficult', fkgl: '17+', fre: '< 10', aqf: 'Postgraduate / Specialist', reader: 'Academic or specialist', bg: '#f9fafb' },
                                ].map(({ band, fkgl, fre, aqf, reader, bg }) => (
                                    <tr key={band} style={{ backgroundColor: bg }}>
                                        <td style={{ padding: '9px 12px', color: NAVY, fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>{band}</td>
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
                        Scores are calculated using the Flesch-Kincaid formula applied to extracted text. Scanned PDFs and documents with heavy formatting may produce less accurate scores. Results are for guidance only — always review with a qualified assessor.
                    </p>
                </Section>

                {/* Section 4 — What You Get */}
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

                {/* Section 5 — FAQ */}
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

            {/* Section 6 — Get Started (full width) */}
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