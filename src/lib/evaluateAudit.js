import { base44 } from '@/api/base44Client';
import { calculateReadability } from '@/lib/calculateReadability';
import { callWithRetry } from '@/lib/buildUtils';
import { UNEVALUATED, buildTextIndex, verifyEvidence, normalizeAC } from '@/lib/auditValidation';

// ── Shared constants ──────────────────────────────────────────────────────────

export const LEARNER_OPTIONS = [
    { value: 'high_school', label: 'High school students', feedback: "High school students: we'll use a junior secondary reading level." },
    { value: 'apprentices', label: 'Apprentices and trainees', feedback: "Apprentices and trainees: standard working adult literacy assumed." },
    { value: 'working_adults', label: 'Working adults', feedback: "Working adults: standard adult literacy assumed." },
    { value: 'university', label: 'University students', feedback: "University students: we'll use a higher academic reading level." },
];

export const SUPPORT_OPTIONS = [
    { value: 'none', label: 'No — most learners read English comfortably' },
    { value: 'esl', label: 'Yes — some learners speak English as a second language (ESL)' },
    { value: 'literacy', label: 'Yes — some learners need extra literacy support' },
    { value: 'both', label: 'Yes — ESL and literacy support needed' },
];

export const BAND_FKGL = {
    'Very Easy': 3, 'Easy': 4.5, 'Fairly Easy': 6.5, 'Cert I/II · Yr 10': 8.5,
    'Cert III/IV': 10.5, 'Diploma': 12.5, 'Degree / Grad Dip': 15, 'Very Difficult': 18,
};

export const BAND_MAP = {
    high_school:    { none: 'Cert I/II · Yr 10', esl: 'Easy', literacy: 'Easy', both: 'Very Easy' },
    apprentices:    { none: 'Cert III/IV', esl: 'Cert I/II · Yr 10', literacy: 'Cert I/II · Yr 10', both: 'Fairly Easy' },
    working_adults: { none: 'Cert III/IV', esl: 'Cert I/II · Yr 10', literacy: 'Cert I/II · Yr 10', both: 'Fairly Easy' },
    university:     { none: 'Diploma', esl: 'Cert III/IV', literacy: 'Cert III/IV', both: 'Cert I/II · Yr 10' },
};

export function getBand(learner, support) {
    return (BAND_MAP[learner] || {})[support] || 'Cert III/IV';
}

export const NO_DASH = 'CRITICAL STYLE RULE: Never use em dashes or en dashes anywhere in your output. Use a colon to introduce a list, a full stop to separate two complete thoughts, and a comma to join closely related ideas. Do not use dashes.\n\n';

export async function llmCall(prompt) {
    return base44.integrations.Core.InvokeLLM({ prompt: NO_DASH + prompt, model: 'claude_sonnet_4_6' });
}

export function parseAIJson(response) {
    let clean = (typeof response === 'string' ? response : JSON.stringify(response)).trim();
    clean = clean.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('AI response did not contain valid JSON');
    return JSON.parse(clean.substring(start, end + 1));
}

// ── Requirement tagging (ID-based) ────────────────────────────────────────────

export function tagPE(unitCode, peList) {
    return peList.map((pe, i) => ({ id: `${unitCode}-PE-${i + 1}`, text: pe }));
}

export function tagKE(unitCode, keList) {
    return keList.map((ke, i) => ({
        id: `${unitCode}-KE-${i + 1}`,
        text: ke.subItems ? `${ke.text}: ${ke.subItems.join(', ')}` : ke.text,
    }));
}

export function tagPC(unitCode, elements) {
    const pcs = [];
    for (const el of elements) {
        for (const pc of (el.performanceCriteria || [])) {
            pcs.push({
                id: `${unitCode}-${pc.ref}`,
                ref: pc.ref,
                text: pc.text,
                elementNumber: el.number,
                elementTitle: el.title,
            });
        }
    }
    return pcs;
}

