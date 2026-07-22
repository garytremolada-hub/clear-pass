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
    return new RegExp(PAGRAPH_SOURCE, 'g');
}

export function isSelfClosingParagraph(pXml) {
    return /<w:p\b[^>]*\/>/.test(pXml);
}

export function hasEmbeddedObject(pXml) {
    return /<w:drawing\b|<w:pict\b|<w:object\b/.test(pXml);
}

// Enumerate every <w:p> in document.xml → [{id, text, protected}].
// id is the 1-based position among ALL <w:p>, identical to the index the
// rewriter uses, so rewrite ids line up exactly with paragraphs.
export function extractParagraphs(docXml) {
    const paragraphs = [];
    const re = newParagraphRegex();
    let id = 0;
    let m;
    while ((m = re.exec(docXml)) !== null) {
        id++;
        const pXml = m[0];
        const selfClosing = isSelfClosingParagraph(pXml);
        const text = selfClosing ? '' : paragraphText(pXml);
        const protectedFlag = (!selfClosing) && (hasEmbeddedObject(pXml) || isProtectedText(text));
        paragraphs.push({ id, text, protected: protectedFlag });
    }
    return paragraphs;
}