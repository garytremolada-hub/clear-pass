// Fetches a Unit of Competency straight from training.gov.au in the browser.
// (The site blocks server-side requests, but allows browser requests.)

export function parseAuthorITXml(xmlText) {
    const lowerXml = xmlText.toLowerCase();

    function findTopicContent(sectionName) {
        const descIdx = lowerXml.indexOf(`<description>${sectionName.toLowerCase()}</description>`);
        if (descIdx === -1) return '';
        const textStart = xmlText.indexOf('<Text>', descIdx);
        const textEnd = xmlText.indexOf('</Text>', textStart);
        if (textStart === -1 || textEnd === -1) return '';
        return xmlText.substring(textStart, textEnd + 7);
    }

    function extractParagraphs(xmlSection) {
        const paragraphs = [];
        const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
        let match;
        while ((match = pRegex.exec(xmlSection)) !== null) {
            const text = match[1]
                .replace(/<[^>]+>/g, '')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&apos;/g, "'")
                .replace(/&quot;/g, '"')
                .replace(/\s+/g, ' ')
                .trim();
            if (text.length > 0) paragraphs.push(text);
        }
        return paragraphs;
    }

    // Elements and Performance Criteria
    const elementsXml = findTopicContent('elements and performance criteria');
    const elements = [];
    if (elementsXml) {
        const skipTexts = new Set([
            'ELEMENT', 'ELEMENTS', 'PERFORMANCE CRITERIA',
            'Elements describe the essential outcomes.',
            'Performance criteria describe the performance needed to demonstrate achievement of the element.',
        ]);
        const rawParas = extractParagraphs(elementsXml).filter(t => !skipTexts.has(t));
        const merged = [];
        for (let i = 0; i < rawParas.length; i++) {
            const text = rawParas[i];
            if (text.match(/^\d+$/) && i + 1 < rawParas.length) {
                merged.push(`${text}. ${rawParas[i + 1]}`);
                i++;
            } else if (text.match(/^\d+\.\d+$/) && i + 1 < rawParas.length) {
                merged.push(`${text} ${rawParas[i + 1]}`);
                i++;
            } else {
                merged.push(text);
            }
        }
        let currentElement = null;
        merged.forEach(text => {
            const elemMatch = text.match(/^(\d+)\.\s+(.+)$/);
            if (elemMatch && !text.match(/^\d+\.\d+/)) {
                currentElement = { number: parseInt(elemMatch[1]), title: elemMatch[2].trim(), performanceCriteria: [] };
                elements.push(currentElement);
                return;
            }
            const pcMatch = text.match(/^(\d+\.\d+)\s+(.+)$/);
            if (pcMatch && currentElement) {
                currentElement.performanceCriteria.push({ ref: pcMatch[1], text: pcMatch[2].trim() });
            }
        });
    }

    // Performance Evidence
    const peXml = findTopicContent('performance evidence');
    const performanceEvidence = [];
    if (peXml) {
        const skipPrefixes = ['The candidate must demonstrate', 'In the course of the above'];
        extractParagraphs(peXml).forEach(text => {
            if (!skipPrefixes.some(p => text.startsWith(p)) && text.length > 10) performanceEvidence.push(text);
        });
    }

    // Knowledge Evidence
    const keXml = findTopicContent('knowledge evidence');
    const knowledgeEvidence = [];
    if (keXml) {
        const skipPrefixes = ['The candidate must be able to demonstrate'];
        let currentParent = null;
        extractParagraphs(keXml).forEach(text => {
            if (skipPrefixes.some(p => text.startsWith(p)) || text.length < 5) return;
            const isSubItem = currentParent &&
                text.length < 50 &&
                text[0] === text[0].toLowerCase() &&
                text[0] !== text[0].toUpperCase() &&
                !text.match(/^\d/);
            if (isSubItem) {
                currentParent.subItems = currentParent.subItems || [];
                currentParent.subItems.push(text);
            } else {
                const item = { text };
                currentParent = (text.endsWith(':') || text.includes('including')) ? item : null;
                knowledgeEvidence.push(item);
            }
        });
    }

    // Assessment Conditions
    const acXml = findTopicContent('assessment conditions');
    const assessmentConditions = [];
    if (acXml) extractParagraphs(acXml).forEach(text => { if (text.length > 10) assessmentConditions.push(text); });

    // Foundation Skills
    const fsXml = findTopicContent('foundation skills');
    const foundationSkills = [];
    if (fsXml) {
        const skipTexts = new Set([
            'SKILL', 'DESCRIPTION',
            'This section describes language, literacy, numeracy and employment skills incorporated in the performance criteria that are required for competent performance.',
        ]);
        let currentSkill = null;
        extractParagraphs(fsXml).forEach(text => {
            if (skipTexts.has(text)) return;
            if (text.length < 30 && !text.includes('.') && !text.includes(',')) {
                currentSkill = { skill: text, descriptions: [] };
                foundationSkills.push(currentSkill);
            } else if (currentSkill) {
                currentSkill.descriptions.push(text);
            }
        });
    }

    // Application
    const appXml = findTopicContent('application');
    const application = appXml ? extractParagraphs(appXml).join(' ') : '';

    return {
        elements, performanceEvidence, knowledgeEvidence, assessmentConditions, foundationSkills, application,
        summary: {
            elementCount: elements.length,
            pcCount: elements.reduce((n, el) => n + el.performanceCriteria.length, 0),
            peCount: performanceEvidence.length,
            keCount: knowledgeEvidence.length,
            acCount: assessmentConditions.length,
            fsCount: foundationSkills.length,
        },
    };
}

