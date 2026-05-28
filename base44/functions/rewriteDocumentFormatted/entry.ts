import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Minimal ZIP reader/writer using Deno built-ins only (no npm zip packages)
// A .docx is a ZIP file — we extract word/document.xml, patch it, repack

async function readZipEntries(data) {
    const entries = {};
    // Use a plain buffer for DataView
    const buf = data.buffer ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data;
    const view = new DataView(buf instanceof ArrayBuffer ? buf : buf.buffer);
    const bytes = new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer);
    let i = 0;

    while (i <= bytes.length - 30) {
        // Local file header signature: PK\x03\x04
        if (view.getUint32(i, true) !== 0x04034b50) {
            i++;
            continue;
        }
        if (i + 30 > bytes.length) break;

        const compression = view.getUint16(i + 8, true);
        let compressedSize = view.getUint32(i + 18, true);
        const uncompressedSize = view.getUint32(i + 22, true);
        const fileNameLen = view.getUint16(i + 26, true);
        const extraLen = view.getUint16(i + 28, true);

        if (i + 30 + fileNameLen > bytes.length) break;

        const fileNameBytes = bytes.slice(i + 30, i + 30 + fileNameLen);
        const fileName = new TextDecoder().decode(fileNameBytes);
        const dataStart = i + 30 + fileNameLen + extraLen;

        // If compressedSize is 0 (data descriptor follows), skip gracefully
        if (compressedSize === 0 && compression !== 0) {
            // Scan for next PK header
            let next = dataStart;
            while (next < bytes.length - 4) {
                if (view.getUint32(next, true) === 0x04034b50 ||
                    view.getUint32(next, true) === 0x02014b50) break;
                next++;
            }
            compressedSize = next - dataStart;
        }

        if (dataStart + compressedSize > bytes.length) {
            compressedSize = bytes.length - dataStart;
        }

        const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

        entries[fileName] = { compression, compressedData, uncompressedSize };
        i = dataStart + compressedSize;
    }
    return entries;
}

async function decompressEntry(entry) {
    if (entry.compression === 0) {
        // Stored (no compression)
        return entry.compressedData;
    }
    // Deflate (compression method 8) — wrap in raw deflate stream
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(entry.compressedData);
    writer.close();
    const chunks = [];
    const reader = ds.readable.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { out.set(c, offset); offset += c.length; }
    return out;
}

async function compressData(data) {
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(data);
    writer.close();
    const chunks = [];
    const reader = cs.readable.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { out.set(c, offset); offset += c.length; }
    return out;
}

