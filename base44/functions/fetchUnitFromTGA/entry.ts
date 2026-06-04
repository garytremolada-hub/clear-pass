import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── XML PARSER ────────────────────────────────────────────────────────────────
// Parses AuthorIT XML format used by training.gov.au
// String-based: no DOMParser needed in Deno

function parseAuthorITXml(xmlText) {

    function findTopicContent(sectionName) {
        const lowerName = sectionName.toLowerCase();
        const lowerXml = xmlText.toLowerCase();
        const searchStr = `<description>${lowerName}</description>`;
        const descIdx = lowerXml.indexOf(searchStr);
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
            'ELEMENT', 'PERFORMANCE CRITERIA',
            'Elements describe the essential outcomes.',
            'Performance criteria describe the performance needed to demonstrate achievement of the element.'
        ]);
        let currentElement = null;
        extractParagraphs(elementsXml).forEach(text => {
            if (skipTexts.has(text)) return;
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
            'This section describes language, literacy, numeracy and employment skills incorporated in the performance criteria that are required for competent performance.'
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
        }
    };
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const rawCode = (body.unitCode || '').trim().toUpperCase();

        if (!rawCode) {
            return Response.json({ error: 'unitCode is required' }, { status: 400 });
        }
        if (!rawCode.match(/^[A-Z]{2,8}\d{2,6}[A-Z]?$/)) {
            return Response.json({
                error: 'That does not look like a valid unit code. Unit codes look like BSBLDR413 or MSMSUP204.'
            }, { status: 400 });
        }

        // Step 1: Get unit metadata
        const metaUrl = `https://training.gov.au/api/training/${rawCode}?api-version=1.0&include=all`;
        console.log(`Fetching metadata: ${metaUrl}`);

        const metaRes = await fetch(metaUrl, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'Clearpass/1.0' }
        });

        if (metaRes.status === 404) {
            return Response.json({
                error: `Unit code "${rawCode}" was not found on training.gov.au. Check the code and try again.`
            }, { status: 404 });
        }
        if (!metaRes.ok) {
            return Response.json({
                error: `training.gov.au returned an error (${metaRes.status}). Try again in a moment.`
            }, { status: 502 });
        }

        const meta = await metaRes.json();
        const unitTitle = meta.title || '';
        const aqfLevel = meta.aqfLevel || '';

        const currentRelease =
            meta.releases?.find(r => r.currency === 'current') ||
            meta.releases?.find(r => r.usageRecommendation === 'current') ||
            meta.releases?.[0];
        const releaseNumber = String(currentRelease?.releaseNumber || '1');

        console.log(`Unit: ${rawCode} "${unitTitle}", release: ${releaseNumber}`);

        // Step 2: Get asset URLs
        const assetsUrl = `https://training.gov.au/api/training/${rawCode}/releases/${releaseNumber}?include=All&api-version=1.0`;
        console.log(`Fetching assets: ${assetsUrl}`);

        const assetsRes = await fetch(assetsUrl, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'Clearpass/1.0' }
        });

        if (!assetsRes.ok) {
            return Response.json({
                error: `Could not load unit files for ${rawCode}. You can upload a document instead.`
            }, { status: 502 });
        }

        const assetsData = await assetsRes.json();
        console.log(`Assets found: ${assetsData.assets?.length ?? 0}`);

        const xmlAsset =
            assetsData.assets?.find(a => a.type === 'unitPackage' && a.name?.includes('Complete') && a.name?.endsWith('.xml')) ||
            assetsData.assets?.find(a => a.name?.endsWith('.xml'));

        if (!xmlAsset) {
            return Response.json({
                error: `No XML file found for ${rawCode}. This unit may use an older format. Upload a document instead.`
            }, { status: 404 });
        }

        console.log(`Downloading XML: ${xmlAsset.url}`);

        // Step 3: Download and parse XML
        const xmlRes = await fetch(xmlAsset.url, { headers: { 'User-Agent': 'Clearpass/1.0' } });
        if (!xmlRes.ok) {
            return Response.json({
                error: `Could not download unit data for ${rawCode}. Upload a document instead.`
            }, { status: 502 });
        }

        const xmlText = await xmlRes.text();
        console.log(`XML downloaded, length: ${xmlText.length}`);

        const uocData = parseAuthorITXml(xmlText);
        console.log(`Parsed: ${uocData.summary.elementCount} elements, ${uocData.summary.keCount} KE, ${uocData.summary.peCount} PE`);

        return Response.json({
            unitCode: rawCode,
            unitTitle,
            releaseNumber,
            aqfLevel,
            ...uocData,
        });

    } catch (error) {
        console.error('fetchUnitFromTGA error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});