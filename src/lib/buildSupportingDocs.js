import { base44 } from '@/api/base44Client';
import { extractMappingData } from '@/lib/extractMappingData';

export function parseUnits(units) {
    return units.map(u => {
        const ud = u.uocData;
        return {
            unit_code: u.code,
            unit_title: u.title,
            ke_items: ud.knowledgeEvidence.map(k => k.subItems ? `${k.text} (including: ${k.subItems.join(', ')})` : k.text),
            pe_items: ud.performanceEvidence,
            pc_items: ud.elements.flatMap(el => el.performanceCriteria.map(pc => `${pc.ref} — ${pc.text}`)),
            assessment_conditions: ud.assessmentConditions || [],
            foundation_skills: (ud.foundationSkills || []).map(fs => ({ name: fs.skill, description: (fs.descriptions || []).join(' ') })),
        };
    });
}

function parseMappingIndex(aiResponse) {
    let clean = typeof aiResponse === 'string' ? aiResponse.trim() : JSON.stringify(aiResponse);
    clean = clean.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No valid JSON found');
    return JSON.parse(clean.substring(start, end + 1));
}

// ask(name, prompt) must return the LLM response text.
export async function buildMappingIndex({ units, kText, oText, pText, ask }) {
    const allParsed = parseUnits(units);
    const keList = allParsed.map(p => `\n[${p.unit_code}]\n${(p.ke_items || []).map((ke, i) => `${p.unit_code} KE${i + 1}: ${ke}`).join('\n')}`).join('\n');
    const peList = allParsed.map(p => `\n[${p.unit_code}]\n${(p.pe_items || []).map((pe, i) => `${p.unit_code} PE${i + 1}: ${pe}`).join('\n')}`).join('\n');
    const pcList = allParsed.map(p => `\n[${p.unit_code}]\n${(p.pc_items || []).join('\n')}`).join('\n');
    const unitsList = units.map(u => `${u.code} — ${u.title}`).join('\n');
    const hasBSBLDR413 = units.some(u => u.code.toUpperCase().includes('BSBLDR413'));
    const acFsText = allParsed.map(p => {
        const ud = units.find(u => u.code === p.unit_code).uocData;
        return [
            `[${p.unit_code}]`,
            ...(ud.assessmentConditions || []).map(c => `Assessment condition: ${c}`),
            ...(ud.foundationSkills || []).map(fs => `Foundation skill: ${fs.skill} — ${(fs.descriptions || []).join(' ')}`),
        ].join('\n');
    }).join('\n');

    const raw = await ask('Mapping Index',
        `You have just built a clustered assessment covering these units:
${unitsList}

The assessment contains the following sections:

PART A — KNOWLEDGE QUESTIONS (actual content):
${kText.slice(0, 3000)}

PART B — OBSERVATION CHECKLIST (actual content):
${oText.slice(0, 2000)}

PART C — WORKPLACE PROJECT (actual content):
${pText.slice(0, 2000)}

KNOWLEDGE EVIDENCE ITEMS FROM UoC (labelled by unit code):
${keList}

PERFORMANCE EVIDENCE ITEMS FROM UoC (labelled by unit code):
${peList}

PERFORMANCE CRITERIA FROM UoC (labelled by unit code):
${pcList}

FULL UoC DETAILS (foundation skills and assessment conditions, per unit):
${acFsText}

Now produce a mapping index as a JSON object.
Return ONLY the JSON. No explanation. No markdown fences.
Start your response with { and end with }

The JSON must use this exact format with double quotes. Each entry MUST include a "unit" field with the exact unit code it maps to:

{
  "mappingIndex": {
    "knowledgeQuestions": [
      {
        "num": "Q1",
        "unit": "UNITCODE",
        "ke": ["KE1"],
        "pc": ["1.1"],
        "text": "brief question topic"
      }
    ],
    "observationItems": [
      {
        "num": "Item 1",
        "unit": "UNITCODE",
        "pe": ["PE1", "PE2"],
        "pc": ["1.1", "1.2"],
        "text": "brief behaviour description"
      }
    ],
    "projectSteps": [
      {
        "num": "Step 1",
        "unit": "UNITCODE",
        "name": "exact step name from assessment",
        "pe": ["PE2"],
        "pc": ["1.1"],
        "text": "brief step description"
      }
    ],
    "verbalQuestions": [],
    "assessmentConditions": [
      {
        "unit": "UNITCODE",
        "condition": "verbatim condition text from UoC",
        "howMet": "plain English explanation of how this assessment meets it"
      }
    ],
    "foundationSkills": [
      {
        "unit": "UNITCODE",
        "skill": "skill name",
        "pcRefs": ["1.1", "2.3"],
        "description": "verbatim description from UoC",
        "coveredBy": {
          "task1": "Q1, Q3",
          "task2": "Item 2, Item 4",
          "task3": "Step 2",
          "task4": ""
        }
      }
    ]
  }
}

Rules:
- EVERY entry in knowledgeQuestions, observationItems, projectSteps, assessmentConditions, and foundationSkills MUST include a "unit" field set to the exact unit code (e.g. "BSBLDR413") that the requirement belongs to. This is critical for a clustered assessment.
- The ke, pe, and pc references must use the LOCAL references for that unit (e.g. "KE1", "PE1", "1.1") without the unit code prefix. The unit field tells us which unit they belong to.
- Every KE item from every unit must appear in at least one knowledgeQuestions entry
- Every PE item from every unit must appear in at least one observationItems or projectSteps entry
- Every PC from every unit must appear in at least one entry across all sections
- Use exact references with prefixes: "Q1" not "1", "Item 1" not "1", "Step 1" not "1"
- assessmentConditions must quote the UoC conditions verbatim, grouped by unit. Include ALL conditions from ALL units.
- foundationSkills must include all skills listed in each unit's UoC
- Return ONLY the JSON object. Nothing else.

Important: map every single question to its KE requirement. Do not stop before you have mapped all questions from all units. Count your knowledgeQuestions array entries when done. The count must equal the total number of questions built. If it does not, you have missed some questions. Go back and add them.`
    );

    let mappingIndex;
    try {
        const parsed = parseMappingIndex(raw);
        mappingIndex = parsed.mappingIndex || parsed;
    } catch (e) {
        console.error('Mapping index parse failed:', e.message);
        mappingIndex = { knowledgeQuestions: [], observationItems: [], projectSteps: [], verbalQuestions: [], assessmentConditions: [], foundationSkills: [] };
    }

    if (hasBSBLDR413) {
        const hasInteraction = (mappingIndex.assessmentConditions || []).some(ac => (ac.condition || '').toLowerCase().includes('interaction'));
        if (!hasInteraction) {
            if (!mappingIndex.assessmentConditions) mappingIndex.assessmentConditions = [];
            mappingIndex.assessmentConditions.push({
                condition: 'Interaction with others',
                howMet: 'Part B requires the learner to interact with at least four different individuals or groups across multiple observation occasions. Part C requires team collaboration throughout the workplace project.',
            });
        }
    }
    return mappingIndex;
}

