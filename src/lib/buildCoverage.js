import { runUnitAudit, collectGaps, llmCall, parseAIJson } from '@/lib/evaluateAudit';

async function auditUnit(unit, index, total, assessmentText, onProgress) {
    const r = await runUnitAudit({ code: unit.code, uocData: unit.uocData }, index, total, assessmentText, onProgress);
    return { unitCode: unit.code, unitTitle: unit.title, ...r };
}

// Ask the LLM to write extra questions / observation items that close the listed gaps.
async function reviseForGaps(gaps, kText, oText, guidance) {
    const questions = [];
    const obsItems = [];
    const guidanceText = guidance?.overall
        ? `\n\nASSESSOR INSTRUCTIONS (supplied by the user, follow them and use any content they provide): ${guidance.overall}\nWhere a gap has an "assessorNote", use that note for that gap.`
        : '\n\nWhere a gap has an "assessorNote", use that note (supplied by the user) for that gap.';
    for (let i = 0; i < gaps.length; i += 8) {
        const batch = gaps.slice(i, i + 8).map(g => ({
            id: g.id, requirement: g.requirement, status: g.gapType, missing: g.reason, fix: g.fix,
            ...(guidance?.notes?.[g.id] ? { assessorNote: guidance.notes[g.id] } : {}),
        }));
        try {
            const parsed = parseAIJson(await llmCall(
                `You are an Australian VET assessment writer. An audit found these requirements from training.gov.au are not fully covered by the assessment. Write NEW items that close every gap.\n\nRules:\n- Requirements about knowledge (KE) get a written short-answer question with a model answer.\n- Requirements about performance (PE), performance criteria (PC) or assessment conditions (AC) get an observable behaviour for the observation checklist (one clear observable action).\n- Cover every part of each requirement (all sub-items, numbers, contexts).\n- Use plain workplace language. No em dashes or en dashes.\n- Do not repeat existing items.\n\nReturn ONLY valid JSON, no fences:\n{"questions":[{"text":"question text","modelAnswer":"model answer"}],"observationItems":[{"text":"observable behaviour"}]}${guidanceText}\n\nGAPS:\n${JSON.stringify(batch)}\n\nEXISTING QUESTIONS (for reference):\n${kText.slice(0, 4000)}\n\nEXISTING OBSERVATION ITEMS (for reference):\n${oText.slice(0, 3000)}`
            ));
            questions.push(...(parsed.questions || []));
            obsItems.push(...(parsed.observationItems || []));
        } catch (e) {
            console.error('Revision batch failed:', e.message);
        }
    }
    let newK = kText;
    let qNum = (kText.match(/Q\d+\./g) || []).length;
    for (const q of questions) {
        if (!q?.text) continue;
        qNum++;
        newK += `\n\nQ${qNum}. ${q.text}\n\n*Model Answer: ${q.modelAnswer || ''}*`;
    }
    let newO = oText;
    let oNum = oText.split('\n').filter(l => l.includes('|') && !/Item|Observable|---/.test(l)).length;
    for (const o of obsItems) {
        if (!o?.text) continue;
        oNum++;
        newO += `\n| Item ${oNum} | ${o.text} | ☐ | ☐ | |`;
    }
    return { kText: newK, oText: newO, added: questions.length + obsItems.length };
}

// Revises using the user's guidance, then re-audits every unit so unresolved gaps are reported honestly.
export async function runGuidedCoverage(units, { kText, oText, pText }, gaps, guidance, onProgress = () => {}) {
    const rev = await reviseForGaps(gaps, kText, oText, guidance);
    const full = `${rev.kText}\n\n${rev.oText}\n\n${pText}`;
    const results = [];
    for (let i = 0; i < units.length; i++) {
        results.push(await auditUnit(units[i], i, units.length, full, (p, m) => onProgress((i * 100 + p) / units.length, m)));
    }
    const newGaps = collectGaps(results);
    return {
        kText: rev.kText,
        oText: rev.oText,
        added: rev.added,
        totalGaps: newGaps.length,
        units: results.map(u => ({ ...u, gaps: newGaps.filter(g => g.unitCode === u.unitCode) })),
    };
}

// Audits the generated assessment against every TGA requirement, revises once for gaps, re-audits.
export async function runBuildCoverage(units, { kText, oText, pText }, onProgress = () => {}) {
    const combine = (k, o) => `${k}\n\n${o}\n\n${pText}`;
    let unitResults = [];
    for (let i = 0; i < units.length; i++) {
        unitResults.push(await auditUnit(units[i], i, units.length, combine(kText, oText), onProgress));
    }

    let gaps = collectGaps(unitResults);
    let revisedK = kText;
    let revisedO = oText;
    let added = 0;

    if (gaps.length > 0) {
        const rev = await reviseForGaps(gaps, kText, oText);
        revisedK = rev.kText;
        revisedO = rev.oText;
        added = rev.added;
        if (added > 0) {
            const gapUnits = new Set(gaps.map(g => g.unitCode));
            const next = [];
            for (let i = 0; i < units.length; i++) {
                next.push(gapUnits.has(units[i].code)
                    ? await auditUnit(units[i], i, units.length, combine(revisedK, revisedO), onProgress)
                    : unitResults[i]);
            }
            unitResults = next;
            gaps = collectGaps(unitResults);
        }
    }

    return {
        kText: revisedK,
        oText: revisedO,
        added,
        totalGaps: gaps.length,
        units: unitResults.map(u => ({ ...u, gaps: gaps.filter(g => g.unitCode === u.unitCode) })),
    };
}