// ── Validation against TGA source (anti-hallucination) ────────────────────────

function normalizeStatus(status, isPC) {
    const s = (status || '').toUpperCase();
    if (isPC) {
        if (s === 'MAPPED') return 'MAPPED';
        if (s.includes('PARTIAL')) return 'PARTIALLY MAPPED';
        if (s === 'NOT MAPPED') return 'NOT MAPPED';
        return 'Could not be evaluated';
    }
    if (s === 'COVERED') return 'COVERED';
    if (s.includes('PARTIAL')) return 'PARTIALLY COVERED';
    if (s === 'NOT COVERED') return 'NOT COVERED';
    return 'Could not be evaluated';
}

function reqText(t) {
    if (typeof t === 'string') return t;
    return t.subItems ? `${t.text}: ${t.subItems.join(', ')}` : t.text;
}

function validateResponse(unitCode, type, tgaItems, llmResults, isPC) {
    const validIds = tgaItems.map((t, i) => isPC ? `${unitCode}-${t.ref}` : `${unitCode}-${type}-${i + 1}`);
    const tgaMap = new Map(validIds.map((id, i) => [id, tgaItems[i]]));
    const validated = [];
    const seen = new Set();

    for (const item of (llmResults || [])) {
        const id = item.id;
        if (!id || !tgaMap.has(id) || seen.has(id)) continue; // discard hallucinated / dupes
        seen.add(id);
        const tga = tgaMap.get(id);
        if (isPC) {
            validated.push({
                id,
                ref: tga.ref,
                text: tga.text,
                status: normalizeStatus(item.status, true),
                mappedTo: item.mappedTo || '',
                gap: item.gap || '',
            });
        } else {
            validated.push({
                id,
                requirement: reqText(tga),
                status: normalizeStatus(item.status),
                coverage: item.coverage || '',
                gap: item.gap || '',
            });
        }
    }

    // Add missing TGA items as "Could not be evaluated"
    for (const id of validIds) {
        if (!seen.has(id)) {
            const tga = tgaMap.get(id);
            if (isPC) {
                validated.push({
                    id,
                    ref: tga.ref,
                    text: tga.text,
                    status: 'Could not be evaluated',
                    mappedTo: '',
                    gap: 'This performance criterion could not be located in the assessment.',
                });
            } else {
                validated.push({
                    id,
                    requirement: reqText(tga),
                    status: 'Could not be evaluated',
                    coverage: '',
                    gap: 'This requirement could not be located in the assessment.',
                });
            }
        }
    }

    return validated;
}

export function validatePEResponse(unitCode, tgaPE, llmResults) {
    return validateResponse(unitCode, 'PE', tgaPE, llmResults, false);
}

export function validateKEResponse(unitCode, tgaKE, llmResults) {
    return validateResponse(unitCode, 'KE', tgaKE, llmResults, false);
}

export function validateACResponse(unitCode, tgaAC, llmResults) {
    return validateResponse(unitCode, 'AC', tgaAC, llmResults, false);
}

export function validatePCResponse(unitCode, tgaElements, llmResults) {
    const taggedPC = tagPC(unitCode, tgaElements);
    return validateResponse(unitCode, 'PC', taggedPC, llmResults, true);
}

// Reconstruct elements structure from validated PCs
export function reconstructElements(unitCode, tgaElements, validatedPCs) {
    const pcMap = new Map(validatedPCs.map(v => [v.id, v]));
    return tgaElements.map(el => {
        const pcs = (el.performanceCriteria || []).map(pc => {
            const id = `${unitCode}-${pc.ref}`;
            const v = pcMap.get(id);
            return {
                id,
                label: `PC ${pc.ref}`,
                ref: pc.ref,
                text: pc.text,
                status: v?.status || 'Could not be evaluated',
                mappedTo: v?.mappedTo || '',
                gap: v?.gap || '',
                fix: v?.fix || '',
                evidence: v?.evidence || '',
                rationale: v?.rationale || '',
                evidenceVerified: v?.evidenceVerified ?? null,
            };
        });
        const mappedCount = pcs.filter(p => p.status === 'MAPPED').length;
        const partialCount = pcs.filter(p => p.status === 'PARTIALLY MAPPED').length;
        const status = mappedCount === pcs.length && pcs.length > 0
            ? 'MAPPED'
            : (mappedCount + partialCount === pcs.length && mappedCount > 0)
                ? 'PARTIALLY MAPPED'
                : 'NOT MAPPED';
        return { number: el.number, title: el.title, status, performanceCriteria: pcs };
    });
}