const BASE = 'https://training.gov.au/api/training';

export async function fetchUnitFromTGA(unitCode) {
    const rawCode = (unitCode || '').trim().toUpperCase();
    if (!rawCode) throw new Error('Please enter a unit code.');
    if (!rawCode.match(/^[A-Z]{2,8}\d{2,6}[A-Z]?$/)) {
        throw new Error('That does not look like a valid unit code. Unit codes look like BSBLDR413 or MSMSUP204.');
    }

    const metaRes = await fetch(`${BASE}/${rawCode}?api-version=1.0&include=all`, { headers: { Accept: 'application/json' } });
    if (metaRes.status === 404) throw new Error(`Unit code "${rawCode}" was not found on training.gov.au. Check the code and try again.`);
    if (!metaRes.ok) throw new Error(`training.gov.au returned an error (${metaRes.status}). Try again in a moment.`);

    const meta = await metaRes.json();
    const unitTitle = meta.title || '';
    const aqfLevel = meta.aqfLevel || '';
    const currentRelease =
        meta.releases?.find(r => r.currency === 'current') ||
        meta.releases?.find(r => r.usageRecommendation === 'current') ||
        meta.releases?.[0];
    const releaseNumber = String(currentRelease?.releaseNumber || '1');

    const assetsRes = await fetch(`${BASE}/${rawCode}/releases/${releaseNumber}?include=All&api-version=1.0`, { headers: { Accept: 'application/json' } });
    if (!assetsRes.ok) throw new Error(`Could not load unit files for ${rawCode}.`);
    const assetsData = await assetsRes.json();

    const xmlAsset =
        assetsData.assets?.find(a => a.type === 'unitPackage' && a.name?.includes('Complete') && a.name?.endsWith('.xml')) ||
        assetsData.assets?.find(a => a.name?.endsWith('.xml'));
    if (!xmlAsset) throw new Error(`No XML file found for ${rawCode}. This unit may use an older format.`);

    const xmlRes = await fetch(xmlAsset.url);
    if (!xmlRes.ok) throw new Error(`Could not download unit data for ${rawCode}.`);
    const uocData = parseAuthorITXml(await xmlRes.text());

    return { unitCode: rawCode, unitTitle, releaseNumber, aqfLevel, ...uocData };
}