function crc32(data) {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[i] = c;
    }
    let crc = 0xFFFFFFFF;
    for (const b of data) crc = table[(crc ^ b) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function writeUint16LE(val) {
    return new Uint8Array([val & 0xFF, (val >> 8) & 0xFF]);
}
function writeUint32LE(val) {
    val = val >>> 0;
    return new Uint8Array([val & 0xFF, (val >> 8) & 0xFF, (val >> 16) & 0xFF, (val >> 24) & 0xFF]);
}

async function rebuildZip(originalData, patches) {
    // Read ALL entries from original ZIP, patch selected ones, repack
    const entries = await readZipEntries(originalData);
    const enc = new TextEncoder();

    const localHeaders = [];
    const centralDirs = [];
    let localOffset = 0;

    for (const [fileName, entry] of Object.entries(entries)) {
        const fileNameBytes = enc.encode(fileName);
        let fileData;
        if (patches[fileName] !== undefined) {
            fileData = enc.encode(patches[fileName]);
        } else {
            fileData = await decompressEntry(entry);
        }

        const compressed = await compressData(fileData);
        const crc = crc32(fileData);

        // Local file header
        const localHeader = new Uint8Array([
            0x50, 0x4B, 0x03, 0x04, // signature
            ...writeUint16LE(20),    // version needed
            ...writeUint16LE(0),     // flags
            ...writeUint16LE(8),     // compression: deflate
            ...writeUint16LE(0),     // mod time
            ...writeUint16LE(0),     // mod date
            ...writeUint32LE(crc),
            ...writeUint32LE(compressed.length),
            ...writeUint32LE(fileData.length),
            ...writeUint16LE(fileNameBytes.length),
            ...writeUint16LE(0),     // extra field length
            ...fileNameBytes,
        ]);

        // Central directory entry
        const centralDir = new Uint8Array([
            0x50, 0x4B, 0x01, 0x02, // signature
            ...writeUint16LE(20),    // version made by
            ...writeUint16LE(20),    // version needed
            ...writeUint16LE(0),     // flags
            ...writeUint16LE(8),     // compression
            ...writeUint16LE(0),     // mod time
            ...writeUint16LE(0),     // mod date
            ...writeUint32LE(crc),
            ...writeUint32LE(compressed.length),
            ...writeUint32LE(fileData.length),
            ...writeUint16LE(fileNameBytes.length),
            ...writeUint16LE(0),     // extra
            ...writeUint16LE(0),     // comment
            ...writeUint16LE(0),     // disk start
            ...writeUint16LE(0),     // internal attrs
            ...writeUint32LE(0),     // external attrs
            ...writeUint32LE(localOffset),
            ...fileNameBytes,
        ]);

        localHeaders.push(localHeader, compressed);
        centralDirs.push(centralDir);
        localOffset += localHeader.length + compressed.length;
    }

    const totalLocal = localOffset;
    const centralSize = centralDirs.reduce((s, c) => s + c.length, 0);

    // End of central directory
    const eocd = new Uint8Array([
        0x50, 0x4B, 0x05, 0x06,
        ...writeUint16LE(0), ...writeUint16LE(0),
        ...writeUint16LE(centralDirs.length),
        ...writeUint16LE(centralDirs.length),
        ...writeUint32LE(centralSize),
        ...writeUint32LE(totalLocal),
        ...writeUint16LE(0),
    ]);

    const allParts = [...localHeaders, ...centralDirs, eocd];
    const totalSize = allParts.reduce((s, p) => s + p.length, 0);
    const output = new Uint8Array(totalSize);
    let pos = 0;
    for (const part of allParts) { output.set(part, pos); pos += part.length; }
    return output;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { file_base64, rewrite_json, filename } = await req.json();
        if (!file_base64 || !rewrite_json || !filename) {
            return Response.json({ error: 'file_base64, rewrite_json, and filename are required' }, { status: 400 });
        }

        // Parse rewrite map
        let rewrites;
        try {
            const clean = rewrite_json.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
            const items = JSON.parse(clean);
            rewrites = {};
            for (const item of items) rewrites[item.id] = item.rewritten;
        } catch (e) {
            return Response.json({ error: 'Could not parse rewrite JSON: ' + e.message }, { status: 400 });
        }

        console.log(`[rewriteDocumentFormatted] ${Object.keys(rewrites).length} rewrites for "${filename}"`);

        // Decode original docx
        const binaryStr = atob(file_base64);
        const inputBuffer = new ArrayBuffer(binaryStr.length);
        const inputBytes = new Uint8Array(inputBuffer);
        for (let i = 0; i < binaryStr.length; i++) inputBytes[i] = binaryStr.charCodeAt(i);

        // Extract document.xml
        const entries = await readZipEntries(inputBytes);
        if (!entries['word/document.xml']) {
            return Response.json({ error: 'Invalid .docx — word/document.xml not found' }, { status: 400 });
        }
        const xmlBytes = await decompressEntry(entries['word/document.xml']);
        let documentXml = new TextDecoder().decode(xmlBytes);

        // Patch paragraphs — walk in document order
        let paraIndex = 1;
        documentXml = documentXml.replace(
            /(<w:p[ >])([\s\S]*?)(<\/w:p>)/g,
            (match, open, content, close) => {
                const idx = paraIndex++;
                if (!rewrites[idx]) return match;

                const newText = rewrites[idx]
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');

                // Preserve paragraph properties
                const pPrMatch = content.match(/<w:pPr[\s\S]*?<\/w:pPr>/);
                const pPr = pPrMatch ? pPrMatch[0] : '';

                // Preserve run properties (font, size) and add yellow highlight
                const rPrMatch = content.match(/<w:rPr[\s\S]*?<\/w:rPr>/);
                const rPr = rPrMatch
                    ? rPrMatch[0].replace('</w:rPr>', '<w:highlight w:val="yellow"/></w:rPr>')
                    : '<w:rPr><w:highlight w:val="yellow"/></w:rPr>';

                return `${open}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${newText}</w:t></w:r>${close}`;
            }
        );

        // Repack docx
        const outputBytes = await rebuildZip(inputBytes, { 'word/document.xml': documentXml });

        // Sanity check
        if (outputBytes.length < inputBytes.length * 0.4) {
            return Response.json({ error: 'Output file unexpectedly small — please try again.' }, { status: 500 });
        }

        // Encode to base64
        let b64 = '';
        const chunk = 8192;
        for (let i = 0; i < outputBytes.length; i += chunk) {
            b64 += String.fromCharCode(...outputBytes.slice(i, i + chunk));
        }

        const outputFilename = filename.replace(/\.docx$/i, '') + '-rewritten.docx';
        console.log(`[rewriteDocumentFormatted] Done. ${inputBytes.length} → ${outputBytes.length} bytes`);

        return Response.json({ file_base64: btoa(b64), filename: outputFilename });
    } catch (error) {
        console.error('[rewriteDocumentFormatted]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});