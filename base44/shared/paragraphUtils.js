// Shared helpers for docx in-place rewriting.
// Used by extractDocumentText (to list paragraphs in document order) and
// rewriteDocumentInPlace (to replace paragraphs by their stable 1-based index).
//
// The key invariant: both functions enumerate <w:p> elements in the SAME
// document order using the SAME regex (self-closing paragraphs first), so a
// paragraph's id in the extracted list lines up exactly with the index the
// rewriter sees. This lets rewrites be applied by id rather than by fragile
// text matching (which broke when Word flattened tables / reordered runs).

const PROTECTED_PATTERNS = [
    /^\d+\.\d+/,
    /^[A-Z]{3,}\d{3,}/,
    /S\s*\/\s*N[Ss]/,
    /[Ss]atisfactory/,
    /[Nn]ot [Yy]et [Ss]atisfactory/,
    /[Pp]erformance [Ee]vidence/,
    /[Kk]nowledge [Ee]vidence/,
    /[Aa]ssessment [Cc]onditions/,
    /[Ff]oundation [Ss]kills/,
    /^Element$/i,
    /^Performance Criteria$/i,
    /[Ii] declare/,
    /□/,
];

export function isProtectedText(text) {
    return PROTECTED_PATTERNS.some(p => p.test(text || ''));
}

// ── Section / assessor-block / admin-section detection ──────────────────────
// Used by extractParagraphs to (a) keep section labels intact and (b) exclude
// assessor-only blocks and admin overview sections from the rewrite candidates
// so they are never rewritten or blended into student instructions. A block
// runs from its marker to the next student-facing section heading.

const SECTION_HEADING_RE = /^\s*(ASSESSMENT\s+\d+\s*[:\-]|OCCASION\s+\d|PART\s+[A-D]\b)/i;
const ASSESSOR_MARKER_RE = /(TO BE COMPLETED BY THE ASSESSOR|ASSESSOR USE ONLY|ADMIN USE ONLY|DID THE STUDENT|SATISFACTORY\s*\(S\)\s*\/\s*NOT SATISFACTORY\s*\(NS\))/i;
const ADMIN_HEADING_RE = /^\s*(UNIT INFORMATION|EVIDENCE GUIDE|ABOUT YOUR ASSESSMENTS|ASSESSMENT CONDITIONS|SUPPORTING MATERIALS|ASSESSMENT RESOURCES|RECOGNITION OF PRIOR LEARNING|VERSION CONTROL)\b/i;

export function isSectionHeading(text) {
    const t = (text || '').trim();
    return SECTION_HEADING_RE.test(t) ? t : null;
}
export function isAssessorMarker(text) {
    return ASSESSOR_MARKER_RE.test(text || '');
}
export function isAdminHeading(text) {
    const t = (text || '').trim();
    return ADMIN_HEADING_RE.test(t) ? t : null;
}

export function escapeXml(s) {
    return (s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Concatenate all <w:t> contents inside a <w:p>.
export function paragraphText(pXml) {
    const matches = [...pXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)];
    return matches.map(m => m[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
    ).join('');
}

// Rebuild a <w:p> so its text becomes `rewritten`, preserving paragraph
// properties (pPr) and the first run's formatting (rPr).
export function rewriteParagraph(pXml, rewritten) {
    const pPrMatch = pXml.match(/<w:pPr\b[^>]*>[\s\S]*?<\/w:pPr>/);
    const pPr = pPrMatch ? pPrMatch[0] : '';
    const openTagMatch = pXml.match(/^<w:p\b[^>]*>/);
    const openTag = openTagMatch ? openTagMatch[0] : '<w:p>';
    let rPr = '';
    const firstRun = pXml.match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/);
    if (firstRun) {
        const r = firstRun[0].match(/<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>/);
        rPr = r ? r[0] : '';
    }
    const newRun = `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(rewritten)}</w:t></w:r>`;
    return `${openTag}${pPr}${newRun}</w:p>`;
}

// Source of the paragraph-matching regex. Self-closing <w:p/> is listed FIRST
// so the alternation never lets a self-closing paragraph swallow the following
// paragraph's opening tag.
export const PARAGRAPH_SOURCE = '<w:p\\b[^>]*\\/>|<w:p\\b[^>]*>[\\s\\S]*?<\\/w:p>';

export function newParagraphRegex() {
    return new RegExp(PARAGRAPH_SOURCE, 'g');
}

export function isSelfClosingParagraph(pXml) {
    return /<w:p\b[^>]*\/>/.test(pXml);
}

export function hasEmbeddedObject(pXml) {
    return /<w:drawing\b|<w:pict\b|<w:object\b/.test(pXml);
}

// Enumerate every <w:p> in document.xml → [{id, text, protected, section}].
// id is the 1-based position among ALL <w:p>, identical to the index the
// rewriter uses, so rewrite ids line up exactly with paragraphs.
//
// `protected` now also excludes assessor-only blocks (from TO BE COMPLETED BY
// THE ASSESSOR / ASSESSOR USE ONLY / ADMIN USE ONLY / "Did the student…" /
// "Satisfactory (S) / Not satisfactory (NS)" through to the next section
// heading) and admin overview sections (Unit information / Evidence Guide /
// About your assessments / Assessment conditions, through to the next section
// heading). Section headings themselves are protected (structural labels).
// `section` carries the current section label so the rewrite prompt can keep
// sections independent.
export function extractParagraphs(docXml) {
    const paragraphs = [];
    const re = newParagraphRegex();
    let id = 0;
    let m;
    let currentSection = '';
    let inAssessorBlock = false;
    let inAdminBlock = false;
    while ((m = re.exec(docXml)) !== null) {
        id++;
        const pXml = m[0];
        const selfClosing = isSelfClosingParagraph(pXml);
        const text = selfClosing ? '' : paragraphText(pXml);

        let protectedFlag = false;
        let section = currentSection;

        if (selfClosing) {
            protectedFlag = true;
        } else {
            const heading = isSectionHeading(text);
            const assessor = isAssessorMarker(text);
            const admin = isAdminHeading(text);
            if (heading) {
                // A new student-facing section ends any assessor/admin block.
                inAssessorBlock = false;
                inAdminBlock = false;
                currentSection = heading;
                section = heading;
                protectedFlag = true; // structural heading — never rewrite
            } else if (assessor) {
                inAssessorBlock = true;
                inAdminBlock = false;
                protectedFlag = true;
            } else if (admin) {
                inAdminBlock = true;
                inAssessorBlock = false;
                protectedFlag = true;
            } else if (inAssessorBlock || inAdminBlock) {
                protectedFlag = true; // inside a stripped block
            } else {
                protectedFlag = hasEmbeddedObject(pXml) || isProtectedText(text);
            }
        }

        paragraphs.push({ id, text, protected: protectedFlag, section });
    }
    return paragraphs;
}