function filterMIByUnit(mi, unitCode) {
    const f = arr => (arr || []).filter(e => !e.unit || e.unit === unitCode);
    return {
        ...mi,
        knowledgeQuestions: f(mi.knowledgeQuestions),
        observationItems: f(mi.observationItems),
        projectSteps: f(mi.projectSteps),
        verbalQuestions: f(mi.verbalQuestions),
        assessmentConditions: f(mi.assessmentConditions),
        foundationSkills: f(mi.foundationSkills),
    };
}

function extractBookletParts(kText, oText, pText) {
    const questions = [];
    for (const line of (kText || '').split('\n')) {
        const m = line.replace(/\*\*/g, '').trim().match(/^Q(\d+)\.\s*(.+)/);
        if (m) questions.push(m[2].trim());
    }
    const obsItems = (oText || '')
        .split('\n')
        .filter(l => l.includes('|') && !/Item|Observable|---/.test(l))
        .map(l => l.split('|').map(c => c.trim()).filter(Boolean)[1] || '')
        .filter(Boolean);
    const projectSteps = [];
    const stepMatches = [...(pText || '').matchAll(/(?:#{1,3}\s*|\*\*)(Step\s+\d+[^*\n]*?)(?:\*\*|)\n([\s\S]*?)(?=(?:#{1,3}\s*|\*\*)Step\s+\d+|$)/gi)];
    stepMatches.forEach(m => {
        const title = m[1].replace(/[*#]/g, '').trim();
        if (title) projectSteps.push({ title, desc: m[2].replace(/\*\*/g, '').trim().slice(0, 600) });
    });
    if (projectSteps.length === 0) {
        [...(pText || '').matchAll(/^\d+\.\s+\*\*([^*]+)\*\*[:.]?\s*\n?([\s\S]*?)(?=^\d+\.|$)/gm)]
            .forEach(m => projectSteps.push({ title: m[1].trim(), desc: m[2].trim().slice(0, 600) }));
    }
    return { questions, obsItems, projectSteps };
}

// want: { mapping, validation, booklet } booleans. mappingIndex needed when mapping or validation is wanted.
export async function generateSupportingDocs({ units, cohortInfo, sections, kText, oText, pText, mappingIndex, clusterCode, clusterTitle, want }) {
    const allParsed = parseUnits(units);
    const perUnit = (want.mapping || want.validation) ? allParsed.map((p, i) => ({
        unitCode: p.unit_code,
        mappingData: extractMappingData(p, { code: p.unit_code, title: p.unit_title, uocData: units[i].uocData, text: null }, cohortInfo, sections, filterMIByUnit(mappingIndex, p.unit_code)),
    })) : [];
    const { questions, obsItems, projectSteps } = extractBookletParts(kText, oText, pText);

    const promises = [
        ...(want.mapping ? perUnit.map(({ unitCode, mappingData }) =>
            base44.functions.invoke('generateCompetencyMapping', { mappingData }).then(r => ({ type: 'mapping', unitCode, data: r.data }))) : []),
        ...(want.validation ? perUnit.map(({ unitCode, mappingData }) =>
            base44.functions.invoke('generateValidationRecord', { mappingData }).then(r => ({ type: 'validation', unitCode, data: r.data }))) : []),
        ...(want.booklet ? [base44.functions.invoke('generateStudentBooklet', {
            unitCode: clusterCode, unitTitle: clusterTitle, questions, obsItems, projectSteps, occasionCount: 4,
        }).then(r => ({ type: 'booklet', data: r.data }))] : []),
    ];
    const settled = await Promise.allSettled(promises);

    const out = { mappingResults: [], validationResults: [], bookletBase64: null };
    settled.forEach(r => {
        if (r.status !== 'fulfilled' || !r.value.data?.file_base64) return;
        const { type, unitCode, data } = r.value;
        if (type === 'mapping') out.mappingResults.push({ unitCode, file_base64: data.file_base64, filename: data.filename });
        else if (type === 'validation') out.validationResults.push({ unitCode, file_base64: data.file_base64, filename: data.filename });
        else if (type === 'booklet') out.bookletBase64 = data.file_base64;
    });
    return out;
}