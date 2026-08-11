import JSZip from 'jszip';

/**
 * Extracts plain text from a .docx File in the browser using JSZip.
 * No backend call, no LLM credits needed.
 * Returns { text, paragraphs } where paragraphs is an array of { id, text }.
 */
export async function extractDocxText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docFile = zip.file('word/document.xml');
    if (!docFile) {
        throw new Error('Could not find document.xml inside this .docx file');
    }
    const docXml = await docFile.async('string');

    // Extract text by parsing paragraph elements
    const paragraphs = [];
    const pRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
    let pMatch;
    let pIndex = 0;
    while ((pMatch = pRegex.exec(docXml)) !== null) {
        const pXml = pMatch[0];
        // Extract all text runs within this paragraph
        const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
        let tMatch;
        let pText = '';
        while ((tMatch = tRegex.exec(pXml)) !== null) {
            pText += tMatch[1]
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'");
        }
        // Check for line breaks within paragraph
        if (pXml.includes('<w:br')) pText += '\n';
        pText = pText.trim();
        paragraphs.push({ id: pIndex, text: pText });
        pIndex++;
    }

    const text = paragraphs
        .map(p => p.text)
        .filter(Boolean)
        .join('\n');

    return { text, paragraphs };
}