// ── Per-unit audit runner ─────────────────────────────────────────────────────

const CHUNK = 8;

// Calls the LLM in small batches so no requirement is dropped; re-asks once for any ID still missing.
async function auditInChunks(tagged, key, buildPrompt, stats) {
    const results = [];
    const askBatch = async (batch) => {
        try {
            const parsed = await callWithRetry(async () => parseAIJson(await llmCall(buildPrompt(batch))), 2);
            results.push(...(parsed[key] || []));
        } catch (e) {
            stats.failedBatches++;
            console.error(`${key} batch failed:`, e.message);
        }
    };
    for (let i = 0; i < tagged.length; i += CHUNK) await askBatch(tagged.slice(i, i + CHUNK));
    const seen = new Set(results.map(r => r.id));
    const missing = tagged.filter(t => !seen.has(t.id));
    for (let i = 0; i < missing.length; i += 4) await askBatch(missing.slice(i, i + 4));
    return results;
}

const AUDITOR_RULES = (code, example) => `You are a strict RTO compliance auditor. Each requirement below has an ID (e.g. ${example}). You MUST return a result for EVERY ID listed, using the exact same ID. Do not invent IDs. Do not omit any ID.\n\nMark an item as fully covered ONLY when the assessment substantively addresses every part of the requirement (all listed sub-items, all stated numbers, frequencies, contexts and conditions). If any part is missing, the item is partial. If nothing addresses it, it is not covered.\n\nEvidence rule: for every covered or partial item, "evidence" must be a short quote (maximum 300 characters) copied word for word from the ASSESSMENT TEXT. Table cells are separated by " | ". Never paraphrase or invent a quote. If you cannot quote text that addresses the requirement, the item is not covered and evidence is "none found".\n\nFor every item that is not fully covered, the "gap" field must explain exactly which part is missing, and "fix" must give a specific, ready-to-apply change to the assessment. "reason" is one plain sentence explaining why you chose the status. Judge only against the requirement text given. Do not add or assume any regulatory, licensing or assessor qualification requirements that are not in the requirement text.\n\nReturn ONLY valid JSON. No explanation. No markdown fences.\n\n`;

const FAIL_CLOSED_GAP = 'The audit cited evidence that could not be found in the text read from your document, so this result could not be confirmed.';

// Attaches display label, evidence, rationale and fix, and fails closed when the cited evidence is not in the document.
function finalize(results, raw, type, index, labeller) {
    const byId = new Map(raw.map(r => [r.id, r]));
    let unverified = 0;
    if (type !== 'PC') results.sort((a, b) => parseInt(a.id.split('-').pop(), 10) - parseInt(b.id.split('-').pop(), 10));
    results.forEach((r, i) => {
        const rr = byId.get(r.id) || {};
        r.label = labeller(r, i);
        r.fix = rr.fix || '';
        r.rationale = rr.reason || '';
        r.evidence = (type === 'PC' ? rr.evidence : rr.coverage) || '';
        r.evidenceVerified = null;
        const full = r.status === 'COVERED' || r.status === 'MAPPED';
        const partial = r.status === 'PARTIALLY COVERED' || r.status === 'PARTIALLY MAPPED';
        if (!full && !partial) return;
        r.evidenceVerified = verifyEvidence(r.evidence, index);
        if (r.evidenceVerified) return;
        unverified++;
        if (full && type !== 'AC') {
            r.status = UNEVALUATED;
            r.gap = FAIL_CLOSED_GAP;
        }
    });
    return unverified;
}

