/**
 * Extracts structured mapping data from the parsed UoC and built assessment sections.
 * Used to populate the Excel mapping workbook and Word validation record.
 */

function extractVolume(peText) {
    if (!peText) return 'Not specified';
    const text = peText.toLowerCase();
    const occasionMatch = text.match(/at least (\w+ |\d+ ?)occasions?/i);
    if (occasionMatch) return occasionMatch[0];
    const timesMatch = text.match(/(\d+ ?)times?/i);
    if (timesMatch) return timesMatch[0];
    const twoMatch = text.match(/two different/i);
    if (twoMatch) return 'two separate instances';
    return 'Not specified';
}

function flattenKE(keItems) {
    const result = [];
    (keItems || []).forEach((ke, i) => {
        result.push({
            ref: `KE${i + 1}`,
            text: ke.text || ke,
            questionRef: ke.questionRef || `Part A, Q${i + 1}`,
            topic: ke.topic || '',
            status: 'COVERED',
            isParent: !!(ke.subItems && ke.subItems.length > 0),
            isSubItem: false,
        });
        if (ke.subItems && ke.subItems.length > 0) {
            ke.subItems.forEach((sub, j) => {
                const letter = String.fromCharCode(97 + j);
                result.push({
                    ref: `KE${i + 1}${letter}`,
                    text: sub.text || sub,
                    questionRef: sub.questionRef || ke.questionRef || `Part A, Q${i + 1}`,
                    topic: sub.topic || '',
                    status: 'COVERED',
                    isSubItem: true,
                });
            });
        }
    });
    return result;
}

/**
 * Build mapping data from the parsed UoC object and build state.
 * @param {object} parsed - Result from UoC parse LLM call (ke_items, pe_items, pc_items, etc.)
 * @param {object} unitInfo - { code, title, text }
 * @param {object} cohortInfo - { band, learnerDesc }
 * @param {Array} activeSections - Array of section objects used in the build
 */
export function extractMappingData(parsed, unitInfo, cohortInfo, activeSections) {
    const dateBuilt = new Date().toLocaleDateString('en-AU', {
        day: '2-digit', month: 'long', year: 'numeric',
    });

    const keRaw = parsed.ke_items || [];
    const peRaw = parsed.pe_items || [];
    const pcRaw = parsed.pc_items || [];

    // Build PE items
    const peItems = peRaw.map((pe, i) => {
        const text = typeof pe === 'string' ? pe : (pe.text || '');
        const vol = extractVolume(text);
        return {
            ref: `PE${i + 1}`,
            text,
            coveredBy: buildCoverageRef(activeSections),
            volumeRequirement: vol,
            volumeMet: vol !== 'Not specified'
                ? `See ${buildCoverageRef(activeSections)} — each occasion must be separately documented`
                : 'No specific volume stated',
            status: 'COVERED',
        };
    });

    // Build KE items (flatten sub-items)
    const keStructured = keRaw.map((ke, i) => {
        if (typeof ke === 'string') {
            return { text: ke, questionRef: `Part A, Q${i + 1}`, subItems: [] };
        }
        return {
            text: ke.text || ke,
            questionRef: ke.questionRef || `Part A, Q${i + 1}`,
            subItems: ke.subItems || [],
            topic: ke.topic || '',
        };
    });
    const keItems = flattenKE(keStructured);

    // Build elements from PC items
    // pc_items may be "1.1 — Description" or { element, ref, text }
    const elementMap = {};
    pcRaw.forEach((pc, i) => {
        let ref, text, elNum, elTitle;
        if (typeof pc === 'string') {
            const match = pc.match(/^(\d+)\.(\d+)\s*[—\-–:]\s*(.+)$/);
            if (match) {
                ref = `${match[1]}.${match[2]}`;
                elNum = match[1];
                text = match[3].trim();
                elTitle = parsed.element_titles?.[elNum] || `Element ${elNum}`;
            } else {
                ref = `${i + 1}`;
                elNum = '1';
                text = pc;
                elTitle = 'Element 1';
            }
        } else {
            ref = pc.ref || `${i + 1}`;
            elNum = String(ref).split('.')[0];
            text = pc.text || '';
            elTitle = pc.elementTitle || parsed.element_titles?.[elNum] || `Element ${elNum}`;
        }

        if (!elementMap[elNum]) {
            elementMap[elNum] = { number: elNum, title: elTitle, pcs: [] };
        }
        elementMap[elNum].pcs.push({
            ref,
            text,
            partA: 'Part A',
            partB: activeSections.some(s => s.id === 'practical_observation') ? 'Part B' : '',
            partC: activeSections.some(s => s.id === 'workplace_project' || s.id === 'case_study') ? 'Part C' : '',
            status: 'MAPPED',
        });
    });
    const elements = Object.values(elementMap);

    // Foundation skills: use raw if available
    const foundationSkills = (parsed.foundation_skills || []).map((fs, i) => ({
        ref: `FS${i + 1}`,
        name: typeof fs === 'string' ? fs : (fs.name || fs.text || fs),
        text: typeof fs === 'string' ? fs : (fs.description || fs.text || fs),
        coveredBy: buildCoverageRef(activeSections),
        status: 'COVERED',
    }));

    // Assessment conditions
    const assessmentConditions = (parsed.assessment_conditions || []).map((ac, i) => ({
        ref: `AC${i + 1}`,
        text: typeof ac === 'string' ? ac : (ac.text || ac),
        howMet: typeof ac === 'string'
            ? `Addressed through ${buildCoverageRef(activeSections)}`
            : (ac.howMet || `Addressed through ${buildCoverageRef(activeSections)}`),
        status: 'MET',
    }));

    // Readability rows
    const readabilityRows = activeSections.map(s => ({
        name: s.name,
        audience: s.id === 'marking_guide' || s.id === 'assessor_pack' ? 'Assessors' : 'Learners',
        fkgl: 'Not scored',
        target: cohortInfo?.band || 'Cert III/IV',
    }));

    return {
        unitCode: parsed.unit_code || unitInfo?.code || '',
        unitTitle: parsed.unit_title || unitInfo?.title || '',
        aqfLevel: parsed.aqf_level || inferAQF(cohortInfo?.band),
        trainingPackage: parsed.training_package || '',
        dateBuilt,
        cohort: cohortInfo?.learnerDesc
            ? `${cohortInfo.learnerDesc}${cohortInfo.support && cohortInfo.support !== 'none' ? ` (with support: ${cohortInfo.support})` : ''}`
            : '',
        readingLevel: cohortInfo?.band || '',
        assessmentFormat: activeSections.map(s => s.name).join(' | '),
        peItems,
        keItems,
        elements,
        foundationSkills,
        assessmentConditions,
        readabilityRows,
    };
}

function buildCoverageRef(sections) {
    const parts = [];
    if (sections.some(s => s.id === 'knowledge_questions')) parts.push('Part A (Knowledge Questions)');
    if (sections.some(s => s.id === 'practical_observation')) parts.push('Part B (Observation)');
    if (sections.some(s => s.id === 'workplace_project' || s.id === 'case_study')) parts.push('Part C (Project)');
    if (parts.length === 0) parts.push('Assessment instrument');
    return parts.join(', ');
}

function inferAQF(band) {
    if (!band) return '';
    if (band.includes('Cert I') && band.includes('II')) return 'Certificate I / II';
    if (band.includes('Cert III') || band.includes('Cert IV')) return 'Certificate III / IV';
    if (band.includes('Diploma')) return 'Diploma / Advanced Diploma';
    if (band.includes('Degree')) return 'Bachelor Degree';
    return '';
}