export async function runUnitAudit(unit, unitIndex, totalUnits, assessableText, onProgress, fullText) {
    const { code, uocData } = unit;
    const peList = uocData?.performanceEvidence || [];
    const keList = uocData?.knowledgeEvidence || [];
    const acList = normalizeAC(uocData?.assessmentConditions || []);
    const elements = uocData?.elements || [];
    const index = buildTextIndex(fullText || assessableText);
    const stats = { failedBatches: 0 };

    const taggedPE = tagPE(code, peList);
    const taggedKE = tagKE(code, keList);
    const taggedPC = tagPC(code, elements);
    const taggedAC = acList.map((c, i) => ({ id: `${code}-AC-${i + 1}`, text: c }));

    const perUnit = 70 / totalUnits;
    const unitStart = 10 + unitIndex * perUnit;
    const perCall = perUnit / 4;
    const label = `(unit ${unitIndex + 1} of ${totalUnits})`;

    const evidencePrompt = (title, key, example) => (batch) =>
        `${AUDITOR_RULES(code, example)}Use ONLY these statuses: COVERED, PARTIALLY COVERED, NOT COVERED.\n\n{\n  "${key}": [\n    {\n      "id": "${example}",\n      "status": "COVERED | PARTIALLY COVERED | NOT COVERED",\n      "coverage": "exact quote from the assessment text, or none found",\n      "reason": "one sentence explaining the status",\n      "gap": "what is missing (empty if COVERED)",\n      "fix": "specific change to make (empty if COVERED)"\n    }\n  ]\n}\n\n${title}:\n${batch.map(t => `${t.id}: ${t.text}`).join('\n')}\n\nASSESSMENT TEXT:\n${assessableText}`;

    onProgress(Math.round(unitStart), `Checking performance evidence for ${code} ${label}...`);
    const peRaw = await auditInChunks(taggedPE, 'performanceEvidence', evidencePrompt('PERFORMANCE EVIDENCE REQUIREMENTS', 'performanceEvidence', `${code}-PE-1`), stats);
    const peResults = validatePEResponse(code, peList, peRaw);

    onProgress(Math.round(unitStart + perCall), `Checking knowledge evidence for ${code} ${label}...`);
    const keRaw = await auditInChunks(taggedKE, 'knowledgeEvidence', evidencePrompt('KNOWLEDGE EVIDENCE REQUIREMENTS', 'knowledgeEvidence', `${code}-KE-1`), stats);
    const keResults = validateKEResponse(code, keList, keRaw);

    onProgress(Math.round(unitStart + perCall * 2), `Mapping performance criteria for ${code} ${label}...`);
    const pcRaw = await auditInChunks(taggedPC, 'performanceCriteria', (batch) =>
        `${AUDITOR_RULES(code, `${code}-1.1`)}Use ONLY these statuses: MAPPED, PARTIALLY MAPPED, NOT MAPPED.\n\n{\n  "performanceCriteria": [\n    {\n      "id": "${code}-1.1",\n      "ref": "1.1",\n      "status": "MAPPED | PARTIALLY MAPPED | NOT MAPPED",\n      "mappedTo": "section name or none found",\n      "evidence": "exact quote from the assessment text, or none found",\n      "reason": "one sentence explaining the status",\n      "gap": "what is missing (empty if MAPPED)",\n      "fix": "specific change to make (empty if MAPPED)"\n    }\n  ]\n}\n\nPERFORMANCE CRITERIA:\n${batch.map(t => `${t.id} (Element ${t.elementNumber}): ${t.text}`).join('\n')}\n\nASSESSMENT TEXT:\n${assessableText}`, stats);
    const validatedPCs = validatePCResponse(code, elements, pcRaw);

    onProgress(Math.round(unitStart + perCall * 3), `Checking assessment conditions for ${code} ${label}...`);
    const acRaw = await auditInChunks(taggedAC, 'assessmentConditions', evidencePrompt('ASSESSMENT CONDITIONS (the assessment must be set up so each condition is met, e.g. environment, resources, interaction with others)', 'assessmentConditions', `${code}-AC-1`), stats);
    const acResults = validateACResponse(code, acList, acRaw);

    let unverified = 0;
    unverified += finalize(peResults, peRaw, 'PE', index, (r, i) => `PE${i + 1}`);
    unverified += finalize(keResults, keRaw, 'KE', index, (r, i) => `KE${i + 1}`);
    unverified += finalize(acResults, acRaw, 'AC', index, (r, i) => `AC${i + 1}`);
    unverified += finalize(validatedPCs, pcRaw, 'PC', index, (r) => `PC ${r.ref}`);

    const elementsResults = reconstructElements(code, elements, validatedPCs);

    const unevaluated = [...peResults, ...keResults, ...acResults, ...validatedPCs].filter(r => r.status === UNEVALUATED).length;

    onProgress(Math.round(unitStart + perCall * 4), '');

    return { peResults, keResults, acResults, elementsResults, diagnostics: { failedBatches: stats.failedBatches, unverified, unevaluated } };
}

// ── Section extraction (full text, no slicing) ────────────────────────────────

export async function extractSections(assessableText, wordCount) {
    try {
        const r = await llmCall(
            `You are an RTO assessment analyst. Extract and classify every section of the assessment text provided.\n\nReturn ONLY valid JSON. No explanation. No markdown fences.\n\n{\n  "sections": [\n    {\n      "name": "section name or heading",\n      "type": "Knowledge Questions | Observation Checklist | Workplace Project | Verbal Questions | Case Study | Third Party Report | Other",\n      "evidenceCategory": "Knowledge Evidence | Performance Evidence | Product Evidence | Indirect Evidence",\n      "items": ["item 1 text", "item 2 text"],\n      "itemCount": 3,\n      "wordCount": 450\n    }\n  ],\n  "totalWordCount": 1200,\n  "sectionCount": 3\n}\n\nSection type rules:\n- Questions starting with Q1, Q2 etc or numbered questions: Knowledge Questions\n- Checklist with tick boxes or observable behaviours: Observation Checklist\n- Steps or tasks to complete over time: Workplace Project\n- Questions marked verbal or oral: Verbal Questions\n- Scenario followed by questions: Case Study\n- Form for supervisor or third party: Third Party Report\n\nASSESSMENT TEXT:\n${assessableText}`
        );
        const parsed = parseAIJson(r);
        let sections = parsed.sections || [];
        sections = sections.map(s => {
            const sectionText = (s.items || []).join(' ');
            let readability = null;
            try {
                if (sectionText.trim().length > 30) {
                    readability = calculateReadability(sectionText);
                }
            } catch (e) { /* skip */ }
            return { ...s, _readability: readability };
        });
        return sections;
    } catch (e) {
        console.error('Section extraction failed:', e.message);
        return [{ name: 'Could not be evaluated', type: 'Other', items: [assessableText.slice(0, 500)], itemCount: 1, wordCount, _readability: null }];
    }
}

// ── Gap collection across all units ───────────────────────────────────────────

export function collectGaps(unitResults) {
    const gaps = [];
    for (const unit of unitResults) {
        const { unitCode, unitTitle, peResults, keResults, acResults = [], elementsResults } = unit;
        const extra = r => ({ label: r.label || '', reason: r.gap || '', evidence: r.evidence || r.coverage || '', fix: r.fix || '' });
        const gapKind = (status, fallback) => (status === 'Could not be evaluated' ? 'COULD NOT BE EVALUATED' : status || fallback);
        for (const [type, list] of [['PE', peResults], ['KE', keResults], ['AC', acResults]]) {
            for (const r of list) {
                if (r.status !== 'COVERED') {
                    gaps.push({ unitCode, unitTitle, type, id: r.id, requirement: r.requirement, gapType: gapKind(r.status), ...extra(r) });
                }
            }
        }
        const allPCs = elementsResults.flatMap(e => (e.performanceCriteria || []));
        for (const pc of allPCs) {
            if (pc.status !== 'MAPPED') {
                gaps.push({ unitCode, unitTitle, type: 'PC', id: `${unitCode}-${pc.ref}`, requirement: pc.text, gapType: gapKind(pc.status), ...extra(pc) });
            }
        }
    }
    return gaps;
}

// ── Gap recommendations (chunked to avoid truncation) ──────────────────────────

export async function runGapRecommendations(allGaps, chunkSize = 10) {
    const allRecs = [];
    for (let i = 0; i < allGaps.length; i += chunkSize) {
        const sliced = allGaps.slice(i, i + chunkSize);
        const batchNum = Math.floor(i / chunkSize) + 1;
        sliced.filter(g => g.gapType === 'COULD NOT BE EVALUATED').forEach(g => allRecs.push({
            ...g,
            recommendedSectionType: '',
            recommendation: 'This requirement could not be confirmed automatically. Check it manually against the assessment.',
            minimumContent: [], exampleContent: '',
        }));
        const batch = sliced.filter(g => g.gapType !== 'COULD NOT BE EVALUATED');
        if (batch.length === 0) continue;
        try {
            const r = await llmCall(
                `You are an RTO assessment designer. Based on the coverage audit results, write specific recommendations for each gap.\n\nReturn ONLY valid JSON. No explanation. No markdown fences.\n\n{\n  "gaps": [\n    {\n      "id": "the gap id from the input",\n      "requirement": "PE or KE or PC reference and text",\n      "gapType": "NOT COVERED | PARTIALLY COVERED | NOT MAPPED | PARTIALLY MAPPED",\n      "recommendedSectionType": "exact type name",\n      "recommendation": "plain English description of what to add",\n      "minimumContent": ["required field 1", "required field 2"],\n      "exampleContent": "Complete ready-to-use example the assessor can adapt directly. See rules below."\n    }\n  ]\n}\n\nRULES FOR exampleContent:\n- Write at FKGL 9 to 11 (plain workplace language, not academic)\n- Match the section type: write a question for Knowledge Questions, write a task step for Project tasks or Observation Checklists\n- Include a model answer guide with 3 to 5 key points\n- Include an S/NYS decision field label\n- Keep the total under 200 words\n- Do not use em dashes anywhere\n- Label the model answer clearly: Model answer guide:\n\nExample format for a knowledge question gap:\nExample question:\nQ[n]. [Question text here]\n\nModel answer guide:\nA satisfactory response must include:\n- [Key point 1]\n- [Key point 2]\n- [Key point 3]\n\nAssessor decision: S / NYS\n\nExample format for a project task or observation gap:\nExample task step:\nStep [n]: [Task instruction here]\n\nWhat to look for:\n- [Observable indicator 1]\n- [Observable indicator 2]\n- [Observable indicator 3]\n\nAssessor decision: S / NYS\n\nThese are suggestions only. Do not state or invent regulatory, licensing or assessor qualification requirements that are not in the requirement text given.\n\nYou MUST return one gap object for EVERY gap id in the input below. Use the exact same id. Do not invent ids. Do not omit any id.\n\nGAPS (batch ${batchNum}):\n${JSON.stringify(batch)}`
            );
            const parsed = parseAIJson(r);
            const batchGaps = parsed.gaps || [];
            const batchIds = new Set(batch.map(g => g.id));
            for (const g of batchGaps) {
                if (g.id && batchIds.has(g.id)) {
                    const orig = batch.find(b => b.id === g.id);
                    allRecs.push({ ...g, requirement: orig.requirement, gapType: orig.gapType, unitCode: orig.unitCode, unitTitle: orig.unitTitle, reason: orig.reason, evidence: orig.evidence, fix: orig.fix });
                }
            }
            const seenIds = new Set(batchGaps.map(g => g.id));
            for (const g of batch) {
                if (!seenIds.has(g.id)) {
                    allRecs.push({
                        id: g.id, unitCode: g.unitCode, unitTitle: g.unitTitle,
                        requirement: g.requirement, gapType: g.gapType,
                        reason: g.reason, evidence: g.evidence, fix: g.fix,
                        recommendedSectionType: 'Knowledge Questions',
                        recommendation: 'Review and add coverage for this requirement.',
                        minimumContent: [], exampleContent: '',
                    });
                }
            }
        } catch (e) {
            console.error(`Gap batch ${batchNum} failed:`, e.message);
            for (const g of batch) {
                allRecs.push({
                    id: g.id, unitCode: g.unitCode, unitTitle: g.unitTitle,
                    requirement: g.requirement, gapType: g.gapType,
                    reason: g.reason, evidence: g.evidence, fix: g.fix,
                    recommendedSectionType: 'Knowledge Questions',
                    recommendation: 'Review and add coverage for this requirement.',
                    minimumContent: [], exampleContent: '',
                });
            }
        }
    }
    const labelById = new Map(allGaps.map(g => [g.id, g.label]));
    return allRecs.map(r => ({ ...r, label: r.label || labelById.get(r.id) || '' }));
}

// ── Report text generation ────────────────────────────────────────────────────

export async function generateReportText(units, results, cohort) {
    const cohortSummary = `${cohort.band} level (FKGL ${cohort.targetFKGL}), learner type: ${cohort.learner}, support: ${cohort.support}`;
    const unitLines = results.units.map(u => {
        const peCov = u.peResults.filter(r => r.status === 'COVERED').length;
        const keCov = u.keResults.filter(r => r.status === 'COVERED').length;
        const allPCs = u.elementsResults.flatMap(e => e.performanceCriteria || []);
        const pcMap = allPCs.filter(p => p.status === 'MAPPED').length;
        return `Unit ${u.unitCode} ${u.unitTitle}: PE ${peCov}/${u.peResults.length} covered, KE ${keCov}/${u.keResults.length} covered, PC ${pcMap}/${allPCs.length} mapped, verdict ${u.unitVerdict}`;
    }).join('\n');
    try {
        const r = await llmCall(
            `You are writing an RTO compliance report. Write clear, professional plain English. Do not use em dashes. Use full stops between sentences. Do not use bullet points. Write in prose with numbered lists where needed.\n\nWrite a compliance audit report with these sections:\n1. Executive Summary (3-4 sentences covering all units)\n2. Assessment Overview (what sections were found)\n3. Readability Summary (how each section scored against target)\n4. Coverage Analysis (per-unit PE, KE, PC findings in prose)\n5. Gaps and Recommendations (what needs to be added, per unit)\n6. Instrument Adequacy: state ${results.overallVerdict}\n\nCOHORT: ${cohortSummary}\nREADABILITY TARGET: FKGL ${cohort.targetFKGL}\n\nSECTIONS FOUND: ${results.sections.map(s => s.name + ' (' + s.type + ')').join(', ')}\n\n${unitLines}\n\nTOTAL GAPS: ${results.units.reduce((sum, u) => sum + u.gaps.length, 0)} identified`
        );
        return typeof r === 'string' ? r : JSON.stringify(r);
    } catch (e) {
        console.error('Report text failed:', e.message);
        return `Compliance Audit Report\n${units.map(u => u.code).join(', ')}\n\nOverall verdict: ${results.overallVerdict}\n\n${results.summaryStatement || ''}\n\nOne or more report sections could not be completed. Download the partial report for available findings.`;
    }
}

// ── extractAssessableContent (with unit-code header support) ───────────────────

export function extractAssessableContent(fullText) {
    let startIdx = -1;

    // Strategy 1: S/NS marker
    const snsRegex = /\bS\s*\/\s*N\s*Y?\s*S\b|\bNYS\b/;
    const snsMatch = fullText.match(snsRegex);
    if (snsMatch) {
        const lookback = Math.max(0, snsMatch.index - 600);
        const before = fullText.substring(lookback, snsMatch.index);
        const lastBreak = Math.max(before.lastIndexOf('\n\n'), before.lastIndexOf('\r\n\r\n'));
        startIdx = lastBreak > 0 ? lookback + lastBreak : lookback;
    }

    // Strategy 2: Written questions headings
    if (startIdx === -1) {
        const headings = [
            'ASSESSMENT 1: WRITTEN QUESTIONS', 'ASSESSMENT TASK 1: WRITTEN QUESTIONS',
            'Assessment 1: Written Questions', 'Assessment Task 1: Written Questions',
            'WRITTEN QUESTIONS\n', 'Written Questions\n',
        ];
        for (const heading of headings) {
            const idx = fullText.indexOf(heading);
            if (idx !== -1) { startIdx = idx; break; }
        }
    }

    // Strategy 3: First Q1 pattern
    if (startIdx === -1) {
        const q1Match = fullText.match(/(?:^|\n)(?:Q1\b|Question 1\b|\b1\.\s+[A-Z])/m);
        if (q1Match) startIdx = q1Match.index;
    }

    // Strategy 4: Last occurrence of ASSESSMENT 1:
    if (startIdx === -1) {
        const assessmentMarkers = ['ASSESSMENT 1:', 'Assessment 1:', 'ASSESSMENT TASK 1:', 'Assessment Task 1:'];
        for (const marker of assessmentMarkers) {
            let searchFrom = 0, lastFound = -1;
            while (true) {
                const idx = fullText.indexOf(marker, searchFrom);
                if (idx === -1) break;
                lastFound = idx; searchFrom = idx + 1;
            }
            if (lastFound !== -1) { startIdx = lastFound; break; }
        }
    }

    // Strategy 5: Unit-code-style headers (e.g. BSBLDR413 — or BSBLDR413:)
    if (startIdx === -1) {
        const unitHeaderRegex = /\b([A-Z]{3,6}\d{3,5})\s*[—\-:]/m;
        const unitMatch = fullText.match(unitHeaderRegex);
        if (unitMatch) startIdx = unitMatch.index;
    }

    if (startIdx === -1) return fullText;

    let assessable = fullText.substring(startIdx);

    const endMarkers = [
        'TO BE COMPLETED BY THE ASSESSOR', 'ASSESSOR DECLARATION',
        'RECORD OF ASSESSMENT OUTCOMES', 'ASSESSOR USE ONLY',
        'ADMIN USE ONLY', 'Version control',
    ];

    let endIdx = -1;
    for (const marker of endMarkers) {
        let searchFrom = 0, lastFound = -1;
        while (true) {
            const idx = assessable.indexOf(marker, searchFrom);
            if (idx === -1) break;
            lastFound = idx; searchFrom = idx + 1;
        }
        if (lastFound !== -1 && (endIdx === -1 || lastFound < endIdx)) {
            endIdx = lastFound;
        }
    }

    if (endIdx !== -1) assessable = assessable.substring(0, endIdx);

    const result = assessable.trim();

    if (result.length < 200) {
        console.warn('extractAssessableContent: result too short (' + result.length + ' chars). Returning full text.');
        return fullText;
    }

    return result;
}

// ── Cluster key helpers ───────────────────────────────────────────────────────

export function clusterKey(units) {
    return [...units].map(u => u.code).sort().join('|');
}

export function clusterLabel(units) {
    return units.map(u => u.code).join(', ');
}